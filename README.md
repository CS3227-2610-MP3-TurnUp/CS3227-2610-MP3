# TurnUp

An event sharing platform with separate Student and Organiser workflows in one Next.js + TypeScript application, targeting Vercel Hobby.

Students discover events, register, and ask event questions. Organisers prepare, review, and publish event information, manage registration forms, and reply privately. Proposal assistance processes PDFs temporarily; Student AI uses only the current approved public information.

This repository currently contains SDD documentation and a directory scaffold. There is no runnable application, dependency manifest, database schema, or deployment yet. Requirements describe intended behaviour, not implemented features.

## Start here

- [Specification index](specs/README.md), [baseline](specs/baseline.md), and [decisions](specs/decisions.md): requirements, provenance, and unresolved choices.
- [Implementation plan](specs/implementation-plan.md): ownership, sequencing, and dependencies.
- [Contributing](CONTRIBUTING.md) and [agent guidance](AGENTS.md): shared execution workflow.
- [Change records](changes/README.md): bounded work and actual verification evidence.

## Repository layout

| Path | Purpose |
| --- | --- |
| `specs/shared/` | Accounts, shared contracts, AI/privacy, deployment and retention |
| `specs/student/`, `specs/organiser/` | Complete role workflows |
| `specs/verification/` | Behavioural acceptance scenarios |
| `changes/` | Active changes, templates, and completed-change archive |
| `src/app/` | Future login/signup, role routes, and server endpoints |
| `src/features/student/`, `src/features/organiser/` | Future role feature implementations |
| `src/components/` | Future shared UI components |
| `src/server/` | Future server-only authentication and domain services |
| `prisma/migrations/` | Reserved migration directory; schema/provider decisions precede implementation |
| `tests/integration/`, `tests/e2e/`, `tests/fixtures/` | Reserved integration, browser, and fixture directories |
| `.codex/agents/`, `.agents/skills/` | Specialist definitions and reusable procedures |
| `logs/` | One file per PR increment under its specified owner, with appended Request/Results entries for substantial prompts or explicit logging requests |

Empty implementation directories contain `.gitkeep` files so Git preserves the agreed layout. They do not establish framework configuration or API contracts. Runtime setup and executable build/test commands will be documented when the application is initialised.
