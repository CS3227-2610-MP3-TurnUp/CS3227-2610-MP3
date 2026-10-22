import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ load: vi.fn(), check: vi.fn(), answer: vi.fn(), reserve: vi.fn() }));
vi.mock("../../src/server/student-assistant/publication-lifecycle", () => ({ loadPublicationSource: mocks.load, recheckPublication: mocks.check }));
vi.mock("../../src/server/student-assistant/publication-answer", async original => ({ ...await original(), answerPublication: mocks.answer }));
vi.mock("../../src/server/student-assistant/hosted-admission", () => ({ reserveHosted: mocks.reserve }));
vi.mock("../../src/server/db/client", () => ({ prisma: { synthetic: true } }));
import { GET } from "../../src/app/api/student/events/[eventId]/assistant/source/route";
import { POST } from "../../src/app/api/student/events/[eventId]/assistant/answer/route";
import { projectPublication, PublicationSourceError } from "../../src/server/student-assistant/publication-source";
import { eventId, publicationFixture } from "./publication-fixture";
import { AuthError } from "../../src/server/auth/policy";
const loaded = projectPublication(publicationFixture(), eventId), token = "a".repeat(43), origin = "https://preview.example.test";
const input = { requestId: "request-1", revision: loaded.binding.revision, question: "Where is it?" };
function request(op: "source" | "answer", headers: Record<string, string> = {}, value: unknown = input, query = "") {
  return new Request(`${origin}/api/student/events/${eventId}/assistant/${op}${query}`, { method: op === "answer" ? "POST" : "GET",
    headers: { host: "preview.example.test", origin, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `__Host-turnup_session=${token}`, ...headers },
    ...(op === "answer" ? { body: JSON.stringify(value) } : {}) });
}
const context = { params: Promise.resolve({ eventId }) };
beforeEach(() => {
  vi.stubEnv("STUDENT_ASSISTANT_ENABLED", "true"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("TURNUP_ENVIRONMENT", "preview"); vi.stubEnv("DATABASE_ENVIRONMENT", "non-production");
  vi.stubEnv("DATABASE_URL", "postgresql://fixture:fixture@ep-fixture-pooler.region.neon.tech/fixture?sslmode=require");
  vi.stubEnv("AUTH_ORIGIN", origin); vi.stubEnv("AUTH_SOURCE_MODE", "vercel"); vi.stubEnv("AUTH_THROTTLE_SECRET", "1".repeat(64));
  vi.stubEnv("SOCLAAS_API_KEY", "synthetic-key"); vi.stubEnv("SOCLAAS_BASE_URL", "https://soclaas-api.comp.nus.edu.sg/v1"); vi.stubEnv("SOCLAAS_MODEL", "qwen3.8:27b");
  vi.stubEnv("SOCLAAS_MAX_INPUT_BYTES", "65536"); vi.stubEnv("SOCLAAS_MAX_OUTPUT_TOKENS", "4096"); vi.stubEnv("SOCLAAS_TIMEOUT_MS", "30000");
  mocks.load.mockReset().mockResolvedValue(loaded); mocks.check.mockReset().mockResolvedValue(loaded);
  mocks.reserve.mockReset().mockResolvedValue({ ok: false, reason: "limited" });
  mocks.answer.mockReset().mockImplementation(async (_db, _token, _event, _input, config, options) => {
    const admission = await options.reserve(config); return admission.ok ? { ok: true, candidate: {} } : { ok: false, reason: "budget_exhausted" };
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it("serves only authenticated rechecked source without calling admission/inference", async () => {
  const response = await GET(request("source"), context); expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true, source: loaded.source });
  expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("vary")).toBe("Cookie");
  expect(mocks.check).toHaveBeenCalledWith(expect.anything(), token, loaded.binding); expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.answer).not.toHaveBeenCalled();
});
it.each(["source", "answer"] as const)("denies anonymous/cross-origin and Production %s before DB/provider", async op => {
  const call = op === "source" ? GET : POST;
  expect((await call(request(op, { cookie: "" }), context)).status).toBe(401);
  expect((await call(request(op, { origin: "https://evil.test" }), context)).status).toBe(403);
  expect((await call(request(op, { "sec-fetch-site": "cross-site" }), context)).status).toBe(403);
  vi.stubEnv("VERCEL_ENV", "production"); expect((await call(request(op), context)).status).toBe(404);
  expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.answer).not.toHaveBeenCalled();
});
it("binds hosted admission to server cookie/request, caps config and rejects client overrides", async () => {
  const response = await POST(request("answer"), context); expect(response.status).toBe(429); expect(await response.json()).toEqual({ ok: false, reason: "budget_exhausted" });
  expect(mocks.reserve).toHaveBeenCalledWith(expect.anything(), token, input.requestId, expect.objectContaining({ maxOutputTokens: 1000, timeoutMs: 20000 }));
  mocks.answer.mockClear();
  for (const extra of [{ source: loaded.source }, { actor: "foreign" }, { maxAttempts: 999 }, { provider: "https://evil.test" }]) {
    expect((await POST(request("answer", {}, { ...input, ...extra }), context)).status).toBe(400);
  }
  expect((await POST(request("answer", {}, input, "?source=private"), context)).status).toBe(400); expect(mocks.answer).not.toHaveBeenCalled();
});
it("denies Organiser and changed/withdrawn/session-invalid sources without disclosing content", async () => {
  for (const [status, code] of [[403, "student_required"], [404, "event_unavailable"], [409, "source_changed"], [401, "login_required"]] as const) {
    mocks.load.mockRejectedValueOnce(new PublicationSourceError(status, code)); const response = await GET(request("source"), context);
    expect(response.status).toBe(status); expect(await response.json()).toEqual({ ok: false, code });
  }
  mocks.answer.mockRejectedValueOnce(new AuthError(401, "private")); expect((await POST(request("answer"), context)).status).toBe(401);
});
it("returns bound success and safe provider failures; no retry", async () => {
  mocks.answer.mockResolvedValueOnce({ ok: true, candidate: { kind: "unanswered" } });
  expect(await (await POST(request("answer"), context)).json()).toEqual({ ok: true, candidate: { kind: "unanswered" }, requestId: input.requestId, eventId, revision: input.revision });
  mocks.answer.mockResolvedValueOnce({ ok: false, reason: "timeout" }); expect((await POST(request("answer"), context)).status).toBe(503);
  expect(mocks.answer).toHaveBeenCalledTimes(2);
});
it("rejects oversized bodies and hides dependency details", async () => {
  expect((await POST(request("answer", {}, { ...input, question: "x".repeat(9000) }), context)).status).toBe(400);
  mocks.load.mockRejectedValueOnce(new Error("private-db-detail")); const response = await GET(request("source"), context); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-db-detail");
});
it("bounds a stalled body without calling admission or inference", async () => {
  vi.useFakeTimers(); const cancel = vi.fn();
  const original = request("answer");
  const stalled = new Request(original.url, { method: "POST", headers: original.headers,
    body: new ReadableStream({ cancel }), duplex: "half" } as RequestInit);
  const pending = POST(stalled, context); await vi.advanceTimersByTimeAsync(5001);
  expect((await pending).status).toBe(400); expect(cancel).toHaveBeenCalled(); expect(mocks.answer).not.toHaveBeenCalled();
});
