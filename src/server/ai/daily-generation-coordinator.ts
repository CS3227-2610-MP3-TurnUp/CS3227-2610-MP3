import "server-only";

import type { PrismaClient } from "../db/generated/client";
import {
  DAILY_GENERATION_TOKENS_PER_ATTEMPT,
  type GenerationLimitDetails,
  type GenerationUsageEnvironment,
} from "../../lib/generation-usage";
import type { ProposalCompletionOutcome, ProposalCompletionResult } from "../proposal-assistance/transport";
import {
  executeDailyGeneration,
  type DailyGenerationExecution,
} from "./daily-generation";
import { HOSTED_DAILY_GENERATION_ENABLED, readDailyGenerationEnvironment } from "./daily-generation-config";

const MAX_GENERATION_INPUT_BYTES = 65_536;

export type HostedProviderResult =
  | { ok: true; text: string; finishReason?: "stop" | "length" | "other" }
  | {
      ok: false;
      outcome: ProposalCompletionOutcome;
      /** Only a bounded provider HTTP response proves an unavailable result is definitive. */
      failureSource?: "http_response" | "transport";
    };

/** The selected provider is supplied only by a later reviewed server profile. */
export interface HostedGenerationAdapter {
  availability():
    | { available: true; maxInputBytes: number; outputTokens: typeof DAILY_GENERATION_TOKENS_PER_ATTEMPT }
    | { available: false; outcome: "not_configured" | "invalid_configuration" };
  complete(
    input: { system: string; user: string; signal?: AbortSignal },
    dispatch: <T>(send: () => Promise<T>) => Promise<T>,
  ): Promise<HostedProviderResult>;
}

export type HostedAdapterAvailability =
  | { available: true; environment: GenerationUsageEnvironment; adapter: HostedGenerationAdapter }
  | { available: false; outcome: "disabled" | "not_configured" | "invalid_configuration" };

type DailyExecutor = (
  db: PrismaClient | undefined,
  input: { enabled: boolean; ownerId: string; environment: GenerationUsageEnvironment; signal?: AbortSignal },
  dispatch: (markDispatched: () => Promise<void>) => Promise<HostedProviderResult>,
  isAmbiguous: (result: HostedProviderResult) => boolean,
) => Promise<DailyGenerationExecution<HostedProviderResult>>;

/**
 * Hosted generation is hard-disabled in this increment. With no configured
 * adapter, an environment variable cannot choose a model or activate it.
 */
export function hostedGenerationAvailability(
  adapter?: HostedGenerationAdapter,
): HostedAdapterAvailability {
  if (!HOSTED_DAILY_GENERATION_ENABLED) return { available: false, outcome: "disabled" };
  const configured = readDailyGenerationEnvironment(process.env);
  if (configured.status !== "supported") {
    return { available: false, outcome: configured.status === "invalid" ? "invalid_configuration" : "disabled" };
  }
  if (!adapter) return { available: false, outcome: "not_configured" };
  const profile = validateAdapterAvailability(adapter);
  return profile.ok
    ? { available: true, environment: configured.environment, adapter }
    : { available: false, outcome: profile.outcome };
}

/** Runtime entry used by transport; the adapter remains absent until a later approved profile. */
export async function requestHostedDailyCompletion(input: {
  ownerId: string;
  system: string;
  user: string;
  signal?: AbortSignal;
}): Promise<ProposalCompletionResult> {
  const availability = hostedGenerationAvailability();
  if (!availability.available) return { ok: false, outcome: availability.outcome };
  if (!isUuid(input.ownerId)) return { ok: false, outcome: "invalid_configuration" };

  try {
    const { prisma } = await import("../db/client");
    return await runHostedDailyCompletion(prisma, availability.environment, input, availability.adapter);
  } catch {
    return { ok: false, outcome: "unavailable" };
  }
}

/**
 * The deterministic integration seam used to test the future provider handoff.
 * Every provider send must go through `dispatch`, which durably marks the
 * reservation immediately before invoking the send callback.
 */
export async function runHostedDailyCompletion(
  db: PrismaClient | undefined,
  environment: GenerationUsageEnvironment,
  input: { ownerId: string; system: string; user: string; signal?: AbortSignal },
  adapter: HostedGenerationAdapter,
  execute: DailyExecutor = executeDailyGeneration,
): Promise<ProposalCompletionResult> {
  if (!isUuid(input.ownerId)) return { ok: false, outcome: "invalid_configuration" };
  const profile = validateAdapterAvailability(adapter);
  if (!profile.ok) return { ok: false, outcome: profile.outcome };

  const inputBytes = new TextEncoder().encode(input.system).byteLength + new TextEncoder().encode(input.user).byteLength;
  if (inputBytes > Math.min(profile.maxInputBytes, MAX_GENERATION_INPUT_BYTES)) {
    return { ok: false, outcome: "input_too_large" };
  }

  const result = await execute(
    db,
    { enabled: true, ownerId: input.ownerId, environment, ...(input.signal ? { signal: input.signal } : {}) },
    async (markDispatched) => adapter.complete(
      { system: input.system, user: input.user, ...(input.signal ? { signal: input.signal } : {}) },
      async (send) => {
        if (input.signal?.aborted) throw new Error("Provider dispatch was cancelled before send.");
        await markDispatched();
        return send();
      },
    ),
    isAmbiguousProviderResult,
  );

  return mapDailyExecution(result);
}

function validateAdapterAvailability(adapter: HostedGenerationAdapter):
  | { ok: true; maxInputBytes: number }
  | { ok: false; outcome: "not_configured" | "invalid_configuration" } {
  let availability: ReturnType<HostedGenerationAdapter["availability"]>;
  try { availability = adapter.availability(); }
  catch { return { ok: false, outcome: "invalid_configuration" }; }
  if (!availability.available) return { ok: false, outcome: availability.outcome };
  if (!Number.isSafeInteger(availability.maxInputBytes) || availability.maxInputBytes < 1 ||
      availability.maxInputBytes > MAX_GENERATION_INPUT_BYTES ||
      availability.outputTokens !== DAILY_GENERATION_TOKENS_PER_ATTEMPT) {
    return { ok: false, outcome: "invalid_configuration" };
  }
  return { ok: true, maxInputBytes: availability.maxInputBytes };
}

function mapDailyExecution(result: DailyGenerationExecution<HostedProviderResult>): ProposalCompletionResult {
  if (result.ok) {
    if (result.value.ok) {
      return {
        ok: true,
        text: result.value.text,
        ...(result.value.finishReason ? { finishReason: result.value.finishReason } : {}),
      };
    }
    return mapProviderFailure(result.value);
  }
  if (result.outcome === "rate_or_budget_limited") {
    return {
      ok: false,
      outcome: "rate_or_budget_limited",
      limitDetails: { limitReason: result.limitReason, retryAt: result.retryAt, resetAt: result.resetAt } satisfies GenerationLimitDetails,
    };
  }
  return { ok: false, outcome: result.outcome as ProposalCompletionOutcome };
}

function mapProviderFailure(result: Extract<HostedProviderResult, { ok: false }>): ProposalCompletionResult {
  return {
    ok: false,
    outcome: result.outcome,
    ...(result.outcome === "rate_or_budget_limited"
      ? { limitDetails: { limitReason: "provider", retryAt: null, resetAt: null } }
      : {}),
  };
}

function isAmbiguousProviderResult(result: HostedProviderResult): boolean {
  if (result.ok) return false;
  if (result.outcome === "timeout" || result.outcome === "cancelled") return true;
  return result.outcome === "unavailable" && result.failureSource !== "http_response";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
