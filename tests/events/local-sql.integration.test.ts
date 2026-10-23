import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/server/db/generated/client";
import { replaceSession } from "../../src/server/auth/session";
import { createEvent, listEvents, mutateEvent, readEvent } from "../../src/server/events/service";
import { currentPublication } from "../../src/server/publication/reader";
import { EMPTY_EVENT } from "../../src/lib/event-fields";

// Explicit local diagnostic. Reuse Prisma's locked dev dependencies, never an env URL.
// This is an in-memory, single-connection PostgreSQL engine, not a Neon/load test.
if (process.env.RUN_LOCAL_EVENT_SQL !== "1") throw new Error("Opt into disposable local event SQL with RUN_LOCAL_EVENT_SQL=1.");
const require = createRequire(import.meta.url);
const prismaRequire = createRequire(require.resolve("prisma/package.json"));
const devRequire = createRequire(prismaRequire.resolve("@prisma/dev"));
const { PGlite } = await import(devRequire.resolve("@electric-sql/pglite"));
const { PGLiteSocketServer } = await import(devRequire.resolve("@electric-sql/pglite-socket"));
const engine = await PGlite.create();
const socket = new PGLiteSocketServer({ db: engine, host: "127.0.0.1", port: 0, maxConnections: 1 });
let db: PrismaClient | undefined;
let token: string;
let studentToken: string;
let foreignToken: string;
const ownerId = randomUUID();
const fields = { ...EMPTY_EVENT, title: "Synthetic SQL workshop", description: "Local-only fixture", location: "Hall", fee: "Free", openTo: "Anyone", preparation: "None", capacity: 10,
  start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z" };
function client() { if (!db) throw new Error("Local fixture not initialised"); return db; }
beforeAll(async () => {
  const directory = resolve("prisma/migrations");
  for (const name of (await readdir(directory)).filter((name) => /^\d/.test(name)).sort()) await engine.exec(await readFile(resolve(directory, name, "migration.sql"), "utf8"));
  await socket.start();
  const endpoint = socket.getServerConn();
  if (!/^127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error("Local fixture must bind loopback only.");
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://postgres@${endpoint}/postgres`, max: 1 }) });
  const studentId = randomUUID(), foreignId = randomUUID();
  for (const [id, username, role] of [[ownerId, "qa_sql_owner", "ORGANISER"], [studentId, "qa_sql_student", "STUDENT"], [foreignId, "qa_sql_foreign", "ORGANISER"]] as const) {
    await db.user.create({ data: { id, username, role, passwordHash: "synthetic-non-login-hash" } });
  }
  token = await db.$transaction((tx) => replaceSession(tx, ownerId));
  studentToken = await db.$transaction((tx) => replaceSession(tx, studentId));
  foreignToken = await db.$transaction((tx) => replaceSession(tx, foreignId));
});
afterAll(async () => { await db?.$disconnect(); await socket.stop(); await engine.close(); });
async function prepared() {
  const event = await createEvent(client(), token);
  await mutateEvent(client(), token, event.id, 0, "save", fields);
  return event.id;
}
async function publish(id: string, version: number) {
  const preview = await mutateEvent(client(), token, id, version, "preview") as { approvalId: string };
  return mutateEvent(client(), token, id, version, "publish", undefined, preview.approvalId);
}
it("real Prisma/JSONB preview publishes, projects safely and preserves old revisions during private edits", async () => {
  const id = await prepared();
  await expect(publish(id, 1)).resolves.toEqual({ published: true });
  const first = await client().eventPublication.findFirstOrThrow({ where: { eventId: id } });
  const projection = await currentPublication(client(), studentToken, id);
  expect(projection.organiser).toBe("qa_sql_owner"); expect(projection.publication.snapshot).toMatchObject({ fields, form: { questions: [] } });
  expect(projection).not.toHaveProperty("draft"); expect(projection).not.toHaveProperty("passwordHash");
  await mutateEvent(client(), token, id, 2, "save", { ...fields, fee: "$2" });
  expect((await currentPublication(client(), studentToken, id)).publication.id).toBe(first.id);
  const card = (await listEvents(client(), token)).find((event) => event.id === id)!;
  expect(card).toMatchObject({ fields, hasSavedChanges: true });
  await publish(id, 3);
  expect(await client().eventPublication.count({ where: { eventId: id } })).toBe(2);
  expect(await client().eventPublication.findUnique({ where: { id: first.id } })).toEqual(first);
  // Exercise the database trigger directly: the disposable socket can close after
  // a deliberate SQL error and leave pg's pooled connection stale for the next test.
  await expect(engine.query("UPDATE event_publication SET digest = $1 WHERE id = $2", ["b".repeat(64), first.id]))
    .rejects.toThrow("Published revisions are immutable");
});
it("real role/owner/session checks deny access and mutations without event changes", async () => {
  const id = await prepared();
  for (const denied of [studentToken, foreignToken, undefined]) {
    await expect(readEvent(client(), denied, id)).rejects.toBeDefined();
    await expect(mutateEvent(client(), denied, id, 1, "save", { ...fields, title: "Forbidden" })).rejects.toBeDefined();
  }
  expect((await readEvent(client(), token, id)).fields.title).toBe(fields.title);
  expect((await readEvent(client(), token, id)).version).toBe(1);
});
it("stale and forged approvals cannot publish newer saved JSONB", async () => {
  const id = await prepared();
  const preview = await mutateEvent(client(), token, id, 1, "preview") as { approvalId: string };
  await mutateEvent(client(), token, id, 1, "save", { ...fields, title: "Newer" });
  await expect(mutateEvent(client(), token, id, 1, "publish", undefined, preview.approvalId)).rejects.toMatchObject({ status: 409 });
  await expect(mutateEvent(client(), token, id, 2, "publish", undefined, randomUUID())).rejects.toMatchObject({ status: 409 });
  expect(await client().eventPublication.count({ where: { eventId: id } })).toBe(0);
});
it("SQL failure after revision insertion rolls back publication, pointer and approval deletion", async () => {
  const id = await prepared();
  const preview = await mutateEvent(client(), token, id, 1, "preview") as { approvalId: string };
  await engine.exec(`CREATE FUNCTION qa_reject_publish() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state = 'PUBLISHED' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END; $$;
    CREATE TRIGGER qa_publish_failure BEFORE UPDATE ON event FOR EACH ROW EXECUTE FUNCTION qa_reject_publish();`);
  try { await expect(mutateEvent(client(), token, id, 1, "publish", undefined, preview.approvalId)).rejects.toThrow(); }
  finally { await engine.exec("DROP TRIGGER qa_publish_failure ON event; DROP FUNCTION qa_reject_publish();"); }
  expect(await client().eventPublication.count({ where: { eventId: id } })).toBe(0);
  expect(await client().eventApproval.count({ where: { eventId: id } })).toBe(1);
  expect((await readEvent(client(), token, id))).toMatchObject({ state: "DRAFT", version: 1, published: null });
});
it("withdrawal immediately denies current public reads; cancellation and never-published deletion stay distinct", async () => {
  const id = await prepared(); await publish(id, 1);
  await mutateEvent(client(), token, id, 2, "withdraw");
  await expect(currentPublication(client(), studentToken, id)).rejects.toMatchObject({ status: 404 });
  await expect(mutateEvent(client(), token, id, 3, "delete")).rejects.toMatchObject({ status: 409 });
  await publish(id, 3); await mutateEvent(client(), token, id, 4, "cancel");
  await expect(publish(id, 5)).rejects.toMatchObject({ status: 409 });
  const draft = await createEvent(client(), token); await mutateEvent(client(), token, draft.id, 0, "delete");
  expect(await client().event.findUnique({ where: { id: draft.id } })).toBeNull();
});
it("revoked token replay cannot modify saved work", async () => {
  const id = await prepared();
  const disposable = await client().$transaction((tx) => replaceSession(tx, ownerId));
  const { tokenDigest } = await import("../../src/server/auth/session");
  await client().session.delete({ where: { tokenDigest: tokenDigest(disposable)! } });
  await expect(mutateEvent(client(), disposable, id, 1, "save", { ...fields, title: "Forbidden" })).rejects.toMatchObject({ status: 401 });
  expect((await readEvent(client(), token, id)).fields).toEqual(fields);
});

it("a previously published start can move earlier when the new time remains future", async () => {
  const id = await prepared(); await publish(id, 1);
  const earlier = { ...fields, start: "2099-10-31T02:00:00.000Z" };
  await mutateEvent(client(), token, id, 2, "save", earlier);
  await expect(publish(id, 3)).resolves.toEqual({ published: true });
  expect((await readEvent(client(), token, id)).published?.fields.start).toBe(earlier.start);
  expect((await listEvents(client(), token)).find((event) => event.id === id)?.hasSavedChanges).toBe(false);
});
