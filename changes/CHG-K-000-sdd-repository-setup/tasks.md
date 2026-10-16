# CHG-K-000 — Tasks and handoffs

Source/spec revision: 16 October 2026 working-copy sources in [change.md](change.md). No commit hash exists for this scaffold.

| Order | Task / files | Writer | Reviewer | Dependency | Current evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Inspect sources and publish file-level agent plan | Parent + SDD Coordinator | Parent integration | Human assignment | Completed: source/decision review and plan communicated before creation. |
| 2A | Root guidance, change files and assigned placeholders | Repository Workflow Builder | Independent Specification Reviewer | Scope/permissions | Completed: 29 outputs handed off and materialised by parent; independent audit passed. |
| 2B | Canonical specs except `implementation-plan.md` | Requirements Analyst | Independent Specification Reviewer | Accepted sources/scope | Completed: 13 files materialised; B1 defines 58 IDs, T01–T32 and G01–G08. |
| 3 | `specs/implementation-plan.md`; final tasks/evidence | SDD Coordinator / Project Manager | Independent Specification Reviewer + parent | Writer handoffs | Completed: plan checked against canonical B1; T01–T32 package coverage checked; actual review/structural results recorded. |
| 4 | Read-only independent audit and findings | Independent Specification Reviewer | Parent integration | Authored outputs | Completed: 14 specs, root/process docs, seven change/template docs and 19 placeholders; no actionable findings. |
| 5 | Corrections, integrated checks, log 02 | Parent with original writers | Reviewer for material corrections | Findings | Completed: final inventory 44 new files, 11 preserved, local links/configuration/whitespace and ID/scenario/JSON checks pass; log 02 and B1 snapshot recorded. Post-transfer exact-scope, preservation, links and B1-hash checks passed. |

## Work state

- [x] Source inspection and file plan recorded before creation.
- [x] Builder deliverables completed and handed off.
- [x] Canonical specs completed and handed off.
- [x] Ownership/dependencies finalised against canonical specs.
- [x] Independent review completed; no actionable findings to disposition.
- [x] Integrated checks/limitations recorded in [verification.md](verification.md).
- [x] Request/result log and final scope reconciled.

## Handoff discipline

All four specialists are activated: SDD Coordinator / Project Manager, Requirements Analyst, Repository Workflow Builder and Independent Specification Reviewer. Activation and completed review are recorded separately.

Writers return exact paths, source/spec snapshot, actual checks and findings. Builder relinquished this `tasks.md` and `verification.md`; Coordinator now owns their final drafting, then hands them to parent integration. Subagent target mutations were rejected by the tool boundary despite the parent's grant; specialists stage assigned files in the permitted workspace and the parent transfers them into the target repository. Parallel assignments use disjoint paths; no specialist claims another writer's files as their implementation.

Future product scenarios are not runtime-passed by this setup. See [implementation-plan.md](../../specs/implementation-plan.md) for bounded application packages and decision gates.

Final post-transfer evidence consistency checks passed; the completed independent content audit covers the authored 14-spec baseline and scaffold. No application implementation or product test completion is implied.
