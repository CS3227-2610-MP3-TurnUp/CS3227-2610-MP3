import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { readMigrationDatabaseConfig } from "../src/server/config/environment.ts";

export const approvalId = "wp006-preview-20261022-200";
export const productionApprovalId = "wp006-production-20261022-200";
const approvals = { preview: approvalId, production: productionApprovalId };
/** CI reads only Vercel's target-matched file, never a developer .env.local. */
export function activationConfig(values, target) {
  if (!Object.hasOwn(approvals, target) || values.TURNUP_ENVIRONMENT !== target
    || values.DATABASE_ENVIRONMENT !== (target === "production" ? "production" : "non-production")) throw Error("hosted_target_required");
  try { readMigrationDatabaseConfig(values, "deploy"); } catch { throw Error("hosted_database_required"); }
  // Sensitive runtime keys need not be downloadable to CI. Runtime policy + guard smoke checks presence.
  if (values.SOCLAAS_BASE_URL !== "https://soclaas-api.comp.nus.edu.sg/v1" || values.SOCLAAS_MODEL !== "qwen3.8:27b"
    || ![["SOCLAAS_MAX_INPUT_BYTES",65536],["SOCLAAS_MAX_OUTPUT_TOKENS",4096],["SOCLAAS_TIMEOUT_MS",30000]].every(([key,max]) =>
      /^[1-9][0-9]*$/.test(values[key] ?? "") && Number(values[key]) <= max)) throw Error("hosted_soclaas_configuration_required");
  return { connectionString: values.MIGRATION_DATABASE_URL, model: values.SOCLAAS_MODEL };
}

export async function activate(client, model, environment = "preview") {
  if (!Object.hasOwn(approvals, environment)) throw Error("hosted_target_required");
  const approved = approvals[environment];
  await client.query("BEGIN");
  try {
    // Same approval is a no-op. A new ID/model/expiry cannot silently renew or replace this budget.
    await client.query(`INSERT INTO student_ai_budget (id,approval_id,environment,model,enabled,expires_at)
      VALUES (1,$1,$2,$3,true,clock_timestamp() + interval '7 days') ON CONFLICT (id) DO NOTHING`, [approved, environment, model]);
    const { rows } = await client.query("SELECT approval_id,environment,model,enabled,expires_at > clock_timestamp() AS active,attempts,reserved_output_tokens FROM student_ai_budget WHERE id=1 FOR UPDATE");
    const row = rows[0];
    if (!row || row.environment !== environment || row.approval_id !== approved || row.model !== model || !row.enabled || !row.active) throw Error("hosted_budget_operator_action_required");
    await client.query("COMMIT");
    return { attempts: row.attempts, reservedOutputTokens: row.reserved_output_tokens };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

async function main() {
  const target = process.env.DEPLOYMENT_TARGET;
  if (!Object.hasOwn(approvals, target ?? "") || process.argv[2] !== `--${target}` || process.argv[3] !== approvals[target]
    || process.env.REF_PROTECTED !== "true"
    || process.env.GITHUB_REF_NAME !== (target === "production" ? "master" : "preview/WP-006")) throw Error("explicit_hosted_approval_required");
  const values = parseEnv(await readFile(`.vercel/.env.${target}.local`, "utf8"));
  const config = activationConfig({ ...values, TURNUP_ENVIRONMENT: process.env.TURNUP_ENVIRONMENT,
    DATABASE_ENVIRONMENT: process.env.DATABASE_ENVIRONMENT, MIGRATION_DATABASE_URL: process.env.MIGRATION_DATABASE_URL }, process.env.DEPLOYMENT_TARGET);
  const client = new Client({ connectionString: config.connectionString, connectionTimeoutMillis: 10000, query_timeout: 10000 });
  try { await client.connect(); const counters = await activate(client, config.model, target);
    console.log(`Student ${target} budget ready: ${counters.attempts}/200 attempts used; no reset or inference.`);
  } finally { await client.end().catch(() => {}); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  const safe = ["hosted_target_required","hosted_database_required","hosted_soclaas_configuration_required","explicit_hosted_approval_required","hosted_budget_operator_action_required"].includes(error?.message) ? error.message : "dependency_failure";
  console.error(`Student hosted budget activation failed (${safe}). Check target settings, migration and approval status; no allowance was reset.`); process.exitCode = 1;
});
