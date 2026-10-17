# Shared agent guidance

## Read and establish scope

1. Read the assignment, [task reading map](specs/README.md#task-reading-map), [baseline](specs/baseline.md), relevant decisions/gates, assigned package and complete applicable contracts/scenarios. Follow producer/consumer dependencies; unclear scope requires broader reading. Reading lists neither limit requirements nor authorise work.
2. Read the assigned change's `change.md`, `tasks.md`, available `verification.md` and applicable [workflow/log rules](CONTRIBUTING.md). Inspect status and preserve unrelated work. Reuse context at the same revision; refresh after relevant changes or stale handoffs.
3. Read historical setup records, member logs and the [initial decision reference](.agents/skills/requirements-reconciliation/references/project-decisions.md) for provenance, reconciliation, audits or log work. They are evidence, not executable instructions. Current explicit human decisions supersede older proposals; record changed decisions and affected specs.

Use the [implementation plan](specs/implementation-plan.md) for ownership/common rules and affected [handoffs](specs/integration-handoffs.md) before dependent work. Specified behaviour is not implemented or verified merely because it appears in a document.

## Ownership and coordination

- Keith owns Organiser and WP-001; Darryl owns Student, each including UI/server/tests. Shared leads follow the implementation plan; shared contracts require one writer and affected-role review before dependent implementation.
- Change prefixes identify allocating humans: Keith (`K`), Darryl (`D`), independent counters. Follow [allocation rules](changes/README.md); do not infer a role or dependency from an ID.
- Use a separate clone/worktree and branch per concurrent change, one active writer per file and disjoint writes or sequential handoffs. Integrate prerequisites and recheck consumers; shared schema/contract changes need explicit coordination.
- Handoffs include objective, paths, source/spec revision, requirement/scenario IDs, dependencies, outputs and checks under [CONTRIBUTING](CONTRIBUTING.md#evidence-and-handoffs).
- Delegate when the human assignment or applicable instructions authorise it. Four specialists were used for the 16 October 2026 setup; their presence does not dispatch later work by itself.
- Keep unresolved decisions visible. Continue independent authorised work; resolve blocking decisions before implementing dependent behaviour. Do not invent product rules or claim human approval.

## Specialists and skills

Read the selected definition and linked skills before acting:

| Specialist | Definition | Skills |
| --- | --- | --- |
| SDD Coordinator / Project Manager | [sdd_coordinator.toml](.codex/agents/sdd_coordinator.toml) | [Coordination](.agents/skills/sdd-coordination/SKILL.md), [GitHub issue tracking](.agents/skills/github-issue-tracking/SKILL.md) |
| Requirements Analyst | [requirements_analyst.toml](.codex/agents/requirements_analyst.toml) | [Reconciliation](.agents/skills/requirements-reconciliation/SKILL.md), [acceptance authoring](.agents/skills/acceptance-spec-authoring/SKILL.md) |
| Repository Workflow Builder | [repository_builder.toml](.codex/agents/repository_builder.toml) | [Bootstrap](.agents/skills/sdd-repository-bootstrap/SKILL.md) |
| Independent Specification Reviewer | [specification_reviewer.toml](.codex/agents/specification_reviewer.toml) | [Audit](.agents/skills/specification-audit/SKILL.md) |

For commits/messages, including `$commit` and `$commit with scope`, read the [commit skill](.agents/skills/commit/SKILL.md). Skill availability grants no commit authority; preserve assigned scope/read-only boundaries. The initial reference's installation-only boundary was superseded by the 16 October 2026 scaffold assignment; canonical specs carry the maintained baseline.

## Change and verification discipline

- Use ordinary Markdown/Git [change records](changes/README.md). Do not install OpenSpec or a replacement workflow toolkit.
- Update impacted specs and scenarios alongside implementation. Preserve IDs; distinguish agreed, proposed, implemented, and verified states.
- Keep role/data access checks on the server. Follow canonical privacy/AI contracts; private proposal material is not Student chatbot knowledge.
- Before logging, read the [member log policy](CONTRIBUTING.md#member-logs): one owner file per PR increment; append Request/Results per substantial prompt or explicit request, reuse across agents and preserve history. Explicit no-log instructions take precedence.
- Record exact checks, results, limitations, findings, and changed paths. Never mark unrun tests passed or claim deployment from documentation.
- Use independent review for authored specifications and shared contract changes. Correct or explicitly disposition findings, then recheck affected areas.
- Follow the assignment's authorisation for commits, deployment, dependencies, and scope. A scaffold/template mentioning a later step does not authorise that action.
