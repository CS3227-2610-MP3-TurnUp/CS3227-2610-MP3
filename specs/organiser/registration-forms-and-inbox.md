# Organiser forms, registrations and inbox

Owner: Keith (Organiser); reviewer: Darryl, who leads shared form and thread contracts. B1 target, unimplemented. Depends on [contracts](../shared/domain-and-data-contracts.md), [access](../shared/accounts-and-access.md), [privacy](../shared/ai-and-privacy.md).

| ID | Observable requirement |
| --- | --- |
| ORG14 | Read own-event roster: username/time/state/form version and captured optional profile/custom answers. Missing name/phone is valid; do not substitute arbitrary current global profiles. |
| ORG15 | Read pending/answered owned-event question threads and source revision/necessary context. Server resolves recipient; foreign threads inaccessible. |
| ORG16 | Save private replies; mark answered/sent only after commit. Only asking Student/owner read. Existing threads remain accessible and owner may reply after cancellation, within retention/withdrawal policy. |
| ORG17 | Explicitly copy suitable reply information into a new public draft for fresh review; no automatic FAQ publication or AI learning. |
| ORG19 | Create/order/edit/preview variable-count questions with supported types/required/options. Publish immutable form with exact event revision; form-only changes need fresh review. |
| ORG20 | Read answers against captured historical wording/options; later schema changes never reinterpret earlier retained answers. Owner reads only own-event submissions. |

[Form JSON/transaction contract](../shared/domain-and-data-contracts.md) defines types/versions/validation. Optional profile fields are not mandatory built-in questions. Event-specific required information must be explicitly requested/reviewed; Students confirm sharing. Submitted values never enter either AI context/public content.

Application-owned QuestionThread/Message records and Next.js server operations suffice: no independent broker/chat platform. Refresh on inbox open/manual refresh; real-time delivery, email/push, automated SMS/Telegram and bulk exports are not agreed. PAR09/12 governs truthful/idempotent forwarding.

Verification: T10–12/17–21/27. Final bounds, retention mechanics and historical-message suppression remain G03/G06/G07.
