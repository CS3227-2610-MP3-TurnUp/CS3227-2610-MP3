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
| T10 · PAR09; ORG15 for separately planned messaging | Valid question absent/partly supported | Short natural reply with relevant uncertainty and organiser-contact guidance; supported facts verified internally. No fabricated fact/contact, visible quote/unresolved dump, automatic inbox item or sent claim. A working contact action waits for the approved contact-field handoff. Integration/AI evaluation. Darryl's22October2026Student-contact amendment supersedes automatic assistant forwarding; separate inbox delivery remains future scope. |
| T11 · PAR09/12 | Inbox commit fails or response lost; same-key retry | No false delivery after failed commit; committed result returns one thread. Integration/failure injection. |
| T12 · ORG16/17, PAR10 | Owner privately answers absent public fact | Only requester/owner read; other Students' FAQ cannot use it until new public review/publication. Integration/context inspection. |
| T13 · SEC01–03, DEV02 | Injection in PDF/public document/question/development fixture | No unauthorised read/execution/role change/publication/recipient selection. Integration/controlled AI/development review. |
| T14 · ORG03/18, PAR12, SEC03–06, DEP04 | Malformed/oversized PDF; missing server configuration/key; invalid/revoked key, denied model, rate/budget exhaustion, timeout/unavailable provider or invalid/unsupported response | Bounded truthful technical failure, with no false missing-event-information outcome or automatic forwarding; no credentials/raw private payloads in diagnostics. Temp cleanup occurs on every processing exit, saved input/draft is preserved and manual completion remains usable. Deterministic integration/failure injection plus separately authorised bounded provider checks; neither a stub nor documented provider behaviour proves intended-host access. |
| T15 · DEP01–04 | Second device runs signup → assist/manual publish → join → FAQ/escalate/reply online | HTTPS/persistence/SoC work without developer laptop; isolated config, release checks/migration/recovery evidenced. Hosted browser walkthrough. |
| T16 · SHR01/09 | Signup supplies only username/password/fixed role and omits name/phone/email; Student later removes optional values | Valid signup authenticates/routes by stored role with no contact prerequisite; unknown/protected signup fields cannot override identity/permissions. Profile removal succeeds under the approved credential/profile validation policy. Profile UI/removal remains later work; signup checks do not pass the whole scenario. Integration/browser. |
| T17 · PAR03/13/14 | Registration name or phone/Telegram contact is blank or invalid; custom required answer missing/invalid option | Field error preserves input, no partial seat/submission; a valid event contact and answers join without updating the optional global profile. Integration/browser. |
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
| T32 · SHR02/03/05 | Unknown/wrong credentials, forged cookie or role/user fields; logout then token replay; clock reaches 30-minute idle or 8-hour absolute expiry; concurrent login/signup admissions and expired windows; foreign/missing/null Origin, oversized request or database/configuration failure; later username/password changes | Unknown/wrong credentials share a public error and equivalent verification work. Signup/login creates a fresh cookie-bound token; only its digest persists. Logout, exact expiry boundaries and invalid tokens deny protected access. Cross-role calls disclose no private data. Persistent admission limits enforce the approved policy across instances; failures/CSRF rejection create no authentication or partial account. Safe username/role input survives errors, passwords/tokens do not echo. Credential edits preserve UUID/history and follow the approved credential/profile G01 policy, with scoped implementation evidence in CHG-D-003 and full integration still separate. Controlled-clock, concurrency, failure-injection and browser checks; record only implemented/tested portions. |

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

## CHG-K-010 extraction integration — scoped targets

These extend existing scenario IDs, not whole-scenario passes:

- T02/T14: anonymous, Student, foreign-owner, cancelled-event, stale-event or revoked-session extraction cannot disclose results or mutate the event; origin checks and bounded upload parsing occur before expensive processing. Access/session/state/version are rechecked before delivery.
- T03/T04: A clearly named event heading without a Title label remains eligible for title extraction, with exact source quote evidence and normal title bounds; no guessed first-line fallback is allowed. Generate prefills validated known values in the original inputs and renders their exact quote/page evidence immediately below each field. Missing/conflicting/invalid/unprocessed results preserve existing input. Complete source date/time values normalize to stored UTC ISO and display as SGT without duplicate date entry. If the zone is omitted, use SGT; preserve explicitly stated zones. Absent/incomplete/ambiguous source dates/times or ambiguous stated zones are not invented. Editing a generated value removes or marks its evidence outdated. Removing one calendar field’s feedback keeps both original calendar controls top-aligned without stretching to the other field’s evidence height. Public drafting/FAQ candidates remain a later ORG07 slice.
- T05/T22: edits, source replacement/unlink, refresh/navigation and event-version changes invalidate delayed results. Successful Generate batch-prefills only the current editable request snapshot, clears approval and does not save/publish automatically. Busy Save and delayed extraction cannot overwrite newer values; saved/live content remains unchanged until existing explicit operations.
- T13/T14/T26: malicious source instructions cannot choose provider settings or trigger effects; malformed/oversized/encrypted/textless PDFs, invalid evidence/output, provider failure/budget exhaustion and cancellation remain bounded technical outcomes. No original/fulltext/raw-payload logs or durable private-preparation records are introduced.
- T14/T22: the accessible proposal selector replaces No file chosen with filename/size in one status region; Remove restores it without deleting event values. Choosing/replacing a file sends nothing; cancelling replacement keeps the existing proposal, same-file selection works, and pending generation/event writes disable selection actions. Prompt guidance omits added terminal sentence full stops only in generated values/alternatives; source evidence quotes and internal decimal punctuation remain unchanged.
- T03/T04/T22: For conflicting title, text, capacity and date fields, retain existing input until a supported alternative is selected. Selecting a choice fills only its matching original input, removes its suggestions, retains only the chosen evidence and invalidates preview approval/stale extraction; subsequent manual editing clears evidence. Other fields and findings remain unchanged; busy event writes disable choices and invalid alternatives cannot bypass field limits. Date choices show readable SGT day/month/year and twelve-hour time while applying the correct canonical UTC instant, including date rollover. Prompt/schema request at most three distinct supported alternatives, shortlisting three when more exist; no automatic winner or numerical confidence. Purpose/description rephrasing uses second-person or impersonal descriptive wording without unsupported additions, preserving exact source evidence. Deterministic checks do not establish live model adherence.
- T03/T14: Prompt field definitions identify the event venue/remote participation medium, stated target audience and participant pre-attendance conditions, preserving required versus recommended wording. Unsupported venues/platforms/links, audience eligibility or no-preparation claims are not inferred. Same-purpose incompatible alternatives are conflicts; complementary venue details/hybrid channels, separate sessions and compatible audience/preparation statements are not conflicts solely because they differ. Synthetic provider fixtures exercise prompt construction and exact-evidence processing; live semantic accuracy requires separate evaluation.
- T22/T26: page refresh loses selected file/findings, while applied and explicitly saved public fields survive through the existing draft store. Unlink clears assistance state without deleting event fields. Local deterministic/browser checks, live-model evaluation and hosted evidence are recorded separately.


## CHG-K-011 clarification — scoped targets

- T03/T04/T22: After accepted extraction reports missing/conflicting required facts, show inline fixed question/reason/evidence and summary links. Selecting a suggestion resolves just that field locally; manually entering/keeping a valid value requires explicit confirmation and is labelled Organiser-confirmed without a fabricated quote. Changing a confirmed value reopens only its issue. Optional Other gaps do not block. Save Draft remains available while issues remain, but server preview/publication reject unresolved required issues.
- T05/T22/T25: Generate records bounded issues before success; Save Draft atomically commits fields plus validated resolution intents at matching event/preparation revisions. Refresh/Cancel Editing discard unsaved answers/confirmations but retain authoritative outstanding issues. Remove proposal retains known issues/short evidence and generated fields. Re-extraction preserves confirmed values, reopens disagreement/conflict, and retains confirmation when the source merely omits the fact. Earlier unresolved issues cannot disappear through a failed/stale/partial extraction or omitted resolution payload.
- T02/T05/T13/T14: Foreign owner, Student, revoked session, cancelled event, forged alternative/manual resolution, unknown fields and stale source/event/preparation revisions disclose nothing or mutate nothing. A suggestion must match the persisted alternatives and submitted validated field value. Approval is invalidated by preparation changes. Save without a new explicit confirmation reopens a changed confirmed value. Technical failure preserves manual work and earlier issues.
- T04/T14/T26: Structured preparation is owner-only and excluded from publication/Student context. Original PDFs/full extracted text remain transient. Synthetic/non-production activation does not enable hosted inference or settle production retention. Never-published draft deletion cleans its preparation; publication history/manual-only flows retain existing semantics. Exact checks, migration application and native-browser/live-provider limits are recorded separately.


## CHG-K-012 public candidates — scoped targets

- T02/T03/T05/T14/T22: Candidate generation reads only the current complete saved public draft with resolved required issues. Anonymous/Student/foreign-owner/cancelled/unresolved/stale-event/preparation requests fail without provider work or private disclosure. Source and session are rechecked after processing; changed drafts or expired authority withhold the stale result. Manual completion remains available after failure.
- T04/T13/T14/T26: Model context contains an explicit public-field allowlist, never private preparation issues/quotes/attribution, private notes, original/full extracted text, attendee values or unrelated records. Unknown fields/unsupported exact references/invalid schema/truncated output are rejected. Source/model instructions render as inert text and cannot choose provider settings, execute operations or publish.
- T03/T04/T22: FAQ/Other candidates are editable and separate from existing fields. FAQ answers derive from validated exact public-field references; unsupported questions remain optional unanswered organiser prompts. Only explicitly supplied organiser answers may be added to the Other candidate; unanswered questions are not automatically copied to public text or treated as publication blockers.
- T05/T14/T22: FAQ Apply affects only Other, with explicit confirmation before replacing different nonblank content. Cancellation/dismiss/failure leaves original fields unchanged; application invalidates preview approval and requires normal saving/confirmation. Candidate/editor/event/preparation tokens prevent stale output/application and busy-write races. Source field, per-candidate and combined limits remain enforced without silent truncation.
- T14/T26: Candidates disappear on refresh/dismiss and create no durable records. Local synthetic availability, per-owner admission and shared provider limits are reused unchanged. Deterministic provider doubles establish processing/interaction behaviour only; native browser, live model quality and hosted evidence remain distinct.


### CHG-K-012 FAQ-only refinement

- T03/T04/T22: Initial description stays intact; the separate action has no second description candidate/control. Generate one to six relevant participant FAQ questions; reject an empty list. Populate editable Other candidate from supported answers; show unsupported questions separately and require an explicit organiser answer/add before inclusion. An all-unanswered response has a clear empty-state explanation and cannot apply blank Other.
- T05/T14/T22/T26: Apply changes Other only after replacement confirmation; Save Draft remains explicit. Source/editor/event/preparation/busy changes reject stale application/output. Bounds include unchanged description and every other saved public field. Existing exact-evidence and owner-only/privacy/provider guards remain enforced.


## CHG-K-013 Organiser draft retention — scoped targets

- T22/T26: Given a draft inactive23days, owner list/editor shows impending expiry date and whether draft deletion or private-change restoration will occur. Save Draft or accepted PDF extraction resets30days; opening, FAQ generation, previews, failed/stale saves/extractions and unsaved answers do not. Newly migrated drafts get a fresh30-day window.
- T05/T25/T26: Given expired never-published and previously-published fixtures, a valid cleanup deletes only the former and its approvals; the latter retains event/state/current publication/history/registrations, restores latest public fields, clears preparation/approvals and invalidates stale revisions. Missing/corrupt publication prevents destructive fallback. A save/extraction racing cleanup either commits first and survives, or receives a truthful stale/unavailable outcome without overwriting restored/public data.
- T04/T14/T26/T28: Disabled/unauthorized job never accesses data; bounded repeated/concurrent invocations do not duplicate effects or starve other eligible records. Job output/logs contain no private content or owner/event identities; owner expiry metadata is absent from public snapshots. Recovery reruns expiry before restored data is served. Provider backups/global90-day policy/hosted scheduling require separate evidence.


## Organiser daily generation checks — CHG-K-014 (T14/T22/T26/T28 portions)

Given an authenticated Organiser and a validated environment, when PDF and FAQ requests across multiple events/sessions dispatch ten model calls in one SGT day, then the eleventh is denied with daily-exhaustion/reset metadata and no provider call. Another Organiser and the same account in another environment retain independent allowances. Each dispatched call reserves exactly4,096 tokens; short output and invalid/failed output do not refund it.

Given invalid authentication, role/ownership, missing configuration, invalid PDF/input or cancellation proven before dispatch, when generation is requested, then no daily usage is consumed. A reserved but definitively unused request refunds exactly once; replayed completion/refund cannot decrement another request or make counters negative. Untrusted client identity/environment is rejected or ignored in favour of server identity/configuration; usage reads reveal only self.

Given simultaneous requests on different instances, when admission races, then no daily bound is exceeded and at most one request per environment is in flight; shared spacing also holds. Daily exhaustion and temporary busy/spacing rejection are distinct. Given midnight SGT or redeploy, new-day allowance starts using database time but existing pending/uncertain work continues to block overlap. A late completion/refund affects its original day only. Uncertain dispatch/timeout/transport outcome holds the slot; guarded operator recovery releases it without refunding dispatched attempts.

Given policy-first deployment, when either hosted environment requests generation, then the existing activation guard still denies inference. The original local synthetic workflow and foundation probe retain their own guards/counters. UI usage/error refresh never replaces newer event fields or persists PDFs/model payloads. Full hosted/provider and labelled quality scenarios remain separately unverified. Methods: deterministic controlled-clock/route/UI and isolated synthetic PostgreSQL concurrency/rollback checks, plus independent review.


## Hosted adapter and maintenance checks — CHG-K-015

T14/T26: Disabled/malformed/foreign-environment hosted configuration denies before provider admission. Exact accepted hostedprofile is required; local/probe guards retain existing ceilings. Provider marker occurs immediately before fetch, input/configuration errors do not charge daily usage, uncertain timeouts/transport/cancellation retain the slot, and definite invalid output consumes the dispatched attempt. Public schemas/evidence and private-source boundaries remain unchanged.

T14/T26/T28: Operator maintenance requires enabled correctenvironment and strong secret before DB import; dry-run mutates nothing. Bounded real cleanup deletes only settled records90days after SGT day end, then unused expired daily counters. Active/uncertain/reserved rows and their counters remain, including corrupt terminal active pointers; no quota reset/refund/implicit draft cleanup. Race cleanup with admission/completion/recovery under consistent environment locks. Wrongauth/query rejects without disclosure, responses/logs counts only.

T05/T13/T14/T15/T22: Preview exact revision deploys disabled, migration/env/profile/host support verified, cleanup auth/dryrun tested, then activation redeploy. Run no more than one synthetic extraction and one synthetic FAQ call through authenticated owner routes, verify shared daily usage increments/persistence and no publication or unrelated field overwrite. On failure disable Preview without automaticretry. Deterministic tests cover ten-call exhaustion and isolation without spending live calls. Keep Production off; complete hosted cross-role journey and comprehensive labelled evaluation remain separate.


K-015 integration regressions: actual hosted service extraction persists validated preparation; owner reads/saves/FAQ snapshot checks work with that preparation; disabling inference preserves assisted draft reads/saves/manual completion. No charged-success-then-local-only-persistence failure. Hosted dedicated9B/60s settings work alongside unchanged shared27B/30s; missing dedicated settings never fall back to the shared model/key.

## D007 Student discovery extension — 22 October 2026

T30: Given current published, never-published, withdrawn and cancelled events plus saved private edits, when an authenticated Student searches approved titles or opens an event UUID, then only current approved fields and Organiser username are returned. Upcoming is default and uses start > database now; Started/past uses start <= now, including the equality boundary and post-end details. Both order by ascending approved start and UUID tie-break. Private title changes do not affect search until actual publication. Forged old publication UUIDs and owner/role/revision query overrides cannot select historical/private content. Detected pointer/state changes during delivery fail safely. Error/loading/empty states are distinguishable; retry/refresh removes obsolete content. Until registration integration, null remaining places and unavailable own state must not render as zero places or not registered. That pending portion prevents claiming the complete PAR02/T30 target from discovery-only checks.

T02/T32 scoped: anonymous, wrong-role, forged/revoked/expired sessions fail at server reads; protected APIs use cookie-derived identity and no-store/private responses. Unknown/duplicate/overlong/control query inputs fail without disclosure. Database/configuration failures return a safe technical failure, never a fabricated empty result. Revalidate authoritative session before returning protected data. T13 scoped: hostile public text remains inert and cannot execute scripts/change roles/publish; no provider calls are needed to inspect the rendered application boundary. Main-agent verification is explicitly assigned for D007; existing independent evidence retains its original scope.

## D007 completion coverage — 22 October 2026

Preserve existing IDs. T08 local PostgreSQL proves one last-seat winner, same/different-key duplicates, release/rejoin and old-generation replay; T17/19/20/24 combine strict form/profile unit checks with actual publisher→Student immutable submission/correction/cancel/rejoin SQL and private own access. T23 covers locked publish capacity-floor races and content-based flags; T07/30 covers unpublished status-only cards and live capacity/own state; T02/32 covers Origin/session/role/foreign-ID, bounded body and safe failure/retained client input. Final cutoff/absolute-expiry while waiting, rollback injection, serialization retry and session-timezone-independent clock have real PostgreSQL evidence. T18's submitter denial side is exercised; Keith's owner-roster side remains unimplemented here.

These are scoped checks recorded in D007 verification, not a blanket full-scenario or human-acceptance claim. Synthetic component browser observations are separate from actual local SQL/service integration. Shared Neon migration, complete signed-in live browser flow and actual Keith builder/roster integration remain unrun. No WP006/AI checks or provider calls are implied.
## CHG-D-005 synthetic Student assistant portions

The [bounded plan](../../docs/plans/wp-006-student-ai-components-plan.md) adds deterministic checks for quotation/schema/source identity and UI states (T09/T10/T14/T31 portions), local replacement/withdrawal/cancellation and stale completions (T06/T27 portions), DTO private-field rejection/plain-text rendering/no simulated transport effects (T12/T13/T18 portions). The development harness must return HTTP 404 outside development. Results and exact limitations are recorded in [verification](../../changes/CHG-D-005-student-ai-components/verification.md).

No complete scenario is passed by these fixtures: actual server access rules, publication invalidation, model relevance/completeness, automatic forwarding/private thread persistence, retries across real transports and hosted/provider behaviour remain unimplemented or unrun. An explicitly irrelevant but literal quote test preserves the distinction between provenance and semantic answer quality. No G03/G04/G07/G08 gate is closed.

CHG-D-005 chat presentation refinement: scoped checks cover question/assistant bubbles, bottom composer, source disclosures, starter-question selection, keyboard send/newline behaviour, inline retry without duplicate failed exchanges, successful-send composer clearing and current-source transient history bounded to20 exchanges. Editing a new draft keeps earlier current-source turns; source changes/unavailability remove transcript evidence. The Clear action was subsequently removed by human instruction. Display history is never provider context or persistent browser storage. These are presentation checks, not live conversation quality or private-message delivery evidence.

CHG-D-005 corner-widget presentation checks: launcher opens a nonmodal event-chat region over the synthetic event-information page; closing/Escape restores launcher focus and preserves only volatile parent-owned conversation state. Underlying page remains operable with no backdrop/focus trap; current-source replacement/unavailability still removes all old excerpts, including event details. Check narrow/short viewport bounds and composer reachability. This does not implement real Student discovery/event details or server access.

CHG-D-006 adds mocked local-provider portions of T06/T09/T13/T14/T18/T27/T31: complete prompt-envelope bounds, exact server-owned sample sources, sanitized schema/evidence DTOs and client revalidation; fixed provider failures, cancellation/stale output, loopback/development/origin/JSON/body denials before dispatch; persisted reservation/spacing/exhaustion/corruption/lock failures; private six-setting projection with unrelated values excluded. Copied valid configuration plus no allowance must remain offline. No model permission, live semantic quality, real Student/publication access, intended-host reachability or full scenario pass follows from these checks.

CHG-D-006 conversational refinement (22October2026): mock factual paraphrases/subjective uncertainty/missing facts,700code-point wellformed reply bounds,strict evidence/schema identities,inert prose/quote disclosure and no fake forwarding. Invalid citation still withholds whole reply. Literal valid quotes with unrelated generated prose remain a documented semantic-evaluation limitation,not a mechanically prevented case. Existing source-only context,cancellation and denial checks apply. No live quality evaluation performed.

## WP-003 original scope — CHG-K-009

Existing IDs remain intact; these are scoped checks, not whole-scenario passes. T02 checks anonymous/Student/foreign Organiser denial of event operations with no disclosure/mutation. T05 checks concurrent save/preview/publish/lifecycle versions: a changed draft, form snapshot, owner or version cannot use an older approval; failed writes do not replace newer work. T22 checks incomplete draft saving versus complete manual zero-AI publication, every accepted field/aggregate boundary, exact preview and immutable approved revision. T25 checks unsaved Cancel Editing, explicit saved-draft discard, confirmation dismissal and denial of deletion after any publication (even zero registrations). T29 checks combined own-event title search and both-direction sorts, including missing draft dates and deterministic tie ordering; loading/empty/failure are distinct.

T07/T23/T24 registration and T06 chat portions remain deferred to their consumers. WP-003 separately checks withdrawal hides current public reads, final cancellation cannot republish, and private replacement leaves the existing publication unchanged. Timing uses the [accepted WP-003 policy](../shared/domain-and-data-contracts.md#accepted-wp-003-bounds-and-timing--21-october-2026): Singapore/UTC round trips, exact now rejection for first publish/republication, earlier/later future replacement starts, rejection of past/exact-now changed starts, owner post-start/end access and retained-start published content-only replacement. No Student T30 implementation is assigned.

## CHG-K-009 layout/rescheduling refinement acceptance

T29: Given a published event with a different saved private title/schedule, the whole card is one keyboard-focusable link; it shows the publication title/schedule plus Saved changes. Search/title/start ordering follow displayed values. A same-content save/discard removes the badge despite a newer operation version; cancelled cards omit the badge.

T22/T25: Opening a published event shows only Current Live Publication; opening withdrawn shows Last Publication with a withdrawn notice; cancelled is read-only. Edit resumes saved private values without rendering live content alongside. Save remains in the editor. Cancel Editing drops unsaved edits only and returns to publication while retaining saved private changes. Preview saved draft shows only Public Preview; approval/Publish/Edit/removal controls follow the content. Editing/reloading resets approval; refresh restores the default view and cannot reuse local preview approval. Never-published Delete draft and previously-published Discard saved changes have distinct confirmation effects; dismissing confirmation mutates nothing. Editor removal remains possible for incomplete saved drafts.

T23/T05: Given server time21Oct00:00 and a published22Oct14:00 start, preview/approval/publication may move it to22Oct13:00. Any changed past/exact-now start fails without changing the current publication. The same future-reschedule rule applies after an event has begun; retaining its unchanged past start for content-only replacement remains valid. A changed future start that passes at preview but reaches the server-time boundary before publish fails atomically, preserving the previous publication. Withdrawn republication requires a future start even when unchanged. Existing version/owner/session/approval guards remain in force; registration-dependent effects remain WP-004.

D006publication prerequisite (22October2026) checks SHR02/04/05/07/08,PAR06/07/11/12 and T06/T07/T09/T13/T14/T18/T27/T31 portions:Student-only source reads,current immutable publication vs private draft,canonical digest,stable publication binding,final stale/unavailable/revoked-session rejection,safe oversized/unsupported/post-start failure,transient source clearing and inert rendering. Dedicated disposable SQL covers actual Prisma/session/JSONB and publication transitions;no provider,hosted DB,Neon concurrency,live relevance or messaging evidence. Current-source checks linearise at fresh reads;previously delivered bytes cannot be retracted or automatically invalidated without a new request.

## D006 real-publication local Q&A — 22 October 2026

Subsequent conversational/contact amendment: T09/T10/T31rendering checks require natural direct replies without quote/section/revision disclosures or unresolved lists;partial/unanswered results suggest checking with the organiser without invented contacts/automatic sending. T09/T13/T14evidence/schema/current-revision rejection and inert prose rendering stay mandatory internally. Deterministic Singapore date formatting must match the approved UTC instant and must not invent earlier reporting time. Keith's future public-contact contract is a dependency for a working contact link/action. No live semantic/quality or end-to-end contact result is implied by mocked tests;private messaging scenarios keep their distinct future scope.

Approved planv1.0 adds scoped T02/T06/T07/T09/T10/T13/T14/T18/T27/T31/T32 checks: real current publication → mocked provider → authenticated final source/evidence check; role/origin/body/identity denials; canonical approved nonempty form projection; no private context; replacement/withdrawal/cancellation/revocation/expiry while inference runs; code-only published capacity; provider/admission failures and truthful no-forwarding; browser request cancellation and stale-response rejection. Actual disposable SQL covers producer forms/publication/auth with a fake provider and zero registration effect. Main-agent verification only, explicitly replacing subagent review for this assignment.

Production build and actual local production HTTP checks deny source/answer APIs404; this verifies development gating only. No live inference, actual model relevance/completeness/unsupported-claim evaluation, hosted admission/quotas, inbox/direct-question delivery, persistent-history suppression or full scenario pass follows. Exact runs, initial failures/fixes, remaining manual/browser checks and limits are recorded in D006verification.

## D006 hosted Preview acceptance extension — log26

T02/T06/T09/T13/T14/T18/T27/T31/T32portions now additionally require fixed authenticated product endpoints;Preview-only environment/enable/model checks;durable aggregate200attempt/output caps;per-account limits;concurrent/duplicate-request denial;lease expiry and idempotent late release;activation/redeploy preserving spend/expiry;failure-closed DB handling. Source/schema/revision/lifecycle/prompt privacy checks from the local slice still apply. Anonymous hosted sourceGETmust return401without admission/provider dispatch;Production product routes and hosted synthetic development routes stay404. Disposable single-connection PostgreSQL and mocked inference do not prove live Neon multi-instance throughput,actual model quality or full hosted authenticated journeys. No full scenario pass is asserted.

## Silent publication refresh — log28,22October2026

Darryl approved keeping existing conversation/draft visible during routine open/focus/source-only checks,without loading-status flicker or composer disruption. Focus during an active answer does not cancel or replace that request;server initial/final source/session/evidence checks remain authoritative. Unchanged checks preserve edits/history;overlapping/stopped/superseded requests cannot publish old results. A confirmed replacement immediately invalidates old replies and reloads the current source without resending the draft;actual unavailability/checkfailure still clears stale source and shows a friendly status. This supersedes earlier instructions to clear the transcript at the start of every routine check. No new inference,provider/key/budget/schema behavior.

PR #35 integration regression targets (T05/T22/T26): Save Draft commits an optional form and explicit clarification resolution together, later field-only saves preserve the form, and publication includes its reviewed questions. Form-only private edits restart inactivity and appear in owner retention metadata; expiry restores the latest nonempty published form and public fields while preserving the immutable publication. Transport metadata supports both Student truncation and Organiser finish-reason handling.
