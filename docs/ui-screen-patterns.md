# TurnUp screen patterns

Read [UI guidelines](ui-guidelines.md) first, then only the relevant pattern below and its linked behavioural specification. These are TurnUp layout recommendations, not new product rules, route definitions or implemented wireframes. Canonical specs and unresolved [decision gates](../specs/decisions.md) control fields, permissions, states and outcomes.

## Accounts and profile

Use the pale canvas, a centred white 12px-radius panel around 464px wide, TurnUp identity, clear heading, stacked labelled inputs and a green submit action. Signup includes exactly username/password/fixed role; login follows the agreed credential contract. Role selection at signup is not an authenticated workspace switcher. Email verification, OTP, guest access, admin roles and extra signup fields are not agreed features.

Profile/credentials use grouped white sections in the common shell. Keep optional Student Name/Phone visibly optional and separate from event submissions. Security policy, password rules and recovery UX remain G01/G02 decisions; styling does not settle them. Behaviour: [accounts/access](../specs/shared/accounts-and-access.md), SHR01–05/09; planned checks T01/T02/T16/T32.

## Student discovery and event details

Use an event heading, a white search panel, title-search control, approved start-time ordering and a one/two/three-column grid. Building/category filters, pagination and image uploads are not specified here. Cards prioritise approved title, schedule, location, fee text and code-derived availability; preserve required information on the details page.

Details can use a main information column plus a compact registration/action panel on wide screens, stacked on mobile. Distinguish fee status, Open to and preparation. Preserve Organiser-written text and optional FAQ/Other; never infer free entry or eligibility. A detail CTA can lead to the published form, without reserving a place. Do not invent a pay button, multi-ticket selector, waitlist or approval queue. Behaviour: [discovery/registration](../specs/student/discovery-and-registration.md), PAR01–05; [public contracts](../specs/shared/domain-and-data-contracts.md), SHR06–08; T08/T23/T24/T30. G05 still controls past/post-start cases.

## Registration and My Events

Use a clear form title, event context, grouped questions, helper/error text and a final sharing/submit region. Preserve zero-question forms and all four supported types. Optional profile prefills are confirmable event-specific values, not mandatory account completion. Show that availability is provisional until final server success; no held-seat counter or countdown.

My Events uses compact cards/rows with own registration state and safe changed/withdrawn/cancelled notices. Show only permitted actions at the appropriate state/cutoff; keep explanatory feedback for conflicts. Answer corrections show captured form wording, not the latest event form. Do not reveal withdrawn public excerpts to make a card look fuller; historical-content treatment remains G07. Behaviour: [registration](../specs/student/discovery-and-registration.md), PAR03–05/13–15; [forms/submissions](../specs/shared/domain-and-data-contracts.md); T08/T16–21/T23/T24.

## Organiser event workspace

Use clear management headings, grouped form sections and responsive data presentation. Keep the accepted own-event grid, title search and both-direction title/modified/start sorting; retain ORG01's grid rather than substituting a table.

Use distinct regions for required event facts, public description/Other, registration form and private preparation. On wide screens, editor and bounded assistance/review panel can sit side by side; on mobile, stack in a readable order. Public and private content need explicit headings/labels rather than colour alone. Public preview includes only the exact proposed publication, including the form; never private notes or full proposal text.

Keep Save Draft, Preview and explicit Publish visually distinct. Use separate publication, working-draft and preview modes, showing only the selected content mode at a time. Published events open on Current Live Publication, with Edit Live Publication/Withdraw/Cancel Event in one non-sticky bottom action row. Withdrawn events show Last Publication and an unavailable notice before Edit for republication/Cancel Event. Preview places approval/Publish/Edit saved draft and the appropriate removal action below public content. Cancel Editing, Discard Saved Draft, Withdraw, Cancel Event and Delete Draft retain their different effects and allowed states; dialogs name the affected event and actual consequence. Behaviour: [event management](../specs/organiser/event-management.md), ORG01/02/08–13/18; [publication contracts](../specs/shared/domain-and-data-contracts.md); T05–07/T22–25/T29.

## Proposal assistance

Use a compact source-selection area and a separate Generate action; selecting a PDF shows a local selection only. Display partial extracted fields and practical evidence/page references promptly, with known/missing/conflicting labels. Clarification appears beside the relevant fact, not as an endless chatbot replacing the editor. Unsupported optional FAQ suggestions may be omitted.

Generated public candidates remain editable and separate from private findings. Applying a replacement over manual work is explicit; generation alone never earns an Approved or Published label. Reserve those labels for their actual owner-reviewed approval/publication outcomes. On parser/model/rate failure show the actual problem, preserve saved work and offer manual completion. File limits come from validated G04 decisions. Behaviour: [proposal assistance](../specs/organiser/proposal-assistant.md), ORG03–08/18; [privacy](../specs/shared/ai-and-privacy.md), SEC01–06; T03–05/T13/T14/T22/T26.

## Student FAQ and private replies

Use restrained panels, shared typography and consistent controls. Clearly identify the selected event and present short friendly replies focused on the question. Darryl's22October2026amendment keeps verified quotes/sections/revisions internal:do not render View sources,quotation blocks or unresolved-question lists. Subjective questions acknowledge personal preference;absent facts stay uncertain. Do not present generated prose as verified merely because it has citations. For partial/unanswered facts suggest checking with the organiser once,without automatic forwarding or sent claims. A working contact action awaits Keith's approved public contact field;never invent contacts or render a dead button. Deterministic date/time formatting is allowed;arrival instructions/other arrangements cannot be assumed. Code-derived capacity/state is application information,not a model prediction.

Use distinct notices for clarification, out-of-scope input, unsupported public information, provider failure, failed forwarding and unavailable/changed source. Show sent only after commit. My Questions and the Organiser inbox use separate private thread panels, pending/answered labels and clearly identified human replies; refresh on open/manual refresh. Do not imply instant typing/push delivery. No private reply, proposal or submitted answer appears as shared chatbot evidence.

Organiser public reuse explicitly copies suitable reply information into a new public draft for fresh review; it does not move/remove the private thread or enable automatic learning. Safe private thread access after cancellation and G07 withdrawal handling follow the specs. Behaviour: [FAQ/private questions](../specs/student/faq-and-private-questions.md), PAR06–12; [Organiser inbox](../specs/organiser/registration-forms-and-inbox.md), ORG15–17; [AI/privacy](../specs/shared/ai-and-privacy.md); T06/T09–14/T18/T27/T31.

## Forms and roster

Use grouped fieldsets, desktop tables and mobile labelled cards where appropriate. Form configuration supports ordering, required flags, allowed types and inert labels/options under ORG19. Use the same field/validation components as Student submission, while preserving configuration versus completion roles. Exact bounds remain G03.

Roster desktop tables and mobile labelled cards show only the owning Organiser's permitted captured submissions, historical form wording and optional profile snapshots. Missing Name/Phone is valid. Account-administration actions, exports and current-profile enrichment are outside this workflow. Required server authorization is independent of hidden controls. Behaviour: [forms/roster](../specs/organiser/registration-forms-and-inbox.md), ORG14/19/20; [privacy](../specs/shared/ai-and-privacy.md), SEC07; T17–21.

### Accepted Organiser card and screen refinement — 21 October 2026

The complete event card is one semantic link with visible hover/focus states and native keyboard/new-tab behaviour, without nested interactive elements. Cards for previously published events use publication content and an applicable Saved changes badge; drafts use saved private fields. Canonical [event presentation](../specs/shared/domain-and-data-contracts.md#organiser-event-presentation--accepted-refinement-21-october-2026) defines transitions and removal semantics. Keep actions wrapping on narrow screens, confirmation/failure feedback accessible, and focus meaningful after a content-mode transition. Preview/editor/publication content must not be simultaneously rendered merely hidden with CSS.

### Calendar evidence layout — CHG-K-010

Keep the two calendar field containers aligned to the top with intrinsic label/input row sizing. Inline proposal evidence belongs below its own input. Editing or clearing one date removes its source evidence without stretching or lowering that date input to match a sibling’s remaining feedback. The narrow-screen single-column layout still applies.

## Silent publication refresh — log28,22October2026

Darryl approved keeping existing conversation/draft visible during routine open/focus/source-only checks,without loading-status flicker or composer disruption. Focus during an active answer does not cancel or replace that request;server initial/final source/session/evidence checks remain authoritative. Unchanged checks preserve edits/history;overlapping/stopped/superseded requests cannot publish old results. A confirmed replacement immediately invalidates old replies and reloads the current source without resending the draft;actual unavailability/checkfailure still clears stale source and shows a friendly status. This supersedes earlier instructions to clear the transcript at the start of every routine check. No new inference,provider/key/budget/schema behavior.
