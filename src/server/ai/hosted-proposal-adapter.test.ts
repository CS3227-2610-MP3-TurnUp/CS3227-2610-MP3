import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createHostedProposalAdapter } from "./hosted-proposal-adapter";
import type { SoCDispatch } from "./soclaas-client";
import type { SoCEnvironment } from "./soclaas-config";

const hostedEnv: SoCEnvironment = {
  TURNUP_ENVIRONMENT: "preview",
  DATABASE_ENVIRONMENT: "non-production",
  VERCEL_ENV: "preview",
  VERCEL: "1",
  NODE_ENV: "production",
  PROPOSAL_ASSISTANCE_HOSTED_ENABLED: "true",
  DATABASE_URL: "postgresql://synthetic:synthetic@ep-hosted-probe-pooler.us-east-2.aws.neon.tech/turnup?sslmode=require",
  SOCLAAS_API_KEY: "shared-preview-provider-key",
  SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1",
  SOCLAAS_MODEL: "qwen3.5:27b",
  SOCLAAS_MAX_INPUT_BYTES: "65536",
  SOCLAAS_MAX_OUTPUT_TOKENS: "4096",
  SOCLAAS_TIMEOUT_MS: "30000",
  ORGANISER_SOCLAAS_API_KEY: "synthetic-hosted-provider-key",
  ORGANISER_SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1",
  ORGANISER_SOCLAAS_MODEL: "qwen3.5:9b",
  ORGANISER_SOCLAAS_MAX_INPUT_BYTES: "65536",
  ORGANISER_SOCLAAS_MAX_OUTPUT_TOKENS: "4096",
  ORGANISER_SOCLAAS_TIMEOUT_MS: "60000",
};

const input = { system: "Synthetic system prompt.", user: "Synthetic user prompt." };

function stubHostedProcessEnv(env: SoCEnvironment): void {
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) vi.stubEnv(key, value);
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("hosted organiser proposal adapter", () => {
  it("is unavailable unless the injected and real environments opt in with the fixed profile", () => {
    stubHostedProcessEnv(hostedEnv);
    const fetchImpl = vi.fn<typeof fetch>();

    expect(createHostedProposalAdapter({ ...hostedEnv, PROPOSAL_ASSISTANCE_HOSTED_ENABLED: undefined }, fetchImpl)
      .availability()).toEqual({ available: false, outcome: "not_configured" });
    expect(createHostedProposalAdapter({ ...hostedEnv, ORGANISER_SOCLAAS_MODEL: "qwen3.8:27b" }, fetchImpl)
      .availability()).toEqual({ available: false, outcome: "invalid_configuration" });

    expect(createHostedProposalAdapter({ ...hostedEnv, ORGANISER_SOCLAAS_API_KEY: undefined }, fetchImpl)
      .availability()).toEqual({ available: false, outcome: "not_configured" });

    vi.stubEnv("ORGANISER_SOCLAAS_TIMEOUT_MS", "30000");
    expect(createHostedProposalAdapter(hostedEnv, fetchImpl).availability()).toEqual({
      available: false,
      outcome: "invalid_configuration",
    });
    vi.stubEnv("ORGANISER_SOCLAAS_TIMEOUT_MS", "60000");
    vi.stubEnv("ORGANISER_SOCLAAS_API_KEY", "");
    expect(createHostedProposalAdapter(hostedEnv, fetchImpl).availability()).toEqual({
      available: false,
      outcome: "not_configured",
    });
    vi.stubEnv("ORGANISER_SOCLAAS_API_KEY", "synthetic-hosted-provider-key");
    vi.stubEnv("PROPOSAL_ASSISTANCE_HOSTED_ENABLED", "false");
    expect(createHostedProposalAdapter(hostedEnv, fetchImpl).availability()).toEqual({
      available: false,
      outcome: "not_configured",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("marks durable dispatch immediately before one fixed-profile provider send", async () => {
    stubHostedProcessEnv(hostedEnv);
    const order: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
      order.push("fetch");
      expect(init?.signal?.aborted).toBe(false);
      return Response.json({
        choices: [{ message: { content: "{\"title\":\"Synthetic\"}" }, finish_reason: "stop" }],
      });
    });
    const dispatch = async <T>(send: () => Promise<T>): Promise<T> => {
      order.push("durable-marker");
      return send();
    };
    const adapter = createHostedProposalAdapter(hostedEnv, fetchImpl);

    expect(adapter.availability()).toEqual({ available: true, maxInputBytes: 65_536, outputTokens: 4_096 });
    await expect(adapter.complete(input, dispatch)).resolves.toEqual({
      ok: true,
      text: "{\"title\":\"Synthetic\"}",
      finishReason: "stop",
    });
    expect(order).toEqual(["durable-marker", "fetch"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://soclaas-api.comp.nus.edu.sg/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer synthetic-hosted-provider-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen3.5:9b",
      max_tokens: 4096,
      stream: false,
      temperature: 0,
      response_format: { type: "json_object" },
      reasoning_effort: "none",
    });
  });

  it("does not dispatch when exact fixed bounds fail preflight", async () => {
    stubHostedProcessEnv(hostedEnv);
    const fetchImpl = vi.fn<typeof fetch>();
    const dispatchSpy = vi.fn();
    const dispatch: SoCDispatch = async <T>(send: () => Promise<T>): Promise<T> => {
      dispatchSpy();
      return send();
    };
    const adapter = createHostedProposalAdapter({ ...hostedEnv, ORGANISER_SOCLAAS_MAX_OUTPUT_TOKENS: "4095" }, fetchImpl);

    expect(adapter.availability()).toEqual({ available: false, outcome: "invalid_configuration" });
    await expect(adapter.complete(input, dispatch)).resolves.toEqual({
      ok: false,
      outcome: "invalid_configuration",
    });
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [401, { ok: false, outcome: "unauthenticated" }],
    [429, { ok: false, outcome: "rate_or_budget_limited" }],
    [503, { ok: false, outcome: "unavailable", failureSource: "http_response" }],
  ] as const)("classifies HTTP %i without exposing the provider response body", async (status, expected) => {
    stubHostedProcessEnv(hostedEnv);
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("synthetic private response marker", { status }));
    const dispatch = async <T>(send: () => Promise<T>): Promise<T> => send();
    const result = await createHostedProposalAdapter(hostedEnv, fetchImpl).complete(input, dispatch);

    expect(result).toEqual(expected);
    expect(JSON.stringify(result)).not.toContain("synthetic private response marker");
  });

  it("propagates a failed pre-send durable marker without calling the provider or masking it as a transport outcome", async () => {
    stubHostedProcessEnv(hostedEnv);
    const fetchImpl = vi.fn<typeof fetch>();
    const dispatch = async <T>(_send: () => Promise<T>): Promise<T> => {
      throw new Error("synthetic database marker detail");
    };

    await expect(createHostedProposalAdapter(hostedEnv, fetchImpl).complete(input, dispatch))
      .rejects.toMatchObject({ name: "DispatchBoundaryFailure" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
