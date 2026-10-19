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

## 19 October 2026 completion-sentinel correction

| Order | Output | Sole writer / actor | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 10 | Exact probe completion check and deterministic cases | Hosting & SoC Engineer | Source `e743363e`; fixed `READY` prompt, SEC03/06, DEP04, T14 | Only normalized sentinel succeeds; mismatch is safe `invalid_response`; completed lease releases |
| 11 | Independent review and material-fix recheck | Implementation Verifier | Completed route/tests | Findings, exact checks and hosted limits in verification.md |
| 12 | Record and deliver PR #18 correction | Coordinator, then Delivery Agent | Independent verification | Keith log entry and work-branch PR update; no merge/deploy |

- [x] Sentinel correction and independent review recorded in verification.md.
- [x] PR #18 updated with the reviewed completion-sentinel correction; commit `64f854ce4c8731be1eca929da296a5fa1d44a259` is on `6-hosted-feasibility`, and the PR remains open against `4-foundation-stack`.

## 19 October 2026 completed-HTTP lease correction

| Order | Output | Sole writer / actor | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 13 | Distinguish completed HTTP `unavailable` from uncertain transport and correct probe lease release; regression tests | Hosting & SoC Engineer; exact four paths in change.md | Source `b256f944`; existing durable gate contract, SEC05–06, DEP04, T14 | Received 5xx/unmapped non-2xx releases before safe response; transport/timeout/cancellation/thrown retains; no public result change |
| 14 | Independent completed-change review and material-fix recheck | Implementation Verifier; read-only implementation | Generator's integrated four-file handoff | Exact revised snapshot, reproduced checks, actionable findings and limitations |
| 15 | Record source, implementation and verification evidence in CHG-K-005 and existing Keith log | Coordinator; record/log paths only | Generator and verifier results | Accurate changed paths, checks, findings and hosted limits; no unsupported live claim |

- [x] Hosting & SoC Engineer handed off the four-file implementation and regression tests at source `b256f944`.
- [x] Independent Implementation Verifier reviewed that implementation without authorship, reproduced focused/default tests, typecheck, lint and whitespace checks, and reported no actionable finding.
- [x] Coordinator recorded results and limitations in verification.md and Keith's existing PR increment log. At the verification handoff, no commit, push, PR update or live check had occurred for this correction.

## 19 October 2026 Preview deployment branch-policy correction

| Order | Output | Sole writer / actor | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 16 | Align Preview branch trigger, manual trust guard and setup instructions for one-level `preview/name` branches | Hosting & SoC Engineer; workflow, setup guide and optional new focused test only | Source `88482f3`; GitHub environment branch-policy rule; DEP03, DEV01–03, T15/T28 foundations | One-level protected Preview branches eligible; nested/empty branch suffix denied; Production gates preserved |
| 17 | Independently inspect changed workflow/guide and reproduce branch-pattern, syntax and relevant regression checks | Primary agent as Implementation Verifier; read-only implementation | Complete generator handoff | Actionable findings, reviewed snapshot, exact checks and hosted limits in verification.md |
| 18 | Commit and push reviewed increment to `6-hosted-feasibility` | Delivery Agent; Git metadata/remote only | Independent verification and accurate existing Keith log | Commit hash, remote head read-back, clean status; no merge or deployment |

- [x] Hosting & SoC Engineer handed off only the assigned workflow and guide changes at source `88482f3`.
- [x] Independent primary-agent verification found no actionable defect and reproduced the branch, syntax and preservation checks recorded in verification.md.
- [x] Delivery Agent committed the six reviewed implementation/evidence paths as `70d187fb2923b6f401520db0e976b63461e5efbc` and pushed `6-hosted-feasibility`; independent remote-head read-back matched that hash and the worktree was clean. No deployment or PR-description update occurred.

## 19 October 2026 cancellation, persistence and promotion correction

| Order | Output | Sole writer / actor | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 19 | Forward request cancellation, add caller-known idempotent persistence IDs, and narrow stale production promotion | Hosting & SoC Engineer; exact implementation paths in change.md | Clean source `94dd874`; SEC05–06, DEP03–04, DEV01–03, T14/T15/T28 portions | Deterministic cancellation/retry and promotion checks, safe recovery guidance |
| 20 | Independently review and reproduce relevant checks | Primary agent as Implementation Verifier; no implementation authorship | Completed writer handoff | Reviewed digest, findings/recheck, exact results and live limits in verification.md |
| 21 | Record and deliver reviewed correction | Primary agent; records/log and Git delivery only | Completed independent review | Existing Keith log entry, commit, remote head read-back; no deployment or merge |

- [x] Hosting & SoC Engineer completed only the assigned implementation paths and handed off focused/default test and syntax results.
- [x] Independent review reproduced applicable checks; a documentation overstatement about cancellation timing was corrected and rechecked. Exact evidence and remaining limits are in verification.md.
- [x] Committed the reviewed implementation and evidence as `e94ebd3ed5b2514291a7117b7c426b4660b8cfa2` and pushed `6-hosted-feasibility`; remote head read-back matched. No deployment or merge occurred.

## 19 October 2026 pre-dispatch cancellation review correction

| Order | Output | Sole writer / actor | Dependency | Evidence target |
| --- | --- | --- | --- | --- |
| 22 | Release an SoC reservation when cancellation is already present after admission and before client dispatch; preserve post-dispatch retention | Hosting & SoC Engineer; route and route test only | Source `67789ca`; SEC05–06, DEP04 and T14 provider-failure behavior | Pending-admission cancellation releases once and skips client; post-dispatch cancellation retains lease |
| 23 | Independently review the integrated route/test diff and reproduce relevant checks | Primary agent as Implementation Verifier; no implementation authorship | Completed writer handoff | Findings, source digest, exact checks and limits in verification.md |
| 24 | Record and deliver reviewed correction | Primary agent; records/log and Git delivery only | Independent review and accurate existing Keith log | Delivery Agent commit/push, remote-head read-back; no deployment or merge |

- [x] Hosting & SoC Engineer changed only the two assigned implementation paths and handed off deterministic pre-/post-dispatch cases.
- [x] Independent review confirmed the report and reproduced focused/default tests, typecheck, lint and whitespace checks with no unresolved actionable finding.
- [x] Delivery Agent committed the six reviewed code/evidence paths as `a609eab63d1b140032a97a8dd372d6c273768392` (`fix: release reservations on pre-dispatch cancellation`) and pushed `6-hosted-feasibility`. The agent reported remote-head read-back matched; local HEAD and upstream tracking status are aligned. No deployment or merge occurred.

## 19 October 2026 pnpm 12 Vercel build correction

Source `568c002` on merged `master`, failed Actions run `39274898676`; separate PR increment `fix-vercel-pnpm-install`. The primary agent writes `vercel.json`, `docs/wp-001-hosting-setup.md`, this change's records and `logs/keith/08-vercel-pnpm-install.md`. An independent Implementation Verifier reviews the completed executable config/guide change without authorship.

| Order | Output | Actor | Evidence target |
| --- | --- | --- | --- |
| 25 | Skip Vercel's duplicate install after the same-job frozen pnpm install; explain recovery in the guide | Primary agent | Valid Vercel JSON and locked-install/build order; no package-manager drift |
| 26 | Independently review the config/guide and relevant build behavior | Implementation Verifier | Findings, reproduced checks and hosted limits in verification.md |
| 27 | Record this prompt's results, commit and open a new PR to `master` | Primary agent | Reviewed diff, commit and PR link; no deployment claim from local checks |

- [x] Config and guide correction implemented from the merged `master` base.
- [x] Frozen pnpm install, 91 tests, lint, typecheck, local production build, JSON/order and whitespace checks passed.
- [x] Independent implementation review recorded in verification.md; no actionable finding or material recheck.
- [x] Reviewed implementation and initial evidence committed as `0ac06b98da2d8ccb300991ca97771618b88d59ec`, pushed to `fix-vercel-pnpm-install`, and [PR #19](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/pull/19) opened against `master`. This delivery-status update is evidence only.


## 20 October 2026 deployment output correction

Source `d6b2360950bd310071e6ae5ea38db678c4fac21a`; exact primary-agent paths and independent-verifier handoff are in change.md. Keith owns the new planned PR increment and `logs/keith/09-vercel-deployment-output.md`. Current branch is retained; this assignment authorises no Git delivery or deployment.

- [x] Inspect pinned Vercel source and reproduce single-document YAML rejection without modifying the lockfile.
- [x] Separate only the exact known lockfile diagnostic from URL/status output; preserve command failure, metadata checks and staged promotion gates; remove redundant `--prod`.
- [x] Add synthetic checks executing the actual upload/smoke shell scripts, including failed commands and malformed/duplicate output; document the bounded workaround and retry behavior.
- [x] Final local checks and independent agent review completed with no actionable finding; findings/results/limits recorded in verification.md and the new increment log.


## 20 October 2026 candidate smoke authentication correction

Source `802cdfa`; primary-agent paths and scope are in change.md. Keith owns the planned PR increment and `logs/keith/10-vercel-curl-authentication.md`.

- [x] Trace pinned CLI token handling and curl forwarding against official source.
- [x] Use existing step-scoped environment authentication; add regression coverage of executable command arguments and retained smoke flags.
- [x] Run focused/default tests, lint, typecheck, YAML/shell syntax and whitespace checks; update operator guidance.
- [x] Independent agent `review_curl_auth` completed review with no actionable findings; results and limitations recorded in verification.md.
- [ ] Delivery agent: commit the reviewed correction, push `fix-vercel-curl-authentication`, open a PR against `master`, and record actual remote read-back evidence.
