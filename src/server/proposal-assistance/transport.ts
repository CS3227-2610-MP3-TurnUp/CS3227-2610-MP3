import "server-only";

import {
  requestSoCCompletion,
  type SoCResult,
} from "../ai/soclaas-client";
import {
  isLocalSyntheticProposalAssistanceEnabled,
  LOCAL_SYNTHETIC_PROPOSAL_MODEL,
  readSoCConfig,
  type SoCConfig,
  type SoCEnvironment,
} from "../ai/soclaas-config";
import { readSoCProbeLimits, type SoCProbeLimits } from "../ai/soclaas-probe-config";
import { readDailyGenerationEnvironment } from "../ai/daily-generation-config";
import { hostedGenerationAvailability, requestHostedDailyCompletion } from "../ai/daily-generation-coordinator";
import type { GenerationLimitDetails } from "../../lib/generation-usage";

export type ProposalCompletionOutcome =
  | "disabled"
  | "not_configured"
  | "invalid_configuration"
  | "input_too_large"
  | "unauthenticated"
  | "forbidden"
  | "rate_or_budget_limited"
  | "unavailable"
  | "timeout"
  | "cancelled"
  | "invalid_response";

export type ProposalCompletionResult =
  | { ok: true; text: string; finishReason?: "stop" | "length" | "other" }
  | { ok: false; outcome: ProposalCompletionOutcome; limitDetails?: GenerationLimitDetails };

export type ProposalCompletionAvailability =
  | { available: true }
  | { available: false; outcome: ProposalCompletionOutcome };

export interface ProposalCompletionInput {
  system: string;
  user: string;
  /** Stable owner identity supplied only by an authenticated server route. */
  ownerId: string;
  signal?: AbortSignal;
}

interface ReadySettings {
  env: SoCEnvironment;
  config: SoCConfig;
  limits: SoCProbeLimits;
}

type SettingsResult =
  | { ok: true; settings: ReadySettings }
  | { ok: false; outcome: ProposalCompletionOutcome };

type SoCProbeGateModule = typeof import("../db/soc-probe-gate");
let socProbeGateModule: Promise<SoCProbeGateModule> | undefined;

const profile = "local_synthetic_proposal_json_v1" as const;
const selectedInputBytes = 65_536;
const selectedOutputTokens = 4_096;
const selectedTimeoutMs = 60_000;
// Preserve the prototype's conservative local guard (one request per 2.1s),
// without claiming that this is a provider-stated spacing requirement.
const minimumRateGuardIntervalMs = 2_100;

/**
 * Synchronous preflight for the authenticated endpoint. Call before buffering
 * or parsing an uploaded PDF so missing/unsafe provider configuration fails
 * without retaining proposal bytes.
 */
export function proposalCompletionAvailability(): ProposalCompletionAvailability {
  const dailyEnvironment = readDailyGenerationEnvironment(process.env);
  if (dailyEnvironment.status === "supported") {
    const hosted = hostedGenerationAvailability();
    return hosted.available
      ? { available: true }
      : { available: false, outcome: hosted.outcome };
  }
  if (dailyEnvironment.status === "invalid" && process.env.TURNUP_ENVIRONMENT !== "development") {
    return { available: false, outcome: "invalid_configuration" };
  }
  const result = readReadySettings(process.env);
  return result.ok ? { available: true } : { available: false, outcome: result.outcome };
}

/**
 * Perform one bounded local synthetic completion after durable shared budget
 * admission. No caller model, provider host, key, response profile, or token
 * cap is accepted. Provider bodies and exception messages are never returned
 * or logged.
 */
export async function requestProposalCompletion(input: ProposalCompletionInput): Promise<ProposalCompletionResult> {
  if (!isCompletionInput(input)) return { ok: false, outcome: "invalid_configuration" };

  const dailyEnvironment = readDailyGenerationEnvironment(process.env);
  if (dailyEnvironment.status === "supported") {
    // Delegates through daily accounting, which remains hard-disabled until a
    // later reviewed hosted provider profile is supplied.
    return requestHostedDailyCompletion(input);
  }
  if (dailyEnvironment.status === "invalid" && process.env.TURNUP_ENVIRONMENT !== "development") {
    return { ok: false, outcome: "invalid_configuration" };
  }

  const settingsResult = readReadySettings(process.env);
  if (!settingsResult.ok) return { ok: false, outcome: settingsResult.outcome };
  const { env, config, limits } = settingsResult.settings;

  const inputBytes =
    new TextEncoder().encode(input.system).byteLength + new TextEncoder().encode(input.user).byteLength;
  if (inputBytes > config.maxInputBytes) return { ok: false, outcome: "input_too_large" };
  if (input.signal?.aborted) return { ok: false, outcome: "cancelled" };

  let gate: SoCProbeGateModule;
  try {
    gate = await loadSoCProbeGate();
  } catch {
    return { ok: false, outcome: "unavailable" };
  }

  let admission: Awaited<ReturnType<typeof gate.admitSoCProbe>>;
  try {
    admission = await gate.admitSoCProbe(limits, config.maxOutputTokens);
  } catch {
    return { ok: false, outcome: "unavailable" };
  }
  if (admission.status === "limited") return { ok: false, outcome: "rate_or_budget_limited" };

  // Admission may wait for a database transaction. Release an unused lease if
  // the HTTP request was cancelled while waiting, before dispatching inference.
  if (input.signal?.aborted) {
    return (await releaseReservation(gate, admission.reservationId))
      ? { ok: false, outcome: "cancelled" }
      : { ok: false, outcome: "unavailable" };
  }

  let result: SoCResult;
  let requestThrew = false;
  try {
    result = await requestSoCCompletion(input, { env, profile });
  } catch {
    // A throw does not establish whether the provider completed this request.
    requestThrew = true;
    result = { ok: false, outcome: "unavailable", failureSource: "transport" };
  }

  if (requestThrew || isUncertainProviderFailure(result)) {
    // Keep the in-flight lease after timeout/cancellation/transport ambiguity;
    // an operator must inspect and recover the durable gate before retrying.
    return safeResult(result);
  }

  if (!(await releaseReservation(gate, admission.reservationId))) {
    return { ok: false, outcome: "unavailable" };
  }
  return safeResult(result);
}

function readReadySettings(env: SoCEnvironment): SettingsResult {
  if (
    !isLocalSyntheticProposalAssistanceEnabled(env) ||
    !isLocalSyntheticProposalAssistanceEnabled(process.env)
  ) {
    return { ok: false, outcome: "disabled" };
  }

  const configResult = readSoCConfig(env, { timeoutScope: "local-synthetic-proposal" });
  if (!configResult.ok) return configResult;
  const { config } = configResult;
  if (
    config.model !== LOCAL_SYNTHETIC_PROPOSAL_MODEL ||
    config.maxInputBytes !== selectedInputBytes ||
    config.maxOutputTokens !== selectedOutputTokens ||
    config.timeoutMs !== selectedTimeoutMs
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  const limitResult = readSoCProbeLimits(env);
  if (!limitResult.ok) return limitResult;
  if (
    limitResult.limits.maxInFlight !== 1 ||
    limitResult.limits.minIntervalMs < minimumRateGuardIntervalMs ||
    limitResult.limits.outputTokenBudget < selectedOutputTokens
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  return { ok: true, settings: { env, config, limits: limitResult.limits } };
}

function loadSoCProbeGate(): Promise<SoCProbeGateModule> {
  socProbeGateModule ??= import("../db/soc-probe-gate");
  return socProbeGateModule;
}

async function releaseReservation(gate: SoCProbeGateModule, reservationId: string): Promise<boolean> {
  try {
    await gate.releaseSoCProbe(reservationId);
    return true;
  } catch {
    return false;
  }
}

function isCompletionInput(value: unknown): value is ProposalCompletionInput {
  return (
    typeof value === "object" &&
    value !== null &&
    "system" in value &&
    typeof value.system === "string" &&
    "user" in value &&
    typeof value.user === "string" &&
    "ownerId" in value &&
    typeof value.ownerId === "string" &&
    isUuid(value.ownerId) &&
    (! ("signal" in value) || value.signal === undefined || value.signal instanceof AbortSignal)
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUncertainProviderFailure(result: SoCResult): boolean {
  return !result.ok && (
    result.outcome === "timeout" ||
    result.outcome === "cancelled" ||
    (result.outcome === "unavailable" && result.failureSource === "transport")
  );
}

function safeResult(result: SoCResult): ProposalCompletionResult {
  if (result.ok) {
    return {
      ok: true,
      text: result.text,
      ...(result.finishReason ? { finishReason: result.finishReason } : {}),
    };
  }

  return {
    ok: false,
    outcome: result.outcome === "bad_request" ? "invalid_configuration" : result.outcome,
    ...(result.outcome === "rate_or_budget_limited"
      ? { limitDetails: { limitReason: "provider", retryAt: null, resetAt: null } }
      : {}),
  };
}
