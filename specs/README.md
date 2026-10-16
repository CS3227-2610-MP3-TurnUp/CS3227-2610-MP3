# Specifications

Baseline **B1 · 16 October 2026**: agreed product target, with recommendations/open gates labelled. Application implementation and runtime verification are pending.

Read [baseline](baseline.md), [decisions](decisions.md), then the relevant capability and [acceptance scenarios](verification/acceptance-scenarios.md). [Implementation plan](implementation-plan.md) assigns ordered work without changing behaviour.

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

SHR/ORG/PAR/SEC/DEP/DEV preserve historical IDs. **PAR means Student**, not a third role. Each of the 58 IDs has one canonical definition and a verification target. Agreed does not mean implemented or verified. Shared human owners must be assigned before coding.

Update canonical behaviour before implementation; change records link IDs, source/spec revisions, tasks and actual checks. Resolve open gates only for dependent work; record new decisions rather than quietly treating proposals as agreement.
