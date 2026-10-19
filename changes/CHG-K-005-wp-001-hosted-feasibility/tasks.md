# CHG-K-005 — Tasks and handoffs

Source and prerequisite: reviewed CHG-K-004 commit `7d4d1b983c4104f758c476fc345c7de20efb1f58`, B1/D12/D13, 18 October 2026. Keith owns branch `6-hosted-feasibility` and [07-wp-001-hosted-feasibility.md](../../logs/keith/07-wp-001-hosted-feasibility.md). Read set and exact single-writer paths are in [change.md](change.md).

| Order | Output | Sole writer / actor | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 1 | Scope, source handoff, record and log | Coordinator | CHG-K-004 reviewed commit and selected CHG-K-002 design | DEP01–04, SEC05–06, DEV01–03; T13/T14/T15/T28 portions |
| 2 | Actions/CLI workflow, bounded SoC adapter, protected-preview probe and setup guide in change.md paths | Hosting & SoC Engineer | Foundation source and current official provider constraints; no live access yet | Deterministic failure and security checks; build/workflow checks |
| 3 | `.env.example` placeholders and `vitest.config.ts` default hosted/AI test discovery | Foundation Engineer only after exact sequential handoffs | Hosting engineer request for placeholders; coordinator's default-test discovery finding; no concurrent edits | Reproducible configuration and 27-test default-suite handoff |
| 4 | Bounded live feasibility when access is configured | Hosting & SoC Engineer | Authorized synthetic resources, protected preview, selected key-visible model/limits | Exact deployed revision, target/URL, persistence and SoC results or unrun reason |
| 5 | Independent implementation review and material-fix recheck | Implementation Verifier, read-only; authors fix | Completed scoped source and actual checks | Findings/checks/revision/limits in verification.md |

No secrets, production private data, public anonymous provider proxy, account/event feature implementation or unsupported acceptance claim. The hosting engineer is not alone in the codebase: preserve other work and request any out-of-scope/shared file before editing. Coordinator writes records/logs. Independent verifier has no implementation authorship.

## Work state

- [x] Foundation revision, change ID, writers, files, IDs and preconditions recorded.
- [x] Hosted workflow/adapter/probe/guide implemented and local checks recorded in verification.md.
- [x] Live checks explicitly recorded as unrun for missing account, project, database, key and permitted-model prerequisites.
- [x] Independent review, four material fixes and recheck recorded in verification.md.

## 19 October 2026 review correction

| Order | Output | Sole writer / actor | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 6 | Durable Neon reservation/release schema, helper, tests and example limit names | Application Foundation Engineer | Source `7d31df6`; SEC05 and selected CHG-K-002 design | Atomic multi-instance attempt, concurrency, interval and aggregate token admission; fail-closed database behavior |
| 7 | Probe limit parsing, route integration, route tests and setup/recovery guide | Hosting & SoC Engineer | Foundation helper interface handoff | No provider fetch on rejection; conservative uncertain-outcome slot handling; no public reset |
| 8 | Integrated checks, independent agent verification and corrections | Coordinator, then Implementation Verifier | Completed single-writer outputs | Exact results, findings and limits in verification.md |
| 9 | Update hosted PR #18 | Delivery Agent | Reviewed implementation and verification evidence | Work branch push/PR update only; no merge or deployment branch push |

- [x] Gate and hosting integration complete, including durable strictest-limit policy and isolated gate database test.
- [x] Integrated checks and independent verification recorded in verification.md.
- [x] PR #18 updated with the shared admission gate correction, retargeted to `4-foundation-stack`, and implementation commit `bf186e58726dad9a78059a7cddfaa919355a8a12` pushed on `6-hosted-feasibility`. GitHub Actions run `39235464780` passed `pull-request-checks`; deployment, production-candidate verification and promotion jobs were skipped for the PR event.
