import "server-only";
import { authConfig } from "../auth/request-security";
import type { SoCConfig } from "../ai/soclaas-config";
import { readStudentSoCConfig } from "./provider-config";
import { readRuntimeDatabaseConfig } from "../config/environment";

export const PREVIEW_APPROVAL = "wp006-preview-20261022-200";
export const PRODUCTION_APPROVAL = "wp006-production-20261022-200";
export type HostedEnvironment = "preview" | "production";
export function hostedApproval(environment: HostedEnvironment) {
  return environment === "production" ? PRODUCTION_APPROVAL : PREVIEW_APPROVAL;
}
export const HOSTED_LIMITS = Object.freeze({ attempts: 200, outputBudget: 200_000, outputTokens: 1000,
  inputBytes: 65_536, timeoutMs: 20_000, spacingMs: 10_000, leaseMs: 60_000, perUser: 20 });

/** Each hosted environment needs explicit enablement and its own durable approval. */
export function hostedPolicy(env: Record<string, string | undefined> = process.env): { origin: string; config: SoCConfig; environment: HostedEnvironment } | null {
  const environment = env.TURNUP_ENVIRONMENT;
  if (env.STUDENT_ASSISTANT_ENABLED !== "true" || env.VERCEL !== "1"
    || (environment !== "preview" && environment !== "production") || env.VERCEL_ENV !== environment
    || env.DATABASE_ENVIRONMENT !== (environment === "production" ? "production" : "non-production")) return null;
  try {
    readRuntimeDatabaseConfig(env);
    const auth = authConfig(env), soc = readStudentSoCConfig(env);
    if (auth.sourceMode !== "vercel" || !soc.ok || soc.config.model !== "qwen3.8:27b") return null;
    return { origin: auth.origin, environment, config: { ...soc.config,
      maxInputBytes: Math.min(soc.config.maxInputBytes, HOSTED_LIMITS.inputBytes),
      maxOutputTokens: Math.min(soc.config.maxOutputTokens, HOSTED_LIMITS.outputTokens),
      timeoutMs: Math.min(soc.config.timeoutMs, HOSTED_LIMITS.timeoutMs) } };
  } catch { return null; }
}
