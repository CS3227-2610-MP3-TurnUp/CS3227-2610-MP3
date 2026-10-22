import "server-only";
import { authConfig } from "../auth/request-security";
import { readSoCConfig, type SoCConfig } from "../ai/soclaas-config";
import { readRuntimeDatabaseConfig } from "../config/environment";

export const PREVIEW_APPROVAL = "wp006-preview-20261022-200";
export const HOSTED_LIMITS = Object.freeze({ attempts: 200, outputBudget: 200_000, outputTokens: 1000,
  inputBytes: 65_536, timeoutMs: 20_000, spacingMs: 10_000, leaseMs: 60_000, perUser: 5 });

/** Production has no implicit enablement or fallback to the local allowance. */
export function hostedPolicy(env: Record<string, string | undefined> = process.env): { origin: string; config: SoCConfig } | null {
  if (env.STUDENT_ASSISTANT_ENABLED !== "true" || env.VERCEL !== "1" || env.VERCEL_ENV !== "preview"
    || env.TURNUP_ENVIRONMENT !== "preview" || env.DATABASE_ENVIRONMENT !== "non-production") return null;
  try {
    readRuntimeDatabaseConfig(env);
    const auth = authConfig(env), soc = readSoCConfig(env);
    if (auth.sourceMode !== "vercel" || !soc.ok || soc.config.model !== "qwen3.8:27b") return null;
    return { origin: auth.origin, config: { ...soc.config,
      maxInputBytes: Math.min(soc.config.maxInputBytes, HOSTED_LIMITS.inputBytes),
      maxOutputTokens: Math.min(soc.config.maxOutputTokens, HOSTED_LIMITS.outputTokens),
      timeoutMs: Math.min(soc.config.timeoutMs, HOSTED_LIMITS.timeoutMs) } };
  } catch { return null; }
}
