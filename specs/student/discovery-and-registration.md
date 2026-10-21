# Student discovery and registration

Owner: Darryl (Student); reviewer: Keith (Organiser). B1 target; D007 discovery implementation/checks are tracked separately from pending registration. Historical PAR means Student.

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

## Approved Student discovery — 22 October 2026

Darryl approved WP-004 plan v1.0 under CHG-D-007. Default Upcoming includes current PUBLISHED events with start strictly after database time. Started/past includes current PUBLISHED events with start at or before that time, including after end. Both title-search filters order ascending by approved start then event UUID; titles/search use approved content, never saved private drafts. Search is NFC-normalised, trimmed, case-insensitive, at most150 Unicode code points and contains no control characters. Requests cannot select another owner, role or historical publication. Current published details remain readable after start/end; this choice grants no registration/FAQ operation.

Opening/reloading a page or manually refreshing rereads the current approved representation. No realtime subscription is promised. A detected replacement/withdrawal during a read fails without returning the old content. Loading, empty results, unavailable event, changed-source conflict and technical failure are distinct; failure must not look like an empty collection. No private drafts/profile/submission data appear in these responses.

D007 initially implements discovery/details only. Until real registration persistence is integrated, remaining places and own registration state are explicitly unavailable, with no active registration control. Advertised capacity must never be labelled remaining capacity. PAR02's live state/count portion and PAR03–05/13–15 remain pending; this bounded delivery does not change those requirements.
