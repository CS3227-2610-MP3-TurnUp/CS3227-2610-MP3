# 01 - Project Manager GitHub Issue Tracking Skill - 17 October 2026

## Request

Create the GitHub issue-tracking skill for the Project Manager and test it by suggesting the first three issues with scope and allocation justifications. The human designated Keith as log owner for this new issue-tracking skill increment. PR pending; current branch `master`, base revision `095c97aca3c1abdc7022e67e4dfcc384b9e6330b`. No implementation change ID is allocated or reserved.

## Results

- Added [github-issue-tracking/SKILL.md](../../.agents/skills/github-issue-tracking/SKILL.md) and its [issue body template](../../.agents/skills/github-issue-tracking/assets/issue-template.md). The workflow covers local drafts, authorised GitHub creation/maintenance, duplicate checks, source/acceptance traceability, human ownership, unresolved gates, retries with uncertain write results, and evidence-based status.
- Updated [the Project Manager definition](../../.codex/agents/sdd_coordinator.toml) and [shared agent guidance](../../AGENTS.md) to route issue work to the skill. Existing coordination/implementation boundaries remain in place. Total increment: three added files including this log, two modified files; no removals.
- Applied the new skill locally to B1/D12 and the WP-001/WP-002 plans, contracts and complete applicable scenarios. Produced three draft issues: reproducible foundation (Keith, Darryl reviews); account/session G01/G02 preparation (Darryl, Keith reviews and both humans decide G02); hosted persistence/SoC feasibility (Keith, Darryl reviews). The first and third split WP-001's existing slices; account preparation can proceed independently while executable work waits for its foundation handoff.
- Dry-run review checked bounded outcomes/exclusions, D12 allocation, actual prerequisite order, human decision boundaries, explicit unallocated change IDs and partial scenario coverage. Drafts contain observable acceptance criteria and requirement/scenario references; implementation assignments and live metadata checks remain pending. The complete local preview is a session artifact at `/private/tmp/turnup-first-three-issue-drafts.md`; suggestions are also reported to the human.
- `python3 /Users/keith/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/github-issue-tracking` could not run because PyYAML is absent (`ModuleNotFoundError: No module named 'yaml'`). No dependency was installed. Fallback `python3 /private/tmp/turnup-issue-skill-checks.py` passed: actual YAML parsing using installed Ruby Psych, naming/frontmatter checks, all four agent TOML parses, coordinator routing, local Markdown targets/anchors and formatting, the three drafts' referenced files/IDs, no allocated change IDs, preservation of specs/change records/prior logs/other agents, and `git diff --check`. These temporary checks are local structural evidence, not a bundled-validator success or independent agent review.
- No GitHub issues, labels, milestones, board changes or assignees were written. Live duplicate/PR/status/handle checks, GitHub publication, application tests, hosted/provider checks and deployment were not run. No application behaviour, canonical specs, commits, branches or change records were created or changed.

# 02 - Clear Issue Titles and Decision Context - 17 October 2026

## Request

Improve the skill and suggested issues so titles communicate the work clearly and decision/requirement references such as G01/G02 have explicit meaning even when their details exist in documentation. Continue Keith's issue-tracking skill increment.

## Results

- Updated the skill and issue template to favour action-led titles naming concrete outcomes, explain referenced decisions/behaviours alongside IDs, and retain canonical links for full detail. Added a title-only dry-run review; identifiers remain available for traceability and existing title conventions can still be followed.
- Revised the session preview titles to “Set up the Next.js application, database, and isolated configuration”, “Define signup, login sessions, credential changes, and account recovery”, and “Verify online hosting, persistent data, and server-side LLM access”. Expanded relevant gate context in the bodies. Scope, human allocation, prerequisite order and acceptance targets are preserved.
- Re-ran `python3 /private/tmp/turnup-issue-skill-checks.py`: YAML/frontmatter, four TOML definitions, 32 local links/anchors, formatting, draft references/IDs, preservation checks and `git diff --check` passed. Reviewed all three titles without their bodies: each names an action and concrete outcome without requiring ID lookup. The earlier bundled-validator/PyYAML limitation remains; no live GitHub or application checks were run.
- Changed repository paths for this prompt: skill, issue template and this appended log entry. Earlier log entries remain intact. No published issues were renamed, no product decisions were made and no change IDs were allocated.

# 03 - Branch and Publish the Approved Issues - 17 October 2026

## Request

Switch to a new appropriately named branch, then attempt to create the three approved issues on GitHub. Continue Keith's issue-tracking skill increment; no commit or branch push was requested.

## Results

- Created and switched to `github-issue-tracking` from `095c97aca3c1abdc7022e67e4dfcc384b9e6330b`, preserving the existing skill/agent/guidance/log edits. The first sandboxed branch command could not write the Git ref; the authorised retry with elevated filesystem access succeeded.
- Confirmed the origin repository through the GitHub connector, verified its permissions and the source revision's implementation plan, and checked existing issues and PRs. No issues were present; the three existing PRs concern prior documentation work. Rechecked duplicates before each creation.
- Verified Keith's GitHub mapping as `blurfrost` using the authenticated profile, and Darryl's as `Arkanian4` using the repository's named commit history. Both accounts have repository access. Created and assigned:
  - [#4 — Set up the Next.js application, database, and isolated configuration](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/4): Keith owns, Darryl reviews.
  - [#5 — Define signup, login sessions, credential changes, and account recovery](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/5): Darryl owns, Keith reviews; both decide recovery.
  - [#6 — Verify online hosting, persistent data, and server-side LLM access](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/6): Keith owns, Darryl reviews; depends on #4's foundation handoff.
- Issue bodies include scope/exclusions, allocation rationale, acceptance checklists, explicit decision context, partial scenario coverage and canonical links pinned to the source revision. #5 links #4 while making clear that policy preparation can proceed independently. No implementation change IDs, labels, milestones or project-board changes were introduced.
- Independently fetched all three created issues through the connector: all are open, all titles and full bodies exactly match their prepared payloads, and actual assignees match the intended humans. This is remote read-back verification, not independent specialist review or application acceptance evidence.
- Re-ran the local structural checker and `git diff --check`; checked issue source-link paths against the pinned Git tree. The earlier PyYAML/bundled-validator limitation remains. Local edits remain uncommitted; the new branch was not pushed. No application implementation or deployment was performed.

# 04 - Decision Reconciliation and Remaining Package Overviews - 17 October 2026

## Request

Add decision-to-issue reconciliation to the four proposed files, then create the six approved overview issues covering WP-002 through WP-007. Continue Keith's issue-tracking increment on `github-issue-tracking`, using B1/D12 at `095c97aca3c1abdc7022e67e4dfcc384b9e6330b` for product scope.

## Results

- Added the shared [decision-to-issue procedure](../../CONTRIBUTING.md#decision-to-issue-reconciliation), the Project Manager's [skill procedure](../../.agents/skills/github-issue-tracking/SKILL.md#reconcile-finalised-decisions), reconciliation fields in the [issue template](../../.agents/skills/github-issue-tracking/assets/issue-template.md), and related issue/reconciliation fields in the [change template](../../changes/_template/change.md). These four files and this appended log entry are the repository edits for this prompt; existing skill/agent/guidance work is preserved.
- The procedure records human provenance and canonical changes, follows producer/consumer effects into overview/implementation issues, keeps the original base separate from the latest reconciled spec revision, preserves prior completion evidence, and records scoped pending updates and remote read-back results. Reviewed the workflow against partial gate resolution, an affected consumer without an explicit gate reference, previously completed scope, and unavailable/out-of-scope remote writes. None permits decision approval to imply implementation/test completion or successful synchronisation without evidence. No background service or product policy was added.
- Confirmed repository access and searched all existing issues and relevant PRs. Existing #4–#6 cover foundation/feasibility and account preparation; no duplicate overviews were found. Rechecked each title before creation. Created:

| Issue | Package | Tracking owner and review |
| --- | --- | --- |
| [#7 — Implement fixed-role accounts, credential changes, and optional profiles](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/7) | WP-002 | Darryl; Keith reviews |
| [#8 — Enable event drafting, publication, withdrawal, and cancellation](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/8) | WP-003 | Keith; Darryl reviews |
| [#9 — Enable event discovery, custom registration forms, and attendee management](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/9) | WP-004 | Darryl tracks/owns Student and registration contract; Keith owns Organiser forms/rosters; reciprocal review |
| [#10 — Turn proposal PDFs into editable event drafts for Organiser review](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/10) | WP-005 | Keith; Darryl reviews |
| [#11 — Answer event questions from approved content and deliver private replies](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/11) | WP-006 | Darryl tracks/owns Student and source/thread contracts; Keith owns inbox/replies/provider integration; reciprocal review |
| [#12 — Implement retention cleanup and verify security and release readiness](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/12) | WP-007 | Keith; Darryl reviews; both supply role evidence |

- All six are overview/backlog issues with source links, requirement/scenario coverage, explicit decisions, bounded future-slice assignment rules, acceptance checklists and a decision-reconciliation section. Actual issue URLs link dependencies; WP-006 explicitly does not require WP-005, and retention preparation is not made dependent on completion of the entire release package. No change IDs, child implementation assignments, labels, milestones or board changes were allocated. Existing #4–#6 were left intact.
- Before publishing, `python3 /private/tmp/turnup-decision-issue-checks.py` passed YAML/frontmatter/naming, all four agent TOML definitions, local Markdown links/anchors/formatting, prior-log/canonical preservation, the expected seven-file increment and branch checks, and `git diff --check`. A separate local payload check passed all six distinct readable titles, pinned source paths/anchors, decision sections and the absence of allocated change IDs or checked acceptance tasks.
- Fetched all six published issues independently of their create responses: exact full bodies/titles match the prepared payloads, all are open, assignees match the verified human mappings, and dependency placeholders are resolved. Final local checks passed after this log append. The bundled skill validator remains unavailable because PyYAML is missing; no dependency was installed. Complete published payloads are retained as the session artifact `/private/tmp/turnup-overview-published-payloads.json`; GitHub issue bodies are the remote outputs. No independent specialist review or application/runtime verification is claimed.
- No canonical product decision/specification, application code or implementation evidence was changed. The local workflow changes remain uncommitted on `github-issue-tracking`; no push, deployment or background automation was performed.
