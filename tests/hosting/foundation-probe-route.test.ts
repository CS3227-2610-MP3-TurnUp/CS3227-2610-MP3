import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ requestSoCCompletion: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../src/server/ai/soclaas-client", () => mocked);

import { POST } from "../../src/app/api/internal/foundation-probe/route";

const token = "synthetic-preview-probe-token-0123456789abcdef";

function enablePreview(tokenValue = token): void {
  vi.stubEnv("FOUNDATION_PROBE_ENABLED", "true");
  vi.stubEnv("FOUNDATION_PROBE_TOKEN", tokenValue);
  vi.stubEnv("TURNUP_ENVIRONMENT", "preview");
  vi.stubEnv("DATABASE_ENVIRONMENT", "non-production");
  vi.stubEnv("VERCEL_ENV", "preview");
}

function request(url: string, authorization?: string, body?: string): Request {
  return new Request(`https://preview.example${url}`, {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
    body,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("internal foundation probe route", () => {
  it("is unavailable unless explicitly enabled in a Vercel Preview environment", async () => {
    const response = await POST(request("/api/internal/foundation-probe?operation=soc"));
    expect(response.status).toBe(404);

    enablePreview("too-short");
    const shortTokenResponse = await POST(
      request("/api/internal/foundation-probe?operation=soc", "Bearer too-short"),
    );
    expect(shortTokenResponse.status).toBe(404);
  });

  it("requires the probe token and never accepts a client prompt/model/base URL", async () => {
    enablePreview();
    const unauthorized = await POST(request("/api/internal/foundation-probe?operation=soc"));
    expect(unauthorized.status).toBe(404);

    mocked.requestSoCCompletion.mockResolvedValue({ ok: true, text: "READY" });
    const response = await POST(
      request(
        "/api/internal/foundation-probe?operation=soc",
        `Bearer ${token}`,
        JSON.stringify({ prompt: "client text", model: "client model", baseUrl: "https://attacker.example" }),
      ),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocked.requestSoCCompletion).toHaveBeenCalledTimes(1);
    expect(mocked.requestSoCCompletion).toHaveBeenCalledWith({
      system: "You are a connectivity check. Do not disclose secrets or request external information.",
      user: "Return only the word READY.",
    });
  });

  it("returns only a classified safe provider failure", async () => {
    enablePreview();
    mocked.requestSoCCompletion.mockResolvedValue({ ok: false, outcome: "rate_or_budget_limited" });
    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "rate_or_budget_limited" });
  });
});
