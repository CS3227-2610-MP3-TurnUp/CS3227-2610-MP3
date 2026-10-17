# Decisions and implementation gates

B1 · 16 October 2026; ownership update D12 · 17 October 2026; SoC access clarification D13 · 18 October 2026. **Accepted** is human-agreed target; **recommended** is a proposal; **open** requires a recorded resolution before dependent implementation. None implies passing tests.

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
| D12 | Keith owns Organiser workflows and leads WP-001; Darryl owns Student workflows and accounts. Shared-contract leads and reciprocal review follow the [implementation plan](implementation-plan.md#human-ownership). | Replaces unassigned role/shared leads; DEV02–03 and integration across SHR/ORG/PAR/SEC/DEP. |
| D13 | SoC AI access uses an API key supplied by Keith, subject to the existing server-side credential boundary. | Resolves the previously unspecified credential mechanism/supplier only; DEP04, SEC06, T14/T15. Model permissions, budgets, provider handling and intended-host reachability remain unverified. |

D12 provenance: the human assigned Keith to Organiser and Darryl to Student, selected Darryl for accounts/forms/chat contracts and Keith for event-state/AI/infrastructure contracts, then accepted Keith leading WP-001 in the 17 October 2026 conversation and requested this documentation update. This records ownership; product behaviour, technology choices and runtime verification remain unchanged.

D13 provenance: Keith stated in the 18 October 2026 conversation that he will supply the SoC API key himself and authorised the documentation-only plan under [CHG-K-002](../changes/CHG-K-002-wp-001-foundation-design/change.md). The supplied [SoCLaaS access guide](<../docs/reference/cf_guides_soclaas_access [SoC DocHub].pdf>) (pp. 1–2) and [API guide](<../docs/reference/cf_guides_soclaas_api [SoC DocHub].pdf>) (pp. 1–4, 7) support the documented access mechanism and failure cases; they do not establish additional human technology selections or course approval. The [researched design](../changes/CHG-K-002-wp-001-foundation-design/design.md) records proposals and remaining evidence. No credential, provider call or hosted check was used for this reconciliation.

## Open gates and recommendations

| Gate | Decision and recommendation | Dependency / accountable owner |
| --- | --- | --- |
| G01 | Choose maintained authentication/session design, expiry, cookie/CSRF controls and credential-change policy. Recommend current-password verification and revoking old sessions after password change. Decide username normalization, allowed lengths/password rules and optional phone validation. | SHR01–04/09; Darryl leads, Keith reviews |
| G02 | Account recovery is not agreed. Decide explicitly whether MVP offers none and explain limitation; do not silently add mandatory email. | Account UX/release; both humans |
| G03 | Final field/form/answer/public-document bounds. Historical proposals: ≤10 questions, label 200/helper 500 characters, short answer 250/long 2,000, 2–10 options/100-character labels. Validate usability and budgets before adoption. | SHR06, ORG19, PAR14; Darryl leads form/answer bounds, Keith leads public-field/document bounds; cross-review |
| G04 | API-key mechanism/supplier is settled by D13; this gate remains partly open. Verify deployed byte/page/text/token/time/concurrency limits, parser types, intended-host SoC reachability, permitted models/quotas/data handling/costs. Recommend one text PDF ≤4,000,000 bytes/20 pages, no OCR initially; old 5 MiB is not adopted. | ORG03–07, SEC04/05, DEP04; Keith leads, Darryl reviews Student-consumer needs |
| G05 | Decide timezone (recommend Singapore display/UTC storage), past-event publication/discovery, post-start access and earlier-start schedule changes. Recommend blocking timing changes that unexpectedly remove existing cancellation opportunities until explicit policy agreed. | SHR06, ORG10, PAR01–05/15; both role owners |
| G06 | Define inactivity, notice lead time, completion reference after rescheduling, deletion vs anonymisation, retained relationships, account deletion, derived copies and backup expiry. Recommend documented cleanup deadlines/tombstones without raw personal values. | Retention implementation/release; Keith leads infrastructure, Darryl reviews; both humans decide policy |
| G07 | Decide suppression of stored messages/public excerpts after emergency withdrawal. Recommend hide withdrawn excerpts while retaining safe status/necessary private thread access. Previously delivered information cannot be retracted. | ORG11, PAR10/11; Keith leads event/retention effects, Darryl leads thread effects; both humans decide policy |
| G08 | Human role/shared ownership is settled by D12. On 18 October 2026 Keith selected the [CLI deployment route](../changes/CHG-K-002-wp-001-foundation-design/design.md#selected-cli-deployment-route) and the [foundation stack](../changes/CHG-K-002-wp-001-foundation-design/design.md#selected-application-foundation), including Neon PostgreSQL for development and production. Selection is settled; implementation/verification remain pending. Record per-change writers, reviewers, paths and dependencies; lock exact versions and validate stack/connection/migration compatibility, release automation and recovery. Verify Vercel/Neon account access, regions, resources/free allowances, team/token access, usage eligibility and compatibility with the intended deployment arrangement. Confirm course-specific SoC/prohibited-environment rules from authoritative course material. Optional or feature-specific choices outside the selected design remain open; selection establishes neither eligibility nor compliance. | DEP01–04, DEV01–03; Keith leads foundation/deployment, Darryl reviews; each contract lead coordinates affected changes |

No mandatory email/affiliation verification, payments, guest registration, waitlists, automated SMS/Telegram, exports, OCR or additional roles are implied. Expand through an explicit change. Open gates block dependent implementation, not independent documentation.
