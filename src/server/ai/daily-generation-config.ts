import "server-only";

import { readRuntimeDatabaseConfig, type EnvironmentSource } from "../config/environment";
import type { GenerationUsageEnvironment } from "../../lib/generation-usage";

export type DailyGenerationEnvironmentResult =
  | { status: "supported"; environment: GenerationUsageEnvironment }
  | { status: "unsupported_local" }
  | { status: "invalid" };

/** The hosted policy is deliberately code-disabled; there is no environment-variable activation path. */
export const HOSTED_DAILY_GENERATION_ENABLED = false as const;

export function readDailyGenerationEnvironment(env: EnvironmentSource): DailyGenerationEnvironmentResult {
  const local = env.TURNUP_ENVIRONMENT === "development" &&
    env.DATABASE_ENVIRONMENT === "non-production" &&
    env.NODE_ENV === "development" &&
    env.VERCEL !== "1" &&
    (env.VERCEL_ENV === undefined || env.VERCEL_ENV === "development");
  if (local) return { status: "unsupported_local" };

  const preview = env.TURNUP_ENVIRONMENT === "preview" &&
    env.DATABASE_ENVIRONMENT === "non-production" &&
    env.VERCEL_ENV === "preview" &&
    env.VERCEL === "1" &&
    env.NODE_ENV === "production";
  const production = env.TURNUP_ENVIRONMENT === "production" &&
    env.DATABASE_ENVIRONMENT === "production" &&
    env.VERCEL_ENV === "production" &&
    env.VERCEL === "1" &&
    env.NODE_ENV === "production";
  if (!preview && !production) return { status: "invalid" };

  try {
    // Validate the actual runtime Neon URL and documented environment pair
    // without returning or logging any URL or credential material.
    const database = readRuntimeDatabaseConfig(env);
    if (preview && database.databaseEnvironment === "non-production" && database.turnupEnvironment === "preview") {
      return { status: "supported", environment: "preview" };
    }
    if (production && database.databaseEnvironment === "production" && database.turnupEnvironment === "production") {
      return { status: "supported", environment: "production" };
    }
  } catch {
    // Environment and database misconfiguration fail closed without disclosure.
  }
  return { status: "invalid" };
}
