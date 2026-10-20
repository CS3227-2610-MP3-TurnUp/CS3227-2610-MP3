# WP-001 foundation verification and handoff

Execution record: [CHG-K-006](../changes/CHG-K-006-foundation-handoff/verification.md). Runbook existence is not a passed check. Use this with the [hosting setup guide](wp-001-hosting-setup.md), not as a replacement for its protection, secret-placement or probe-retirement requirements.

## Current source and prerequisite gates

Base `05e1b42c69ce57d389172a5b0c290d08ff0c729e` includes the reviewed CHG-K-004 foundation and CHG-K-005 hosting/provider implementation. [Production run 39309092029](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/actions/runs/39309092029) passed its local gates (115 tests), Vercel build/upload, migration status (two migrations, none pending), candidate project/target/source/HTTP verification and promotion. It does not prove runtime database persistence, replay/upgrade/recovery or live SoC. CHG-K-006 subsequently passed the separate non-production connection/replay/upgrade, gate integration, protected Preview redeploy persistence and synthetic restore checks described below. Its verification record carries identities, counts, retirement and independent review. The provider handoff remains incomplete under G04.

Before each live operation, identify the exact approved non-production project/branch/database and its owner. Confirm it contains synthetic data only, credentials have the intended permissions, and the provider allowance covers the operation. Labels/URL shape alone cannot establish project identity. Keith supplies non-secret Production configuration facts; agents do not retrieve Production credentials or query Production. Verify PostgreSQL 18 is actually used; the selected design permits PostgreSQL 17 only as an explicitly recorded fallback for both environments.

| Target | Use | Isolation rule |
| --- | --- | --- |
| Development | Runtime/direct connection and ordinary persistence test | Existing synthetic development resource; no resets/restores |
| Replay + shadow | Fresh migration replay, first-to-second migration upgrade, migration-development compatibility | Separate disposable empty replay database and a different disposable shadow database; no shared development/Preview target |
| Gate test | Real SQL admission/concurrency tests | Separate disposable branch/database named `turnup_soc_probe_gate_test`; never the live Preview gate |
| Recovery | Synthetic loss/restore exercise | Dedicated disposable resource supporting the actual account's restore operation; no shared database |
| Protected Preview | Persistence across requests/redeployment and optional SoC | Separate non-production branch/database; all probe-enabled Preview deployments share this database/gate |

## Private local configuration

Worktree: `.worktrees/foundation-handoff`, branch `6-foundation-handoff`. An ignored mode-0600 `.env.local` template is prepared there. Keith can reuse previously created **synthetic non-production development** URLs:

| Name | Value to enter privately |
| --- | --- |
| `TURNUP_ENVIRONMENT` | `development` |
| `DATABASE_ENVIRONMENT` | `non-production` |
| `DATABASE_URL` | Development pooled Neon URL, with runtime TLS (`sslmode=require` or `verify-full`) |
| `MIGRATION_DATABASE_URL` | Direct URL to the same development database, with exactly one `sslmode=require` and `sslaccept=strict` |
| `SHADOW_DATABASE_URL` | Direct URL to a separate disposable shadow database with the same strict Prisma TLS parameters |

Keep credentials out of chat, source, command arguments, shell tracing and evidence. Do not `source` an environment file as shell code. For other targets create separate ignored mode-0600 files from the empty `.env.example`: `.env.replay.local`, `.env.gate.local`, `.env.recovery.local`. Populate each with its own complete labels and URLs. The gate file additionally needs `SOC_PROBE_GATE_TEST_DATABASE_NAME=turnup_soc_probe_gate_test`. Do not switch the ordinary development file to a destructive-test target.

Use Node `24.21.0` and pnpm `12.14.0`, as pinned by the repository. The `node --env-file=... node_modules/...` commands below load target values before the installed, pinned Prisma/Vitest entry point starts; they do not use Node's `--run` shortcut. This matters because Vitest sets `NODE_ENV=test`; Next's test-mode environment loading does not automatically load `.env.local`. Before running a block, clear previously injected target variables as shown so they cannot override the selected file. Never run a block until that file's target has been verified. Retain raw database/provider diagnostics only in private temporary storage; share sanitized classifications/counts, not connection details or raw provider bodies.

## Database checks

1. Confirm the pinned frozen install and prerequisite migration SQL from the reviewed source. Read `prisma/migrations/20261018000000_foundation_probe/migration.sql` and `20261019000000_soc_probe_gate/migration.sql`; do not edit their history. Confirm pooled/direct URLs resolve to the intended same development database using private provider metadata. Query server major and a synthetic marker only; never query private tables.
2. Inspect development migration status. The command must reach the intended direct connection; a configuration rejection is negative evidence, not a successful connection:

```sh
(
  set -e
  set +x
  unset DATABASE_URL MIGRATION_DATABASE_URL SHADOW_DATABASE_URL TURNUP_ENVIRONMENT DATABASE_ENVIRONMENT VERCEL_ENV NODE_ENV
  node --env-file=.env.local node_modules/prisma/build/index.js migrate status
)
```

3. On the separate **empty replay target**, apply the two reviewed migrations through this assigned verification task, inspect status, and run `db:migrate:dev` with the separate shadow target. Expect the schema to be in sync and no new migration; if Prisma proposes a reset or schema change, stop and inspect rather than accepting it. These commands are never a substitute for the release workflow on shared/Production databases:

```sh
(
  set -e
  set +x
  unset DATABASE_URL MIGRATION_DATABASE_URL SHADOW_DATABASE_URL TURNUP_ENVIRONMENT DATABASE_ENVIRONMENT VERCEL_ENV NODE_ENV
  node --env-file=.env.replay.local node_modules/prisma/build/index.js migrate deploy
  node --env-file=.env.replay.local node_modules/prisma/build/index.js migrate status
  node --env-file=.env.replay.local node_modules/prisma/build/index.js migrate dev
)
```

4. Exercise the upgrade separately on a second empty disposable database. Use a temporary copy of the reviewed Prisma config/schema/config-loader and migrations with only the first migration present; do not remove files from the worktree or run reset. Apply that first migration, insert a synthetic UUID row, then restore the unchanged second migration into the temporary migration directory and apply it. Verify the row remains, all gate tables/seed exist and the migration history contains both completed migrations. Record resource identity and exact commands privately; record only sanitized results in verification. This temporary-copy fixture never enters production migration history.
5. Run the ordinary persistence test against the migrated synthetic development database. It performs two concurrent creates using one UUID, checks the row, deletes it and verifies absence:

```sh
(
  set -e
  set +x
  unset DATABASE_URL MIGRATION_DATABASE_URL SHADOW_DATABASE_URL TURNUP_ENVIRONMENT DATABASE_ENVIRONMENT VERCEL_ENV NODE_ENV RUN_SOC_PROBE_GATE_DB_INTEGRATION
  RUN_FOUNDATION_DB_INTEGRATION=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run --config tests/foundation/vitest.database.config.ts
)
```

6. Apply reviewed migrations to the dedicated disposable gate database, then run the existing opt-in suite. It resets gate state and must never use the shared Preview database. Expect real concurrent admission, independent lease release, strictest-limit persistence and cumulative attempt/token limits without any provider call:

```sh
(
  set -e
  set +x
  unset DATABASE_URL MIGRATION_DATABASE_URL SHADOW_DATABASE_URL TURNUP_ENVIRONMENT DATABASE_ENVIRONMENT VERCEL_ENV NODE_ENV SOC_PROBE_GATE_TEST_DATABASE_NAME
  node --env-file=.env.gate.local node_modules/prisma/build/index.js migrate deploy
  RUN_FOUNDATION_DB_INTEGRATION=1 RUN_SOC_PROBE_GATE_DB_INTEGRATION=1 node --env-file=.env.gate.local node_modules/vitest/vitest.mjs run --config tests/foundation/vitest.database.config.ts
)
```

Record each command's exit/result and test count separately. An ordinary 115-test run is not a live database test. Remove only this increment's disposable resources after recording recovery/persistence evidence; do not delete Keith's development/shadow database or another change's fixtures.

## Protected Preview persistence

Confirm the actual Preview deployment is protected with Vercel Authentication, target labels are `preview`/`non-production`, database is the approved synthetic Preview resource and the internal token is temporary. The read-only GitHub check found `VERCEL_PROJECT_INITIALIZED=true`; this flag alone establishes none of those other facts. Use the existing workflow on a protected one-segment Preview branch and exact reviewed source. Record the workflow run, source commit, build-output/deployment identity, target and URL for each deployment. No Production deployment is needed for these checks.

Use the [existing protected probe commands](wp-001-hosting-setup.md#6-temporary-synthetic-preview-probe): create a caller-known UUID, retry using the same UUID, and check it in a later request. Redeploy the same reviewed source through the workflow, checking it points to the same Preview database; check the same UUID from the new deployment, then delete and verify absence. The HTTP root smoke is insufficient. Do not pass `--token` to Vercel CLI 58.4.4 `curl`; use privately injected `VERCEL_TOKEN` as the setup guide specifies.

Use the existing database/probe interfaces unchanged; do not add a public diagnostic endpoint or a new product model. Keep SoC disabled by leaving its required configuration unset until G04 is satisfied. Enabling persistence does not authorise a provider request.

## Recovery exercise

Choose the dedicated disposable recovery target before any mutation. Verify its actual restore API/console capability and current history window. Neon documents restore/history limitations and branch operations in its [plan](https://neon.com/docs/introduction/plans) and [branch](https://neon.com/docs/manage/branches) documentation; these are not proof that a particular account is configured or eligible. If unavailable, record recovery as unrun and retain the database-handoff blocker; do not silently substitute a paid upgrade or claim reset/replay is data recovery.

Apply reviewed migrations, write one synthetic marker, and record a provider-confirmed recoverable timestamp after that commit. Delete only that marker, then perform the provider-supported restore within the verified window on the dedicated disposable target. Reconnect, verify the marker and both migration records, and run the ordinary row persistence check there. Record elapsed restore/reconnect time, the restored point and any writes intentionally lost after that point. Any application-version rollback requires a separate demonstrated schema-compatibility check; a successful database restore does not establish it. No automated destructive down-migration or Production restore is part of this exercise.

## G04 and the bounded SoC check

Keith selected the following non-secret configuration in the 20 October 2026 implementation conversation:

| Setting | Selected value |
| --- | --- |
| `SOCLAAS_MODEL` | `qwen3.8:27b` |
| `SOCLAAS_MAX_INPUT_BYTES` | `65536` |
| `SOCLAAS_MAX_OUTPUT_TOKENS` | `4096` |
| `SOCLAAS_TIMEOUT_MS` | `30000` |

These match the adapter's ceilings; selection does not prove key permission, model support, remaining budget, handling or course compliance. Keith supplies the key privately; the server-owned base URL remains `https://soclaas-api.comp.nus.edu.sg/v1`. Before activation, record authoritative permission/handling/course sources and actual remaining allowance. If verified provider limits are lower, stop and obtain an explicit revised selection before changing the selected values.

For this activation set `FOUNDATION_PROBE_SOC_MAX_ATTEMPTS=1`, `FOUNDATION_PROBE_SOC_MAX_IN_FLIGHT=1`, and `FOUNDATION_PROBE_SOC_OUTPUT_TOKEN_BUDGET=4096` only if the verified allowance supports one full selected reservation. Keith must supply a verified positive `FOUNDATION_PROBE_SOC_MIN_INTERVAL_MS` at least as restrictive as the provider's applicable spacing. Confirm the durable gate has an explicitly authorised unused allowance; do not silently reset an existing gate or loosen its latched policy. Unknown limits or uncertain earlier work keep the probe disabled.

Make one `operation=soc` request from the protected intended-host deployment with the fixed synthetic prompt. Success is normalized `READY`, returned only as `ok: true`; no caller prompt/model/base override or raw completion belongs in evidence. Make a second request to confirm the durable cap returns `429 rate_or_budget_limited` without another provider attempt. A timeout/unknown transport result consumes the activation and may retain its lease: stop, disable and follow the existing operator recovery procedure; no automatic retry/reset. A failed live call remains failed/unavailable evidence, never a successful connectivity claim. Missing/revoked key, model denial, provider rate failure, invalid response, timeout and cancellation remain deterministic-test results unless separately exercised live.

## Retirement and two handoffs

Delete this increment's synthetic rows, disable/unset the temporary Preview probe/token settings, deploy the disabled reviewed revision and verify the route returns 404. Environment changes do not retire old deployments: remove every probe-enabled deployment created for these checks, including the redeploy, and verify each old URL no longer serves it. Rotate the temporary probe token privately. Handle uncertain provider leases only after provider cessation and old-deployment retirement as described in the setup guide; never add a public reset route. Remove disposable replay/gate/recovery resources and their local credential files when no longer needed, preserving unrelated resources.

Record two separate outcomes in CHG-K-006 verification:

- **Foundation → accounts:** exact source/runtime/package/database major, configuration names/isolation, actual direct/pooled/shadow checks, replay/upgrade/integration, hosted persistence, recovery and cleanup, plus remaining findings. Until these pass, hand off preparation information without claiming accounts implementation readiness.
- **Provider → AI consumers:** selected model/configuration, verified permission/limits/handling/course facts, intended-host result/admission denial and retirement, or precise unresolved prerequisites. An incomplete provider outcome does not block an otherwise completed database handoff.

Darryl still resolves G01/G02 and supplies the accounts/session/role-guard contract before Keith implements WP-003. Keith can prepare public-field bounds and scheduling decisions G03/G05 meanwhile. G06/G07 remain with their affected retention/history features. Probes cannot pass complete T13/T14/T15/T28 or either user-facing AI workflow.
