# CHG-K-014 — Per-Organiser daily generation allowance

Owner: Keith. WP-005; base `1c3785d`, isolated worktree/branch `wp-005-daily-generation`. Allocation checked across all refs/history/worktrees: maximum K-013; no concurrent K-014 assignment found. Requirement targets SEC05/06, DEP02/03/04, ORG03/07/18; scenarios T14/T22/T26/T28 portions. User approved implementation after the proposed plan and explicit policy answers.

## Accepted behaviour

Each Organiser gets 10 dispatched generation attempts per SGT calendar day per environment (Preview and Production separately). PDF extraction and FAQ generation share the allowance. Reserve 4096 output tokens per request, 40960 per day. Authentication/ownership/configuration/upload/input failures before dispatch consume neither allowance. Reserve atomically before dispatch; definitively unused reservations refund idempotently. Persist dispatch immediately before fetch; a crash around that boundary counts conservatively. Once dispatched, errors, invalid output and short output consume the attempt/full reserved tokens. No automatic retries.

One in-flight request per environment, minimum2100ms spacing. Daily rollover is database-clock/request driven, no cron. Outstanding reservations survive midnight and redeploy. Uncertain timeout/cancellation/transport outcomes retain the environment slot until guarded operator recovery; recovery never refunds dispatched usage. Session identity and server environment, never request identity/environment, scope usage. Private no-store self-only usage endpoint/display exposes no other account usage or input content.

## Scope and exclusions

Policy first: hosted activation remains disabled. Existing local synthetic settings/cumulative gate and Preview-only foundation probe remain separate and unchanged. Prepare/integrate the hosted daily gate at the generation boundary without introducing an activation bypass, arbitrary hosted model/profile or relaxing existing guards. No live provider calls, remote configuration, Production database access, deployments, purchases, dependency installation, commit/push or PR creation in this implementation assignment. Run deterministic tests and isolated synthetic database fixtures where an explicitly safe target is available. Unavailable infrastructure is recorded honestly.
