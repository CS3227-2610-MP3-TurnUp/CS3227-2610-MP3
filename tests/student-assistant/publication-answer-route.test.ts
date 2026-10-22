import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ answer: vi.fn() }));
vi.mock("../../src/server/student-assistant/publication-answer", async importOriginal => ({ ...await importOriginal<typeof import("../../src/server/student-assistant/publication-answer")>(), answerPublication: mock.answer }));
vi.mock("../../src/server/db/client", () => ({ prisma: { fixture: true } }));
import { POST } from "../../src/app/api/dev/student-assistant/publication/[eventId]/answer/route";
import { projectPublication, PublicationSourceError } from "../../src/server/student-assistant/publication-source";
import { eventId, publicationFixture } from "./publication-fixture";
const source = projectPublication(publicationFixture(), eventId).source;
const question = { requestId: "one", revision: source.revision, question: "Is it free?" };
const candidate = { eventId, revision: source.revision, kind: "unanswered" };
const token = "a".repeat(43);
function request(body: unknown = question, headers: Record<string, string> = {}, query = "") {
 return new Request(`http://localhost:3001/api/dev/student-assistant/publication/${eventId}/answer${query}`, { method: "POST", headers: { origin: "http://localhost:3001", host: "localhost:3001", cookie: `turnup_local_session=${token}`, "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers }, body: JSON.stringify(body) });
}
const post = (req = request(), id = eventId) => POST(req, { params: Promise.resolve({ eventId: id }) });
beforeEach(() => {
 for (const [key, value] of Object.entries({ NODE_ENV: "development", VERCEL: "", __NEXT_PRIVATE_ORIGIN: "http://127.0.0.1:3001", AUTH_ORIGIN: "http://localhost:3001", AUTH_SOURCE_MODE: "local", TURNUP_ENVIRONMENT: "development", AUTH_THROTTLE_SECRET: "1".repeat(64), STUDENT_SOCLAAS_API_KEY: "fake-key", SOCLAAS_MODEL: "fake-model", SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1", SOCLAAS_MAX_INPUT_BYTES: "65536", SOCLAAS_MAX_OUTPUT_TOKENS: "4096", SOCLAAS_TIMEOUT_MS: "30000" })) vi.stubEnv(key, value);
 mock.answer.mockReset().mockResolvedValue({ ok: true, candidate });
});
afterEach(() => vi.unstubAllEnvs());
it("returns a cookie-authenticated, bound answer with private headers", async () => {
 const response = await post(); expect(response.status).toBe(200);
 expect(await response.json()).toEqual({ ok: true, candidate, requestId: "one", eventId, revision: source.revision });
 expect(mock.answer).toHaveBeenCalledWith(expect.anything(), token, eventId, question, expect.objectContaining({ model: "fake-model" }), expect.objectContaining({ signal: expect.anything() }));
 expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("vary")).toBe("Cookie");
});
it.each([["NODE_ENV", "production"], ["VERCEL", "1"], ["__NEXT_PRIVATE_ORIGIN", "http://localhost:3001"]])("hides unsafe %s before inference/config/DB", async (key, value) => {
 vi.stubEnv(key, value); expect((await post()).status).toBe(404); expect(mock.answer).not.toHaveBeenCalled();
});
it.each([{ origin: "https://foreign.test" }, { origin: "null" }, { origin: "" }, { host: "foreign.test" }, { "sec-fetch-site": "cross-site" }, { "content-type": "text/plain" }] as Record<string, string>[])("rejects unsafe request headers %#", async headers => {
 expect((await post(request(question, headers))).status).toBe(403); expect(mock.answer).not.toHaveBeenCalled();
});
it("denies missing cookie, malformed UUID/query and forged/oversized bodies", async () => {
 expect((await post(request(question, { cookie: "" }))).status).toBe(401);
 expect((await post(request(), "bad")).status).toBe(400);
 expect((await post(request(question, {}, "?ownerId=foreign"))).status).toBe(400);
 for (const body of [{ ...question, source: "forged" }, { ...question, question: "x".repeat(1001) }, { ...question, question: "x".repeat(8193) }, { ...question, revision: "old" }]) expect((await post(request(body))).status).toBe(400);
 expect(mock.answer).not.toHaveBeenCalled();
});
it.each([[401, "login_required"], [403, "student_required"], [404, "event_unavailable"], [409, "source_changed"], [413, "source_too_large"], [503, "source_unavailable"]] as const)("returns only safe lifecycle status %s", async (status, code) => {
 mock.answer.mockRejectedValueOnce(new PublicationSourceError(status, code)); const response = await post();
 expect(response.status).toBe(status); expect(await response.json()).toEqual({ ok: false, code });
});
it.each(["timeout", "provider_unavailable", "invalid_response", "budget_exhausted", "rate_limited", "live_not_authorized"])("preserves truthful technical outcome %s", async reason => {
 mock.answer.mockResolvedValueOnce({ ok: false, reason }); const response = await post();
 expect(await response.json()).toEqual({ ok: false, reason }); expect(response.status).toBeGreaterThanOrEqual(400);
});
it("does not leak configuration/dependency details or generate when unconfigured", async () => {
 vi.stubEnv("STUDENT_SOCLAAS_API_KEY", ""); expect((await post()).status).toBe(503); expect(mock.answer).not.toHaveBeenCalled();
 vi.stubEnv("STUDENT_SOCLAAS_API_KEY", "fake-key"); mock.answer.mockRejectedValueOnce(new Error("private-db-secret"));
 expect(await (await post()).text()).not.toContain("private-db-secret");
});
