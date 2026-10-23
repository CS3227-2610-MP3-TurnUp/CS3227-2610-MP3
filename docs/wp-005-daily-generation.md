# Organiser daily generation allowance

CHG-K-014 implements the [accepted policy](../specs/shared/ai-and-privacy.md#organiser-daily-hosted-generation-allowance--accepted-23-october-2026). This increment does not activate hosted inference or select a hosted model/profile. Preview and Production generation stay disabled. Local synthetic generation and the protected foundation probe keep their existing separate cumulative allowance.

## Accounting

Each authenticated Organiser gets ten dispatched calls per SGT day per environment, shared across PDF extraction and FAQ generation, all owned events and sessions. Each call reserves 4,096 output tokens; the daily maximum is 40,960 reserved output tokens. These are application limits, not provider credit, purchased tokens or a total input/output cost ceiling. No output-token refund applies to shorter responses, failed validation or provider failures after dispatch.

Database-clock SGT dates at admission select the daily record. A reservation dispatched or completed after midnight remains charged to its original admission day. Midnight creates a fresh allowance on demand; no reset job is needed. Outstanding requests survive midnight and redeploys. A shared environment slot permits one in-flight generation and at least 2,100ms between admissions. A new daily allowance does not override an occupied slot.

Authentication/ownership/configuration/invalid-input failures before dispatch consume no daily allowance. A definitively unused reservation refunds once. The durable dispatch marker is written immediately before the provider request; crash/transport ambiguity counts conservatively. No automatic retry is performed. Manual event preparation remains available after exhaustion or outage.

## Status and user feedback

`GET /api/organiser/ai-usage` is authenticated, Organiser-only and private/no-store. The server derives identity/environment; no other Organiser or environment can be queried. Active hosted usage reports daily attempts/reserved output allowance and SGT reset timestamp. Disabled/unsupported modes report no active daily usage; local testing must not be labelled as ten-per-day enforcement. Both generation controls share/refetch this status, with distinct daily-exhaustion and temporary busy/spacing messages.

## Deployment boundary

The additive migration introduces separate hosted accounting; it does not reset or rewrite existing local/probe counters. Normal release tooling must apply/check the migration and generate the client on a target before hosted accounting can be used. This implementation assignment does not apply a migration to Production, change remote configuration or call SoCLaaS. The verification record identifies actual schema/database checks separately from unrun hosting checks.

A future activation increment must select/verify the permitted model and request profile, current key limits and provider data handling, course requirements, host timeout/reachability and rollout. Merely setting the existing FOUNDATION_PROBE variables cannot enable hosted end-user generation or this daily policy. The internal foundation probe stays Preview-only.

## Recovery

An uncertain timeout/cancellation/transport outcome holds the environment slot until an operator establishes that the remote request is no longer running. Never release a slot merely because midnight passed or a deployment completed. Recovery must identify the exact reservation and environment, follow the guarded server-side recovery interface, and never refund a dispatched call. No unauthenticated recovery endpoint is supplied. Do not reset daily counters or delete other reservations to unblock a request.

Use synthetic records/isolated non-production database fixtures for development checks. Do not copy private proposals, credentials or provider output into usage records, recovery notes or test logs. Current account/90-day audit retention remains governed by the shared retention contract; a daily reset does not itself erase records or establish backup deletion.


## Automated verification

Use pinned Node24 and the existing credential-free `vitest run`, ESLint and TypeScript checks. Daily-gate fixtures exercise independent Organisers/environments, ten-call exhaustion, SGT rollover, dispatched failure/no-refund, pre-dispatch refund replay, late completion and exact operator recovery. UI fixtures cover active/disabled modes and distinct rate-limit messages. See the change verification for actual commands/results and any isolated SQL harness evidence; deterministic fixtures do not prove hosted connectivity.


### Run the isolated SQL tests

Open this increment's `wp-005-daily-generation` worktree and use Node24. Configure only the assigned development/non-production `DATABASE_URL` (pooled) and `MIGRATION_DATABASE_URL` (matching direct target), with `TURNUP_ENVIRONMENT=development` and `DATABASE_ENVIRONMENT=non-production`, using the [local setup guide](wp-005-proposal-integration.md#3-configure-browser-testing). Do not supply Production configuration or hosted Vercel markers. No SoCLaaS key is required.

```sh
NODE_ENV=development \
RUN_DAILY_GENERATION_DB_INTEGRATION=1 \
DAILY_GENERATION_DB_TARGET_ACK=development-non-production-only \
node node_modules/vitest/vitest.mjs run --config tests/proposal-assistance/vitest.database.config.ts
```

The test checks target labels and matching URLs, creates a uniquely named synthetic schema, applies the new accounting DDL only inside it, and removes/verifies that schema at teardown. It does not migrate or reset the public application schema, touch real Organiser rows or make provider calls. Ordinary `node node_modules/vitest/vitest.mjs run` skips these three database tests. The separate explicit SQL run passed all three on the assigned non-production target; it does not establish hosted connectivity.

### Exact recovery interface

The privileged server-only helper is `recoverDailyGenerationReservation(db, environment, reservationId, confirmationId)` in `src/server/ai/daily-generation.ts`. The confirmation must equal the exact reservation UUID. Establish the target environment and inspect its active reservation/status without retrieving proposal content; establish separately that provider execution has ended before calling the helper through trusted operator tooling. The helper refuses mismatched environment/confirmation, refunds only an undispatched RESERVED reservation, and releases DISPATCHED/UNCERTAIN work without changing its original daily counters. Repeated recovery is idempotent. Never expose this helper through an unauthenticated route or release another active reservation.

Usage-record/audit cleanup and actual backup expiry must be addressed before hosted activation under the shared retention contract. This dormant-policy increment does not implement a metadata expiry job or claim backup erasure.
