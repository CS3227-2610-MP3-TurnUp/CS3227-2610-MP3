# CHG-K-001 — Tasks and handoffs

Source/spec base: `2a8ff169e1873f537c2cc4988102f2dce14ee9b2`, B1/D12; 17 October 2026 working-copy outputs identified in [change.md](change.md). Human owner: Keith. Branch/increment: `chore-wp-001-agent-setup`; PR pending. Shared log: [Keith's increment entries](../../logs/keith/03-wp-001-agent-setup.md). Human-review assignment and approval are tracked on the GitHub PR.

## Exact file ownership and ordered work

The parent is the only file writer for this change. Independent agent review is read-only on the same change, so it creates no concurrent writing change/worktree. Agent installation and initial change records are delivered. The current prompt aligns the workflow guidance/templates, affected agent/skill wording and records, and appends log entry 03; exact paths are in change.md.

| Order | Task / output files | Writer | Independent reviewer | Preconditions / dependencies | Requirement / scenario IDs | Current evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Inspect local/live allocation evidence; allocate `CHG-K-001`; preserve existing increment snapshot | Parent acting as coordinator | Specification reviewer | Keith's current assignment; allocation rules | DEV01/DEV03; partial T28 | Allocation checks complete; only actual `CHG-K-000` found before allocation |
| 2 | Four new agent definitions, three existing model settings and three supporting skills: exact ten paths in change scope table | Parent, preceding prompt | Specification reviewer | Accepted setup recommendation and B1/D12 | DEV02; partial T28 | Delivered by preceding prompt; no new agents launched |
| 3 | `change.md`, `tasks.md`, `verification.md` in this directory; append log entry 02 | Parent | Specification reviewer | Allocation and preceding delivered outputs | DEV01–DEV03; partial T28 | Complete: source/allocation/scope/evidence records and separate prompt entry delivered |
| 4 | Structural, preservation and exact-scope checks; read-only independent setup audit | Parent runs checks; reviewer returns findings | Specification reviewer | Actual working-copy artifacts available | DEV01–DEV03; partial T28 | Passed: exact fourteen-path scope, eight TOMLs, three YAML/frontmatters, routes/links/preservation/whitespace; independent audit returned no actionable findings |
| 5 | Correct/disposition initial findings; finalise initial records and log entry 02 | Parent | Specification reviewer rechecks material corrections | Initial review findings and checks | DEV01–DEV03; partial T28 | No corrections required; initial evidence consistency recheck passed |
| 6 | Align review guidance/templates/agents/skills and remove obsolete local sign-off gates; append entry 03 | Parent | Specification reviewer | Keith's explicit PR-review instruction; exact change.md paths | DEV01–DEV03; partial T28 | Complete: twenty affected policy paths aligned; other six increment paths preserved |
| 7 | Validate current scope/preservation/links/configuration and independently audit the workflow alignment | Parent runs checks; reviewer returns findings | Specification reviewer | Current working-copy outputs and policy decision | DEV01–DEV03; partial T28 | Passed: twenty-six-path increment, configuration/YAML/routes/links/preservation/whitespace; independent policy audit returned no actionable findings |

## Work state

- [x] Scope, allocated ID, owner, exact permitted files, source base and dependencies recorded.
- [x] Applicable specifications/scenarios read; no changed product behaviour requiring reconciliation found.
- [x] Earlier agent/skill outputs handed off to the records task; one writer per file.
- [x] Current structural checks and independent setup review recorded in [verification.md](verification.md).
- [x] Findings corrected or explicitly dispositioned: no actionable findings; no material corrections required.
- [x] Current PR-review workflow alignment independently checked; records/log and final scope reconciled.

## Initial handoff: parent to independent specification reviewer

- Date/objective: 17 October 2026; independently audit the installed agent/skill definitions and their standard change records for source fidelity, correct role/model/skill mapping, ownership, scope and honest verification claims.
- Source/spec revision: base and dated working copy above. Review the actual files and the accepted requests in this conversation, not only the author's summaries.
- Read set: AGENTS.md; CONTRIBUTING.md ownership/workflow/evidence/log sections; changes/README.md and templates; baseline and task reading map; implementation plan ownership/common rules; integration handoffs' agent/evidence sections; WP-001 plan; DEV01–DEV03/DEP01–DEP04, SEC06/AI privacy boundaries; complete T28 and coverage/evaluation guidance, plus referenced scenario definitions when needed. Initial setup/log/decision-reference material is provenance. Refresh after material changes.
- Required reviewer instructions: `.codex/agents/specification_reviewer.toml` and `.agents/skills/specification-audit/SKILL.md`; preserve independence from parent authorship.
- Allowed read paths at initial audit: the fourteen original agent/skill/record/log paths, their authoritative repository references and Git state. No repository writes, staging, commits, external mutations, new-agent execution, application/provider operations or access to production private data.
- Output: findings to the parent with severity, path/line/ID, observation, consequence, focused correction; also reviewed scope, actual checks and limitations. The parent alone writes disposition/evidence/log records.
- Shared log: `logs/keith/03-wp-001-agent-setup.md`, Keith owns; combine this review with the originating prompt's entry 02. Earlier entry 01 remains historical.
- Satisfied dependencies: assigned scope, allocation and baseline; existing working-copy agent/skill outputs. Review outcome: no actionable findings; exact reviewed scope and independent checks are recorded in verification.md. The subsequent policy prompt removes duplicate local human-review tracking; human review lives on the PR.
- Checks expected: actual TOML/skill/source routes, preserved earlier instructions, record/log consistency, no invented application authority, scenario or runtime passes, and no unsupported model discovery/activation claim. Full live/runtime checks are excluded.

## Next bounded work

Defined setup/workflow delivery and verification are complete. Human-review approval and merge status live on the GitHub PR. Later commit/PR actions follow explicit authorisation. A future WP-001 implementation assignment must allocate its own change ID, exact writers/paths, prerequisites, independent agent reviewer and required G08 decisions; this record does not start it.

## Policy-alignment handoff: parent to independent specification reviewer

- Objective/date: 17 October 2026; audit removal of duplicate local human-review sign-off from all current repository instructions/templates/records. Preserve agent-review evidence, human PR-review ownership, human product decisions, shared-contract agreements and application/release limits.
- Allowed paths/source: all twenty-six increment paths listed in change.md, their authoritative references and Git state at the same base. Review actual policy edits against Keith's latest instruction and CONTRIBUTING.md's review policy. Expand reading if needed; no writes or application/external operations.
- Owner/writer/reviewer: Keith owns; parent is sole writer; existing `specification_reviewer` returns findings read-only. Use log entry 03 in the same owner file for all contributions under this prompt.
- Outputs/checks: actionable findings with severity/path/consequence/correction, reviewed scope and actual checks/limits. Parent writes findings/dispositions and reruns affected structural checks. Initial checks/reviews remain historical evidence; they do not automatically cover this policy update.
- Dependencies/IDs: current human workflow decision; DEV01–DEV03, partial T28; unchanged full scenario/coverage and privacy contracts cited above. No future implementation ID or product decision is introduced.
