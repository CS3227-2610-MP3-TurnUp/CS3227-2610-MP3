# Student discovery and registration

Owner: Darryl (Student); reviewer: Keith (Organiser). B1 target; D007 Student implementation has local main-agent evidence, with hosted/Organiser acceptance tracked separately. Historical PAR means Student.

| ID | Observable requirement |
| --- | --- |
| PAR01 | Browse/title-search published cards with start-time ordering. Draft/withdrawn/cancelled public information never leaks; upcoming/past defaults G05. |
| PAR02 | Show approved details, owning Organiser username, own registration state and code-derived remaining places. Client owner/revision overrides cannot expose private/superseded content. |
| PAR03 | Final valid submission atomically commits one place/registration/submission after state/start/capacity/version checks. Required event name and contact are valid only when supplied; failure reserves nothing; duplicate retries consume no extra place. |
| PAR04 | Cancel own registration before published start, including while withdrawn; free capacity once. Rejoin checks current publication/form/capacity; no joining cancelled events. |
| PAR05 | My Events shows own state, limited withdrawal/cancellation notice and changed-publication flags. Valid date/location/fee/Open to changes preserve places; allow cancellation under cutoff, edge cases G05. |
| PAR13 | Form may prefill the optional profile, but each registration requires an event name and phone number or Telegram handle. Student confirms sharing with the organizer; event values do not change the global profile or hold a seat. |
| PAR14 | Submit allowed answers with matching publication/form versions. Server rejects required/type/length/choice/unknown-ID errors, preserving input with no partial owner-visible submission. |
| PAR15 | Explicitly edit active submission before start using captured form; create new immutable version. Other events/profile/history stay unchanged; stale edits conflict. |

One Student account represents one place; no waitlist/approval queue. Organisers cannot join any event. Explicit required custom questions remain separate from optional global profile. [Contracts](../shared/domain-and-data-contracts.md) define snapshots, schema changes/capacity/idempotency; [access](../shared/accounts-and-access.md) protects records.

New joins/rejoins use current form; existing registrations retain captured wording/place, without forced new answers/disqualification. Availability during typing is advisory; server decides at final submission. Answer correction cannot create a second seat.

Verification: T08/16–20/23/24/30; post-start/history/rescheduling details require G05 before dependent implementation.

## Approved Student discovery — 22 October 2026

Darryl approved WP-004 plan v1.0 under CHG-D-007. Default Upcoming includes current PUBLISHED events with start strictly after database time. Started/past includes current PUBLISHED events with start at or before that time, including after end. Both title-search filters order ascending by approved start then event UUID; titles/search use approved content, never saved private drafts. Search is NFC-normalised, trimmed, case-insensitive, at most150 Unicode code points and contains no control characters. Requests cannot select another owner, role or historical publication. Current published details remain readable after start/end; this choice grants no registration/FAQ operation.

Opening/reloading a page or manually refreshing rereads the current approved representation. No realtime subscription is promised. A detected replacement/withdrawal during a read fails without returning the old content. Loading, empty results, unavailable event, changed-source conflict and technical failure are distinct; failure must not look like an empty collection. No private drafts/profile/submission data appear in these responses.

The initial discovery checkpoint exposed unavailable counts/state. D007 completion now derives remaining places and own state from transactional registration persistence; advertised capacity remains separately labelled. See the local implementation and remaining acceptance boundaries below.

## D007 Student completion implementation — 22 October 2026

Darryl approved completion plan v1.1/recommended rules and assigned the necessary schema and shared publisher integration. PAR02–05/13–15 now have local server/UI implementation: version-bound join/rejoin, explicit event-contact confirmation, immutable captured-form correction, own My Events, live code-derived remaining places and content-based publication indicators. APIs derive identity from session, reject Organisers/foreign registrations, and use no-store private responses. Registration/correction drafts survive validation/conflict/technical failures; uncertain retries keep the same key for the same payload. Opening the form reserves no place. Post-start/withdrawn/cancelled controls follow the [assigned contract](../shared/domain-and-data-contracts.md#d007-assigned-completion-contract--22-october-2026).

Student routes: event registration at `/student/events/[eventId]/register`, My Events at `/student/my-events`, own correction at `/student/registrations/[registrationId]`. Browser success acknowledges a committed receipt and directs the Student to current My Events, avoiding a stale replay claiming a current place. Profile is used only for initial join prefills; each new or corrected event submission requires its own name and phone number or Telegram handle. Submission details remain private and are hidden while unpublished.

Local tests exercise actual publisher→registration→correction/cancel/rejoin and concurrent PostgreSQL behaviour; focused component browser checks use synthetic callbacks and are not a hosted end-to-end walkthrough. Keith's builder/roster implementation and actual cross-role UI acceptance, assigned Neon migration and release checks remain separate. Full WP-004 is not declared complete from Student code alone. Detailed evidence/limits are in [D007 verification](../../changes/CHG-D-007-student-discovery-registration/verification.md).
