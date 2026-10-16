# Domain and data contracts

Owner: shared contract owner; both role members review. B1 target; logical contracts, not executable schema/migrations.

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
