import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ guard: vi.fn(), read: vi.fn() }));
vi.mock("../../src/server/student-assistant/hosted-http", () => ({ hostedResource: mocks.guard }));
vi.mock("../../src/server/student-assistant/publication-http", () => ({ publicationResource: mocks.guard }));
vi.mock("../../src/server/student-assistant/history", () => ({ readHistory: mocks.read }));
vi.mock("../../src/server/auth/request-security", () => ({ authConfig: () => ({ secure: false }) }));
vi.mock("../../src/server/accounts/service", () => ({ privateHeaders: { "Cache-Control": "no-store, private" }, requireSelf: vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111", role: "STUDENT" })) }));
vi.mock("../../src/server/db/client", () => ({ prisma: { synthetic: true } }));
import { historyResource } from "../../src/server/student-assistant/history-http";
import { PublicationSourceError } from "../../src/server/student-assistant/publication-source";
const eventId = "11111111-1111-4111-8111-111111111111", revision = "current", token = "a".repeat(43);
const request = () => new Request("http://localhost:3001/api/history", { headers: { cookie: "turnup_local_session=" + token } });
beforeEach(() => {
 vi.clearAllMocks();
 mocks.guard.mockImplementation(async () => Response.json({ ok: true, source: { eventId, revision } }));
 mocks.read.mockResolvedValue([]);
});
it.each(["local", "hosted"] as const)("%s history uses authenticated source guards and no browser account override", async mode => {
 const response = await historyResource(request(), eventId, mode);
 expect(response.status).toBe(200);
 expect(response.headers.get("cache-control")).toBe("no-store, private");
 expect(await response.json()).toEqual({ ok: true, eventId, revision, accountScope: eventId, turns: [] });
 expect(mocks.read).toHaveBeenCalledWith({ synthetic: true }, token, eventId, revision);
});
it.each([401,403,404])("source guard denial %s prevents history access", async status => {
 mocks.guard.mockResolvedValueOnce(new Response(null, { status }));
 expect((await historyResource(request(), eventId, "hosted")).status).toBe(status);
 expect(mocks.read).not.toHaveBeenCalled();
});
it("a final publication change withholds saved turns", async () => {
 mocks.read.mockRejectedValueOnce(new PublicationSourceError(409, "source_changed"));
 const response = await historyResource(request(), eventId, "hosted");
 expect(response.status).toBe(409);
 expect(await response.json()).toEqual({ ok: false, code: "source_changed" });
});
