# 01 - Project Setup Agents and Skills - 16 October 2026

## Request

Prepare reusable agents and skills for the TurnUp project's team-owned SDD setup workflow:

- **SDD Coordinator / Project Manager:** assign bounded work, coordinate dependencies and collect completion evidence.
- **Requirements Analyst:** reconcile accepted decisions and write testable requirements and acceptance scenarios.
- **Repository Workflow Builder:** create explicitly assigned workflow files, instructions and templates.
- **Independent Specification Reviewer:** check source fidelity, consistency, scope and verification evidence.

Include their associated skills and a shared reference of accepted project decisions. Defer the broader SDD directory structure and application scaffolding.

## Results

- Added **4 agent definitions** under `.codex/agents/`: `sdd_coordinator.toml`, `requirements_analyst.toml`, `repository_builder.toml` and `specification_reviewer.toml`.
- Added **5 skills**, each containing `SKILL.md` under `.agents/skills/`:
  - `sdd-coordination`
  - `requirements-reconciliation`
  - `acceptance-spec-authoring`
  - `sdd-repository-bootstrap`
  - `specification-audit`
- Added `.agents/skills/requirements-reconciliation/references/project-decisions.md` to preserve accepted decisions and distinguish unresolved choices.
- Added `logs/keith/01-project-setup.md` to record this work; subsequently condensed it to the requested Request/Results format.
- Increased the repository from **0 to 4 custom agents** and **0 to 5 custom skills**: **11 new files** in total, including the reference and log. No existing files were removed.
- All four agent definitions passed TOML checks; all five skills passed the skill validator. Local references and whitespace checks passed.
- Agents were defined but not launched. The broader SDD/application scaffold remains deferred.

# 02 - SDD Repository Structure - 16 October 2026

## Request

Implement the agreed SDD repository structure, specifying file ownership and sequencing before creation. Invoke the existing specialists using their associated skills:

- SDD Coordinator / Project Manager: plan responsibilities, dependencies, and handoffs.
- Requirements Analyst: reconcile role/shared requirements and acceptance scenarios.
- Repository Workflow Builder: create guidance, change templates, and directory placeholders.
- Independent Specification Reviewer: audit the completed scaffold independently.

## Results

Added 44 files: 25 Markdown documents and 19 `.gitkeep` placeholders.

- Root [README](../../README.md), [AGENTS.md](../../AGENTS.md), and [CONTRIBUTING.md](../../CONTRIBUTING.md) establish navigation and workflow guidance.
- Fourteen [specification files](../../specs/README.md) cover baseline, decisions, implementation sequencing, shared contracts, both roles, and acceptance scenarios: 58 canonical requirements, 32 scenarios, and eight unresolved decision gates.
- [Change records](../../changes/README.md) provide three reusable templates and the completed CHG-K-000 setup record.
- Placeholders preserve the agreed source, server, migration, test, and archive directories. This log records the setup outcome.

All four specialists were invoked, with disjoint authorship followed by independent review. The 11 existing agent/skill/reference/log files remain unchanged; no files were removed.

Checks covered local links, requirement/scenario coverage, TOML and example JSON syntax, whitespace, and preserved-file hashes. Independent review found no actionable issues. See [verification evidence](../../changes/CHG-K-000-sdd-repository-setup/verification.md). No application code, dependencies, schema, or deployment was created; runtime tests remain unavailable.

# 03 - Prompt Entries Within PR Logs - 16 October 2026

## Request

Clarify logging for the project-setup increment (CHG-K-000; PR pending): one file per PR-sized increment under the specified owner, with an appended Request/Results entry for every substantial prompt or explicit logging request.

## Results

- Updated nine workflow files: root guidance/README, change guidance/templates, and coordination/bootstrap/commit skills. The [logging policy](../../CONTRIBUTING.md#member-logs) now preserves prompt entries, separates file/entry numbering, combines subagent contributions, and respects explicit no-log instructions.
- Appended this entry to Keith's existing setup log, preserving entries 01–02. Ten existing files modified in total; no new log files or change records.
- Local link/anchor, TOML, formatting, and all three modified skill validations passed. No application behaviour changed or runtime tests run.
