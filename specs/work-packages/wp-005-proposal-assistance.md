# WP-005 - Temporary proposal assistance

Full package remains incomplete under B1/D12; the delivered local extraction slice is recorded in [CHG-K-010](../../changes/CHG-K-010-wp-005-proposal-integration/verification.md), and local synthetic clarification/server resolution in the [CHG-K-011 handoff](../../changes/CHG-K-011-wp-005-clarification/handoff.md). Scoped checks do not establish full package or hosted acceptance. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G03/G04/G06/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

## Scope and dependencies

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-005: temporary proposal assistance | Keith leads; Darryl reviews exclusion boundary | Temporary server-side PDF extraction, partial fields, bounded clarification, supported Other suggestions, private drafts/evidence and stale-result protection. ORG03–ORG08, ORG18; SEC01–SEC06. | WP-003 manual path and verified PDF/model budgets. No original PDF/full raw extraction persists; malformed inputs fail safely and manual publishing remains available. |

## Bounded implementation slices

| Package / slice | Lead and responsibility areas | Ordered deliverables and planned checks | Prerequisites / limits |
| --- | --- | --- | --- |
| WP-005: temporary proposal assistance | Keith; Organiser assistance and assigned `src/server/ai/` extraction/generation files; Darryl reviews privacy boundary | Implement select-without-upload, bounded temporary Generate processing, partial facts, targeted clarification and editable supported candidates/Other. Check cleanup on success/failure, no invented required facts, explicit replacements and delayed-result rejection. ORG03–08/18, SEC01–06; T03–05/T13/T14/T22/T26 portions. | WP-003 manual path, verified G04 limits/provider handling and agreed private-preparation retention contract. Manual publishing remains available on dependency failure. |

## Planned acceptance targets

| Package | Planned acceptance targets in [acceptance-scenarios.md](../verification/acceptance-scenarios.md) |
| --- | --- |
| WP-005 | T03–05/T13/T14/T22/T26 |

Read each applicable scenario's complete Given/When/Then and method, including coverage and evaluation guidance. Partial package evidence does not pass an entire scenario.

## Assigned extraction integration — 22 October 2026

Keith assigned [CHG-K-010](../../changes/CHG-K-010-wp-005-proposal-integration/change.md) from master1f0aa87, selectively reusing the paused uncommitted CHG-K-007 prototype in a new worktree. This is working authenticated extraction and Generate-to-prefill field preparation in the current editor, with page-local findings and existing draft/publication operations. Public drafting/FAQ suggestions, durable private-preparation storage and hosted activation are outside this slice. Scoped targets and actual checks are tracked in its verification; planned work above remains the full WP-005 target.


## Assigned clarification slice — 23 October 2026

[CHG-K-011](../../changes/CHG-K-011-wp-005-clarification/handoff.md) is locally implemented and independently reviewed from source base `9d651e8`: owner-only structured clarification persistence, explicit confirmations committed with Save Draft, and server preview/publication issue enforcement. It supersedes page-local issue state for the synthetic/non-production slice. Its additive migration is applied to the assigned development target; other targets must verify/apply it separately. Full331-test/lint/type/build and direct rollback-only database evidence, plus browser/live-model/replay limitations, are in its verification record. ORG07, production retention/hosted activation and comprehensive evaluation remain unfinished; no next-increment design is implied.


## Assigned public-candidate slice — 23 October 2026

[CHG-K-012](../../changes/CHG-K-012-wp-005-public-candidates/change.md) is locally implemented from cb6179d for editable page-local FAQ/Other candidates (duplicate description suggestion removed by the accepted refinement), optional organiser questions and explicit application using the saved resolved public snapshot. Production retention/hosted activation and comprehensive model evaluation remain separate. Actual checks and independent review are recorded in its verification and handoff; local deterministic evidence is not complete ORG07/full-WP-005 model acceptance.


## Private draft retention — CHG-K-013

The [retention handoff](../../changes/CHG-K-013-wp-005-draft-retention/handoff.md) records locally implemented/independently reviewed Organiser30-day draft cleanup andday23warnings, with assigned non-production migration and actual worker fixtures. It resolves those draft mechanics only; hosted job activation, actual backup-window/erasure evidence, global90-day personal/account policy and G04 remain separate. Keith confirmed the prior assisted browser walkthrough; comprehensive labelled evaluation is deferred to post-WP-005 refinement.


## Per-Organiser daily hosted usage — CHG-K-014

The [accepted SEC05 policy](../shared/ai-and-privacy.md#organiser-daily-hosted-generation-allowance--accepted-23-october-2026) gives each Organiser10shared PDF/FAQ attempts per SGT day per environment,4096reserved output tokens/call and40960/day. [Change record](../../changes/CHG-K-014-wp-005-daily-generation/change.md) tracks implementation/evidence. This is policy-first with hosted generation disabled; existing local synthetic/probe counters and Student chat remain separate.


## Hosted adapter/Preview rollout — CHG-K-015

The [hosted guide](../../docs/wp-005-hosted-generation.md) defines default-off Organiser-specific provider configuration, fixed9B JSON/no-thinking/60s profile, daily-limit integration, hosted preparation storage independent of inference activation, and bounded90day settled usage cleanup. Rollout and actual evidence are tracked in [verification](../../changes/CHG-K-015-wp-005-hosted-generation/verification.md). Production activation, real private-data provider handling/course evidence and comprehensive labelled evaluation remain separate.
