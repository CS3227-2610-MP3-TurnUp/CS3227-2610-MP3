# WP-005 - Temporary proposal assistance

Planned work under B1/D12; no implementation or passing runtime evidence is implied. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G03/G04/G06/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

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
