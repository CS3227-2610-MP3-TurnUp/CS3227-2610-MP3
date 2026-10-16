# WP-003 - Manual event preparation and publication

Planned work under B1/D12; no implementation or passing runtime evidence is implied. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G03/G05/G07/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

## Scope and dependencies

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-003: manual event preparation and publication | Keith leads; Darryl reviews public contract | Own-event dashboard/search/sort, save incomplete drafts, manual completion, exact preview/approval, replacement revisions, withdrawal, cancellation, draft deletion and cancel-editing. ORG01–ORG02, ORG08–ORG13, ORG18; SHR05–SHR08, SEC01–SEC03. | WP-002 and publication contract. Begin with a valid zero-question form; WP-004 adds configurable questions. A complete manual event publishes with zero AI calls; stale approval fails and private edits do not change the live revision. |

## Bounded implementation slices

| Package / slice | Lead and responsibility areas | Ordered deliverables and planned checks | Prerequisites / limits |
| --- | --- | --- | --- |
| WP-003: private manual preparation | Keith; `src/features/organiser/`, `src/app/organiser/`, `src/server/events/`; Darryl reviews | Implement own-event grid/search/sort, incomplete draft saving, manual fields, public-only preview and Cancel Editing. Verify own-event isolation, required-field publication blocking and preservation of saved work. ORG01/02/08/18; T22/T25/T29 and relevant T02. | WP-002 guards, G03 public-field bounds and relevant G05 validation decisions. No AI dependency. |
| WP-003: publication and lifecycle | Keith; `src/server/publication/`, assigned event operations and Organiser controls; Darryl reviews | Implement exact version-bound approval, atomic publication/replacement, withdrawal, cancellation and never-published deletion. Start with a valid zero-question form. Check stale approval, private/live separation and lifecycle guards. ORG09–13, SHR06–08; T05–07/T22–25 portions. | Reviewed publication contract and account guards. Chat/registration-dependent checks finish with their consumers; G07-dependent historical suppression stays open until decided. |

## Planned acceptance targets

| Package | Planned acceptance targets in [acceptance-scenarios.md](../verification/acceptance-scenarios.md) |
| --- | --- |
| WP-003 | T05–07/T22–25/T29; chat/registration-dependent portions with their packages |

Read each applicable scenario's complete Given/When/Then and method, including coverage and evaluation guidance. Partial package evidence does not pass an entire scenario.
