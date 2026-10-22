# Implementation plan and ownership

Status updated 20 October 2026: WP-001 foundation and hosting/provider boundary are implemented in CHG-K-004/005; the existing Production workflow succeeded at `05e1b42`. [CHG-K-006](../changes/CHG-K-006-foundation-handoff/verification.md) records passed live database/persistence/recovery evidence and the separate incomplete provider handoff. WP-002 accounts are integrated at5402461; original Organiser-only WP-003 is implemented locally in [CHG-K-009](../changes/CHG-K-009-wp-003-publication/verification.md), with hosted migration and consumer checks pending. WP-004/006/007 remain planned. The local WP-005 extraction-integration slice is implemented under [CHG-K-010](../changes/CHG-K-010-wp-005-proposal-integration/verification.md); full WP-005/public drafting and hosted inference remain incomplete. Source/spec baseline: B1, 16 October 2026, with [D12 ownership](decisions.md), 17 October 2026. The 58 canonical requirements and 32 planned scenarios are unchanged; documents alone establish no runtime result. Repository setup remains recorded in [CHG-K-000](../changes/CHG-K-000-sdd-repository-setup/change.md).

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

Planning detail originated 17 October 2026 against Git revision `f8804f0` and D12. Package rows add no requirements and reserve no change IDs; current evidence is linked from assigned change/package records. Each row is a candidate bounded assignment, not necessarily a separate PR. Allocate changes only when actual work is assigned under [change allocation rules](../changes/README.md).

Paths identify existing responsibility areas for future work, not executable filenames or API definitions. Before dispatch, each change must name exact files, its active writers, reviewer and prerequisite revisions. Shared `src/app/api/`, `src/components/`, schema/migration files, fixtures and multi-contract documents require explicit file-level allocation; directory ownership alone does not permit concurrent edits.

Keith selected the [CLI deployment route](../changes/CHG-K-002-wp-001-foundation-design/design.md#selected-cli-deployment-route) on 18 October 2026 under G08. Future automation/deployment assignments follow that design and the full [foundation and release handoffs](integration-handoffs.md): preserve the source revision, build-artifact identity, environment/target, deployment URL, required-check results and migration/recovery evidence without credentials. The selected method changes no product requirement or human ownership; execution authority comes from each assigned change.

Keith also selected the [foundation stack and Neon development/production design](../changes/CHG-K-002-wp-001-foundation-design/design.md#selected-application-foundation) on 18 October 2026. Future assignments implement that version/migration/connection policy, validate exact patches and actual provider capabilities, and preserve synthetic-only non-production separation from independent production resources. CHG-K-004/005 record local runtime checks; CHG-K-006 records the successful Production workflow separately from passed non-production resource/isolation, runtime persistence and replay/recovery checks. Broader eligibility and provider evidence remain open. Optional and feature-specific choices outside that design remain open.

## Start readiness and remaining assignments

- Keith's active increment is [CHG-K-006](../changes/CHG-K-006-foundation-handoff/change.md), completing the foundation handoff from reviewed CHG-K-004/005 at `05e1b42`. Its isolated worktree and single-writer scope preserve unrelated work.
- The Production workflow has succeeded through required checks, build, migration status, candidate verification and promotion. CHG-K-006 also records passed development direct/pooled/shadow compatibility, replay/upgrade, gate integration, protected Preview persistence across redeployment, synthetic restore and cleanup. Broader G08 eligibility/release portions remain open.
- Foundation → accounts and provider → AI consumers are separate handoffs. Unresolved SoC permissions/limits/handling do not block the delivered database handoff for synthetic non-production accounts integration. No product workflow or complete T14/T15/T28 is established.
- Darryl approved the bounded [CHG-D-002 signup/login plan](../docs/plans/wp-002-signup-login-plan.md) on 20 October 2026 against the delivered foundation/database handoff. Scoped G01 policy is canonical; local implementation/review/checks are recorded in [verification](../changes/CHG-D-002-signup-login/verification.md). The assigned dev/darryl migration and authenticated browser flows now have evidence; SQL/concurrency outcomes and hosted limits remain explicit in that record. Credential/profile policy is now accepted under [CHG-D-003](../changes/CHG-D-003-credentials-profile/change.md), with implementation pending; joint G02 remains open; this does not complete WP-002 or supply the complete accounts → publication integration evidence.
- For every later slice, select only its affected requirements/scenarios, record prerequisite change IDs/revisions and exact writers in `tasks.md`, and preserve checks not yet run in `verification.md`.
- Product schemas, endpoint names, function signatures and feature filenames are not settled by directory placeholders; actual foundation commands/configuration are documented in README and the CHG-K-006 runbook. Follow the selected foundation design for library/version policy; lock exact patches and record remaining feature-specific choices and numeric limits in their assigned changes. Do not fill gaps with guessed product policy or claim external validation.
- D12 identifies the human PR reviewers. Keith's 17 October 2026 workflow instruction places human review on GitHub PRs and removes duplicate repository sign-off/completion gates; independent agent findings and rechecks remain in the member log/change verification. ID-allocation and change-status suggestions beyond this explicit convention remain unadopted.
- Keith's 18 October 2026 clarification narrows agent review to the completed implementation change (including executable configuration and agent/workflow instructions), followed by final GitHub review after an authorised push. Standalone specification audits require explicit assignment. Agents do not assess human reviewer assignment, independence, approval, sign-off or merge readiness from any source. Keep concise agent evidence in verification.md; evidence/log-only updates do not restart review. Historical reviews retain their original scope. This changes development workflow, not product ownership, accepted decisions or application approval/access behaviour.

## Decision gates

Use [decisions.md](decisions.md) for authority and unresolved questions. An unresolved choice blocks its dependent behaviour, not all unrelated work.

- G01/G02, before account implementation/release: settle session expiry, credential-change reauthentication/revocation, username/password bounds and authentication component. Record the recovery decision; do not introduce mandatory email or contact collection silently.
- G03/G05, before dependent form/event validation: settle bounded fields/question counts and unusual schedule/post-start cases. Existing accepted join/cancel/capacity rules remain the baseline.
- G04, before PDF/AI implementation: verify deployed upload/parser/text/token/time limits, SoC model/connectivity/quotas, bounded retries and provider handling. Recommended numeric limits remain proposals until validated/adopted.
- G07, before emergency withdrawal behaviour is complete: resolve treatment of sensitive stored private replies and derived caches; preserve the accepted stop on new public reads/chat/joining.
- G06, before cleanup/release: define draft inactivity and advance notice, deletion/anonymisation relationships, derived copies and backup expiry. Accepted 30-day/90-day retention defaults do not specify those mechanics.
- G08, before each shared implementation task: use the D12 contract leads above and record the change's primary human owner, reviewer, allowed paths and dependency contract. Ownership, the linked foundation/Neon design and CLI deployment method are settled; per-change assignments remain necessary. Validate patches, database/driver/connection/migration compatibility and recovery; resolve remaining feature-specific choices, deployment access/eligibility, provider allowances and authoritative course constraints before dependent work/compliance claims. Implement and verify the selected automation separately.

20 October2026 follow-up: [CHG-D-003](../changes/CHG-D-003-credentials-profile/change.md) implements the approved credential/profile slice locally, including Darryl’s password-only re-login amendment. See exact independent/unit/SQL/browser evidence and limitations in its verification; full WP-002/T20/hosted acceptance remains separate.

## WP-003 local handoff — 21 October 2026

Keith selected the original Organiser-only package and accepted its event-bound/timing portions of G03/G05 in CHG-K-009. [Canonical rules](shared/domain-and-data-contracts.md#accepted-wp-003-bounds-and-timing--21-october-2026), [exact implementation plan](../docs/plans/wp-003-publication-plan.md) and [evidence](../changes/CHG-K-009-wp-003-publication/verification.md) distinguish local code from unrun hosted migration/concurrency/consumer checks. Student discovery/details remain WP-004; no ownership transfer. All registration, configurable forms, roster and AI remain outside this delivery. The empty versioned form/public reader are prerequisites for those future consumers, not completed Student flows.
