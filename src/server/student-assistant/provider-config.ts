import "server-only";
import { readSoCConfig, type SoCEnvironment, type SoCConfigResult } from "../ai/soclaas-config";

/** Student credentials are explicit. Never fall back to the Organiser/shared key. */
export function readStudentSoCConfig(env: SoCEnvironment = process.env): SoCConfigResult {
  return readSoCConfig({ ...env, SOCLAAS_API_KEY: env.STUDENT_SOCLAAS_API_KEY });
}
