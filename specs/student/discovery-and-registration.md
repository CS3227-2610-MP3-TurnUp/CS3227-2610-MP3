# Student discovery and registration

Owner: Student member; reviewer: Organiser member. B1 target, unimplemented. Historical PAR means Student.

| ID | Observable requirement |
| --- | --- |
| PAR01 | Browse/title-search published cards with start-time ordering. Draft/withdrawn/cancelled public information never leaks; upcoming/past defaults G05. |
| PAR02 | Show approved details, owning Organiser username, own registration state and code-derived remaining places. Client owner/revision overrides cannot expose private/superseded content. |
| PAR03 | Final valid submission atomically commits one place/registration/submission after state/start/capacity/version checks. Missing optional profile is valid; failure reserves nothing; duplicate retries consume no extra place. |
| PAR04 | Cancel own registration before published start, including while withdrawn; free capacity once. Rejoin checks current publication/form/capacity; no joining cancelled events. |
| PAR05 | My Events shows own state, limited withdrawal/cancellation notice and changed-publication flags. Valid date/location/fee/Open to changes preserve places; allow cancellation under cutoff, edge cases G05. |
| PAR13 | Form prefills optional profile; Student may edit event values and confirms sharing. No global name/contact prerequisite or seat hold; event edits do not change profile. |
| PAR14 | Submit allowed answers with matching publication/form versions. Server rejects required/type/length/choice/unknown-ID errors, preserving input with no partial owner-visible submission. |
| PAR15 | Explicitly edit active submission before start using captured form; create new immutable version. Other events/profile/history stay unchanged; stale edits conflict. |

One Student account represents one place; no waitlist/approval queue. Organisers cannot join any event. Explicit required custom questions remain separate from optional global profile. [Contracts](../shared/domain-and-data-contracts.md) define snapshots, schema changes/capacity/idempotency; [access](../shared/accounts-and-access.md) protects records.

New joins/rejoins use current form; existing registrations retain captured wording/place, without forced new answers/disqualification. Availability during typing is advisory; server decides at final submission. Answer correction cannot create a second seat.

Verification: T08/16–20/23/24/30; post-start/history/rescheduling details require G05 before dependent implementation.
