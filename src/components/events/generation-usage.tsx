"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DAILY_GENERATION_ATTEMPT_LIMIT,
  DAILY_GENERATION_TOKEN_LIMIT,
  DAILY_GENERATION_TOKENS_PER_ATTEMPT,
  DAILY_GENERATION_TIME_ZONE,
  type GenerationRateLimitResponse,
  type GenerationUsageResponse,
  type GenerationUsageSnapshot,
} from "../../lib/generation-usage";

const USAGE_REQUEST_TIMEOUT_MS = 5_000;

export type GenerationUsageState = {
  loading: boolean;
  response: GenerationUsageResponse | null;
};

export function useGenerationUsage(enabled: boolean): GenerationUsageState & {
  refresh: () => Promise<GenerationUsageResponse | null>;
} {
  const [response, setResponse] = useState<GenerationUsageResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const requestRevision = useRef(0);

  const fetchUsage = useCallback(async () => {
    const requestId = ++requestRevision.current;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let next: GenerationUsageResponse | null = null;
    try {
      const usageRequest = (async (): Promise<GenerationUsageResponse | null> => {
        const result = await fetch("/api/organiser/ai-usage", { cache: "no-store", signal: controller.signal });
        const payload: unknown = await result.json();
        return result.ok && isGenerationUsageResponse(payload) ? payload : null;
      })();
      const timeout = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          resolve(null);
        }, USAGE_REQUEST_TIMEOUT_MS);
      });
      next = await Promise.race([usageRequest, timeout]);
    } catch {
      // Usage display is advisory; generation remains governed by the server.
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
    if (requestRevision.current === requestId) {
      setResponse(next);
      setLoading(false);
    }
    return next;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    return fetchUsage();
  }, [fetchUsage]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const timerId = setTimeout(() => {
      if (!active) return;
      setLoading(true);
      void fetchUsage();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [enabled, fetchUsage]);

  useEffect(() => () => {
    requestRevision.current += 1;
  }, []);

  return { loading, response, refresh };
}

export function GenerationUsageIndicator({ state }: { state: GenerationUsageState }) {
  if (state.loading && !state.response) {
    return <p className="field-help generation-usage-summary" role="status">Checking the daily generation allowance…</p>;
  }
  if (!state.response) {
    return <p className="field-help generation-usage-summary" role="status">Daily generation usage is temporarily unavailable. Server limits still apply.</p>;
  }
  if (!state.response.ok) {
    return <p className="field-help generation-usage-summary" role="status">Daily generation usage is temporarily unavailable. Server limits still apply.</p>;
  }
  if (state.response.status === "disabled") {
    return <p className="field-help generation-usage-summary" role="status">
      {state.response.reason === "unsupported_environment"
        ? "Local synthetic generation uses separate limits; the hosted daily allowance is not shown here."
        : "Hosted AI generation is currently disabled in this environment."}
    </p>;
  }

  const usage = state.response.usage;
  const environmentLabel = usage.environment === "preview" ? "Preview" : "Production";
  return <p className="field-help generation-usage-summary" role="status" aria-live="polite">
    Your {environmentLabel} daily allowance has {usage.attempts.remaining} of {usage.attempts.limit} generation attempts and {usage.outputTokens.remaining.toLocaleString()} of {usage.outputTokens.limit.toLocaleString()} reserved output tokens remaining. It is shared by PDF extraction and FAQ suggestions, and resets at {formatSgt(usage.resetAt)} SGT.
    {state.loading && " Updating…"}
  </p>;
}

export function generationLimitMessage(
  limitReason: unknown,
  retryAt: unknown,
  resetAt: unknown,
  usageResponse: GenerationUsageResponse | null,
): string {
  const effectiveResetAt = validIso(resetAt) ?? activeUsage(usageResponse)?.resetAt;
  if (limitReason === "daily_attempts") {
    return `You have used today's ${DAILY_GENERATION_ATTEMPT_LIMIT} generation attempts. The allowance resets at ${effectiveResetAt ? formatSgt(effectiveResetAt) + " SGT" : "the next Singapore day"}.`;
  }
  if (limitReason === "daily_tokens") {
    return `You have used today's reserved output-token allowance. It resets at ${effectiveResetAt ? formatSgt(effectiveResetAt) + " SGT" : "the next Singapore day"}.`;
  }
  if (limitReason === "environment_busy") {
    return "A generation request is already in progress for this environment. Try again after it finishes.";
  }
  if (limitReason === "spacing") {
    const nextTime = validIso(retryAt) ?? activeUsage(usageResponse)?.nextAllowedAt ?? null;
    return nextTime
      ? `Generations are briefly spaced to protect service availability. Try again at ${formatSgt(nextTime)} SGT.`
      : "Generations are briefly spaced to protect service availability. Try again shortly.";
  }
  if (limitReason === "provider") {
    return "The model provider is rate limiting requests. Try again later.";
  }
  return "Proposal assistance is temporarily limited. Try again after the current limit expires.";
}

export function isGenerationRateLimitResponse(value: unknown): value is GenerationRateLimitResponse {
  if (typeof value !== "object" || value === null) return false;
  const response = value as Record<string, unknown>;
  const reasons = ["daily_attempts", "daily_tokens", "environment_busy", "spacing", "provider"];
  return response.ok === false && response.outcome === "rate_or_budget_limited" &&
    typeof response.limitReason === "string" && reasons.includes(response.limitReason) &&
    (response.retryAt === null || validIso(response.retryAt) !== null) &&
    (response.resetAt === null || validIso(response.resetAt) !== null);
}

export function activeUsage(response: GenerationUsageResponse | null): GenerationUsageSnapshot | null {
  return response?.ok && response.status === "active" ? response.usage : null;
}

function isGenerationUsageResponse(value: unknown): value is GenerationUsageResponse {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  const response = value as Record<string, unknown>;
  if (response.ok === false) {
    return response.outcome === "unauthenticated" || response.outcome === "forbidden" || response.outcome === "unavailable";
  }
  if (response.ok !== true) return false;
  if (response.status === "disabled") {
    return response.usage === null && (response.reason === "unsupported_environment" || response.reason === "hosted_generation_disabled");
  }
  if (response.status !== "active" || typeof response.usage !== "object" || response.usage === null) return false;
  const usage = response.usage as Record<string, unknown>;
  const attempts = usage.attempts;
  const outputTokens = usage.outputTokens;
  return usage.environment === "preview" || usage.environment === "production"
    ? validIso(usage.resetAt) !== null && usage.timeZone === DAILY_GENERATION_TIME_ZONE && typeof usage.day === "string" &&
      typeof usage.inFlight === "boolean" && (usage.nextAllowedAt === null || typeof usage.nextAllowedAt === "string") &&
      isUsageCounter(attempts, DAILY_GENERATION_ATTEMPT_LIMIT, "used") && isUsageCounter(outputTokens, DAILY_GENERATION_TOKEN_LIMIT, "reserved") &&
      typeof outputTokens === "object" && outputTokens !== null &&
      (outputTokens as Record<string, unknown>).perRequest === DAILY_GENERATION_TOKENS_PER_ATTEMPT
    : false;
}

function isUsageCounter(value: unknown, limit: number, totalKey: "used" | "reserved"): boolean {
  if (typeof value !== "object" || value === null) return false;
  const counter = value as Record<string, unknown>;
  const total = counter[totalKey];
  const remaining = counter.remaining;
  return counter.limit === limit && Number.isInteger(total) && Number(total) >= 0 && Number(total) <= limit &&
    Number.isInteger(remaining) && Number(remaining) >= 0 && Number(remaining) <= limit && Number(total) + Number(remaining) === limit;
}

function validIso(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function formatSgt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "the next Singapore day";
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DAILY_GENERATION_TIME_ZONE,
  }).format(date);
}
