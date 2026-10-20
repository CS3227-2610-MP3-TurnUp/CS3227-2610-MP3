import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { authConfig, boundedJson, requireOrigin, trustedSource } from "../../src/server/auth/request-security";

const local = { AUTH_ORIGIN: "http://localhost:3000", AUTH_THROTTLE_SECRET: "ab".repeat(32), AUTH_SOURCE_MODE: "local", TURNUP_ENVIRONMENT: "development" };
afterEach(() => vi.useRealTimers());

describe("request boundary", () => {
  it("fails closed on absent/malformed or inappropriate hosting configuration", () => {
    for (const env of [{}, { ...local, AUTH_ORIGIN: "http://localhost:3000/" }, { ...local, AUTH_THROTTLE_SECRET: "weak" },
      { ...local, VERCEL: "1" }, { ...local, TURNUP_ENVIRONMENT: "production" }, { ...local, AUTH_ORIGIN: "https://evil.example" }]) {
      expect(() => authConfig(env)).toThrow(/unavailable/);
    }
  });
  it.each([undefined, "null", "http://evil.example", "http://localhost:3000.evil.example", "http://localhost:3000/"])("rejects origin %s", (origin) => {
    const request = new Request(local.AUTH_ORIGIN, { method: "POST", headers: origin ? { origin } : {} });
    expect(() => requireOrigin(request, authConfig(local))).toThrow();
  });
  it("accepts only exact POST origin and ignores IP headers locally", () => {
    const request = new Request(local.AUTH_ORIGIN, { method: "POST", headers: { origin: local.AUTH_ORIGIN, "x-forwarded-for": "attacker", "x-vercel-forwarded-for": "1.2.3.4" } });
    expect(() => requireOrigin(request, authConfig(local))).not.toThrow();
    expect(trustedSource(request, authConfig(local))).toBe("local-loopback");
    expect(() => requireOrigin(new Request(local.AUTH_ORIGIN, { headers: { origin: local.AUTH_ORIGIN } }), authConfig(local))).toThrow();
  });
  it("trusts only strict platform source in explicitly configured Vercel runtime", () => {
    const config = authConfig({ ...local, VERCEL: "1", AUTH_SOURCE_MODE: "vercel", TURNUP_ENVIRONMENT: "preview", AUTH_ORIGIN: "https://turnup.example" });
    for (const source of [undefined, "1.2.3.4, 5.6.7.8", "unknown", "127.1", " 1.2.3.4 "]) {
      const request = new Request(config.origin, { headers: { "x-forwarded-for": "1.2.3.4", ...(source ? { "x-vercel-forwarded-for": source } : {}) } });
      // Fetch Headers trims boundary spaces; all remaining malformed values fail.
      if (source?.trim() === "1.2.3.4") continue;
      expect(() => trustedSource(request, config)).toThrow();
    }
    expect(trustedSource(new Request(config.origin, { headers: { "x-vercel-forwarded-for": "2001:0db8:0:0:0:0:0:1" } }), config)).toBe("[2001:db8::1]");
  });
  it("bounds declared and streamed bytes, content type and malformed JSON", async () => {
    await expect(boundedJson(new Request(local.AUTH_ORIGIN, { method: "POST", body: "{}" }))).rejects.toMatchObject({ status: 415 });
    for (const headers of [{ "content-length": "4097" }, {}] as Record<string, string>[]) {
      await expect(boundedJson(new Request(local.AUTH_ORIGIN, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: "x".repeat(4097) }))).rejects.toMatchObject({ status: 413 });
    }
    await expect(boundedJson(new Request(local.AUTH_ORIGIN, { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).rejects.toMatchObject({ status: 400 });
    expect(await boundedJson(new Request(local.AUTH_ORIGIN, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: '{"username":"alice"}' }))).toEqual({ username: "alice" });
  });
  it("times out a stalled body", async () => {
    vi.useFakeTimers();
    const request = new Request(local.AUTH_ORIGIN, { method: "POST", headers: { "content-type": "application/json" }, body: new ReadableStream({ start() {} }), duplex: "half" } as RequestInit);
    const assertion = expect(boundedJson(request)).rejects.toMatchObject({ status: 408 });
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });
});
