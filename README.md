# TurnUp

An event sharing platform with separate Student and Organiser workflows in one Next.js + TypeScript application, targeting Vercel Hobby.

Students discover events, register, and ask event questions. Organisers prepare, review, and publish event information, manage registration forms, and reply privately. Proposal assistance processes PDFs temporarily; Student AI uses only the current approved public information.

The repository includes a runnable Next.js foundation, synthetic-only probe persistence, a shared SoC admission gate and the Vercel deployment workflow. The Production foundation deployment succeeded at `05e1b42`; non-production migration, hosted persistence and recovery checks passed; the separately gated SoC check remains pending, as recorded in [CHG-K-006](changes/CHG-K-006-foundation-handoff/verification.md). The bounded signup/login account slice is described below; other product workflows remain unimplemented.

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
- [Foundation verification and handoff](docs/wp-001-foundation-handoff.md): private non-production configuration, replay/upgrade, hosted persistence, recovery and separately gated SoC checks.
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
| `prisma/migrations/` | Versioned Prisma migrations for foundation probes/SoC gate and the new account, session and authentication throttle tables; migration execution is separate from code generation/build |
| `tests/integration/`, `tests/e2e/`, `tests/fixtures/` | Reserved integration, browser, and fixture directories |
| `.codex/agents/`, `.agents/skills/` | Specialist definitions and reusable procedures |
| `logs/` | One file per PR increment under its specified owner, with appended Request/Results entries for substantial prompts or explicit logging requests |

Empty implementation directories contain `.gitkeep` files so Git preserves the agreed layout. They do not establish application behavior or API contracts.
## Signup and login setup

The account slice implements username/password signup, fixed Student/Organiser roles,
login, current-session logout and protected role landing pages. Account settings below
add credential/profile editing; event workflows and recovery remain separate work. Forgotten credentials cannot currently be
recovered; both account forms explain this before submission.

For local use, configure your own assigned synthetic non-production Neon pooled/direct
pair using the existing foundation instructions. Apply the new additive `accounts`
migration only to that authorised target before exercising successful authentication.
Never reuse Keith's private files or run a reset. Builds, schema validation and ordinary
tests need no database credentials; real account success requires the database.

Set server-only `AUTH_ORIGIN` to the exact browser origin, without a path or trailing
slash, e.g. `http://localhost:3000`. Set `AUTH_SOURCE_MODE=local` only for loopback local
development (`TURNUP_ENVIRONMENT=development`, no Vercel runtime). This mode deliberately
ignores all supplied source headers and puts local attempts in one conservative shared
source bucket. For hosted Vercel use `AUTH_SOURCE_MODE=vercel`, HTTPS `AUTH_ORIGIN`,
the correct Preview/Production environment label and Vercel's own runtime `VERCEL=1`.
Only `x-vercel-forwarded-for` is accepted there, parsed as a single IP address. Vercel's
[primary request-header documentation](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for)
describes this platform source header. Generic forwarded headers are never a fallback.
Other hosting ingress paths need an explicit future trusted-source design.

`AUTH_THROTTLE_SECRET` must be a privately generated, stable random 32–64-byte value
encoded as 64–128 hexadecimal characters. Keep the same value across instances and
redeploys; rotating it changes throttle identifiers. Never put it in a `NEXT_PUBLIC_`
setting, client code, tracked file or diagnostics. Missing/invalid origin, source or
secret configuration fails closed. Do not configure `VERCEL=1` yourself on local or
untrusted ingress to make source headers appear trustworthy.

Strict Origin checking means a generated Preview deployment URL does **not** automatically
work. Open the exact configured origin, such as an assigned stable branch alias, or
explicitly update the deployment's origin configuration and redeploy when its public
origin changes. Other aliases and hosts will reject POSTs. Test platform source attribution
on the intended deployment before claiming hosted authentication evidence.

Usernames are canonical lowercase ASCII letters/digits/underscores (3–32 characters),
globally unique across roles. Passwords use NFC, 15–128 Unicode code points, with spaces
preserved. The finite local starter blocklist is maintained in `src/server/auth/policy.ts`:
`password`, `123456`, `123456789`, `qwerty`, `password123`, `password123456789`,
`123456789012345`, `1234567890123456`, `qwertyuiopasdfgh`, `qwertyuiopasdfghjkl`,
`thisisapassword`, `thisisapassword123`, `iloveyou`, `iloveyouiloveyou`, `letmein`,
`letmeinletmeinletmein`, `passwordpassword`, `passwordpassword123`,
`correct horse battery staple`, `aaaaaaaaaaaaaaa`, `000000000000000` (case insensitive).
Short entries also fail length validation. This documented common-password list is finite,
not a comprehensive breach corpus or an external password-check service. Extend it through
reviewed local data changes. No candidate password is sent to an external service.

Async Node scrypt uses N=131072, r=8, p=1, independent random 32-byte salts, a 64-byte
output and explicit 256 MiB max memory allowance per operation. At most two hashes run
per process; excess work receives a retryable 503 without an in-memory waiting queue.
Unknown users do equivalent scrypt and constant-time comparison work. Requests accept
only JSON, bound bodies to 4096 bytes and stop reading after five seconds. Persistent
atomic fixed-window budgets count all admitted attempts before hashing: login 5/name
and 30/trusted source per 15 minutes, signup 10/source per hour, without success reset.
Names/sources persist only as keyed digests in counters; each admission removes up to
100 expired counters. Existing sessions on other devices remain valid. Each successful
authentication replaces the presented session with a fresh opaque token. Only its digest
persists, idle expiry is 30 minutes, absolute expiry is eight hours and exact limits deny.

Run the normal checks using the pinned package manager:

```text
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm db:validate
corepack pnpm build
```

On Windows the existing hosting tests also require Git Bash on the process PATH and the
workflow's checked-in LF content. Do not change test expectations to hide platform failures.
Authentication unit/service/HTTP/guard tests run in the ordinary suite. The default
`server-only` poison check remains enabled; only individual auth tests mock that marker.

The separate SQL suite is `corepack pnpm test:auth:db`. It refuses to start unless the
process explicitly supplies `RUN_AUTH_DB_INTEGRATION=1`, `AUTH_TEST_OWNER=darryl`,
`AUTH_TEST_ENDPOINT_HOST` (exact direct endpoint hostname), `AUTH_TEST_DATABASE_NAME`,
and matching authorised `DATABASE_URL`/`MIGRATION_DATABASE_URL` with
`TURNUP_ENVIRONMENT=development` and `DATABASE_ENVIRONMENT=non-production`. No private
env file is automatically loaded by the suite. Use a Darryl-owned synthetic target with
the new migration already applied; do not set test opt-ins for shared Preview/Production.
Tests create uniquely named accounts and keyed counters and clean up only those fixture
identifiers. No reset, foundation-gate mutation or provider call is used. Missing access
means real SQL/concurrency checks are **not run**, irrespective of unit-test results.

Manual acceptance: create one account per role and check the stored-role destination,
refresh, log out and retry the protected URL, then log in again. Try equivalent duplicate
names, invalid credentials, forged protected fields and cross-role URLs. Check 320px,
375px and 1280px layouts, keyboard focus, pending/error states, retained username/role,
cleared passwords, and the recovery disclosure. Database success, intended-host source
attribution, cookies and persistence require their own recorded evidence.

## Account settings

`/account` is a private dynamic settings page linked from both role destinations.
Both roles save their own username and password separately. Every request requires
the current password and the displayed credential revision. Actual changes atomically
increment that revision. Username changes retain all sessions and cookies, stay on
settings and return the canonical username/new revision. Only password changes revoke
**all** sessions, including current, clear the cookie and route to login. Canonical username/NFC-password no-ops still
reauthenticate but retain sessions and revisions. Duplicate/stale/dependency failures
cannot partially change credentials or revoke sessions. Hash verification/generation
occurs outside short user-then-session row locks. Login rechecks the locked username
and credential revision before issuing a session, preventing old verification from
minting a post-change session.

The POST `/api/account/credentials` accepts only `action`, `currentPassword`,
`expectedCredentialVersion` and either `username` or `newPassword`. Both actions
share persistent limits of five attempts per stable account UUID and 30 per trusted
source per 15 minutes, including wrong passwords and no-ops. UUID keys survive rename;
existing login/signup budgets remain separate. Resource saturation can still fail
closed as unavailable; CHG-D-002's original 35-way P2028 availability limit is not a
429 throttle success or a throughput guarantee.

Students can independently add/remove optional private Name and Phone through
GET/POST `/api/student/profile`. Full saves require `name`, `phone` and
`expectedProfileVersion`; null/blank removes each field. NFC/trimmed names allow up to
100 Unicode code points and reject remaining control characters/line separators.
Nonblank trimmed phone input allows at most 64 code points, ASCII digits, a leading
plus and spaces/hyphens/parentheses; separator removal must leave 7–15 digits. Leading
zeros/plus are preserved, with no country inference, contact verification or recovery
authority. Both fields validate before one atomic versioned write. Stale saves/removals
return 409; canonical no-ops leave the version unchanged. Profile changes keep sessions.
Organisers cannot read/write Student profiles; common Identity remains id/username/role
only. Future registration must explicitly confirm event-specific snapshots; these saves
never rewrite historical submissions. Actual registration/roster integration remains WP-004.

Apply the additive `20261020010000_account_settings` migration only to an authorised
target after the existing accounts migration; historical migrations remain immutable.
The migration supplies null profiles/zero revisions for existing users and enforces
nonnegative versions and the Organiser profile-null invariant. No new configuration or
dependency is required. The existing gated auth SQL command also discovers nine account
settings tests. They use uniquely identified synthetic users/counters and two independent
clients, restore test spies and clean only their fixture IDs/keys. Barrier-controlled
cases cover old-password/old-name login, competing saves, queued logout/expiry and
rollback; unexpected database failures must not count as expected denials. This suite
does not reset a database or access providers. Code/test generation alone supplies no
live database, hosted or complete T20 evidence.

## Authentication failure diagnostics

If signup/login/logout returns a server-unavailable response, the function log emits a
structured `auth_unavailable` event with only `action`, `stage` and a fixed `code`.
The `configuration` stage points to auth origin/source/secret/runtime settings;
`trusted_source` points to validated ingress attribution; `database_initialisation`
points to runtime database configuration/client initialisation; `admission` points to
persistent attempt-limit access; `authentication` covers hash/account/session work.
These stages narrow investigation rather than establishing the exact root cause.
No raw error, credential, identity, request, IP, cookie or configuration value is logged.
Public responses stay generic. Check Vercel function logs privately; never paste secrets.

After a future successful Preview upload, GitHub Actions publishes an **Open Preview**
link in the run summary and the validated Preview URL in its deployment environment.
Production uploads remain explicitly labelled candidates until promotion succeeds.
