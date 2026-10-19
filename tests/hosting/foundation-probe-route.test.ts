import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  requestSoCCompletion: vi.fn(),
  admitSoCProbe: vi.fn(),
  releaseSoCProbe: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../../src/server/ai/soclaas-client", () => mocked);
vi.mock("../../src/server/db/soc-probe-gate", () => ({
  admitSoCProbe: mocked.admitSoCProbe,
  releaseSoCProbe: mocked.releaseSoCProbe,
}));

import { POST } from "../../src/app/api/internal/foundation-probe/route";

const token = "synthetic-preview-probe-token-0123456789abcdef";

function enablePreview(tokenValue = token): void {
  vi.stubEnv("FOUNDATION_PROBE_ENABLED", "true");
  vi.stubEnv("FOUNDATION_PROBE_TOKEN", tokenValue);
  vi.stubEnv("TURNUP_ENVIRONMENT", "preview");
  vi.stubEnv("DATABASE_ENVIRONMENT", "non-production");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("SOCLAAS_API_KEY", "synthetic-test-key");
  vi.stubEnv("SOCLAAS_BASE_URL", "https://soclaas-api.comp.nus.edu.sg/v1");
  vi.stubEnv("SOCLAAS_MODEL", "synthetic-test-model");
  vi.stubEnv("SOCLAAS_MAX_INPUT_BYTES", "1024");
  vi.stubEnv("SOCLAAS_MAX_OUTPUT_TOKENS", "100");
  vi.stubEnv("SOCLAAS_TIMEOUT_MS", "1000");
  vi.stubEnv("FOUNDATION_PROBE_SOC_MAX_ATTEMPTS", "5");
  vi.stubEnv("FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT", "2");
  vi.stubEnv("FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS", "500");
  vi.stubEnv("FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET", "500");
  mocked.admitSoCProbe.mockResolvedValue({ status: "admitted", reservationId: "synthetic-reservation" });
  mocked.releaseSoCProbe.mockResolvedValue(undefined);
  mocked.requestSoCCompletion.mockResolvedValue({ ok: true, text: "READY" });
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
    expect(mocked.admitSoCProbe).toHaveBeenCalledWith(
      { maxAttempts: 5, maxInFlight: 2, minIntervalMs: 500, outputTokenBudget: 500 },
      100,
    );
    expect(mocked.releaseSoCProbe).toHaveBeenCalledWith("synthetic-reservation");
  });

  it("returns only a classified safe provider failure", async () => {
    enablePreview();
    mocked.requestSoCCompletion.mockResolvedValue({ ok: false, outcome: "rate_or_budget_limited" });
    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "rate_or_budget_limited" });
    expect(mocked.releaseSoCProbe).toHaveBeenCalledWith("synthetic-reservation");
  });

  it("does not invoke the database gate for disabled or unauthorized requests", async () => {
    const disabled = await POST(request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`));
    expect(disabled.status).toBe(404);

    enablePreview();
    const unauthorized = await POST(request("/api/internal/foundation-probe?operation=soc"));
    expect(unauthorized.status).toBe(404);
    expect(mocked.admitSoCProbe).not.toHaveBeenCalled();
    expect(mocked.requestSoCCompletion).not.toHaveBeenCalled();
  });

  it.each([
    ["FOUNDATION_PROBE_SOC_MAX_ATTEMPTS", "", "not_configured"],
    ["FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT", "0", "invalid_configuration"],
    ["FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS", "1.5", "invalid_configuration"],
  ])("fails closed for missing or invalid %s without provider fetch", async (name, value, outcome) => {
    enablePreview();
    vi.stubEnv(name, value);

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome });
    expect(mocked.admitSoCProbe).not.toHaveBeenCalled();
    expect(mocked.requestSoCCompletion).not.toHaveBeenCalled();
  });

  it("passes individually valid tighter limits to the shared gate before any provider call", async () => {
    enablePreview();
    vi.stubEnv("FOUNDATION_PROBE_SOC_MAX_ATTEMPTS", "1");
    vi.stubEnv("FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET", "99");
    mocked.admitSoCProbe.mockResolvedValue({ status: "limited" });

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, outcome: "rate_or_budget_limited" });
    expect(mocked.admitSoCProbe).toHaveBeenCalledWith(
      { maxAttempts: 1, maxInFlight: 2, minIntervalMs: 500, outputTokenBudget: 99 },
      100,
    );
    expect(mocked.requestSoCCompletion).not.toHaveBeenCalled();
  });

  it("fails closed for missing provider settings before database admission", async () => {
    enablePreview();
    vi.stubEnv("SOCLAAS_API_KEY", "");

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "not_configured" });
    expect(mocked.admitSoCProbe).not.toHaveBeenCalled();
    expect(mocked.requestSoCCompletion).not.toHaveBeenCalled();
  });

  it("returns a safe limited response before provider fetch when shared admission is exhausted", async () => {
    enablePreview();
    mocked.admitSoCProbe.mockResolvedValue({ status: "limited" });

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, outcome: "rate_or_budget_limited" });
    expect(mocked.requestSoCCompletion).not.toHaveBeenCalled();
    expect(mocked.releaseSoCProbe).not.toHaveBeenCalled();
  });

  it("fails closed when durable database admission fails", async () => {
    enablePreview();
    mocked.admitSoCProbe.mockRejectedValue(new Error("synthetic database failure"));

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "unavailable" });
    expect(mocked.requestSoCCompletion).not.toHaveBeenCalled();
  });

  it.each(["timeout", "cancelled", "unavailable"] as const)(
    "retains the reservation when provider outcome %s is uncertain",
    async (outcome) => {
      enablePreview();
      mocked.requestSoCCompletion.mockResolvedValue({ ok: false, outcome });

      const response = await POST(
        request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
      );

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, outcome });
      expect(mocked.releaseSoCProbe).not.toHaveBeenCalled();
    },
  );

  it("holds the reservation when the provider client throws with an unknown result", async () => {
    enablePreview();
    mocked.requestSoCCompletion.mockRejectedValue(new Error("synthetic transport failure"));

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "unavailable" });
    expect(mocked.releaseSoCProbe).not.toHaveBeenCalled();
  });

  it("uses shared admission for concurrent calls and only invokes the provider for admitted work", async () => {
    enablePreview();
    let calls = 0;
    mocked.admitSoCProbe.mockImplementation(async () => {
      calls += 1;
      return calls === 1 ? { status: "admitted", reservationId: "first" } : { status: "limited" };
    });

    const responses = await Promise.all([
      POST(request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`)),
      POST(request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`)),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    expect(mocked.admitSoCProbe).toHaveBeenCalledTimes(2);
    expect(mocked.requestSoCCompletion).toHaveBeenCalledTimes(1);
    expect(mocked.releaseSoCProbe).toHaveBeenCalledTimes(1);
  });
});
