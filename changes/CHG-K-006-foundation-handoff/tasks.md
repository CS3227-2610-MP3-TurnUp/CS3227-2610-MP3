# CHG-K-006 — Tasks and handoffs

Source: `05e1b42c69ce57d389172a5b0c290d08ff0c729e`, 20 October 2026; Keith owns branch `6-foundation-handoff` and [log 11](../../logs/keith/11-foundation-handoff.md). Exact writer paths, full reading contract and exclusions are in [change.md](change.md).

| Order | Task / actor | Preconditions | Completion target |
| --- | --- | --- | --- |
| 1 | Primary: record assignment, isolate checkout and preserve other work | Keith's CHG-K-006 plan/implementation instruction | Exact base, allowed paths, owner log; DEP02, DEV01–03 |
| 2 | Primary: reconcile current status and write verification runbook | CHG-K-004/005 source and actual GitHub results | Separate historical Production success from missing live evidence; DEP03, T28 portion |
| 3 | Keith: privately configure development, replay/shadow, gate-test and recovery targets; primary validates only assigned non-production access | G08: resource identity, major, separation, allowance and credentials | Pooled/direct/shadow compatibility; no Production data access |
| 4 | Primary: replay, first-to-second migration upgrade, ordinary persistence and dedicated gate integration | Step 3; distinct disposable targets identified before writes | Real SQL/driver/concurrency evidence; DEP01–03, SEC05–06 |
| 5 | Primary: protected Preview create/retry/read → redeploy → read/delete | G08: protected Preview and shared synthetic Preview database; reviewed source | Source/artifact/deployment identities and durable persistence; T15 foundation portion |
| 6 | Primary: restore synthetic recovery fixture on dedicated disposable resource | Actual restore capability/window and exact target verified | Recovered fixture/migration state, observed elapsed time/recovery point; DEP03 |
| 7 | Keith selects model and explicit limits/handling/course facts; primary makes one bounded intended-host SoC attempt, then checks shared denial | G04 and protected Preview; explicit activation, cumulative allowance and concurrency one | Live provider result separate from deterministic failures; DEP04, T14 portion |
| 8 | Primary: remove own synthetic artifacts, disable/retire probe deployments, verify route denial | Track every resource/deployment created by this increment | No active probe-enabled URL or abandoned assigned fixture |
| 9 | Primary: record two independent handoffs and exact remaining gates | Actual checks and cleanup results | Darryl receives database evidence when complete; provider remains pending independently |

If an executable correction becomes necessary, assign its exact paths to one implementation writer before editing. Then use an independent agent that did not author that implementation to review it, correct/disposition findings and recheck material fixes. No executable correction or standalone specification audit is currently assigned.

## Work state

- [x] Source, human owner, isolated branch, single writer and permitted paths recorded.
- [x] Current status/runbook and structural checks complete.
- [x] G08 access, identity/major/region/plan/history and protection facts observed for the assigned non-production targets; broader eligibility/release claims remain gated.
- [x] Development migration initialization, runtime/direct/shadow connection, ordinary persistence and disposable replay/upgrade checked live; 3/3 scratch databases removed.
- [x] Dedicated-branch gate/concurrency integration passed 8/8; branch and private file retired and verified.
- [x] Hosted persistence across requests/redeploy and synthetic recovery checked live.
- [ ] G04 permitted model/limits/handling/course evidence established; bounded hosted SoC checked.
- [x] Probe-enabled deployments, fixtures and temporary credentials retired and verified; disabled Preview retained.
- [x] Foundation → accounts handoff delivered for synthetic non-production integration with actual evidence and limits.
- [x] Provider outcome explicitly retained as incomplete: key permission, provider spacing/remaining allowance, handling and course evidence unavailable; no live inference.

## Current handoff

Primary → Keith, 20 October 2026: an ignored mode-0600 `.env.local` template is prepared in this increment's worktree. Supply pooled development, direct migration and separate disposable shadow URLs privately. Separate gate-test, replay and recovery resources must be identified before those writes; the ordinary development file is not a target for destructive tests/restores. Preview requires its own non-production database and deployment access. No credential value belongs in this record/log or chat. The foundation and provider readiness outcomes are in [verification.md](verification.md).

Keith subsequently supplied the development file and approved non-production browser inspection, then explicitly approved creation/cleanup of `chg-k-006-gate-test` from `turnup-nonprod` / `dev/keith`, its dedicated test database, the temporary Free/Singapore/PostgreSQL-18 `turnup-k006-recovery` project, and the protected Preview verification deployments/probe retirement. Local replay used uniquely named databases on the confirmed development branch and removed all three; no shared gate state was reset.

Independent Implementation Verifier assignment: read-only completed local configuration and operational-command review at base `05e1b42` plus the CHG-K-006 working snapshot. It did not author private TLS normalization, target setup or the runbook. Allowed private files are only this worktree's ignored `.env.local` and `.env.gate.local`; inspect through sanitized validators without printing values. No database writes, provider requests, browser actions or implementation/evidence edits; return findings/checks/limits to the primary, which retains sole record ownership.

Final primary → Darryl handoff is recorded in [verification.md](verification.md#foundation--accounts-handoff): exact prerequisite source, pinned versions/configuration contract, live checks, deployment identities, cleanup and remaining limits. No message or remote issue edit was sent. Independent verifier reported no actionable defects in the initial and Preview configuration reviews; exact reproduced checks and live-evidence limits are in verification. The provider step remains unrun under G04, with the outstanding prerequisites explicitly retained rather than adopting unsupported limits.
