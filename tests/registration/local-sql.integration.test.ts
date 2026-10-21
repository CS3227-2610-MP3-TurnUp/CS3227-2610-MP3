import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/server/db/generated/client";
import { replaceSession, revokeSession } from "../../src/server/auth/session";
import { createEvent, mutateEvent } from "../../src/server/events/service";
import { discoverEvents, studentEvent } from "../../src/server/registration/queries";
import { publicFields } from "./fixtures";

// Opt-in disposable in-memory PostgreSQL engine. No env URL, shared DB or hosted credentials.
if (process.env.RUN_LOCAL_REGISTRATION_SQL !== "1") throw new Error("Opt into disposable SQL with RUN_LOCAL_REGISTRATION_SQL=1.");
const require = createRequire(import.meta.url);
const prismaRequire = createRequire(require.resolve("prisma/package.json"));
const devRequire = createRequire(prismaRequire.resolve("@prisma/dev"));
const { PGlite } = await import(devRequire.resolve("@electric-sql/pglite"));
const { PGLiteSocketServer } = await import(devRequire.resolve("@electric-sql/pglite-socket"));
const engine = await PGlite.create();
const socket = new PGLiteSocketServer({ db: engine, host: "127.0.0.1", port: 0, maxConnections: 1 });
let db: PrismaClient | undefined;
let ownerToken: string, studentToken: string, foreignToken: string;
const ownerId = randomUUID(), studentId = randomUUID();
function client() { if (!db) throw new Error("Fixture unavailable"); return db; }
beforeAll(async () => {
  const directory = resolve("prisma/migrations");
  for (const name of (await readdir(directory)).filter((name) => /^\d/.test(name)).sort()) await engine.exec(await readFile(resolve(directory, name, "migration.sql"), "utf8"));
  await socket.start();
  const endpoint = socket.getServerConn();
  if (!/^127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error("Fixture must bind loopback only.");
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://postgres@${endpoint}/postgres`, max: 1 }) });
  const foreignId = randomUUID();
  for (const [id, username, role] of [[ownerId, "qa_discovery_owner", "ORGANISER"], [studentId, "qa_discovery_student", "STUDENT"], [foreignId, "qa_discovery_foreign", "STUDENT"]] as const) {
    await db.user.create({ data: { id, username, role, passwordHash: "synthetic-not-a-login-hash", studentName: role === "STUDENT" ? "Private profile sentinel" : null } });
  }
  ownerToken = await db.$transaction((tx) => replaceSession(tx, ownerId));
  studentToken = await db.$transaction((tx) => replaceSession(tx, studentId));
  foreignToken = await db.$transaction((tx) => replaceSession(tx, foreignId));
});
afterAll(async () => { await db?.$disconnect(); await socket.stop(); await engine.close(); });
async function published(title: string) {
  const event = await createEvent(client(), ownerToken);
  await mutateEvent(client(), ownerToken, event.id, 0, "save", { ...publicFields, title });
  const preview = await mutateEvent(client(), ownerToken, event.id, 1, "preview") as { approvalId: string };
  await mutateEvent(client(), ownerToken, event.id, 1, "publish", undefined, preview.approvalId);
  return event.id;
}
it("actual publisher → Student listing/details uses immutable approved JSONB and excludes private draft/profile", async () => {
  const id = await published("Discovery SQL workshop");
  const first = await studentEvent(client(), studentToken, id);
  await mutateEvent(client(), ownerToken, id, 2, "save", { ...publicFields, title: "Private draft sentinel", fee: "$99" });
  const events = await discoverEvents(client(), studentToken, { search: "Discovery SQL", period: "upcoming" });
  expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ publicationId: first.publicationId, organiser: "qa_discovery_owner", fields: { fee: "Free" }, remainingPlaces: null, registrationStatus: "unavailable" });
  expect(JSON.stringify(events)).not.toMatch(/Private draft sentinel|Private profile sentinel|passwordHash|studentName|draftVersion/);
  const preview = await mutateEvent(client(), ownerToken, id, 3, "preview") as { approvalId: string };
  await mutateEvent(client(), ownerToken, id, 3, "publish", undefined, preview.approvalId);
  expect((await discoverEvents(client(), studentToken, { search: "Discovery SQL", period: "upcoming" }))).toEqual([]);
  expect((await studentEvent(client(), studentToken, id)).publicationId).not.toBe(first.publicationId);
});
it("real lifecycle denies draft/withdrawn/cancelled/old-publication UUID access, preserving safe failure", async () => {
  const draft = await createEvent(client(), ownerToken);
  await expect(studentEvent(client(), studentToken, draft.id)).rejects.toMatchObject({ status: 404 });
  const id = await published("Lifecycle SQL discovery");
  const event = await studentEvent(client(), studentToken, id);
  await expect(studentEvent(client(), studentToken, event.publicationId)).rejects.toMatchObject({ status: 404 });
  await mutateEvent(client(), ownerToken, id, 2, "withdraw");
  expect(await discoverEvents(client(), studentToken, { search: "Lifecycle SQL", period: "upcoming" })).toEqual([]);
  await expect(studentEvent(client(), studentToken, id)).rejects.toMatchObject({ status: 404 });
  await mutateEvent(client(), ownerToken, id, 3, "cancel");
  await expect(studentEvent(client(), studentToken, id)).rejects.toMatchObject({ status: 404 });
});
it("real auth denies anonymous, forged, revoked, expired and Organiser sessions; other Students see only public facts", async () => {
  const id = await published("Auth SQL discovery");
  for (const token of [undefined, "forged"]) await expect(discoverEvents(client(), token, { search: "", period: "upcoming" })).rejects.toMatchObject({ status: 401 });
  await expect(studentEvent(client(), ownerToken, id)).rejects.toMatchObject({ status: 403 });
  expect((await studentEvent(client(), foreignToken, id)).eventId).toBe(id);
  const revoked = await client().$transaction((tx) => replaceSession(tx, studentId));
  await revokeSession(client(), revoked);
  await expect(studentEvent(client(), revoked, id)).rejects.toMatchObject({ status: 401 });
  const expired = await client().$transaction((tx) => replaceSession(tx, studentId));
  await client().session.updateMany({ where: { userId: studentId }, data: { expiresAt: new Date("2000-01-01T00:00:00.000Z") } });
  await expect(discoverEvents(client(), expired, { search: "", period: "upcoming" })).rejects.toMatchObject({ status: 401 });
  studentToken = await client().$transaction((tx) => replaceSession(tx, studentId));
});
it("seeded historical approved event stays readable and appears only in the database-time past filter", async () => {
  // Historical fixture, not a claim that first publication with a past start is permitted.
  const id = randomUUID(), publicationId = randomUUID();
  const fields = { ...publicFields, title: "Historical SQL discovery", start: "2001-01-01T02:00:00.000Z", end: "2001-01-01T04:00:00.000Z" };
  await client().$transaction(async (tx) => {
    await tx.event.create({ data: { id, ownerId, draft: fields } });
    await tx.eventPublication.create({ data: { id: publicationId, eventId: id, revision: 1, snapshot: { fields, form: { formRevisionId: randomUUID(), questions: [] } }, digest: "0".repeat(64), approvedBy: ownerId } });
    await tx.event.update({ where: { id }, data: { state: "PUBLISHED", currentPublicationId: publicationId, firstPublishedAt: new Date(fields.start), version: 1 } });
  });
  expect(await discoverEvents(client(), studentToken, { search: "Historical SQL", period: "upcoming" })).toEqual([]);
  expect(await discoverEvents(client(), studentToken, { search: "Historical SQL", period: "past" })).toHaveLength(1);
  expect(await studentEvent(client(), studentToken, id)).toMatchObject({ hasStarted: true, publicationId });
});
