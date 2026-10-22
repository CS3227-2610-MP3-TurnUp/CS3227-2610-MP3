import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const queries = vi.hoisted(() => ({ list: vi.fn(), read: vi.fn(), screen: vi.fn(), own: vi.fn() }));
vi.mock("../../src/server/registration/queries", () => ({ discoverEvents: queries.list, studentEvent: queries.read, myRegistrations: queries.own, registrationScreen: queries.screen }));
const mutations = vi.hoisted(() => ({ join: vi.fn(), own: vi.fn() }));
vi.mock("../../src/server/registration/service", () => ({ mutateRegistration: mutations.join, mutateOwnRegistration: mutations.own }));
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

import { registrationJson, REGISTRATION_BODY_BYTES } from "../../src/server/registration/request";
it("bounds registration JSON independently of auth and rejects malformed/oversized/invalid UTF-8 input", async () => {
  const req = (body: BodyInit | null, headers = { "content-type": "application/json" }) => new Request("http://localhost:3000", { method: "POST", headers, body });
  expect(await registrationJson(req(JSON.stringify({ answers: { answer: "x".repeat(5000) } })))).toHaveProperty("answers");
  for (const body of ["null", "[]", "{", '"text"']) await expect(registrationJson(req(body))).rejects.toMatchObject({ status: 400 });
  await expect(registrationJson(req(new Uint8Array([0xc3, 0x28])))).rejects.toMatchObject({ status: 400 });
  await expect(registrationJson(req(JSON.stringify({ value: "x".repeat(REGISTRATION_BODY_BYTES) })))).rejects.toMatchObject({ status: 413 });
  await expect(registrationJson(req("{}", { "content-type": "text/plain" }))).rejects.toMatchObject({ status: 415 });
});
it("stops stalled registration streams at five seconds and cancels the reader", async () => {
  vi.useFakeTimers(); const cancel = vi.fn();
  try {
    const stream = new ReadableStream<Uint8Array>({ cancel });
    const request = new Request("http://localhost:3000", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    const result = registrationJson(request);
    const rejected = expect(result).rejects.toMatchObject({ status: 408 });
    await vi.advanceTimersByTimeAsync(5000); await rejected; expect(cancel).toHaveBeenCalledOnce();
  } finally { vi.useRealTimers(); }
});

import { GET as joinScreen, POST as join } from "../../src/app/api/student/events/[eventId]/registrations/route";
import { GET as myEvents } from "../../src/app/api/student/registrations/route";
import { GET as correctionScreen, POST as correct } from "../../src/app/api/student/registrations/[registrationId]/route";
import { POST as cancel } from "../../src/app/api/student/registrations/[registrationId]/cancel/route";
import { FormValidationError } from "../../src/lib/registration-form";
const registrationContext = { params: Promise.resolve({ registrationId: eventId }) };
function mutationRequest(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/student/registrations", { method: "POST", headers: { cookie: `turnup_local_session=${token}`, "content-type": "application/json", origin }, body: JSON.stringify(body) });
}
it("routes join/correct/cancel using only authoritative cookie identity and path references", async () => {
  const body = { idempotencyKey: eventId };
  mutations.join.mockResolvedValue({ registrationId: eventId }); mutations.own.mockResolvedValue({ registrationId: eventId });
  expect((await join(mutationRequest(body), context)).status).toBe(200);
  expect(mutations.join).toHaveBeenCalledWith({}, token, eventId, "JOIN", body);
  expect((await correct(mutationRequest(body), registrationContext)).status).toBe(200);
  expect(mutations.own).toHaveBeenLastCalledWith({}, token, eventId, "CORRECT", body);
  expect((await cancel(mutationRequest(body), registrationContext)).status).toBe(200);
  expect(mutations.own).toHaveBeenLastCalledWith({}, token, eventId, "CANCEL", body);
  for (const origin of ["https://foreign.example", "null", ""]) expect((await join(mutationRequest(body, origin), context)).status).toBe(403);
  expect(mutations.join).toHaveBeenCalledTimes(1);
});
it("private registration reads reject query overrides and use own-only screen/list services", async () => {
  queries.own.mockResolvedValue([]); queries.screen.mockResolvedValue({ eventId });
  const list = await myEvents(request()); expect(await list.json()).toEqual({ registrations: [] });
  expect(queries.own).toHaveBeenCalledWith({}, token);
  expect((await joinScreen(request(), context)).status).toBe(200);
  expect(queries.screen).toHaveBeenLastCalledWith({}, token, eventId, false);
  const own = await correctionScreen(request(), registrationContext);
  expect(queries.screen).toHaveBeenLastCalledWith({}, token, eventId, true);
  expect(own.headers.get("cache-control")).toContain("no-store");
  expect((await correctionScreen(request("?studentId=foreign"), registrationContext)).status).toBe(400);
});
it("returns only validated field issues or safe conflicts, never raw persistence failures", async () => {
  mutations.join.mockRejectedValueOnce(new FormValidationError({ phone: "Use a valid phone number." }));
  const invalid = await join(mutationRequest({}), context); expect(invalid.status).toBe(400); expect(await invalid.json()).toEqual({ issues: { phone: "Use a valid phone number." } });
  mutations.join.mockRejectedValueOnce(new AuthError(409, "Review the current event."));
  expect((await join(mutationRequest({}), context)).status).toBe(409);
  mutations.join.mockRejectedValueOnce(new Error("private answer database credential"));
  const unavailable = await join(mutationRequest({}), context); expect(unavailable.status).toBe(503); expect(JSON.stringify(await unavailable.json())).not.toContain("credential");
});
