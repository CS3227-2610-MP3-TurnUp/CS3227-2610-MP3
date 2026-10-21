import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ reserve: vi.fn(), answer: vi.fn(), release: vi.fn() }));
vi.mock("../../src/server/student-assistant/local-admission", () => ({ reserveLocal: mocks.reserve }));
vi.mock("../../src/server/student-assistant/answer", () => ({ answerSynthetic: mocks.answer }));
import { POST } from "../../src/app/api/dev/student-assistant/route";
const input = { requestId: "one", eventId: "sample-garden", revision: "sample-r1", question: "What should I bring?" };
const config = { apiKey: "synthetic-key", model: "synthetic-model", maxInputBytes: 4096, maxOutputTokens: 100, timeoutMs: 1000 };
const request = (value: unknown = input, headers: Record<string, string> = {}) => new Request("http://localhost:3001/api/dev/student-assistant", { method: "POST", headers: { host: "localhost:3001", origin: "http://localhost:3001", "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers }, body: typeof value === "string" ? value : JSON.stringify(value) });
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", ""); vi.stubEnv("__NEXT_PRIVATE_ORIGIN", "http://127.0.0.1:3001");
  for (const [name, value] of Object.entries({ SOCLAAS_API_KEY: config.apiKey, SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1", SOCLAAS_MODEL: config.model, SOCLAAS_MAX_INPUT_BYTES: "4096", SOCLAAS_MAX_OUTPUT_TOKENS: "100", SOCLAAS_TIMEOUT_MS: "1000" })) vi.stubEnv(name, value);
  mocks.reserve.mockReset().mockResolvedValue({ ok: false, reason: "blocked" }); mocks.answer.mockReset(); mocks.release.mockReset().mockResolvedValue(undefined);
}); afterEach(() => vi.unstubAllEnvs());
describe("guarded dev route", () => {
  it.each([["NODE_ENV", "production"], ["NODE_ENV", "test"], ["VERCEL", "1"], ["__NEXT_PRIVATE_ORIGIN", "http://localhost:3001"], ["__NEXT_PRIVATE_ORIGIN", "http://0.0.0.0:3001"]])("rejects unsafe runtime %s=%s", async (name, value) => { vi.stubEnv(name, value); expect((await POST(request())).status).toBe(404); expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.answer).not.toHaveBeenCalled(); });
  it.each<Record<string, string>>([{ origin: "https://foreign.example" }, { origin: "null" }, { host: "foreign.example" }, { "sec-fetch-site": "cross-site" }, { "content-type": "text/plain" }])("rejects headers %j", async (headers) => { expect((await POST(request(input, headers))).status).toBe(403); expect(mocks.reserve).not.toHaveBeenCalled(); });
  it.each([{ ...input, source: "client source" }, { ...input, model: "other" }, { ...input, question: " " }, { ...input, question: "x".repeat(1001) }, "not json", "x".repeat(8193)])("rejects bad body before admission", async (value) => { expect((await POST(request(value))).status).toBe(400); expect(mocks.reserve).not.toHaveBeenCalled(); });
  it("keeps a valid key plus no allowance completely offline", async () => { const response = await POST(request()); expect(await response.json()).toEqual({ ok: false, reason: "live_not_authorized" }); expect(mocks.answer).not.toHaveBeenCalled(); expect(response.headers.get("cache-control")).toBe("no-store"); });
  it("denies private event/config before reservation", async () => { expect((await POST(request({ ...input, eventId: "private" }))).status).toBe(400); vi.stubEnv("SOCLAAS_API_KEY", ""); expect((await POST(request())).status).toBe(503); expect(mocks.reserve).not.toHaveBeenCalled(); });
  it.each([["limited", "budget_exhausted"], ["busy", "rate_limited"]])("maps denial %s", async (reason, expected) => { mocks.reserve.mockResolvedValue({ ok: false, reason }); expect(await (await POST(request())).json()).toEqual({ ok: false, reason: expected }); expect(mocks.answer).not.toHaveBeenCalled(); });
  it("releases its one admission even if adapter throws", async () => { mocks.reserve.mockResolvedValue({ ok: true, config, release: mocks.release }); mocks.answer.mockRejectedValue(new Error("private diagnostic")); expect(await (await POST(request())).json()).toEqual({ ok: false, reason: "provider_unavailable" }); expect(mocks.answer).toHaveBeenCalledOnce(); expect(mocks.release).toHaveBeenCalledOnce(); });
});

it("returns only adapter output plus bound request identity after one admitted call", async () => {
  const candidate = { eventId: input.eventId, revision: input.revision, kind: "unanswered" };
  mocks.reserve.mockResolvedValue({ ok: true, config, release: mocks.release }); mocks.answer.mockResolvedValue({ ok: true, candidate });
  const response = await POST(request());
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true, candidate, requestId: input.requestId, eventId: input.eventId, revision: input.revision });
  expect(mocks.answer).toHaveBeenCalledWith(input, config, expect.any(AbortSignal)); expect(mocks.release).toHaveBeenCalledOnce();
});
