import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const service = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn(), read: vi.fn(), mutate: vi.fn() }));
vi.mock("../../src/server/events/service", () => ({ createEvent: service.create, listEvents: service.list, readEvent: service.read, mutateEvent: service.mutate }));
vi.mock("../../src/server/db/client", () => ({ prisma: {} }));
import { GET as list, POST as create } from "../../src/app/api/organiser/events/route";
import { GET, POST } from "../../src/app/api/organiser/events/[id]/route";
import { EMPTY_EVENT } from "../../src/lib/event-fields";
import { EventError } from "../../src/server/events/policy";
const id = "8aa3c13d-d179-46bc-aec9-d24873953e32";
const context = { params: Promise.resolve({ id }) };
const token = "A".repeat(43);
function request(body?: unknown, origin = "http://localhost:3000", query = "") {
  return new Request(`http://localhost:3000/api/organiser/events${query}`, { method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", origin, cookie: `turnup_local_session=${token}` }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(() => {
  vi.resetAllMocks();
  for (const [key, value] of Object.entries({ AUTH_ORIGIN: "http://localhost:3000", AUTH_THROTTLE_SECRET: "ab".repeat(32), AUTH_SOURCE_MODE: "local", TURNUP_ENVIRONMENT: "development", VERCEL: "" })) vi.stubEnv(key, value);
  service.create.mockResolvedValue({ id }); service.list.mockResolvedValue([]); service.read.mockResolvedValue({ id }); service.mutate.mockResolvedValue({ saved: true });
});
afterEach(() => vi.unstubAllEnvs());
it("accepts an empty creation body and supplies only the cookie-derived token", async () => {
  expect((await create(request({}))).status).toBe(201);
  expect(service.create).toHaveBeenCalledWith({}, token);
  expect((await create(request({ ownerId: "foreign" }))).status).toBe(400);
  expect(service.create).toHaveBeenCalledTimes(1);
});
it("rejects foreign, opaque and missing Origin before event mutations", async () => {
  for (const origin of ["http://evil.example", "null", ""]) {
    expect((await create(request({}, origin))).status).toBe(403);
    expect((await POST(request({ action: "delete", expectedVersion: 0 }, origin), context)).status).toBe(403);
  }
  expect(service.create).not.toHaveBeenCalled(); expect(service.mutate).not.toHaveBeenCalled();
});
it("bounds and validates search/sort options without accepting owner filters", async () => {
  const response = await list(request(undefined, undefined, "?search=workshop&sort=start&direction=asc"));
  expect(await response.json()).toEqual({ events: [] }); expect(response.headers.get("cache-control")).toContain("no-store");
  expect(service.list).toHaveBeenCalledWith({}, token, "workshop", "start", "asc");
  for (const query of ["?ownerId=foreign", "?sort=owner", "?direction=random", `?search=${"x".repeat(151)}`]) expect((await list(request(undefined, undefined, query))).status).toBe(400);
});
it("requires explicit action/version, exact payload keys and a real approval reference", async () => {
  for (const body of [{ action: "save", expectedVersion: -1, fields: EMPTY_EVENT }, { action: "promote", expectedVersion: 0 },
    { action: "publish", expectedVersion: 0 }, { action: "withdraw", expectedVersion: 0, role: "ORGANISER" },
    { action: "preview", expectedVersion: 0, snapshot: {} }]) expect((await POST(request(body), context)).status).toBe(400);
  expect(service.mutate).not.toHaveBeenCalled();
  expect((await POST(request({ action: "save", expectedVersion: 0, fields: EMPTY_EVENT }), context)).status).toBe(200);
  expect(service.mutate).toHaveBeenCalledWith({}, token, id, 0, "save", EMPTY_EVENT, undefined);
});
it("rejects oversized/malformed bodies before operations", async () => {
  expect((await create(request({ data: "x".repeat(524289) }))).status).toBe(413);
  const malformed = new Request("http://localhost:3000/api/organiser/events", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: "{" });
  expect((await create(malformed)).status).toBe(400); expect(service.create).not.toHaveBeenCalled();
});
it("returns generic dependency failure and preserves deliberate safe conflict outcomes", async () => {
  service.read.mockRejectedValueOnce(new Error("postgres://private-credential"));
  const failure = await GET(request(), context);
  expect(failure.status).toBe(503); expect(JSON.stringify(await failure.json())).not.toContain("private-credential");
  service.mutate.mockRejectedValueOnce(new EventError(409, "Review the newer event."));
  const conflict = await POST(request({ action: "delete", expectedVersion: 0 }), context);
  expect(conflict.status).toBe(409); expect(await conflict.json()).toEqual({ error: "Review the newer event." });
});
