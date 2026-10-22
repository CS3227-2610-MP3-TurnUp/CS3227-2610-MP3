import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { readMigrationDatabaseConfig } from "../src/server/config/environment.ts";

export const approvalId = "wp006-preview-20261022-200";
/** CI reads only Vercel's target-matched file, never a developer .env.local. */
export function activationConfig(values, target) {
  if (target !== "preview" || values.TURNUP_ENVIRONMENT !== "preview" || values.DATABASE_ENVIRONMENT !== "non-production") throw Error("preview_target_required");
  try { readMigrationDatabaseConfig(values, "deploy"); } catch { throw Error("preview_database_required"); }
  // Sensitive runtime keys need not be downloadable to CI. Runtime policy + guard smoke checks presence.
  if (values.SOCLAAS_BASE_URL !== "https://soclaas-api.comp.nus.edu.sg/v1" || values.SOCLAAS_MODEL !== "qwen3.8:27b"
    || ![["SOCLAAS_MAX_INPUT_BYTES",65536],["SOCLAAS_MAX_OUTPUT_TOKENS",4096],["SOCLAAS_TIMEOUT_MS",30000]].every(([key,max]) =>
      /^[1-9][0-9]*$/.test(values[key] ?? "") && Number(values[key]) <= max)) throw Error("preview_soclaas_configuration_required");
  return { connectionString: values.MIGRATION_DATABASE_URL, model: values.SOCLAAS_MODEL };
}

export async function activate(client, model) {
  await client.query("BEGIN");
  try {
    // Same approval is a no-op. A new ID/model/expiry cannot silently renew or replace this budget.
    await client.query(`INSERT INTO student_ai_budget (id,approval_id,environment,model,enabled,expires_at)
      VALUES (1,$1,'preview',$2,true,clock_timestamp() + interval '7 days') ON CONFLICT (id) DO NOTHING`, [approvalId, model]);
    const { rows } = await client.query("SELECT approval_id,model,enabled,expires_at > clock_timestamp() AS active,attempts,reserved_output_tokens FROM student_ai_budget WHERE id=1 FOR UPDATE");
    const row = rows[0];
    if (!row || row.approval_id !== approvalId || row.model !== model || !row.enabled || !row.active) throw Error("preview_budget_operator_action_required");
    await client.query("COMMIT");
    return { attempts: row.attempts, reservedOutputTokens: row.reserved_output_tokens };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

async function main() {
  if (process.argv[2] !== "--preview" || process.argv[3] !== approvalId || process.env.DEPLOYMENT_TARGET !== "preview"
    || process.env.GITHUB_REF_NAME !== "preview/WP-006") throw Error("explicit_preview_approval_required");
  const values = parseEnv(await readFile(".vercel/.env.preview.local", "utf8"));
  const config = activationConfig({ ...values, TURNUP_ENVIRONMENT: process.env.TURNUP_ENVIRONMENT,
    DATABASE_ENVIRONMENT: process.env.DATABASE_ENVIRONMENT, MIGRATION_DATABASE_URL: process.env.MIGRATION_DATABASE_URL }, process.env.DEPLOYMENT_TARGET);
  const client = new Client({ connectionString: config.connectionString, connectionTimeoutMillis: 10000, query_timeout: 10000 });
  try { await client.connect(); const counters = await activate(client, config.model);
    console.log(`Student Preview budget ready: ${counters.attempts}/200 attempts used; no reset or inference.`);
  } finally { await client.end().catch(() => {}); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => {
  const safe = ["preview_target_required","preview_database_required","preview_soclaas_configuration_required","explicit_preview_approval_required","preview_budget_operator_action_required"].includes(error?.message) ? error.message : "dependency_failure";
  console.error(`Student Preview budget activation failed (${safe}). Check Preview settings, migration and approval status; no allowance was reset.`); process.exitCode = 1;
});
