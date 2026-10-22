import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  requireOrigin: vi.fn(),
  token: vi.fn(),
  access: vi.fn(),
  admission: vi.fn(),
  availability: vi.fn(),
  complete: vi.fn(),
  extract: vi.fn(),
  process: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../src/server/auth/request-security", () => ({
  authConfig: () => ({ origin: "http://127.0.0.1:3107", secret: "a".repeat(64), secure: false, sourceMode: "local" }),
  requireOrigin: mocked.requireOrigin,
}));
vi.mock("../../src/server/auth/session", () => ({ presentedToken: mocked.token }));
vi.mock("../../src/server/accounts/service", () => ({ privateHeaders: { "Cache-Control": "no-store, private", "Vary": "Cookie" } }));
vi.mock("../../src/server/proposal-assistance/access", () => ({ assertProposalEventAccess: mocked.access }));
vi.mock("../../src/server/proposal-assistance/admission", () => ({ admitProposalExtraction: mocked.admission }));
vi.mock("../../src/server/proposal-assistance/transport", () => ({
  proposalCompletionAvailability: mocked.availability,
  requestProposalCompletion: mocked.complete,
}));
vi.mock("../../src/server/proposal-assistance/pdf-text", () => ({
  extractPdfPageText: mocked.extract,
  MAX_PROPOSAL_PDF_BYTES: 4_000_000,
}));
vi.mock("../../src/server/proposal-assistance/processor", () => ({ processProposalExtraction: mocked.process }));
vi.mock("../../src/server/db/client", () => ({ prisma: {} }));

import { AuthError } from "../../src/server/auth/policy";
import { EventError } from "../../src/server/events/policy";
import { POST } from "../../src/app/api/organiser/events/[id]/proposal-extraction/route";

const eventId = "a3c1fedd-1bdf-4e70-9fa0-4e8a074c2587";
const revisions = { source: 3, facts: 5, editor: 7 };
const extraction = { facts: { title: { status: "known", value: "Campus Orchestra", evidence: [{ quote: "Campus Orchestra", page: 1 }] } }, privateFindings: [], completeness: "incomplete", incompleteReasons: ["unprocessed_fields"], unprocessedFields: ["purpose"], technicalIssues: 0 };

function request(expectedVersion = 4): Request {
  const form = new FormData();
  form.append("file", new File(["synthetic"], "event.pdf", { type: "application/pdf" }));
  form.append("expectedVersion", String(expectedVersion));
  form.append("revisions", JSON.stringify(revisions));
  return new Request(`http://127.0.0.1:3107/api/organiser/events/${eventId}/proposal-extraction`, {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3107" },
    body: form,
  });
}

beforeEach(() => {
  mocked.requireOrigin.mockReset();
  mocked.requireOrigin.mockImplementation((requestValue: Request) => {
    if (requestValue.headers.get("origin") !== "http://127.0.0.1:3107") throw new AuthError(403, "Origin rejected.");
  });
  mocked.token.mockReset().mockReturnValue("presented-session-token");
  mocked.access.mockReset().mockResolvedValue("owner-account-id");
  mocked.admission.mockReset().mockResolvedValue(undefined);
  mocked.availability.mockReset().mockReturnValue({ available: true });
  mocked.complete.mockReset().mockResolvedValue({ ok: true, text: "{}" });
  mocked.extract.mockReset().mockResolvedValue({ ok: true, pageTexts: ["Campus Orchestra"] });
  mocked.process.mockReset().mockImplementation(async (_pages: readonly string[], complete: (input: { system: string; user: string; signal?: AbortSignal }) => Promise<unknown>, signal?: AbortSignal) => {
    await complete({ system: "system prompt", user: "user prompt", signal });
    return { ok: true, value: extraction };
  });
});

afterEach(() => vi.restoreAllMocks());

describe("owner authenticated proposal extraction route", () => {
  it("checks owner access before reading the body, then returns findings with unchanged revisions", async () => {
    const requestValue = request();
    const response = await POST(requestValue, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, revisions, extraction });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocked.access).toHaveBeenCalledTimes(4);
    expect(mocked.admission).toHaveBeenCalledWith({}, "owner-account-id", "a".repeat(64));
    expect(mocked.extract).toHaveBeenCalledOnce();
    expect(mocked.complete).toHaveBeenCalledWith({ system: "system prompt", user: "user prompt", signal: requestValue.signal });
  });

  it("fails closed before multipart parsing when provider configuration is unavailable", async () => {
    mocked.availability.mockReturnValueOnce({ available: false, outcome: "disabled" });
    const requestValue = request();
    const response = await POST(requestValue, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(503);
    expect(requestValue.bodyUsed).toBe(false);
    expect(mocked.admission).not.toHaveBeenCalled();
    expect(mocked.extract).not.toHaveBeenCalled();
  });

  it("does not parse another owner's proposal or consume their upload", async () => {
    mocked.access.mockRejectedValueOnce(new EventError(404, "Event unavailable."));
    const requestValue = request();
    const response = await POST(requestValue, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(404);
    expect(requestValue.bodyUsed).toBe(false);
    expect(mocked.availability).not.toHaveBeenCalled();
    expect(mocked.extract).not.toHaveBeenCalled();
  });

  it("rejects noncanonical event versions before PDF parsing", async () => {
    const form = new FormData();
    form.append("file", new File(["synthetic"], "event.pdf", { type: "application/pdf" }));
    form.append("expectedVersion", "04");
    form.append("revisions", JSON.stringify(revisions));
    const requestValue = new Request(`http://127.0.0.1:3107/api/organiser/events/${eventId}/proposal-extraction`, {
      method: "POST", headers: { origin: "http://127.0.0.1:3107" }, body: form,
    });
    const response = await POST(requestValue, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(400);
    expect(mocked.extract).not.toHaveBeenCalled();
    expect(mocked.complete).not.toHaveBeenCalled();
  });

  it("discards a result when event access or version becomes stale during inference", async () => {
    mocked.access.mockResolvedValueOnce("owner-account-id").mockResolvedValueOnce("owner-account-id").mockResolvedValueOnce("owner-account-id")
      .mockRejectedValueOnce(new EventError(409, "Event changed."));
    const response = await POST(request(), { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, outcome: "stale_event" });
  });

  it("rejects a foreign origin before identity, database, upload or provider work", async () => {
    const requestValue = request();
    const badOrigin = new Request(requestValue.url, { method: "POST", headers: { origin: "https://foreign.example" }, body: await requestValue.formData() });
    const response = await POST(badOrigin, { params: Promise.resolve({ id: eventId }) });
    expect(response.status).toBe(403);
    expect(mocked.access).not.toHaveBeenCalled();
    expect(mocked.extract).not.toHaveBeenCalled();
  });
});
