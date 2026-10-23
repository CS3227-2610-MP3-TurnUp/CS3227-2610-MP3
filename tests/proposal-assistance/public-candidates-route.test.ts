import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  class NotReady extends Error {
    status = 409;
    field?: string;
    constructor(field?: string) { super("Not ready"); this.field = field; }
  }
  return {
    NotReady,
    requireOrigin: vi.fn(),
    token: vi.fn(),
    access: vi.fn(),
    admission: vi.fn(),
    availability: vi.fn(),
    process: vi.fn(),
    complete: vi.fn(),
    readSnapshot: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("../../src/server/auth/request-security", () => ({
  authConfig: () => ({ origin: "http://127.0.0.1:3107", secret: "a".repeat(64), secure: false, sourceMode: "local" }),
  requireOrigin: mocked.requireOrigin,
}));
vi.mock("../../src/server/auth/session", () => ({ presentedToken: mocked.token }));
vi.mock("../../src/server/accounts/service", () => ({ privateHeaders: { "Cache-Control": "no-store, private", Vary: "Cookie" } }));
vi.mock("../../src/server/proposal-assistance/access", () => ({ assertProposalEventAccess: mocked.access }));
vi.mock("../../src/server/proposal-assistance/admission", () => ({ admitProposalExtraction: mocked.admission }));
vi.mock("../../src/server/proposal-assistance/transport", () => ({
  proposalCompletionAvailability: mocked.availability,
  requestProposalCompletion: mocked.complete,
}));
vi.mock("../../src/server/proposal-assistance/public-candidates/processor", () => ({ processPublicCandidates: mocked.process }));
vi.mock("../../src/server/events/service", () => ({
  PublicCandidateNotReadyError: mocked.NotReady,
  readSavedPublicCandidateSnapshot: mocked.readSnapshot,
}));
vi.mock("../../src/server/db/client", () => ({ prisma: {} }));

import { AuthError } from "../../src/server/auth/policy";
import { EventError } from "../../src/server/events/policy";
import { POST } from "../../src/app/api/organiser/events/[id]/public-candidates/route";
import type { PublicCandidateSource } from "../../src/features/proposal-assistance/public-candidates";

const eventId = "a3c1fedd-1bdf-4e70-9fa0-4e8a074c2587";
const ownerId = "8f8a6b85-0f7e-4bf5-b468-90c8a249a2a0";
const source: PublicCandidateSource = {
  title: "Design Workshop", description: "You will practise design.",
  start: "14/11/2026, 09:00 PM SGT", end: "14/11/2026, 10:00 PM SGT",
  location: "Zoom", capacity: "80", fee: "Free", openTo: "NUS students", preparation: "Bring a laptop", other: "",
};
const snapshot = { ownerId, eventVersion: 4, preparationRevision: 2, state: "DRAFT", source };
const candidates = {
  answeredFaqs: [{ question: "Where?", answer: "Zoom", references: [{ field: "location", quote: "Zoom" }] }],
  unansweredQuestions: ["Will a recording be available?"],
  renderedOther: "Q: Where?\nA: Zoom",
};

function request(body: unknown = { expectedVersion: 4, expectedPreparationRevision: 2 }, origin = "http://127.0.0.1:3107") {
  return new Request(`http://127.0.0.1:3107/api/organiser/events/${eventId}/public-candidates`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocked.requireOrigin.mockReset().mockImplementation((requestValue: Request) => {
    if (requestValue.headers.get("origin") !== "http://127.0.0.1:3107") throw new AuthError(403, "Origin rejected.");
  });
  mocked.token.mockReset().mockReturnValue("presented-session-token");
  mocked.access.mockReset().mockResolvedValue({ ownerId, eventVersion: 4, preparationRevision: 2 });
  mocked.admission.mockReset().mockResolvedValue(undefined);
  mocked.availability.mockReset().mockReturnValue({ available: true });
  mocked.complete.mockReset().mockResolvedValue({ ok: true, text: "model JSON" });
  mocked.process.mockReset().mockImplementation(async (publicSource: PublicCandidateSource, complete: (input: { system: string; user: string; signal?: AbortSignal }) => Promise<unknown>) => {
    await complete({ system: "candidate system", user: "public-only input" });
    return { ok: true, value: candidates };
  });
  mocked.readSnapshot.mockReset().mockResolvedValue(snapshot);
});

afterEach(() => vi.restoreAllMocks());

describe("saved-public-draft candidate route", () => {
  it("returns only bounded candidates and versions after an unchanged source recheck", async () => {
    const requestValue = request();
    const response = await POST(requestValue, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, eventVersion: 4, preparationRevision: 2, candidates });
    expect(JSON.stringify(body)).not.toContain(ownerId);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocked.access).toHaveBeenCalledWith({}, "presented-session-token", eventId);
    expect(mocked.admission).toHaveBeenCalledWith({}, ownerId, "a".repeat(64));
    expect(mocked.readSnapshot).toHaveBeenCalledTimes(2);
    expect(mocked.readSnapshot).toHaveBeenNthCalledWith(1, {}, "presented-session-token", eventId, 4, 2);
    expect(mocked.readSnapshot).toHaveBeenNthCalledWith(2, {}, "presented-session-token", eventId, 4, 2);
    expect(mocked.process).toHaveBeenCalledWith(source, expect.any(Function), requestValue.signal);
    expect(mocked.complete).toHaveBeenCalledWith({ system: "candidate system", user: "public-only input", ownerId });
  });

  it("returns finite daily-limit metadata without exposing provider or owner details", async () => {
    const limitDetails = { limitReason: "daily_tokens", retryAt: null, resetAt: "2026-10-24T16:00:00.000Z" } as const;
    mocked.complete.mockResolvedValueOnce({ ok: false, outcome: "rate_or_budget_limited", limitDetails });
    mocked.process.mockImplementationOnce(async (_publicSource: PublicCandidateSource, complete: (input: { system: string; user: string; signal?: AbortSignal }) => Promise<unknown>) => {
      const result = await complete({ system: "candidate system", user: "public-only input" });
      return { ok: false, outcome: (result as { outcome: string }).outcome };
    });

    const response = await POST(request(), { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, outcome: "rate_or_budget_limited", ...limitDetails });
    expect(mocked.complete).toHaveBeenCalledWith({ system: "candidate system", user: "public-only input", ownerId });
  });

  it("checks owner/session before parsing, admission, or reading caller data", async () => {
    mocked.access.mockRejectedValueOnce(new EventError(404, "Event unavailable."));
    const requestValue = request({ expectedVersion: 4, expectedPreparationRevision: 2, source: { secret: "untrusted" } });
    const response = await POST(requestValue, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(404);
    expect(requestValue.bodyUsed).toBe(false);
    expect(mocked.admission).not.toHaveBeenCalled();
    expect(mocked.readSnapshot).not.toHaveBeenCalled();
    expect(mocked.process).not.toHaveBeenCalled();
  });

  it("fails closed on disabled provider configuration before reading the body", async () => {
    mocked.availability.mockReturnValueOnce({ available: false, outcome: "disabled" });
    const requestValue = request();
    const response = await POST(requestValue, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(503);
    expect(requestValue.bodyUsed).toBe(false);
    expect(mocked.admission).not.toHaveBeenCalled();
    expect(mocked.readSnapshot).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied source, schema, and unknown request properties", async () => {
    const response = await POST(request({ expectedVersion: 4, expectedPreparationRevision: 2, fields: source }), { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(400);
    expect(mocked.readSnapshot).not.toHaveBeenCalled();
    expect(mocked.process).not.toHaveBeenCalled();
  });

  it("does not deliver output when the authoritative saved source changes during inference", async () => {
    mocked.readSnapshot.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ ...snapshot, source: { ...source, title: "Newer title" } });
    const response = await POST(request(), { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, outcome: "stale_event" });
  });

  it("logs only a finite rejection code server-side and keeps the client response generic", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocked.process.mockResolvedValueOnce({
      ok: false,
      outcome: "invalid_response",
      rejectionCode: "ROOT_SHAPE",
    });

    const response = await POST(request(), { params: Promise.resolve({ id: eventId }) });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, outcome: "invalid_response" });
    expect(warning).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(JSON.stringify({
      event: "proposal_candidate_generation_rejected",
      code: "ROOT_SHAPE",
    }));
    expect(warning.mock.calls[0]?.join(" ")).not.toContain(eventId);
    expect(warning.mock.calls[0]?.join(" ")).not.toContain(source.description);
  });

  it("rejects not-ready drafts before inference", async () => {
    mocked.readSnapshot.mockRejectedValueOnce(new mocked.NotReady("title"));
    const response = await POST(request(), { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, outcome: "not_ready" });
    expect(mocked.process).not.toHaveBeenCalled();
  });

  it("rejects foreign origins before owner lookup", async () => {
    const response = await POST(request(undefined, "https://foreign.example"), { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(403);
    expect(mocked.access).not.toHaveBeenCalled();
    expect(mocked.readSnapshot).not.toHaveBeenCalled();
  });
});
