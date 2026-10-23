# WP-006 - Grounded FAQ and private Organiser replies

Latest scope amendment (Darryl,22October2026): Student-assistant uncertainty now gives concise organiser-contact guidance instead of automatic private forwarding,with evidence internal rather than displayed. This supersedes those parts of the earlier baseline package/slice rows below. Keith's future approved contact field is the producer dependency for a working contact action;no field/destination is guessed. Separate My Questions/inbox/reply capabilities remain future,not an implicit effect of chat. See the current Student contract,decisions and D006verification/logentry23;no full WP006 or contact integration completion is implied.

Planned work under B1/D12; no implementation or passing runtime evidence is implied. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G03/G04/G07/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

## Scope and dependencies

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-006: grounded FAQ and private organiser replies | Darryl owns FAQ/escalation/reply viewing and thread contract; Keith owns inbox/replying and AI-provider contract; cross-review affected contracts | Current-public-source answers, evidence checks, ambiguity/partial/unanswered handling, committed forwarding, idempotent private threads, failure fallback and explicit public reuse of replies. PAR06–PAR12; ORG15–ORG17; SEC01–SEC03, SEC05–SEC07. | WP-002 and WP-003 publication contract; agree source/thread contracts and provider budgets. Private material never enters Student model context; sent status follows commit; source withdrawal/replacement invalidates stale output. Does not depend on WP-005. |

## Bounded implementation slices

| Package / slice | Lead and responsibility areas | Ordered deliverables and planned checks | Prerequisites / limits |
| --- | --- | --- | --- |
| WP-006: grounded Student FAQ | Darryl; Student chat and evidence/source contract; Keith supplies assigned AI-provider integration and reviews | Implement current-public-source context, verified quotes/sections, clarification and partial/unanswered/technical-failure outcomes. Check source replacement/withdrawal during a request, context exclusion and labelled answer quality. PAR06–09/11/12, SEC01–05; T06/T09/T10/T13/T14/T31. | WP-002/WP-003, source contract, relevant G03/G04 budgets. Does not require proposal assistance. Shared AI files need one active writer. |
| WP-006: private question delivery | Darryl leads `src/server/questions/`, forwarding and Student My Questions; Keith owns Organiser inbox/replies and public-reuse controls; reciprocal review | Implement server-resolved recipient, commit-before-sent, idempotent threads, refresh-based inboxes, private replies and explicit public reuse through a new publication. Check failed/lost responses, foreign-thread denial and private replies excluded from shared answers. PAR09/10/12, ORG15–17; T10–12/T18/T27/T31 portions. | Account/publication/thread contracts, coordinated migrations and G07 for sensitive historical-message handling. No separate messaging platform or real-time service. |

## Planned acceptance targets

| Package | Planned acceptance targets in [acceptance-scenarios.md](../verification/acceptance-scenarios.md) |
| --- | --- |
| WP-006 | T02/T06/T09–14/T18/T27/T31 |

Read each applicable scenario's complete Given/When/Then and method, including coverage and evaluation guidance. Partial package evidence does not pass an entire scenario.

## Independent component slice — CHG-D-005

Darryl approved the [synthetic component plan](../../docs/plans/wp-006-student-ai-components-plan.md) on 21 October 2026. The isolated slice implements a reusable chat panel, strict source/quotation validator, request/source state handling and unlinked development-only simulation harness. Exact checks and limits belong in [verification](../../changes/CHG-D-005-student-ai-components/verification.md). These components do not implement a live Student FAQ, publication access, provider integration, private forwarding or an inbox. All full-package acceptance targets above remain integration targets; quotation provenance does not establish semantic answer quality.

## Local provider bridge — CHG-D-006

Darryl approved the [local integration plan](../../docs/plans/wp-006-student-ai-local-provider-plan.md) on21 October2026. The bounded bridge reuses the server-only completion client, resolves server-owned synthetic sources, validates output on server/client and gates development-only loopback inference behind a persisted operator allowance. Real publication/Student-role/inbox integration and permission/budget/handling/hosted evidence remain pending; copying a private key does not arm inference. Exact results belong in [verification](../../changes/CHG-D-006-student-ai-local-provider/verification.md), not a whole-package completion claim.

## Publication prerequisite implementation -22October2026

The approved publication-source integration plan is implemented locally against producer1f0aa87 with an uncommitted prerequisite merge. Authenticated source projection,publication binding/final recheck,generic unavailable and dev-only source inspection now have focused mocked/SQL evidence. Real content is distinct from synthetic harness and cannot dispatch an answer/provider request from inspection. Interactive assigned database/auth setup and event migration remain prerequisites;full G05/G07,G04/G08,hosted answering and inbox journeys remain open. No full scenario pass.

## Local real-publication Q&A extension — 22 October 2026

Darryl approved [real-publication Q&A v1.0](../../docs/plans/wp-006-real-publication-qa-plan.md) under D006. Current base32d62e3 already contains WP003/merged WP004; earlier uncommitted-merge references describe historical checkpoints. The new local event-page widget, strict authenticated answer route, source-based provider adapter and complete approved-form projection are implemented and main-agent verified with mocked inference/disposable SQL. Existing local allowance and privacy/lifecycle boundaries are retained. No new migration or WP005 dependency: assisted and manual authoring both feed the same reviewed publication.

Only future-start publications within the existing32KiB source ceiling are supported; all development APIs remain unavailable in Production/Vercel. This increment makes no agent-issued live request or hosted-readiness claim. G04/G08 durable hosted admissions/provider evidence, broader G05FAQ timing/source sizes, G07stored history, private forwarding/MyQuestions/Organiser inbox and actual live answer quality remain pending. See D006verification for checks and manual limitations; no full WP006/scenario completion.

## Approved hosted Preview extension — 22 October2026

The log26approval extends D006to authenticated real-event answering on Vercel Preview with200total shared attempts and durable account/global admission. Local-only limitations above remain historical for the development harness;separate product endpoints now implement the hosted path. Current publication/evidence boundaries and natural corner chat are unchanged. Production enablement,actual live semantic quality,organiser contact and remaining history/inbox requirements stay pending. See hosted plan and verification for scope,limits and actual deployment results.

## Production activation authorised — 22 October2026

Darryl requests Production Student chat,push/merge and explicitly chooses a separate200attemptProductionpoolwithsamePreviewlimits. NewProductionapproval and matchingVercel/app/DBlabels preserve Preview counters and strict environment isolation. Additive20261022020000migration expands the budgetenvironmentCHECKonly;target-specificactivationneverresets/replacesexistingrows. ProductionusesitsownSTUDENT_SOCLAAS_API_KEY;Organiserkeyunchanged. Existingcandidate/root/sourceguard and protectedpromotionworkflowretained. See docs/plans/wp-006-production-activation.md and ownerlog08forcurrentchecks/outcomes;earlierProduction-disabledstatementsarehistoricalforthisapprovedextension. Noagentliveinferenceorfullpackagecompletion.
