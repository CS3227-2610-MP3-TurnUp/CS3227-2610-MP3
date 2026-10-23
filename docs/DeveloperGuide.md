---
title: Developer Guide
description: TurnUp setup, implemented architecture, UML, security, testing and development workflow.
---

# TurnUp Developer Guide

This guide describes the **implemented code at 55d9cb7, 23 October 2026**, including
the merged workspace UI improvements. It does not declare the entire roadmap or
WP-007 complete. Code, schema, routes and tests were inspected rather than copying
historical completion statements from the README/specifications. The Product website
and User Guide are maintained alongside this guide.

The application version in `package.json` is **0.1.0**. A repository version, a passing
test and a successful hosted workflow are different evidence; none alone establishes
complete release acceptance. Check the deployed revision when reproducing behavior.

## Contents

1. [Setup guide](#1-setup-guide)
2. [Project design and UML](#2-project-design-and-uml)
3. [Implemented features and interfaces](#3-implemented-features-and-interfaces)
4. [Security and AI boundaries](#4-security-and-ai-boundaries)
5. [Testing and manual verification](#5-testing-and-manual-verification)
6. [SDD and multi-agent engineering process](#6-sdd-and-multi-agent-engineering-process)
7. [Deployment and product website](#7-deployment-and-product-website)
8. [Known gaps and glossary](#8-known-gaps-and-glossary)
9. [Acknowledgements](#9-acknowledgements)

## 1. Setup guide

### 1.1 Toolchain

Use the versions checked into the repository, not an assumed latest framework API.

| Tool / dependency | Repository version | Purpose |
| --- | --- | --- |
| Node.js | `.nvmrc`: 24.21.0; engine `>=24.11.0 <25` | Node runtime and development tools |
| pnpm | 12.14.0 through Corepack | Locked package installation and scripts |
| Next.js / React | 16.3.8 / 19.2.8 | App Router, server pages, client interfaces and HTTP routes |
| TypeScript | 5.9.3 | Static checking |
| Prisma client/CLI | 7.10.1 | Schema, generated client and migrations |
| PostgreSQL driver | `pg` 8.16.3 | Prisma PostgreSQL adapter connectivity |
| Vitest / Vite | 5.0.4 / 8.3.4 | Credential-free and separately opted-in SQL tests |
| ESLint | 9.39.1 | Source checks with Next.js configuration |
| Ruby / Bundler | Separate optional documentation toolchain | Jekyll website preview; not required to run TurnUp |

Git is needed to obtain the source. Use an assigned synthetic non-production database
for development; the runtime configuration expects Neon PostgreSQL rather than an
arbitrary local connection URL. No real provider key is required for ordinary unit tests.

```sh
git clone https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3.git
cd CS3227-2610-MP3
corepack pnpm install --frozen-lockfile
corepack pnpm db:generate
```

`src/server/db/generated/` is generated from the schema and ignored by Git. Do not
maintain hand-edited generated models. Read relevant local Next.js guides in
`node_modules/next/dist/docs/` before changing framework APIs, as required by AGENTS.

### 1.2 Environment configuration

Copy `.env.example` to `.env.local` and populate it privately. Never commit the filled
file or put any database/provider key in a `NEXT_PUBLIC_` variable. The table lists
names and relationships, not working credentials.

| Settings | Meaning / validation |
| --- | --- |
| `TURNUP_ENVIRONMENT`, `DATABASE_ENVIRONMENT` | Development/Preview must pair with `non-production`; Production with `production`. |
| `DATABASE_URL` | Runtime Neon pooled URI; TLS required. |
| `MIGRATION_DATABASE_URL` | Direct migration URI, with `sslmode=require&sslaccept=strict`. Runtime does not use it. |
| `SHADOW_DATABASE_URL` | Separate direct shadow resource for `db:migrate:dev`; must not identify the migration database. |
| `AUTH_ORIGIN` | Exact browser origin with no trailing slash/path; locally `http://localhost:3000` by default. |
| `AUTH_SOURCE_MODE` | `local` for loopback development; `vercel` for hosted trusted ingress. |
| `AUTH_THROTTLE_SECRET` | Privately generated stable 32–64 bytes encoded as 64–128 hexadecimal digits. |
| `STUDENT_SOCLAAS_API_KEY` | Student assistant's server-only credential; no fallback to the shared key. |
| `SOCLAAS_API_KEY` | Shared/Organiser provider credential; not the Student fallback. |
| `SOCLAAS_BASE_URL`, `SOCLAAS_MODEL` | Validated SoCLaaS endpoint/model; hosted Student policy pins `qwen3.8:27b`. |
| `SOCLAAS_MAX_INPUT_BYTES`, `SOCLAAS_MAX_OUTPUT_TOKENS`, `SOCLAAS_TIMEOUT_MS` | Explicit provider ceilings; hosted Student caps may lower them. |
| `STUDENT_ASSISTANT_ENABLED` | Explicit hosted enablement; insufficient without matching runtime labels, valid configuration and durable admission state. |
| `FOUNDATION_PROBE_*` | Protected synthetic persistence/provider feasibility checks; not normal product features. |

Production and non-production require separate resources/credentials. Labels and URL
validation fail closed on known mismatches but cannot independently prove the ownership
of a remote database. Keep resource allocation evidence with the release handoff.

For ordinary local browsing, keep port and `AUTH_ORIGIN` consistent. After assigning
and reviewing an appropriate non-production target, inspect/apply migrations using
the existing scripts. Never reset shared Preview or Production databases.

```sh
corepack pnpm db:migrate:status
corepack pnpm db:migrate:dev
corepack pnpm dev
```

Open `http://localhost:3000`. No default accounts are seeded by normal startup. A real
successful login needs the migrated database and valid auth configuration. Next.js
startup and build do not apply migrations automatically.

### 1.3 Local assistant development

The synthetic assistant harness at `/dev/student-assistant` is restricted to **development
bound to `127.0.0.1:3001`**, with no Vercel runtime. Start a separate authorised development
session using `corepack pnpm dev --hostname 127.0.0.1 --port 3001`; align `AUTH_ORIGIN`
if exercising authenticated real-publication routes there. The default port-3000 app
does not meet the assistant's development policy. This is intentional, not a missing
route to fix by weakening the guard.

The harness defaults to simulated responses. Live local mode additionally requires an
explicit operator allowance in ignored `.student-assistant-local/` and valid Student
provider configuration. A key alone does not enable inference. Real-publication
inspection at `/dev/student-assistant/publication/[eventId]` is distinct from synthetic
examples and requires Student authentication. Neither development surface is a hosted
product feature. Do not expose it publicly for screenshots.

## 2. Project design and UML

### 2.1 Architecture and module boundaries

TurnUp is one Next.js application with fixed-role interfaces. Server pages resolve
access before rendering a role page. Client components own interaction state and call
HTTP routes; each server operation independently checks identity, role, ownership,
versions and state. Hidden navigation is not the access boundary.

The component/deployment view below is a module diagram. The following class,
state and sequence diagrams use UML-style relationships over the actual data/services;
they are maintained documentation, not automatically generated runtime diagrams.

```mermaid
flowchart TB
  subgraph Browser[Browser]
    UI[React client components]
  end
  subgraph Vercel[Vercel Node.js application]
    Pages[App Router server pages and role guards]
    HTTP[Route handlers and bounded request adapters]
    Auth[Auth and account services]
    Events[Event and publication services]
    Registration[Registration queries and transactions]
    Assistant[Source projection, admission, validation and history]
    Client[Server-only SoCLaaS client]
    Prisma[Prisma client with pg adapter]
  end
  DB[(Environment-specific Neon PostgreSQL)]
  LLM[SoCLaaS completion endpoint]
  Pages --> UI
  UI -->|Same-origin HTTP| HTTP
  Pages --> Auth
  HTTP --> Auth
  HTTP --> Events
  HTTP --> Registration
  HTTP --> Assistant
  Events --> Prisma
  Auth --> Prisma
  Registration --> Prisma
  Assistant --> Prisma
  Assistant --> Client
  Prisma --> DB
  Client -->|Approved public source and question only| LLM
```

`src/app/` is the routing boundary, `src/components/` contains shared account/event
presentation, and `src/features/` holds Student registration and assistant state/UI.
`src/lib/` contains portable fields, form types and validation. `src/server/` contains
authoritative policies/services; `server-only` prevents accidental client imports.
The model is outside the database transaction and has no application tools.

### 2.2 Core persistent class relationships

These are selected **Prisma models**, not a claim that every service is a class.
Fields are abbreviated. `draft`, `draftForm`, publication snapshots and captured
forms/answers are JSON values; there is no separate persistent `Form` model.

```mermaid
classDiagram
  class User {
    UUID id
    String username
    AccountRole role
    String passwordHash
    Int credentialVersion
    String studentName
    String studentPhone
    Int profileVersion
  }
  class Session {
    String tokenDigest
    UUID userId
    DateTime lastSeenAt
    DateTime expiresAt
  }
  class Event {
    UUID id
    UUID ownerId
    EventState state
    Int version
    Int draftVersion
    Json draft
    Json draftForm
    UUID currentPublicationId
  }
  class EventApproval {
    UUID id
    Int eventVersion
    Int draftVersion
    Json snapshot
    String digest
  }
  class EventPublication {
    UUID id
    Int revision
    Json snapshot
    String digest
  }
  class Registration {
    UUID id
    UUID studentId
    RegistrationState state
    Int generation
    Int version
    UUID currentSubmissionId
  }
  class RegistrationSubmission {
    UUID id
    Int generation
    Int version
    UUID formRevisionId
    Json capturedForm
    Json answers
    String profileName
    String profilePhone
  }
  class RegistrationOperation {
    UUID actorId
    UUID eventId
    RegistrationOperationKind operation
    UUID key
    String payloadDigest
    Json result
  }
  class StudentAiHistory {
    UUID userId
    UUID eventId
    String requestId
    String revision
    Json payload
    DateTime expiresAt
  }
  User "1" --> "0..*" Session : authenticates
  User "1" --> "0..*" Event : owns as Organiser
  Event "1" --> "0..*" EventApproval : pending review snapshot
  Event "1" --> "0..*" EventPublication : publication history
  Event "0..1" --> "0..1" EventPublication : current pointer
  User "1" --> "0..*" Registration : participates as Student
  Event "1" --> "0..*" Registration : places
  Registration "0..*" --> "1" EventPublication : joined revision
  Registration "1" --> "0..*" RegistrationSubmission : immutable history
  Registration "0..1" --> "0..1" RegistrationSubmission : current pointer
  RegistrationSubmission "0..*" --> "1" EventPublication : captured publication
  User "1" --> "0..*" RegistrationOperation : actor
  Event "1" --> "0..*" RegistrationOperation : idempotent operations
  User "1" --> "0..*" StudentAiHistory : private turns
  Event "1" --> "0..*" StudentAiHistory : selected event
```

Important constraints in [the schema](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/blob/55d9cb7/prisma/schema.prisma)
and SQL migrations include globally unique usernames, one registration per
Student/event, immutable submission identities per generation/version, current-pointer
relationships, and operation keys scoped by actor/event/operation. The `approvedBy`
and `actorId` fields in publication/approval snapshots are UUID values, not separately
declared Prisma User relations. Foundation probes, auth throttles and AI admission
models are omitted above for readability; they remain real schema components.

### 2.3 Publication lifecycle

```mermaid
stateDiagram-v2
  [*] --> DRAFT: Create event
  DRAFT --> DRAFT: Save private draft or preview
  DRAFT --> PUBLISHED: Publish exact approved snapshot
  DRAFT --> [*]: Delete never-published draft
  PUBLISHED --> PUBLISHED: Save private changes without changing live revision
  PUBLISHED --> PUBLISHED: Preview and publish approved replacement
  PUBLISHED --> WITHDRAWN: Withdraw
  WITHDRAWN --> WITHDRAWN: Edit or preview privately
  WITHDRAWN --> PUBLISHED: Republish approved future-start event
  PUBLISHED --> CANCELLED: Cancel Event
  WITHDRAWN --> CANCELLED: Cancel Event
  CANCELLED --> CANCELLED: Owner read only
```

`EventEditor` has separate publication/editor/preview presentation modes; these are not
extra database states. `mutateEvent` locks an owner-scoped event, checks the expected
version and binds approval to event/draft versions plus a canonical snapshot digest.
Saving invalidates old approvals. Publish rechecks time and rejects capacity below
active registration count. Original publication history remains separate from the
working draft. Cancel Editing, discard saved changes, withdrawal, cancellation and
never-published deletion have different effects.

The service supports saving a versioned draft form through its API, while the current
editor exposes only event fields. This distinction matters when integrating Keith's
form-builder/roster work: do not document an API capability as an existing user screen.

### 2.4 Transactional registration sequence

```mermaid
sequenceDiagram
  actor Student
  participant UI as Registration form
  participant Route as Registration HTTP adapter
  participant Service as mutateRegistration
  participant DB as PostgreSQL transaction
  Student->>UI: Confirm event values and sharing
  UI->>Route: POST payload, expected revisions, idempotency key
  Route->>Service: Validated request and presented session
  Service->>DB: Authenticate and lock account/session
  Service->>DB: Lock event FOR UPDATE
  Service->>DB: Lookup scoped operation key
  alt Same key and matching payload already committed
    DB-->>Service: Stored result, no second place
  else New operation
    Service->>DB: Check current publication, form, state and database time
    Service->>DB: Count active registrations
    alt Eligible and capacity remains
      Service->>DB: Create next generation and captured submission
      Service->>DB: Mark registration ACTIVE and store operation result
      Service->>DB: Recheck session and before-start cutoff
      DB-->>Service: Commit all writes together
    else Stale, full or unavailable
      DB-->>Service: Rollback / conflict
    end
  end
  Service-->>Route: Committed result or failure
  Route-->>UI: Status and safe feedback
  UI-->>Student: Success summary only after committed response
```

The event lock is shared with publication/lifecycle mutations, preventing two
transactions from taking the last seat or reducing capacity beneath active places.
The code retries only explicit serialization/deadlock aborts once with the same
operation key; arbitrary dependency errors are not blindly retried. Captured form,
profile values and answers are stored in immutable `RegistrationSubmission` rows.
Correction creates another submission version; rejoin advances the registration
generation so an old operation cannot execute against a new registration.

`registrationActions` drives UI eligibility, while the transaction repeats the
authoritative checks with database time. Join/rejoin/correct require publication;
cancel also allows withdrawal. All require a start strictly later than database time.
My Events hides current public excerpts when withdrawn/cancelled; retained private
records do not grant access to stale public information.

### 2.5 Grounded assistant request sequence

```mermaid
sequenceDiagram
  actor Student
  participant UI as PublicationChat
  participant HTTP as hostedResource
  participant Life as Publication lifecycle
  participant Gate as Durable admission
  participant Model as SoCLaaS
  participant History as Private history
  UI->>HTTP: POST question, requestId, expected revision
  HTTP->>HTTP: Check deployment, origin, method, body and session
  HTTP->>Life: Load authenticated current approved source
  Life-->>HTTP: Source and revision binding
  HTTP->>Gate: Reserve attempt, output allowance and named lease
  alt Admission denied
    Gate-->>HTTP: Busy, exhausted or blocked
    HTTP-->>UI: Truthful failure without provider call
  else Admission granted
    HTTP->>Model: System policy plus public source and current question
    Model-->>HTTP: Candidate reply and internal evidence
    HTTP->>HTTP: Bound parsing, identity and exact-quote validation
    HTTP->>Life: Recheck session, current publication and evidence
    HTTP->>Gate: Release named lease in finally
    HTTP->>History: Save bounded server-produced result
    History->>Life: Recheck current authenticated publication
    HTTP-->>UI: Validated result or safe technical/source failure
    UI->>UI: Revalidate answer before rendering friendly prose
  end
```

The diagram abbreviates route/service calls; provider work does **not** hold an open
database transaction. A released lease does not refund spent attempt/output allowance.
After inference, source/session checks suppress detected replacement, withdrawal or
expiry before delivery. The final check is a linearisation point, not a promise that
an event can never change immediately after a response.

`PublicationChat` uses generation tickets and abort controllers to reject delayed
client results. Routine open/window-focus refresh does not interrupt an active answer
or resend inference. A confirmed source change invalidates old turns before loading
the replacement. The model receives no conversation history, private submission,
profile, draft, proposal or inbox context. Restored display history is separately
validated against the current source.

## 3. Implemented features and interfaces

### 3.1 Product routes

Paths below belong to the application origin, not GitHub Pages.

| Route | Role / behavior |
| --- | --- |
| `/`, `/signup`, `/login` | Public landing, fixed-role account creation and login. |
| `/account` | Authenticated credentials; optional Student profile for Students only. |
| `/student` | Published-event discovery by title and upcoming/started filter. |
| `/student/events/[eventId]` | Current approved details, registration availability and conditionally enabled assistant. |
| `/student/events/[eventId]/register` | Event-specific confirmed registration. |
| `/student/my-events` | Own current registration actions/change flags. |
| `/student/registrations/[registrationId]` | Own captured-submission correction. |
| `/organiser` | Own-event dashboard/search/sort/create. |
| `/organiser/events/[id]` | Private working draft, exact preview, publication and lifecycle actions. |
| `/dev/student-assistant` | Strictly local development simulation/live synthetic harness. |
| `/dev/student-assistant/publication/[eventId]` | Strictly local authenticated source inspection, not an answering screen. |

### 3.2 HTTP surface

Read the route and its adapter before adding a consumer. Requests do not accept
arbitrary actor/owner/source identity from the browser.

| Route family | Methods and authoritative implementation |
| --- | --- |
| `/api/auth/signup`, `/login`, `/logout` | POST; `server/auth` validates origin, bounded JSON, throttling and sessions. |
| `/api/account/credentials` | POST; per-action current password and credential version. Settings reads are server-page/service calls. |
| `/api/student/profile` | GET/POST; self-only optional profile and profile version. |
| `/api/organiser/events` | GET/POST; own list and private create. |
| `/api/organiser/events/[id]` | GET/POST; own read or one of save/preview/publish/withdraw/cancel/delete/discard. |
| `/api/student/events`, `/[eventId]` | GET; published projection, own availability, current-pointer recheck. |
| `/api/student/events/[eventId]/registrations` | GET captured initial screen / POST join or rejoin. |
| `/api/student/registrations` | GET own history/list. |
| `/api/student/registrations/[registrationId]` | GET correction screen / POST captured correction. |
| `/api/student/registrations/[registrationId]/cancel` | POST own cancellation with generation/version/key. |
| `/api/student/events/[eventId]/assistant/source`, `/history`, `/answer` | GET source, GET history, POST answer; hosted policy and publication/session checks. |
| `/api/dev/student-assistant` and its publication descendants | Development-only bounded endpoints; no hosted fallback. |
| `/api/internal/foundation-probe` | Explicitly protected synthetic infrastructure probe; not an application feature. |

Use route-local response shapes and status codes. Auth bodies are bounded to 4 KiB,
registration bodies to 256 KiB and hosted assistant question bodies to 8 KiB, with
streaming limits/timeouts. A technical 503 must not be recast as an empty result or a
successful missing-fact model answer.

### 3.3 Important presentation/data distinctions

- Global Student profile is optional; each event submission requires Name plus a
  valid phone or Telegram handle and explicit sharing. Global Phone accepts phone
  numbers only. Event submission never writes the profile.
- Engine forms support zero to ten questions and four types. Choice questions have
  2–10 stable-ID options. Short/long answers are limited to 250/2,000 characters.
  Current Organiser UI has no question-building controls.
- Stored role is fixed. There is no guest participation, role switch, payment, seat
  hold, waitlist or completed registration through the chatbot.
- Current source supports future-start events and at most 32 KiB / 32 source sections.
  This is narrower than all potentially valid publication content. Oversize data is
  refused, not silently truncated into a different event.
- The current code has no proposal PDF parser/upload UI or private inbox/reply
  workflow. Their presence in planned specs does not make them executable features.

## 4. Security and AI boundaries

### 4.1 Accounts and server authorization

Passwords are NFC-normalised and hashed with async Node scrypt (`N=131072`, `r=8`,
`p=1`, independent 32-byte salts, 64-byte output). Hash concurrency is bounded per
process. Sessions use opaque 32-byte random tokens; only SHA-256 token digests persist.
Hosted cookies use `__Host-turnup_session`, Secure, HttpOnly, SameSite=Lax and Path `/`;
local loopback uses a separate cookie name. Idle/absolute expiry are 30 minutes/eight
hours. Mutations revalidate authoritative identity/session around critical writes.

Username changes preserve UUID ownership and sessions. Actual password changes
atomically increment the credential revision and revoke all sessions. No-op saves
still reauthenticate but do not revoke them. Login rechecks locked credentials before
issuing a session, preventing an old verified password from minting a post-change one.

Origin checks and validated Vercel ingress attribution protect request admission.
Generic forwarded headers are not trusted fallbacks. Local mode ignores them and
uses a conservative shared bucket. Auth counters store keyed identifiers, not raw
usernames/IPs. Limits are separate for signup/login/settings; a provider/dependency
failure is not proof a limit worked.

### 4.2 Prompt injection and evidence

Treat public event text, questions and provider replies as untrusted data. The server
resolves the approved publication and constructs context; callers cannot supply a
different source or actor. The model receives no tools and cannot publish, register,
change an account or forward a message. JSON shape, source identity, exact quoted
substrings and size are checked; a WeakSet brand prevents merely cast objects from
being rendered as validated answers. React escapes reply/source text; the UI does not
insert provider HTML.

These controls constrain effects and provenance. They are **not a proof of semantic
entailment**: a reply could cite genuine text yet make a misleading inference. Include
benign and adversarial semantic evaluation before broader release claims. Keep
internal quotations/revisions out of Student conversation prose as implemented.

### 4.3 Hosted limits and private history

The code's hosted Student policy has separate Preview/Production approval rows and
budgets; it requires matching Vercel/application/database labels and the Student key.

| Limit | Current hosted ceiling |
| --- | --- |
| Admitted requests | 200 per environment's approved pool; failures are not refunded |
| Reserved output | 200,000 tokens total; at most 1,000 per request |
| Provider request size / timeout | At most 65,536 bytes / 20 seconds, potentially reduced by configured caps |
| Shared admission | One unexpired lease, 10-second spacing, 60-second lease expiry |
| Per-account admission | 20 requests per rolling 15 minutes |
| Approval lifetime | Seven days from the first target-specific activation |
| Question / visible reply | 1,000 / 700 Unicode code points |

`scripts/activate-student-ai-budget.mjs` activates only an explicitly selected target
and refuses incompatible existing approval/model/environment state. Redeployment does
not reset spend or renew expiry. Do not run it merely to make a documentation screenshot
work. Model permission, provider rules and a bounded live test need their own evidence.

History is keyed by account/event/request, bound to publication revision, with at most
20 recent turns returned. Appends prune other revisions/excess turns in that account/
event and opportunistically delete expired history. Expiry is derived from the current
event end plus 90 days. Reads filter expiry and current publication; logout does not
delete history. This code does **not** establish scheduled full-store retention cleanup
or backup erasure. Raw prompts, credentials and personal values must not enter logs.

## 5. Testing and manual verification

### 5.1 Ordinary checks

From the repository root:

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm db:validate
corepack pnpm build
node workflow/validate-docs.mjs
```

`typecheck` regenerates Prisma and Next.js route types before `tsc`; `build` generates
Prisma then builds Next.js. The ordinary Vitest configuration excludes explicit
database integration suites. Synthetic/mock tests do not call the live LLM or prove
the hosted database configuration.

On Windows, existing hosting tests need **Git Bash** on PATH and LF workflow source.
CRLF-sensitive extraction can fail before executing the fixture. If normalising bytes
temporarily for a diagnostic run, restore the original bytes and record that the raw
checkout command failed; do not change expectations to hide it. Sandbox restrictions
can separately prevent temporary-file replacement or Next.js dependency junctions.

The prior UI increment recorded 688 tests / 53 files passing under its controlled
compatibility run, plus build/types/lint. That is historical evidence for that source;
it is not a claim that all tests were rerun for this documentation increment. Current
document/site checks and independent findings belong in
`docs/documentation-preparation.md` in the source repository.

### 5.2 Explicit SQL suites

| Suite | Opt-in / target |
| --- | --- |
| `corepack pnpm test:auth:db` | `RUN_AUTH_DB_INTEGRATION=1`, `AUTH_TEST_OWNER=darryl`, exact approved endpoint/database and matching non-production URLs supplied to the process. No private env file automatically loaded. |
| `corepack pnpm test:db` | `RUN_FOUNDATION_DB_INTEGRATION=1` against an assigned synthetic non-production target; special destructive SoC-gate checks need their additional dedicated-database opt-ins. |
| `corepack pnpm exec vitest run --config tests/events/vitest.database.config.ts` | `RUN_LOCAL_EVENT_SQL=1`; disposable in-memory PostgreSQL/socket fixture. |
| `corepack pnpm exec vitest run --config tests/registration/vitest.database.config.ts` | Default local fixture needs `RUN_LOCAL_REGISTRATION_SQL=1`. Supplying `D007_SYNTHETIC_SQL_URL` selects a different suite requiring its exact dedicated loopback target and explicit reuse policy; never supply a shared database. |
| `corepack pnpm exec vitest run --config tests/student-assistant/publication-sql.config.ts` | `RUN_LOCAL_PUBLICATION_SQL=1`; disposable local SQL/mocked inference rather than Production. |

Never substitute Production URLs, reset shared data or enable a destructive integration
suite to obtain a green check. Record exact command, revision, fixtures, result and
unrun checks. Inspect each current suite guard because opt-ins intentionally differ.

### 5.3 Manual acceptance and screenshots

Use separate demonstration accounts and synthetic records in an assigned test
environment. Begin with the [User Guide walkthrough](UserGuide.md#a-short-tester-walkthrough),
then check:

- Anonymous and foreign-role/owner access; stale sessions after logout/password change.
- Required fields, focus on validation errors, pending-state duplicate-click prevention,
  keyboard access to account menus and visible focus at narrow/desktop widths.
- Incomplete draft save, exact preview/approval, stale approval rejection, private/live
  separation, withdrawal/republication, cancellation and capacity-floor rejection.
- Last-place concurrency, same-key retry, changed-payload key rejection, cancel/rejoin
  generations and captured-form correction without changing global profile/history.
- Publication replacement/withdrawal during an answer, unavailable history, foreign
  history denial, missing/oversize sources, throttling, provider timeout and inert
  script/instruction rendering. Do not equate quotation validation with semantic quality.

The User Guide supplies **14 numbered screenshot placeholders**, including desktop/
narrow framing and synthetic-data instructions. Capture real screens with the built-in
browser and replace the placeholders using the source checklist at `docs/assets/images/README.md`.
Developer simulations must remain visibly labelled. Live-provider evaluation should
record a small authorised request budget and actual outcomes separately from fixtures.

## 6. SDD and multi-agent engineering process

### 6.1 Source of intent versus source of implemented behavior

Canonical `specs/` describe intended behavior; code and reproducible checks establish
implemented/verified portions. Historical setup summaries are evidence, not current
instructions. For a requirement change, update the affected contracts/scenarios and
change record, implement the agreed slice, then check its intent—including conflicts,
access and failure cases—rather than merely repeating specification wording in a test.

Both humans own complete role workflows: Darryl the Student side/accounts and Keith
the Organiser side/foundation. Shared schema/contracts have named leads and one active
writer. Consumer work follows exact producer revision/interface handoffs. Work packages
are roadmap groupings, not automatic permission to implement or proof of completion.

### 6.2 Repeatable agent workflow

1. The main chat establishes scope from the request, current code/contracts and
   prerequisites; it records a bounded plan and unresolved decisions.
2. The human authorises implementation where the active workflow requires it. Existing
   explicit authorisation is reused; approval is not invented by a subordinate agent.
3. The main chat normally implements/tests directly. A specialist is dispatched only
   for an authorised bounded need, with exact files, source revision, interfaces,
   requirement/scenario IDs, outputs and checks. Avoid multiple writers to one file.
4. A non-author implementation verifier independently checks completed application or
   executable workflow/configuration changes. The author corrects material findings
   and obtains proportionate rechecks. Documentation alone does not automatically
   require a separate specification audit.
5. The parent consolidates actual outputs, failures, limitations and handoffs in the
   existing owner log/change evidence. Explicit human delivery instructions govern
   commit/push/deployment; GitHub handles human PR review and merge administration.

An **agent** is a separate execution/context with its assigned role and tools. A
**skill** supplies reusable procedures to the main chat or a specialist; it does not
create an isolated reviewer simply by being invoked. Project context must pass with
the handoff even when an agent already has a specialist prompt. A human decision
needed by a child is reported to the parent, which requests clarification rather than
silently deciding product policy.

Local orchestration currently uses selective delegation rather than a mandatory agent
per stage. Required independent review is retained. Token counts may be unknown; do
not infer savings or costs from dispatch counts alone. Prompt injections can enter
spec excerpts, issue text, event content or agent handoffs: treat quoted material as
data and preserve the human instruction/authority boundary at each transfer.

### 6.3 Workflow artifact inventory

Files stay in natural framework locations where moving them would break discovery.
`workflow/README.md`
provides the consolidation map for this documentation increment.

| Location | Purpose |
| --- | --- |
| `AGENTS.md`, `CONTRIBUTING.md` | Repository scope, ownership, verification and logging rules. |
| `specs/README.md`, baseline, decisions, role/shared contracts | Task reading map and intended product behavior. |
| `specs/work-packages/`, implementation plan, integration handoffs | Dependencies, responsibility and producer/consumer contracts. |
| `specs/verification/acceptance-scenarios.md` | Behavior-focused acceptance/evaluation targets. |
| `changes/`, `changes/_template/` | Scoped intent/tasks/design/evidence; numbers are allocated by the relevant human. |
| `logs/darryl/`, `logs/keith/` | One summary log per PR increment, appended substantial-prompt Request/Results entries. |
| `tests/`, `vitest.config.ts`, per-suite database configs | Deterministic checks and explicitly isolated SQL fixtures. |
| `.github/workflows/vercel-deploy.yml`, `.github/scripts/` | Hosted gates, candidate parsing/validation and safe promotion. |
| `.github/workflows/agent-usage.yml` | Existing development usage workflow; not a product capability or evidence that every prompt has measured usage. |
| `scripts/activate-student-ai-budget.mjs` | Explicit environment-specific durable Student budget activation. |
| `scripts/copy-student-assistant-env.mjs` | Bounded private local configuration projection; not a credential-publishing mechanism. |
| `workflow/validate-docs.mjs` | Credential-free document/link/placeholder and diagram-source checks. |
| `docs/_config.yml`, layouts/includes/assets, `WEBSITE.md` | GitHub Pages content, rendering and maintenance. |
| Local `.codex/agents/`, `.agents/skills/` | Specialist definitions/procedures. Machine-local customizations are excluded from this deliverable and must not be pushed. |

The guide describes the local procedures without copying their private/customised
definitions into `workflow/`. The existing directory names are not permission to
publish those excluded files. See the existing repository records for tracked shared
instructions; do not replace them with outdated MP2 sub-skills.

## 7. Deployment and product website

### 7.1 Application release

The application runs on Vercel with environment-specific Neon resources. The selected
Production entry point is **[turnup-nine.vercel.app](https://turnup-nine.vercel.app/)**;
the Production site is publicly accessible following the project's protection-setting
update. On 23 October 2026, an unauthenticated HTTP check returned 200 at this exact
address with the TurnUp page and no authentication redirect. Role features still
require application authentication; this URL check does not establish a full workflow.

For school/managed-network loading failures, compare the same URL on another permitted
network and record the browser error and time. DNS, local-network and upstream filtering
are possible causes; do not attribute a failure to a particular school policy or Vercel
firewall rule without diagnostics. See [Vercel connectivity troubleshooting](https://vercel.com/kb/guide/troubleshooting-connectivity-issues).
The website and User Guide give conditional network advice rather than claiming that
every school network is blocked.

The existing deployment workflow runs PR checks separately from privileged releases.
Protected `master` is the Production source; protected `preview/<one-segment>` branches
can target Preview. It installs locked dependencies, runs gates, pulls target-matched
Vercel settings, builds, applies reviewed migrations, activates the selected AI pool
without resetting spend and uploads a candidate. Production verifies candidate
project/target/source plus safe root/Student-source responses without inference before
the promotion job. Promotion checks the protected master head immediately before
promoting the exact candidate. Stable Preview alias handling rejects Production domains.

Keep the original build/revision, candidate URL, environment, migration history and
actual verification with a release. Do not claim a rollback command repairs data:
application rollback and compatible database recovery need separately reviewed,
tested plans. General retention/derived-copy cleanup and the full second-device
cross-role release walkthrough remain WP-007 integration work led by Keith.

### 7.2 Documentation site

The product site follows MP2: Markdown guides with front matter, GitHub Pages' Jekyll
build, Minima navigation and a document layout with strict Mermaid rendering. It is a
static documentation site; it does not host the Next.js server, sessions or database.

Expected project-site path after publication:
`https://cs3227-2610-mp3-turnup.github.io/CS3227-2610-MP3/`.
This is the configured target, not a claim that Pages has been enabled or deployed.

`docs/WEBSITE.md` covers local build, branch-based `/docs` publication and maintenance.
Use `app_url` in `_config.yml` to change site launch links; also update the two portable
application links in the guides. Relative URLs preserve the GitHub project base path.
No app secrets belong in Jekyll configuration. Generated site/cache/vendor files are
ignored, and internal plans/runbooks are excluded from the published product site.

Mermaid 11.4.1 loads from jsDelivr only when diagram blocks exist. JavaScript/CDN access
is required for graphical rendering. Strict security mode is retained, each diagram
failure is isolated and readable source remains on failure/offline. No screenshot or
server-side diagram image is fabricated as a substitute for rendered verification.

## 8. Known gaps and glossary

### 8.1 Integration work not established by this guide

- Keith's proposal processing UI/provider path, form-builder/roster and private reply
  integration are not present in this code snapshot. Incorporate their actual merged
  implementation before adding user instructions or architecture relationships.
- There is no general scheduled retention/deletion implementation covering all drafts,
  submissions, logs, backups and derived stores. History-specific pruning is narrower.
- Contact-action producer shape and broader historical/retention
  policies must not be filled in by documentation guesses.
- Account and Student screenshots were supplied manually on 23 October 2026; the four
  Organiser figures remain placeholders. Website visual rendering, full hosted flows
  and live-model semantic quality need their own actual evidence.

### 8.2 Glossary

| Term | Meaning in this implementation |
| --- | --- |
| Working draft | Private event fields/form awaiting exact public approval. |
| Publication | Immutable approved snapshot selected by an event's current pointer. |
| Approval | Version/digest-bound review snapshot, invalidated by relevant changes. |
| Registration generation | A distinct join/rejoin lifetime for one Student/event record. |
| Submission version | Immutable corrected answers/contact within a registration generation. |
| Idempotency key | Scoped operation identity whose matching committed payload replays its result. |
| Source revision | Publication ID/revision/digest binding used for assistant context and history. |
| Admission / lease | Durable budget reservation and bounded in-flight occupancy before inference. |
| Evidence validation | Shape/identity/exact-quote checks; not complete semantic correctness proof. |
| SDD / work package | Spec-driven development / a roadmap grouping with explicit dependencies. |

## 9. Acknowledgements

- **Team MP2 ClubStock documentation:** the [User Guide](https://github.com/CS3227-2610-MP2-ClubStock/CS3227-2610-MP2/blob/master/docs/UserGuide.md),
  [Developer Guide](https://github.com/CS3227-2610-MP2-ClubStock/CS3227-2610-MP2/blob/master/docs/DeveloperGuide.md)
  and [website sources](https://github.com/CS3227-2610-MP2-ClubStock/CS3227-2610-MP2/tree/master/docs)
  informed the numbered guide structure, contents, practical walkthroughs, Minima/Jekyll
  setup and Mermaid renderer. The documentation Gemfile pins MP2's resolved
  `github-pages` 232 release; its old platform-specific lockfile is not blindly copied.
  The renderer is adapted from that team's code; content,
  diagrams, product styling and web-specific instructions are rewritten for TurnUp.
  MP2's screenshots/product claims were not reused as TurnUp evidence.
- **Frameworks/libraries:** Next.js, React, TypeScript, Prisma, node-postgres, Vitest,
  Vite and ESLint provide the implementation/test infrastructure pinned in the lockfile.
  Node.js crypto supplies hashing/randomness; no separate authentication framework is
  claimed. GitHub Pages/Jekyll/Minima and Mermaid provide documentation presentation.
- **Hosting/provider:** Vercel, Neon PostgreSQL and NUS SoCLaaS provide deployment,
  persistence and completion services respectively. Project adapters, permissions and
  limit evidence are distinct from provider availability or course compliance.
- **Project requirements and process:** the course assignment supplied by the team,
  maintained TurnUp specs/change records and human decisions provide the SDD and
  multi-agent workflow context. Historical records were consulted as provenance;
  observable implementation details above were checked against code.
- **AI assistance:** OpenAI Codex assisted code inspection, drafting, diagrams, site
  preparation and checks. Such assistance does not supply human reflection, screenshot
  evidence, an unrun test result or independent review of its own authored work.
