# WP-007 - Retention, integrated security and release evidence

Planned work under B1/D12; no implementation or passing runtime evidence is implied. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G04/G06/G07/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

## Scope and dependencies

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-007: retention, integrated security and release evidence | Keith leads retention/deployment/release integration; Darryl reviews; both provide role evidence and cross-review authored work | Cleanup/anonymisation, derived-copy handling, adversarial/benign fixtures, role integration, hosted demonstration, migration/rollback and contribution evidence. SEC01–SEC07, DEP01–DEP04, DEV01–DEV03; affected role requirements. | Relevant feature packages and final cleanup decisions. Record deterministic and controlled live-model evidence separately; verify the hosted workflow without a developer laptop. |

## Bounded implementation slices

| Package / slice | Lead and responsibility areas | Ordered deliverables and planned checks | Prerequisites / limits |
| --- | --- | --- | --- |
| WP-007: cleanup and integrated release | Keith leads retention/database/release integration; Darryl supplies Student checks and reviews; both provide role evidence | Implement agreed cleanup without deleting live publications; verify derived-copy handling and all-exit temporary cleanup. Run affected role/security/concurrency regressions, bounded live-model evaluation and the complete hosted walkthrough; record migration/recovery and contribution evidence. SEC01–07, DEP01–04, DEV01–03; T13–15/T26–28 and affected scenarios. | G06/G07 policy decisions, relevant implemented flows and G08 release design. Unavailable or failed checks remain explicit; required release checks must pass. |

## Planned acceptance targets

| Package | Planned acceptance targets in [acceptance-scenarios.md](../verification/acceptance-scenarios.md) |
| --- | --- |
| WP-007 | T13–15/T26–28 and regression evidence for the other targets |

Read each applicable scenario's complete Given/When/Then and method, including coverage and evaluation guidance. Partial package evidence does not pass an entire scenario.
