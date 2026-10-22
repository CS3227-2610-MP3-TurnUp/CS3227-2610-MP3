import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGate = vi.hoisted(() => ({
  admit: vi.fn(),
  release: vi.fn(),
}));

vi.mock("../../src/server/db/soc-probe-gate", () => ({
  admitSoCProbe: mockGate.admit,
  releaseSoCProbe: mockGate.release,
}));

import {
  proposalCompletionAvailability,
  requestProposalCompletion,
} from "../../src/server/proposal-assistance/transport";

const reservationId = "8f8a6b85-0f7e-4bf5-b468-90c8a249a2a0";
const input = { system: "Synthetic extraction rules", user: "Synthetic event facts" };

function setLocalSyntheticConfiguration(): void {
  const env: Record<string, string> = {
    TURNUP_ENVIRONMENT: "development",
    NODE_ENV: "development",
    DATABASE_ENVIRONMENT: "non-production",
    VERCEL_ENV: "development",
    PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC: "true",
    SOCLAAS_API_KEY: "synthetic-provider-key",
    SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1",
    SOCLAAS_MODEL: "qwen3.5:9b",
    SOCLAAS_MAX_INPUT_BYTES: "65536",
    SOCLAAS_MAX_OUTPUT_TOKENS: "4096",
    SOCLAAS_TIMEOUT_MS: "60000",
    FOUNDATION_PROBE_SOC_MAX_ATTEMPTS: "5",
    FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT: "1",
    FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS: "2100",
    FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET: "8192",
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

function successfulFetch(): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      choices: [{ message: { content: "{\"facts\":{\"title\":\"Synthetic Event\"}}" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 },
    }),
  );
}

beforeEach(() => {
  mockGate.admit.mockReset().mockResolvedValue({ status: "admitted", reservationId });
  mockGate.release.mockReset().mockResolvedValue(undefined);
  setLocalSyntheticConfiguration();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("proposal SoCLaaS transport", () => {
  it("reports availability without reading an upload and requires exact local synthetic settings", () => {
    expect(proposalCompletionAvailability()).toEqual({ available: true });

    vi.stubEnv("TURNUP_ENVIRONMENT", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(proposalCompletionAvailability()).toEqual({ available: false, outcome: "disabled" });

    setLocalSyntheticConfiguration();
    vi.stubEnv("SOCLAAS_TIMEOUT_MS", "30000");
    expect(proposalCompletionAvailability()).toEqual({ available: false, outcome: "invalid_configuration" });
  });

  it("uses the durable shared budget gate and fixed server-side JSON profile", async () => {
    const fetchImpl = successfulFetch();
    vi.stubGlobal("fetch", fetchImpl);

    await expect(requestProposalCompletion(input)).resolves.toEqual({
      ok: true,
      text: "{\"facts\":{\"title\":\"Synthetic Event\"}}",
      finishReason: "stop",
    });
    expect(mockGate.admit).toHaveBeenCalledWith(
      {
        maxAttempts: 5,
        maxInFlight: 1,
        minIntervalMs: 2100,
        outputTokenBudget: 8192,
      },
      4096,
    );
    expect(mockGate.release).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledOnce();

    const [, init] = fetchImpl.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen3.5:9b",
      max_tokens: 4096,
      stream: false,
      temperature: 0,
      response_format: { type: "json_object" },
      reasoning_effort: "none",
    });
  });

  it("does not dispatch or reserve on early cancellation or oversized input", async () => {
    const fetchImpl = successfulFetch();
    vi.stubGlobal("fetch", fetchImpl);

    const controller = new AbortController();
    controller.abort();
    await expect(requestProposalCompletion({ ...input, signal: controller.signal })).resolves.toEqual({
      ok: false,
      outcome: "cancelled",
    });
    await expect(
      requestProposalCompletion({ system: "x".repeat(65_537), user: "" }),
    ).resolves.toEqual({ ok: false, outcome: "input_too_large" });

    expect(mockGate.admit).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("releases a lease when cancellation happens while durable admission is pending", async () => {
    let finishAdmission: ((value: { status: "admitted"; reservationId: string }) => void) | undefined;
    mockGate.admit.mockImplementation(() => new Promise((resolve) => { finishAdmission = resolve; }));
    const fetchImpl = successfulFetch();
    vi.stubGlobal("fetch", fetchImpl);

    const controller = new AbortController();
    const pending = requestProposalCompletion({ ...input, signal: controller.signal });
    await vi.waitFor(() => expect(mockGate.admit).toHaveBeenCalledOnce());
    controller.abort();
    finishAdmission?.({ status: "admitted", reservationId });

    await expect(pending).resolves.toEqual({ ok: false, outcome: "cancelled" });
    expect(mockGate.release).toHaveBeenCalledWith(reservationId);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed on unavailable gate, limited admission, and release errors", async () => {
    const fetchImpl = successfulFetch();
    vi.stubGlobal("fetch", fetchImpl);

    mockGate.admit.mockRejectedValueOnce(new Error("synthetic database detail"));
    await expect(requestProposalCompletion(input)).resolves.toEqual({ ok: false, outcome: "unavailable" });
    expect(fetchImpl).not.toHaveBeenCalled();

    mockGate.admit.mockResolvedValueOnce({ status: "limited" });
    await expect(requestProposalCompletion(input)).resolves.toEqual({
      ok: false,
      outcome: "rate_or_budget_limited",
    });
    expect(fetchImpl).not.toHaveBeenCalled();

    mockGate.admit.mockResolvedValueOnce({ status: "admitted", reservationId });
    mockGate.release.mockRejectedValueOnce(new Error("synthetic release detail"));
    await expect(requestProposalCompletion(input)).resolves.toEqual({ ok: false, outcome: "unavailable" });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("retains the conservative in-flight lease after an ambiguous provider transport failure", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error("private synthetic response detail"));
    vi.stubGlobal("fetch", fetchImpl);

    const result = await requestProposalCompletion(input);
    expect(result).toEqual({ ok: false, outcome: "unavailable" });
    expect(JSON.stringify(result)).not.toContain("private synthetic response detail");
    expect(mockGate.admit).toHaveBeenCalledOnce();
    expect(mockGate.release).not.toHaveBeenCalled();
  });

  it("retains the conservative in-flight lease after a provider timeout", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    );
    vi.stubGlobal("fetch", fetchImpl);

    const pending = requestProposalCompletion(input);
    await vi.advanceTimersByTimeAsync(60_001);
    await expect(pending).resolves.toEqual({ ok: false, outcome: "timeout" });
    expect(mockGate.admit).toHaveBeenCalledOnce();
    expect(mockGate.release).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("releases the lease after a bounded provider HTTP failure without exposing its body", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("provider private body marker", { status: 503 }));
    vi.stubGlobal("fetch", fetchImpl);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await requestProposalCompletion(input);
    expect(result).toEqual({ ok: false, outcome: "unavailable" });
    expect(mockGate.release).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("provider private body marker");
  });

  it("fails before admission when the durable budget configuration is absent or incompatible", async () => {
    const fetchImpl = successfulFetch();
    vi.stubGlobal("fetch", fetchImpl);
    vi.stubEnv("FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT", "2");
    await expect(requestProposalCompletion(input)).resolves.toEqual({
      ok: false,
      outcome: "invalid_configuration",
    });
    expect(mockGate.admit).not.toHaveBeenCalled();

    vi.stubEnv("FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT", "1");
    vi.stubEnv("FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET", "4095");
    await expect(requestProposalCompletion(input)).resolves.toEqual({
      ok: false,
      outcome: "invalid_configuration",
    });
    expect(mockGate.admit).not.toHaveBeenCalled();

    vi.stubEnv("FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET", "8192");
    vi.stubEnv("FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS", "2099");
    await expect(requestProposalCompletion(input)).resolves.toEqual({
      ok: false,
      outcome: "invalid_configuration",
    });
    expect(mockGate.admit).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
