export const DAILY_GENERATION_TIME_ZONE = "Asia/Singapore" as const;
export const DAILY_GENERATION_ATTEMPT_LIMIT = 10 as const;
export const DAILY_GENERATION_TOKENS_PER_ATTEMPT = 4_096 as const;
export const DAILY_GENERATION_TOKEN_LIMIT = 40_960 as const;
export const DAILY_GENERATION_MIN_INTERVAL_MS = 2_100 as const;

export type GenerationUsageEnvironment = "preview" | "production";

export type GenerationLimitReason =
  | "daily_attempts"
  | "daily_tokens"
  | "environment_busy"
  | "spacing"
  | "provider";

export type GenerationLimitDetails = {
  limitReason: GenerationLimitReason;
  retryAt: string | null;
  resetAt: string | null;
};

export type GenerationUsageSnapshot = {
  environment: GenerationUsageEnvironment;
  timeZone: typeof DAILY_GENERATION_TIME_ZONE;
  day: string;
  resetAt: string;
  attempts: {
    limit: typeof DAILY_GENERATION_ATTEMPT_LIMIT;
    used: number;
    remaining: number;
  };
  outputTokens: {
    perRequest: typeof DAILY_GENERATION_TOKENS_PER_ATTEMPT;
    limit: typeof DAILY_GENERATION_TOKEN_LIMIT;
    reserved: number;
    remaining: number;
  };
  inFlight: boolean;
  nextAllowedAt: string | null;
};

export type GenerationUsageResponse =
  | { ok: true; status: "active"; usage: GenerationUsageSnapshot }
  | {
      ok: true;
      status: "disabled";
      reason: "hosted_generation_disabled" | "unsupported_environment";
      usage: null;
    }
  | { ok: false; outcome: "unauthenticated" | "forbidden" | "unavailable" };

export type GenerationRateLimitResponse = {
  ok: false;
  outcome: "rate_or_budget_limited";
} & GenerationLimitDetails;
