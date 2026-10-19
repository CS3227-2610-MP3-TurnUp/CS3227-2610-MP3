# WP-001 hosted setup guide

This guide reflects the CHG-K-005 workflow and adapter in the reviewed worktree on 18 October 2026. It describes account configuration and bounded synthetic checks; it is not evidence that Vercel, Neon or SoCLaaS has been reached from the intended deployment. G04/G08 remain open until the account owner confirms eligibility, course/provider policy, key-visible models and limits, and actual hosted results.

## 1. Confirm account and course eligibility

Before creating or using hosted resources, confirm the intended course project is permitted by the current Vercel, Neon and SoCLaaS account terms and the course's data-handling rules. Check the Vercel project/team's model-training setting and applicable terms, the Neon plan's current quotas and region availability, and the SoC key's permitted models, usage budget, input/output limits, retention and deletion rules. Do not infer these from a successful deployment or an API response. Vercel's current [terms](https://vercel.com/legal/terms), [plan documentation](https://neon.com/docs/introduction/plans) and [region API](https://api-docs.neon.tech/reference/getactiveregions) are account-sensitive; verify them for the actual accounts. The supplied SoCLaaS DocHub access/API PDF exports are listed in the [local reference README](../docs/reference/README.md); the PDFs are intentionally not committed and must be obtained through authorized SoC DocHub access. These references do not establish current key permissions, Vercel reachability, numeric quotas or course approval.

## 2. Create isolated Neon resources

Create independent Neon projects for Production and synthetic non-production use, as required by the selected foundation. Within the non-production project, isolate development and protected Preview with distinct branches/databases and roles (or separate non-production projects if those environments need independent controls). Never point local or Preview at Production. Select a region after confirming the current region is available to the account and appropriate for the expected users. The Neon [connection URI API](https://api-docs.neon.tech/reference/getconnectionuri) supports pooled connection URIs; the [connection pooling guide](https://neon.tech/docs/connect/connection-pooling) describes the pooler behavior.

For each environment, configure:

| Name | Where it is used | Value requirements |
| --- | --- | --- |
| `DATABASE_URL` | Vercel runtime and local app | Neon pooled endpoint (hostname contains `-pooler`), credentialed PostgreSQL URL, TLS with `sslmode=require` or `sslmode=verify-full`; use a least-privilege runtime role. This URL is consumed by the Node `pg` runtime driver. |
| `MIGRATION_DATABASE_URL` | GitHub Actions migration step; local Prisma CLI process | Direct Neon endpoint (no `-pooler` hostname), same environment, branch and database as the runtime URL, migration-capable role, and query parameters `sslmode=require&sslaccept=strict`. Keep this out of Vercel runtime variables. |
| `SHADOW_DATABASE_URL` | Local `db:migrate:dev` only | Separate direct non-production database from the migration target, also using `sslmode=require&sslaccept=strict`. Do not configure it in Vercel or point it at Production. |

The application checks the pooled/direct host shape and each driver's TLS settings. Prisma CLI migration and shadow URLs must use `sslmode=require&sslaccept=strict`: Prisma's PostgreSQL connector documents `prefer`, `disable` and `require` as supported `sslmode` values, and its `sslaccept` option defaults to accepting invalid certificates. The application requires strict certificate validation for direct Prisma URLs and rejects `sslmode=verify-full` there because it is not a supported Prisma CLI mode. The pooled runtime `pg` URL has its own validation and may use `sslmode=require` or `sslmode=verify-full`; do not substitute its setting for the Prisma CLI URL rule. See the [Prisma PostgreSQL connection documentation](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql) and the [pinned Prisma PostgreSQL URL parser](https://github.com/prisma/prisma-engines/blob/d1b3f377ca835d73fd50954a5e22128b9ebdd6b8/quaint/src/connector/postgres/url.rs). When editing a Neon URI, keep exactly one `sslmode=require` and one `sslaccept=strict`: use `?` for the first query parameter and `&` for the next, replacing existing values instead of adding duplicates. Do not put any connection URL in the repository, workflow source, issue, build log or deployment output.

## 3. Create and protect the Vercel project

Create one Vercel project for TurnUp and record its Vercel `orgId` (personal account or team ID) and `projectId` from `vercel link` / `.vercel/project.json`. These are Vercel identifiers, not GitHub organization values. The workflow links the project using those IDs and pins Vercel CLI to [the verified `58.4.4` release](https://github.com/vercel/vercel/releases/tag/vercel%4058.4.4). Its `build --target`, `deploy --prebuilt --target`, `--prod --skip-domain`, `promote`, and `curl --deployment` usage follows the official [build](https://vercel.com/docs/cli/build), [deploy](https://vercel.com/docs/cli/deploy), [curl](https://vercel.com/docs/cli/curl), and [promotion](https://vercel.com/docs/cli/promote) docs. Do not add branch-specific Preview variables: the workflow pulls the generic Preview environment. If branch-specific variables become necessary, change the workflow to pass `--git-branch` and verify the result before use.

Set `VERCEL_ORG_ID` to the linked project's `orgId`: team-owned projects use a `team_` ID. Personal projects may use a `usr_` ID or an unprefixed user ID; Vercel's [Get the User API example](https://vercel.com/docs/rest-api/user/get-the-user) shows a 24-character alphanumeric user ID. The workflow passes `teamId` to its REST API checks only for valid `team_` IDs; recognized personal IDs omit `teamId` and use the default account scope. Missing or malformed IDs and unrecognized prefixes fail before either API request. The current project is confirmed team-owned (`team_`), so its existing team-scoped API requests continue unchanged. `VERCEL_ORG_ID` remains in `.vercel/project.json` for CLI linking in both account types.

Set the Production Branch to `master`. Use GitHub Actions as the sole deploy route; disable or disconnect Vercel Git auto-deploys so a push cannot bypass the reviewed migration/build/candidate/promotion sequence. Before the first deployment, enable Vercel Authentication for **All Deployments** so the initial staged Production candidate is not public. Vercel announced all-deployment Authentication on all plans on 9 September 2026 in its [current changelog](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan); verify the actual project's settings. Vercel documents that [a project's first deployment is Production](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting#deploying-your-domain), so the setup flow must initialize deliberately.

The Actions workflow provides these stages:

1. PRs run local quality checks without provider or deployment credentials.
2. A protected `master` or `preview/**` push runs locked dependency install, local checks, target-matched Vercel settings pull and target-matched build.
3. After a successful build, `db:migrate:deploy` applies reviewed migrations to the matching environment using the GitHub Actions direct migration secret; only then does the workflow upload the already-built output.
4. A Production upload uses `--skip-domain`, then the workflow verifies the project, target, commit/ref metadata and HTTPS root response. It promotes that same deployment URL only after verification and the `production-promotion` environment gate.
5. One workflow-level concurrency group serializes preview and production release runs through promotion. A newer `master` head invalidates an older candidate before promotion.

### GitHub configuration

Create the GitHub Actions environments `preview`, `production`, and `production-promotion`. Restrict `preview` to `preview/*`; restrict the two Production environments to `master`. Configure `production-promotion` with required approval and ensure its protection rules are active before the first production run. Required reviewer rules depend on the repository visibility and GitHub plan; verify that the rule is available and enabled. If the environment is missing or unprotected, GitHub can create it without protection and the promotion would not wait.

Add these **variables** in each environment used by a Vercel CLI job, including `production-promotion`:

| Variable | Value |
| --- | --- |
| `VERCEL_ORG_ID` | Vercel `orgId` from the linked project: `team_` for a team; `usr_` or a 24-character alphanumeric user ID for a personal account. |
| `VERCEL_PROJECT_ID` | Vercel `projectId`. |

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
| `SOCLAAS_API_KEY` | Secret in Vercel only, never `NEXT_PUBLIC_*`; leave unset until provider/course policy and key permissions are confirmed. |
| `SOCLAAS_BASE_URL` | Exact fixed value `https://soclaas-api.comp.nus.edu.sg/v1`. |
| `SOCLAAS_MODEL` | Exact model ID confirmed in the key-visible SoCLaaS model catalogue and approved for the course. No default/fallback is selected by the application. |
| `SOCLAAS_MAX_INPUT_BYTES` | Explicit positive integer at or below the application hard ceiling of `65536`; choose the actual limit only after G04 validation. |
| `SOCLAAS_MAX_OUTPUT_TOKENS` | Explicit positive integer at or below the hard ceiling of `4096`; choose the actual model budget only after G04 validation. |
| `SOCLAAS_TIMEOUT_MS` | Explicit positive integer at or below `30000`. This is a local wait bound, not proof remote work or billing stopped. |
| `FOUNDATION_PROBE_ENABLED` | Keep `false`/unset except during an authorized Preview-only check. Must remain disabled in Production. |
| `FOUNDATION_PROBE_TOKEN` | Temporary Preview-only secret, at least 32 random bytes; absent in Production. |

`MIGRATION_DATABASE_URL` belongs in the GitHub environment secret, not Vercel. `SHADOW_DATABASE_URL` is local only. The adapter makes one non-streaming request with no retry, no model fallback, fixed provider host and configured input/output/time bounds. A 429 is reported neutrally as `rate_or_budget_limited`. Its hard ceilings protect against accidental unbounded settings; they do not resolve G04 or establish provider quotas.

## 5. First deployment and Preview checks

Keep the Vercel project protected and avoid a manual/dashboard/Git-triggered first deployment. After environment variables/secrets are in place, dispatch `Vercel prebuilt deployment` from protected `master` with target `production`. This intentionally creates the first Production deployment with `--skip-domain`, runs migrations after the target build, checks the same candidate, then waits at `production-promotion`. Confirm candidate metadata and smoke result, approve the environment job under the repository's normal release process, and let the workflow promote the exact URL. If any step fails, do not set `VERCEL_PROJECT_INITIALIZED`; inspect the failed stage and recover the database/app deliberately before retrying.

Once the Production bootstrap is complete, set the Preview initialization variable to `true` and push the reviewed synthetic-check revision to a protected `preview/**` branch. The workflow refuses to deploy Preview if the project lacks a ready Production deployment. It pulls generic Preview settings, builds the Preview target, migrates the isolated Preview database, and uploads the prebuilt artifact. This order means a failed build does not alter the database; a failed migration blocks upload. If upload fails after a migration succeeds, the database may be ahead of the previous app version: use only reviewed backward-compatible migrations and follow a documented forward repair or application rollback plan. Do not run automatic destructive down-migrations.

Vercel CLI `curl` is used to test protected deployment URLs. The command supports deployment-specific requests and automatically obtains Deployment Protection bypass for authenticated CLI access ([CLI docs](https://vercel.com/docs/cli/curl)). The production root smoke verifies an HTTP response only; it is not the T15 user journey or persistence/provider evidence.

## 6. Temporary synthetic Preview probe

Only after the Preview deployment is protected with Vercel Authentication, the Preview database is confirmed non-production, and G04 permits a bounded test:

1. Generate a random 32-byte-or-longer probe token, store it as Vercel **Preview** secret `FOUNDATION_PROBE_TOKEN`, and set Preview `FOUNDATION_PROBE_ENABLED=true`. Keep the token out of shell tracing, shell history, source, URL query strings and logs. `openssl rand -hex 32` can generate 32 random bytes encoded as hex; store the result directly in an approved secret manager before configuring Vercel.
2. Use an authenticated Vercel CLI session linked to the project. Keep the original token in the approved secret manager and load it into the local process through that manager's protected injection mechanism. Vercel sensitive environment values are write-only; do not try to retrieve `FOUNDATION_PROBE_TOKEN` with `vercel env pull` or `vercel env run` ([environment variable docs](https://vercel.com/docs/environment-variables/manage-across-environments)). Disable shell tracing, do not paste the token into a command, and do not capture request headers in logs. Replace only the deployment URL and returned synthetic UUID; never add caller prompt, model or base URL values.

```sh
export PROBE_URL='https://<protected-preview-deployment>.vercel.app'
set +x

# Create a synthetic record; keep its returned UUID for later checks and cleanup.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=persistence-create" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"

# Replace <returned-uuid> with the create response's id.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=persistence-check&id=<returned-uuid>" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"

# Fixed synthetic SoCLaaS request; response contains only ok/classification.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=soc" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"

# Delete the synthetic record when checks are complete.
corepack pnpm dlx vercel@58.4.4 curl "/api/internal/foundation-probe?operation=persistence-delete&id=<returned-uuid>" --deployment "$PROBE_URL" -X POST -H "Authorization: Bearer $FOUNDATION_PROBE_TOKEN"
```

For persistence across redeploys, create the record, deploy the next reviewed Preview revision, then check the same UUID before deleting it. Record each probe-enabled deployment's environment, revision and URL privately so every URL can be removed afterward; do not record keys, connection strings, prompt payloads or raw provider error bodies. After checks, remove the Preview `FOUNDATION_PROBE_TOKEN` setting and set `FOUNDATION_PROBE_ENABLED=false` for future deployments, then deploy a reviewed Preview revision with the probe disabled. Vercel environment changes apply only to new deployments, so the old probe-enabled URLs retain their original settings ([environment variable behavior](https://vercel.com/docs/environment-variables)). Delete every probe-enabled deployment, including the initial check deployment and any redeploy used for persistence verification, with `vercel remove <deployment-url>` or the Vercel dashboard ([CLI removal docs](https://vercel.com/docs/cli/remove)). Verify each removed URL no longer serves the route and the new disabled deployment returns 404. Rotate the token in the approved secret manager, unset it from the local process, and do not leave the probe enabled for ordinary Preview traffic.

The route ignores request bodies and accepts only the fixed persistence operations or a fixed synthetic SoC prompt. The SoC adapter is not a public anonymous proxy. Neither successful persistence calls nor this probe complete T14/T15/T28 or either end-user AI workflow.

## Configuration inventory

| Location | Names |
| --- | --- |
| GitHub environment variables | `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; Preview additionally `VERCEL_PROJECT_INITIALIZED`. |
| GitHub environment secrets | `VERCEL_TOKEN` in `preview`, `production`, and `production-promotion`; `MIGRATION_DATABASE_URL` in `preview` and `production` only. |
| Vercel Preview/Production runtime variables | `TURNUP_ENVIRONMENT`, `DATABASE_ENVIRONMENT`, `DATABASE_URL`, `SOCLAAS_BASE_URL`, `SOCLAAS_MODEL`, `SOCLAAS_MAX_INPUT_BYTES`, `SOCLAAS_MAX_OUTPUT_TOKENS`, `SOCLAAS_TIMEOUT_MS`, `SOCLAAS_API_KEY` (secret, after G04), `FOUNDATION_PROBE_ENABLED`, `FOUNDATION_PROBE_TOKEN` (temporary Preview secret only). |
| Local process via an approved secret manager (or optional ignored `.env.local`) | `TURNUP_ENVIRONMENT`, `DATABASE_ENVIRONMENT`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `SHADOW_DATABASE_URL`, SoCLaaS settings if explicitly approved for a synthetic local check. Direct Prisma URLs use `sslmode=require&sslaccept=strict`. |

No credential values belong in this inventory. Local checks and test doubles remain distinct from intended-host persistence across requests/redeploys and live SoCLaaS reachability; record unavailable access as unrun evidence, not a pass.
