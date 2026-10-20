# WP-001 hosted setup guide

This guide reflects the CHG-K-005 workflow and adapter plus the 19 October 2026 shared SoCLaaS admission gate. It describes account configuration and bounded synthetic checks; it is not evidence that Vercel, Neon or SoCLaaS has been reached from the intended deployment. G04/G08 remain open until the account owner confirms eligibility, course/provider policy, key-visible models and limits, and actual hosted results.

Current evidence is in [CHG-K-006](../changes/CHG-K-006-foundation-handoff/verification.md): the existing Production workflow succeeded at `05e1b42`, including direct migration status, checked candidate and promotion. Non-production pooled/direct/shadow connections, replay/upgrade, gate integration, protected Preview persistence across redeployment and synthetic recovery passed. SoC remains incomplete pending provider/course facts; precise cleanup and independent review are recorded there. Follow the [foundation verification runbook](wp-001-foundation-handoff.md) for this increment's isolated local files, disposable targets and independent database/provider handoffs. The setup steps below remain conditional on the actual target's configuration; do not repeat Production bootstrap solely to verify Preview.

## 1. Confirm account and course eligibility

Before creating or using hosted resources, confirm the intended course project is permitted by the current Vercel, Neon and SoCLaaS account terms and the course's data-handling rules. Check the Vercel project/team's model-training setting and applicable terms, the Neon plan's current quotas and region availability, and the SoC key's permitted models, usage budget, input/output limits, retention and deletion rules. Do not infer these from a successful deployment or an API response. Vercel's current [terms](https://vercel.com/legal/terms), [plan documentation](https://neon.com/docs/introduction/plans) and [region API](https://api-docs.neon.tech/reference/getactiveregions) are account-sensitive; verify them for the actual accounts. The supplied SoCLaaS DocHub access/API PDF exports are listed in the [local reference README](../docs/reference/README.md); the PDFs are intentionally not committed and must be obtained through authorized SoC DocHub access. These references do not establish current key permissions, Vercel reachability, numeric quotas or course approval.

## 2. Create isolated Neon resources

Create independent Neon projects for Production and synthetic non-production use, as required by the selected foundation. Within the non-production project, isolate development and protected Preview with distinct branches/databases and roles (or separate non-production projects if those environments need independent controls). All Preview deployments using the SoCLaaS probe must use the same synthetic Preview database and `DATABASE_URL` so the Neon gate provides one shared budget; do not use different branch-specific database URLs for individual Preview deployments. Never point local or Preview at Production. Select a region after confirming the current region is available to the account and appropriate for the expected users. The Neon [connection URI API](https://api-docs.neon.tech/reference/getconnectionuri) supports pooled connection URIs; the [connection pooling guide](https://neon.tech/docs/connect/connection-pooling) describes the pooler behavior.

For each environment, configure:

| Name | Where it is used | Value requirements |
| --- | --- | --- |
| `DATABASE_URL` | Vercel runtime and local app | Neon pooled endpoint (hostname contains `-pooler`), credentialed PostgreSQL URL, TLS with `sslmode=require` or `sslmode=verify-full`; use a least-privilege runtime role. This URL is consumed by the Node `pg` runtime driver. |
| `MIGRATION_DATABASE_URL` | GitHub Actions migration step; local Prisma CLI process | Direct Neon endpoint (no `-pooler` hostname), same environment, branch and database as the runtime URL, migration-capable role, and query parameters `sslmode=require&sslaccept=strict`. Keep this out of Vercel runtime variables. |
| `SHADOW_DATABASE_URL` | Local `db:migrate:dev` only | Separate direct non-production database from the migration target, also using `sslmode=require&sslaccept=strict`. Do not configure it in Vercel or point it at Production. |

The application checks the pooled/direct host shape and each driver's TLS settings. Prisma CLI migration and shadow URLs must use `sslmode=require&sslaccept=strict`: Prisma's PostgreSQL connector documents `prefer`, `disable` and `require` as supported `sslmode` values, and its `sslaccept` option defaults to accepting invalid certificates. The application requires strict certificate validation for direct Prisma URLs and rejects `sslmode=verify-full` there because it is not a supported Prisma CLI mode. The pooled runtime `pg` URL has its own validation and may use `sslmode=require` or `sslmode=verify-full`; do not substitute its setting for the Prisma CLI URL rule. See the [Prisma PostgreSQL connection documentation](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql) and the [pinned Prisma PostgreSQL URL parser](https://github.com/prisma/prisma-engines/blob/d1b3f377ca835d73fd50954a5e22128b9ebdd6b8/quaint/src/connector/postgres/url.rs). When editing a Neon URI, keep exactly one `sslmode=require` and one `sslaccept=strict`: use `?` for the first query parameter and `&` for the next, replacing existing values instead of adding duplicates. Do not put any connection URL in the repository, workflow source, issue, build log or deployment output.

## 3. Create and protect the Vercel project

Create one Vercel project for TurnUp and record its Vercel `orgId` (personal account or team ID) and `projectId` from `vercel link` / `.vercel/project.json`. These are Vercel identifiers, not GitHub organization values. The workflow links the project using those IDs and pins Vercel CLI to [the verified `58.4.4` release](https://github.com/vercel/vercel/releases/tag/vercel%4058.4.4). Its `build --target`, `deploy --prebuilt --target`, `--target=production --skip-domain`, `promote`, and `curl --deployment` usage follows the official [build](https://vercel.com/docs/cli/build), [deploy](https://vercel.com/docs/cli/deploy), [curl](https://vercel.com/docs/cli/curl), and [promotion](https://vercel.com/docs/cli/promote) docs. Do not add branch-specific Preview variables: the workflow pulls the generic Preview environment. If branch-specific variables become necessary, change the workflow to pass `--git-branch` and verify the result before use.

Set `VERCEL_ORG_ID` to the linked project's `orgId`: team-owned projects use a `team_` ID. Personal projects may use a `usr_` ID or an unprefixed user ID; Vercel's [Get the User API example](https://vercel.com/docs/rest-api/user/get-the-user) shows a 24-character alphanumeric user ID. The workflow passes `teamId` to its REST API checks only for valid `team_` IDs; recognized personal IDs omit `teamId` and use the default account scope. Missing or malformed IDs and unrecognized prefixes fail before either API request. The current project is confirmed team-owned (`team_`), so its existing team-scoped API requests continue unchanged. `VERCEL_ORG_ID` remains in `.vercel/project.json` for CLI linking in both account types.

Set the Production Branch to `master`. Use GitHub Actions as the sole deploy route; disable or disconnect Vercel Git auto-deploys so a push cannot bypass the reviewed migration/build/candidate/promotion sequence. Before the first deployment, enable Vercel Authentication for **All Deployments** so the initial staged Production candidate is not public. Vercel announced all-deployment Authentication on all plans on 9 September 2026 in its [current changelog](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan); verify the actual project's settings. Vercel documents that [a project's first deployment is Production](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting#deploying-your-domain), so the setup flow must initialize deliberately.

The Actions workflow provides these stages:

1. PRs run local quality checks without provider or deployment credentials.
2. A protected `master` or one-segment `preview/*` push (for example, `preview/check`) runs locked dependency install, local checks, target-matched Vercel settings pull and target-matched build.
3. After a successful build, `db:migrate:deploy` applies reviewed migrations to the matching environment using the GitHub Actions direct migration secret; only then does the workflow upload the already-built output.
4. A Production upload uses `--skip-domain`, then the workflow verifies the project, target, commit/ref metadata and HTTPS root response. It promotes that same deployment URL only after verification and the `production-promotion` environment gate.
5. Preview and Production releases use separate concurrency groups. When a newer Production run starts, GitHub Actions requests cancellation of the older run, including during migration or promotion approval, using [`cancel-in-progress`](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency). Cancellation is asynchronous, so the older run may still reach or complete the external Vercel promotion before cancellation takes effect. The promotion step checks that its commit is still the `master` head immediately before promoting the verified URL; this narrows the stale-promotion window but cannot eliminate it.

The workflow installs the pinned pnpm 12 dependencies with `--frozen-lockfile` before `vercel build`. The repository's `vercel.json` sets `installCommand` to an empty string so the CLI build uses that installed tree instead of running a second package-manager install. Vercel [documents](https://vercel.com/docs/project-configuration/vercel-json#installcommand) that an empty install command skips installation. Keep the locked install and Vercel build in the same job; a separate build job must install dependencies again before invoking Vercel. This setting is a response to the 19 October 2026 CLI 58.4.4 failure to parse the pnpm 12 lockfile, followed by an unsuccessful `npm install`. Rerun the workflow to establish whether the CLI build now succeeds; local configuration validation alone does not prove deployment.

The pinned Vercel CLI also reads the lockfile during other commands. Its [config reader](https://github.com/vercel/vercel/blob/vercel%4058.4.4/packages/build-utils/src/fs/read-config-file.ts) uses a single-document YAML parser and logs `Error while parsing config file` to stdout when it cannot read pnpm 12's two-document `pnpm-lock.yaml`; the command may still succeed. `.github/scripts/read-vercel-output.mjs` separates only the exact diagnostic for this checkout's lockfile, reports a fixed warning on stderr, and requires exactly one valid deployment URL or HTTP status. Unknown diagnostics, extra results and malformed values fail closed without printing raw output. Both the upload and candidate smoke steps check the CLI exit before parsing, so a failed deploy/curl cannot become success by printing a valid-looking result. The lockfile and pinned tool versions remain intact; this is a bounded compatibility workaround, not a repair to Vercel's parser. Reassess it when upgrading the CLI.

If an upload reaches Ready but the workflow fails while capturing its URL, inspect that candidate in Vercel before retrying: a staged Production upload can already exist although verification and promotion have not run. The 20 October owner-supplied screenshots show Production / Staged and Assigning Custom Domains / Skipped; the CLI's `Aliased` line alone does not establish promotion. Fix the capture, run the corrected workflow from the updated revision, and let the exact-candidate verification and protected promotion sequence complete. A rerun creates a fresh candidate and reruns migrations; inspect any prior migration failure or cancellation under the recovery guidance before retrying. Production commands use `--target=production` without redundant `--prod`, and upload retains `--skip-domain`.

Production cancellation can interrupt `prisma migrate deploy`. Do not assume a cancelled step applied no database changes: inspect the migration output and the Production database migration status before retrying or promoting another candidate. If a migration is incomplete or failed, repair it deliberately with a reviewed forward migration and the team's approved Prisma recovery procedure; do not run an automatic destructive down-migration. The last ready Production deployment remains the serving application until a candidate is promoted, but its compatibility with any already-applied migration must be checked.

The synthetic SoC probe passes the incoming request's abort signal to the provider client. The `vercel.json` entry enables request cancellation only for `/api/internal/foundation-probe`. Vercel documents that cancellation is Node.js-only and opt-in by function path ([Functions API Reference](https://vercel.com/docs/functions/functions-api-reference)); a cancelled invocation may be reclaimed before application cleanup finishes. The durable in-flight reservation is therefore retained for cancellation, and the local abort does not prove that SoCLaaS stopped processing or billing. Follow the uncertain-result recovery steps below before clearing that reservation.

### GitHub configuration

Create the GitHub Actions environments `preview`, `production`, and `production-promotion`. Restrict `preview` to `preview/*`; restrict the two Production environments to `master`. GitHub deployment environment wildcards do not match `/`, so Preview supports a single branch segment such as `preview/check`, not `preview/team/check` ([deployment branch policies](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)). A manual dispatch selected on a nested Preview branch is rejected by the environment policy before job steps run; the workflow trust check also rejects nested or empty Preview suffixes if a job reaches that check. Configure `production-promotion` with required approval and ensure its protection rules are active before the first production run. Required reviewer rules depend on the repository visibility and GitHub plan; verify that the rule is available and enabled. If the environment is missing or unprotected, GitHub can create it without protection and the promotion would not wait.

Add these **variables** in each environment used by a Vercel CLI job, including `production-promotion`:

| Variable | Value |
| --- | --- |
| `VERCEL_ORG_ID` | Vercel `orgId` from the linked project: `team_` for a team; `usr_` or a 24-character alphanumeric user ID for a personal account. |
| `VERCEL_PROJECT_ID` | Vercel `projectId`. |

In the `preview` environment also set `PREVIEW_ORIGIN` to the exact HTTPS stable Preview
alias, with no path, port, query, fragment or trailing slash. Set Vercel Preview
`AUTH_ORIGIN` to exactly the same value. The workflow assigns that alias to every checked
Preview candidate and only then publishes its **Open Preview** link; it fails before upload
when this value is absent or malformed.

Add these **secrets** separately to `preview` and `production`; add only `VERCEL_TOKEN` to `production-promotion`:

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | A Vercel access token with access to the linked personal account for `usr_` or supported unprefixed user IDs, or scoped to the intended team for `team_` projects, and allowed to pull/build/deploy/promote that project. |
| `MIGRATION_DATABASE_URL` | Add to `preview` and `production` only. It is that environment's direct Neon URL and migration role, with `sslmode=require&sslaccept=strict`. Production and Preview must use different projects. The workflow exposes this secret to the migration step only. |

Do not make these repository-wide secrets: the workflow obtains secrets only through the selected protected environment and PR jobs do not access them. The GitHub [environment documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments) describes environment-scoped secrets and protection rules.

### Update migration URLs privately

For each GitHub environment, open **Settings → Environments → `preview`** or **`production` → Environment secrets**, then update that environment's existing `MIGRATION_DATABASE_URL` secret with its matching direct Neon URI and the required `sslmode=require&sslaccept=strict` parameters. Keep the two values tied to their respective non-production and production Neon projects. GitHub does not show a saved secret value again; if you do not have the current URI in an approved private store, copy a fresh direct URI from the matching Neon project and replace the secret through the GitHub settings form. Never print the URI to confirm it, paste it into chat, or place it in an issue, PR, repository file, build log or deployment output.

For local Prisma CLI commands, load `MIGRATION_DATABASE_URL` and (for `db:migrate:dev`) `SHADOW_DATABASE_URL` into the process from an approved local secret manager. An ignored `.env.local` is optional; it is not required if your secret manager can inject the values. Keep both local URLs on the non-production project, and apply `sslmode=require&sslaccept=strict` to each direct URI. Do not type the credential-bearing URL into a shell command or check it into Git.

Changing only query parameters to add strict certificate checking does not require changing the database password. If a full URL or password was exposed, rotate the affected Neon role credential in that environment, then replace only that environment's GitHub secret and private local secret-manager entry with the new direct URI. Keep the Preview and Production credentials separate and do not record either value during rotation.

In the `preview` environment add variable `VERCEL_PROJECT_INITIALIZED=false` before first use. Keep it false until the staged first Production candidate has passed checks, been promoted through the protected environment, and a ready Production deployment is visible. Then set it to `true`. Preview releases fail closed without this flag and a ready Production deployment. Do not set this flag just to bypass the bootstrap gate.

## 4. Configure Vercel runtime variables

Set values separately in Vercel's Preview and Production environments. Ensure Production uses Production Neon values and Preview uses the synthetic non-production resource.

| Variable | Placement / value |
| --- | --- |
| `TURNUP_ENVIRONMENT` | `preview` in Preview; `production` in Production. |
| `DATABASE_ENVIRONMENT` | `non-production` in Preview; `production` in Production. |
| `DATABASE_URL` | The corresponding pooled Neon runtime URL. |
| `AUTH_ORIGIN` | Exact HTTPS stable Preview alias in Preview; exact Production browser origin in Production. The Preview value must equal the protected GitHub `PREVIEW_ORIGIN` variable. |
| `AUTH_SOURCE_MODE` | `vercel` in both hosted environments. |
| `SOCLAAS_API_KEY` | Secret in Vercel only, never `NEXT_PUBLIC_*`; leave unset until provider/course policy and key permissions are confirmed. |
| `SOCLAAS_BASE_URL` | Exact fixed value `https://soclaas-api.comp.nus.edu.sg/v1`. |
| `SOCLAAS_MODEL` | Exact model ID confirmed in the key-visible SoCLaaS model catalogue and approved for the course. No default/fallback is selected by the application. |
| `SOCLAAS_MAX_INPUT_BYTES` | Explicit positive integer at or below the application hard ceiling of `65536`; choose the actual limit only after G04 validation. |
| `SOCLAAS_MAX_OUTPUT_TOKENS` | Explicit positive integer at or below the hard ceiling of `4096`; choose the actual model budget only after G04 validation. |
| `SOCLAAS_TIMEOUT_MS` | Explicit positive integer at or below `30000`. This is a local wait bound, not proof remote work or billing stopped. |
| `FOUNDATION_PROBE_ENABLED` | Keep `false`/unset except during an authorized Preview-only check. Must remain disabled in Production. |
| `FOUNDATION_PROBE_TOKEN` | Temporary Preview-only secret, at least 32 random bytes; absent in Production. |
| `FOUNDATION_PROBE_SOC_MAX_ATTEMPTS` | Positive integer, Preview only. Set no higher than the remaining verified SoCLaaS request allowance for this probe activation. Admissions are cumulative until an operator-authorized quota reset; the application has no automatic window/reset. |
| `FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT` | Positive integer, Preview only. No higher than the verified provider/key concurrency allowance. Enforced across instances and deployments using Neon. |
| `FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS` | Positive integer, Preview only. At least the minimum spacing verified for this model/key. Admission time uses Neon database time across instances. |
| `FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET` | Positive integer, Preview only. Cumulative reservation budget for this activation. For one possible call it must be at least `SOCLAAS_MAX_OUTPUT_TOKENS`; a lower value is a valid stricter limit that rejects every call. Each admitted call reserves the full per-request output cap, even if the provider later returns fewer tokens. |

`MIGRATION_DATABASE_URL` belongs in the GitHub environment secret, not Vercel. `SHADOW_DATABASE_URL` is local only. The adapter makes one non-streaming request with no retry, no model fallback, fixed provider host and configured input/output/time bounds. A 429 is reported neutrally as `rate_or_budget_limited`. Its hard ceilings protect against accidental unbounded settings; they do not resolve G04 or establish provider quotas.

All four probe limit variables must be explicit positive safe integers. Missing values make the authenticated SoC probe return `503 not_configured`; malformed values return `503 invalid_configuration`. Each valid value is submitted to the shared gate independently and ratchets the stored policy even if that request is denied. The gate returns `429 rate_or_budget_limited` when an admission condition is unmet: the cumulative attempt cap is spent, all in-flight slots are occupied, the minimum interval has not elapsed, or adding the full per-request output-token cap would exceed the cumulative budget. A budget below `SOCLAAS_MAX_OUTPUT_TOKENS` therefore rejects each new request; the ratcheted budget remains effective until the full operator quota reset.

## 5. First deployment and Preview checks

Keep the Vercel project protected and avoid a manual/dashboard/Git-triggered first deployment. After environment variables/secrets are in place, dispatch `Vercel prebuilt deployment` from protected `master` with target `production`. This intentionally creates the first Production deployment with `--skip-domain`, runs migrations after the target build, checks the same candidate, then waits at `production-promotion`. Confirm candidate metadata and smoke result, approve the environment job under the repository's normal release process, and let the workflow promote the exact URL. If any step fails, do not set `VERCEL_PROJECT_INITIALIZED`; inspect the failed stage and recover the database/app deliberately before retrying.

Once the Production bootstrap is complete, set the Preview initialization variable to `true` and push the reviewed synthetic-check revision to a protected one-segment Preview branch such as `preview/check`. The workflow refuses to deploy Preview if the project lacks a ready Production deployment. It pulls generic Preview settings, builds the Preview target, migrates the isolated Preview database, uploads the prebuilt artifact, assigns the configured `PREVIEW_ORIGIN` alias, then publishes that alias as **Open Preview**. This order means a failed build does not alter the database; a failed migration blocks upload. If upload fails after a migration succeeds, the database may be ahead of the previous app version: use only reviewed backward-compatible migrations and follow a documented forward repair or application rollback plan. Do not run automatic destructive down-migrations.

Vercel CLI `curl` is used to test protected deployment URLs. The workflow authenticates this command through the existing step-scoped `VERCEL_TOKEN` environment variable. Do not pass `--token` to `curl` in CLI 58.4.4: its [curl argument parser](https://github.com/vercel/vercel/blob/vercel%4058.4.4/packages/cli/src/commands/curl/shared.ts) forwards that flag to system curl, which rejects it, even when the flag precedes the subcommand. The pinned [CLI entry point](https://github.com/vercel/vercel/blob/vercel%4058.4.4/packages/cli/src/index.ts) supports environment token authentication without adding it to raw command arguments. The command supports deployment-specific requests and automatically obtains Deployment Protection bypass for authenticated CLI access ([CLI docs](https://vercel.com/docs/cli/curl)). The production root smoke verifies an HTTP response only; it is not the T15 user journey or persistence/provider evidence.

## 6. Temporary synthetic Preview probe

Persistence checks require a Preview deployment protected with Vercel Authentication and a confirmed synthetic non-production Preview database under G08. Keep the four SoC admission settings absent for a persistence-only activation. Before any SoCLaaS request, G04 must additionally permit that bounded test: confirm the exact configured model is permitted for the key and course, then verify the key's request, concurrency, output-token, rate-window, cost and data-handling limits from authoritative current sources. Choose all four `FOUNDATION_PROBE_SOC_*` values explicitly from those verified limits for one probe activation. `maxAttempts` and `outputTokenBudget` are cumulative gate caps, not rolling-window limits; the gate does not infer or reset a provider quota window. If the verified provider limits or remaining allowance are unknown, keep SoC disabled by leaving its four required admission settings absent. No example numeric values are safe defaults.

1. For an authorised SoC activation only, set the four `FOUNDATION_PROBE_SOC_*` limits in Vercel **Preview** variables. For either activation, ensure the token is temporarily stored as a Vercel **Preview** secret `FOUNDATION_PROBE_TOKEN`; set Preview `FOUNDATION_PROBE_ENABLED=true` only when ready to test. Keep the token out of shell tracing, shell history, source, URL query strings and logs. `openssl rand -hex 32` can generate 32 random bytes encoded as hex; store the result directly in an approved secret manager before configuring Vercel. Keep all four limit variables and the enablement/token settings absent or disabled in Production. When using the CLI, explicitly use `--sensitive` for the token and `--no-sensitive` for the non-secret enablement flag; restore its original false setting/type during cleanup.
2. Use an authenticated Vercel CLI session linked to the project. Keep the original token in the approved secret manager and load it into the local process through that manager's protected injection mechanism. Vercel sensitive environment values are write-only; do not try to retrieve `FOUNDATION_PROBE_TOKEN` with `vercel env pull` or `vercel env run` ([environment variable docs](https://vercel.com/docs/environment-variables/manage-across-environments)). Disable shell tracing, do not paste the token into a command, and do not capture request headers in logs. Generate and retain a caller-known synthetic UUID before sending the persistence-create request; if its response is lost, retry using that same ID. The ID is not a credential. Never add caller prompt, model or base URL values.

```sh
export PROBE_URL='https://<protected-preview-deployment>.vercel.app'
set +x
export PROBE_ID="$(node --input-type=module -e 'import { randomUUID } from "node:crypto"; process.stdout.write(randomUUID())')"
printf 'Retain this synthetic probe ID for retry, check and cleanup: %s\n' "$PROBE_ID"

# Create a synthetic record with the ID already known to the caller.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=persistence-create&id=$PROBE_ID" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"

# If the create response was lost, retry this exact request with the same PROBE_ID.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=persistence-create&id=$PROBE_ID" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"

corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=persistence-check&id=$PROBE_ID" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"

# Only after G04 and all four SoC admission settings are verified:
# fixed synthetic SoCLaaS request; response contains only ok/classification.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=soc" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"

# Delete the synthetic record when checks are complete.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=persistence-delete&id=$PROBE_ID" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"
```

For persistence across redeploys, create the record, deploy the next reviewed Preview revision, then check the same UUID before deleting it. Record each probe-enabled deployment's environment, revision and URL privately so every URL can be removed afterward; do not record keys, connection strings, prompt payloads or raw provider error bodies. After checks, remove the Preview `FOUNDATION_PROBE_TOKEN` setting and set `FOUNDATION_PROBE_ENABLED=false` for future deployments, then deploy a reviewed Preview revision with the probe disabled. Vercel environment changes apply only to new deployments, so the old probe-enabled URLs retain their original settings ([environment variable behavior](https://vercel.com/docs/environment-variables)). Delete every probe-enabled deployment, including the initial check deployment and any redeploy used for persistence verification, with `vercel remove <deployment-url>` or the Vercel dashboard ([CLI removal docs](https://vercel.com/docs/cli/remove)). Verify each removed URL no longer serves the route and the new disabled deployment returns 404. Rotate the token in the approved secret manager, unset it from the local process, and do not leave the probe enabled for ordinary Preview traffic.

Every probe-enabled Preview deployment must point to the same non-production Neon database. Vercel creates function invocations per request and scales instances with demand, so process-local counters cannot enforce a shared cap ([Functions documentation](https://vercel.com/docs/functions)). The gate is shared by all instances and deployments using that database and keeps cumulative attempt/output-token reservations across requests and redeployments. Each request with valid limit values ratchets the stored policy before it is admitted or rejected: the effective maximum attempts, maximum in-flight calls and output-token budget are the lowest configured values seen, while the effective minimum interval becomes the highest value seen. This policy persists across deployments. A later deployment with higher caps or a shorter interval cannot loosen it; older probe-enabled deployment URLs are subject to the same durable policy when they call the shared gate. When tightening settings, disable the probe and remove older probe-enabled deployment URLs before enabling the new deployment; its first valid request records the tighter settings even if the gate denies that request. A call rejected by any gate limit returns `429 rate_or_budget_limited` without contacting SoCLaaS. The gate reserves the full `SOCLAAS_MAX_OUTPUT_TOKENS` value before each call. A known completed call releases only its in-flight slot; attempts and output-token reservations remain spent. A timeout, cancellation, unavailable provider/transport result or unexpected adapter failure leaves the in-flight slot reserved because the local runtime cannot establish that remote work stopped.

For an uncertain result, disable the probe, unset its token, remove every deployment that still has the probe enabled, and confirm from provider-side usage/activity that the request has ended. If provider-side cessation cannot be confirmed, leave the probe disabled and do not clear the lease. Wait for all probe handlers to finish. Verify the Neon console/connection is targeting the synthetic Preview database, then run the operator-only SQL below to clear stale in-flight leases. Because the probe is disabled and all handlers/provider work have ended, any remaining lease is stale. This repairs concurrency only: it leaves the stored policy (`max_attempts_limit`, `max_in_flight_limit`, `min_interval_ms`, `output_token_budget`), cumulative attempt/output-token counters and last-admission time unchanged. Never run the SQL while a handler or provider request may still be active.

```sql
BEGIN;
DELETE FROM soc_probe_reservation WHERE gate_id = 1;
UPDATE soc_probe_gate
SET in_flight_count = (
  SELECT COUNT(*)::BIGINT FROM soc_probe_reservation WHERE gate_id = 1
)
WHERE id = 1;
COMMIT;
```

Only start a new probe allowance after verifying a changed provider quota/reset window and deliberately authorizing another bounded activation. First disable the probe, unset the token, remove every old probe-enabled deployment URL, and wait for handlers and provider work to cease. Deploy the reviewed version with the newly approved explicit limits, but keep the probe disabled. Then use a separate operator transaction to reset the cumulative counters and persisted strictest-policy fields together; do not include this reset in ordinary lease recovery. Enable the new deployment only after that reset. The first valid request then initializes the new policy from the new deployment's explicit settings:

```sql
BEGIN;
DELETE FROM soc_probe_reservation WHERE gate_id = 1;
UPDATE soc_probe_gate
SET attempt_count = 0,
    in_flight_count = 0,
    reserved_output_tokens = 0,
    last_admission_at = NULL,
    max_attempts_limit = NULL,
    max_in_flight_limit = NULL,
    min_interval_ms = NULL,
    output_token_budget = NULL
WHERE id = 1;
COMMIT;
```

Never add a public reset route. These operations apply only to the synthetic Preview database; do not run them against Production.

The route ignores request bodies and accepts only the fixed persistence operations or a fixed synthetic SoC prompt. The SoC adapter is not a public anonymous proxy. Neither successful persistence calls nor this probe complete T14/T15/T28 or either end-user AI workflow.

## Configuration inventory

| Location | Names |
| --- | --- |
| GitHub environment variables | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; Preview additionally `VERCEL_PROJECT_INITIALIZED`, `PREVIEW_ORIGIN`. |
| GitHub environment secrets | `VERCEL_TOKEN` in `preview`, `production`, and `production-promotion`; `MIGRATION_DATABASE_URL` in `preview` and `production` only. |
| Vercel Preview/Production runtime variables | `TURNUP_ENVIRONMENT`, `DATABASE_ENVIRONMENT`, `DATABASE_URL`, `SOCLAAS_BASE_URL`, `SOCLAAS_MODEL`, `SOCLAAS_MAX_INPUT_BYTES`, `SOCLAAS_MAX_OUTPUT_TOKENS`, `SOCLAAS_TIMEOUT_MS`, `SOCLAAS_API_KEY` (secret, after G04), `FOUNDATION_PROBE_ENABLED`, `FOUNDATION_PROBE_TOKEN` (temporary Preview secret only). |
| Vercel Preview runtime variables, temporary probe only | `FOUNDATION_PROBE_SOC_MAX_ATTEMPTS`, `FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT`, `FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS`, `FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET`; explicit values from verified provider/key limits, no defaults. |
| Local process via an approved secret manager (or optional ignored `.env.local`) | `TURNUP_ENVIRONMENT`, `DATABASE_ENVIRONMENT`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `SHADOW_DATABASE_URL`, SoCLaaS settings if explicitly approved for a synthetic local check. Direct Prisma URLs use `sslmode=require&sslaccept=strict`. |

No credential values belong in this inventory. Local checks and test doubles remain distinct from intended-host persistence across requests/redeploys and live SoCLaaS reachability; record unavailable access as unrun evidence, not a pass.
