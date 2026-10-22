import "server-only";

import {
  isLocalSyntheticProposalAssistanceEnabled,
  LOCAL_SYNTHETIC_PROPOSAL_MODEL,
  readSoCConfig,
  type SoCConfigTimeoutScope,
  type SoCEnvironment,
} from "./soclaas-config";

const chatCompletionsUrl = "https://soclaas-api.comp.nus.edu.sg/v1/chat/completions";
const maxResponseBytes = 65_536;
const responseCancellationTimeoutMs = 100;

export interface SoCInput {
  system: string;
  user: string;
  signal?: AbortSignal;
}

/** Fixed provider profile; callers cannot select model, format, or reasoning mode. */
export type SoCCompletionProfile = "local_synthetic_proposal_json_v1";

export type SoCOutcome =
  | "not_configured"
  | "invalid_configuration"
  | "input_too_large"
  | "unauthenticated"
  | "forbidden"
  | "rate_or_budget_limited"
  | "bad_request"
  | "unavailable"
  | "timeout"
  | "cancelled"
  | "invalid_response";

export type SoCFailure =
  | { ok: false; outcome: Exclude<SoCOutcome, "unavailable" | "invalid_response"> }
  | { ok: false; outcome: "invalid_response"; finishReason?: SoCFinishReason }
  | { ok: false; outcome: "unavailable"; failureSource: "http_response" | "transport" };

export type SoCFinishReason = "stop" | "length" | "other";

export type SoCResult =
  | { ok: true; text: string; usage?: SoCUsage; finishReason?: SoCFinishReason }
  | SoCFailure;

export interface SoCUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export type FetchLike = typeof fetch;

/** One bounded Chat Completions attempt. Provider bodies and exception text never escape. */
export async function requestSoCCompletion(
  input: SoCInput,
  options: {
    env?: SoCEnvironment;
    fetchImpl?: FetchLike;
    /** Explicit local-only JSON extraction profile; never selected from request data. */
    profile?: SoCCompletionProfile;
  } = {},
): Promise<SoCResult> {
  const env = options.env ?? process.env;
  if (
    options.profile !== undefined &&
    (
      options.profile !== "local_synthetic_proposal_json_v1" ||
      !isLocalSyntheticProposalAssistanceEnabled(env) ||
      !isLocalSyntheticProposalAssistanceEnabled(process.env) ||
      env.SOCLAAS_MODEL !== LOCAL_SYNTHETIC_PROPOSAL_MODEL ||
      process.env.SOCLAAS_MODEL !== LOCAL_SYNTHETIC_PROPOSAL_MODEL
    )
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  const timeoutScope: SoCConfigTimeoutScope | undefined = options.profile
    ? "local-synthetic-proposal"
    : undefined;
  const configResult = readSoCConfig(env, {
    ...(timeoutScope ? { timeoutScope } : {}),
  });
  if (!configResult.ok) return configResult;
  const config = configResult.config;

  if (
    options.profile &&
    (
      config.model !== LOCAL_SYNTHETIC_PROPOSAL_MODEL ||
      config.maxInputBytes !== 65_536 ||
      config.maxOutputTokens !== 4_096 ||
      config.timeoutMs !== 60_000
    )
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  const inputBytes =
    new TextEncoder().encode(input.system).byteLength + new TextEncoder().encode(input.user).byteLength;
  if (inputBytes > config.maxInputBytes) return { ok: false, outcome: "input_too_large" };
  if (input.signal?.aborted) return { ok: false, outcome: "cancelled" };

  const controller = new AbortController();
  let didTimeout = false;
  let didCancel = false;
  const onCallerAbort = () => {
    didCancel = true;
    controller.abort();
  };
  input.signal?.addEventListener("abort", onCallerAbort, { once: true });
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, config.timeoutMs);

  try {
    const response = await (options.fetchImpl ?? fetch)(chatCompletionsUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        max_tokens: config.maxOutputTokens,
        stream: false,
        ...(options.profile === "local_synthetic_proposal_json_v1"
          ? {
              temperature: 0,
              response_format: { type: "json_object" },
              reasoning_effort: "none",
            }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // The status is sufficient for classification; discard the untrusted body without reading it.
      clearTimeout(timer);
      await cancelResponseBodyBounded(response);
      const outcome = classifyStatus(response.status);
      if (options.profile && outcome === "bad_request") {
        return { ok: false, outcome: "invalid_configuration" };
      }
      return outcome === "unavailable"
        ? { ok: false, outcome, failureSource: "http_response" }
        : { ok: false, outcome };
    }

    const responseText = await readBoundedResponse(response);
    if (responseText === undefined) return { ok: false, outcome: "invalid_response" };

    let body: unknown;
    try {
      body = JSON.parse(responseText);
    } catch {
      return { ok: false, outcome: "invalid_response" };
    }
    return readCompletion(body);
  } catch {
    if (didCancel) return { ok: false, outcome: "cancelled" };
    if (didTimeout) return { ok: false, outcome: "timeout" };
    return { ok: false, outcome: "unavailable", failureSource: "transport" };
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", onCallerAbort);
  }
}

async function cancelResponseBodyBounded(response: Response): Promise<void> {
  if (!response.body) return;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      response.body.cancel().catch(() => undefined),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, responseCancellationTimeoutMs);
      }),
    ]);
  } catch {
    // Keep the classified HTTP status and never expose or drain an error body.
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readBoundedResponse(response: Response): Promise<string | undefined> {
  const reader = response.body?.getReader();
  if (!reader) return undefined;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBytes) {
        try {
          await reader.cancel();
        } catch {
          // The response is already rejected as oversized.
        }
        return undefined;
      }
      chunks.push(value);
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, totalBytes));
    } catch {
      return undefined;
    }
  } finally {
    // Abort/read errors propagate so the caller can preserve timeout/cancellation outcomes.
    reader.releaseLock();
  }
}

function classifyStatus(status: number): SoCOutcome {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_or_budget_limited";
  return "unavailable";
}

function readCompletion(body: unknown): SoCResult {
  if (!isRecord(body) || !Array.isArray(body.choices)) {
    return { ok: false, outcome: "invalid_response" };
  }
  const first = body.choices[0];
  if (
    !isRecord(first) ||
    !isRecord(first.message) ||
    typeof first.message.content !== "string" ||
    first.message.content.trim().length === 0
  ) {
    return { ok: false, outcome: "invalid_response" };
  }

  const usage = readUsage(body.usage);
  const finishReason = readFinishReason(first.finish_reason);
  return {
    ok: true,
    text: first.message.content,
    ...(usage ? { usage } : {}),
    ...(finishReason ? { finishReason } : {}),
  };
}

function readFinishReason(value: unknown): SoCFinishReason | undefined {
  if (value === "stop" || value === "length") return value;
  if (value === "content_filter" || value === "tool_calls" || value === "function_call") return "other";
  return undefined;
}

function readUsage(value: unknown): SoCUsage | undefined {
  if (!isRecord(value)) return undefined;
  const usage: SoCUsage = {};
  if (isNonNegativeInteger(value.prompt_tokens)) usage.promptTokens = value.prompt_tokens;
  if (isNonNegativeInteger(value.completion_tokens)) usage.completionTokens = value.completion_tokens;
  if (isNonNegativeInteger(value.total_tokens)) usage.totalTokens = value.total_tokens;
  return Object.keys(usage).length > 0 ? usage : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
