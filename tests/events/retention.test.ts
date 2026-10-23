import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ self: vi.fn(), commit: vi.fn() }));
vi.mock("../../src/server/accounts/service", () => ({ requireSelf: auth.self, authenticatedAccount: auth.commit }));
import { Prisma, type PrismaClient } from "../../src/server/db/generated/client";
import { EMPTY_EVENT } from "../../src/lib/event-fields";
import { PRIVATE_DRAFT_RETENTION_MS, draftRetentionStatus } from "../../src/lib/event-retention";
import { digest, publicationSnapshot } from "../../src/server/events/policy";
import { runDraftRetentionSweep } from "../../src/server/events/retention";
import { mutateEvent, readEvent, recordProposalExtraction } from "../../src/server/events/service";
import type { PrivateExtraction } from "../../src/features/proposal-assistance/types";

const actor = "a3c1fedd-1bdf-4e70-9fa0-4e8a074c2587";
const formId = "e3c1fedd-1bdf-4e70-9fa0-4e8a074c2587";
const publicFields = { ...EMPTY_EVENT, title: "Workshop", description: "Public details", location: "Hall", fee: "Free", openTo: "Anyone", preparation: "None", start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z", capacity: 10 };
const oldAt = new Date("2026-09-01T00:00:00.000Z");
let dbNow: Date;
let state: { events: Record<string, any>[]; publications: Record<string, any>[]; approvals: Record<string, any>[] };
let rawQueries: string[];

function due(row: Record<string, any>) {
  return row.privateActivityAt instanceof Date && row.privateActivityAt.getTime() <= dbNow.getTime() - PRIVATE_DRAFT_RETENTION_MS;
}
function compareClaims(left: Record<string, any>, right: Record<string, any>) {
  if (left.retentionCheckedAt === null && right.retentionCheckedAt !== null) return -1;
  if (left.retentionCheckedAt !== null && right.retentionCheckedAt === null) return 1;
  const checked = (left.retentionCheckedAt?.getTime() ?? 0) - (right.retentionCheckedAt?.getTime() ?? 0);
  return checked || left.privateActivityAt.getTime() - right.privateActivityAt.getTime() || left.id.localeCompare(right.id);
}
function table(name: keyof typeof state) {
  return {
    findUnique: async ({ where }: { where: Record<string, unknown> }) => state[name].find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    findFirst: async ({ where }: { where: Record<string, unknown> }) => state[name].find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    findMany: async ({ where, orderBy, take }: { where: Record<string, unknown>; orderBy?: { revision?: string }; take?: number }) => {
      let rows = state[name].filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
      if (name === "publications" && orderBy?.revision === "desc") rows = [...rows].sort((a, b) => b.revision - a.revision);
      return take ? rows.slice(0, take) : rows;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => { state[name].push(data); return data; },
    update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const row = state[name].find((candidate) => Object.entries(where).every(([key, value]) => candidate[key] === value))!;
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === "object" && "increment" in value) row[key] = (row[key] as number) + (value as { increment: number }).increment;
        else row[key] = value === Prisma.DbNull ? null : value;
      }
      return row;
    },
    delete: async ({ where }: { where: Record<string, unknown> }) => {
      const deleted = state[name].find((row) => Object.entries(where).every(([key, value]) => row[key] === value));
      state[name] = state[name].filter((row) => !Object.entries(where).every(([key, value]) => row[key] === value));
      if (name === "events" && deleted) state.approvals = state.approvals.filter((approval) => approval.eventId !== deleted.id);
      return deleted;
    },
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      const before = state[name].length;
      state[name] = state[name].filter((row) => !Object.entries(where).every(([key, value]) => row[key] === value));
      return { count: before - state[name].length };
    },
  };
}
const fake: any = {
  event: table("events"), eventPublication: table("publications"), eventApproval: table("approvals"),
  $queryRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const query = parts.join("");
    rawQueries.push(query);
    if (query.includes("epochMs")) return [{ epochMs: dbNow.getTime() }];
    if (query.includes("AS now")) return [{ now: new Date(dbNow) }];
    if (query.includes("WITH candidates")) {
      const rows = state.events.filter(due).sort(compareClaims).slice(0, 50);
      rows.forEach((row) => { row.retentionCheckedAt = new Date(dbNow); });
      return rows.map(({ id }) => ({ id }));
    }
    if (query.includes("private_activity_at")) return state.events.filter(due).sort(compareClaims).slice(0, 50).map(({ id }) => ({ id }));
    if (query.includes("FOR UPDATE")) return state.events.some((row) => row.id === values[0]) ? [{ id: values[0] }] : [];
    throw new Error("Unexpected test SQL.");
  },
  $transaction: async (callback: (tx: any) => Promise<unknown>) => {
    const before = structuredClone(state);
    try { return await callback(fake); } catch (error) { state = before; throw error; }
  },
};
const db = fake as PrismaClient;

function eventId(index: number) { return `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`; }
function privateDraft(id: string) {
  return { id, ownerId: actor, state: "DRAFT", version: 1, draftVersion: 1, draft: structuredClone(publicFields),
    preparation: null, preparationVersion: 0, privateActivityAt: oldAt, retentionCheckedAt: null,
    firstPublishedAt: null, currentPublicationId: null, editedAt: oldAt };
}
function publishedDraft(id: string, options: { state?: string; invalid?: boolean; incomplete?: boolean; preparation?: unknown; preparationVersion?: number; draft?: unknown } = {}) {
  const publicationId = eventId(Number(id.slice(-12)) + 1000);
  const snapshot = publicationSnapshot(structuredClone(publicFields), formId);
  if (options.invalid) snapshot.fields.title = "Tampered";
  if (options.incomplete) snapshot.fields.title = "";
  const publication = { id: publicationId, eventId: id, revision: 1, snapshot,
    digest: digest(options.invalid ? publicationSnapshot(publicFields, formId) : snapshot) };
  return {
    event: { ...privateDraft(id), state: options.state ?? "WITHDRAWN", version: 9, draftVersion: 7,
      draft: options.draft ?? { ...publicFields, title: "Private title" }, preparation: options.preparation ?? { issues: [] },
      preparationVersion: options.preparationVersion ?? 3, firstPublishedAt: new Date("2026-08-01T00:00:00.000Z"), currentPublicationId: publicationId },
    publication,
  };
}

beforeEach(() => {
  dbNow = new Date("2026-10-23T00:00:00.000Z");
  vi.stubEnv("TURNUP_ENVIRONMENT", "development"); vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DATABASE_ENVIRONMENT", "non-production"); vi.stubEnv("VERCEL_ENV", "development");
  vi.stubEnv("PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC", "false");
  auth.self.mockResolvedValue({ id: actor, role: "ORGANISER" }); auth.commit.mockResolvedValue({ id: actor, role: "ORGANISER" });
  state = { events: [], publications: [], approvals: [] };
  rawQueries = [];
});

it("computes the 23-day warning and 30-day eligibility from one DB clock", () => {
  const activity = new Date("2026-10-01T00:00:00.000Z");
  expect(draftRetentionStatus(activity, new Date("2026-10-24T00:00:00.000Z"), "delete_draft")).toMatchObject({ warning: true, expired: false });
  expect(draftRetentionStatus(activity, new Date("2026-10-31T00:00:00.000Z"), "delete_draft")).toMatchObject({ warning: true, expired: true });
  expect(draftRetentionStatus(null, dbNow, "delete_draft")).toBeNull();
});

it("deletes only an expired never-published draft and its dependent approvals", async () => {
  const id = eventId(1); state.events.push(privateDraft(id)); state.approvals.push({ id: "approval", eventId: id });
  const result = await runDraftRetentionSweep(db);
  expect(result).toMatchObject({ scanned: 1, deletedDrafts: 1, restoredPublications: 0, unavailable: 0 });
  expect(state.events).toHaveLength(0); expect(state.approvals).toHaveLength(0);
  expect(Object.keys(result).some((key) => /id|owner|content/i.test(key))).toBe(false);
});

it("claims a bounded batch with database locks and gives unchecked rows priority", async () => {
  state.events.push(privateDraft(eventId(61)));
  await runDraftRetentionSweep(db);
  const claim = rawQueries.find((query) => query.includes("WITH candidates"));
  expect(claim).toBeDefined();
  expect(claim).toContain("ORDER BY retention_checked_at ASC NULLS FIRST, private_activity_at ASC, id ASC");
  expect(claim).toContain("LIMIT");
  expect(claim).toContain("FOR UPDATE SKIP LOCKED");
  expect(claim).toContain("SET retention_checked_at = clock_timestamp()");
});

it("restores a prior publication without changing lifecycle/history and zeroes every stale revision", async () => {
  const id = eventId(2); const prior = publishedDraft(id, { state: "CANCELLED" });
  state.events.push(prior.event); state.publications.push(prior.publication); state.approvals.push({ id: "approval", eventId: id });
  const result = await runDraftRetentionSweep(db);
  expect(result.restoredPublications).toBe(1);
  expect(state.events[0]).toMatchObject({ state: "CANCELLED", currentPublicationId: prior.publication.id,
    draft: publicFields, preparation: null, preparationVersion: 0, version: 10, draftVersion: 8,
    privateActivityAt: null });
  expect(state.publications).toEqual([prior.publication]); expect(state.approvals).toHaveLength(0);

  await expect(mutateEvent(db, "token", id, 9, "save", publicFields)).rejects.toMatchObject({ status: 409 });
  await expect(mutateEvent(db, "token", id, 9, "publish", undefined, "old-approval")).rejects.toMatchObject({ status: 409 });
  const extraction: PrivateExtraction = { facts: { title: { status: "missing", evidence: [] } }, privateFindings: [], completeness: "incomplete", incompleteReasons: ["unprocessed_fields"], unprocessedFields: ["title"], technicalIssues: 0 };
  await expect(recordProposalExtraction(db, "token", id, 9, 0, extraction)).rejects.toMatchObject({ status: 409 });
  vi.stubEnv("TURNUP_ENVIRONMENT", "production"); vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_ENVIRONMENT", "production"); vi.stubEnv("VERCEL_ENV", "production");
  await expect(readEvent(db, "token", id)).resolves.toMatchObject({ preparation: null, retention: null, version: 10 });
});

it("fails closed on a corrupt publication and fairly advances past more than one batch of poison rows", async () => {
  for (let index = 1; index <= 50; index++) {
    const corrupt = publishedDraft(eventId(index), { invalid: true });
    state.events.push(corrupt.event); state.publications.push(corrupt.publication);
  }
  const healthy = privateDraft(eventId(51)); state.events.push(healthy);
  const first = await runDraftRetentionSweep(db);
  expect(first).toMatchObject({ scanned: 50, unavailable: 50, deletedDrafts: 0 });
  expect(state.events.some((event) => event.id === healthy.id)).toBe(true);
  const second = await runDraftRetentionSweep(db);
  expect(second).toMatchObject({ scanned: 50, deletedDrafts: 1 });
  expect(state.events.some((event) => event.id === healthy.id)).toBe(false);
  expect(state.events).toHaveLength(50);
});

it("fails closed when a publication has a valid digest but incomplete required fields", async () => {
  const prior = publishedDraft(eventId(70), { incomplete: true });
  state.events.push(prior.event);
  state.publications.push(prior.publication);
  const beforeDraft = structuredClone(prior.event.draft);
  const result = await runDraftRetentionSweep(db);
  expect(result).toMatchObject({ scanned: 1, unavailable: 1, restoredPublications: 0, deletedDrafts: 0 });
  expect(state.events[0].draft).toEqual(beforeDraft);
  expect(state.events[0].preparation).toEqual({ issues: [] });
});

it("dry run reports only bounded counts and leaves scheduler and event rows untouched", async () => {
  state.events.push(privateDraft(eventId(60)));
  const before = structuredClone(state);
  const result = await runDraftRetentionSweep(db, { dryRun: true });
  expect(result).toEqual({ scanned: 1, deletedDrafts: 0, restoredPublications: 0, unchanged: 1, unavailable: 0 });
  expect(state).toEqual(before);
});

it("restores form-only private edits from a nonempty published form", async () => {
  const prior = publishedDraft(eventId(80), { draft: publicFields });
  const question = { id: eventId(81), type: "short_text" as const, label: "Published question", required: false };
  prior.publication.snapshot = publicationSnapshot(publicFields, formId, [question]);
  prior.publication.digest = digest(prior.publication.snapshot);
  state.events.push({ ...prior.event, preparation: null, preparationVersion: 0, draftForm: { questions: [{ ...question, label: "Private question" }] } });
  state.publications.push(prior.publication);
  const original = structuredClone(prior.publication);
  expect(await runDraftRetentionSweep(db)).toMatchObject({ restoredPublications: 1, unavailable: 0 });
  expect(state.events[0]).toMatchObject({ draftForm: { questions: [question] }, privateActivityAt: null, version: 10 });
  expect(state.publications[0]).toEqual(original);
});
