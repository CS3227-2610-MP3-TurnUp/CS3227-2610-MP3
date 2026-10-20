import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { PrismaClient } from "../../src/server/db/generated/client";
import { ABSOLUTE_MS, cookieName, presentedToken, resolveSession, sessionCookie, tokenDigest } from "../../src/server/auth/session";
import { admissionKeys, admitAttempt } from "../../src/server/auth/throttle";
import type { AuthConfig } from "../../src/server/auth/request-security";

const config: AuthConfig = { origin: "https://turnup.example", secret: "ab".repeat(32), secure: true, sourceMode: "vercel" };
it("uses host-only HttpOnly secure cookies and digest-only tokens", async () => {
  const token = "A".repeat(43);
  expect(cookieName(config)).toBe("__Host-turnup_session");
  expect(sessionCookie(config, token)).toBe(`__Host-turnup_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ABSOLUTE_MS / 1000}; Secure`);
  expect(sessionCookie(config)).toContain("Max-Age=0");
  expect(sessionCookie({ ...config, secure: false }, token)).toContain("turnup_local_session=");
  expect(sessionCookie(config, token)).not.toContain("Domain");
  expect(tokenDigest(token)).toMatch(/^[a-f0-9]{64}$/);
  expect(tokenDigest("forged")).toBeNull();
  const db = { $queryRaw: vi.fn() };
  expect(await resolveSession(db as unknown as PrismaClient, "forged")).toBeNull();
  expect(db.$queryRaw).not.toHaveBeenCalled();
  expect(presentedToken(new Headers({ cookie: `${cookieName(config)}=${token}; ${cookieName(config)}=${token}` }), config)).toBeUndefined();
});
it("uses keyed private identifiers and exact shared fixed-window budgets", () => {
  const now = new Date("2026-10-20T00:14:59.999Z");
  const keys = admissionKeys("login", "alice", "192.0.2.1", config.secret, now);
  expect(keys.map((key) => key.limit)).toEqual([5, 30]);
  expect(keys.every((key) => !key.key.includes("alice") && !key.key.includes("192.0.2.1"))).toBe(true);
  expect(keys[0].expiresAt).toEqual(new Date("2026-10-20T00:15:00Z"));
  expect(admissionKeys("login", "alice", "192.0.2.1", config.secret, keys[0].expiresAt)[0].key).not.toBe(keys[0].key);
  expect(admissionKeys("signup", "alice", "192.0.2.1", config.secret, now)[0]).toMatchObject({ limit: 10, expiresAt: new Date("2026-10-20T01:00:00Z") });
});
it("rolls back admission when an atomic bucket denies and never falls back after storage failure", async () => {
  const raw = vi.fn().mockResolvedValueOnce([{ now: new Date() }]).mockResolvedValueOnce([]);
  const transaction = vi.fn(async (callback) => callback({ $queryRaw: raw }));
  await expect(admitAttempt({ $transaction: transaction } as unknown as PrismaClient, "login", "alice", "source", config.secret)).rejects.toMatchObject({ status: 429 });
  transaction.mockRejectedValueOnce(new Error("storage down"));
  await expect(admitAttempt({ $transaction: transaction } as unknown as PrismaClient, "login", "alice", "source", config.secret)).rejects.toThrow("storage down");
});
it("uses a separate shared UUID credential budget without changing login/signup windows", () => {
  const now = new Date("2026-10-20T00:14:59Z"); const id = "6d41756c-3df6-43f7-8bf1-d3c907bc8d8f";
  const keys = admissionKeys("credentials", id, "source", config.secret, now);
  expect(keys.map((entry) => entry.limit)).toEqual([5, 30]);
  expect(keys[0].key).toMatch(/^credentials:account:/);
  expect(keys[0].key).not.toContain(id);
  expect(keys[0].expiresAt).toEqual(new Date("2026-10-20T00:15:00Z"));
  expect(keys[0].key).not.toBe(admissionKeys("login", id, "source", config.secret, now)[0].key);
});
