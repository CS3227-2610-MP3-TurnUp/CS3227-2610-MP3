# CHG-D-007 — Verification

Base `1f0aa8773799f44229638cb473ff5584b3d3fb63` plus uncommitted WP-004 working files. Human owner Darryl approved plan v1.0/D007 on22 October2026. **Main-agent implementation and verification only**, explicitly required by the human; no subagent dispatch/reuse and no independent review claim. Prior K-009/account independent findings/rechecks remain unchanged and retain their own scope.

## Delivered scope and limits

### 22 October 2026 — configured non-production migration check

With Darryl's explicit authorisation for local WP-004 testing, the configured
non-production PostgreSQL target was checked with `prisma migrate status` and
was found to be missing `20261021000000_events` and
`20261022000000_registration`. `prisma migrate deploy` then applied exactly
those two checked-in additive migrations. A second `prisma migrate status`
reported that all six migrations were applied and the schema was up to date.
The local WP-004 server subsequently returned HTTP 200 at its root route.
This is migration and basic availability evidence only: it does not replace a
signed-in browser registration walkthrough, Preview deployment evidence, or
the pending Organiser builder/roster integration.

### 22 October 2026 — Preview deployment

Protected branch `preview/WP-004` deployed revision `31c08d4` through GitHub
Actions run [40](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/actions/runs/39718497430).
The required workflow gates, target-matched Vercel build and Preview migration
all succeeded; Vercel assigned the stable alias
`https://turnup-team-preview.vercel.app` to the uploaded candidate. A public
HTTPS request reached that address with HTTP 200 but received Vercel's Login
page, so it confirms hosted reachability and deployment routing, not an
unauthenticated application walkthrough. Use an authorised Vercel session to
perform the remaining signed-in Preview browser checks.

Student discovery/current details at `/student` and `/student/events/[eventId]`, backed by GET `/api/student/events` and `/api/student/events/[eventId]`. Server checks Student identity/session, current publication/state and allowlisted public projection. NFC/case-insensitive title search, Upcoming default, Started/past and database-time equality, ascending approved start/UUID ties; current post-start/end details readable. Private saved edits do not alter results until publication. Detected withdrawn/replaced source fails closed before delivery. Safe loading/empty/unavailable/conflict/dependency outcomes, explicit refresh, inert public text, Singapore display and existing account menu.

Capacity is advertised capacity only. Remaining places is null and own registration state explicitly unavailable; no enabled Attend/registration/correction control, invented roster or fake success. PAR01/current-read portion of PAR02 is implemented; PAR02 live state/count and PAR03–05/13–15 remain incomplete. Shared custom forms, atomic transactions, submissions/profile confirmation/corrections, My Events and Organiser integration are not implemented in this checkpoint. Do not mark complete T30/T17/T18–24 or whole WP-004 passed.

## Checks and environment

Node24.19.0; repository-pinned pnpm12.14.0 through Corepack; existing Next16.3.8/Prisma7.10.1/Vitest5.0.4. Frozen offline install passed, no dependency/lockfile change. Initial bundled fallback pnpm11.25.0 was rejected by existing engine rules; corrected to installed Corepack without weakening them. Read installed Next server/client, async page/route params and GET/cache conventions before source work.

- Focused `corepack pnpm exec vitest run tests/registration`: final18/18 tests across4files passed after main-review fixes. Earlier17/17 passed before adding the Unicode boundary regression. Tests cover query allowlists, approved-only projection/search/order/time equality/current details, role/session denial, private-data exclusion, replacement/withdrawal during read, stale/invalid identifiers/options, no-store/error handling and inert SSR/loading states.
- `RUN_LOCAL_REGISTRATION_SQL=1 corepack pnpm exec vitest run --config tests/registration/vitest.database.config.ts`:4/4 passed,10.46seconds. Fresh in-memory PGlite/socket from existing locked Prisma development dependencies; replayed existing migrations, actual Prisma/auth/publication/Student query services. Publication→browse/details, private draft isolation and fresh replacement, draft/withdrawn/cancelled/old-publication denial, anonymous/forged/revoked/expired/wrong-role denial and historical post-start fixture checks. Destroyed fixture/client/socket/engine. Single connection: not Neon, capacity concurrency, hosted integration or persisted browser proof. No registration schema exists. These query/SQL source paths were unchanged by later UI/search-policy fixes.
- Typecheck passed after the Unicode product fix (`prisma generate && next typegen && tsc --noEmit`). Database schema validation passed; schema/migrations unchanged, no database target contacted by validation.
- Lint passed after first browser-fixture removal; final post-fix lint/build/regression results are appended below when collected.
- Initial ordinary `pnpm test` on this Windows checkout:36failed/212passed, one suite failed to load (27files). Existing workflow readers expect literal LF while Git checkout has CRLF. One LF diagnostic recovered suite parsing (34failed/234passed) but confirmed Bash unavailable on process PATH (`spawnSync bash --version` returned ENOENT). Added already-installed Git Bash to that test process PATH only and temporarily normalised workflow text:268/268 across27files passed before the final Unicode regression. Exact workflow bytes and process PATH restored in finally; no workflow or hosting-test edits delivered. Final suite uses this same verified environment; ordinary unadjusted Windows invocation retains this tooling limitation.
- First production build passed with actual account/event/Student pages/API routes; no temporary QA route in manifest. Final build after the Unicode guard is recorded below. No deployment performed.

## Browser/manual observations

Main agent used the available in-app browser against temporary `/qa-wp004` on loopback3044, mounting actual Student components with synthetic public fixtures/simulated responses. This did not bypass real auth/Neon configuration or claim an authenticated persisted browser flow. Database/migration URLs blank for fixture server; no SoCLaaS transport or private values. Temporary source removed and loopback server stopped; tabs closed, viewport reset and generated dev cache/AGENTS/next-env changes restored to baseline.

Observed default Upcoming/title search, explicit no-match recovery, past filter, current full details including fee/Open to/preparation/Other/Organiser/SGT, post-start registration-closed notice, malformed success as technical failure rather than empty collection, unavailable response removing prior details, and unavailable own-state/remaining-places notice. Script-shaped Other rendered literally. Inspected details at320/375 and discovery at320/1280CSS pixels; DOM document width matched viewport without horizontal overflow, long titles/fee wrapped. Keyboard Tab reached Refresh list then the single enclosing event-card link with visible focus. This is focused evidence, not full keyboard/screen-reader/enlarged-text compliance; enlarged-text and intermediate breakpoints remain unrun.

After Unicode fix, a second disposable fixture mounted the actual search component.150emoji characters retained/accepted (one new synthetic request),151 retained with associated aria-invalid/error and no added request; correcting to campus cleared error/resumed request. Final fixture/tab/server removed. No human acceptance is inferred from agent browser observations.

## Main-agent completed-change review and fixes

Reviewed integrated Student source, thin API routes, read/session/publication projection boundaries, styles, test wiring and relevant contracts in the main agent. This is self-review, not independent review.

1. Malformed successful response could be interpreted as an empty list, and generic parse/network error messages were not deliberately constrained. Corrected container validation and fixed safe technical messages; browser malformed-success check confirmed failure/no false empty result. Unknown dependency errors remain generic at API boundary.
2. HTML maxlength counts UTF-16 code units, restricting valid150-code-point searches containing emoji. Replaced with shared normalised code-point validation used by server/browser, associated field error, no request while invalid and preserved input. Final18focused tests plus browser150/151/correction checks passed. Initial local test-file rewrite used Windows default encoding and failed on emoji; rebuilt that authored test as explicit UTF-8 immediately, then18tests passed. No unrelated file lost.
3. Temporary browser fixture triggered two lint rules (render ref assignment/synchronous effect state); removed fixture before final product lint, rather than disabling rules. No temporary fixture ships.

No unresolved actionable defect identified in the delivered discovery slice by this main-agent review. This does not substitute for missing concurrency/hosted/full-package evidence. Existing independent producer findings preserved.

## Blocked next slices and exact handoff

Keith's explicit shared G03/G05/G07 agreement, real nonempty form preview/approval/publish/aggregate-bound support, capacity-floor check under common event lock, sequential schema/migration writer+path and assigned synthetic target/check authority are still missing. Darryl's approval does not invent those. Exact requested registration/generation/submission/idempotency relationships, lock order, replay expiry and private roster projection are in change.md; exact writers/paths and ordered tasks in tasks.md/approved plan. Keith owns his Organiser configuration/roster/publisher and schema coordination. No external message or remote issue/PR mutation sent. Remote tracking reconciliation remains with an authorised owner.

Focused human/manual checklist once existing event migrations/configuration are valid on an assigned synthetic target: sign in as Student → browse/search/filter → open actual published event and compare to Organiser's approved facts; save a private Organiser edit and verify Student facts unchanged; publish then refresh and see current facts; withdraw/cancel then refresh and see unavailable content; test wrong-role/anonymous denial. Verify capacity remains labelled advertised and registration unavailable until real slice3. Exercise keyboard/narrow/zoom and failure/retry. Registration/profile/correction/My Events and publish→join→owner roster steps wait for prerequisites; no seed/mock completes them.

No WP-006 writes, producer/schema/migration edits, provisioning, live AI, commit, push or deployment. Separate WP-004 worktree retained for resumption.

## Final working snapshot

Product/test/config fingerprint (SHA256 of sorted relative path + NUL + exact bytes + NUL): `00ccc039a44a4a5782119d8a1e74ee66e0b22924092626c0f90bc70bb5f28dad` across19 files. Main agent reviewed these paths; no independent reviewer dispatched.

- `src/app/api/student/events/[eventId]/route.ts`
- `src/app/api/student/events/route.ts`
- `src/app/globals.css`
- `src/app/student/events/[eventId]/page.tsx`
- `src/app/student/page.tsx`
- `src/features/student/event-details.tsx`
- `src/features/student/event-list.tsx`
- `src/lib/registration-types.ts`
- `src/server/registration/http.ts`
- `src/server/registration/policy.ts`
- `src/server/registration/queries.ts`
- `tests/registration/components.test.ts`
- `tests/registration/fixtures.ts`
- `tests/registration/local-sql.integration.test.ts`
- `tests/registration/policy.test.ts`
- `tests/registration/queries.test.ts`
- `tests/registration/routes.test.ts`
- `tests/registration/vitest.database.config.ts`
- `vitest.config.ts`

Final post-fix checks:269/269 tests across27files passed in26.56seconds using documented LF/Git-Bash process setup, then lint and production build passed (exit0). Build includes actual Student pages/GET routes and no QA route. Typecheck/schema results above remain valid; no product source changed after the final build/review fingerprint. Prompt-log validator entries05–06 passed with one root and zero spawned/reused/dispatches; exact token usage unavailable. Whitespace/final-newline scan passed. Local link scan checked77targets and found only the two pre-existing absent SoC PDF references in specs/decisions.md; no newly introduced missing link. Git diff verifies no changes to .github/workflows, hosting tests, schema/migrations, event/publication producer, AGENTS or next-env. Overview status files additionally updated as evidence-only scope maintenance.

## Completion-plan refresh — 22 October 2026

Main agent confirmed same base1f0aa87/branch and unchanged19-file discovery fingerprint00ccc039a44a4a5782119d8a1e74ee66e0b22924092626c0f90bc70bb5f28dad. Reused prior269unit/4disposable SQL/build/static/browser evidence; no runtime retest or feature pass added. Refreshed actual empty-form publisher/account/schema/affected contracts to prepare planv1.1 and a draft Keith handoff. Missing custom-form publisher/capacity/roster work is WP-004 integration, not a missing original WP-003 deliverable. Shared-contract adoption, exclusive migration writer/slot and assigned synthetic target remain unconfirmed; candidate validation/UI work is independently ready after the plan boundary. Only plan/change/tasks/verification/log evidence edited; main-agent planning verification, no independent review or external message.

## Approved completion implementation and main-agent verification — 22 October 2026

Source: checkpoint `b1f6d92` on `codex/wp-004-student-registration` plus the uncommitted completion diff. Main agent authored and reviewed this change under Darryl's explicit main-agent-only override; no agent was spawned/reused and this is **not independent review**. Prior K009 independent-review evidence above is preserved with its original scope.

Implemented the ready approved slices: strict four-type versioned form/answer contracts and limits; explicit nullable event-profile sharing; additive registration/generation/immutable submission/idempotency persistence; shared event-lock lifecycle/capacity/publication guards; exact readonly form preview; protected join/cancel/rejoin/correction APIs; real own registration/remaining-capacity queries; Student registration/correction/My Events pages and publication-change flags. No Organiser builder controls or owner-roster API/UI were authored. Existing WP003 is consumed as delivered; these additions are WP004 integration.

### Actual checks and limits

- `corepack pnpm test`: **299/299** across28files passed in19.65s after the UTC clock fix and protected-route integration. Existing Windows harness requires Git Bash in process PATH and a temporary LF workflow copy; exact original workflow bytes restored in finally, no delivered workflow/test changes. One later producer-identity test and final narrow changes were checked by the affected suite below rather than rerunning unrelated suites.
- Final `corepack pnpm exec vitest run tests/events tests/registration`: **83/83** across9files passed in1.67s, including the added producer-ID security test. Form limits, Unicode/typed answers, strict bodies, private HTTP routing/Origin/error projection, capacity/state/timing policy and safe component rendering are covered. No test claims a mocked service is PostgreSQL concurrency.
- `RUN_LOCAL_REGISTRATION_SQL=1 corepack pnpm exec vitest run --config tests/registration/vitest.database.config.ts`: **7/7** passed in9.42s on final migration, fresh disposable PGlite replay. Actual publisher→discovery/join/correction/cancel/rejoin uses Prisma/JSONB/session services, with immutable source/pointer guards, profile independence, captured form after replacement, My Events flags/unpublished suppression and capacity floor. PGlite is single-connection; it supplies no race proof.
- `D007_SYNTHETIC_SQL_URL=postgresql://postgres@127.0.0.1:55487/turnup_d007_synthetic D007_REUSE_SYNTHETIC_SQL=1 corepack pnpm exec vitest run --config tests/registration/vitest.database.config.ts`: **9/9** passed in9.24s on actual PostgreSQL18.6, max8client connections. Covers last-seat one winner, same/different key duplicates, capacity reduction versus join, withdrawal versus join, optimistic concurrent correction, injected operation-write rollback, final-start cutoff rollback, absolute session expiry while waiting, and bounded serialization-abort retry with original key/no duplicate seat/submission/result.
- Actual PostgreSQL target metadata verified exact database, host127.0.0.1, port55487 and task-created data directory. Baseline five migrations followed by D007 preserve a pre-migration synthetic account. The final extra source-integrity trigger was applied separately only to this verified disposable target, then all9tests passed; the entire final SQL also replayed fresh in PGlite. No hosted migration command/reset or shared data access occurred. Harness rejects runtime/Neon URLs, unknown target and reuse without explicit fixture opt-in; it never resets an existing database.
- `corepack pnpm lint`: passed exit0 after final UI context/receipt change. `corepack pnpm typecheck` passed before the final narrow context field/wording change; the final production build's TypeScript step subsequently passed. `corepack pnpm db:validate`: valid. Final `corepack pnpm build`: passed exit0; includes all new Student routes and no QA route. No deployment.

### Browser/manual evidence

Earlier discovery browser results are retained. During approved continuation the actual new form/correction/action/My Events components were mounted on a temporary synthetic QA route: required answers prevent callbacks and focus the field; server-profile errors preserve entries and focus phone; conflict preserves values/selections/sharing; incoming form replacement preserves captured wording and disables submit; correction retains captured values with unchecked confirmation; zero-question/blank-profile confirmation works; unpublished cards contain no supplied old-title sentinel. Callback success was simulated, **not a database registration**. Checked320/375/1280 and200%text; corrected narrow overflow and pending-fieldset focus. Temporary fixture, browser tab and dev server removed; generated AGENTS/next-env changes restored. Final success copy acknowledges a committed receipt and links users conceptually to My Events for current status, avoiding an old idempotency receipt claiming a current place.

No signed-in full browser→actual configured shared database walkthrough was run. Local SQL/service, deterministic route and synthetic component browser evidence remain distinct. No human acceptance is inferred. Once the shared target/window is confirmed: sign in as synthetic Student, publish an actual empty/four-type form, confirm blank/edited optional values, join and refresh details/My Events, correct captured wording, cancel/rejoin, publish changed form/schedule/location/fee/Open to, test stale tab and withdrawal/cancellation suppression, then integrate Keith's actual roster. Repeat only affected checks after consumer integration.

### Main-agent review findings and corrections

1. Raw timestamptz clock reads through Prisma were8hours ahead of actual SQL time on the Singapore-configured local server. Initial final-cutoff setup failed, and a direct SQL/Prisma comparison exposed the real issue. Replaced the three assigned publisher/registration/discovery clock reads with numeric UTC epoch milliseconds. Regression compares both clocks and forces a transaction to cross start during an operation write; rollback passes on PostgreSQL with non-UTC server timezone. This avoids relying on Neon defaults.
2. Registration table needed a safe intermediate state while creating its current immutable submission, and rejoin needed to clear the old generation's pointer atomically. CANCELLED intermediary/new generation/current pointer updates remain invisible until commit. Composite pointer/source SQL checks plus actual lifecycle/rollback tests pass.
3. Exact publisher preview previously stated no questions unconditionally. Readonly preview now renders approved labels/help/types/options/required flags; server preview/digest and form-only dirty state include saved form. No builder controls were added. Forged cross-draft question/option IDs or type reuse are rejected.
4. Narrow enlarged-text overflow and invalid-field focus while fieldset was disabled were corrected; browser rechecks passed. Correction wrapper does not read profile. Success wording reports a receipt and directs current-state checks to My Events; replay cannot silently undo a newer generation.
5. The temporary PostgreSQL server starter did not initially reach database creation; first race run failed before tests. Corrected explicit task-owned database creation. inet address text included/32; strict preflight now uses PostgreSQL host(). These were setup failures, not passing checks. An expected immutable-update error initially closed a PGlite socket; that direct database-denial assertion now runs through the engine, preserving the application's session connection. No production check was weakened.

### Ownership, coordination and remaining work

Main agent is sole local writer in the isolated WP004 tree under Darryl's explicit assignment and continue instructions. Shared migration path is `prisma/migrations/20261022000000_registration/migration.sql`; only five noncolliding baseline names were observed in WP004/WP006. Schema/publisher/readonly preview and exact manifest are handed off in tasks/plan/integration-handoffs. Keith's agreement and an exclusive shared merge/Neon migration window are **not** asserted. No remote message was sent.

Known historical Neon target remains `turnup-nonprod / dev/darryl / turnup` (projectwispy-queen-37021878, branchbr-purple-lake-az9zx6rm); the human's placeholder/question did not establish the final shared migration window. No D007 Neon call/write occurred. Local disposable PostgreSQL evidence permits continued independent work without borrowing private environment files or weakening runtime's Neon-only configuration. Shared target assignment/metadata/window precedes actual migration; Preview/Production migrations and release smoke checks remain separate and unauthorised here.

Student/shared implementation is locally verified within these limits. **Full WP004 remains partial** for Keith's builder/roster UI/API, actual cross-role walkthrough, hosted migration and signed-in configured-target browser acceptance. G06 personal-history/operation cleanup and precise expiry remain separate; timestamps are retained without claiming operational deletion. No SoCLaaS, WP006 edit, new commit, push or deployment. The previous requested checkpoint remains b1f6d92.

Final product/schema/test fingerprint (sorted relative path + NUL + exact bytes + NUL): `097111d0c77e2b52ad3d7140836fc51c2723b893e61df051accaf127c13eed72` across41 files.

- `prisma/migrations/20261022000000_registration/migration.sql`
- `prisma/schema.prisma`
- `src/app/api/student/events/[eventId]/registrations/route.ts`
- `src/app/api/student/registrations/[registrationId]/cancel/route.ts`
- `src/app/api/student/registrations/[registrationId]/route.ts`
- `src/app/api/student/registrations/route.ts`
- `src/app/globals.css`
- `src/app/student/events/[eventId]/register/page.tsx`
- `src/app/student/my-events/page.tsx`
- `src/app/student/registrations/[registrationId]/page.tsx`
- `src/components/events/editor.tsx`
- `src/components/events/event-content.tsx`
- `src/features/student/event-details.tsx`
- `src/features/student/event-list.tsx`
- `src/features/student/my-events-list.tsx`
- `src/features/student/registration-action.tsx`
- `src/features/student/registration-form.tsx`
- `src/features/student/registration-screen.tsx`
- `src/features/student/submission-editor.tsx`
- `src/lib/registration-form.ts`
- `src/lib/registration-types.ts`
- `src/server/events/http.ts`
- `src/server/events/policy.ts`
- `src/server/events/service.ts`
- `src/server/registration/contracts.ts`
- `src/server/registration/http.ts`
- `src/server/registration/policy.ts`
- `src/server/registration/queries.ts`
- `src/server/registration/request.ts`
- `src/server/registration/service.ts`
- `tests/events/policy.test.ts`
- `tests/events/service.test.ts`
- `tests/registration/components.test.ts`
- `tests/registration/fixtures.ts`
- `tests/registration/forms.test.ts`
- `tests/registration/local-sql.integration.test.ts`
- `tests/registration/policy.test.ts`
- `tests/registration/queries.test.ts`
- `tests/registration/registration.integration.test.ts`
- `tests/registration/routes.test.ts`
- `tests/registration/vitest.database.config.ts`

Final cleanup: verified the temporary PostgreSQL data directory against the task-created exact path, stopped only that cluster, and removed it. No shared/installed database was stopped. Prompt-log validator entries05–10 passed (one root, zero dispatches; usage unavailable); git diff --check passed. Original-root WP004 plan/log SHA256 still match the preserved pre-run hashes. No write targeted WP006; its staged/unstaged work remains in place. Final41-file product fingerprint remains097111d0c77e2b52ad3d7140836fc51c2723b893e61df051accaf127c13eed72.

### Student UI refinement — 22 October 2026

Main agent refined the Student presentation without changing registration semantics: event cards now contain one details navigation, the account menu provides My Events throughout Student routes, and the details panel uses a full-width “Continue to registration” link with copy that the next page requires confirmation. The form's existing “Confirm and register” submit remains the only action that can create a registration and avoids implying a seat hold.

- Direct render checks: `node node_modules/vitest/vitest.mjs run tests/registration/components.test.ts` — **8/8 passed**.
- Type safety: `node node_modules/typescript/bin/tsc --noEmit` — **passed**.
- Manual browser limitation: the existing local server was found at `127.0.0.1:3004`, but the in-app browser policy denied localhost authority before inspection. No live browser acceptance is claimed.

No database call, migration, shared producer change, Keith Organiser work, WP006 edit, commit, push or deployment occurred for this UI refinement. This is main-agent verification only.

### Required event contact and concise registration form — 22 October 2026

Darryl explicitly superseded optional event-contact sharing for WP-004: each join or correction now requires a Name and either a valid phone number or an `@Telegram` handle, while the global profile remains optional and is never updated by this form. The form asks for confirmation with “the organizer,” and removed redundant explanatory text.

- `node node_modules/vitest/vitest.mjs run tests/registration/forms.test.ts tests/registration/components.test.ts tests/registration/policy.test.ts tests/registration/routes.test.ts` — **40/40 passed**.
- `node node_modules/typescript/bin/tsc --noEmit` — **passed**.
- `RUN_LOCAL_REGISTRATION_SQL=1 node node_modules/vitest/vitest.mjs run --config tests/registration/vitest.database.config.ts` — **7/7 passed** after correcting one obsolete assertion that expected the former null contact snapshot.

The local disposable integration target was used only for test replay; no migration or external/shared database call occurred. Browser localhost authority remains denied, so no live browser acceptance is claimed. Main-agent verification only; no commit, push, deployment, WP006 edit or Organiser scope change.
