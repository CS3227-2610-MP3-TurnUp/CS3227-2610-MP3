import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fixture = vi.hoisted(() => ({ cookies: vi.fn(), resolve: vi.fn(), redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: fixture.cookies }));
vi.mock("next/navigation", () => ({ redirect: fixture.redirect }));
vi.mock("../../src/server/db/client", () => ({ prisma: {} }));
vi.mock("../../src/server/auth/session", () => ({ cookieName: () => "turnup_local_session", resolveSession: fixture.resolve }));
import { requireRole } from "../../src/server/auth/guards";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_ORIGIN", "http://localhost:3000"); vi.stubEnv("AUTH_THROTTLE_SECRET", "ab".repeat(32));
  vi.stubEnv("AUTH_SOURCE_MODE", "local"); vi.stubEnv("TURNUP_ENVIRONMENT", "development"); vi.stubEnv("VERCEL", "");
  fixture.cookies.mockResolvedValue({ get: () => ({ value: "opaque-cookie" }) });
  fixture.redirect.mockImplementation(() => { throw new Error("redirect:/login"); });
});
afterEach(() => vi.unstubAllEnvs());
it("redirects anonymous/expired identities, grants only stored role, and denies cross-role without identity data", async () => {
  fixture.resolve.mockResolvedValue(null);
  await expect(requireRole("STUDENT")).rejects.toThrow("redirect:/login");
  const user = { id: "server-id", username: "alice", role: "STUDENT" };
  fixture.resolve.mockResolvedValue(user);
  expect(await requireRole("STUDENT")).toEqual({ status: "granted", user });
  expect(await requireRole()).toEqual({ status: "granted", user });
  expect(await requireRole("ORGANISER")).toEqual({ status: "denied" });
});
it("fails closed without exposing private dependency errors", async () => {
  fixture.resolve.mockRejectedValue(new Error("private marker"));
  expect(await requireRole("STUDENT")).toEqual({ status: "unavailable" });
  vi.stubEnv("AUTH_THROTTLE_SECRET", "");
  expect(await requireRole("ORGANISER")).toEqual({ status: "unavailable" });
});
