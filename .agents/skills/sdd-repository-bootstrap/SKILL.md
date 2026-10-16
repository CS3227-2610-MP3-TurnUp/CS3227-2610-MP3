---
name: sdd-repository-bootstrap
description: Create an explicitly authorised team-owned Markdown SDD repository scaffold, agent instructions, or change templates while preserving existing work. Use for repository workflow setup, not application implementation or OpenSpec installation.
---

# SDD repository bootstrap

## Preflight

Inspect the repository root, applicable AGENTS.md files, existing files/status, assigned paths, and the agreed source/decision revision. Resolve paths relative to the actual target repository, not an unrelated chat working directory. Read the initial [project decision reference](../requirements-reconciliation/references/project-decisions.md) only when no reconciled baseline is available.

Treat two assignments differently:
- Agent/skill installation: create only explicitly requested agent definitions, supporting skill files, and the assigned PR/increment log under the member log policy. Do not begin broader scaffolding or run the new workflow.
- Repository scaffold assignment: create only the agreed subset of instructions, specs/change directories, or templates. Application source/dependency setup requires its own scope.

## Construction rules

1. Use ordinary Markdown and Git. OpenSpec-inspired concepts do not require OpenSpec packages, slash commands, configuration, or a replacement SDD toolkit.
2. Keep root AGENTS.md as concise shared execution guidance when its creation is authorised. Keep product rules in canonical specs, specialist responsibility in agent definitions, and procedures in skills.
3. Use .codex/agents/*.toml with supported name, description, and developer_instructions fields; link each assigned skill explicitly. Inherit model/permission settings unless the human asks for changes. An instruction to avoid edits is not an enforced sandbox.
4. Create skills under .agents/skills/<name>/SKILL.md with meaningful name/description metadata. Add supporting resources only for a concrete need. Do not create unused placeholders or duplicated manuals.
5. Use owner-prefixed change directories from [change allocation rules](../../../changes/README.md): `CHG-K-NNN-short-name` for Keith or `CHG-D-NNN-short-name` for Darryl. Preserve an existing ID through handoffs/archive, and update links when explicitly renaming legacy records. If assigned change templates, use change.md (intent, owner/reviewer, source/spec revision, scope, requirements/scenarios), tasks.md (small work items with checks), verification.md (actual evidence/findings); design.md is optional for material design decisions.
6. Preserve existing content and stable requirement IDs. Use relative repository references so another teammate can use the files. If referring to deferred paths, explicitly say they are future/conditional rather than pretending the files already exist.
7. Validate the assigned deliverables: parse TOML/YAML, validate skill frontmatter with available tooling, check real local links, inspect whitespace/diff and unintended paths. Report unavailable validators or runtime checks accurately. Do not install missing tooling or change global configuration without need and authorisation.

## Completion

Return an inventory, agent-to-skill mapping, actual verification results, unchanged/deferred scope, and discovery/runtime limitations. When logging is within scope, follow the [member log policy](../../../CONTRIBUTING.md#member-logs): append a complete Request/Results entry for each substantial human prompt, or explicit logging request, to the specified owner's existing PR/feature-increment file. Preserve earlier entries and respect explicit no-log instructions. Create a file only for a distinct PR-sized increment with an identified owner; combine agent outputs in the originating prompt's entry. Definition creation is not evidence of actual agent activation, application correctness, deployment, or multi-agent execution.
