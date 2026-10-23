import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  env: vi.fn(),
  identity: vi.fn(),
  usage: vi.fn(),
  token: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../src/server/auth/request-security", () => ({ authConfig: () => ({ origin: "https://turnup.example" }) }));
vi.mock("../../src/server/auth/session", () => ({ presentedToken: mocked.token }));
vi.mock("../../src/server/accounts/service", () => ({
  privateHeaders: { "Cache-Control": "no-store, private", Vary: "Cookie" },
  requireSelf: mocked.identity,
}));
vi.mock("../../src/server/ai/daily-generation-config", () => ({
  HOSTED_DAILY_GENERATION_ENABLED: false,
  readDailyGenerationEnvironment: mocked.env,
}));
vi.mock("../../src/server/ai/daily-generation", () => ({ readDailyGenerationUsage: mocked.usage }));
vi.mock("../../src/server/db/client", () => ({ prisma: {} }));

import { AuthError } from "../../src/server/auth/policy";
import { GET } from "../../src/app/api/organiser/ai-usage/route";

beforeEach(() => {
  mocked.env.mockReset().mockReturnValue({ status: "unsupported_local" });
  mocked.identity.mockReset().mockResolvedValue({ id: "8f8a6b85-0f7e-4bf5-b468-90c8a249a2a0", role: "ORGANISER" });
  mocked.usage.mockReset();
  mocked.token.mockReset().mockReturnValue("synthetic-session-token");
});

afterEach(() => vi.restoreAllMocks());

describe("organiser AI usage endpoint", () => {
  it("authenticates self and reports local daily accounting as unsupported without a quota snapshot", async () => {
    const response = await GET(new Request("http://localhost/api/organiser/ai-usage"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "disabled",
      reason: "unsupported_environment",
      usage: null,
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocked.identity).toHaveBeenCalledWith({}, "synthetic-session-token");
    expect(mocked.usage).not.toHaveBeenCalled();
  });

  it("does not expose hosted quota accounting while hosted generation is disabled", async () => {
    mocked.env.mockReturnValue({ status: "supported", environment: "preview" });
    const response = await GET(new Request("http://localhost/api/organiser/ai-usage"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "disabled",
      reason: "hosted_generation_disabled",
      usage: null,
    });
    expect(mocked.usage).not.toHaveBeenCalled();
  });

  it("keeps the endpoint self-only and rejects Student identities", async () => {
    mocked.identity.mockResolvedValueOnce({ id: "8f8a6b85-0f7e-4bf5-b468-90c8a249a2a0", role: "STUDENT" });
    const forbidden = await GET(new Request("http://localhost/api/organiser/ai-usage"));
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ ok: false, outcome: "forbidden" });
    expect(mocked.env).not.toHaveBeenCalled();
  });

  it("does not disclose authentication failures or owner identifiers", async () => {
    mocked.identity.mockRejectedValueOnce(new AuthError(401, "private auth detail"));
    const response = await GET(new Request("http://localhost/api/organiser/ai-usage"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, outcome: "unauthenticated" });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocked.env).not.toHaveBeenCalled();
  });
});
