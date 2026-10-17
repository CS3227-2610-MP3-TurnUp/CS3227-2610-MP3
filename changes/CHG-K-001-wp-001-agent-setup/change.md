# CHG-K-001 — WP-001 implementation agent setup

Status: complete for the defined repository setup/workflow scope. Structural checks and independent agent audits passed with no actionable findings. Human-review approval and merge status are tracked on the GitHub PR; no approval, merge or runtime execution is implied.

## Intent and source

Equip Keith's future WP-001 work with bounded implementation, hosting, verification and delivery agents, bring this installation increment into the standard Markdown/Git change workflow, and align repository instructions/templates with GitHub PR human review. This is tooling/documentation work; application behaviour is unchanged.

- Human assignment/provenance: Keith requested an orchestrator/subagent recommendation, accepted the proposed model/reasoning and skill setup by asking to create the agents on a chore branch, then requested standard change records on 17 October 2026. He subsequently instructed removal of explicit repository human-review sign-off and future template requirements, with human review assumed on GitHub PRs. The records were added after the agent files; this is not evidence of advance change allocation or prior review.
- Allocated ID: `CHG-K-001`, allocated by the parent acting as coordinator for Keith's current assignment on 17 October 2026 under the [allocation rules](../README.md#change-id-allocation). Local heads, remote-tracking refs, worktrees, active/archive paths, live remote branch trees and issue/PR references were inspected; only `CHG-K-000` was found as an actual Keith allocation. Template examples reserve no IDs. See [verification](verification.md).
- Source/spec base: `2a8ff169e1873f537c2cc4988102f2dce14ee9b2`, B1/D12. Implementation inputs are the dated 17 October 2026 working copy of the ten agent/skill files listed below, plus the existing log entry 01. There is no commit for these new artifacts.
- Human owner and log owner: Keith. Independent agent reviewer: the existing `specification_reviewer`, with read-only assignments after authorship. Human review follows the [PR-review policy](../../CONTRIBUTING.md#review-records).
- Writer: parent agent for all listed files; the independent reviewer returns findings and does not edit reviewed artifacts. Original installation/model choices are preserved; the current policy prompt updates the affected workflow wording.
- PR/increment: `chore-wp-001-agent-setup`; PR pending. Reuse [Keith's increment log](../../logs/keith/03-wp-001-agent-setup.md), with separate entries 01–03. The current prompt explicitly supersedes local sign-off wording in entry 02; historical check/review results remain attributable to their snapshots.
- Related setup issue: none identified. Foundation and hosted-feasibility issues [#4](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/4) and [#6](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/6) are contextual future implementation work, as recorded in the existing issue-tracking log. They are not completed, assigned a change ID or updated by this increment.

## Context and traceability

Read [AGENTS.md](../../AGENTS.md), the [task reading map](../../specs/README.md#task-reading-map), [baseline](../../specs/baseline.md), [ownership/common planning rules](../../specs/implementation-plan.md), [agent/evidence handoffs](../../specs/integration-handoffs.md), [workflow/evidence/log policy](../../CONTRIBUTING.md), [WP-001](../../specs/work-packages/wp-001-foundation.md), and applicable [decisions](../../specs/decisions.md). Historical setup records/logs and the initial decision reference supply provenance, not current executable instructions.

- Affected process requirements: DEV01–DEV03 in [deployment/development evidence](../../specs/shared/deployment-and-retention.md). This increment supplies scoped instructions, input/ownership traceability and review records, not all evidence required by those requirements.
- Acceptance target: the complete T28 definition and coverage guidance in [acceptance scenarios](../../specs/verification/acceptance-scenarios.md). Only repository-artifact and review portions are in scope. No full scenario is marked passed.
- Future agent constraints: DEP01–DEP04, SEC06 and the [AI/privacy contract](../../specs/shared/ai-and-privacy.md); G04/G08 remain open for their dependent implementation choices. T13/T14/T15 are future check responsibilities referenced by instructions, not executed acceptance targets here. No product requirement/scenario is added or changed. The implementation plan and integration handoff guidance are aligned with the PR-review convention; canonical behaviour is preserved.

## Scope and ownership

All paths below have one writer: the parent. Existing specialist responsibility boundaries remain in force.

| Deliverable | Exact paths | Outcome |
| --- | --- | --- |
| Four new definitions | `.codex/agents/application_foundation_engineer.toml`, `.codex/agents/hosting_soc_engineer.toml`, `.codex/agents/implementation_verifier.toml`, `.codex/agents/delivery_agent.toml` | Luna/xhigh implementers, Sol/high verifier, Luna/medium delivery; bounded assignments and explicit skill routing |
| Three existing model settings | `.codex/agents/sdd_coordinator.toml`, `.codex/agents/requirements_analyst.toml`, `.codex/agents/specification_reviewer.toml` | Sol/high; coordinator wording also follows the PR-review policy; analyst/specification reviewer instructions preserved |
| Three supporting skills | `.agents/skills/application-foundation/SKILL.md`, `.agents/skills/hosting-provider-integration/SKILL.md`, `.agents/skills/implementation-verification/SKILL.md` | Reusable foundation, hosted/provider and independent verification procedures |
| Three records | `changes/CHG-K-001-wp-001-agent-setup/change.md`, `changes/CHG-K-001-wp-001-agent-setup/tasks.md`, `changes/CHG-K-001-wp-001-agent-setup/verification.md` | Current scope, allocation, exact assignments, evidence and findings |
| Shared increment log | `logs/keith/03-wp-001-agent-setup.md` | Retain historical check/review evidence; supersede obsolete local sign-off wording; append entry 03 |
| Shared workflow guidance | `AGENTS.md`, `CONTRIBUTING.md`, `changes/README.md` | Human review recorded on GitHub PRs; local delivery/verification status remains separate |
| Future change templates | `changes/_template/change.md`, `changes/_template/tasks.md`, `changes/_template/verification.md` | Independent agent review fields/evidence retained; no duplicate human sign-off task or gate |
| Reused workflow skills | `.agents/skills/sdd-coordination/SKILL.md`, `.agents/skills/sdd-repository-bootstrap/SKILL.md`, `.agents/skills/github-issue-tracking/SKILL.md`, `.agents/skills/github-issue-tracking/assets/issue-template.md` | Future coordination, scaffold and tracking work follows the same review convention |
| Planning/handoff alignment | `specs/implementation-plan.md`, `specs/integration-handoffs.md` | Human PR-review ownership and shared-contract agreement retained; agent evidence stays local |

Exclusions: WP-001 application implementation/assignment, dependency installation, schema/migration creation, production private-data access, deployment/provisioning, live provider/model calls, commits, push, PR creation/merge, GitHub writes, and changes to canonical product rules. No future application change ID is reserved.

Dependencies: [CHG-K-000](../CHG-K-000-sdd-repository-setup/change.md) and subsequent maintained guidance/specs already present at the source base; the preceding agent-creation prompt in this same increment supplies the working-copy outputs. WP-001 application work is a future consumer, not a prerequisite to this installation record.

## Decisions and acceptance

The accepted setup uses the existing SDD coordinator for coordination, explicitly assigned implementers for code integration, and an independent verifier. On-demand requirements/specification agents retain their existing roles. Model/effort choices are recorded in the TOMLs; delivery is temporary rather than an additional mandatory concurrent worker. No permission/model-provider overrides or automatic agent launch are added.

Observable completion conditions:

1. The four new definitions, three existing settings and three skills match the accepted recommendation and reference real repository inputs.
2. Three change records identify allocation, exact paths/writers, source revision, dependencies, full applicable scenario references and honest check limits; the existing log retains separate prompt entries.
3. TOML, YAML/frontmatter, links/anchors, changed-path scope, preservation and whitespace checks pass with actual results recorded. Unavailable validators are explicitly distinguished from fallback checks.
4. An independent setup review covers the actual artifacts and records; findings are corrected or dispositioned and material corrections rechecked.
5. Repository guidance, templates, affected agent/skill instructions and current records consistently use GitHub PRs for human review. Delivery/verification completion has no duplicate local human-review gate. Independent agent evidence, human product decisions and runtime/release limits remain intact.

Agent discovery/model routing, behavioural forward-tests, complete DEV/T28 compliance and application/runtime/hosted/provider acceptance remain unverified. Those exclusions are completion limits, not failed installation checks. Relevant G04/G08 product/provider choices remain open; this change resolves none of them.

## Decision-to-issue reconciliation

Not applicable to product decision reconciliation: the accepted agent/model setup and PR-review convention change development workflow only. No D01–D12 ownership/product decision, canonical requirement, package scope, readiness gate or existing implementation issue acceptance criterion changes. The source/spec revision remains the base above; latest workflow reconciliation is the 17 October 2026 working copy of the paths listed here. No GitHub writes, issue updates or closure are claimed or in scope. Keith remains responsible for linking any future PR/implementation change to its actual tracking issue when that work is assigned.

## Handoff

See [tasks.md](tasks.md) for the read-only independent-review handoffs and [verification.md](verification.md) for actual checks, findings and runtime limits. Human-review records live on the PR. No separate design document is needed for this scoped installation/workflow increment.
