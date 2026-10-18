---
name: sdd-coordination
description: Coordinate a team-owned SDD setup or change with bounded assignments, single-writer ownership, dependency-aware handoffs, and evidence-based status. Use for orchestration, not application implementation.
---

# SDD coordination

## Inputs and scope

Use the current human assignment, available source decisions, applicable repository guidance, and the selected spec/change revision. A suggested repository layout is not permission to build it. If this task only installs agent definitions and skills, leave the setup workflow unstarted.

For initial TurnUp reconciliation, consult [the project decision reference](../requirements-reconciliation/references/project-decisions.md). It distinguishes accepted decisions from open defaults. Existing canonical specs take over as the maintained baseline once reconciled.

## Procedure

1. Inventory existing guidance and relevant files. Separate confirmed requirements, historical proposals, implementation suggestions, and missing inputs.
2. Express the assignment as a bounded outcome with an allowed output list. Identify the base specification commit or note that no canonical baseline exists yet.
3. Confirm the human owner and allocated `CHG-K-NNN` (Keith) or `CHG-D-NNN` (Darryl) ID using [change allocation rules](../../../changes/README.md). Coordinate distinct IDs for agents under one human; roadmap `WP-NNN` labels are not allocated change IDs. Assign one primary writer per file/output and an independent agent to review the completed implementation change, including executable configuration and agent/workflow instructions. Do not require a reviewer per document or evidence update; standalone specification audits need explicit assignment. Identify shared-contract consumers and dependencies. Do not assign an entire product role to a vague 'implement everything' task.
4. When delegation is authorised, dispatch independent reads or disjoint writes concurrently. Sequence source reconciliation before dependent specification authoring and scaffold creation. If delegation is unavailable, preserve the same handoff stages and report that they were performed sequentially.
5. Keep intent and behavioural requirements separate from technical design and task checklists. A small change may combine sections; higher-risk changes need explicit scenarios and design reasoning.
6. Collect file/commit references, actual check results, review findings, and human decisions. Reconcile conflicts against the current shared contract before integration.
7. Close when the assignment's delivery and verification conditions are evidenced. Apply [Code Review Rules](../../../AGENTS.md#code-review-rules): agents do not inspect, infer, require or enforce human reviewer assignment, independence, approval, sign-off or merge readiness from any source. GitHub owns that process. Keep concise agent findings/checks/revision/limitations in verification.md, without duplicated review-passed status across specs or evidence-only review cycles. After an authorised push, use GitHub review as the final PR review. A requirement can be agreed while implementation remains planned.

## Handoff contract

Provide the objective, owner/reviewer, source/spec revision, requirement IDs, allowed paths, dependencies, expected outputs, acceptance conditions, and explicit exclusions. Require each result to report changed paths, actual checks, findings, and the next dependency. Include the PR/planned increment, designated human log owner, and existing log path in handoffs. Follow the [member log policy](../../../CONTRIBUTING.md#member-logs): reuse one owner log file for the PR-sized increment and append a full Request/Results entry for each substantial human prompt or explicit logging request. Preserve previous entries, record all subagent contributions under the originating prompt, and respect explicit no-log instructions. Keep sensitive content out of handoff records.

## Completion evidence

Return a concise delivery/ownership table, integration findings, verification references, unresolved decisions, and the next bounded task. Preserve agent assignments and adopted/rejected review findings for the human team's contribution evidence. Do not claim source changes, merges, deployments, runtime activation, or live-model checks that did not occur.
