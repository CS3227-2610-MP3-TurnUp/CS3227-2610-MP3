# CHG-D-002 — Signup and login

Status: implementation independently reviewed; assigned development database migrated and authenticated local browser flows verified. Final live concurrency evidence and hosted limits are recorded in verification. Human owner and allocating human: Darryl. Source/spec base: `0c7d5adda285ba07b931d6e1e05ab6a928f2c7e7` (B1/D12/D13), consuming reviewed foundation `05e1b42` and K-006 database handoff. Branch: `codex/wp-002-signup-login`. Increment log: [04-signup-and-login.md](../../logs/darryl/04-signup-and-login.md).

## Assignment and scope

On 20 October 2026 Darryl invoked the feature-iteration skill for WP-002 signup/login and then explicitly approved [plan v1](../../docs/plans/wp-002-signup-login-plan.md) and its defaults with “approved”. The approved plan records exact paths, source/contracts, decisions, scope, tests and exclusions. It confirms this proposed change allocation. Signup/login, necessary logout/expiry, fixed-role session guards and minimal protected destination pages are authorised; profile/credential editing, event features and recovery implementation are excluded.

Requirements: SHR01/02/04/05 and signup portion of SHR09, SEC01/06, DEP02 and DEV01–03. Acceptance targets: signup/guard/session portions of T01/T02/T16/T32 and evidence portions of T28. Complete scenarios and WP-002 remain separate targets. Read the task map, full affected account/privacy/domain contracts and scenarios, plan and foundation→accounts→publication handoffs before consuming this assignment.

Parent owns consolidated plan/specs/records/log. One instructed High-effort worker owns the approved code/schema/test/configuration/README paths. It is the sole account-schema/migration writer in this checkout; Keith remains migration coordinator and receives the sequential contract/migration handoff. No shared/Keith database is modified. A non-author implementation verifier reviews the completed integrated change and reproduces relevant checks. Existing agent/skill customisations are excluded and preserved.

## Decisions, limits and tracking

Darryl's approval resolves G01 only for signup/login/session behaviour specified in the plan. G02 records his no-recovery position for this slice; joint MVP policy is still open. Credential-change/profile policies remain deferred. Database-backed opaque sessions, built-in async scrypt and no new runtime authentication dependency are selected technical design choices. Detailed decisions are maintained in the canonical account policy and `specs/decisions.md`.

Database foundation evidence is delivered. This checkout initially lacks installed dependencies and Darryl's identified synthetic database configuration. Install pinned frozen dependencies; deterministic, build, browser and live SQL evidence must be distinguished. Unavailable tests remain not run. No hosted release evidence is implied.

Related overview: [accounts issue #7](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/issues/7). Decision-to-issue reconciliation is pending Darryl's authorised remote delivery: reflect adopted signup/login policy and partial scope, preserve prior evidence and deferred credential/profile/joint recovery work. No issue/PR mutation or read-back has occurred. Latest reconciled specs are the dated 20 October 2026 working snapshot on the above source base.

No commit, push, remote issue/PR mutation, provisioning, merge, deployment, Production access or shared-database migration is authorised. Completion describes scoped implementation/evidence, not human GitHub review or release administration. See [tasks](tasks.md) and [verification](verification.md).

20 October 2026 UI refinement: Darryl approved the proposed simpler signup layout with “do it”. The original implementer updated only the shared auth form and auth CSS; account fields/rules and server/database contracts remain unchanged. Visible native role choices, concise hints, quiet pre-submit recovery disclosure and password Show/Hide replace the prior presentation. Login shares consistent controls. Actual browser/check/non-author review evidence is appended to verification.

20 October2026 delivery authorisation: Darryl requested local preview/WP-002 branch rename and logical commits of the combined WP-002 changes. Earlier no-commit boundaries are superseded only for that local delivery. Push/remote mutation/deployment remain outside scope; historical source/branch statements above are preserved as provenance.
