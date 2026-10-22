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
