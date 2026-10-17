---
name: github-issue-tracking
description: Draft, create, or maintain TurnUp GitHub issues from work packages and scoped changes, preserving human ownership, dependencies, acceptance targets, and verification evidence. Use for project issue tracking and backlog planning.
---

# GitHub issue tracking

Use with the Project Manager's [coordination skill](../sdd-coordination/SKILL.md). GitHub issues provide the tracking view; canonical specs define behaviour and change records hold scoped assignments and detailed evidence.

## Establish the requested operation

- For suggestions, previews, or dry runs, return issue drafts without changing GitHub. Identify any live repository information that was not checked.
- For authorised creation or maintenance, use the available GitHub connector or CLI after checking its current capabilities and repository access. Confirm the target repository from the assignment and repository metadata. Existing explicit authorisation carries forward; do not ask again for actions already covered.
- Issue work does not by itself authorise application implementation, deployment, commits, additional product decisions, or changes to the team's workflow. A backlog item can exist before it has an implementation assignment.

## Select and allocate issues

1. Inspect repository status and source revision. Read [the task reading map](../../../specs/README.md#task-reading-map), [baseline](../../../specs/baseline.md), [ownership/common rules](../../../specs/implementation-plan.md), relevant decisions/gates, package slices and producer/consumer handoffs. For selected slices read their complete applicable contracts and acceptance scenarios. Refresh sources after relevant changes.
2. Inspect existing issues, relevant PRs and assigned change records when live tracking is in scope. In a local-only draft, state that duplicate/status/account checks remain outstanding rather than implying the drafts are new or ready to publish.
3. Choose the issue size for the requested tracking purpose. Overview issues may cover a work package; actionable issues should cover a bounded deliverable with observable completion. Prefer the existing package slices over one issue per requirement or one issue for an entire role.
4. Follow D12's human and shared-contract ownership. Name the accountable human and reciprocal reviewer, distinguish proposed allocation from an actual assignment, and use real GitHub handles only after verifying their mapping. Agents assist the humans. Shared contracts retain one writer and affected-role review before dependent implementation.
5. Separate preparation that can start now from implementation waiting on prerequisites or human decisions. Reference exact gates and producing revisions when known. Do not describe a whole package as blocked when independent preparation can continue.
6. Link an allocated change record if one exists. Follow [change allocation rules](../../../changes/README.md): `WP` labels and issue numbers reserve no `CHG` IDs. Do not guess or create IDs/directories to populate the backlog. Exact file writers, paths and prerequisite revisions must be assigned before execution; mark unresolved assignments plainly in drafts.

## Draft the issue

Adapt [the issue body template](assets/issue-template.md). Include:

- A title that starts with an action and names the concrete deliverable or decision in plain language. A reader scanning the issue list should understand the work without opening a spec. Do not use unexplained gate/requirement IDs or vague phrases such as "resolve decisions" as substitutes for the outcome. Keep traceability IDs in the body unless the assignment or existing title convention calls for them. State the issue kind (overview, decision/preparation, implementation) in the body.
- Objective, bounded scope and exclusions, accountable human/reviewer and why this allocation fits the implementation plan.
- Repository/spec revision, authoritative document links and full relevant requirement/scenario IDs. For live GitHub issues use repository-relative links that resolve from an issue, or absolute repository URLs pinned to the source commit; verify targets. Avoid copying a second maintained specification into the issue.
- Explicit dependencies and open gates. Explain the affected decision or behaviour alongside its ID on first relevant use, for example "decide session expiry and credential-change rules (G01), and whether MVP account recovery is offered (G02)." Give enough context to act on the issue; link canonical detail rather than copying a second specification. Reference draft dependencies by title until real issue URLs exist; never fabricate numbers or links.
- Observable acceptance checklist and required evidence, identifying partial scenario coverage. Decision/preparation issues complete with reviewed proposals and recorded human dispositions; they do not pass runtime scenarios. Label unresolved recommendations as proposals.
- Links to the change/PR/verification record when available. Keep secrets and raw private proposals, attendee values and credentials out of issue bodies and attachments.

Propose labels, milestones or board status only as recommendations until the repository's conventions are checked. Use existing conventions for authorised writes; creating or changing labels, milestones or project boards requires scope that includes those actions.

## Reconcile finalised decisions

Follow [decision-to-issue reconciliation](../../../CONTRIBUTING.md#decision-to-issue-reconciliation) when an accepted or superseded decision affects tracked work. Confirm human provenance and the reconciled canonical specs/scenarios before changing issue expectations; proposed policies remain open.

- Find affected overview and implementation issues and producer/consumer dependencies using decision IDs, requirement IDs, package/change references and semantic scope. Include affected closed issues; an absent gate reference does not establish no impact.
- Explain the accepted outcome alongside its ID and authoritative link. Update affected scope, acceptance criteria, dependencies and readiness, preserving discussion, unrelated work and existing completion evidence. Record a dated note describing the change and latest reconciled spec revision or dated working-copy snapshot, separately from the original source/implementation base.
- Resolve only the blockers the decision actually addresses. For affected closed scope, explicitly record whether a follow-up issue or reopening is appropriate. Decision acceptance does not demonstrate implementation or passing tests; assess closure against the issue's own scope.
- Use the write/read-back procedure below for authorised remote updates. Record affected URLs, review/results and specific pending updates with their responsible owner in the assigned change/log. If access or scope prevents a remote update, report pending reconciliation instead of success. Do not allocate a change ID solely for tracking or introduce background automation.

## Publish or maintain within scope

Immediately before a write, recheck duplicates and current issue state. Update an existing matching issue when appropriate and authorised; preserve human discussion, evidence and unrelated checklists. Publish only the requested scope and report the returned issue URLs. If a write times out or its result is ambiguous, inspect remote state before retrying. If access is unavailable or the result remains uncertain, stop writes and return the drafts or unresolved operations without claiming success.

Mark progress from actual evidence. A merged PR or completed document alone does not establish runtime acceptance. Close only when the issue's own defined scope has supporting evidence; an overview cannot close while required child scope remains incomplete. Record remaining feature/release checks separately.

Follow [member log policy](../../../CONTRIBUTING.md#member-logs) for repository edits and explicitly requested logs. Reuse the designated owner's increment log and preserve prior entries.

## Return and dry-run checks

Return created/updated URLs or clearly labelled drafts, source revision, ownership justification, dependency order, actual checks and unresolved inputs. For a dry run read the titles without their bodies: each should identify an action and concrete outcome without needing an ID lookup. Then check that each draft has a bounded outcome, correct human allocation, traceable IDs with plain-language context, honest prerequisites and acceptance criteria appropriate to its scope. Report local validation separately from live GitHub checks and application tests.
