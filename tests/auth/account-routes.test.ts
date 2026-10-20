import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const f = vi.hoisted(() => {
  const tx = { $queryRaw: vi.fn(), user: { update: vi.fn(), findUniqueOrThrow: vi.fn() }, session: { deleteMany: vi.fn() } };
  return { tx, db: { $queryRaw: vi.fn(), user: { findUnique: vi.fn() }, $transaction: vi.fn() }, verify: vi.fn(), hash: vi.fn(), admit: vi.fn() };
});
vi.mock("../../src/server/db/client", () => ({ prisma: f.db }));
vi.mock("../../src/server/auth/password", () => ({ verifyPassword: f.verify, hashPassword: f.hash }));
vi.mock("../../src/server/auth/throttle", () => ({ admitAttempt: f.admit }));
import { POST as credentials } from "../../src/app/api/account/credentials/route";
import { GET, POST as saveProfile } from "../../src/app/api/student/profile/route";
import { changeCredentials } from "../../src/server/accounts/service";
import { parseChange } from "../../src/server/accounts/policy";
import type { PrismaClient } from "../../src/server/db/generated/client";
const token = "A".repeat(43);
const self = { id: "6d41756c-3df6-43f7-8bf1-d3c907bc8d8f", username: "alice", role: "STUDENT", credentialVersion: 0, passwordHash: "hash" };
const input = { action: "username", username: "renamed", currentPassword: "a private current phrase", expectedCredentialVersion: 0 };
function request(body?: unknown, origin = "http://localhost:3000") { return new Request("http://localhost:3000/api/account/credentials", {
  method: body ? "POST" : "GET", headers: { origin, cookie: `turnup_local_session=${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}),
}); }
beforeEach(() => {
  vi.resetAllMocks();
  for (const [key, value] of Object.entries({ AUTH_ORIGIN: "http://localhost:3000", AUTH_THROTTLE_SECRET: "ab".repeat(32), AUTH_SOURCE_MODE: "local", TURNUP_ENVIRONMENT: "development", VERCEL: "" })) vi.stubEnv(key, value);
  f.db.$queryRaw.mockResolvedValue([self]); f.tx.$queryRaw.mockResolvedValue([self]);
  f.db.user.findUnique.mockResolvedValue(self); f.db.$transaction.mockImplementation(async (fn) => fn(f.tx));
  f.verify.mockResolvedValue(true); f.hash.mockResolvedValue("replacement-hash");
  f.tx.user.findUniqueOrThrow.mockResolvedValue({ studentName: null, studentPhone: null, profileVersion: 0 });
  f.tx.user.update.mockResolvedValue({ studentName: "Alice", studentPhone: null, profileVersion: 1 });
});
afterEach(() => vi.unstubAllEnvs());
it("self username changes return canonical name/revision while retaining every session/cookie", async () => {
  const response = await credentials(request(input));
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ changed: true, username: "renamed", credentialVersion: 1 });
  expect(response.headers.get("set-cookie")).toBeNull(); expect(response.headers.get("cache-control")).toContain("no-store");
  expect(f.admit).toHaveBeenCalledWith(f.db, "credentials", self.id, "local-loopback", "ab".repeat(32));
  expect(f.tx.user.update).toHaveBeenCalledWith({ where: { id: self.id }, data: { username: "renamed", credentialVersion: { increment: 1 } } });
  expect(f.tx.session.deleteMany).not.toHaveBeenCalled();
});
it("username then password uses the returned revision; only password revokes all sessions and clears cookie", async () => {
  const renamed = await credentials(request(input));
  const result = await renamed.json() as { username: string; credentialVersion: number };
  f.db.$queryRaw.mockResolvedValue([{ ...self, username: result.username }]);
  f.db.user.findUnique.mockResolvedValue({ ...self, username: result.username, credentialVersion: result.credentialVersion });
  f.tx.$queryRaw.mockResolvedValue([{ ...self, username: result.username, credentialVersion: result.credentialVersion }]);
  const response = await credentials(request({ action: "password", newPassword: "a new private unique phrase", currentPassword: input.currentPassword, expectedCredentialVersion: result.credentialVersion }));
  expect(await response.json()).toEqual({ changed: true, redirect: "/login" });
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(f.tx.session.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId: self.id } });
  expect(f.tx.user.update).toHaveBeenLastCalledWith({ where: { id: self.id }, data: { passwordHash: "replacement-hash", credentialVersion: { increment: 1 } } });
});
it("reauthenticated canonical no-ops preserve sessions, including listed current-password equivalence", async () => {
  const response = await credentials(request({ ...input, username: " ALICE " }));
  expect(await response.json()).toEqual({ changed: false }); expect(response.headers.get("set-cookie")).toBeNull();
  await changeCredentials(f.db as unknown as PrismaClient, token, parseChange({ action: "password", currentPassword: "passwordpassword", newPassword: "passwordpassword", expectedCredentialVersion: 0 }));
  expect(f.tx.user.update).not.toHaveBeenCalled(); expect(f.tx.session.deleteMany).not.toHaveBeenCalled(); expect(f.hash).not.toHaveBeenCalled();
});
it("fails closed on current password, revocation, stale revision, duplicate and storage errors", async () => {
  f.verify.mockResolvedValueOnce(false); expect((await credentials(request(input))).status).toBe(401);
  f.tx.$queryRaw.mockResolvedValueOnce([self]).mockResolvedValueOnce([]); expect((await credentials(request(input))).status).toBe(401);
  f.tx.$queryRaw.mockResolvedValue([{ ...self, credentialVersion: 1 }]); expect((await credentials(request(input))).status).toBe(409);
  f.tx.$queryRaw.mockResolvedValue([self]); f.tx.user.update.mockRejectedValueOnce({ code: "P2002" }); expect((await credentials(request(input))).status).toBe(409);
  f.admit.mockRejectedValue(new Error("private URL marker")); const failure = await credentials(request(input));
  expect(failure.status).toBe(503); expect(JSON.stringify(await failure.json())).not.toContain("private URL marker");
});
it("rejects foreign/missing Origin and unknown fields before expensive work", async () => {
  for (const origin of ["http://evil.example", "null", ""]) expect((await credentials(request(input, origin))).status).toBe(403);
  expect((await credentials(request({ ...input, userId: "foreign" }))).status).toBe(400);
  expect(f.verify).not.toHaveBeenCalled(); expect(f.tx.user.update).not.toHaveBeenCalled();
});
it("projects private Student fields only and rejects Organiser, anonymous and invalid profile saves", async () => {
  const response = await GET(request()); expect(await response.json()).toEqual({ name: null, phone: null, profileVersion: 0, changed: false });
  expect(response.headers.get("cache-control")).toContain("no-store");
  f.db.$queryRaw.mockResolvedValueOnce([{ ...self, role: "ORGANISER" }]); expect((await GET(request())).status).toBe(403);
  f.db.$queryRaw.mockResolvedValueOnce([]); expect((await GET(request())).status).toBe(401);
  expect((await saveProfile(request({ name: "Alice", phone: "bad", expectedProfileVersion: 0 }))).status).toBe(400);
  expect(f.tx.user.update).not.toHaveBeenCalled();
});
it("commits both profile fields/version together, rejects stale saves and preserves no-ops", async () => {
  const saved = await saveProfile(request({ name: "Alice", phone: null, expectedProfileVersion: 0 }));
  expect(await saved.json()).toEqual({ name: "Alice", phone: null, profileVersion: 1, changed: true });
  expect(f.tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { studentName: "Alice", studentPhone: null, profileVersion: { increment: 1 } } }));
  f.tx.user.findUniqueOrThrow.mockResolvedValue({ studentName: null, studentPhone: null, profileVersion: 1 });
  expect((await saveProfile(request({ name: "old", phone: null, expectedProfileVersion: 0 }))).status).toBe(409);
  f.tx.user.update.mockClear();
  expect((await saveProfile(request({ name: "", phone: "", expectedProfileVersion: 1 }))).status).toBe(200);
  expect(f.tx.user.update).not.toHaveBeenCalled();
});
