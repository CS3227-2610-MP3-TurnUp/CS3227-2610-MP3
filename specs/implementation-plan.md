# Implementation plan and ownership

Status: planned application work; repository setup is recorded separately in [CHG-K-000](../changes/CHG-K-000-sdd-repository-setup/change.md). Source/spec snapshot: B1, 16 October 2026, with the human-approved ownership allocation recorded on 17 October 2026 as [D12](decisions.md). The 58 canonical requirements and 32 planned scenarios are unchanged. No application behaviour is implemented or runtime-verified by these documents.

Before assigning work, read [baseline.md](baseline.md), relevant [decisions](decisions.md), and complete applicable [acceptance scenarios](verification/acceptance-scenarios.md), following the [task reading map](README.md#task-reading-map). Roadmap labels `WP-001`–`WP-007` describe work packages and reserve no change IDs or directories. When assigned, map each scoped slice to an allocated `CHG-K-NNN` or `CHG-D-NNN` record under the [change naming rules](../changes/README.md). A work package may span multiple changes. The roadmap authorises no implementation by itself.

## Human ownership

Keith (`K`) owns Organiser workflows; Darryl (`D`) owns Student workflows. The human-approved allocation below also assigns shared-contract leads and Keith as WP-001 lead. Prefixes identify humans. Each change has one primary human owner and an affected-member PR reviewer. Human-review evidence and approval live on the GitHub PR under the [review policy](../CONTRIBUTING.md#review-records), without a separate local sign-off or completion gate.

| Area | Primary owner | Scope and reviewer |
| --- | --- | --- |
| Organiser workflows | Keith | Own-event interface, server operations, proposal assistance, publication, custom form configuration, roster, private inbox/replies and their tests. Darryl reviews affected shared contracts. |
| Student workflows | Darryl | Discovery, optional profile, registration/submission, My Events, grounded FAQ, escalation, private reply viewing and their tests. Keith reviews affected shared contracts. |
| Shared work | Named lead in the contract table below | Both contribute; agree shared contract details before dependent implementation. The other member reviews on the GitHub PR. Each change records exact file writers and handoffs. |

Fixed roles have distinct permissions in one Next.js/TypeScript application. Complete role ownership includes each role's server behaviour and tests; common identity, publication, registration and question contracts remain authoritative shared services.

| Shared contract | Primary owner | Required consumer/reviewer |
| --- | --- | --- |
| Accounts, fixed-role guards and sessions | Darryl | Keith; both roles consume the contract |
| Event states, public revision approval and invalidation | Keith | Darryl; both roles consume the contract |
| Form schema, submission versions, idempotency and capacity | Darryl | Keith; Organiser forms/roster and Student registration consume the contract |
| Chat source/evidence and private thread delivery | Darryl | Keith; Student questions and Organiser inbox/replies consume the contract |
| AI budgets, provider calls and private/public context separation | Keith | Darryl; both AI workflows consume the contract |
| Database migrations, retention, deployment and release checks | Keith | Darryl; both workflows supply requirements and evidence |

Shared-contract ownership covers definition and integration; each member still implements their complete role workflow, including server behaviour and tests. Keith implements Organiser form configuration/roster against Darryl's form contract; Darryl implements Student chat against Keith's AI-provider contract. Unresolved product policies, including G05–G07, still require the affected humans' decisions.

Keith coordinates migration files and database integration. Darryl supplies account, registration and thread data requirements; changes to shared schema/migration files use one active writer and a sequential handoff. Documents covering multiple contracts likewise need one assigned file writer per change; section ownership does not permit simultaneous edits to the same file.

## Dependency-ordered work packages

Read only the assigned package's full plan plus the shared contracts and applicable scenarios selected by the [task reading map](README.md#task-reading-map). Expand to affected producers/consumers whenever scope crosses packages; the map is a starting point, not a permission or requirement boundary.

| Package | Detailed scope, slices, dependencies and acceptance targets |
| --- | --- |
| [WP-001](work-packages/wp-001-foundation.md) | Application foundation and hosting feasibility |
| [WP-002](work-packages/wp-002-accounts.md) | Fixed-role accounts and optional profile |
| [WP-003](work-packages/wp-003-publication.md) | Manual event preparation and publication |
| [WP-004](work-packages/wp-004-registration.md) | Student discovery and transactional registration |
| [WP-005](work-packages/wp-005-proposal-assistance.md) | Temporary proposal assistance |
| [WP-006](work-packages/wp-006-faq-and-inbox.md) | Grounded FAQ and private Organiser replies |
| [WP-007](work-packages/wp-007-release.md) | Retention, integrated security and release evidence |

Keith leads WP-001 first, then hands the foundation to Darryl for WP-002 accounts; Keith leads WP-003 publication after its account/role-guard dependencies are available. Darryl may resolve account decisions and design Student contracts during WP-001, while dependent implementation waits for the required foundation. Each handoff records actual checks and remaining gates.

After WP-003, WP-004, WP-005 and WP-006 may proceed concurrently where files are disjoint and shared contracts are agreed. Merge schema/service changes sequentially through their named contract owner. Retention design and security fixtures can begin earlier; final feature/release evidence depends on the implemented flows.

All T01-T32 have a planned package; their original package mappings are preserved in the linked plans. Shared scenarios may span packages; partial foundation evidence does not mark the complete scenario passed. Each future change must record exact implemented portions and actual results.

## Integration checkpoints and independent preparation

The complete six handoffs, independent preparation and specialist/evidence responsibilities are in [integration-handoffs.md](integration-handoffs.md). Read the affected handoff before producing or consuming a prerequisite. Coordinators and cross-package reviewers read the full guide.

## Common planning rules

Planning detail added 17 October 2026 against Git revision `f8804f0` and D12. The linked package documents break down the existing packages; they add no requirements, reserve no change IDs and report no implementation progress. Each row is a candidate bounded assignment, not necessarily a separate PR. Allocate changes only when actual work is assigned under [change allocation rules](../changes/README.md).

Paths identify existing responsibility areas for future work, not executable filenames or API definitions. Before dispatch, each change must name exact files, its active writers, reviewer and prerequisite revisions. Shared `src/app/api/`, `src/components/`, schema/migration files, fixtures and multi-contract documents require explicit file-level allocation; directory ownership alone does not permit concurrent edits.

## Start readiness and remaining assignments

- This documentation assignment fills planning detail only; it does not start application implementation, install dependencies or allocate future application changes. This document still reports planned work.
- Keith's first implementation assignment is a bounded WP-001 foundation slice. Before execution, confirm its allocated change ID, exact files, integration base, reviewer, increment/log and the relevant G08 choices.
- Darryl can prepare G01/G02 account decisions and the account contract while WP-001 proceeds. Recommendations remain proposed until the required human decisions are recorded; account implementation waits for its required foundation handoff.
- For every later slice, select only its affected requirements/scenarios, record prerequisite change IDs/revisions and exact writers in `tasks.md`, and preserve checks not yet run in `verification.md`.
- Physical schemas, endpoint names, function signatures, precise new filenames, library versions, numeric limits and executable commands are not settled by directory placeholders. Record them in the assigned change/design once selected; do not fill them with guessed product policy or claim external validation.
- D12 identifies the human PR reviewers. Keith's 17 October 2026 workflow instruction places human review on GitHub PRs and removes duplicate repository sign-off/completion gates; independent agent findings and rechecks remain in the member log/change verification. ID-allocation and change-status suggestions beyond this explicit convention remain unadopted.

## Decision gates

Use [decisions.md](decisions.md) for authority and unresolved questions. An unresolved choice blocks its dependent behaviour, not all unrelated work.

- G01/G02, before account implementation/release: settle session expiry, credential-change reauthentication/revocation, username/password bounds and authentication component. Record the recovery decision; do not introduce mandatory email or contact collection silently.
- G03/G05, before dependent form/event validation: settle bounded fields/question counts and unusual schedule/post-start cases. Existing accepted join/cancel/capacity rules remain the baseline.
- G04, before PDF/AI implementation: verify deployed upload/parser/text/token/time limits, SoC model/connectivity/quotas, bounded retries and provider handling. Recommended numeric limits remain proposals until validated/adopted.
- G07, before emergency withdrawal behaviour is complete: resolve treatment of sensitive stored private replies and derived caches; preserve the accepted stop on new public reads/chat/joining.
- G06, before cleanup/release: define draft inactivity and advance notice, deletion/anonymisation relationships, derived copies and backup expiry. Accepted 30-day/90-day retention defaults do not specify those mechanics.
- G08, before each shared implementation task: use the D12 contract leads above and record the change's primary human owner, reviewer, allowed paths and dependency contract. Ownership is settled; per-change assignments remain necessary. Resolve relevant library/database/deployment choices, provider allowances and authoritative course constraints before dependent work/compliance claims.
