# WP-004 - Student discovery and transactional registration

Planned work under B1/D12; no implementation or passing runtime evidence is implied. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G03/G05/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

## Scope and dependencies

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-004: Student discovery and transactional registration | Darryl owns Student flow and registration contract; Keith owns Organiser form/roster flow; cross-review affected contracts | Approved event discovery/details, versioned custom forms, atomic join/cancel/rejoin, submission correction, My Events, capacity updates and owner roster. PAR01–PAR05, PAR13–PAR15; ORG14, ORG19–ORG20; SHR06–SHR08, SEC07. | WP-003 public contract; agree form limits and relevant schedule rules. Last-place race has one winner; retries use no extra seats; private snapshots and historical form wording remain intact. |

## Bounded implementation slices

| Package / slice | Lead and responsibility areas | Ordered deliverables and planned checks | Prerequisites / limits |
| --- | --- | --- | --- |
| WP-004: forms and registration | Darryl leads the shared contract and `src/server/registration/` plus Student flow; Keith owns Organiser form configuration; reciprocal review | Agree G03 form/answer bounds and relevant G05 rules; implement immutable form versions and atomic join/cancel/rejoin. Verify required/type/choice validation, stale forms, idempotency and the last-place race. ORG19, PAR03/04/13/14, SHR06–08; T08/T17/T19/T21/T24. | WP-003 publication/zero-question contract. Keith coordinates any shared migration writes from Darryl's data requirements. |
| WP-004: discovery and retained submissions | Darryl owns `src/features/student/` and `src/app/student/` discovery/My Events/answer correction; Keith owns roster and historical-answer presentation; reciprocal review | Implement approved-only discovery/details, code-derived capacity, own registration state, captured optional profile/answers, immutable corrections and change flags. Check submission privacy, captured wording, profile independence and capacity-floor rejection. PAR01/02/05/15, ORG14/20, SEC07; T16/T18/T20/T23/T30. | Registration/publication contracts and relevant G05 decisions. Coordinate public-read and roster files explicitly with their contract leads. |

## Planned acceptance targets

| Package | Planned acceptance targets in [acceptance-scenarios.md](../verification/acceptance-scenarios.md) |
| --- | --- |
| WP-004 | T08/T17–21/T23/T24/T30; optional-profile integration T16/T20 |

Read each applicable scenario's complete Given/When/Then and method, including coverage and evaluation guidance. Partial package evidence does not pass an entire scenario.
