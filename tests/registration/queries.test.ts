import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ self: vi.fn(), locked: vi.fn() }));
vi.mock("../../src/server/accounts/service", () => ({ requireSelf: auth.self, authenticatedAccount: auth.locked }));
import type { PrismaClient } from "../../src/server/db/generated/client";
import { discoverEvents, studentEvent } from "../../src/server/registration/queries";
import { EventError } from "../../src/server/events/policy";
import { publicFields, eventId, publicationId } from "./fixtures";
type Row = { id: string; state: string; version: number; currentPublicationId: string; owner: { username: string }; currentPublication: { id: string; revision: number; snapshot: unknown }; draft: unknown };
let records: Row[];
let now: Date;
let reads: number;
let onRead: ((count: number) => void) | undefined;
// Deliberate projection-aware double: verifies actual allowlisted select and predicate use.
function project(row: unknown, select: Record<string, unknown>): Record<string, unknown> {
  const value = row as Record<string, unknown>;
  return Object.fromEntries(Object.entries(select).map(([key, spec]) => [key, spec === true ? value[key] : value[key] == null ? null : project(value[key], (spec as { select: Record<string, unknown> }).select)]));
}
function matches(row: Row, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, expected]) => {
    const value = row[key as keyof Row];
    return expected && typeof expected === "object" && "in" in expected ? (expected.in as unknown[]).includes(value) : value === expected;
  });
}
const event = { findMany: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select: Record<string, unknown> }) => {
  onRead?.(++reads); return records.filter((row) => matches(row, where)).map((row) => project(row, select));
}), findFirst: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select: Record<string, unknown> }) => {
  onRead?.(++reads); const row = records.find((row) => matches(row, where)); return row ? project(row, select) : null;
}) };
const fake = { event, $queryRaw: async () => [{ now }], $transaction: async (read: (db: unknown) => Promise<unknown>): Promise<unknown> => read(fake) };
const db = fake as unknown as PrismaClient;
function row(id = eventId, title = "Campus workshop", start = publicFields.start): Row {
  return { id, state: "PUBLISHED", version: 2, currentPublicationId: publicationId, owner: { username: "campus_owner" },
    draft: { secret: "private draft title" }, currentPublication: { id: publicationId, revision: 2,
      snapshot: { fields: { ...publicFields, title, start }, form: { formRevisionId: "empty", questions: [] }, privateNote: "never share" } } };
}
beforeEach(() => {
  vi.clearAllMocks(); reads = 0; onRead = undefined; records = [row()]; now = new Date("2026-10-22T00:00:00.000Z");
  auth.self.mockResolvedValue({ id: "student", role: "STUDENT" }); auth.locked.mockResolvedValue({ id: "student", role: "STUDENT" });
});
it("lists current approved facts only, filters by title and sorts start then stable ID", async () => {
  records = [row("b", "Workshop B"), row("a", "Workshop A"), row("c", "Other"), { ...row("draft"), state: "DRAFT" },
    { ...row("withdrawn"), state: "WITHDRAWN" }, { ...row("cancelled"), state: "CANCELLED" }];
  const events = await discoverEvents(db, "token", { search: "WORKSHOP", period: "upcoming" });
  expect(events.map((item) => item.eventId)).toEqual(["a", "b"]);
  expect(events[0]).toMatchObject({ organiser: "campus_owner", remainingPlaces: null, registrationStatus: "unavailable" });
  expect(JSON.stringify(events)).not.toMatch(/private draft|never share|password|profile|digest/);
  expect(event.findMany.mock.calls[0][0].select).not.toHaveProperty("draft");
  expect(event.findMany.mock.calls[0][0].where).toEqual({ state: "PUBLISHED" });
});
it("uses database time at equality and allows current details after start", async () => {
  now = new Date(publicFields.start);
  expect(await discoverEvents(db, "token", { search: "", period: "upcoming" })).toEqual([]);
  expect(await discoverEvents(db, "token", { search: "", period: "past" })).toHaveLength(1);
  expect(await studentEvent(db, "token", eventId)).toMatchObject({ hasStarted: true, publicationId });
});
it("orders unequal starts chronologically and returns honest empty results", async () => {
  records = [row("later", "Workshop", "2099-11-01T03:00:00.000Z"), row("earlier")];
  expect((await discoverEvents(db, "token", { search: "", period: "upcoming" })).map((item) => item.eventId)).toEqual(["earlier", "later"]);
  expect(await discoverEvents(db, "token", { search: "missing", period: "upcoming" })).toEqual([]);
});
it("rejects wrong role before event access and rechecks locked role/session before returning", async () => {
  auth.self.mockResolvedValueOnce({ id: "owner", role: "ORGANISER" });
  await expect(discoverEvents(db, "token", { search: "", period: "upcoming" })).rejects.toMatchObject({ status: 403 });
  expect(event.findMany).not.toHaveBeenCalled();
  auth.locked.mockResolvedValueOnce({ id: "owner", role: "ORGANISER" });
  await expect(discoverEvents(db, "token", { search: "", period: "upcoming" })).rejects.toMatchObject({ status: 403 });
  auth.locked.mockResolvedValueOnce({ id: "student", role: "STUDENT" }).mockRejectedValueOnce(new EventError(401, "Log in again."));
  await expect(discoverEvents(db, "token", { search: "", period: "upcoming" })).rejects.toMatchObject({ status: 401 });
});
it("hides unavailable and forged historical event IDs through the actual producer reader", async () => {
  for (const state of ["DRAFT", "WITHDRAWN", "CANCELLED"]) {
    records[0].state = state;
    await expect(studentEvent(db, "token", eventId)).rejects.toMatchObject({ status: 404 });
  }
  records[0].state = "PUBLISHED";
  await expect(studentEvent(db, "token", publicationId)).rejects.toMatchObject({ status: 404 });
});
it("fails closed if a selected event is withdrawn/replaced during a read", async () => {
  onRead = (count) => { if (count === 2) records[0].state = "WITHDRAWN"; };
  await expect(discoverEvents(db, "token", { search: "", period: "upcoming" })).rejects.toMatchObject({ status: 409 });
  records[0].state = "PUBLISHED"; reads = 0;
  onRead = (count) => { if (count === 2) records[0].currentPublicationId = "replacement"; };
  await expect(studentEvent(db, "token", eventId)).rejects.toMatchObject({ status: 404 });
});
it("rejects malformed/incomplete publication data without partial results", async () => {
  records[0].currentPublication.snapshot = { fields: { ...publicFields, title: "" } };
  await expect(discoverEvents(db, "token", { search: "", period: "upcoming" })).rejects.toMatchObject({ status: 503 });
  records[0].currentPublication.snapshot = { fields: { ...publicFields, ownerId: "forged" } };
  await expect(studentEvent(db, "token", eventId)).rejects.toMatchObject({ status: 503 });
});
