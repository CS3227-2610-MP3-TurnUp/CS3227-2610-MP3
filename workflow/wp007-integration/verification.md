# WP-007 integration evidence — 23 October 2026

Source: 53931890ff3d3ec91bd7b1505770ba846113688e. Branch: codex/wp007-integration. Owner: Darryl. Single main agent, as requested; self-review only. No independent agent review is claimed. User Guide and Developer Guide are byte-for-byte unchanged (guide-preservation.json). This is local integration evidence, not a claim that every release requirement is complete.

## Changes and findings

- Event SQL fixture: a deliberately rejected immutable-publication update poisoned the disposable pg socket for the next test. Assert the exact database trigger error through PGlite directly; full suite now passes.
- Registration concurrency fixture: retain its existing migration sentinel assertion, then replay subsequent committed migrations so current event-service fields exist.
- Daily-generation SQL fixture: mock the Next server-only build marker in this opt-in Node suite, following the other server tests. Application security checks are unchanged.
- No application, schema, dependency, guide or agent configuration changes.

## Executed checks

| Check | Result | Evidence |
| --- | --- | --- |
| Frozen dependency installation; Prisma generation/validation | Passed | Locked versions; lockfile unchanged |
| Full ordinary regression, pnpm test --maxWorkers=2 | 897 passed, 5 skipped | regression-output.txt |
| Full lint, typecheck, production build | Passed | build-output.txt; final scoped ESLint and tsc --noEmit also exit 0 |
| Events disposable SQL | 7 passed | event-sql-recheck-output.txt |
| Registration disposable SQL | 7 passed | registration-sql-output.txt |
| Student assistant source/history/admission SQL | 25 passed | assistant-sql-output.txt |
| Real PostgreSQL registration concurrency | 9 passed | registration-concurrency-output.txt |
| Development isolated daily-generation SQL | 4 passed | daily-generation-sql-completed-output.txt |
| Public hosted authentication/origin denials | 9 expected denials | public-denials.json; no hosted writes or model calls |
| Guide preservation | Both unchanged | guide-preservation.json |

The real PostgreSQL race tests cover last-seat competition, duplicate requests, capacity/withdrawal races, correction/rollback, cutoff, session expiry and serialization retry. The task-owned localhost PostgreSQL cluster on port55487 was stopped after verification. Daily-generation tests used a disposable schema and removed it. All SQL totals above are 52 passing checks, separate from the ordinary suite.

On Windows, the existing Bash workflow tests required Git Bash on PATH and temporary LF bytes for vercel-deploy.yml; original file bytes were restored after the regression run. Initial failing/blocked attempts are retained in the output files: event socket failure, daily SQL missing acknowledgement/server-only marker and default5-second timeout. Final daily SQL used --testTimeout=30000 and passed all4. A sandboxed Corepack recheck could not access its registry cache; final ESLint/TypeScript checks ran the installed package binaries directly and passed.

## Development database

With explicit user approval, applied the seven already-merged pending migrations to the verified development/non-production database. All13 committed migrations are applied. No Production migration, quota reset or record deletion was performed. Preflight and result metadata contain no connection strings. The raw migration result initially flagged four byte-checksum differences; migration-checksum-analysis.json establishes that every applied checksum matches either canonical Git LF or Windows CRLF, with no SQL-content mismatch. Checksums were not rewritten.

## Actual local browser walkthrough

Used two disposable synthetic accounts (Student and Organiser) against localhost:3001 and the non-production database. Created event8b6cc3f5-6ade-40d9-bb56-f589440e8f4f, titled WP007 SYNTHETIC Gardening Check. Saved required fields, saw unavailable suggestion generation fail truthfully, completed manually, previewed, explicitly approved and published. Student discovered the event, registered with explicit sharing consent, corrected the captured submission, cancelled and registered again. Capacity fell from2 to1. A Student opening /organiser received Access unavailable.

One authorized real Student question returned: tools are provided and a water bottle is required. History survived page reload. The local file allowance records one attempt; shared authorization now accounts for13 of15 calls, with2 unused. Token usage is unavailable for this UI call. Earlier12-call evaluation belongs to older revisions and is not re-labelled as current Organiser prompt verification. See student-live-result.json and screenshots. The machine-specific launcher and secret configuration are excluded from this change. Synthetic accounts/event remain only in development.

## Acceptance scope and remaining limits

T13/T14: deterministic security/failure suites and prior labelled live evidence exist; this run adds one benign Student UI call. It does not establish comprehensive quality/adversarial evaluation of the latest Organiser prompt.

T15: the local cross-role journey passes for publication, registration and Student FAQ/history. It does not establish the complete second-device hosted journey, hosted Organiser inference, escalation/reply delivery or laptop-independent maintenance. Public unauthenticated access/denial was checked separately.

T26/T27: current retention/source invalidation tests run in the ordinary and assistant SQL suites. No new global personal-record retention decision, provider-storage/backup audit or production cleanup execution is claimed. Existing G04/G06/G07 limitations remain explicit in canonical records; Organiser draft cleanup alone does not close global retention.

T28: source, changes, checks, failures, approvals and limits are recorded. User requested one agent, so no independent reviewer was dispatched. Final deployment/recovery demonstration is outside these local results. No UG/DG updates were made, as instructed.
