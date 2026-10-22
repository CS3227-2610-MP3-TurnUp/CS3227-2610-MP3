# CHG-K-011 implementation handoff

## Delivered snapshot

Keith owns this Organiser WP-005 increment. Source base: `9d651e8a56b42b6d053c4d790c699a0574cb7f68` on `wp-005-proposal-integration`. The delivery revision is the Git commit containing this handoff. The independently reviewed 19-file implementation/schema/test fingerprint is `6a5e1f5198a284c4094045e87984f1b310b038505238a40f50c0d2966cc5f772` (sorted relative path, NUL, bytes, NUL). Documentation-only reconciliation does not change that snapshot. Exact checks and defect dispositions are in [verification](verification.md).

The local synthetic slice implements inline targeted clarification and an unresolved summary, explicit organiser confirmation, persistent issue/resolution state, and server rejection of unresolved required facts before preview/publication. It covers ORG03–06/08/18, SHR05/06/08 and SEC01–06 portions under T02–05/13/14/22/25/26; it does not complete those full scenarios or WP-005.

## Consumer contract

Shared types, fixed copy and field mapping live in [clarification.ts](../../src/features/proposal-assistance/clarification.ts). Server policy/defensive parsing is in [server clarification.ts](../../src/server/proposal-assistance/clarification.ts). Public event fields, publication snapshots and the Student public reader are unchanged.

| Interface | Delivered behaviour |
| --- | --- |
| Owner event GET | Returns existing saved fields/publication plus private `preparation: EventPreparation \| null`. Preparation contains a revision and bounded per-field issues, alternatives, retained confirmed value and nullable resolution. |
| Proposal extraction POST | Existing multipart file/event/client revision fields now also require `expectedPreparationRevision` (`0` before any preparation). Accepted processing stores only structured preparation and returns existing `ok/revisions/extraction` plus authoritative `eventVersion` and `preparation`. Recording advances both revisions and invalidates prior approval; public draft values are not automatically saved. |
| Save Draft POST | Existing `action`, `expectedVersion` and `fields`, with `expectedPreparationRevision` and `resolutions` supplied together when using clarification. Each intent has `field`, `method: suggestion \| organiser`, and canonical `value`. Existing preparation requires a current preparation revision; an empty intents array saves an unresolved draft without implicitly resolving issues. Server validates current issue/alternative membership, canonical field equality and values. |
| Preview/publication | Existing operations independently enforce current saved field validity and resolved required issues. Clients cannot supply issue status or bypass it by omitting metadata. Preparation changes invalidate old event-version-bound approvals. |

The server stores selected exact evidence for a suggestion and no invented evidence for organiser-confirmed answers. Field mapping preserves `purpose → description` and `feeStatus → fee`; capacity resolutions are numbers, dates are canonical UTC and shown in SGT, and text confirmation uses the same NFC/trim/CRLF normalization as draft validation.

Confirming/selecting an answer is local until Save Draft. Refresh/Cancel Editing restore saved answers and current server issues. Editing a confirmation reopens only that field. Remove proposal removes the selected file without erasing recorded issues or prepared values. Regeneration preserves confirmed values and reopens disagreement; omission alone does not contradict them. Failed/partial/stale results cannot erase prior unresolved issues. Native PDFs, full extracted text and transient private model notes are not persisted by this storage contract.

## Schema and environment handoff

`20261023000000_proposal_clarification` adds nullable `event.preparation` JSONB and nonnegative `event.preparation_version` defaulting to `0`. Existing rows begin with null/0. The assigned development/non-production Neon target has the migration applied and its checksum verified. Rollback-only synthetic SQL checks passed for defaults, capacity JSONB round-trip, stale-revision rejection, event deletion and no residual account/event fixtures. This is not PostgreSQL concurrency stress or an authenticated browser walkthrough.

Other databases must check/apply their own migration state before running this application revision; the code queries the added Event columns even for manual-only events. No Production migration/deployment was performed. Do not copy private preparation or development data into Production. Use the [local setup and testing guide](../../docs/wp-005-proposal-integration.md); restart the local dev server after Prisma client generation before testing.

Structured preparation is enabled only for the existing development/non-production environment guard, independently of the model opt-in flag. Null-preparation manual-only events retain their existing workflow. Existing assisted records fail closed outside the enabled environment on read/save/discard/preview/publication; disabling inference does not resolve or delete issues. Student/publication consumers must never receive private questions, evidence or organiser attribution. Original PDFs/full extracted text remain temporary processing inputs.

## Verification and remaining boundaries

- Full suite: **331 tests / 34 files**; proposal assistance: **72 / 11**; lint and TypeScript passed. Independent review found no unresolved actionable defects after the capacity, environment-bypass and manual-normalization fixes.
- Sanitized Prisma validation/generation and an isolated webpack production build passed. Build warnings in the unchanged PDF parser and the unrun default-bundler variant are recorded in verification.
- The independent disposable PGlite replay timed out during setup; all seven SQL tests were skipped. The separately executed assigned-database checks above must not be reported as that replay.
- No fresh native browser/assistive-technology check, authenticated live-model walkthrough, hosted inference or comprehensive model evaluation was performed. Prompt v6 is unchanged; its last recorded bounded live title check used v3.
- ORG07 public-content/FAQ candidates, production private-preparation retention/cleanup (G06), intended-host/provider activation (G04) and comprehensive evaluation remain unfinished. These are status boundaries, not a plan for another increment. No Darryl registration/thread prerequisite was introduced.
- Agent usage for this root/descendants is attributed to CHG-K-010 before the accepted implementation turn and CHG-K-011 from that turn onward. Local ledger/report files remain outside Git; missing usage/pricing remains explicit. See log14 entries12–14 for the attribution and delivery record.
