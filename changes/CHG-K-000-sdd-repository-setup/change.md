# CHG-K-000 — SDD repository setup

Status: complete. Date: 16 October 2026.

## Intent and source

Implement the discussed SDD file structure with the Repository Workflow Builder and specialists. Establish canonical requirements, ownership, change templates, and a versionable layout before application implementation.

- Human assignment: implement the file structure and state agent responsibilities/sequencing first.
- Source/spec revision: 16 October 2026 working-copy snapshot; existing definitions/skills and [initial decision reference](../../.agents/skills/requirements-reconciliation/references/project-decisions.md), historical `original.md`, `plan.md`, and `implementation-specs.md` under `/Users/keith/Documents/trial/`, superseded by later human decisions where applicable.
- Human setup requester: Keith. Actual human role owners remain to be assigned in the implementation plan.
- Coordination: SDD Coordinator / Project Manager; parent agent integrates final evidence.
- Independent reviewer: Independent Specification Reviewer, without authorship of reviewed specs.

## Assigned outputs

| Writer | Deliverables |
| --- | --- |
| Repository Workflow Builder | Root `README.md`, `AGENTS.md`, `CONTRIBUTING.md`; `changes/README.md`; three template files; initial three files in this change; assigned `.gitkeep` placeholders |
| Requirements Analyst | `specs/README.md`, baseline, decisions, four shared specs, three Organiser specs, two Student specs, acceptance scenarios |
| SDD Coordinator / Project Manager | `specs/implementation-plan.md`; final task/evidence records after handoff |
| Independent Specification Reviewer | Read-only structure, role/privacy, and traceability audit; returned findings |
| Parent agent | Integrated checks, coordinated corrections, concise `logs/keith/02-sdd-repository-structure.md`, final handoff |

Placeholders cover `src/app/{login,signup,student,organiser,api}`, `src/features/{student,organiser}`, `src/components/`, `src/server/{auth,events,publication,registration,questions,ai}`, `prisma/migrations/`, `tests/{integration,e2e,fixtures}`, and `changes/archive/`.

## Boundaries and dependencies

- Preserve four existing agent definitions, five skills with their supporting reference, and log 01.
- Reconcile accepted fixed roles, optional Student profile, temporary PDF processing, approved-public-only Student AI, and publication/registration/privacy rules. Preserve existing requirement ID families. Setup implements no product behaviour at runtime.
- After the file plan, builder and analyst may write disjoint outputs in parallel. Coordinator sequencing follows canonical specs; independent review follows authorship; corrections and integrated checks follow review.
- No application code, dependencies, schema/migrations, CI, deployment, future application change folders, Git commits, or OpenSpec setup.
- Keep open product decisions explicit and block only dependent future implementation. This setup creates no blanket human approval requirement.

## Completion conditions

1. Agreed documents and empty implementation directories exist with navigable references.
2. Specs separate accepted rules, recommendations, unresolved decisions, and implementation state.
3. Implementation plan records role/shared responsibilities, specialist tasks, dependencies, and acceptance work.
4. Independent findings receive corrections or explicit dispositions.
5. Actual structural checks and unavailable runtime tests are recorded, with a concise request/result log.

See [tasks.md](tasks.md) and [verification.md](verification.md) for actual progress/evidence.
