# Integration handoffs and evidence

Read with the [implementation plan](implementation-plan.md) and the affected [package plans](implementation-plan.md#dependency-ordered-work-packages). B1/D12 responsibilities and planned checks are unchanged; this guide is not implementation evidence.

## Integration checkpoints and independent preparation

These checkpoints make the existing dependency handoffs concrete. They do not require both humans to be online simultaneously. Record the producing revision, affected contract/scenario IDs, reviewer evidence, checks and remaining gates in the assigned change records. Integrate prerequisites and rerun affected checks before relying on the integrated behaviour; neither a clean merge nor a test double establishes compatibility by itself.

| Handoff | Producer → consumer | Required handoff contents | Independent work while waiting |
| --- | --- | --- | --- |
| Foundation → accounts | Keith → Darryl | Application/setup revision, selected runtime/data/migration approach, isolated configuration names without secrets, reproducible local checks, hosted feasibility results and outstanding access/limits. | Darryl prepares account decisions, contract details and acceptance cases; Keith continues unrelated feasibility checks. |
| Accounts → publication | Darryl → Keith | Stable identity and fixed-role/session operations, ownership-check conventions, credential-policy decisions, assigned database changes and actual access-test results. | Keith prepares manual event/publication design against the proposed contract; dependent implementation waits for its agreed prerequisite. |
| Publication → registration and both AI flows | Keith → Darryl and Organiser consumers | Required fields, approved public representation/form revision, state transitions, stale-version outcomes, safe public reads and invalidation behaviour; review and actual scoped checks. | Both prepare fixtures and role-specific design; shared-contract or policy blockers affect only dependent work. |
| Forms/registration → Organiser configuration/roster | Darryl → Keith; consumer feedback to Darryl | Question/option identities and bounds, publication/form/submission versions, captured profile/answer access, atomic capacity/idempotency outcomes and shared migration handoff. | Each implements disjoint role files after contract agreement, then verifies the integrated publish-form → join → roster → correct/cancel flow. |
| AI provider and source/thread contracts → FAQ/inbox | Keith → Darryl for provider/budgets; Darryl → Keith for source/thread delivery | Bounded provider interface/failures, approved-source inputs/evidence validation, private-data exclusions, recipient resolution, commit/idempotency outcomes and revision invalidation. | Build disjoint Student/Organiser consumers against agreed contracts; integrate ask → forward → reply → view and new-publication reuse. |
| Features → release | Both role owners → Keith-led integration, Darryl reviews | Implemented portions and exact tested revisions, remaining findings/gates, retention results, migrations/recovery, deterministic and live-provider evidence, hosted cross-role walkthrough. | Continue fixes or unaffected scoped work; do not represent partial package evidence as full scenario completion. |

## Agent assignments and evidence

| Specialist | When used | Bounded output and handoff |
| --- | --- | --- |
| SDD Coordinator / Project Manager | Before work and at dependent handoffs | Assignment plan, single writers/reviewers, source/spec revision, requirement/scenario IDs, paths, dependencies and actual status/evidence. |
| Requirements Analyst | Before a new or changed behaviour | Reconciled affected specs, explicit open decisions and observable acceptance scenarios. Avoid rewriting unrelated role scope. |
| Repository Workflow Builder | After the file-level scope is assigned | Agreed repository/process artifacts. The setup definition is not blanket authority to implement application features; future implementation assignments identify the needed implementer and skills. |
| Independent Specification Reviewer | After authorship and after material corrections | Read-only contradiction/privacy/traceability audit, file/ID-specific findings and rechecks; no claim to independently review own authored work. |

Historical setup on 16 October 2026 activated all four specialists. The Builder and Analyst authored disjoint outputs; Coordinator received sequential ownership of this plan and setup tasks/evidence; the parent agent integrated their staged files. Historical findings and check results are recorded in [setup verification](../changes/CHG-K-000-sdd-repository-setup/verification.md).

For application work, each change records what was specified, implemented and actually verified. Keep deterministic tests, concurrent database checks, browser tests, hosted checks and controlled SoC evaluations distinct. Never mark a scenario passed from a document or placeholder alone.
