# Implementation plan and ownership

Status: planned application work; repository setup is recorded separately in [CHG-K-000](../changes/CHG-K-000-sdd-repository-setup/change.md). Source/spec snapshot: B1, 16 October 2026, with the human-approved ownership allocation recorded on 17 October 2026 as [D12](decisions.md). The 58 canonical requirements and 32 planned scenarios are unchanged. No application behaviour is implemented or runtime-verified by these documents.

Read [baseline.md](baseline.md), [decisions.md](decisions.md), and [acceptance scenarios](verification/acceptance-scenarios.md) before assigning work. Roadmap labels `WP-001`–`WP-007` describe work packages and reserve no change IDs or directories. When assigned, map each scoped slice to an allocated `CHG-K-NNN` or `CHG-D-NNN` record under the [change naming rules](../changes/README.md). A work package may span multiple changes. The roadmap authorises no implementation by itself.

## Human ownership

Keith (`K`) owns Organiser workflows; Darryl (`D`) owns Student workflows. The human-approved allocation below also assigns shared-contract leads and Keith as WP-001 lead. Prefixes identify humans. Each change has one primary human owner and an affected-member reviewer.

| Area | Primary owner | Scope and reviewer |
| --- | --- | --- |
| Organiser workflows | Keith | Own-event interface, server operations, proposal assistance, publication, custom form configuration, roster, private inbox/replies and their tests. Darryl reviews affected shared contracts. |
| Student workflows | Darryl | Discovery, optional profile, registration/submission, My Events, grounded FAQ, escalation, private reply viewing and their tests. Keith reviews affected shared contracts. |
| Shared work | Named lead in the contract table below | Both contribute; the other member reviews before dependent implementation. Each change records exact file writers and handoffs. |

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

IDs are existing baseline families; `PAR` denotes Student requirements for historical traceability. Link exact requirements and scenario IDs in each future change rather than assigning an entire role as one unbounded agent task.

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-001: application foundation and hosting feasibility | Keith leads; Darryl reviews | Initialise the selected Next.js/TypeScript stack, database/migration approach, isolated configuration, hosted execution and server-side SoC connectivity. DEP01–DEP04, SEC06; DEV01–DEV03 throughout. | Resolve only required library/provider choices first. Record actual hosted connectivity and free-tier constraints; no secrets in browser/repository. A feasibility check does not demonstrate the complete application. |
| WP-002: fixed-role accounts and optional profile | Darryl leads, including profile integration; Keith reviews | Signup/login/logout, stable identity, credential changes, role guards and optional Student Name/Phone. SHR01–SHR05, SHR08–SHR09, SEC06–SEC07. | WP-001; decide session/credential rules before coding them. Direct API tests enforce fixed roles and ownership; empty optional profile does not block registration. |
| WP-003: manual event preparation and publication | Keith leads; Darryl reviews public contract | Own-event dashboard/search/sort, save incomplete drafts, manual completion, exact preview/approval, replacement revisions, withdrawal, cancellation, draft deletion and cancel-editing. ORG01–ORG02, ORG08–ORG13, ORG18; SHR05–SHR08, SEC01–SEC03. | WP-002 and publication contract. Begin with a valid zero-question form; WP-004 adds configurable questions. A complete manual event publishes with zero AI calls; stale approval fails and private edits do not change the live revision. |
| WP-004: Student discovery and transactional registration | Darryl owns Student flow and registration contract; Keith owns Organiser form/roster flow; cross-review affected contracts | Approved event discovery/details, versioned custom forms, atomic join/cancel/rejoin, submission correction, My Events, capacity updates and owner roster. PAR01–PAR05, PAR13–PAR15; ORG14, ORG19–ORG20; SHR06–SHR08, SEC07. | WP-003 public contract; agree form limits and relevant schedule rules. Last-place race has one winner; retries use no extra seats; private snapshots and historical form wording remain intact. |
| WP-005: temporary proposal assistance | Keith leads; Darryl reviews exclusion boundary | Temporary server-side PDF extraction, partial fields, bounded clarification, supported Other suggestions, private drafts/evidence and stale-result protection. ORG03–ORG08, ORG18; SEC01–SEC06. | WP-003 manual path and verified PDF/model budgets. No original PDF/full raw extraction persists; malformed inputs fail safely and manual publishing remains available. |
| WP-006: grounded FAQ and private organiser replies | Darryl owns FAQ/escalation/reply viewing and thread contract; Keith owns inbox/replying and AI-provider contract; cross-review affected contracts | Current-public-source answers, evidence checks, ambiguity/partial/unanswered handling, committed forwarding, idempotent private threads, failure fallback and explicit public reuse of replies. PAR06–PAR12; ORG15–ORG17; SEC01–SEC03, SEC05–SEC07. | WP-002 and WP-003 publication contract; agree source/thread contracts and provider budgets. Private material never enters Student model context; sent status follows commit; source withdrawal/replacement invalidates stale output. Does not depend on WP-005. |
| WP-007: retention, integrated security and release evidence | Keith leads retention/deployment/release integration; Darryl reviews; both provide role evidence and cross-review authored work | Cleanup/anonymisation, derived-copy handling, adversarial/benign fixtures, role integration, hosted demonstration, migration/rollback and contribution evidence. SEC01–SEC07, DEP01–DEP04, DEV01–DEV03; affected role requirements. | Relevant feature packages and final cleanup decisions. Record deterministic and controlled live-model evidence separately; verify the hosted workflow without a developer laptop. |

Keith leads WP-001 first, then hands the foundation to Darryl for WP-002 accounts; Keith leads WP-003 publication after its account/role-guard dependencies are available. Darryl may resolve account decisions and design Student contracts during WP-001, while dependent implementation waits for the required foundation. Each handoff records actual checks and remaining gates.

After WP-003, WP-004, WP-005 and WP-006 may proceed concurrently where files are disjoint and shared contracts are agreed. Merge schema/service changes sequentially through their named contract owner. Retention design and security fixtures can begin earlier; final feature/release evidence depends on the implemented flows.

| Package | Planned acceptance targets in [acceptance-scenarios.md](verification/acceptance-scenarios.md) |
| --- | --- |
| WP-001 | T15/T28 foundations; complete workflow evidence follows feature integration |
| WP-002 | T01/T02/T16/T32; profile-snapshot integration T20 with WP-004 |
| WP-003 | T05–07/T22–25/T29; chat/registration-dependent portions with their packages |
| WP-004 | T08/T17–21/T23/T24/T30; optional-profile integration T16/T20 |
| WP-005 | T03–05/T13/T14/T22/T26 |
| WP-006 | T02/T06/T09–14/T18/T27/T31 |
| WP-007 | T13–15/T26–28 and regression evidence for the other targets |

All T01–T32 have a planned package. Shared scenarios may span packages; partial foundation evidence does not mark the complete scenario passed. Each future change must record exact implemented portions and actual results.

## Decision gates

Use [decisions.md](decisions.md) for authority and unresolved questions. An unresolved choice blocks its dependent behaviour, not all unrelated work.

- G01/G02, before account implementation/release: settle session expiry, credential-change reauthentication/revocation, username/password bounds and authentication component. Record the recovery decision; do not introduce mandatory email or contact collection silently.
- G03/G05, before dependent form/event validation: settle bounded fields/question counts and unusual schedule/post-start cases. Existing accepted join/cancel/capacity rules remain the baseline.
- G04, before PDF/AI implementation: verify deployed upload/parser/text/token/time limits, SoC model/connectivity/quotas, bounded retries and provider handling. Recommended numeric limits remain proposals until validated/adopted.
- G07, before emergency withdrawal behaviour is complete: resolve treatment of sensitive stored private replies and derived caches; preserve the accepted stop on new public reads/chat/joining.
- G06, before cleanup/release: define draft inactivity and advance notice, deletion/anonymisation relationships, derived copies and backup expiry. Accepted 30-day/90-day retention defaults do not specify those mechanics.
- G08, before each shared implementation task: use the D12 contract leads above and record the change's primary human owner, reviewer, allowed paths and dependency contract. Ownership is settled; per-change assignments remain necessary. Resolve relevant library/database/deployment choices, provider allowances and authoritative course constraints before dependent work/compliance claims.

## Agent assignments and evidence

| Specialist | When used | Bounded output and handoff |
| --- | --- | --- |
| SDD Coordinator / Project Manager | Before work and at dependent handoffs | Assignment plan, single writers/reviewers, source/spec revision, requirement/scenario IDs, paths, dependencies and actual status/evidence. |
| Requirements Analyst | Before a new or changed behaviour | Reconciled affected specs, explicit open decisions and observable acceptance scenarios. Avoid rewriting unrelated role scope. |
| Repository Workflow Builder | After the file-level scope is assigned | Agreed repository/process artifacts. The setup definition is not blanket authority to implement application features; future implementation assignments identify the needed implementer and skills. |
| Independent Specification Reviewer | After authorship and after material corrections | Read-only contradiction/privacy/traceability audit, file/ID-specific findings and rechecks; no claim to independently review own authored work. |

The current setup activated all four specialists. The Builder and Analyst authored disjoint outputs; Coordinator received sequential ownership of this plan and setup tasks/evidence; the parent agent integrates their staged files. Independent review follows authorship. Record actual findings and check results in [setup verification](../changes/CHG-K-000-sdd-repository-setup/verification.md).

For application work, each change records what was specified, implemented and actually verified. Keep deterministic tests, concurrent database checks, browser tests, hosted checks and controlled SoC evaluations distinct. Never mark a scenario passed from a document or placeholder alone.
