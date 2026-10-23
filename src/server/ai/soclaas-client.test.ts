import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { requestSoCCompletion, type SoCDispatch } from "./soclaas-client";
import type { SoCEnvironment } from "./soclaas-config";

const configured: SoCEnvironment = {
  SOCLAAS_API_KEY: "synthetic-provider-key",
  SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1",
  SOCLAAS_MODEL: "synthetic-permitted-model",
  SOCLAAS_MAX_INPUT_BYTES: "128",
  SOCLAAS_MAX_OUTPUT_TOKENS: "16",
  SOCLAAS_TIMEOUT_MS: "1000",
};

const hostedConfigured: SoCEnvironment = {
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

const input = { system: "Answer only with synthetic status.", user: "Return OK." };

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

describe("server-side SoCLaaS boundary", () => {
  it("fails closed when configuration or explicit caps are missing", async () => {
    const fetchImpl = vi.fn();
    expect(await requestSoCCompletion(input, { env: {}, fetchImpl })).toEqual({
      ok: false,
      outcome: "not_configured",
    });
    expect(
      await requestSoCCompletion(input, {
        env: { ...configured, SOCLAAS_MAX_OUTPUT_TOKENS: undefined },
        fetchImpl,
      }),
    ).toEqual({ ok: false, outcome: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a caller-controlled provider host and malformed budget settings", async () => {
    const fetchImpl = vi.fn();
    const result = await requestSoCCompletion(input, {
      env: { ...configured, SOCLAAS_BASE_URL: "https://attacker.example/v1" },
      fetchImpl,
    });
    expect(result).toEqual({ ok: false, outcome: "invalid_configuration" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("enforces hard upper bounds for explicitly configured provider budgets", async () => {
    const fetchImpl = vi.fn();
    for (const env of [
      { ...configured, SOCLAAS_MAX_INPUT_BYTES: "65537" },
      { ...configured, SOCLAAS_MAX_OUTPUT_TOKENS: "4097" },
    ]) {
      await expect(requestSoCCompletion(input, { env, fetchImpl })).resolves.toEqual({
        ok: false,
        outcome: "invalid_configuration",
      });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends one fixed-host, non-streaming request with the exact configured model and caps", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: "OK" } }],
        usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
      }),
    );

    await expect(
      requestSoCCompletion(input, { env: configured, fetchImpl }),
    ).resolves.toEqual({
      ok: true,
      text: "OK",
      usage: { promptTokens: 3, completionTokens: 1, totalTokens: 4 },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://soclaas-api.comp.nus.edu.sg/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer synthetic-provider-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "synthetic-permitted-model",
      max_tokens: 16,
      stream: false,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });
  });

  it("keeps the shared SoCLaaS settings isolated from the hosted profile", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      choices: [{ message: { content: "OK" } }],
    }));

    await expect(requestSoCCompletion(input, { env: hostedConfigured, fetchImpl })).resolves.toMatchObject({
      ok: true,
      text: "OK",
    });
    const [, init] = fetchImpl.mock.calls[0];
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer shared-preview-provider-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: "qwen3.5:27b", max_tokens: 4096 });
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("response_format");
  });

  it("enables the fixed JSON/no-thinking profile only in explicitly opted-in local development", async () => {
    const localEnv = {
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
    };
    for (const [key, value] of Object.entries(localEnv)) vi.stubEnv(key, value);

    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: "{\"ok\":true}" }, finish_reason: "stop" }],
      }),
    );
    await expect(
      requestSoCCompletion(input, {
        env: localEnv,
        fetchImpl,
        profile: "local_synthetic_proposal_json_v1",
      }),
    ).resolves.toEqual({ ok: true, text: "{\"ok\":true}", finishReason: "stop" });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://soclaas-api.comp.nus.edu.sg/v1/chat/completions");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen3.5:9b",
      max_tokens: 4096,
      stream: false,
      temperature: 0,
      response_format: { type: "json_object" },
      reasoning_effort: "none",
    });
  });

  it("rejects the local extraction profile when process opt-in or exact bounds do not match", async () => {
    const localEnv = {
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
    };
    const fetchImpl = vi.fn<typeof fetch>();
    expect(
      await requestSoCCompletion(input, {
        env: localEnv,
        fetchImpl,
        profile: "local_synthetic_proposal_json_v1",
      }),
    ).toEqual({ ok: false, outcome: "invalid_configuration" });

    for (const [key, value] of Object.entries(localEnv)) vi.stubEnv(key, value);
    for (const changed of [
      { ...localEnv, SOCLAAS_MODEL: "qwen3.8:27b" },
      { ...localEnv, SOCLAAS_MAX_OUTPUT_TOKENS: "4095" },
      { ...localEnv, SOCLAAS_TIMEOUT_MS: "30000" },
    ]) {
      await expect(
        requestSoCCompletion(input, {
          env: changed,
          fetchImpl,
          profile: "local_synthetic_proposal_json_v1",
        }),
      ).resolves.toEqual({ ok: false, outcome: "invalid_configuration" });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends the fixed hosted JSON profile only after the supplied durable dispatch callback", async () => {
    stubHostedProcessEnv(hostedConfigured);
    const order: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      order.push("fetch");
      return Response.json({ choices: [{ message: { content: "{\"ok\":true}" }, finish_reason: "stop" }] });
    });
    const dispatch = async <T>(send: () => Promise<T>): Promise<T> => {
      order.push("marker");
      return send();
    };

    await expect(requestSoCCompletion(input, {
      env: hostedConfigured,
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    })).resolves.toEqual({ ok: true, text: "{\"ok\":true}", finishReason: "stop" });

    expect(order).toEqual(["marker", "fetch"]);
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

  it("fails the hosted profile closed for injected or real-environment flag/profile mismatches", async () => {
    stubHostedProcessEnv(hostedConfigured);
    const fetchImpl = vi.fn<typeof fetch>();
    const dispatchSpy = vi.fn();
    const dispatch: SoCDispatch = async <T>(send: () => Promise<T>): Promise<T> => {
      dispatchSpy();
      return send();
    };

    for (const changed of [
      { ...hostedConfigured, PROPOSAL_ASSISTANCE_HOSTED_ENABLED: undefined },
      { ...hostedConfigured, ORGANISER_SOCLAAS_MODEL: "qwen3.8:27b" },
      { ...hostedConfigured, ORGANISER_SOCLAAS_TIMEOUT_MS: "30000" },
    ]) {
      await expect(requestSoCCompletion(input, {
        env: changed,
        fetchImpl,
        profile: "hosted_organiser_proposal_json_v1",
        dispatch,
      })).resolves.toEqual({ ok: false, outcome: "invalid_configuration" });
    }

    vi.stubEnv("ORGANISER_SOCLAAS_MODEL", "qwen3.8:27b");
    await expect(requestSoCCompletion(input, {
      env: hostedConfigured,
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    })).resolves.toEqual({ ok: false, outcome: "invalid_configuration" });
    vi.stubEnv("ORGANISER_SOCLAAS_MODEL", "qwen3.5:9b");

    vi.stubEnv("ORGANISER_SOCLAAS_MAX_OUTPUT_TOKENS", "4095");
    await expect(requestSoCCompletion(input, {
      env: hostedConfigured,
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    })).resolves.toEqual({ ok: false, outcome: "invalid_configuration" });

    vi.stubEnv("PROPOSAL_ASSISTANCE_HOSTED_ENABLED", "false");
    await expect(requestSoCCompletion(input, {
      env: hostedConfigured,
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    })).resolves.toEqual({ ok: false, outcome: "invalid_configuration" });
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not fall back to shared SoCLaaS settings when hosted settings are missing", async () => {
    stubHostedProcessEnv(hostedConfigured);
    const fetchImpl = vi.fn<typeof fetch>();
    const dispatch = async <T>(send: () => Promise<T>): Promise<T> => send();

    await expect(requestSoCCompletion(input, {
      env: { ...hostedConfigured, ORGANISER_SOCLAAS_API_KEY: undefined },
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    })).resolves.toEqual({ ok: false, outcome: "not_configured" });

    vi.stubEnv("ORGANISER_SOCLAAS_API_KEY", "");
    await expect(requestSoCCompletion(input, {
      env: hostedConfigured,
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    })).resolves.toEqual({ ok: false, outcome: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not cross the hosted dispatch boundary for missing dispatch, oversized input, or cancellation", async () => {
    stubHostedProcessEnv(hostedConfigured);
    const fetchImpl = vi.fn<typeof fetch>();
    const dispatchSpy = vi.fn();
    const dispatch: SoCDispatch = async <T>(send: () => Promise<T>): Promise<T> => {
      dispatchSpy();
      return send();
    };
    const profileOptions = {
      env: hostedConfigured,
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1" as const,
      dispatch,
    };

    await expect(requestSoCCompletion(input, { ...profileOptions, dispatch: undefined })).resolves.toEqual({
      ok: false,
      outcome: "invalid_configuration",
    });
    await expect(requestSoCCompletion({ system: "é".repeat(32_769), user: "" }, profileOptions)).resolves.toEqual({
      ok: false,
      outcome: "input_too_large",
    });
    const controller = new AbortController();
    controller.abort();
    await expect(requestSoCCompletion({ ...input, signal: controller.signal }, profileOptions)).resolves.toEqual({
      ok: false,
      outcome: "cancelled",
    });
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the fixed hosted 60-second timeout and classifies a definite HTTP failure safely", async () => {
    stubHostedProcessEnv(hostedConfigured);
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("synthetic abort")), { once: true });
    }));
    const dispatch = async <T>(send: () => Promise<T>): Promise<T> => send();
    const pending = requestSoCCompletion(input, {
      env: hostedConfigured,
      fetchImpl,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    });
    await vi.advanceTimersByTimeAsync(59_999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: false, outcome: "timeout" });
    vi.useRealTimers();

    const httpFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("private provider body", { status: 503 }));
    await expect(requestSoCCompletion(input, {
      env: hostedConfigured,
      fetchImpl: httpFetch,
      profile: "hosted_organiser_proposal_json_v1",
      dispatch,
    })).resolves.toEqual({ ok: false, outcome: "unavailable", failureSource: "http_response" });
  });

  it("rejects input above the explicitly configured UTF-8 byte bound without a request", async () => {
    const fetchImpl = vi.fn();
    expect(
      await requestSoCCompletion({ system: "é".repeat(65), user: "" }, { env: configured, fetchImpl }),
    ).toEqual({ ok: false, outcome: "input_too_large" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [400, "bad_request"],
    [401, "unauthenticated"],
    [403, "forbidden"],
    [429, "rate_or_budget_limited"],
    [418, "unavailable"],
    [500, "unavailable"],
    [503, "unavailable"],
    [599, "unavailable"],
  ] as const)("maps HTTP %i to a safe classified failure", async (status, outcome) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("secret body", { status }));
    expect(await requestSoCCompletion(input, { env: configured, fetchImpl })).toEqual({
      ok: false,
      outcome,
      ...(outcome === "unavailable" ? { failureSource: "http_response" } : {}),
    });
  });

  it("cancels failed provider response bodies without reading or waiting indefinitely", async () => {
    let bodyCancelCalled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          bodyCancelCalled = true;
          return new Promise<void>(() => {});
        },
      }),
      { status: 503 },
    );
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);

    await expect(requestSoCCompletion(input, { env: configured, fetchImpl })).resolves.toEqual({
      ok: false,
      outcome: "unavailable",
      failureSource: "http_response",
    });
    expect(bodyCancelCalled).toBe(true);
  });

  it("does not return provider body or exception text and rejects malformed success bodies", async () => {
    const malformedFetch = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ secret: "marker" }));
    expect(await requestSoCCompletion(input, { env: configured, fetchImpl: malformedFetch })).toEqual({
      ok: false,
      outcome: "invalid_response",
    });

    const failedFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error("synthetic secret marker"));
    const result = await requestSoCCompletion(input, { env: configured, fetchImpl: failedFetch });
    expect(result).toEqual({ ok: false, outcome: "unavailable", failureSource: "transport" });
    expect(JSON.stringify(result)).not.toContain("synthetic secret marker");

    const emptyFetch = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ choices: [{ message: { content: "  \n" } }] }),
    );
    expect(await requestSoCCompletion(input, { env: configured, fetchImpl: emptyFetch })).toEqual({
      ok: false,
      outcome: "invalid_response",
    });

    const oversizedFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("x".repeat(65_537), { headers: { "content-type": "application/json" } }),
    );
    expect(await requestSoCCompletion(input, { env: configured, fetchImpl: oversizedFetch })).toEqual({
      ok: false,
      outcome: "invalid_response",
    });
  });

  it("aborts after the configured timeout and reports cancellation separately", async () => {
    const timeoutEnv = { ...configured, SOCLAAS_TIMEOUT_MS: "5" };
    const hangingFetch = vi.fn<typeof fetch>((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    );
    await expect(
      requestSoCCompletion(input, { env: timeoutEnv, fetchImpl: hangingFetch }),
    ).resolves.toEqual({ ok: false, outcome: "timeout" });

    const controller = new AbortController();
    controller.abort();
    await expect(
      requestSoCCompletion({ ...input, signal: controller.signal }, { env: configured, fetchImpl: hangingFetch }),
    ).resolves.toEqual({ ok: false, outcome: "cancelled" });
  });

  it("preserves timeout and caller-cancellation outcomes while reading a bounded response", async () => {
    const streamingFetch = vi.fn<typeof fetch>(async (_url, init) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true });
        },
      });
      return new Response(body);
    });

    await expect(
      requestSoCCompletion(input, {
        env: { ...configured, SOCLAAS_TIMEOUT_MS: "5" },
        fetchImpl: streamingFetch,
      }),
    ).resolves.toEqual({ ok: false, outcome: "timeout" });

    const controller = new AbortController();
    const pending = requestSoCCompletion({ ...input, signal: controller.signal }, {
      env: { ...configured, SOCLAAS_TIMEOUT_MS: "1000" },
      fetchImpl: streamingFetch,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    await expect(pending).resolves.toEqual({ ok: false, outcome: "cancelled" });
  });
});

it("preserves output-cap metadata without changing the provider request or retrying", async () => {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
    choices: [{ message: { content: "partial" }, finish_reason: "length" }],
    usage: { prompt_tokens: 3, completion_tokens: 16, total_tokens: 19 },
  }));
  expect(await requestSoCCompletion(input, { env: configured, fetchImpl })).toEqual({
    ok: true, text: "partial", truncated: true, finishReason: "length", usage: { promptTokens: 3, completionTokens: 16, totalTokens: 19 },
  });
  expect(fetchImpl).toHaveBeenCalledOnce();
});
