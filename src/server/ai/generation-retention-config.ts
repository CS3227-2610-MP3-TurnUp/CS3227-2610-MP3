import "server-only";

import type { EnvironmentSource } from "../config/environment";
import { readDailyGenerationEnvironment } from "./daily-generation-config";

/** This maintenance endpoint only sweeps validated hosted accounting environments. */
export function generationUsageRetentionJobEnabled(env: EnvironmentSource = process.env): boolean {
  if (env.GENERATION_USAGE_RETENTION_ENABLED !== "true") return false;
  return readDailyGenerationEnvironment(env).status === "supported";
}
