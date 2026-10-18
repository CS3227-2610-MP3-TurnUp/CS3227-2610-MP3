# TurnUp

An event sharing platform with separate Student and Organiser workflows in one Next.js + TypeScript application, targeting Vercel Hobby.

Students discover events, register, and ask event questions. Organisers prepare, review, and publish event information, manage registration forms, and reply privately. Proposal assistance processes PDFs temporarily; Student AI uses only the current approved public information.

The repository includes a runnable Next.js foundation and a synthetic-only Prisma probe table. Product workflows and hosted integrations will be implemented in their assigned changes.

## Application setup

Use Node.js `24.21.0` from `.nvmrc` and pnpm `12.14.0` from `package.json`. Install the pinned toolchain with Corepack (`corepack pnpm install --frozen-lockfile`).

Create separate Neon projects for non-production and production. In each project, create the PostgreSQL branch, database and role required by that environment, then copy the connection URIs from that project into the matching deployment environment. Development and agent sessions must use only synthetic data and credentials from the non-production project. Production must have its own project and credentials. The application checks environment labels and URL shape; it cannot prove that a URL belongs to the project named by those labels.

For local setup, copy `.env.example` to `.env.local` and fill it with synthetic non-production credentials. `.env.local` is ignored by Git. Set `TURNUP_ENVIRONMENT` to `development`, `preview`, or `production`; set `DATABASE_ENVIRONMENT` to `non-production` for development/preview and `production` for production. The pair must match. Use the Neon-generated **pooled** connection URI for `DATABASE_URL` (the hostname contains `-pooler`) and the **direct** URI for `MIGRATION_DATABASE_URL`. Both must use `sslmode=require` or `sslmode=verify-full`; TLS-disabled, ambiguous and unverified modes are rejected. `DATABASE_URL` serves application queries. `MIGRATION_DATABASE_URL` serves Prisma CLI migration commands and is not used by the application runtime. For local `db:migrate:dev` only, create a separate direct shadow database in the non-production project and set its URI as `SHADOW_DATABASE_URL`. It must not identify the migration database. Build and application startup do not run migrations.

Run `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build` for local checks. The default test suite is credential-free. Apply development migrations only to synthetic non-production data with `corepack pnpm db:migrate:dev`; inspect migration history with `corepack pnpm db:migrate:status`. `corepack pnpm db:migrate:deploy` applies checked-in migrations to the configured direct URL and must be run only through an assigned, reviewed release workflow. The persistence test is isolated in its own Vitest config and requires an explicit opt-in: `RUN_FOUNDATION_DB_INTEGRATION=1 corepack pnpm test:db`. It loads local environment values, refuses a database labelled production, and writes then deletes a random synthetic probe row. No live Neon connection check is included in ordinary tests.

## Start here

- [Specification index](specs/README.md), [baseline](specs/baseline.md), and [decisions](specs/decisions.md): requirements, provenance, and unresolved choices.
- [Implementation plan](specs/implementation-plan.md): ownership, sequencing, and dependencies.
- [Contributing](CONTRIBUTING.md) and [agent guidance](AGENTS.md): shared execution workflow.
- [Change records](changes/README.md): bounded work and actual verification evidence.
- [Agent usage tracking](docs/agent-usage.md): local Python collection, multi-agent token/credit reports, and contributor exports.
- [UI guidelines](docs/ui-guidelines.md): shared visual tokens, components and responsive defaults; [screen patterns](docs/ui-screen-patterns.md) apply them to TurnUp workflows.

## Repository layout

| Path | Purpose |
| --- | --- |
| `specs/shared/` | Accounts, shared contracts, AI/privacy, deployment and retention |
| `specs/student/`, `specs/organiser/` | Complete role workflows |
| `specs/verification/` | Behavioural acceptance scenarios |
| `changes/` | Active changes, templates, and completed-change archive |
| `src/app/` | Next.js application shell |
| `src/features/student/`, `src/features/organiser/` | Role feature modules |
| `src/components/` | Shared UI components |
| `src/server/` | Server-only configuration and database services |
| `prisma/migrations/` | Versioned Prisma migrations; current schema contains only a synthetic foundation probe |
| `tests/integration/`, `tests/e2e/`, `tests/fixtures/` | Reserved integration, browser, and fixture directories |
| `.codex/agents/`, `.agents/skills/` | Specialist definitions and reusable procedures |
| `logs/` | One file per PR increment under its specified owner, with appended Request/Results entries for substantial prompts or explicit logging requests |

Empty implementation directories contain `.gitkeep` files so Git preserves the agreed layout. They do not establish application behavior or API contracts.
