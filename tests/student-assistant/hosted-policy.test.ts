import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { hostedPolicy, HOSTED_LIMITS } from "../../src/server/student-assistant/hosted-policy";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const helper = await import(/* @vite-ignore */ pathToFileURL(resolve("scripts/activate-student-ai-budget.mjs")).href);
const env = { STUDENT_ASSISTANT_ENABLED: "true", VERCEL: "1", VERCEL_ENV: "preview", TURNUP_ENVIRONMENT: "preview", DATABASE_ENVIRONMENT: "non-production",
  AUTH_ORIGIN: "https://preview.example.test", AUTH_SOURCE_MODE: "vercel", AUTH_THROTTLE_SECRET: "1".repeat(64),
  SOCLAAS_API_KEY: "synthetic-key", SOCLAAS_MODEL: "qwen3.8:27b", SOCLAAS_BASE_URL: "https://soclaas-api.comp.nus.edu.sg/v1",
  SOCLAAS_MAX_INPUT_BYTES: "65536", SOCLAAS_MAX_OUTPUT_TOKENS: "4096", SOCLAAS_TIMEOUT_MS: "30000" };
afterEach(() => vi.unstubAllEnvs());
it("explicit Preview policy caps existing config without selecting a new model or leaking a key", () => {
  expect(HOSTED_LIMITS.attempts).toBe(200); expect(HOSTED_LIMITS.outputBudget).toBe(200000);
  const result = hostedPolicy(env)!; expect(result.origin).toBe(env.AUTH_ORIGIN);
  expect(result.config).toMatchObject({ model: "qwen3.8:27b", maxOutputTokens: 1000, timeoutMs: 20000 });
  expect(hostedPolicy({ ...env, SOCLAAS_MAX_OUTPUT_TOKENS: "500", SOCLAAS_TIMEOUT_MS: "10000" })?.config).toMatchObject({ maxOutputTokens: 500, timeoutMs: 10000 });
});
it.each([["STUDENT_ASSISTANT_ENABLED", "false"], ["VERCEL", ""], ["VERCEL_ENV", "production"], ["TURNUP_ENVIRONMENT", "production"],
  ["DATABASE_ENVIRONMENT", "production"], ["AUTH_SOURCE_MODE", "local"], ["AUTH_ORIGIN", "http://preview.example.test"],
  ["SOCLAAS_MODEL", "other-model"], ["SOCLAAS_API_KEY", ""], ["SOCLAAS_BASE_URL", "https://evil.test"]])("fails closed for %s", (key, value) => {
  expect(hostedPolicy({ ...env, [key]: value })).toBeNull();
});
it("activation accepts only the assigned Preview environment and model", () => {
  const values = { ...env, DATABASE_URL: "postgresql://fixture:fixture@ep-fixture-pooler.region.neon.tech/fixture?sslmode=require" };
  expect(helper.activationConfig(values, "preview").model).toBe(env.SOCLAAS_MODEL);
  expect(() => helper.activationConfig(values, "production")).toThrow("preview_target_required");
  expect(() => helper.activationConfig({ ...values, DATABASE_ENVIRONMENT: "production" }, "preview")).toThrow();
  expect(() => helper.activationConfig({ ...values, SOCLAAS_MODEL: "other" }, "preview")).toThrow();
  expect(() => helper.activationConfig({ ...values, DATABASE_URL: "postgresql://localhost/fixture" }, "preview")).toThrow();
});
