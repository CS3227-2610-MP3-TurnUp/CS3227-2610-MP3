# Acceptance scenarios

B1 targets; **all application/runtime evidence pending**. Integration means deterministic API/database checks; browser means complete user flow; AI evaluation means bounded labelled SoC runs recording model/prompt/configuration and actual context. Test frameworks remain proposed, not installed.

| ID · requirements | Given / when | Then / method |
| --- | --- | --- |
| T01 · SHR01/03 | Equivalent usernames race; winner renames | One account; stable UUID and relationships after rename. G01 first; integration. |
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
| T14 · ORG03/18, SEC04/05 | Malformed/oversized PDF or provider 429/timeout/invalid schema | Bounded truthful failure, temp cleanup, saved input/draft preserved, manual path usable. Integration/provider checks. |
| T15 · DEP01–04 | Second device runs signup → assist/manual publish → join → FAQ/escalate/reply online | HTTPS/persistence/SoC work without developer laptop; isolated config, release checks/migration/recovery evidenced. Hosted browser walkthrough. |
| T16 · SHR01/09 | Signup omits name/phone; Student later removes optional values | Valid signup/profile succeeds; no hidden contact requirement. Replaces mandatory-profile rejection. Integration/browser. |
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
| T32 · SHR02/03/05 | Invalid login, logout/expiry and username/password changes | Protected access denied as appropriate; UUID/relationships stable and duplicate username rejected; G01-approved reauthentication/revocation policy enforced. Integration/browser. |

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
| SEC03 | T09, T13, T21 |
| SEC04 | T14, T26 |
| SEC05 | T14 |
| SEC06 | T26 |
| SEC07 | T18, T21 |
| DEP01 | T15 |
| DEP02 | T15, T26 |
| DEP03 | T15, T28 |
| DEP04 | T14, T15 |
| DEV01 | T28 |
| DEV02 | T13, T28 |
| DEV03 | T28 |

Use synthetic private/public markers and labelled answerable, unanswerable, partial, ambiguous/off-topic cases. Inspect effects/model inputs, not refusal wording alone. Deterministic stubs support routine CI; controlled SoC runs establish provider evidence. Record failures and correction effort. A finite suite does not prove universal absence of hallucinations/injection.
