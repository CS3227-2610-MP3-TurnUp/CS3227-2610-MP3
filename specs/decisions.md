# Decisions and implementation gates

B1 · 16 October 2026. **Accepted** is human-agreed target; **recommended** is a proposal; **open** requires a recorded resolution before dependent implementation. None implies passing tests.

## Accepted reconciliations

| Decision | Resolution | Superseded conflict / affected IDs |
| --- | --- | --- |
| D01 | Exactly one fixed Student or Organiser role | Dual capabilities, enable-organiser/view switching; SHR01–05, T02 |
| D02 | Signup only username/password/role; optional Student Name/Phone after login | Mandatory signup or hidden registration name/contact/Telegram; SHR01/09, PAR03/13, T16 |
| D03 | Safe Draft → Preview → Publish; fully manual completion works | Immediate submit/update publication; ORG02/09/10 |
| D04 | Delete only never-published; cancel previously published even with zero registrations; withdrawal reversible | Conditional hard deletion of published events; ORG11–13 |
| D05 | Required fee/Open to/preparation text; optional FAQ/Other | Optional or silently inferred participation facts; SHR06, ORG06 |
| D06 | Show partial extraction immediately; clarify defined blockers; optional gaps do not endlessly block | Waiting for all clarification before any useful field display; ORG04–07 |
| D07 | Temporary server PDF/fulltext; Student AI uses current approved public content only | Persistent proposals or chatbot PDF/private-source access; ORG03/04, SEC01/04 |
| D08 | Atomic one-place registration, cancellation/rejoin, versioned forms/submissions | Seat holds, Organiser participation and mandatory global contact; PAR03–05/13–15 |
| D09 | Application inbox/private replies; explicit new public approval to share answers | Autonomous model messaging, automatic public learning, real-time dependency; PAR09–12, ORG15–17 |
| D10 | 30-day inactive private draft and 90-day event-personal/audit defaults | Indefinite version history or unspecified default retention; DEP02, SEC06 |
| D11 | Next.js/TypeScript on Vercel Hobby; team Markdown/Git SDD without OpenSpec installation | Django/VM/Vite as settled stack; DEP01–04, DEV01 |

## Open gates and recommendations

| Gate | Decision and recommendation | Dependency / accountable owner |
| --- | --- | --- |
| G01 | Choose maintained authentication/session design, expiry, cookie/CSRF controls and credential-change policy. Recommend current-password verification and revoking old sessions after password change. Decide username normalization, allowed lengths/password rules and optional phone validation. | SHR01–04/09; shared authentication owner |
| G02 | Account recovery is not agreed. Decide explicitly whether MVP offers none and explain limitation; do not silently add mandatory email. | Account UX/release; both humans |
| G03 | Final field/form/answer/public-document bounds. Historical proposals: ≤10 questions, label 200/helper 500 characters, short answer 250/long 2,000, 2–10 options/100-character labels. Validate usability and budgets before adoption. | SHR06, ORG19, PAR14; shared contract owner |
| G04 | Verify deployed byte/page/text/token/time/concurrency limits, parser types, SoC host access/model/quotas/data handling/costs. Recommend one text PDF ≤4,000,000 bytes/20 pages, no OCR initially; old 5 MiB is not adopted. | ORG03–07, SEC04/05, DEP04; AI/deployment owner |
| G05 | Decide timezone (recommend Singapore display/UTC storage), past-event publication/discovery, post-start access and earlier-start schedule changes. Recommend blocking timing changes that unexpectedly remove existing cancellation opportunities until explicit policy agreed. | SHR06, ORG10, PAR01–05/15; both role owners |
| G06 | Define inactivity, notice lead time, completion reference after rescheduling, deletion vs anonymisation, retained relationships, account deletion, derived copies and backup expiry. Recommend documented cleanup deadlines/tombstones without raw personal values. | Retention implementation/release; privacy owner |
| G07 | Decide suppression of stored messages/public excerpts after emergency withdrawal. Recommend hide withdrawn excerpts while retaining safe status/necessary private thread access. Previously delivered information cannot be retracted. | ORG11, PAR10/11; privacy and role owners |
| G08 | Assign human shared owners; choose database/library versions, migrations, release automation/recovery. Verify Vercel/database free allowances and usage eligibility. Confirm course-specific SoC/prohibited-environment rules from authoritative course material. | DEP01–04, DEV01–03; coordinator/both humans |

No mandatory email/affiliation verification, payments, guest registration, waitlists, automated SMS/Telegram, exports, OCR or additional roles are implied. Expand through an explicit change. Open gates block dependent implementation, not independent documentation.
