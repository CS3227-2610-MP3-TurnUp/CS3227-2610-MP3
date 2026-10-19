import "server-only";

export interface SoCProbeLimits {
  maxAttempts: number;
  maxInFlight: number;
  minIntervalMs: number;
  outputTokenBudget: number;
}

export type SoCProbeConfigFailure = "not_configured" | "invalid_configuration";

export type SoCProbeConfigResult =
  | { ok: true; limits: SoCProbeLimits }
  | { ok: false; outcome: SoCProbeConfigFailure };

export type SoCProbeEnvironment = Record<string, string | undefined>;

/** Read explicit shared-preview limits; no limit is silently selected by the application. */
export function readSoCProbeLimits(
  env: SoCProbeEnvironment,
): SoCProbeConfigResult {
  const rawValues = [
    env.FOUNDATION_PROBE_SOC_MAX_ATTEMPTS,
    env.FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT,
    env.FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS,
    env.FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET,
  ];

  if (rawValues.some((value) => value === undefined || value === "")) {
    return { ok: false, outcome: "not_configured" };
  }

  const [maxAttempts, maxInFlight, minIntervalMs, outputTokenBudget] = rawValues.map(parsePositiveInteger);
  if (
    maxAttempts === undefined ||
    maxInFlight === undefined ||
    minIntervalMs === undefined ||
    outputTokenBudget === undefined
  ) {
    return { ok: false, outcome: "invalid_configuration" };
  }

  return {
    ok: true,
    limits: { maxAttempts, maxInFlight, minIntervalMs, outputTokenBudget },
  };
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
