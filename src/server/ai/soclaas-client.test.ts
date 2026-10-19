import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { requestSoCCompletion } from "./soclaas-client";
import type { SoCEnvironment } from "./soclaas-config";

const configured: SoCEnvironment = {
  SOCLAAS_API_KEY: "synthetic-provider-key",
  SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1",
  SOCLAAS_MODEL: "synthetic-permitted-model",
  SOCLAAS_MAX_INPUT_BYTES: "128",
  SOCLAAS_MAX_OUTPUT_TOKENS: "16",
  SOCLAAS_TIMEOUT_MS: "1000",
};

const input = { system: "Answer only with synthetic status.", user: "Return OK." };

afterEach(() => vi.restoreAllMocks());

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
