# Specifications

Baseline **B1 · 16 October 2026**, with the **17 October 2026 ownership update D12**: agreed product target, with recommendations/open gates labelled. Application implementation and runtime verification are pending.

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
