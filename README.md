# TurnUp

An event sharing platform with separate Student and Organiser workflows in one Next.js + TypeScript application, targeting Vercel Hobby.

Students discover events, register, and ask event questions. Organisers prepare, review, and publish event information, manage registration forms, and reply privately. Proposal assistance processes PDFs temporarily; Student AI uses only the current approved public information.

The repository includes a runnable Next.js foundation, synthetic-only probe persistence, and a shared SoC admission gate. Product workflows and hosted integrations will be implemented in their assigned changes.

## Application setup

Use Node.js `24.21.0` from `.nvmrc` and pnpm `12.14.0` from `package.json`. Install the pinned toolchain with Corepack (`corepack pnpm install --frozen-lockfile`).

Create separate Neon projects for non-production and production. In each project, create the PostgreSQL branch, database and role required by that environment, then copy the connection URIs from that project into the matching deployment environment. Development and agent sessions must use only synthetic data and credentials from the non-production project. Production must have its own project and credentials. The application checks environment labels and URL shape; it cannot prove that a URL belongs to the project named by those labels.

For local setup, copy `.env.example` to `.env.local` and fill it with synthetic non-production credentials. `.env.local` is ignored by Git. Set `TURNUP_ENVIRONMENT` to `development`, `preview`, or `production`; set `DATABASE_ENVIRONMENT` to `non-production` for development/preview and `production` for production. The pair must match. Use the Neon-generated **pooled** connection URI for `DATABASE_URL` (the hostname contains `-pooler`) and the **direct** URI for `MIGRATION_DATABASE_URL`. The current runtime validator accepts `sslmode=require` or `sslmode=verify-full`. Prisma's PostgreSQL CLI connector accepts `sslmode=require`, `prefer`, or `disable`; for migration and shadow URLs this application requires `sslmode=require&sslaccept=strict` so Prisma validates the server certificate. The unsupported `sslmode=verify-full`, missing or conflicting `sslaccept`, duplicate query parameters and TLS-disabled modes are rejected for these direct URLs. `DATABASE_URL` serves application queries. `MIGRATION_DATABASE_URL` serves Prisma CLI migration commands and is not used by the application runtime. For local `db:migrate:dev` only, create a separate direct shadow database in the non-production project and set its URI as `SHADOW_DATABASE_URL`. It must not identify the migration database. `prisma migrate reset` is classified as a development-only operation: configuration rejects it under production labels before supplying the migration URL to Prisma, and it does not require a shadow URL in non-production. Build and application startup do not run migrations.

Run `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, and `corepack pnpm build` for local checks. `corepack pnpm typecheck` generates the Prisma client and Next.js route types before running TypeScript, so it can run after the frozen install without a prior build. The default test suite is credential-free. Apply development migrations only to synthetic non-production data with `corepack pnpm db:migrate:dev`; inspect migration history with `corepack pnpm db:migrate:status`. `corepack pnpm db:migrate:deploy` applies checked-in migrations to the configured direct URL and must be run only through an assigned, reviewed release workflow. The ordinary database integration command is an explicit opt-in: `RUN_FOUNDATION_DB_INTEGRATION=1 corepack pnpm test:db`. It includes only the row-only persistence test, loads local environment values, refuses a database labelled production, and writes then deletes a random synthetic probe row.

The destructive shared SoC gate integration test is excluded from ordinary `test:db`. To run it, create and migrate a separate disposable development-only Neon branch and database named `turnup_soc_probe_gate_test`. Never point it at a shared development/Preview database. Set `TURNUP_ENVIRONMENT=development`, `DATABASE_ENVIRONMENT=non-production`, `SOC_PROBE_GATE_TEST_DATABASE_NAME=turnup_soc_probe_gate_test`, and its `DATABASE_URL` to that database; do not set `VERCEL_ENV`. Then opt into the state-resetting test explicitly: `RUN_FOUNDATION_DB_INTEGRATION=1 RUN_SOC_PROBE_GATE_DB_INTEGRATION=1 corepack pnpm test:db`. Before any test, it verifies both opt-in flags, development/non-production labels, the absence of a Vercel environment label, and that the explicit target marker matches the database name in `DATABASE_URL`. The gate suite resets its leases, attempt/in-flight/token counters, last-admission time, and latched limits before and after each test. It makes no SoCLaaS call. Ordinary tests include no live Neon check.

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
| `prisma/migrations/` | Versioned Prisma migrations; current schema contains only synthetic foundation probe and SoC gate tables |
| `tests/integration/`, `tests/e2e/`, `tests/fixtures/` | Reserved integration, browser, and fixture directories |
| `.codex/agents/`, `.agents/skills/` | Specialist definitions and reusable procedures |
| `logs/` | One file per PR increment under its specified owner, with appended Request/Results entries for substantial prompts or explicit logging requests |

Empty implementation directories contain `.gitkeep` files so Git preserves the agreed layout. They do not establish application behavior or API contracts.
