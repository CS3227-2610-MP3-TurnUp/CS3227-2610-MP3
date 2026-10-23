import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ self: vi.fn(), commit: vi.fn() }));
const proposalRoute = vi.hoisted(() => ({ db: undefined as unknown, complete: vi.fn(), extract: vi.fn(), process: vi.fn() }));
vi.mock("../../src/server/accounts/service", () => ({
  privateHeaders: { "Cache-Control": "no-store, private", Vary: "Cookie" },
  requireSelf: auth.self,
  authenticatedAccount: auth.commit,
}));
vi.mock("../../src/server/auth/request-security", () => ({
  authConfig: () => ({ origin: "https://turnup.example", secret: "a".repeat(64), secure: true, sourceMode: "vercel" }),
  requireOrigin: () => undefined,
}));
vi.mock("../../src/server/auth/session", () => ({ presentedToken: () => "token" }));
vi.mock("../../src/server/proposal-assistance/admission", () => ({ admitProposalExtraction: vi.fn() }));
vi.mock("../../src/server/proposal-assistance/transport", () => ({
  proposalCompletionAvailability: () => ({ available: true }),
  requestProposalCompletion: proposalRoute.complete,
}));
vi.mock("../../src/server/proposal-assistance/pdf-text", () => ({
  MAX_PROPOSAL_PDF_BYTES: 4_000_000,
  extractPdfPageText: proposalRoute.extract,
}));
vi.mock("../../src/server/proposal-assistance/processor", () => ({ processProposalExtraction: proposalRoute.process }));
vi.mock("../../src/server/db/client", () => ({ prisma: proposalRoute.db }));
import { createEvent, listEvents, mutateEvent, readEvent, readSavedPublicCandidateSnapshot, recordProposalExtraction } from "../../src/server/events/service";
import { POST as proposalExtractionPost } from "../../src/app/api/organiser/events/[id]/proposal-extraction/route";
import { currentPublication } from "../../src/server/publication/reader";
import { EMPTY_EVENT } from "../../src/lib/event-fields";
import type { PrivateExtraction } from "../../src/features/proposal-assistance/types";
import type { PrismaClient } from "../../src/server/db/generated/client";
const actor = "a3c1fedd-1bdf-4e70-9fa0-4e8a074c2587", id = "8aa3c13d-d179-46bc-aec9-d24873953e32";
const fields = { ...EMPTY_EVENT, title: "Workshop", description: "Description", location: "Hall", fee: "Free", openTo: "Anyone", preparation: "None", start: "2099-11-01T02:00:00.000Z", end: "2099-11-01T04:00:00.000Z", capacity: 10 };
const titleExtraction: PrivateExtraction = {
  facts: { title: { status: "known", value: "Workshop", evidence: [{ quote: "Workshop", page: 1 }] } },
  privateFindings: [], completeness: "incomplete", incompleteReasons: ["unprocessed_fields"], unprocessedFields: ["purpose"], technicalIssues: 0,
};
// Transactional test double exercises service decisions/rollback, not PostgreSQL locking.
let dbNow: Date;
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
  event: table("events"), eventPublication: table("publications"), eventApproval: table("approvals"),
  $queryRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => parts.join("").includes("clock_timestamp") ? [{ now: new Date(dbNow) }] : state.events.filter((event) => event.id === values[0] && event.ownerId === values[1]).map(({ id }) => ({ id })),
  $transaction: async (fn: (db: unknown) => Promise<unknown>): Promise<unknown> => {
    const original = structuredClone(state);
    try { return await fn(fake); } catch (error) { state = original; throw error; }
  },
};
const db = fake as unknown as PrismaClient;
beforeEach(() => {
  vi.unstubAllEnvs();
  dbNow = new Date("2026-10-21T00:00:00Z");
  vi.resetAllMocks(); auth.self.mockResolvedValue({ id: actor, role: "ORGANISER" }); auth.commit.mockResolvedValue({ id: actor, role: "ORGANISER" });
  state = { events: [{ id, ownerId: actor, state: "DRAFT", version: 0, draftVersion: 0, draft: structuredClone(fields), preparation: null, preparationVersion: 0, privateActivityAt: new Date(dbNow), retentionCheckedAt: null, currentPublicationId: null, firstPublishedAt: null, editedAt: new Date() }], publications: [], approvals: [] };
  proposalRoute.db = fake;
  proposalRoute.complete.mockResolvedValue({ ok: true, text: "synthetic completion" });
  proposalRoute.extract.mockResolvedValue({ ok: true, pageTexts: ["Workshop"] });
  proposalRoute.process.mockImplementation(async (_pages: readonly string[], complete: (input: { system: string; user: string; signal?: AbortSignal }) => Promise<unknown>) => {
    const completion = await complete({ system: "synthetic system", user: "synthetic user" });
    return completion && typeof completion === "object" && "ok" in completion && completion.ok
      ? { ok: true, value: titleExtraction }
      : { ok: false, outcome: "unavailable" };
  });
});
afterEach(() => vi.unstubAllEnvs());
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
  expect(created.privateActivityAt).toEqual(dbNow);
});
it("publishes only the exact preview, with immutable history and an empty versioned form", async () => {
  await previewAndPublish();
  expect(state.events[0].privateActivityAt).toBeNull();
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
  dbNow = new Date(earlier.start);
  await expect(mutateEvent(db, "token", id, 2, "publish", undefined, preview.approvalId)).rejects.toMatchObject({ status: 400 });
  expect(state.publications).toHaveLength(1);
  expect((await readEvent(db, "token", id)).published?.fields.start).toBe(fields.start);
});

function localPreparationEnvironment() {
  vi.stubEnv("TURNUP_ENVIRONMENT", "development");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DATABASE_ENVIRONMENT", "non-production");
  vi.stubEnv("VERCEL_ENV", "development");
  vi.stubEnv("PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC", "false");
}

function hostedPreviewEnvironment(enabled: boolean) {
  vi.stubEnv("TURNUP_ENVIRONMENT", "preview");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("DATABASE_ENVIRONMENT", "non-production");
  vi.stubEnv("DATABASE_URL", "postgresql://synthetic:synthetic@ep-preview-pooler.us-east-1.aws.neon.tech/synthetic?sslmode=require");
  vi.stubEnv("PROPOSAL_ASSISTANCE_HOSTED_ENABLED", String(enabled));
}

function missingTitleExtraction(): PrivateExtraction {
  return { facts: { title: { status: "missing", evidence: [] } }, privateFindings: [], completeness: "incomplete",
    incompleteReasons: ["unprocessed_fields"], unprocessedFields: ["title"], technicalIssues: 0 };
}

it("exposes owner expiry metadata without touching the activity timestamp on reads or previews", async () => {
  dbNow = new Date("2026-11-12T00:00:00.000Z");
  const originalActivity = new Date("2026-10-21T00:00:00.000Z");
  state.events[0].privateActivityAt = originalActivity;
  expect((await readEvent(db, "token", id)).retention).toEqual({
    expiresAt: "2026-11-20T00:00:00.000Z", warningAt: "2026-11-13T00:00:00.000Z",
    warning: false, expired: false, disposition: "delete_draft",
  });
  await listEvents(db, "token");
  await mutateEvent(db, "token", id, 0, "preview");
  expect(state.events[0].privateActivityAt).toEqual(originalActivity);
  dbNow = new Date("2026-11-20T00:00:00.000Z");
  expect((await readEvent(db, "token", id)).retention).toMatchObject({ warning: true, expired: true });
});

it("resets expiry only on successful saves and accepted persisted extractions", async () => {
  dbNow = new Date("2026-10-22T12:00:00.000Z");
  await mutateEvent(db, "token", id, 0, "save", fields);
  expect(state.events[0].privateActivityAt).toEqual(dbNow);
  expect(state.events[0].retentionCheckedAt).toBeNull();
  localPreparationEnvironment();
  dbNow = new Date("2026-10-24T06:30:00.000Z");
  const accepted = await recordProposalExtraction(db, "token", id, 1, 0, missingTitleExtraction());
  expect(state.events[0].privateActivityAt).toEqual(dbNow);
  expect(accepted.retention).toMatchObject({ disposition: "delete_draft", warning: false, expired: false });
});

it("records issues atomically, increments both revisions, and invalidates an earlier preview", async () => {
  localPreparationEnvironment();
  await mutateEvent(db, "token", id, 0, "preview");
  const result = await recordProposalExtraction(db, "token", id, 0, 0, missingTitleExtraction());
  expect(result).toMatchObject({ eventVersion: 1, preparation: { revision: 1, issues: [{ field: "title", reason: "source_missing", resolution: null }] } });
  expect(state.events[0]).toMatchObject({ version: 1, preparationVersion: 1, preparation: { issues: result.preparation.issues } });
  expect(state.approvals).toHaveLength(0);
  expect(await readEvent(db, "token", id)).toMatchObject({ preparation: result.preparation, version: 1 });
  await expect(mutateEvent(db, "token", id, 1, "preview")).rejects.toMatchObject({ status: 409, field: "title" });
});

it("persists a hosted Preview extraction and keeps its saved clarification, FAQ readiness, and publishing usable when inference is disabled", async () => {
  hostedPreviewEnvironment(true);
  const form = new FormData();
  form.append("file", new File(["synthetic PDF bytes"], "proposal.pdf", { type: "application/pdf" }));
  form.append("expectedVersion", "0");
  form.append("expectedPreparationRevision", "0");
  form.append("revisions", JSON.stringify({ source: 0, facts: 0, editor: 0 }));
  const response = await proposalExtractionPost(new Request(`https://turnup.example/api/organiser/events/${id}/proposal-extraction`, {
    method: "POST", headers: { origin: "https://turnup.example" }, body: form,
  }), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    ok: true,
    extraction: titleExtraction,
    eventVersion: 1,
    preparation: { revision: 1, issues: [] },
  });
  expect(state.events[0]).toMatchObject({ version: 1, preparationVersion: 1, preparation: { issues: [] } });

  // The hosted inference opt-in can later be disabled without making existing
  // private clarification data inaccessible or blocking manual publication.
  vi.stubEnv("PROPOSAL_ASSISTANCE_HOSTED_ENABLED", "false");
  await expect(readEvent(db, "token", id)).resolves.toMatchObject({
    preparation: { revision: 1, issues: [] },
    version: 1,
  });
  await mutateEvent(db, "token", id, 1, "save", fields, undefined, { expectedPreparationRevision: 1, resolutions: [] });
  const snapshot = await readSavedPublicCandidateSnapshot(db, "token", id, 2, 2);
  expect(snapshot.source.title).toBe("Workshop");
  expect(snapshot).not.toHaveProperty("preparation");
  const preview = await mutateEvent(db, "token", id, 2, "preview") as { approvalId: string };
  await mutateEvent(db, "token", id, 2, "publish", undefined, preview.approvalId);
  expect(state.events[0].state).toBe("PUBLISHED");
  expect(proposalRoute.complete).toHaveBeenCalledOnce();
});

it("rejects stale extraction revisions without changing saved draft or clarifications", async () => {
  localPreparationEnvironment();
  await recordProposalExtraction(db, "token", id, 0, 0, missingTitleExtraction());
  const before = structuredClone(state.events[0]);
  await expect(recordProposalExtraction(db, "token", id, 1, 0, missingTitleExtraction())).rejects.toMatchObject({ status: 409 });
  expect(state.events[0]).toEqual(before);
});

it("saves an explicit manual confirmation, then reopens only that issue when its value changes", async () => {
  localPreparationEnvironment();
  await recordProposalExtraction(db, "token", id, 0, 0, missingTitleExtraction());
  await mutateEvent(db, "token", id, 1, "save", { ...fields, title: "Owner chosen title" }, undefined, {
    expectedPreparationRevision: 1,
    resolutions: [{ field: "title", method: "organiser", value: "Owner chosen title" }],
  });
  expect(state.events[0]).toMatchObject({ version: 2, preparationVersion: 2, preparation: { issues: [{
    field: "title", confirmedValue: "Owner chosen title",
    resolution: { method: "organiser", value: "Owner chosen title", evidence: [] },
  }] } });
  await mutateEvent(db, "token", id, 2, "preview");

  await mutateEvent(db, "token", id, 2, "save", { ...fields, title: "Changed without confirmation" }, undefined, {
    expectedPreparationRevision: 2, resolutions: [],
  });
  expect(state.events[0]).toMatchObject({ version: 3, preparationVersion: 3, preparation: { issues: [{
    field: "title", reason: "answer_changed", confirmedValue: "Owner chosen title", resolution: null,
  }] } });
  await expect(mutateEvent(db, "token", id, 3, "preview")).rejects.toMatchObject({ status: 409, field: "title" });
  await expect(mutateEvent(db, "token", id, 3, "publish", undefined, "forged-approval")).rejects.toMatchObject({ status: 409, field: "title" });
});

it("keeps clarification issues through Discard and reopens an answer changed by restoring publication fields", async () => {
  localPreparationEnvironment();
  await previewAndPublish();
  await recordProposalExtraction(db, "token", id, 1, 0, missingTitleExtraction());
  await mutateEvent(db, "token", id, 2, "save", { ...fields, title: "Private answer" }, undefined, {
    expectedPreparationRevision: 1,
    resolutions: [{ field: "title", method: "organiser", value: "Private answer" }],
  });
  await mutateEvent(db, "token", id, 3, "discard");
  expect(state.events[0]).toMatchObject({ version: 4, draft: fields, preparationVersion: 3, preparation: { issues: [{
    field: "title", reason: "answer_changed", confirmedValue: "Private answer", resolution: null,
  }] } });
});

it("fails closed on assisted records outside local scope while preserving the null-preparation manual path", async () => {
  localPreparationEnvironment();
  await recordProposalExtraction(db, "token", id, 0, 0, missingTitleExtraction());
  vi.stubEnv("TURNUP_ENVIRONMENT", "production");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_ENVIRONMENT", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  await expect(readEvent(db, "token", id)).rejects.toMatchObject({ status: 503 });
  await expect(mutateEvent(db, "token", id, 1, "preview")).rejects.toMatchObject({ status: 503 });
  await expect(mutateEvent(db, "token", id, 1, "save", { ...fields, title: "Changed" })).rejects.toMatchObject({ status: 503 });
  await expect(mutateEvent(db, "token", id, 1, "discard")).rejects.toMatchObject({ status: 503 });
  expect(state.events[0]).toMatchObject({ preparationVersion: 1, preparation: { issues: [{ field: "title" }] } });

  state.events[0].preparation = null;
  state.events[0].preparationVersion = 0;
  const preview = await mutateEvent(db, "token", id, 1, "preview") as { approvalId: string };
  await mutateEvent(db, "token", id, 1, "publish", undefined, preview.approvalId);
  expect(state.events[0].state).toBe("PUBLISHED");
});

it("reads a publishable saved public-candidate source with readable SGT times and no private preparation", async () => {
  localPreparationEnvironment();
  const snapshot = await readSavedPublicCandidateSnapshot(db, "token", id, 0, 0);
  expect(snapshot).toMatchObject({ ownerId: actor, eventVersion: 0, preparationRevision: 0, state: "DRAFT" });
  expect(snapshot.source).toEqual({
    title: "Workshop",
    description: "Description",
    start: "01/11/2099, 10:00 AM SGT",
    end: "01/11/2099, 12:00 PM SGT",
    location: "Hall",
    capacity: "10",
    fee: "Free",
    openTo: "Anyone",
    preparation: "None",
    other: "",
  });
  expect(snapshot).not.toHaveProperty("preparation");
  expect(snapshot).not.toHaveProperty("fields");
});

it("blocks candidate readiness for incomplete public drafts and unresolved saved issues", async () => {
  localPreparationEnvironment();
  state.events[0].draft = { ...fields, description: "" };
  await expect(readSavedPublicCandidateSnapshot(db, "token", id, 0, 0)).rejects.toMatchObject({ status: 409, field: "description" });
  state.events[0].draft = structuredClone(fields);
  await recordProposalExtraction(db, "token", id, 0, 0, missingTitleExtraction());
  await expect(readSavedPublicCandidateSnapshot(db, "token", id, 1, 1)).rejects.toMatchObject({ status: 409, field: "title" });
});

it("rejects stale source revisions and foreign access without returning a source snapshot", async () => {
  localPreparationEnvironment();
  await mutateEvent(db, "token", id, 0, "save", { ...fields, title: "Changed" });
  await expect(readSavedPublicCandidateSnapshot(db, "token", id, 0, 0)).rejects.toMatchObject({ status: 409 });
  state.events[0].ownerId = "foreign-owner";
  await expect(readSavedPublicCandidateSnapshot(db, "token", id, 1, 0)).rejects.toMatchObject({ status: 404 });
});
