import "server-only";

import { hostedDailyGenerationEnabled } from "./daily-generation-config";

export type SoCConfigFailure = "not_configured" | "invalid_configuration";

export interface SoCConfig {
  apiKey: string;
  model: string;
  maxInputBytes: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export type SoCConfigResult =
  | { ok: true; config: SoCConfig }
  | { ok: false; outcome: SoCConfigFailure };

export type SoCEnvironment = Record<string, string | undefined>;

/** Timeout exceptions are available only to the named, explicitly enabled profiles. */
export type SoCConfigTimeoutScope = "local-synthetic-proposal" | "hosted-daily-proposal";

export interface SoCConfigOptions {
  timeoutScope?: SoCConfigTimeoutScope;
}

export const LOCAL_SYNTHETIC_PROPOSAL_MODEL = "qwen3.5:9b";
export const HOSTED_ORGANISER_PROPOSAL_MODEL = "qwen3.5:9b";

const expectedBaseUrl = "https://soclaas-api.comp.nus.edu.sg/v1";
const maxInputByteLimit = 65_536;
const maxOutputTokenLimit = 4_096;
const sharedMaxTimeoutMs = 30_000;
const localSyntheticProposalMaxTimeoutMs = 60_000;
const hostedProposalMaxTimeoutMs = 60_000;

/** Read server-only settings; no defaults silently select a model or budget. */
export function readSoCConfig(env: SoCEnvironment, options: SoCConfigOptions = {}): SoCConfigResult {
  const configEnv = options.timeoutScope === "hosted-daily-proposal"
    ? normalizeHostedSoCEnvironment(env)
    : env;
  const required = [
    configEnv.SOCLAAS_API_KEY,
    configEnv.SOCLAAS_BASE_URL,
    configEnv.SOCLAAS_MODEL,
    configEnv.SOCLAAS_MAX_INPUT_BYTES,
    configEnv.SOCLAAS_MAX_OUTPUT_TOKENS,
    configEnv.SOCLAAS_TIMEOUT_MS,
  ];

  if (required.some((value) => value === undefined || value === "")) {
    return { ok: false, outcome: "not_configured" };
  }

  const [apiKeyValue, baseUrl, model, inputBytesValue, outputTokensValue, timeoutMsValue] = required;
  const apiKey = apiKeyValue?.trim();
  const maxInputBytes = parsePositiveInteger(inputBytesValue);
  const maxOutputTokens = parsePositiveInteger(outputTokensValue);
  const timeoutMs = parsePositiveInteger(timeoutMsValue);
  const timeoutLimitMs = getTimeoutLimit(options.timeoutScope, env);

  if (
    !apiKey ||
    !/^[\x21-\x7e]+$/.test(apiKey) ||
    baseUrl !== expectedBaseUrl ||
    !model ||
    model.length > 256 ||
    !/^[A-Za-z0-9._:/-]+$/.test(model) ||
    maxInputBytes === undefined ||
    maxInputBytes > maxInputByteLimit ||
    maxOutputTokens === undefined ||
    maxOutputTokens > maxOutputTokenLimit ||
    timeoutMs === undefined ||
    timeoutMs > timeoutLimitMs
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  return {
    ok: true,
    config: { apiKey, model, maxInputBytes, maxOutputTokens, timeoutMs },
  };
}

/**
 * Hosted proposal generation has an isolated credential/profile namespace.
 * Missing hosted keys stay missing even when local/probe SOCLAAS_* values exist.
 */
function normalizeHostedSoCEnvironment(env: SoCEnvironment): SoCEnvironment {
  return {
    ...env,
    SOCLAAS_API_KEY: env.ORGANISER_SOCLAAS_API_KEY,
    SOCLAAS_BASE_URL: env.ORGANISER_SOCLAAS_BASE_URL,
    SOCLAAS_MODEL: env.ORGANISER_SOCLAAS_MODEL,
    SOCLAAS_MAX_INPUT_BYTES: env.ORGANISER_SOCLAAS_MAX_INPUT_BYTES,
    SOCLAAS_MAX_OUTPUT_TOKENS: env.ORGANISER_SOCLAAS_MAX_OUTPUT_TOKENS,
    SOCLAAS_TIMEOUT_MS: env.ORGANISER_SOCLAAS_TIMEOUT_MS,
  };
}

function getTimeoutLimit(scope: SoCConfigTimeoutScope | undefined, env: SoCEnvironment): number {
  if (
    scope === "local-synthetic-proposal" &&
    isLocalSyntheticProposalAssistanceEnabled(env) &&
    isLocalSyntheticProposalAssistanceEnabled(process.env)
  ) {
    return localSyntheticProposalMaxTimeoutMs;
  }
  if (
    scope === "hosted-daily-proposal" &&
    hostedDailyGenerationEnabled(env) &&
    hostedDailyGenerationEnabled(process.env)
  ) {
    return hostedProposalMaxTimeoutMs;
  }
  return sharedMaxTimeoutMs;
}

export function isLocalDevelopmentEnvironment(env: SoCEnvironment): boolean {
  return (
    env.TURNUP_ENVIRONMENT === "development" &&
    env.NODE_ENV === "development" &&
    env.DATABASE_ENVIRONMENT === "non-production" &&
    (env.VERCEL_ENV === undefined || env.VERCEL_ENV === "development")
  );
}

/**
 * Proposal extraction is deliberately available only for a local synthetic
 * exercise. Both the caller's view and the real process environment must opt
 * in, so an injected test/config object cannot enable a hosted process.
 */
export function isLocalSyntheticProposalAssistanceEnabled(env: SoCEnvironment): boolean {
  return isLocalDevelopmentEnvironment(env) && env.PROPOSAL_ASSISTANCE_LOCAL_SYNTHETIC === "true";
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
