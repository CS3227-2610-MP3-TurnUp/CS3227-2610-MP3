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
| Submission | Registration/captured form, confirmed optional profile snapshot, typed answers, immutable version/time |
| QuestionThread/Message | Student/event/server-derived owner, source revision, necessary context, private messages/state/times |
| Idempotency/audit | Actor/operation/key/payload digest/result; minimal metadata/expiry, no raw proposals/answers |

One authoritative transactional registration store prevents partial seats/submissions. Physical database layout is a design decision. Immutable versions still expire under [retention](deployment-and-retention.md).

## Variable form and submission

A versioned form contains an ordered array of zero or more questions with stable server-generated question/option IDs. Allowed types are `short_text`, `long_text`, `single_choice`, `multiple_choice`. Example data (bounds remain G03):

```json
{
  "formRevisionId": "form-v2",
  "questions": [
    {"id": "q-server-1", "type": "short_text", "label": "Dietary needs", "required": false},
    {"id": "q-server-2", "type": "single_choice", "label": "Workshop", "required": true,
     "options": [{"id": "o-server-1", "label": "Morning"}, {"id": "o-server-2", "label": "Afternoon"}]},
    {"id": "q-server-3", "type": "multiple_choice", "label": "Interests", "required": false,
     "options": [{"id": "o-server-3", "label": "Design"}, {"id": "o-server-4", "label": "Coding"}]}
  ]
}
```

Answer values keyed by question ID are text, one option ID, or an array of option IDs. Optional unanswered fields may be omitted. Server validates required/type/length/option/unknown-ID rules. Labels are inert data, never executable application fields; credential collection/file uploads/scripts/conditional executable schema are outside the proposed controls.

Join supplies expected publication/form versions, confirmed optional profile values, answers and idempotency key; actor/owner are server-derived. Final submission atomically checks state/start/capacity/versions and commits one place plus submission. Opening/typing holds nothing; invalid/stale/full submissions expose no partial roster record. Same-key same-payload retry returns committed result; changed payload conflicts. Two Students racing for one place produce one winner.

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
