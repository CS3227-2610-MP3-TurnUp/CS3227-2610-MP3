import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const queries = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn() }));
vi.mock("../../src/server/registration/queries", () => ({ discoverEvents: queries.list, studentEvent: queries.read }));
vi.mock("../../src/server/db/client", () => ({ prisma: {} }));
import { GET as collection } from "../../src/app/api/student/events/route";
import { GET as resource } from "../../src/app/api/student/events/[eventId]/route";
import { AuthError } from "../../src/server/auth/policy";
import { eventId, studentFixture } from "./fixtures";
const token = "A".repeat(43);
const context = { params: Promise.resolve({ eventId }) };
function request(query = "", cookie = `turnup_local_session=${token}`) {
  return new Request(`http://localhost:3000/api/student/events${query}`, { headers: { cookie } });
}
beforeEach(() => {
  vi.resetAllMocks();
  for (const [key, value] of Object.entries({ AUTH_ORIGIN: "http://localhost:3000", AUTH_THROTTLE_SECRET: "ab".repeat(32), AUTH_SOURCE_MODE: "local", TURNUP_ENVIRONMENT: "development", VERCEL: "" })) vi.stubEnv(key, value);
  queries.list.mockResolvedValue([studentFixture]); queries.read.mockResolvedValue(studentFixture);
});
afterEach(() => vi.unstubAllEnvs());
it("passes only cookie-derived token and validated search/filter to queries; responses are private", async () => {
  const response = await collection(request("?search=Campus&period=past"));
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ events: [studentFixture] });
  expect(queries.list).toHaveBeenCalledWith({}, token, { search: "Campus", period: "past" });
  for (const result of [response, await resource(request(), context)]) {
    expect(result.headers.get("cache-control")).toContain("no-store"); expect(result.headers.get("vary")).toBe("Cookie");
  }
  expect(queries.read).toHaveBeenCalledWith({}, token, eventId);
});
it("rejects owner/revision/role overrides, duplicates and malformed IDs before query access", async () => {
  for (const query of ["?role=STUDENT", "?ownerId=foreign", "?publicationId=old", "?search=a&search=b", "?period=all"]) expect((await collection(request(query))).status).toBe(400);
  expect((await resource(request("?publicationId=old"), context)).status).toBe(400);
  expect((await resource(request(), { params: Promise.resolve({ eventId: "not-a-uuid" }) })).status).toBe(400);
  expect(queries.list).not.toHaveBeenCalled(); expect(queries.read).not.toHaveBeenCalled();
});
it("fails closed on absent configuration and preserves safe role/auth denial without private error detail", async () => {
  vi.stubEnv("AUTH_ORIGIN", ""); expect((await collection(request())).status).toBe(503); expect(queries.list).not.toHaveBeenCalled();
  vi.stubEnv("AUTH_ORIGIN", "http://localhost:3000");
  for (const status of [401, 403, 404, 409]) {
    queries.read.mockRejectedValueOnce(new AuthError(status, "Safe unavailable notice."));
    const response = await resource(request(), context); expect(response.status).toBe(status); expect(response.headers.get("cache-control")).toContain("no-store");
  }
  queries.list.mockRejectedValueOnce(new Error("postgres://secret:private"));
  const response = await collection(request()); expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("secret");
});
it("passes missing/forged cookies to authoritative authentication rather than trusting query identity", async () => {
  queries.list.mockRejectedValue(new AuthError(401, "Log in again."));
  expect((await collection(request("", ""))).status).toBe(401);
  expect(queries.list).toHaveBeenLastCalledWith({}, undefined, { search: "", period: "upcoming" });
});
