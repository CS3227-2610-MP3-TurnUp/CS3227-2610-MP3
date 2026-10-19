import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  requestSoCCompletion: vi.fn(),
  admitSoCProbe: vi.fn(),
  releaseSoCProbe: vi.fn(),
  createFoundationProbe: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../../src/server/ai/soclaas-client", () => mocked);
vi.mock("../../src/server/db/soc-probe-gate", () => ({
  admitSoCProbe: mocked.admitSoCProbe,
  releaseSoCProbe: mocked.releaseSoCProbe,
}));
vi.mock("../../src/server/db/foundation-probe", () => ({
  createFoundationProbe: mocked.createFoundationProbe,
  foundationProbeExists: vi.fn(),
  deleteFoundationProbe: vi.fn(),
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

function request(url: string, authorization?: string, body?: string, signal?: AbortSignal): Request {
  return new Request(`https://preview.example${url}`, {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
    body,
    signal,
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
      signal: expect.any(AbortSignal),
    });
    expect(mocked.admitSoCProbe).toHaveBeenCalledWith(
      { maxAttempts: 5, maxInFlight: 2, minIntervalMs: 500, outputTokenBudget: 500 },
      100,
    );
    expect(mocked.releaseSoCProbe).toHaveBeenCalledWith("synthetic-reservation");
  });

  it("forwards caller cancellation to the provider and retains the uncertain reservation", async () => {
    enablePreview();
    const controller = new AbortController();
    mocked.requestSoCCompletion.mockImplementation(({ signal }: { signal: AbortSignal }) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve({ ok: false, outcome: "cancelled" }), { once: true });
      }),
    );

    const probeRequest = request(
      "/api/internal/foundation-probe?operation=soc",
      `Bearer ${token}`,
      undefined,
      controller.signal,
    );
    const requestSignal = probeRequest.signal;
    const pendingResponse = POST(probeRequest);
    await vi.waitFor(() => expect(mocked.requestSoCCompletion).toHaveBeenCalledTimes(1));
    const providerInput = mocked.requestSoCCompletion.mock.calls[0]?.[0] as { signal: AbortSignal };
    expect(providerInput.signal).toBe(requestSignal);

    controller.abort();
    const response = await pendingResponse;

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "cancelled" });
    expect(mocked.releaseSoCProbe).not.toHaveBeenCalled();
  });

  it("requires a caller-known valid UUID and accepts create retries with the same UUID", async () => {
    enablePreview();
    const id = "018f47a2-7c5d-7abc-8def-0123456789ab";
    mocked.createFoundationProbe.mockResolvedValue(undefined);

    const missingId = await POST(
      request("/api/internal/foundation-probe?operation=persistence-create", `Bearer ${token}`),
    );
    const invalidId = await POST(
      request("/api/internal/foundation-probe?operation=persistence-create&id=invalid", `Bearer ${token}`),
    );
    expect(missingId.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(mocked.createFoundationProbe).not.toHaveBeenCalled();

    const url = `/api/internal/foundation-probe?operation=persistence-create&id=${id}`;
    const first = await POST(request(url, `Bearer ${token}`));
    const retry = await POST(request(url, `Bearer ${token}`));

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ ok: true, id });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ ok: true, id });
    expect(mocked.createFoundationProbe).toHaveBeenNthCalledWith(1, id);
    expect(mocked.createFoundationProbe).toHaveBeenNthCalledWith(2, id);
  });

  it("accepts the READY sentinel with surrounding whitespace", async () => {
    enablePreview();
    mocked.requestSoCCompletion.mockResolvedValue({ ok: true, text: " \nREADY\t " });

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocked.releaseSoCProbe).toHaveBeenCalledWith("synthetic-reservation");
  });

  it.each([
    ["refusal", "I cannot help with that request."],
    ["extra completion text", "READY. The check is complete."],
    ["partial sentinel", "REA"],
  ])("rejects %s without exposing provider text and releases its completed lease", async (_label, text) => {
    enablePreview();
    mocked.requestSoCCompletion.mockResolvedValue({ ok: true, text });

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toBe(JSON.stringify({ ok: false, outcome: "invalid_response" }));
    expect(body).not.toContain(text);
    expect(mocked.releaseSoCProbe).toHaveBeenCalledTimes(1);
    expect(mocked.releaseSoCProbe).toHaveBeenCalledWith("synthetic-reservation");
  });

  it("does not respond to a mismatched completion until its completed lease is released", async () => {
    enablePreview();
    mocked.requestSoCCompletion.mockResolvedValue({ ok: true, text: "not READY" });

    let finishRelease!: () => void;
    mocked.releaseSoCProbe.mockImplementation(
      () => new Promise<void>((resolve) => {
        finishRelease = resolve;
      }),
    );

    let responseSettled = false;
    const pendingResponse = POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    ).then((response) => {
      responseSettled = true;
      return response;
    });

    await vi.waitFor(() => expect(mocked.releaseSoCProbe).toHaveBeenCalledTimes(1));
    expect(responseSettled).toBe(false);
    finishRelease();

    const response = await pendingResponse;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "invalid_response" });
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

  it.each([
    ["timeout", { ok: false, outcome: "timeout" }],
    ["cancelled", { ok: false, outcome: "cancelled" }],
    ["transport unavailable", { ok: false, outcome: "unavailable", failureSource: "transport" }],
  ] as const)("retains the reservation when provider outcome %s is uncertain", async (_label, result) => {
    enablePreview();
    mocked.requestSoCCompletion.mockResolvedValue(result);

    const response = await POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: result.outcome });
    expect(mocked.releaseSoCProbe).not.toHaveBeenCalled();
  });

  it("releases a completed HTTP unavailable lease before returning the safe response", async () => {
    enablePreview();
    mocked.requestSoCCompletion.mockResolvedValue({
      ok: false,
      outcome: "unavailable",
      failureSource: "http_response",
    });

    let finishRelease!: () => void;
    mocked.releaseSoCProbe.mockImplementation(
      () => new Promise<void>((resolve) => {
        finishRelease = resolve;
      }),
    );

    let responseSettled = false;
    const pendingResponse = POST(
      request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`),
    ).then((response) => {
      responseSettled = true;
      return response;
    });

    await vi.waitFor(() => expect(mocked.releaseSoCProbe).toHaveBeenCalledWith("synthetic-reservation"));
    expect(responseSettled).toBe(false);
    finishRelease();

    const response = await pendingResponse;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, outcome: "unavailable" });
  });

  it("allows the next probe when max in-flight is one after a completed HTTP failure", async () => {
    enablePreview();
    vi.stubEnv("FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT", "1");
    let inFlight = 0;
    let nextReservation = 0;
    mocked.admitSoCProbe.mockImplementation(async () => {
      if (inFlight >= 1) return { status: "limited" };
      inFlight += 1;
      nextReservation += 1;
      return { status: "admitted", reservationId: `reservation-${nextReservation}` };
    });
    mocked.releaseSoCProbe.mockImplementation(async () => {
      inFlight -= 1;
    });
    mocked.requestSoCCompletion
      .mockResolvedValueOnce({ ok: false, outcome: "unavailable", failureSource: "http_response" })
      .mockResolvedValueOnce({ ok: true, text: "READY" });

    const first = await POST(request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`));
    const second = await POST(request("/api/internal/foundation-probe?operation=soc", `Bearer ${token}`));

    expect(first.status).toBe(503);
    expect(await first.json()).toEqual({ ok: false, outcome: "unavailable" });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ ok: true });
    expect(mocked.requestSoCCompletion).toHaveBeenCalledTimes(2);
    expect(mocked.releaseSoCProbe).toHaveBeenNthCalledWith(1, "reservation-1");
    expect(mocked.releaseSoCProbe).toHaveBeenNthCalledWith(2, "reservation-2");
  });

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
