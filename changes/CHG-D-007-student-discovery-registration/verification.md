# CHG-D-007 — Verification

Base `1f0aa8773799f44229638cb473ff5584b3d3fb63` plus uncommitted WP-004 working files. Human owner Darryl approved plan v1.0/D007 on22 October2026. **Main-agent implementation and verification only**, explicitly required by the human; no subagent dispatch/reuse and no independent review claim. Prior K-009/account independent findings/rechecks remain unchanged and retain their own scope.

## Delivered scope and limits

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
