import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/server/db/generated/client";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { replaceSession, tokenDigest } from "../../src/server/auth/session";
import { createEvent, mutateEvent } from "../../src/server/events/service";
import { mutateRegistration, mutateOwnRegistration, registrationClock } from "../../src/server/registration/service";
import { registrationScreen } from "../../src/server/registration/queries";
import { publicFields } from "./fixtures";

// Exact task-owned disposable database only. Never consume runtime/Neon URLs or reset an existing shared database.
const target = process.env.D007_SYNTHETIC_SQL_URL;
if (target !== "postgresql://postgres@127.0.0.1:55487/turnup_d007_synthetic") throw new Error("Assign the exact disposable D007 loopback target.");
const pool = new Pool({ connectionString: target, max: 8, application_name: "turnup-d007-tests" });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target, max: 8, application_name: "turnup-d007-service" }) });
let ownerToken: string;
const students: { id: string; token: string }[] = [];
beforeAll(async () => {
  const metadata = (await pool.query("SELECT current_database() AS db, host(inet_server_addr()) AS host, inet_server_port() AS port")).rows[0];
  if (metadata.db !== "turnup_d007_synthetic" || metadata.host !== "127.0.0.1" || metadata.port !== 55487) throw new Error("Synthetic target mismatch.");
  const existing = (await pool.query("SELECT to_regclass('public.app_user') AS existing")).rows[0].existing;
  if (existing && process.env.D007_REUSE_SYNTHETIC_SQL !== "1") throw new Error("Explicitly opt into reusing this task-owned fixture; no reset is performed.");
  if (!existing) {
  const names = (await readdir("prisma/migrations")).filter((name) => /^\d/.test(name)).sort();
  for (const name of names.filter((name) => name < "20261022000000_registration")) await pool.query(await readFile(resolve("prisma/migrations", name, "migration.sql"), "utf8"));
  const preserved = randomUUID();
  await pool.query(`INSERT INTO app_user(id,username,password_hash,role) VALUES($1,'upgrade_sentinel','synthetic','STUDENT')`, [preserved]);
  await pool.query(await readFile("prisma/migrations/20261022000000_registration/migration.sql", "utf8"));
  expect((await pool.query("SELECT username FROM app_user WHERE id=$1", [preserved])).rows[0].username).toBe("upgrade_sentinel");
  // Keep the registration upgrade assertion, then bring the disposable fixture
  // to the integrated schema consumed by the current event service.
  for (const name of names.filter((name) => name > "20261022000000_registration")) {
    await pool.query(await readFile(resolve("prisma/migrations", name, "migration.sql"), "utf8"));
  }
  }
  const run = randomUUID().slice(0,8);
  const owner = await db.user.create({ data: { id: randomUUID(), username: `concurrency_owner_${run}`, passwordHash: "synthetic", role: "ORGANISER" } });
  ownerToken = await db.$transaction((tx) => replaceSession(tx, owner.id));
  for (let i=0; i<3; i++) {
    const id = randomUUID(); await db.user.create({ data: { id, username: `concurrency_${run}_${i}`, passwordHash: "synthetic", role: "STUDENT" } });
    students.push({ id, token: await db.$transaction((tx) => replaceSession(tx, id)) });
  }
});
afterAll(async () => { await db.$disconnect(); await pool.end(); });
async function published(capacity = 1, start = publicFields.start) {
  const event = await createEvent(db, ownerToken);
  const fields = { ...publicFields, capacity, start };
  await mutateEvent(db, ownerToken, event.id, 0, "save", fields);
  const preview = await mutateEvent(db, ownerToken, event.id, 1, "preview") as { approvalId: string };
  await mutateEvent(db, ownerToken, event.id, 1, "publish", undefined, preview.approvalId);
  return event.id;
}
async function payload(id: string, token = students[0].token) {
  const screen = await registrationScreen(db, token, id);
  return { expectedPublicationId: screen.publicationId, expectedFormRevisionId: screen.form.formRevisionId, idempotencyKey: randomUUID(), name: "Student", phone: "+6512345678", answers: {}, sharingConfirmed: true };
}
async function count(id: string) { return db.registration.count({ where: { eventId: id, state: "ACTIVE" } }); }
function failures(results: PromiseSettledResult<unknown>[]) { return results.filter((item) => item.status === "rejected").map((item) => (item as PromiseRejectedResult).reason); }
it("two concurrent Students competing for the last place commit exactly one registration", async () => {
  const id = await published(), a = await payload(id), b = await payload(id, students[1].token);
  const results = await Promise.allSettled([mutateRegistration(db, students[0].token, id, "JOIN", a), mutateRegistration(db, students[1].token, id, "JOIN", b)]);
  expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  expect(failures(results)[0]).toMatchObject({ status: 409 });
  expect(await count(id)).toBe(1);
});
it("concurrent same-key retries return one durable result; different keys cannot double-register", async () => {
  const id = await published(2), body = await payload(id), token = students[0].token;
  const results = await Promise.all([mutateRegistration(db, token, id, "JOIN", body), mutateRegistration(db, token, id, "JOIN", body)]);
  expect(results[0]).toEqual(results[1]); expect(await count(id)).toBe(1);
  await expect(mutateRegistration(db, token, id, "JOIN", { ...body, idempotencyKey: randomUUID() })).rejects.toMatchObject({ status: 409 });
  expect(await db.registrationOperation.count({ where: { eventId: id } })).toBe(1);
});
it("capacity reduction racing a join can never publish capacity below active registrations", async () => {
  const id = await published(2);
  await mutateRegistration(db, students[0].token, id, "JOIN", await payload(id));
  const second = await payload(id, students[1].token);
  await mutateEvent(db, ownerToken, id, 2, "save", { ...publicFields, capacity: 1 });
  const preview = await mutateEvent(db, ownerToken, id, 3, "preview") as { approvalId: string };
  const results = await Promise.allSettled([mutateEvent(db, ownerToken, id, 3, "publish", undefined, preview.approvalId), mutateRegistration(db, students[1].token, id, "JOIN", second)]);
  expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  expect(failures(results)[0]).toMatchObject({ status: 409 });
  const publication = (await db.event.findUnique({ where: { id }, include: { currentPublication: true } }))!.currentPublication!;
  expect((publication.snapshot as { fields: { capacity: number } }).fields.capacity).toBeGreaterThanOrEqual(await count(id));
});
it("withdrawal racing a join serializes to either a preserved place or a rejected join", async () => {
  const id = await published(), body = await payload(id);
  const results = await Promise.allSettled([mutateRegistration(db, students[0].token, id, "JOIN", body), mutateEvent(db, ownerToken, id, 2, "withdraw")]);
  expect(results[1].status).toBe("fulfilled");
  expect(await count(id)).toBe(results[0].status === "fulfilled" ? 1 : 0);
  if (results[0].status === "rejected") expect(results[0].reason).toMatchObject({ status: 409 });
});
it("concurrent corrections append one version and reject the stale writer without changing seats", async () => {
  const id = await published(), token = students[0].token;
  const joined = await mutateRegistration(db, token, id, "JOIN", await payload(id));
  const correction = { registrationId: joined.registrationId, expectedGeneration: 1, expectedVersion: joined.version, expectedSubmissionVersion: 1, name: "Event snapshot", phone: "@event_student", answers: {}, sharingConfirmed: true };
  const results = await Promise.allSettled([1,2].map(() => mutateOwnRegistration(db, token, joined.registrationId, "CORRECT", { ...correction, idempotencyKey: randomUUID() })));
  expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1); expect(failures(results)[0]).toMatchObject({ status: 409 });
  expect(await count(id)).toBe(1); expect(await db.registrationSubmission.count({ where: { registrationId: joined.registrationId } })).toBe(2);
});
it("an injected operation-write failure rolls back the place, submission and result", async () => {
  const id = await published(), body = await payload(id);
  await pool.query(`CREATE FUNCTION d007_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic injected rollback'; END $$; CREATE TRIGGER d007_failure BEFORE INSERT ON registration_operation FOR EACH ROW EXECUTE FUNCTION d007_fail()`);
  try { await expect(mutateRegistration(db, students[0].token, id, "JOIN", body)).rejects.toThrow(); }
  finally { await pool.query("DROP TRIGGER d007_failure ON registration_operation; DROP FUNCTION d007_fail()"); }
  expect(await count(id)).toBe(0); expect(await db.registrationOperation.count({ where: { eventId: id } })).toBe(0);
  expect(await db.registrationSubmission.count({ where: { registration: { eventId: id } } })).toBe(0);
  expect((await mutateRegistration(db, students[0].token, id, "JOIN", body)).state).toBe("ACTIVE");
});
it("a final-write cutoff recheck rolls back a transaction that crossed start while writing", async () => {
  const start = (await pool.query("SELECT clock_timestamp() + interval '5 seconds' AS start")).rows[0].start.toISOString();
  const clocks = { start, sql: (await pool.query("SELECT clock_timestamp() AS now")).rows[0].now.toISOString(), prisma: (await registrationClock(db)).toISOString() };
  expect(Math.abs(Date.parse(clocks.sql) - Date.parse(clocks.prisma)), JSON.stringify(clocks)).toBeLessThan(1000);
  const id = await published(1, start), body = await payload(id);
  await pool.query(`CREATE FUNCTION d007_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(GREATEST(0, EXTRACT(EPOCH FROM ((SELECT (p.snapshot->'fields'->>'start')::timestamptz FROM event e JOIN event_publication p ON p.id=e.current_publication_id WHERE e.id=NEW.event_id) - clock_timestamp()))) + 0.1); RETURN NEW; END $$; CREATE TRIGGER d007_delay_write BEFORE INSERT ON registration_operation FOR EACH ROW EXECUTE FUNCTION d007_delay()`);
  try { await expect(mutateRegistration(db, students[0].token, id, "JOIN", body)).rejects.toMatchObject({ status: 409 }); }
  finally { await pool.query("DROP TRIGGER d007_delay_write ON registration_operation; DROP FUNCTION d007_delay()"); }
  expect(await count(id)).toBe(0);
  expect(await db.registrationSubmission.count({ where: { registration: { eventId: id } } })).toBe(0);
});
it("absolute session expiry while waiting for the event lock cannot commit a place", async () => {
  const id = await published(), token = students[2].token, body = await payload(id, token);
  await pool.query("UPDATE auth_session SET expires_at=clock_timestamp()+interval '0.5 seconds' WHERE token_digest=$1", [tokenDigest(token)]);
  const blocker = await pool.connect();
  await blocker.query("BEGIN"); await blocker.query("SELECT id FROM event WHERE id=$1 FOR UPDATE", [id]);
  const pending = mutateRegistration(db, token, id, "JOIN", body).then((value) => ({ value, error: null }), (error: unknown) => ({ value: null, error }));
  try { await pool.query("SELECT pg_sleep(0.7)"); } finally { await blocker.query("COMMIT"); blocker.release(); }
  expect((await pending).error).toMatchObject({ status: 401 }); expect(await count(id)).toBe(0);
});

it("retries one database serialization abort with the original key and no duplicate records", async () => {
  const id = await published(), body = await payload(id);
  await pool.query(`CREATE SEQUENCE d007_retry_sequence; CREATE FUNCTION d007_retry() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF nextval('d007_retry_sequence')=1 THEN RAISE EXCEPTION 'synthetic serialization abort' USING ERRCODE='40001'; END IF; RETURN NEW; END $$; CREATE TRIGGER d007_retry_write BEFORE INSERT ON registration_operation FOR EACH ROW EXECUTE FUNCTION d007_retry()`);
  try { expect((await mutateRegistration(db, students[0].token, id, "JOIN", body)).state).toBe("ACTIVE"); }
  finally { await pool.query("DROP TRIGGER d007_retry_write ON registration_operation; DROP FUNCTION d007_retry(); DROP SEQUENCE d007_retry_sequence"); }
  expect(await count(id)).toBe(1);
  expect(await db.registrationSubmission.count({ where: { registration: { eventId: id } } })).toBe(1);
  expect(await db.registrationOperation.count({ where: { eventId: id } })).toBe(1);
});
