# Hosted Organiser generation

CHG-K-015 connects the [daily allowance](wp-005-daily-generation.md) to the hosted provider. Activation is separately configured per environment and defaults off. This rollout targets synthetic Preview testing only; Production generation remains disabled. Local synthetic generation and the foundation probe keep their original settings and counters.

## Server configuration

In the existing Vercel `turnup` project, configure these variables for **Preview only**. The project deliberately uses CLI deployments without a Git connection; use the dedicated Organiser namespace rather than changing shared `SOCLAAS_*` settings used by other consumers.

| Name | Selected value |
| --- | --- |
| `PROPOSAL_ASSISTANCE_HOSTED_ENABLED` | `false` until deployment/preflight succeeds; then `true` |
| `ORGANISER_SOCLAAS_API_KEY` | Permitted assigned key; Secret/sensitive |
| `ORGANISER_SOCLAAS_BASE_URL` | `https://soclaas-api.comp.nus.edu.sg/v1` |
| `ORGANISER_SOCLAAS_MODEL` | `qwen3.5:9b` |
| `ORGANISER_SOCLAAS_MAX_INPUT_BYTES` | `65536` |
| `ORGANISER_SOCLAAS_MAX_OUTPUT_TOKENS` | `4096` |
| `ORGANISER_SOCLAAS_TIMEOUT_MS` | `60000` |
| `GENERATION_USAGE_RETENTION_ENABLED` | `true` |
| `CRON_SECRET` | Random operator secret, at least32 bytes; Secret/sensitive |

Existing `TURNUP_ENVIRONMENT=preview`, `DATABASE_ENVIRONMENT=non-production`, matching database/auth settings and Vercel runtime markers must remain valid. Hosted profile settings do not fall back to shared/local `SOCLAAS_*`. Keep Production activation absent/false. No public request can select a model, endpoint, profile or caller identity.

The provider profile uses JSON-object output, temperature0 and no thinking. A60-second timeout applies only to this validated explicit profile; generic provider requests retain their30-second ceiling and the local synthetic profile retains its existing60 seconds. Both generation routes export maxDuration120; verify actual host support. The actual project preflight reports Node24 and Fluid Compute enabled. Neither selected configuration nor a local build proves hosted reachability.

## Deploy and verify

1. Commit the reviewed source and push the assigned `preview/wp-005-hosted` branch through the existing workflow. Other unprefixed branches do not trigger this deployment path. Confirm checks/build, the daily-accounting and retention-index migrations, upload and alias assignment all succeed.
2. With inference off, verify the owner usage endpoint reports disabled and the protected maintenance endpoint rejects unauthenticated calls. Run maintenance dry-run and then explicit actual mode on the synthetic Preview target.
3. Enable the Preview activation variable and redeploy the same reviewed revision; environment changes do not update an existing deployment. Verify `/api/organiser/ai-usage` reports the active self-only allowance.
4. Use a designated synthetic Organiser and non-private fixture. Make at most one proposal extraction and one FAQ generation call. Verify persisted preparation/manual save and daily usage increments across fresh requests. Do not publish fixture events. Delete only generated test events; retain required usage history and its synthetic owner.
5. If either live check fails, disable Preview and redeploy without extra model calls. Record truthful outcomes and charged usage; inspect/recover uncertain leases only after establishing remote execution ended. After both pass, Preview may remain enabled for synthetic testing. Production rollout and comprehensive labelled evaluation are separate.

The application reserves4,096 output tokens per dispatched call, regardless of output length/validation outcome. Daily limits use SGT admission dates; provider spend windows use UTC and are independent. No automatic retry, refill, quota purchase or counter reset is involved.

## Daily Preview usage-history maintenance

Vercel's configured cron is Production-only and belongs to private-draft cleanup. This new usage-maintenance route does not invoke it. Run the following **daily** as the Preview operator using the installed authenticated Vercel CLI and the exact Preview deployment URL:

```sh
# Load only the privately stored operator secret, never commit or print it.
set -a
. ./.env.preview-operator.local
set +a

# Default is dry-run; this explicit form is easier to recognise in records.
vercel curl '/api/internal/generation-usage-retention?dryRun=true' \
  --deployment "$PREVIEW_URL" \
  --header "Authorization: Bearer $CRON_SECRET" \
  --fail --silent --show-error --max-time 60

# Request the bounded deletion pass explicitly after checking the target/report.
vercel curl '/api/internal/generation-usage-retention?dryRun=false' \
  --deployment "$PREVIEW_URL" \
  --header "Authorization: Bearer $CRON_SECRET" \
  --fail --silent --show-error --max-time 60
```

The generated `.env.preview-operator.local` is ignored and mode0600 in this worktree. It contains only the operator secret. Keep it private or transfer it to the operator's secret manager. Vercel deployment protection remains enabled; CLI authentication supplies its separate access mechanism. Do not use a bare `vercel` invocation for inspection or maintenance.

Each pass processes only the validated current environment, at most100 settled reservations and100 unused daily rows. Expiry is90days after the SGT usage day ends. Dry-run predicts the bounded pass, including counters made unreferenced by its reservation batch. If a batch is full, additional deliberate passes may be needed to drain backlog. Unresolved/active reservations and their counters survive; a corrupt active pointer fails closed. Cleanup never releases a slot, resets a current allowance, refunds dispatched calls or reads proposal content. Scheduling automation is deferred by explicit decision.

## Recovery and limitations

The existing exact-reservation [recovery interface](wp-005-daily-generation.md#exact-recovery-interface) remains authoritative. Disabling inference leaves validated stored preparation readable/editable and manual completion available. Usage records contain no PDF, prompt, generated text or event content. Settled active-row cleanup does not prove deletion from provider backups. Provider data handling/course eligibility for real private proposals remains distinct from bounded synthetic testing.

Actual test counts, independent findings, deployment revision and hosted outcomes are recorded in [CHG-K-015 verification](../changes/CHG-K-015-wp-005-hosted-generation/verification.md).

## Built PDF parser regression

Source parser tests do not reproduce Next's production bundling. After a sanitized production webpack build, run the opt-in artifact check with the pinned Node version and this worktree's dependencies:

```sh
PDF_TEXT_BUILD_DIR="$BUILD_ROOT/.next/server/app/api/organiser/events/[id]/proposal-extraction" \
  node node_modules/vitest/vitest.mjs run \
  tests/proposal-assistance/pdf-text-built-runtime.test.ts
```

`BUILD_ROOT` is the directory containing the completed sanitized build. This check asserts the extraction route's trace includes PDF.js, its worker and standard fonts, copies only those traced package assets into a fresh temporary runtime, and parses a synthetic PDF with the compiled parser. It makes no database/provider call. Ordinary source tests skip this build-dependent check unless `PDF_TEXT_BUILD_DIR` is supplied.
