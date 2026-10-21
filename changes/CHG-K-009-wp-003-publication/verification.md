# CHG-K-009 — Verification

Source: 54024616eb2c5dd93dcdee458fd66b53c03354b2 plus working change. Human owner Keith; primary agent evidence writer. Implementation and independent review in progress.

## Evidence

21 October 2026: inspected source, full applicable contracts/scenarios, existing implementation evidence, Git branches/worktrees and change allocations (K-007 exists in proposal worktree; K-008 is latest). Created isolated wp-003-publication at the integrated WP-002 revision, allocating K-009. Existing root log/diagram edits preserved. Keith accepted G03 event bounds and scoped G05 timing rules through explicit replies. No application test/migration/deployment result yet for this change.

Live database/SQL/browser/hosted results are not implied by static checks. No synthetic database is assigned for event writes. Full T06/T07/T23/T24 registration/chat portions, G07 and retention integration remain deferred.

## Checkpoint — session stopped during browser setup

Parent: frozen install passed; fresh full unit/service/HTTP suite245/245 across22files, lint, typecheck and production build passed. New event subset28/28. Disposable local PGlite0.4.3 replayed all5 migrations and passed8 schema/state/immutability/ownership-FK/rollback checks; not Neon/concurrent service evidence. Temporary mock-browser fixture removed and loopback dev server stopped; no browser acceptance completed. No live Neon migration applied.

Independent non-author /root/review_wp003 reproduced full245 tests, lint/typecheck and harmless source/rendering injection checks (script escaped, no canary command/file effects, protected field400). Reviewer found P1: digest(JSON.stringify(snapshot)) is unstable across PostgreSQL JSONB key reordering, causing valid publish approvals to fail409. Isolated PGlite JSONB round trip reproduced different hashes/publishGuardPasses:false. Required fix: recursively canonicalise object keys while preserving array order and add JSONB/key-reordering regression; fix/review recheck remains outstanding. Implementation is incomplete and not ready for use.

Computer-use tool reported the user explicitly stopped the application session and instructed ending the turn. Source preserved on wp-003-publication; no commit/push/deployment. Documentation plan/status/handoff finalisation and full final checks also remain outstanding. Read-only issue lookup identified issues8/9/10/11 as producer/consumer tracking; remote reconciliation not performed, Keith owns follow-up within authorised scope.

## Resumed digest correction — 21 October 2026

Corrected digest to recursively sort JSON object keys while retaining array order. Added two regressions: policy key/array ordering and actual service publication with reordered approval snapshot/draft. Parent focused30/30 passed. Independent non-author reviewer reproduced30tests, lint and whitespace and used actual corrected source plus PGlite JSONB roundtrip of snapshot and draft: all original/retrieved/reconstructed hashes matched125dcfacde94d577605bda18bbf910b8ddaf1ce575da6f0e9fae15dea56c9865; content edits and array reorder still alter the digest. P1 resolved. Reviewed policy.ts SHA25609baffdaf8702240e6dfac52229ab53889485e2f085c6ee484f9e260896df8aa.

Reviewer typecheck initially found stale generated dev QA-route reference; parent removed only .next/dev generated cache and reran typecheck successfully. Added tests/events/local-sql.integration.test.ts plus opt-in tests/events/vitest.database.config.ts: ephemeral in-memory engine/loopback single connection, real Prisma/service/JSONB/rollback checks, no hosted configuration or new dependencies. Exact result must be recorded after collection; not Neon concurrency evidence.

Keith explicitly requested another browser attempt. The tool again returned its stopped-session state and required ending the turn. No browser fixture/server was created for this retry and no browser checks passed. Final plan/handoff/status records, final full checks and independent review of added local SQL test/config remain pending.

## Final local implementation checks — 21 October 2026

Runtime: pinned Node24.21.0 and pnpm12.14.0. Source remains5402461 plus35changed/new files in isolated wp-003-publication; no commit hash is invented for this working snapshot.

| Check | Result | Limit |
| --- | --- | --- |
| Frozen locked install (offline cached store on isolated branch) | Passed | No dependency/lockfile change |
| corepack pnpm test | 247/247 across22files passed | Includes30event policy/service/HTTP tests; mocks do not establish SQL concurrency |
| corepack pnpm lint | Passed | Isolated worktree has no nested generated worktrees |
| corepack pnpm typecheck | Passed | Initial stale .next/dev QA-route type removed; no source weakening |
| corepack pnpm db:validate | Passed | Schema validation, not hosted migration |
| RUN_LOCAL_EVENT_SQL=1 corepack pnpm exec vitest run --config tests/events/vitest.database.config.ts | 6/6 across1file passed,1.88seconds | Explicitly permitted parent loopback run; fresh in-memory PGlite0.4.3 via locked Prisma development dependencies; no hosted URL/configuration read |
| Disposable schema diagnostic | All5migrations replayed;8checks passed | In-memory schema/state/current-pointer FK/immutability/rollback only |
| git diff --check and changed-file whitespace/final-newline scan | Passed | Includes untracked files in the separate scan |
| Local Markdown target scan |133targets checked; all new targets resolve | Two existing absent SoC PDF references in decisions.md remain unchanged |

The6real-service SQL cases exercise Prisma/JSONB preview→publication/replacement, current-public projection, role/owner/session denial, forged/stale approval, injected SQL failure after publication insertion with complete rollback, withdrawal/public-read denial, final cancellation/never-published deletion and revoked-token replay. Single-connection PGlite is not Neon or a concurrent PostgreSQL deployment. No shared database was reset/migrated; all synthetic state/socket/client destroyed in teardown. The independently sandboxed reviewer attempt timed out in beforeAll30s with6skipped; this is not a second SQL pass. Parent permitted SQL success remains separate.

## Final independent review

Non-author /root/review_wp003 reviewed the implementation, added SQL test/config and operational documentation. Initial P1JSONB insertion-order digest defect was corrected by the author and independently rechecked using actual corrected source and SQL JSONB roundtrip; content edits/array ordering still invalidate hashes. Final reviewer reproduced full247/247tests, typecheck, lint and whitespace with no unresolved actionable findings. The earlier harmless SSR/development injection results remain scoped evidence: script text escaped, no canary file/command effects, unknown ownerId rejected400; no universal injection/AI/browser guarantee.

Reviewed21product/schema/config/test files fingerprint SHA256(sorted relative path+NUL+bytes+NUL):b9e9e45dd16cb44c5ab13b93ba330ba4e9dd5d7e5cc7d123cbb5f95ec7dd803b. No product edits followed this review; subsequent evidence/status/log changes do not restart review.

## Local browser observations

After resetting the CUA runtime, native Edge connected. A temporary local qa-event-check route mounted the real EventEditor/EventDashboard/EventContent with synthetic in-memory fetch responses. The loopback development server used no database and the fixture never used real credentials. Observed unsaved title notice and disabled preview/lifecycle actions; Cancel Editing restored the saved title; Save Draft advanced the displayed version/confirmed private saving; exact preview showed required fields, SGT schedule and zero-question form; Publish was disabled until the approval checkbox; publish showed live snapshot; a saved private fee edit retained the old live fee; cancelled state removed editing and retained owner history. Dashboard search produced an explicit no-match state and restored matching cards. These are component/UI observations, not persisted or hosted acceptance. Native confirmation dismissal was not separately established; no claim of a dialog-cancel walkthrough.

Visually inspected desktop plus320/375/1280CSS-pixel editor layouts, including stacked dates/action wrapping at narrow widths. DevTools initially had unreliable intermediate width/scale from per-keystroke numeric entry; reset to defaults and atomic width entry restored valid inspected layouts. No DOM-measured overflow, formal enlarged-text, screen-reader or complete keyboard-conformance claim. Temporary fixture removed, test tab closed, device emulation disabled, devtools closed and loopback server stopped. Nextdev-generated AGENTS block was removed, restoring exactHEADinstructions; stale generated .next/dev types removed. No production/Vercel/Neon setting was changed.

## Delivery and remaining integration

Original Organiser-only local implementation delivered, subject to final production build result appended below. Canonical G03event/G05Organiser choices, original-scope package, plan, handoff/status and acceptance portions updated. Student discovery/details remain WP-004. No registration/custom-form/roster/AI/cleanup functionality is claimed. The internal public reader/empty form is a consumer contract, not a Student feature.

Unrun: assigned Neon migration/replay/concurrent service/access/expiry races; authenticated persisted browser end-to-end; hosted persistence/deployment; registration capacity floors/flags/notices; chat invalidation/history; G06retention/G07suppression. Apply the additive event migration only through the existing assigned/verified target workflow before using event routes against a hosted database. No hosted target is assigned in this run and no deployment authority is implied.

Read-only tracking inventory identified affected issues[8](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/8),[9](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/9),[10](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/10),[11](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/11). Keith owns pending remote scope/decision/evidence reconciliation when authorised; no issue/PR status or human-review assessment was performed. No commit, push, PR publication or deployment.

Final changed paths (35):

- `README.md`
- `changes/CHG-K-009-wp-003-publication/change.md`
- `changes/CHG-K-009-wp-003-publication/tasks.md`
- `changes/CHG-K-009-wp-003-publication/verification.md`
- `docs/plans/wp-003-publication-plan.md`
- `logs/keith/13-wp-003-publication.md`
- `prisma/migrations/20261021000000_events/migration.sql`
- `prisma/schema.prisma`
- `specs/README.md`
- `specs/decisions.md`
- `specs/implementation-plan.md`
- `specs/integration-handoffs.md`
- `specs/organiser/event-management.md`
- `specs/shared/domain-and-data-contracts.md`
- `specs/verification/acceptance-scenarios.md`
- `specs/work-packages/wp-003-publication.md`
- `src/app/api/organiser/events/[id]/route.ts`
- `src/app/api/organiser/events/route.ts`
- `src/app/globals.css`
- `src/app/organiser/events/[id]/page.tsx`
- `src/app/organiser/page.tsx`
- `src/components/events/dashboard.tsx`
- `src/components/events/editor.tsx`
- `src/components/events/event-content.tsx`
- `src/lib/event-fields.ts`
- `src/server/events/http.ts`
- `src/server/events/policy.ts`
- `src/server/events/service.ts`
- `src/server/publication/reader.ts`
- `tests/events/local-sql.integration.test.ts`
- `tests/events/policy.test.ts`
- `tests/events/routes.test.ts`
- `tests/events/service.test.ts`
- `tests/events/vitest.database.config.ts`
- `vitest.config.ts`

Final production build: `corepack pnpm build` passed exit0 after all source/test/config changes and QA cleanup, including Prisma generation, TypeScript, all account/event routes and page generation; no QA route in route manifest. Product fingerprint independently matched the reviewed21-file digest exactly. Root worktree still contains only the pre-existing modified foundation log and untracked docs/diagrams; no unrelated work was moved/reverted. Local delivery is complete within the stated limits. No commit/push/deployment. Next bounded task is Keith's separately assigned non-production event migration and persisted/concurrent integration checks, followed by authorised delivery; feature consumers remain WP-004/005/006.


## Approved layout/rescheduling amendment — 21 October 2026

Supersedes the original no-earlier-start policy and combined editor/publication layout for current behaviour. A changed published start may move earlier or later provided it is strictly future at preview and publication. An unchanged past start permits content-only replacement while PUBLISHED; first publication and withdrawn republication require a future start. End-after-start remains enforced. Canonical decisions, shared contract, Organiser presentation, scenarios, screen patterns and plan reflect Keith's approved choices; deferred Student policies remain unresolved.

Delivered: whole-card semantic links; publication-field card/search/start/title projections; content-based Saved changes badge; separate publication/editor/preview modes; saved-draft resume and unsaved cancellation; explicit editor entry; normal-flow preview approval/actions; confirmed Delete draft versus Discard saved changes; refresh resets local preview/approval. Editor removal controls also remain available for incomplete drafts that cannot preview. No additional migration, dependency or API endpoint was introduced by this amendment. EventSummary adds hasSavedChanges; existing ownership/session/approval safeguards remain.

Checks (Node24.21.0; COREPACK_HOME=/private/tmp/turnup-wp002-corepack):

- Focused event suite: 34/34 tests across4files passed.
- `corepack pnpm test`: 251/251 across23files passed; independently reproduced.
- `corepack pnpm lint` and `corepack pnpm typecheck`: passed; independently reproduced. Final post-cleanup typecheck recorded below.
- `RUN_LOCAL_EVENT_SQL=1 corepack pnpm exec vitest run --config tests/events/vitest.database.config.ts`: 7/7 passed using fresh disposable PGlite with actual Prisma/SQL, including earlier future rescheduling and publication-card projections. Loopback bind permission only; no hosted credentials/target. This single-connection check does not establish Neon concurrency behaviour.
- `corepack pnpm build`: passed after fixture removal; actual account/event routes generated and no QA route present.
- `git diff --check`: passed; final structural check recorded below.

Non-author /root/review_wp003 found no actionable defects. Independently reproduced251tests/typecheck/lint/whitespace; reviewed policy/service/card projections and scoped contracts. An isolated synthetic hook/fetch/router harness exercised actual editor handlers and real SSR: publication-only, saved-draft resume, Cancel preservation, preview-only, approval gating/reset and failed-save preservation passed. Synthetic script/instruction content stayed inert. Reviewer did not run a browser, hosted DB or concurrency checks, and did not retry optional SQL in its restricted socket environment.

Final23-file product/schema/config/test fingerprint matches independent review: `0ff76d58259f683138dc8230e03ae553ddaa33f67271877102f5ecf96d4557ec` (SHA-256 of sorted relative path + NUL + exact bytes + NUL). Temporary QA and generated files excluded. Additional delivered paths beyond the prior35-file list: `docs/ui-screen-patterns.md`, `src/components/events/event-card.tsx`, `tests/events/card.test.ts`. Pre-existing `next-env.d.ts` modification preserved, not attributed to this change.

Native Edge checks mounted real components with disposable mocked fetch data, with database URL variables blank: published default shows only Current Live Publication; Edit resumes saved private title/fee; Cancel removes unsaved changes and returns publication; successful save stays editor; injected503 preserves entered values; preview-only screen gates Publish on checkbox; returning to edit then preview clears approval; refresh returns default publication. Dashboard exposes one enclosing card link with public title and Saved changes; visually inspected card/search layout at1280,375,320CSS pixels without visible clipping. These are component/browser observations, not authenticated persisted end-to-end proof. Native confirmation dismissal, full keyboard/new-tab traversal, all lifecycle transitions and narrow preview footer were not re-exercised in this browser pass; handler/service/SSR tests supply the stated complementary coverage.

QA tab closed, emulation/devtools disabled, loopback server stopped, temporary route and stale dev types removed. AGENTS and next-env restored to exact pre-QA bytes, including the user's existing next-env change. Root unrelated foundation log/diagrams preserved. No hosted migration, commit, push, PR or deployment. Existing consumer/hosted/concurrency limitations above remain.

Final cleanup checks: post-cleanup `corepack pnpm typecheck` passed; `git diff --check` and changed/new text trailing-whitespace checks passed. Relative Markdown file-link scan found two pre-existing missing reference PDFs in specs/decisions.md (SoC access/API guides), both already referenced at HEAD; no new broken file links found. Generated files restored again after type generation. No product changes after the independently reviewed fingerprint.
