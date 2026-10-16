# TurnUp project: accepted decision reference

Captured from the human's accepted decisions in the planning conversation, 16 October 2026. This is a supporting source for future reconciliation, not the canonical product specification, a completed implementation, or an instruction to start repository setup. Do not use older documents' 'confirmed' labels to silently overturn these decisions. Later explicit human changes should be recorded with provenance.

## Scope and technology

- One TurnUp web application with Student and Organiser interfaces; two human members own their respective role's complete workflow, including server behaviour and tests.
- Next.js + TypeScript, deployed online on Vercel Hobby. A working deployment must not rely on a developer laptop.
- Use a team-owned Markdown/Git SDD process inspired by OpenSpec, without installing or running OpenSpec.
- PostgreSQL/Neon Free, Prisma, Zod, server-side HTTP calls, unpdf, Vitest, Playwright, and Auth.js Credentials with maintained password hashing were suggested implementation components. Next.js/TypeScript and Vercel are settled; validate final library versions, authentication/session semantics, database setup, provider quotas, and deployment constraints before implementation. Do not treat this resource as a tested stack manifest.

## Accounts and ownership

- Signup collects only username, password, and one fixed role: Student or Organiser. A single account cannot hold both roles. No self-service role switching or organiser enablement in the MVP.
- Usernames are globally unique across roles. Preserve a stable user ID across username changes. Store password hashes, not reversible plaintext/encrypted credentials.
- Successful signup logs the user in and routes by role. Organisers cannot register for any event or enter the Student chatbot as a participant. Students cannot operate organiser workflows. Own-event public preview is an organiser operation, not a second role.
- Student Name and Phone Number are optional editable profile fields after login. There is no hidden global name/contact prerequisite for registration. Event-specific required information is explicitly requested in the published registration form. Show/confirm submitted information shared with the event owner.
- Mandatory email, verified campus affiliation, and an account-recovery mechanism have not been accepted as added requirements. Do not silently introduce them. Session expiry, secure credential changes, and password-change revocation must be specified before coding.

## Public event fields

Required: title, purpose/description, start/end, location/participation instructions, capacity, fee-status text, 'Open to' text, prerequisites/preparation text. Supplementary FAQ text is optional and may be included in 'Other'.

- Preserve organiser-written fee text such as 'Free', '$2 per ticket', or '$1 - $100'. A range may need clarification about conditions. This is information display, not payment or multi-ticket functionality.
- 'Open to' is organiser-authored eligibility guidance for the MVP. 'Anyone' means eligible users of the platform's Student functionality, not an implemented guest registration flow. Automatic institutional verification would be added scope.
- Explicit 'None'/'No preparation required' is allowed. The AI cannot infer no restrictions, free admission, or no preparation from missing source text.
- The approved canonical public representation includes all public fields, description, Other, and relevant registration instructions so Student pages and chatbot sources agree. Submitted attendee answers are never public evidence.

## Organiser workflows

- Preserve the own-event grid, title search, alphabetical/modified/start-time sorting, details, manual entry, and confirmation dialogs from the original organiser proposal.
- Save Draft -> Preview -> Publish. Incomplete private drafts may be saved; publication requires complete validated information and explicit owner review of the exact public revision.
- Edit published information in a new private draft. The previous publication stays live until its approved replacement is published atomically. A complete manual draft can be published with zero AI calls.
- Delete only never-published drafts. Cancel previously published events, even with no registrations. Withdrawal immediately stops public access/chat/joining while preserving registrations and allows safe reviewed republication. Cancellation is final in the MVP.
- Cancel Editing discards unsaved local edits, preserving saved draft and live publication. Discarding a saved draft and cancelling an event are separate actions.
- 'Modified' sorting refers to organiser editing activity; publication updates are tracked separately from registration-count changes.

## Proposal assistance

- The organiser selects one PDF locally. Selection alone transmits nothing. Generate sends it to a server-side temporary processing path; the original PDF is not persistently stored in a database or object store.
- Release PDF data and clean up any temporary files on success/failure; do not log raw proposals. Full extracted proposal text is transient. Necessary private structured facts, short evidence excerpts/page references, clarification state, and generated drafts can be retained under their retention policy.
- Display partial extracted fields immediately where available. Ask targeted questions for defined blockers; optional gaps must not create an endless publication block.
- Suggest likely Student questions and supported candidate answers for Other. Ask the organiser when evidence is missing. Only organiser-reviewed answers become public; plausible invented answers are prohibited.
- A conservative 4,000,000-byte/20-page text-PDF limit and a dedicated Next.js Route Handler were recommended. Confirm the final numeric file/text/token/time limits against the deployed route and parser. OCR is outside the proposed initial scope.
- The Student FAQ assistant never receives original proposals, private extracts/drafts, private replies, notes, attendee records, or an organiser-side conversation/index/cache. Provider retention must be verified before claiming deletion outside application control.

## Registration and changing events

- One Student account reserves one place immediately after a valid final submission. No seat is held during form entry. Validate capacity/state/current versions and save registration/submission together atomically. Retried requests do not consume extra places.
- No waitlist or organiser approval queue in the MVP. Permit cancellation before the published start and while withdrawn. Rejoining checks current capacity and published requirements.
- Custom forms use versioned JSON definitions with stable server-generated question/option IDs: short_text, long_text, single_choice, multiple_choice. Zero or varying question counts are supported. The previously proposed cap is 10; field/answer limits need specification.
- Store immutable published form versions, registrations, and versioned submissions linked to the captured form. New joins/rejoins use the current version; existing answer corrections use their captured form. Validate required answers, types, lengths, unknown IDs, and valid options server-side.
- Optional profile prefills are confirmed per registration; event-specific changes do not silently edit the profile. Profile edits do not rewrite earlier submissions. Only Student submitter and owning Organiser read the submission.
- Preserve registrations after schedule/location/fee/eligibility changes, flag changes in My Events, and allow cancellation; do not silently charge or disqualify existing registrants. Reject capacity reductions below active-registration count.
- Exact handling of unusual schedule changes, past events, and post-start access must be resolved in the feature specification rather than invented by the implementer.

## Student questions and private replies

- Any authenticated Student may ask about a published event, without first registering. Provide supported answers from the selected event's current approved source, with evidence/revision validation. Clarify ambiguous questions; do not automatically forward irrelevant/abusive input.
- Forward valid unanswered/partly unanswered questions through application code to the server-resolved owning organiser. Display 'sent' only after the inbox write commits. Technical failures must not masquerade as missing information; retries are bounded and forwarding is idempotent.
- Use Next.js endpoints/internal question handling with PostgreSQL QuestionThread and Message records. An independent messaging platform or deployed messaging service is not needed for the MVP.
- Inboxes update on open/refresh; instant delivery is not an accepted real-time requirement. Keep existing private threads accessible and allow organiser replies after event cancellation; block new chatbot requests for unavailable events.
- Private replies become shared knowledge only through explicit inclusion in a new reviewed public revision. Define how sensitive stored replies/caches are suppressed after emergency withdrawal.

## Accepted retention defaults

- Original PDF and full transient proposal text: processing only, no application persistence.
- Inactive private preparation/drafts: delete after 30 days of inactivity, with advance notice. Notice lead time and exact inactivity definition remain to be specified. Cleanup must not delete live publication data by accident.
- Registration details, historical answers, and private question threads/messages: delete or anonymise 90 days after event completion/cancellation.
- Minimal operational audit records: 90 days; exclude raw private proposal content and attendee answers.
- Optional Student profile fields: until removed by the Student or account deletion.
- Cover derived copies and backup expiry. Versioning does not justify indefinite personal-data retention. Specify deletion/anonymisation relationships and backup expiry before implementing cleanup.

## Setup-process boundaries

- Four setup roles: SDD Coordinator, Requirements Analyst, Repository Workflow Builder, Independent Specification Reviewer. Their associated five skills are coordination, reconciliation, acceptance authoring, bootstrap, and audit.
- Shared AGENTS.md guidance, specialist agent definitions, reusable skills, canonical specs, and per-change evidence serve different purposes. One writer per artifact and explicit shared-contract dependencies avoid conflicting edits.
- Spec states must distinguish agreed, implemented, and verified. Keep behavioural scenarios and technical design separate. Preserve assignments, source/spec revisions, handoffs, actual checks, findings, and human decisions as contribution evidence.
- Current request authorises creating agent/skill definitions and logs/keith/01-project-setup.md only. Broader root guidance, specs/, changes/, source, migrations, and application scaffold are deferred until a later assignment. Do not infer permission to execute setup by reading this reference.
