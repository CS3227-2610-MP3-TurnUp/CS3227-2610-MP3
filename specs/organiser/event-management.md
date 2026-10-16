# Organiser event management

Owner: Organiser member; reviewer: Student member. B1 target, unimplemented. Depends on [accounts](../shared/accounts-and-access.md), [contracts](../shared/domain-and-data-contracts.md), [privacy](../shared/ai-and-privacy.md).

| ID | Observable requirement |
| --- | --- |
| ORG01 | Grid lists only owned events with title/schedule/location/description excerpt. Combine title search with title, owner-edit modified time or start-time sort in both directions; show loading/empty/error outcomes. |
| ORG02 | Create/save incomplete private drafts manually; server assigns UUIDs/owner/times. Required-field gaps block publication, not draft saving. |
| ORG08 | Correct fields/document and remove sensitive material; private notes stay separate. Preview contains proposed public content only; flags are advisory. |
| ORG09 | Explicitly approve/publish exact fields/document/form under shared atomic guards. Complete manual drafts publish with zero AI calls; forged/stale approval fails. |
| ORG10 | Published edits create private drafts; live content changes after fresh approval only. Preserve registrations/flag changes; reject capacity below active count. |
| ORG11 | Immediately withdraw to stop public access/chat/joining while preserving registrations. Fresh safe revision needs review; historical-message suppression G07. |
| ORG12 | Confirm published/withdrawn event cancellation, final in MVP; stop joining/chat, show registrant notices and retain necessary private history under retention. |
| ORG13 | Confirm deletion of never-published drafts only. Cancelling dialog mutates nothing. Previously published events cannot hard-delete, including zero registrations. |
| ORG18 | Preserve saved drafts/newer edits after AI/write/time/rate/stale failures and show truthful recovery. Cancel Editing discards unsaved local changes only, preserving saved/live content. |

[Contracts](../shared/domain-and-data-contracts.md) define required fields/approval/lifecycle once. Discard Saved Draft, Cancel Editing and Cancel Event have distinct effects/labels. Provider failure leaves manual completion available. Date edge cases remain [G05](../decisions.md).

Verification: T05–07/14/22–25/29. Role ownership includes UI/server/tests with shared publication-contract review.
