import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const fixture = vi.hoisted(() => {
  const tx = { user: { create: vi.fn() }, session: { deleteMany: vi.fn() }, $executeRaw: vi.fn(), $queryRaw: vi.fn() };
  const db = { user: { findUnique: vi.fn() }, session: { deleteMany: vi.fn() }, $transaction: vi.fn() };
  return { tx, db, hash: vi.fn(), verify: vi.fn(), admit: vi.fn() };
});
vi.mock("../../src/server/db/client", () => ({ prisma: fixture.db }));
vi.mock("../../src/server/auth/password", () => ({ hashPassword: fixture.hash, verifyPassword: fixture.verify }));
vi.mock("../../src/server/auth/throttle", () => ({ admitAttempt: fixture.admit }));

import { authenticate } from "../../src/server/auth/service";
import { POST as signup } from "../../src/app/api/auth/signup/route";
import { POST as login } from "../../src/app/api/auth/login/route";
import { POST as logout } from "../../src/app/api/auth/logout/route";
import { tokenDigest } from "../../src/server/auth/session";
import type { PrismaClient } from "../../src/server/db/generated/client";

const origin = "http://localhost:3000";
const credentials = { username: "alice", password: "a unique campus phrase", role: "STUDENT" as const };
const user = { id: "e105fa52-6c3c-4b92-bdc6-9583696ff8fb", username: "alice", role: "STUDENT", passwordHash: "encoded-private-hash", credentialVersion: 0 };
function request(body: unknown, override: Record<string, string> = {}, cookie?: string) {
  return new Request(`${origin}/api/auth/signup`, { method: "POST", headers: {
    origin, "content-type": "application/json", ...override,
    ...(cookie ? { cookie: `turnup_local_session=${cookie}` } : {}),
  }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("AUTH_ORIGIN", origin);
  vi.stubEnv("AUTH_THROTTLE_SECRET", "ab".repeat(32));
  vi.stubEnv("AUTH_SOURCE_MODE", "local");
  vi.stubEnv("TURNUP_ENVIRONMENT", "development");
  vi.stubEnv("VERCEL", "");
  fixture.db.$transaction.mockImplementation(async (callback) => callback(fixture.tx));
  fixture.tx.user.create.mockResolvedValue(user);
  fixture.tx.session.deleteMany.mockResolvedValue({ count: 1 });
  fixture.tx.$executeRaw.mockResolvedValue(1);
  fixture.tx.$queryRaw.mockImplementation(async () => [{ ...user, ...(await fixture.db.user.findUnique()) }]);
  fixture.db.user.findUnique.mockResolvedValue(user);
  fixture.hash.mockResolvedValue("synthetic-hash");
  fixture.verify.mockResolvedValue(true);
  fixture.admit.mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("account service", () => {
  it("creates UUID/hash/account/session inside one transaction and replaces only presented session", async () => {
    const previous = "A".repeat(43);
    const result = await authenticate(fixture.db as unknown as PrismaClient, "signup", credentials, previous);
    expect(fixture.tx.user.create).toHaveBeenCalledWith({ data: {
      id: expect.stringMatching(/^[a-f0-9-]{36}$/), username: "alice", passwordHash: "synthetic-hash", role: "STUDENT",
    }, select: { id: true, role: true } });
    expect(fixture.tx.session.deleteMany).toHaveBeenCalledWith({ where: { tokenDigest: tokenDigest(previous) } });
    expect(fixture.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.token).not.toBe(previous);
    expect(result.redirect).toBe("/student");
    expect(fixture.tx.$executeRaw.mock.calls[0]).toContain(tokenDigest(result.token));
    expect(fixture.tx.$executeRaw.mock.calls[0]).not.toContain(result.token);
  });
  it("propagates session failure through the enclosing account transaction", async () => {
    fixture.tx.$executeRaw.mockRejectedValue(new Error("synthetic session failure"));
    await expect(authenticate(fixture.db as unknown as PrismaClient, "signup", credentials)).rejects.toThrow("synthetic session failure");
    expect(fixture.db.$transaction).toHaveBeenCalledTimes(1);
  });
  it("maps uniqueness races to conflict without creating a session", async () => {
    fixture.tx.user.create.mockRejectedValue({ code: "P2002" });
    await expect(authenticate(fixture.db as unknown as PrismaClient, "signup", credentials)).rejects.toMatchObject({ status: 409 });
    expect(fixture.tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("uses the same verification path/error for unknown and incorrect credentials", async () => {
    fixture.verify.mockResolvedValue(false);
    const db = fixture.db as unknown as PrismaClient;
    await expect(authenticate(db, "login", credentials)).rejects.toMatchObject({ status: 401, message: "The username or password is incorrect." });
    expect(fixture.verify).toHaveBeenLastCalledWith(credentials.password, user.passwordHash);
    fixture.db.user.findUnique.mockResolvedValue(null);
    await expect(authenticate(db, "login", credentials)).rejects.toMatchObject({ status: 401, message: "The username or password is incorrect." });
    expect(fixture.verify).toHaveBeenLastCalledWith(credentials.password, null);
    expect(fixture.db.$transaction).not.toHaveBeenCalled();
  });
  it("derives login destination from stored role and creates a fresh session each time", async () => {
    fixture.db.user.findUnique.mockResolvedValue({ ...user, role: "ORGANISER" });
    const one = await authenticate(fixture.db as unknown as PrismaClient, "login", credentials);
    const two = await authenticate(fixture.db as unknown as PrismaClient, "login", credentials);
    expect(one.redirect).toBe("/organiser");
    expect(two.token).not.toBe(one.token);
  });
  it("rejects verified old credentials after a revision or canonical username changes before issuance", async () => {
    fixture.tx.$queryRaw.mockResolvedValue([{ ...user, credentialVersion: 1 }]);
    await expect(authenticate(fixture.db as unknown as PrismaClient, "login", credentials)).rejects.toMatchObject({ status: 401 });
    fixture.tx.$queryRaw.mockResolvedValue([{ ...user, username: "renamed" }]);
    await expect(authenticate(fixture.db as unknown as PrismaClient, "login", credentials)).rejects.toMatchObject({ status: 401 });
    expect(fixture.tx.$executeRaw).not.toHaveBeenCalled();
  });
});

describe("HTTP auth routes", () => {
  it("logs only a fixed private failure stage, without error, credential or configuration values", async () => {
    vi.stubEnv("AUTH_ORIGIN", "");
    expect((await signup(request(credentials))).status).toBe(503);
    expect(console.error).toHaveBeenLastCalledWith(JSON.stringify({ event: "auth_unavailable", action: "signup", stage: "configuration", code: "AUTH_UNAVAILABLE" }));
    vi.stubEnv("AUTH_ORIGIN", origin);
    fixture.admit.mockRejectedValueOnce(new Error(`private postgres://user:secret@host ${credentials.password}`));
    const response = await signup(request(credentials));
    expect(await response.json()).toEqual({ error: "Account access is unavailable. Please try again later." });
    expect(console.error).toHaveBeenLastCalledWith(JSON.stringify({ event: "auth_unavailable", action: "signup", stage: "admission", code: "DEPENDENCY_FAILURE" }));
    fixture.hash.mockRejectedValueOnce(new Error("private hash diagnostic"));
    expect((await signup(request(credentials))).status).toBe(503);
    expect(console.error).toHaveBeenLastCalledWith(JSON.stringify({ event: "auth_unavailable", action: "signup", stage: "authentication", code: "DEPENDENCY_FAILURE" }));
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls);
    for (const value of [credentials.username, credentials.password, "postgres://", "private hash", "secret@", "passwordHash"]) expect(logs).not.toContain(value);
  });
  it("distinguishes absent trusted ingress from configuration failures and does not log normal rejections", async () => {
    expect((await signup(request(credentials, { origin: "http://foreign.example" }))).status).toBe(403);
    expect(console.error).not.toHaveBeenCalled();
    vi.stubEnv("AUTH_SOURCE_MODE", "vercel"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("TURNUP_ENVIRONMENT", "preview"); vi.stubEnv("AUTH_ORIGIN", "https://turnup.example");
    expect((await signup(request(credentials, { origin: "https://turnup.example" }))).status).toBe(503);
    expect(console.error).toHaveBeenLastCalledWith(JSON.stringify({ event: "auth_unavailable", action: "signup", stage: "trusted_source", code: "AUTH_UNAVAILABLE" }));
    expect(fixture.admit).not.toHaveBeenCalled();
  });
  it("signs up with only required fields and returns no password/hash/token/user identity", async () => {
    const response = await signup(request({ ...credentials, username: " ALICE " }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ redirect: "/student" });
    expect(response.headers.get("set-cookie")).toMatch(/^turnup_local_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax/);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(fixture.admit).toHaveBeenCalledWith(fixture.db, "signup", "alice", "local-loopback", "ab".repeat(32));
  });
  it("rejects CSRF before parsing, throttling or hashing", async () => {
    for (const badOrigin of ["null", "http://evil.example", ""]) {
      expect((await signup(request(credentials, { origin: badOrigin }))).status).toBe(403);
    }
    const missing = new Request(`${origin}/api/auth/login`, { method: "POST", body: "{invalid" });
    expect((await login(missing)).status).toBe(403);
    expect(fixture.admit).not.toHaveBeenCalled();
    expect(fixture.hash).not.toHaveBeenCalled();
  });
  it("rejects forged role/identity and oversize bodies without mutation", async () => {
    expect((await signup(request({ ...credentials, id: user.id }))).status).toBe(400);
    expect((await login(request(credentials))).status).toBe(400);
    expect((await signup(request(credentials, { "content-length": "9000" }))).status).toBe(413);
    expect(fixture.db.$transaction).not.toHaveBeenCalled();
  });
  it("fails closed when throttle, configuration, credential storage or creation fails", async () => {
    fixture.admit.mockRejectedValueOnce(new Error("contains synthetic private marker"));
    let response = await signup(request(credentials));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("synthetic private marker");
    expect(fixture.hash).not.toHaveBeenCalled();
    fixture.db.user.findUnique.mockRejectedValue(new Error("db down"));
    response = await login(request({ username: credentials.username, password: credentials.password }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    vi.stubEnv("AUTH_ORIGIN", "");
    expect((await signup(request(credentials))).status).toBe(503);
  });
  it("logs out only the current token, clears cookie after commit and returns no raw token", async () => {
    const token = "B".repeat(43);
    const response = await logout(request({}, {}, token));
    expect(fixture.db.session.deleteMany).toHaveBeenCalledWith({ where: { tokenDigest: tokenDigest(token) } });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await response.json()).toEqual({ redirect: "/login" });
    fixture.db.session.deleteMany.mockRejectedValue(new Error("db down"));
    const failed = await logout(request({}, {}, token));
    expect(failed.status).toBe(503);
    expect(failed.headers.get("set-cookie")).toBeNull();
  });
});
