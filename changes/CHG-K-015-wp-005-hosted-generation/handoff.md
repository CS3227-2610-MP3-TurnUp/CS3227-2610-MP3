# WP-005 hosted generation handoff

Keith owns this Organiser increment. It consumes the daily accounting contract in CHG-K-014, authoritative account/session access, event ownership/version checks and private preparation revisions. The initial reviewed source is `0226e03c7e0c7804612a554e8bd0b0a811eea3dc` on `preview/wp-005-hosted`; final hosted outcome and any corrective revision are recorded in [verification](verification.md).

## Application contract

Both PDF extraction and FAQ generation use the validated hosted adapter only when `PROPOSAL_ASSISTANCE_HOSTED_ENABLED=true` and the actual environment/database pair and dedicated `ORGANISER_SOCLAAS_*` settings match. The fixed profile is qwen3.5:9b, JSON object, temperature0, no thinking, 65,536 input bytes, 4,096 output tokens and60seconds. It uses the existing durable dispatch accounting:10 attempts and40,960 reserved output tokens per Organiser, SGT admission day and environment; one environment-wide in-flight request and2,100ms spacing. Dispatched failures remain charged; uncertain calls require exact operator recovery. There are no automatic inference retries.

Validated hosted preparation storage remains available when inference is disabled, preserving owner reads, saves and manual completion. Private preparation never enters publication or Student AI. This adds no Student dependency or change to public reader inputs. Shared/local SoCLaaS settings, the local synthetic path and foundation probe are unchanged.

Apply additive migrations `20261023020000_daily_generation` and `20261023030000_generation_usage_retention` through the matching environment's existing deployment workflow and generate the Prisma client before using this runtime. The Preview workflow applies them before upload. Production deployment and migration application are outside this rollout.

## Operator contract

The new protected `/api/internal/generation-usage-retention` route requires its enable flag and strong `CRON_SECRET`; it defaults to dry-run and needs explicit `dryRun=false` for deletion. Each pass handles at most100 settled reservations and100 unreferenced daily counters in the current environment. Settled history expires90days after its SGT day ends. Active/unresolved reservations and referenced counters remain until deliberate recovery. This route does not run private-draft cleanup or reset quotas.

Preview maintenance is a daily operator invocation, as selected by Keith. [The operator guide](../../docs/wp-005-hosted-generation.md) provides configuration, exact invocation and recovery instructions. The generated ignored mode0600 `.env.preview-operator.local` in the implementation worktree contains only the operator secret; it is not committed or automatically loaded by Next. Vercel protection stays enabled.

## Delivery limits

Production activation/configuration/data were not changed. Comprehensive labelled evaluation, real private-proposal provider handling and full cross-role hosted acceptance remain separate. Current source/runtime/SQL checks, independent review findings, exact deployment identity and bounded synthetic outcomes are authoritative in verification.

## Delivered Preview state

Reviewed runtime source `19edbf4f1e1cf1056ca21539988ec1a7ffc90ed9` is deployed to Preview. Exactly one synthetic extraction and one FAQ call passed, with persisted preparation/Save Draft and exact2attempts/8192reservedtokens confirmed. The synthetic event was deleted; usage history remains. The stable Preview alias serves the same source. Preview generation stays enabled for synthetic testing; no Production activation/configuration/data operation was performed. [Verification](verification.md) records the parser and pnpm packaging corrections, independent reviews, exact workflow/candidate identities and evidence limits.
