import "server-only";

import { DAILY_GENERATION_TOKENS_PER_ATTEMPT } from "../../lib/generation-usage";
import { hostedDailyGenerationEnabled } from "./daily-generation-config";
import type { HostedGenerationAdapter, HostedProviderResult } from "./daily-generation-coordinator";
import {
  HOSTED_ORGANISER_PROPOSAL_MODEL,
  readSoCConfig,
  type SoCConfig,
  type SoCEnvironment,
} from "./soclaas-config";
import {
  requestSoCCompletion,
  type FetchLike,
  type SoCDispatch,
  type SoCOutcome,
} from "./soclaas-client";

const profile = "hosted_organiser_proposal_json_v1" as const;
const maxInputBytes = 65_536;
const outputTokens = 4_096;
const timeoutMs = 60_000;

/**
 * The sole hosted proposal profile. Environment and fetch are injectable only
 * for server-side tests; request input cannot select a model or provider mode.
 */
export function createHostedProposalAdapter(
  env: SoCEnvironment = process.env,
  fetchImpl?: FetchLike,
): HostedGenerationAdapter {
  const availability = () => readHostedProfile(env);

  return {
    availability() {
      const ready = availability();
      return ready.ok
        ? { available: true, maxInputBytes, outputTokens: DAILY_GENERATION_TOKENS_PER_ATTEMPT }
        : { available: false, outcome: ready.outcome };
    },

    async complete(input, dispatch: SoCDispatch): Promise<HostedProviderResult> {
      const ready = availability();
      if (!ready.ok) return { ok: false, outcome: ready.outcome };

      const result = await requestSoCCompletion(input, {
        env,
        ...(fetchImpl ? { fetchImpl } : {}),
        profile,
        dispatch,
      });
      return result.ok
        ? {
            ok: true,
            text: result.text,
            ...(result.finishReason ? { finishReason: result.finishReason } : {}),
          }
        : toHostedFailure(result.outcome, "failureSource" in result ? result.failureSource : undefined);
    },
  };
}

function readHostedProfile(env: SoCEnvironment):
  | { ok: true; config: SoCConfig }
  | { ok: false; outcome: "not_configured" | "invalid_configuration" } {
  if (!hostedDailyGenerationEnabled(env) || !hostedDailyGenerationEnabled(process.env)) {
    return { ok: false, outcome: "not_configured" };
  }

  if (
    env.ORGANISER_SOCLAAS_MODEL !== HOSTED_ORGANISER_PROPOSAL_MODEL ||
    process.env.ORGANISER_SOCLAAS_MODEL !== HOSTED_ORGANISER_PROPOSAL_MODEL
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  const result = readSoCConfig(env, { timeoutScope: "hosted-daily-proposal" });
  if (!result.ok) return result;
  const config = result.config;
  const runtimeResult = readSoCConfig(process.env, { timeoutScope: "hosted-daily-proposal" });
  if (!runtimeResult.ok) return runtimeResult;
  const runtimeConfig = runtimeResult.config;
  if (
    config.model !== HOSTED_ORGANISER_PROPOSAL_MODEL ||
    config.maxInputBytes !== maxInputBytes ||
    config.maxOutputTokens !== outputTokens ||
    config.timeoutMs !== timeoutMs ||
    runtimeConfig.model !== HOSTED_ORGANISER_PROPOSAL_MODEL ||
    runtimeConfig.maxInputBytes !== maxInputBytes ||
    runtimeConfig.maxOutputTokens !== outputTokens ||
    runtimeConfig.timeoutMs !== timeoutMs
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }
  return { ok: true, config };
}

function toHostedFailure(
  outcome: SoCOutcome,
  failureSource?: "http_response" | "transport",
): Extract<HostedProviderResult, { ok: false }> {
  if (outcome === "bad_request") {
    return { ok: false, outcome: "invalid_configuration" };
  }
  return {
    ok: false,
    outcome,
    ...(outcome === "unavailable" && failureSource ? { failureSource } : {}),
  };
}
