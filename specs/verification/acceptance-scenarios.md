# Acceptance scenarios

B1 targets; **complete application scenarios remain pending**. Scoped foundation evidence is in CHG-K-006 and signup/login evidence is in [CHG-D-002 verification](../../changes/CHG-D-002-signup-login/verification.md). Integration means deterministic API/database checks; browser means complete user flow; AI evaluation means bounded labelled SoC runs recording model/prompt/configuration and actual context. Vitest is installed; credential-free tests, live SQL, local browser checks and complete hosted flows are separate evidence. Partial coverage never passes an entire scenario.

| ID · requirements | Given / when | Then / method |
| --- | --- | --- |
| T01 · SHR01/03 | `Alice`, `alice` and ` alice ` race to sign up, including different selected roles; winner later renames | Exactly one canonical account and one successful signup session; losing/invalid attempts cannot authenticate as winner or leave partial accounts/orphan sessions. Stable UUID and relationships after rename. Signup policy is [approved](../shared/accounts-and-access.md#approved-signuplogin-policy); rename policy is now accepted in [CHG-D-003](../../changes/CHG-D-003-credentials-profile/change.md); scoped implementation evidence is recorded there; full historical-ownership integration remains a later consumer check. Integration/concurrency. |
| T02 · SHR04/05, SEC01 | Student calls owner API; Organiser calls Student join/chat or role-enablement override | Denied without private disclosure/mutation; fixed role remains; own read-only Organiser preview allowed. Integration/browser. Replaces old successful role switching. |
| T03 · ORG04–07 | Proposal omits capacity/fee and contradicts start | Known partial fields visible promptly, targeted blockers, no invented completion/publication. Integration/AI evaluation. |
| T04 · ORG05–09, SEC01 | Owner excludes synthetic secret supplied in clarification | Reviewed public output/APIs/Student context omit secret; private facts remain private. Integration/AI evaluation. |
| T05 · ORG09/18, SHR08 | New edits while old generation/approval runs | Older result cannot overwrite/publish newer facts. Integration. |
| T06 · ORG10, PAR11, SHR07 | Publication changes during chat | Old context/cache/output invalidated; current-source answer or truthful update notice. Integration. |
| T07 · ORG11–13, PAR05 | Withdraw/cancel event with registrations; attempt hard delete | No new public source/join/chat; preserve safe history/status; hard delete denied. Integration/browser. |
| T08 · PAR03/04 | Two valid submissions race for last place; retry successful request/cancellation | One winner, one seat consumed, capacity released once. Integration/concurrency. |
| T09 · PAR07, SEC03 | Labelled answerable question gets evidence | Exact current quotes validate; relevance/completeness match labels; bad evidence withheld. Integration/AI evaluation. |
| T10 · PAR09, ORG15 | Valid question absent/partly supported | No fabricated answer; supported part cited; one server-owner inbox item; sent after commit only. Integration/AI evaluation. |
| T11 · PAR09/12 | Inbox commit fails or response lost; same-key retry | No false delivery after failed commit; committed result returns one thread. Integration/failure injection. |
| T12 · ORG16/17, PAR10 | Owner privately answers absent public fact | Only requester/owner read; other Students' FAQ cannot use it until new public review/publication. Integration/context inspection. |
| T13 · SEC01–03, DEV02 | Injection in PDF/public document/question/development fixture | No unauthorised read/execution/role change/publication/recipient selection. Integration/controlled AI/development review. |
| T14 · ORG03/18, PAR12, SEC03–06, DEP04 | Malformed/oversized PDF; missing server configuration/key; invalid/revoked key, denied model, rate/budget exhaustion, timeout/unavailable provider or invalid/unsupported response | Bounded truthful technical failure, with no false missing-event-information outcome or automatic forwarding; no credentials/raw private payloads in diagnostics. Temp cleanup occurs on every processing exit, saved input/draft is preserved and manual completion remains usable. Deterministic integration/failure injection plus separately authorised bounded provider checks; neither a stub nor documented provider behaviour proves intended-host access. |
| T15 · DEP01–04 | Second device runs signup → assist/manual publish → join → FAQ/escalate/reply online | HTTPS/persistence/SoC work without developer laptop; isolated config, release checks/migration/recovery evidenced. Hosted browser walkthrough. |
| T16 · SHR01/09 | Signup supplies only username/password/fixed role and omits name/phone/email; Student later removes optional values | Valid signup authenticates/routes by stored role with no contact prerequisite; unknown/protected signup fields cannot override identity/permissions. Profile removal succeeds under the approved credential/profile validation policy. Profile UI/removal remains later work; signup checks do not pass the whole scenario. Integration/browser. |
| T17 · PAR03/13/14 | Optional profile blank; custom required answer missing/invalid option | Answer error preserves input, no partial seat/submission; corrected form joins without global contacts. Integration/browser. |
| T18 · ORG14/20, SEC07 | Foreign account or AI reader requests attendee values | Only submitter/owning Organiser gets captured submission; neither AI gets answers/profile/roster. Integration/context inspection. |
| T19 · ORG19, PAR14 | Published form changes during entry, old registrations exist | Stale join conflicts; new joins latest; old places/wording/answers unchanged. Integration. |
| T20 · SHR09, PAR15 | Profile edit then explicit one-event submission edit | Profile alone changes no old submission; new answer version uses captured form and affects that event only. Integration. |
| T21 · ORG19, SEC07 | HTML/scripts or forged protected/unknown IDs in forms/answers | Inert rendering, invalid schema/answers rejected, identity/role/owner unchanged. Integration/browser. |
| T22 · ORG02/06/09, SHR06 | Manual complete draft, and separately incomplete saved draft | Complete exact preview publishes with zero AI calls; incomplete/invalid facts save privately but cannot publish. Integration/browser. |
| T23 · ORG10, PAR05, SHR06 | Publish fee/location/Open to change or capacity below active count | Valid change preserves places/flags My Events; undersized capacity rejects atomically. G05 resolves date edge cases. Integration/browser. |
| T24 · PAR04/14 | Cancel before start while withdrawn; safely republish with new form, then rejoin | Release one place; rejoin checks new form/capacity; no silent old submission reuse. Integration. |
| T25 · ORG13/18 | Previously published zero-attendee event deletion; separately Cancel Editing/discard/cancel dialog | Hard delete denied; unsaved edits discarded without saved/live loss; distinct discard action; cancelled dialog no mutation. Browser/integration. |
| T26 · SEC04/06, DEP02 | Extraction succeeds/fails; retention deadlines pass | No persistent original/fulltext/raw logs; delete/anonymise eligible records/copies without removing live publication. G04/G06 first; integration/storage/provider audit. |
| T27 · ORG11/16, PAR10/11 | Withdraw during chat with cached excerpts; cancel with private thread | Immediate current-source denial; historic suppression follows G07; private owner reply after cancellation within retention. Integration/context inspection. |
| T28 · DEV01–03 | Scoped agent change and proposed release | Versioned specs/input, human owners, IDs/paths, independent findings, actual checks and human decisions traceable; missing required release evidence blocks. Repository/release review. |
| T29 · ORG01 | Owned/foreign fixtures with same titles and varied edit/start times; search/sort both directions | Only owned events, correct combination/order/format; registration counts do not change edit ordering; empty/loading/failure visible. Browser/integration. |
| T30 · PAR01/02, SHR07 | Search/details against published/draft/withdrawn/cancelled and forged old IDs | Approved consistent facts only; unavailable content hidden; current registration/capacity code-derived. Past-filter policy G05 first. Browser/integration. |
| T31 · PAR06/08/12 | Unregistered Student asks; then ambiguous/off-topic input or provider failure | Published-event access works without registration; clarification/no spam, honest outage/direct-question option; no registration effect. Integration/AI evaluation/browser. |
| T32 · SHR02/03/05 | Unknown/wrong credentials, forged cookie or role/user fields; logout then token replay; clock reaches 30-minute idle or 8-hour absolute expiry; concurrent login/signup admissions and expired windows; foreign/missing/null Origin, oversized request or database/configuration failure; later username/password changes | Unknown/wrong credentials share a public error and equivalent verification work. Signup/login creates a fresh cookie-bound token; only its digest persists. Logout, exact expiry boundaries and invalid tokens deny protected access. Cross-role calls disclose no private data. Persistent admission limits enforce the approved policy across instances; failures/CSRF rejection create no authentication or partial account. Safe username/role input survives errors, passwords/tokens do not echo. Forgotten-credential help truthfully reports no current recovery without a bypass; joint G02 remains separately open. Credential edits preserve UUID/history and follow the approved credential/profile G01 policy, with scoped implementation evidence in CHG-D-003 and full integration still separate. Controlled-clock, concurrency, failure-injection and browser checks; record only implemented/tested portions. |

## Stable Preview routing checks (T15 foundation; CHG-K-008)

Given the trusted CLI deployment workflow and a dedicated `PREVIEW_ALIAS`, when a
Preview upload succeeds, then retain its unique candidate URL/revision, assign the
fixed hostname to that candidate and report the stable URL after assignment
succeeds. Missing/malformed alias configuration stops Preview before deployment
work; upload or alias failure fails the job without a stable-address success claim.
Given PREVIEW_ALIAS equals a current Production hostname (including a later page
of the project's Production-domain list), then reject before build/migration/upload
and never issue alias assignment. Failed/malformed/pagination-incomplete lookups
also block Preview. Recheck immediately before assignment in case configuration
changed during the build. Production requires no Preview alias and does not assign it. All permitted Preview
branches share the most recently assigned target. Method: execute workflow shells
with a synthetic CLI, including inert hostile configuration; separately verify
hosted reassignment across two deployments and protection on the plain hostname.
Verify complete shareable-link persistence separately; local routing tests do not
establish access persistence or pass the complete T15 journey.

## Coverage

Each canonical ID maps below; mapping is a planned method, never proof of execution. Detailed gates remain in [decisions](../decisions.md).

| IDs | Scenarios |
| --- | --- |
| SHR01 | T01, T16 |
| SHR02 | T32 |
| SHR03 | T01, T32 |
| SHR04 | T02 |
| SHR05 | T02, T18, T32 |
| SHR06 | T17, T22, T23 |
| SHR07 | T06, T30 |
| SHR08 | T05, T19, T20 |
| SHR09 | T16, T20 |
| ORG01 | T29 |
| ORG02 | T22 |
| ORG03 | T14, T26 |
| ORG04 | T03, T14 |
| ORG05 | T03, T04 |
| ORG06 | T03, T22 |
| ORG07 | T03, T04, T22 |
| ORG08 | T04, T22 |
| ORG09 | T04, T05, T22 |
| ORG10 | T06, T23 |
| ORG11 | T07, T27 |
| ORG12 | T07, T27 |
| ORG13 | T07, T25 |
| ORG14 | T18 |
| ORG15 | T10, T11 |
| ORG16 | T12, T27 |
| ORG17 | T12 |
| ORG18 | T05, T14, T25 |
| ORG19 | T19, T21 |
| ORG20 | T18, T19 |
| PAR01 | T30 |
| PAR02 | T30 |
| PAR03 | T08, T17 |
| PAR04 | T08, T24 |
| PAR05 | T07, T23 |
| PAR06 | T31 |
| PAR07 | T09 |
| PAR08 | T31 |
| PAR09 | T10, T11 |
| PAR10 | T12, T27 |
| PAR11 | T06, T27 |
| PAR12 | T11, T14, T31 |
| PAR13 | T17, T20 |
| PAR14 | T17, T19, T24 |
| PAR15 | T20 |
| SEC01 | T02, T04, T13, T18 |
| SEC02 | T13 |
| SEC03 | T09, T13, T14, T21 |
| SEC04 | T14, T26 |
| SEC05 | T14 |
| SEC06 | T14, T26 |
| SEC07 | T18, T21 |
| DEP01 | T15 |
| DEP02 | T15, T26 |
| DEP03 | T15, T28 |
| DEP04 | T14, T15 |
| DEV01 | T28 |
| DEV02 | T13, T28 |
| DEV03 | T28 |

Use synthetic private/public markers and labelled answerable, unanswerable, partial, ambiguous/off-topic cases. Inspect effects/model inputs, not refusal wording alone. Deterministic stubs support routine CI; controlled SoC runs establish provider evidence. Record failures and correction effort. A finite suite does not prove universal absence of hallucinations/injection.

## Credential/profile extension targets — scoped implementation evidence

CHG-D-003 applies the [approved policy](../shared/accounts-and-access.md#approved-credential-changes-and-optional-profile-policy). T01 covers duplicate/no-op renames with stableUUID/role; T32 covers current-password confirmation, username session retention with refreshed revision, password-only all-device revocation, unchanged/failed rollback, shared reauth caps and in-flight old-credential login/parallel update/session-expiry races. T16 covers independently optional blank/remove Name/Phone, accepted Unicode/phone bounds and atomic stale-version saves. T02 and scoped T18 deny foreign/Organiser profile access and exclude private projections. T20 remains a future real event-snapshot integration check, not passed by profile-only tests. Exact boundaries/failure cases and UX checks are in [plan v1.2](../../docs/plans/wp-002-credentials-profile-plan.md#acceptance-and-tests-to-run-after-implementation). No scenario passes from policy approval.

For the FoC-derived inline settings presentation, scoped T32 browser/component checks cover collapsed summaries, one editor at a time, Cancel clearing secrets/restoring focus, local NFC-equivalent confirmation/mismatch, conditional associated errors, username save staying signed in and password-only login redirection. Presentation alone does not pass the complete T32 scenario.

Scoped T16 profile presentation checks cover optional Name/Phone summary rows, individual Edit/Save/Cancel, discard on Cancel/switch, successful-save confirmation, focus restoration, blank removal, failed-save draft retention and stale reload retaining the active draft while refreshing the counterpart/version before retry. No password or re-login is required for profile saves.

Scoped T32 account-navigation checks cover the authenticated header avatar dropdown on Student/Organiser/settings, Profile destination, keyboard toggle/Escape/focus return, outside/focus-leave dismissal, responsive bounds and logout pending/failure/success behavior through the existing POST endpoint. Navigation does not grant role access or change session rules.

Registration feedback extension: T32 checks invalid fields prevent browser requests and focus associated errors; valid input still reaches server security checks and preserves generic dependency failure behavior. Synthetic diagnostic checks verify fixed stage/code fields and absence of private error/credential/configuration content. DEP03 workflow checks exercise clickable validated Preview output without labelling an unpromoted Production candidate live.

## WP-003 original scope — CHG-K-009

Existing IDs remain intact; these are scoped checks, not whole-scenario passes. T02 checks anonymous/Student/foreign Organiser denial of event operations with no disclosure/mutation. T05 checks concurrent save/preview/publish/lifecycle versions: a changed draft, form snapshot, owner or version cannot use an older approval; failed writes do not replace newer work. T22 checks incomplete draft saving versus complete manual zero-AI publication, every accepted field/aggregate boundary, exact preview and immutable approved revision. T25 checks unsaved Cancel Editing, explicit saved-draft discard, confirmation dismissal and denial of deletion after any publication (even zero registrations). T29 checks combined own-event title search and both-direction sorts, including missing draft dates and deterministic tie ordering; loading/empty/failure are distinct.

T07/T23/T24 registration and T06 chat portions remain deferred to their consumers. WP-003 separately checks withdrawal hides current public reads, final cancellation cannot republish, and private replacement leaves the existing publication unchanged. Timing uses the [accepted WP-003 policy](../shared/domain-and-data-contracts.md#accepted-wp-003-bounds-and-timing--21-october-2026): Singapore/UTC round trips, exact now rejection for first publish/republication, earlier/later future replacement starts, rejection of past/exact-now changed starts, owner post-start/end access and retained-start published content-only replacement. No Student T30 implementation is assigned.

## CHG-K-009 layout/rescheduling refinement acceptance

T29: Given a published event with a different saved private title/schedule, the whole card is one keyboard-focusable link; it shows the publication title/schedule plus Saved changes. Search/title/start ordering follow displayed values. A same-content save/discard removes the badge despite a newer operation version; cancelled cards omit the badge.

T22/T25: Opening a published event shows only Current Live Publication; opening withdrawn shows Last Publication with a withdrawn notice; cancelled is read-only. Edit resumes saved private values without rendering live content alongside. Save remains in the editor. Cancel Editing drops unsaved edits only and returns to publication while retaining saved private changes. Preview saved draft shows only Public Preview; approval/Publish/Edit/removal controls follow the content. Editing/reloading resets approval; refresh restores the default view and cannot reuse local preview approval. Never-published Delete draft and previously-published Discard saved changes have distinct confirmation effects; dismissing confirmation mutates nothing. Editor removal remains possible for incomplete saved drafts.

T23/T05: Given server time21Oct00:00 and a published22Oct14:00 start, preview/approval/publication may move it to22Oct13:00. Any changed past/exact-now start fails without changing the current publication. The same future-reschedule rule applies after an event has begun; retaining its unchanged past start for content-only replacement remains valid. A changed future start that passes at preview but reaches the server-time boundary before publish fails atomically, preserving the previous publication. Withdrawn republication requires a future start even when unchanged. Existing version/owner/session/approval guards remain in force; registration-dependent effects remain WP-004.
