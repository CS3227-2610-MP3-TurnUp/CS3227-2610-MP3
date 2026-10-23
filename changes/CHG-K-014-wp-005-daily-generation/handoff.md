# K-014 daily generation handoff

Keith owns this WP-005 increment from `1c3785d`, isolated branch/worktree `wp-005-daily-generation`. Canonical behaviour is the [SEC05 daily allowance](../../specs/shared/ai-and-privacy.md#organiser-daily-hosted-generation-allowance--accepted-23-october-2026); scoped T14/T22/T26/T28 scenarios are in the acceptance document. [Verification](verification.md) separates actual checks from unrun infrastructure.

The new daily accounting is for future hosted Organiser extraction/FAQ calls: per account/environment/SGT day10 attempts and40,960 reserved output tokens,4,096 per dispatch. Environment-wide one-in-flight/2,100ms spacing survives midnight. Current local synthetic and foundation-probe paths retain their separate original guards/accounting. Hosted generation is code-disabled, with no environment-variable activation path in this increment.

The self-only private/no-store `GET /api/organiser/ai-usage` contract and finite 429 limit metadata are defined in `src/lib/generation-usage.ts`. Disabled/unsupported environments return no active daily snapshot. Callers supply owner identity only from authoritative server access checks, never client data. UI uses one shared usage state across extraction and FAQ actions and preserves all event/stale-result guards.

The additive migration creates accounting tables, dispatch/reservation state and two environment gate rows without touching prior local counters. Deployment needs normal migration/client generation; this assignment does not mutate hosted configuration, access Production data or activate/call the provider. No reset cron. Operator recovery must use exact reservation/environment and never refund dispatched calls; see [operator/testing guide](../../docs/wp-005-daily-generation.md).

No Darryl implementation is a prerequisite for this Organiser policy. Student chat must receive its own agreed usage policy; do not silently consume these counters. Future hosted activation remains dependent on reviewed model/profile/timeout, provider/course/data handling and intended-host evidence. Usage metadata/audit cleanup and backup expiry must follow the shared retention contract before active operation; daily rollover alone is not erasure.


Delivered locally/uncommitted and independently reviewed. Full407/44 ordinary suite, static checks and isolated production build passed; separate final checked-inSQL suite3/3 passed with no residual schema. Final27-path fingerprint d4a17f6f3225f32e674ebbdd988767d01668fca0c4c77a65807c0ba0e755171b. No application migration, provider call, commit/push or hosted activation. Use the dedicated database test config/guide for reproducible opt-in checks. Reservation day is selected at admission, including dispatch/completion after midnight.
