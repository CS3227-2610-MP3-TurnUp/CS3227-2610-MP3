# Domain and data contracts

Contract leads: Keith for event states/publication; Darryl for forms/submissions/idempotency/capacity, with reciprocal review. Keith coordinates database migrations. Follow the [ownership and single-writer handoffs](../implementation-plan.md#human-ownership) for this shared document and implementation files. B1 target; logical contracts, not executable schema/migrations.

| ID | Observable requirement |
| --- | --- |
| SHR06 | Server validates allowed fields, positive integer capacity, required nonblank public text, end after start and bounded values. Invalid requests cause no partial mutation. Limits/timezone: G03/G05. |
| SHR07 | Fields, public document and public registration instructions/form share one approved immutable publication. Student cards/details/chat agree; private edits cannot change live content. |
| SHR08 | Reject stale draft/publication/form/submission versions instead of overwriting newer work. Distinguish invalid input, access denial, state/version/capacity conflict and dependency failure; preserve safe client input. |

## Public fields and approval

Required: **title**, **purpose/description**, **start/end**, **location/participation instructions**, **capacity**, **fee-status text**, **Open to text**, **prerequisites/preparation text**. Supplementary FAQs/Other are optional. Explicit “None”/“No preparation required” is valid where appropriate; omission does not prove free admission or no restrictions. Retain text such as “$1 - $100”; clarify unclear participation conditions. Fees imply no checkout/payment/multiple-ticket feature. Open to is guidance; “Anyone” means platform Students, without automated affiliation verification.

Canonical public content includes approved fields, description/Other and form instructions/labels/options; never submitted values, private notes or private replies. Approval binds exact draft/fact versions, fields/document/form and digest. Material changes stale approval. Publication atomically checks owner/state/current versions/completeness/capacity then replaces the public pointer. Human review also checks contradictory prose; field validation alone cannot establish consistency.

## Lifecycle

| Transition/action | Guard/effect |
| --- | --- |
| Create/save private draft | Owner-only; incomplete allowed; server UUIDs/owner/times |
| Draft → published | Complete exact reviewed revision, manual or assisted |
| Published → published | Private new draft approved atomically; old revision live until replacement |
| Published → withdrawn | Immediate public-source/chat/join denial; preserve registrations |
| Withdrawn → published | Fresh reviewed safe revision; capacity/state guards |
| Published/withdrawn → cancelled | Confirmed, final MVP cancellation; retain required history |
| Delete draft | Confirmed never-published only; no hard deletion after any publication, even zero registrants |

Published events can have separate working drafts. Cancel Editing discards unsaved local edits only; Discard Saved Draft and Cancel Event are distinct actions. Owner-edit activity drives modified sorting; registration counts do not. Withdrawn/cancelled public content is unavailable; own registrations/private threads expose safe status under G07.

## Logical records

| Record | Minimum invariants |
| --- | --- |
| User | Stable UUID, unique username, password hash, fixed role; optional Student profile |
| Event | Server event UUID/owner, state, first-publication time, live revision, concurrency/edit times |
| Preparation/draft | Event/source/fact/draft versions; minimal private facts/evidence/issues; candidate fields/document/form, separate private notes |
| Publication/form revision | Immutable approved fields/document/form, digest, owner/time; historical wording/options |
| Registration | Unique Student/event relationship, active/cancelled, joined publication/current submission, version |
| Submission | Registration/captured form, confirmed required event-contact snapshot, typed answers, immutable version/time |
| QuestionThread/Message | Student/event/server-derived owner, source revision, necessary context, private messages/state/times |
| Idempotency/audit | Actor/operation/key/payload digest/result; minimal metadata/expiry, no raw proposals/answers |

One authoritative transactional registration store prevents partial seats/submissions. Physical database layout is a design decision. Immutable versions still expire under [retention](deployment-and-retention.md).

## Variable form and submission

A versioned form contains an ordered array of zero or more questions with stable server-generated question/option IDs. Allowed types are `short_text`, `long_text`, `single_choice`, `multiple_choice`. Example data (D007 accepted bounds below):

```json
{
  "formRevisionId": "10000000-0000-4000-8000-000000000001",
  "questions": [
    {"id": "10000000-0000-4000-8000-000000000002", "type": "short_text", "label": "Dietary needs", "required": false},
    {"id": "10000000-0000-4000-8000-000000000003", "type": "single_choice", "label": "Workshop", "required": true,
     "options": [{"id": "10000000-0000-4000-8000-000000000004", "label": "Morning"}, {"id": "10000000-0000-4000-8000-000000000005", "label": "Afternoon"}]},
    {"id": "10000000-0000-4000-8000-000000000006", "type": "multiple_choice", "label": "Interests", "required": false,
     "options": [{"id": "10000000-0000-4000-8000-000000000007", "label": "Design"}, {"id": "10000000-0000-4000-8000-000000000008", "label": "Coding"}]}
  ]
}
```

Answer values keyed by question ID are text, one option ID, or an array of option IDs. Optional unanswered fields may be omitted. Server validates required/type/length/option/unknown-ID rules. Labels are inert data, never executable application fields; credential collection/file uploads/scripts/conditional executable schema are outside the proposed controls.

Join supplies expected publication/form versions, required event name and phone number or Telegram handle, answers and idempotency key; actor/owner are server-derived. The global profile remains optional and is only a prefill source. Final submission atomically checks state/start/capacity/versions and commits one place plus submission. Opening/typing holds nothing; invalid/stale/full submissions expose no partial roster record. Same-key same-payload retry returns committed result; changed payload conflicts. Two Students racing for one place produce one winner.

New joins/rejoins use current form. Existing active corrections before start use captured form and create a new submission version; later form edits do not reinterpret answers or remove places. Profile edits never rewrite submissions. Reject capacity below active count. Date/location/fee/Open to changes preserve registrations and flag My Events; cutoff edge cases remain G05. Route names/HTTP conventions belong in mutually agreed design, not an invented scaffold API.

Verification: T05–08/17/19–25; [decisions](../decisions.md).

## Accepted WP-003 bounds and timing — 21 October 2026

Keith explicitly accepted these event bounds and scoped timing choices in the CHG-K-009 conversation. They refine SHR06/08 and ORG02/09–13; acceptance is not implementation evidence. Darryl's agreement to deferred Student/registration policies is not inferred.

Text is NFC-normalised and trimmed; lengths count Unicode code points including internal spaces/line breaks. Required publication fields are nonblank. Maximums: title150; description4,000; location1,000; fee500; Open to1,000; preparation2,000; optional FAQ/Other4,000. Capacity is integer1–10,000. Combined organiser-authored public text is at most20,000 code points and48,000 UTF-8 bytes, counting each field once. Registration instructions/form text will count toward this total when implemented; form/answer-specific limits remain G03. Drafts allow missing required values and past/incomplete dates but enforce supplied-value types and maximums. Over-limit/invalid writes fail atomically without truncation.

Enter/display times in Asia/Singapore, persist UTC instants. Publication requires end strictly after start. First publication and republication from withdrawn require start strictly later than server time. Under Keith’s subsequent explicit layout/rescheduling approval on21 October2026, replacement while already published may retain an unchanged past start for content-only edits; any changed start must be strictly later than server time. An earlier or later replacement is permitted, including rescheduling an already-started event to the future. This supersedes the earlier blanket no-earlier-start rule. Republication from withdrawn still requires a future start even when unchanged. Owner access remains available after start/end. Student past-event discovery, post-start public/FAQ access and registration cutoff/rescheduling rules remain G05 and require the affected humans before consumer implementation.

WP-003 retains an immutable zero-question form with each approved publication. Student discovery/details, registration and configurable forms remain WP-004. A capacity field is the advertised limit, not a claim of remaining places. Registration-dependent capacity-floor/preservation/change flags and chat invalidation are verified with their future consumers. Publication versions/state remain the authority for those consumers.

## Organiser event presentation — accepted refinement, 21 October 2026

Keith explicitly approved the follow-up CHG-K-009 plan. Event cards use a single semantic full-card link. Never-published cards show saved draft content; previously published cards show the latest publication. Editable previously published events show Saved changes only when the saved draft field content differs from that publication; version increments alone do not imply changes. Cancelled events show no editable-changes badge. Search/title/start ordering use displayed content; modified order remains owner-edit activity.

Published events initially show Current Live Publication only, with bottom Edit Live Publication/Withdraw/Cancel Event actions. Withdrawn events initially show Last Publication with an unavailable notice and Edit for republication/Cancel Event. Cancelled events remain read-only. Edit resumes the existing saved private draft; the editor shows no publication/preview alongside it. Save stays in the editor. Cancel Editing discards unsaved values only and returns to the publication view for previously published events, or stays in the never-published editor.

Explicit Preview saved draft replaces the editor with Public Preview only. Approval/Publish and secondary Edit saved draft/removal actions sit below the content, without sticky controls. Editing invalidates local approval. Delete draft confirms deletion only for never-published events; Discard saved changes confirms restoration of the working draft from the last publication without deleting event/history, then returns to the publication view. Removal actions also remain available in the editor so incomplete drafts can be removed/restored. Refresh returns to the default publication view or never-published editor, with no retained preview/approval; a fresh explicit Preview is required. Pending mutations block duplicates, stale/dependency failures preserve input, and explicit reload/review never silently discards unsaved values.

## WP-004 consumer proposal status — 22 October 2026

Darryl approved [plan v1.0](../../docs/plans/wp-004-student-registration-plan.md), including his form/answer bounds, explicit optional sharing, captured-form corrections and effective-start/rescheduling direction. These proposed cross-role refinements await Keith's agreement and producer/migration handoff; they do not silently replace G03/G05/G07 or assign his implementation. Existing versioned form/submission/privacy/atomicity requirements above remain authoritative. D007's discovery-only DTO initially reports unavailable remaining places/own registration status rather than inferring a count/state from advertised capacity. Registration-dependent floor/count/history checks remain pending.

## D007 assigned completion contract — 22 October 2026

Darryl approved completion plan v1.1 and its recommended rules and assigned the main agent registration schema/migration and necessary shared publisher form/capacity work. This supersedes earlier unassigned-writer statements for this change only; it records no Keith agreement. Keith retains Organiser form-builder and roster UI/API. Main-agent verification replaces independent-agent verification by explicit human instruction.

Form/answer bounds: zero–10 questions; labels200/help500 Unicode code points; short answers250/long2,000; choices2–10 options/labels100. NFC/trim/CRLF-to-LF normalisation; reject controls/line separators except LF/tab in multiline text. Optional blanks are omitted; required/type/unknown/repeated-option checks are authoritative. Public fields plus labels/help/options share20,000-code-point/48,000-UTF-8-byte budget. Four types remain unchanged. New question/option UUIDs are server generated; save may retain only IDs from that event's saved draft, with unchanged question type. Semantic replacements require new IDs; builder must offer that distinction. Form-only edits change the saved-change badge and require fresh preview/approval. The preview displays exact labels/help/options/required flags without adding builder controls.

Join/rejoin/cancel/correction require database wall time strictly before the current effective published start. Withdrawn cancellation uses last publication start; withdrawn correction is denied. Published details remain readable after start. Approved future rescheduling preserves places and can close/reopen controls; no forced new answers. Numeric UTC epoch avoids driver/session-timezone conversion in time guards. My Events compares approved Schedule/Location/Fee/Open to/form content with the joined baseline; changed-back content clears the relevant flag, fresh revision identity alone does not. Viewing/correction/private saves leave the baseline intact; rejoining establishes a new baseline. Unpublished cards contain safe status/reference only.

Registration owns one Student/event relationship, incrementing join generation and optimistic version; immutable submissions capture exact source publication/form, required event name and a phone number or `@Telegram` handle, and typed answers. Corrections append versions against captured form, never current profile or replacement form. SQL source and current-pointer ownership guards supplement server checks. Active counts are derived from registrations, never advertised capacity or owner editedAt. Publisher and lifecycle mutations use the same event row lock; undersized capacity is rejected under that lock.

Operation key is UUID scoped to actor/event/JOIN|CANCEL|CORRECT, with canonical JSON digest and minimal durable result. Exact replay returns the original receipt without mutating a newer generation; changed payload conflicts. A receipt reports the historical committed operation, so Student success text directs users to My Events for current status. At most one retry of explicit serialization/deadlock aborts retains the original key. Registration JSON is streamed with256KiB/5s bounds; auth parsing is unchanged. Cleanup/key expiry and the90-day retention implementation remain G06, with no silent key recycling or completed-cleanup claim.

Executable paths and actual local checks are in D007 verification. Neon migration and deployed acceptance are not established by these rules.
