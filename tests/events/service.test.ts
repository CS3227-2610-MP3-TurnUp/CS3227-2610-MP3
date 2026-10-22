import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ self: vi.fn(), commit: vi.fn() }));
vi.mock("../../src/server/accounts/service", () => ({ requireSelf: auth.self, authenticatedAccount: auth.commit }));
import { createEvent, listEvents, mutateEvent, readEvent } from "../../src/server/events/service";
import { currentPublication } from "../../src/server/publication/reader";
import { EMPTY_EVENT } from "../../src/lib/event-fields";
import type { PrismaClient } from "../../src/server/db/generated/client";
const actor = "owner", id = "event-1";
const fields = { ...EMPTY_EVENT, title: "Workshop", description: "Description", location: "Hall", fee: "Free", openTo: "Anyone", preparation: "None", start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z", capacity: 10 };
// Transactional test double exercises service decisions/rollback, not PostgreSQL locking.
let dbNow: Date;
let activeCount: number;
let state: { events: Record<string, unknown>[], publications: Record<string, unknown>[], approvals: Record<string, unknown>[] };
function match(record: Record<string, unknown>, where: Record<string, unknown>) { return Object.entries(where).every(([key, value]) => record[key] === value); }
function table(name: keyof typeof state) { return {
  findUnique: async ({ where }: { where: Record<string, unknown> }) => state[name].find((row) => match(row, where)) ?? null,
  findFirst: async ({ where }: { where: Record<string, unknown> }) => state[name].find((row) => match(row, where)) ?? null,
  findMany: async ({ where, include }: { where: Record<string, unknown>, include?: { currentPublication?: boolean } }) => state[name].filter((row) => match(row, where)).map((row) =>
    name === "events" && include?.currentPublication ? { ...row, currentPublication: state.publications.find((pub) => pub.id === row.currentPublicationId) ?? null } : row),
  create: async ({ data }: { data: Record<string, unknown> }) => { state[name].push(data); return data; },
  update: async ({ where, data }: { where: Record<string, unknown>, data: Record<string, unknown> }) => {
    const row = state[name].find((row) => match(row, where))!;
    for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === "object" && "increment" in value ? (row[key] as number) + (value as { increment: number }).increment : value;
    return row;
  },
  delete: async ({ where }: { where: Record<string, unknown> }) => { state[name] = state[name].filter((row) => !match(row, where)); },
  deleteMany: async ({ where }: { where: Record<string, unknown> }) => { state[name] = state[name].filter((row) => !match(row, where)); },
}; }
const fake = {
  registration: { count: async () => activeCount },
  event: table("events"), eventPublication: table("publications"), eventApproval: table("approvals"),
  $queryRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => parts.join("").includes("clock_timestamp") ? [{ epochMs: dbNow.getTime() }] : state.events.filter((event) => event.id === values[0] && event.ownerId === values[1]).map(({ id }) => ({ id })),
  $transaction: async (fn: (db: unknown) => Promise<unknown>): Promise<unknown> => {
    const original = structuredClone(state);
    try { return await fn(fake); } catch (error) { state = original; throw error; }
  },
};
const db = fake as unknown as PrismaClient;
beforeEach(() => {
  activeCount = 0;
  dbNow = new Date("2026-10-21T00:00:00Z");
  vi.resetAllMocks(); auth.self.mockResolvedValue({ id: actor, role: "ORGANISER" }); auth.commit.mockResolvedValue({ id: actor, role: "ORGANISER" });
  state = { events: [{ id, ownerId: actor, state: "DRAFT", version: 0, draftVersion: 0, draft: structuredClone(fields), currentPublicationId: null, firstPublishedAt: null, editedAt: new Date() }], publications: [], approvals: [] };
});
async function previewAndPublish() {
  const preview = await mutateEvent(db, "token", id, state.events[0].version as number, "preview") as { approvalId: string };
  await mutateEvent(db, "token", id, state.events[0].version as number, "publish", undefined, preview.approvalId);
}
it("denies Students and foreign owners without disclosing or mutating events", async () => {
  auth.self.mockResolvedValueOnce({ id: actor, role: "STUDENT" });
  await expect(readEvent(db, "token", id)).rejects.toMatchObject({ status: 403 });
  state.events[0].ownerId = "foreign";
  await expect(readEvent(db, "token", id)).rejects.toMatchObject({ status: 404 });
  await expect(mutateEvent(db, "token", id, 0, "save", fields)).rejects.toMatchObject({ status: 404 });
  expect(state.events[0].version).toBe(0);
});
it("creates a private incomplete draft with server identity and UUID", async () => {
  const created = await createEvent(db, "token");
  expect(created.ownerId).toBe(actor); expect(created.id).toMatch(/^[0-9a-f-]{36}$/); expect(created.draft).toEqual(EMPTY_EVENT);
});
it("publishes only the exact preview, with immutable history and an empty versioned form", async () => {
  await previewAndPublish();
  const oldPublication = structuredClone(state.publications[0]);
  expect(state.events[0]).toMatchObject({ state: "PUBLISHED", version: 1 });
  expect(state.publications[0]).toMatchObject({ snapshot: { fields, form: { questions: [] } }, approvedBy: actor });
  await mutateEvent(db, "token", id, 1, "save", { ...fields, fee: "$2" });
  expect(state.publications[0]).toEqual(oldPublication);
  expect((await readEvent(db, "token", id)).published?.fields.fee).toBe("Free");
  await previewAndPublish(); expect(state.publications).toHaveLength(2);
  expect(state.publications[0]).toEqual(oldPublication);
});
it("publishes an unchanged approval after PostgreSQL JSONB reorders every object", async () => {
  const preview = await mutateEvent(db, "token", id, 0, "preview") as { approvalId: string };
  function reordered(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(reordered);
    if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reordered(item)]));
    return value;
  }
  state.approvals[0].snapshot = reordered(state.approvals[0].snapshot);
  state.events[0].draft = reordered(state.events[0].draft);
  await expect(mutateEvent(db, "token", id, 0, "publish", undefined, preview.approvalId)).resolves.toEqual({ published: true });
  expect(state.publications).toHaveLength(1);
});
it("rejects forged, stale and tampered approvals without publication", async () => {
  await expect(mutateEvent(db, "token", id, 0, "publish", undefined, "forged")).rejects.toMatchObject({ status: 409 });
  const preview = await mutateEvent(db, "token", id, 0, "preview") as { approvalId: string };
  await mutateEvent(db, "token", id, 0, "save", { ...fields, title: "Newer" });
  await expect(mutateEvent(db, "token", id, 0, "publish", undefined, preview.approvalId)).rejects.toMatchObject({ status: 409 });
  await expect(mutateEvent(db, "token", id, 1, "publish", undefined, preview.approvalId)).rejects.toMatchObject({ status: 409 });
  await mutateEvent(db, "token", id, 1, "preview"); state.approvals[0].digest = "tampered";
  await expect(mutateEvent(db, "token", id, 1, "publish", undefined, state.approvals[0].id as string)).rejects.toMatchObject({ status: 409 });
  expect(state.publications).toHaveLength(0); expect(state.events[0].state).toBe("DRAFT");
});
it("rolls back event, publication and approval writes if the session is revoked at commit", async () => {
  auth.commit.mockResolvedValueOnce({ id: actor, role: "ORGANISER" }).mockRejectedValueOnce(new Error("revoked"));
  await expect(mutateEvent(db, "token", id, 0, "save", { ...fields, title: "Changed" })).rejects.toThrow("revoked");
  expect(state.events[0]).toMatchObject({ version: 0, draft: fields });
  await mutateEvent(db, "token", id, 0, "preview");
  auth.commit.mockResolvedValueOnce({ id: actor, role: "ORGANISER" }).mockRejectedValueOnce(new Error("expired"));
  await expect(mutateEvent(db, "token", id, 0, "publish", undefined, state.approvals[0].id as string)).rejects.toThrow("expired");
  expect(state.publications).toHaveLength(0); expect(state.approvals).toHaveLength(1);
});
it("withdraws, requires fresh review to republish, and makes cancellation final", async () => {
  await previewAndPublish(); await mutateEvent(db, "token", id, 1, "withdraw");
  expect(state.events[0].state).toBe("WITHDRAWN");
  await expect(mutateEvent(db, "token", id, 2, "publish", undefined, "old")).rejects.toMatchObject({ status: 409 });
  await previewAndPublish(); await mutateEvent(db, "token", id, 3, "cancel");
  await expect(mutateEvent(db, "token", id, 4, "preview")).rejects.toMatchObject({ status: 409 });
  await expect(mutateEvent(db, "token", id, 4, "save", fields)).rejects.toMatchObject({ status: 409 });
});
it("permits deleting only never-published drafts and discards saved edits distinctly", async () => {
  await previewAndPublish(); await mutateEvent(db, "token", id, 1, "save", { ...fields, title: "Private edit" });
  await mutateEvent(db, "token", id, 2, "discard");
  expect(state.events[0]).toMatchObject({ draft: fields, version: 3 });
  await expect(mutateEvent(db, "token", id, 3, "delete")).rejects.toMatchObject({ status: 409 });
  await mutateEvent(db, "token", id, 3, "withdraw");
  await expect(mutateEvent(db, "token", id, 4, "delete")).rejects.toMatchObject({ status: 409 });
  state.events.push({ id: "blank", ownerId: actor, state: "DRAFT", version: 0 });
  await mutateEvent(db, "token", "blank", 0, "delete"); expect(state.events).toHaveLength(1);
});
it("combines own-only search and both-direction sorting with missing dates last", async () => {
  state.events.push({ ...state.events[0], id: "event-2", draft: { ...fields, title: "Another workshop", start: "" } });
  state.events.push({ ...state.events[0], id: "event-foreign", ownerId: "foreign" });
  expect((await listEvents(db, "token", "WORKSHOP", "title", "asc")).map((event) => event.id)).toEqual(["event-2", id]);
  expect((await listEvents(db, "token", "workshop", "title", "desc")).map((event) => event.id)).toEqual([id, "event-2"]);
  expect((await listEvents(db, "token", "workshop", "start", "desc")).map((event) => event.id)).toEqual([id, "event-2"]);
  expect(await listEvents(db, "token", "absent")).toEqual([]);
});
it("current public reader denies wrong role and unavailable lifecycle states", async () => {
  await expect(currentPublication(db, "token", id)).rejects.toMatchObject({ status: 403 });
  auth.self.mockResolvedValue({ id: "student", role: "STUDENT" });
  await expect(currentPublication(db, "token", id)).rejects.toMatchObject({ status: 404 });
});

it("cards/search/sort use publication content and content-based saved-change badges", async () => {
  await previewAndPublish();
  await mutateEvent(db, "token", id, 1, "save", { ...fields, title: "Hidden working title", start: "2099-10-31T02:00:00.000Z" });
  const [card] = await listEvents(db, "token", "workshop", "start", "asc");
  expect(card).toMatchObject({ fields, hasSavedChanges: true, state: "PUBLISHED" });
  expect(await listEvents(db, "token", "hidden working")).toEqual([]);
  await mutateEvent(db, "token", id, 2, "save", fields);
  expect((await listEvents(db, "token"))[0].hasSavedChanges).toBe(false);
  await mutateEvent(db, "token", id, 3, "withdraw");
  expect((await listEvents(db, "token"))[0]).toMatchObject({ fields, hasSavedChanges: false, state: "WITHDRAWN" });
  await mutateEvent(db, "token", id, 4, "save", { ...fields, title: "Other working title" });
  expect((await listEvents(db, "token"))[0].hasSavedChanges).toBe(true);
  await mutateEvent(db, "token", id, 5, "cancel");
  expect((await listEvents(db, "token"))[0]).toMatchObject({ fields, hasSavedChanges: false, state: "CANCELLED" });
});
it("publishing rechecks changed-start time after an earlier future reschedule was previewed", async () => {
  await previewAndPublish();
  const earlier = { ...fields, start: "2099-10-31T02:00:00.000Z" };
  await mutateEvent(db, "token", id, 1, "save", earlier);
  const preview = await mutateEvent(db, "token", id, 2, "preview") as { approvalId: string };
  activeCount = 0;
  dbNow = new Date(earlier.start);
  await expect(mutateEvent(db, "token", id, 2, "publish", undefined, preview.approvalId)).rejects.toMatchObject({ status: 400 });
  expect(state.publications).toHaveLength(1);
  expect((await readEvent(db, "token", id)).published?.fields.start).toBe(fields.start);
});

it("binds saved nonempty forms to preview/publication and preserves IDs on label edits", async () => {
  await mutateEvent(db, "token", id, 0, "save", fields, undefined, { questions: [{ type: "short_text", label: "Dietary needs", required: false }] });
  const saved = (await readEvent(db, "token", id)).form;
  expect(saved.questions[0].id).toMatch(/^[0-9a-f-]{36}$/);
  await previewAndPublish();
  const original = structuredClone(state.publications[0]);
  expect(state.publications[0]).toMatchObject({ snapshot: { form: saved } });
  await mutateEvent(db, "token", id, 2, "save", fields, undefined, { questions: [{ ...saved.questions[0], label: "Dietary preferences" }] });
  expect((await listEvents(db, "token"))[0].hasSavedChanges).toBe(true);
  await previewAndPublish();
  expect(state.publications[0]).toEqual(original);
  expect((await readEvent(db, "token", id)).published?.form.questions[0].id).toBe(saved.questions[0].id);
});
it("rejects capacity below active places while preserving the current publication", async () => {
  await previewAndPublish();
  await mutateEvent(db, "token", id, 1, "save", { ...fields, capacity: 1 });
  const preview = await mutateEvent(db, "token", id, 2, "preview") as { approvalId: string };
  activeCount = 2;
  await expect(mutateEvent(db, "token", id, 2, "publish", undefined, preview.approvalId)).rejects.toMatchObject({ status: 409, field: "capacity" });
  expect(state.publications).toHaveLength(1);
  expect((await readEvent(db, "token", id)).published?.fields.capacity).toBe(10);
});
