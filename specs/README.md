# Specifications

Baseline **B1 · 16 October 2026**, with the **17 October 2026 ownership update D12**: agreed product target, with recommendations/open gates labelled. WP-001 foundation/workflow implementation and a successful Production deployment have scoped evidence; [CHG-K-006](../changes/CHG-K-006-foundation-handoff/verification.md) records database handoff evidence and remaining provider prerequisites. [CHG-D-002](../changes/CHG-D-002-signup-login/verification.md) records local signup/login implementation, independent review and deterministic/browser checks; assigned-development migration and authenticated browser success are recorded, with live concurrency and hosted limits explicit. [CHG-D-003](../changes/CHG-D-003-credentials-profile/verification.md) records locally implemented credential changes and optional Student profile, including password-only re-login, independent review and scoped SQL/browser evidence. [CHG-K-009](../changes/CHG-K-009-wp-003-publication/verification.md) records the original Organiser-only WP-003 local implementation and scoped checks; hosted event migration and consumer integration remain pending. [CHG-K-010](../changes/CHG-K-010-wp-005-proposal-integration/verification.md) records the local WP-005 extraction-integration slice in the current event editor, with private page-local findings, Generate-to-prefill fields and inline source evidence; public drafting and hosted inference remain deferred. [CHG-K-011](../changes/CHG-K-011-wp-005-clarification/verification.md) records local synthetic clarification persistence, explicit organiser resolution and server preview/publication guards, with production retention/hosted activation still deferred. [CHG-K-012](../changes/CHG-K-012-wp-005-public-candidates/handoff.md) adds local synthetic FAQ/Other candidates from saved public fields, optional organiser answers and explicit Other-only Apply; the duplicate description suggestion is removed. Comprehensive model evaluation and hosted activation remain deferred. [CHG-D-007](../changes/CHG-D-007-student-discovery-registration/verification.md) now records local Student discovery/current-details implementation and main-agent checks against merged WP-003; registration, live capacity/own state and the remaining WP-004 slices still await producer/shared-contract/database handoffs. Other product features remain unimplemented; complete acceptance scenarios have not passed.


Read [baseline](baseline.md), complete relevant [decisions/gates](decisions.md), then the affected contracts/capabilities and full [acceptance scenarios](verification/acceptance-scenarios.md). Use the task reading map below. [Implementation plan](implementation-plan.md) assigns ordered work without changing behaviour.

| Canonical document | Requirement IDs / scope |
| --- | --- |
| [Accounts and access](shared/accounts-and-access.md) | SHR01–05/09; fixed roles, private profiles |
| [Domain contracts](shared/domain-and-data-contracts.md) | SHR06–08; fields, states, versions, forms, transactions |
| [AI and privacy](shared/ai-and-privacy.md) | SEC01–07; evidence and source boundaries |
| [Deployment and retention](shared/deployment-and-retention.md) | DEP01–04, DEV01–03; operating constraints |
| [Event management](organiser/event-management.md) | ORG01–02/08–13/18 |
| [Proposal assistance](organiser/proposal-assistant.md) | ORG03–07 |
| [Forms and inbox](organiser/registration-forms-and-inbox.md) | ORG14–17/19–20 |
| [Discovery and registration](student/discovery-and-registration.md) | PAR01–05/13–15 |
| [FAQ and private questions](student/faq-and-private-questions.md) | PAR06–12 |

SHR/ORG/PAR/SEC/DEP/DEV preserve historical IDs. **PAR means Student**, not a third role. Each of the 58 IDs has one canonical definition and a verification target. Agreed does not mean implemented or verified. Shared human leads are assigned in the implementation plan; exact file writers, reviewers and dependencies must be recorded per change before coding.

Update canonical behaviour before implementation; change records link IDs, source/spec revisions, tasks and actual checks. Resolve open gates only for dependent work; record new decisions rather than quietly treating proposals as agreement.

For UI work, also read the [shared visual guidelines](../docs/ui-guidelines.md) and the relevant [screen pattern](../docs/ui-screen-patterns.md). They define TurnUp's presentation while preserving these behavioural contracts; unrelated work need not load them.

## Task reading map

This routes reading to full authoritative content, not replacement summaries. For application work always read **Accounts and access** and **AI and privacy** above, including their permission/data boundaries, plus the following affected documents. The package plans carry unchanged scope, slices and scenario targets; read the complete applicable scenarios and coverage/evaluation guidance. A gate list is a starting point: follow dependencies and any gate cited by the affected requirement. Never treat omitted documents as out of scope when their contracts are consumed or changed.

| Assigned work / detailed plan | Additional shared specs | Role specs | Gates to inspect |
| --- | --- | --- | --- |
| [WP-001: foundation](work-packages/wp-001-foundation.md) | Deployment and retention | Affected cross-role requirements for feasibility | G04/G08 |
| [WP-002: accounts](work-packages/wp-002-accounts.md) | Domain contracts when identity/submission relationships are affected | Discovery and registration for profile integration | G01/G02/G08 |
| [WP-003: publication](work-packages/wp-003-publication.md) | Domain contracts; Deployment and retention for lifecycle/history effects | Event management; Forms and inbox for published forms | G03/G05/G07/G08 |
| [WP-004: registration](work-packages/wp-004-registration.md) | Domain contracts; Deployment and retention for retained submissions | Discovery and registration; Event management; Forms and inbox | G03/G05/G08 |
| [WP-005: proposal assistance](work-packages/wp-005-proposal-assistance.md) | Domain contracts; Deployment and retention | Proposal assistance; Event management | G03/G04/G06/G08 |
| [WP-006: FAQ/inbox](work-packages/wp-006-faq-and-inbox.md) | Domain contracts; Deployment and retention; publication lifecycle rules | FAQ and private questions; Forms and inbox; Event management | G03/G04/G07/G08 |
| [WP-007: cleanup/release](work-packages/wp-007-release.md) | All affected shared contracts | Both roles' affected workflows | G04/G06/G07/G08 and outstanding feature gates |

For coordination read the main plan's ownership/common rules and the affected [integration handoffs](integration-handoffs.md); coordinators and cross-package reviewers read the full handoff guide. A broad baseline/security audit reads the whole affected specification set, not just one map row. For documentation-only work read the reviewed artifacts and their authoritative sources; no unrelated application package needs to be loaded.

In each assignment/handoff list the source revision, document sections, full requirement/scenario IDs and dependency contracts to read. Do not copy their prose into another maintained summary. Read additional context whenever a reference, unresolved choice, changed revision or review finding requires it. If already read at the same revision, reuse that context rather than repeatedly loading it.

Historical setup records, the initial conversation reference and prior member logs remain available for evidence/provenance review. They are not routinely required for feature implementation. When updating a member log, inspect the correct increment and preserve earlier entries under the member log policy.

D007 completion update (22 October2026): approved Student registration/correction/My Events and assigned shared schema/publisher capacity/form integration now have local implementation/main-agent checks. See D007 verification for exact results. Shared Neon application, signed-in hosted UI walkthrough and Keith's builder/roster integration remain pending; full WP004 is partial. Earlier discovery-only status is a historical checkpoint, not the current implementation boundary.
