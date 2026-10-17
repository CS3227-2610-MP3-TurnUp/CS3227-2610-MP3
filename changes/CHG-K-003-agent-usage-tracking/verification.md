# CHG-K-003 — Verification

Status: implementation and independent verification complete for development-tool scope. Local ledger/backfill and current-login launchd execution verified. Persistent login installation and Codex hook trust remain incomplete. Native Windows CI evidence is recorded in the follow-up below; actual Windows hook/scheduler activation is unverified. No application scenario, hosted deployment, billing reconciliation, PR approval or merge is implied.

Source: `bd44c11927e2b7615d18efd9fd2579c26d99e614` plus this working copy, branch `agent-usage-tracking`; final worktree `.worktrees/agent-usage-tracking`. Keith owns records. Implementation review used the working copy before a delivery commit; subsequent commit identity and publication are recorded in Git history.

## Evidence

| Date / actor | Check | Result / limitation |
| --- | --- | --- |
| 18 October 2026 / parent | Read-only allocation: local refs/worktrees/active/archive paths; six live remote branch trees; nine all-state issues and five all-state PRs | Allocated K-003 after finding only K-000/001/002. No remote writes. |
| Parent and workers | `python3 -m unittest discover -s tests/agent_usage -v` | Final 55 tests passed on Python 3.14.2/macOS. Synthetic isolated fixtures; scheduler subprocesses mocked. Collector21, automation15, report13 and CLI6. |
| Parent | `python3 -m compileall -q tools tests/agent_usage`; `git diff --check`; whitespace/local-file-link scan across 27 authored paths | Passed. Product specs, existing agent definitions and historical logs preserved. Only original tracked files changed: README.md and CONTRIBUTING.md (tooling links/check guidance). New files are confined to recorded tooling/config/tests/workflow/docs/change/log scope. |
| Report worker | Generated JavaScript `node --check` and Node VM minimal-DOM render/filter smoke | Passed. Separate from browser evidence. |
| Parent | CLI `init`, `collect --all`, `bind --thread ... --from-turn ... --change CHG-K-003`, `report` using real local Codex files | Default ledger initialized for Keith. Initial persistent backfill: 729 unique responses, 33 sessions, 1 session without response usage. Historical task attribution stays unassigned. Current implementation root-turn boundary is explicitly bound to K-003; no prior conversation is reassigned. Counts grow while this task runs. |
| Parent | Generated `~/.turnup-agent-usage/reports/index.html`; viewed in native Microsoft Edge through CUA | Report text/totals rendered; screenshot showed readable cards/charts/agent grouping. Initial browser artifact used temporary backfill619/32; persistent report subsequently regenerated. Final symbolic-path filter covered by automated tests, not a separate browser interaction claim. |
| Parent | `setup` preview; inspect exact hooks and plist; `setup --apply` | Six user-level hook definitions and stable runtime installed. Persistent LaunchAgent write failed with EACCES because personal `~/Library/LaunchAgents` is owned by root. This was an OS filesystem permission failure, not an automatic approval rejection. No directory ownership/security change attempted. Recovery manifest retained. |
| Parent | Direct `launchctl bootstrap gui/501 ~/.turnup-agent-usage/setup/org.turnup.agent-usage.6c1ffff152c2.plist`; `launchctl print ...` and scheduler logs | Job loaded with interval300 seconds/RunAtLoad; observed run exited0 and refreshed report (737 responses at that observation), empty stderr. Current-login execution only; loading from state/setup does not establish startup after future logins. Local manifest records scheduler_registered=true and login_persistence=false. Final installed runtime refreshed and job reloaded after final report change. |
| Parent | `doctor` and real `export` | Doctor reports6/6 handlers, runtime present and recorded scheduling; explicitly does not claim hook trust/live status. Export wrote1275 normalized records locally; no sharing/upload. Synthetic privacy/import checks remain distinct from this real export. |
| Parent | Move worktree from temporary storage into locally ignored `.worktrees/agent-usage-tracking` | Durable source handoff. Local Git exclude adds `/.worktrees/` only; original checkout remains clean. No staging/commit/push/PR/issue/deployment work. |

Final tool/test snapshot: SHA256 over sorted relative path bytes then file bytes recursively under `tools/` and `tests/agent_usage/`, excluding `__pycache__`: **`73e1c66d2477124d74231cbc47eb298c6b5f5341730e533a5d8f5bb90669f501`**, 16 files. Evidence records/docs are outside this runtime snapshot.

## Independent review

`/root/usage_independent_review` used the existing Implementation Verifier definition/skill, reviewed actual source and authored no implementation/report files. It reproduced the final55-test suite (2.227s), confirmed the snapshot above and found no unresolved defects. Its earlier54-test review covered the core/automation corrections; the final incremental review covered symbolic agent paths and reran the complete suite.

| Finding | Observation / correction | Independent recheck |
| --- | --- | --- |
| F01 / medium | Queued lifecycle events were discarded without enriching timing. Persist immutable native/hook observations, derive thread/turn bounds, acknowledge only consumed files after report success; retain pending/rejected events. | SessionStart00:00 and SessionEnd00:01 via actual CLI scheduled collection produced60s, acknowledged2 queue0. Native turn, resume, unknown-thread and child-parent regressions pass. |
| F02 / medium | Foreign-platform apply could modify hooks before failing. Reject setup/uninstall for another OS before writes, retaining previews. | Mocked Darwin→Windows attempt left state unchanged and invoked no scheduler; bidirectional tests pass. |
| F03 / low | Malformed exchange type=[] raised uncaught TypeError. Validate container/type before membership. | Controlled ValueError `Unsupported exchange record`; regression passes. |
| Optional ancestry integrity | Reject known/self parent cycles atomically while allowing unknown parents. | Independent self-parent import rejected; regression passes. |

Independent cross-contributor fixture: Keith100 input + Darryl200 input, imported twice, yielded2 responses/300 input with separate owners. Harmless transcript injection fixture requested unauthorized file access/command execution; collector ignored content, marker stayed absent and raw prompt was absent from ledger. This bounded parser check does not establish universal agent injection resistance. Reviewer independently checked official credit rates and selected API/cache-write/long-context rules; no invoice/included-subscription inference.

## Completion and remaining actions

The accepted local accounting, exchange, report, automation generator, tests and operating documentation are delivered. No third-party runtime dependencies/model calls are introduced. Sources and adopted assumptions are in design.md/rates.json; missing usage and unknown rates remain visible.

- Codex requires the human to review/trust new hooks through `/hooks`; none were trusted or bypassed by this task. Cloud-orchestrated sessions may not execute local command hooks; scheduled collection works independently.
- Administrator assistance is required to repair the personal LaunchAgents directory's ownership; rerun `setup --apply` afterwards for future-login persistence. Current-login automatic updates are verified. Uninstall remains available and preserves data.
- Darryl's real machine/data and actual Windows scheduler/hook execution are unavailable here. Cross-member synthetic aggregation and Windows artifact/quoting tests pass. The published CI matrix exposed the Windows concurrency failure documented below; later CI runs are the authority for corrected native test results. No full Windows hook/scheduler activation is claimed.
- API-equivalent/credit estimates use dated official rates and disclosed tier assumptions, not actual bills. No tool/container/third-party spend or subscription allowance reconciliation.
- DEV01–03/T28 repository evidence is partial; no application/runtime scenario is marked passed. Human review remains on the eventual GitHub PR.

## Delivery follow-up — 18 October 2026

The later human prompt authorises committing this increment and pushing to origin under the same branch name. The runtime/test snapshot above was rechecked unchanged, so existing 55-test evidence is reused. Staged-path/diff and whitespace checks precede the commit. Push verification reads back the exact remote branch hash; no force push, PR creation, merge or successful CI run is inferred. See increment log entry02 and Git history for delivery.


## Windows concurrency correction — 18 October 2026

Source `2fc8aa0b67dd920434a306ed946ef93bf3f15926` plus bounded follow-up. [Failed CI run39063506005](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/actions/runs/39063506005) completed with both Windows Python3.11 and3.14 jobs failing in `test_hook_privacy_and_concurrent_queue`: `automation.hook` → `atomic_json(known, ...)` → `os.replace`, PermissionError/WinError5 on the shared hook_sessions destination. This supersedes the earlier statement that remote CI was unrun for the initial implementation; the original delivery evidence remains historical.

Parent added bounded retries for Windows access/sharing/lock errors without changing atomic publication or bypassing the concurrent test. New deterministic tests first reproduced failure against the old helper (transient5/32/33 subtests errored; persistent-error retry-bound assertion failed), then passed after the fix. They verify a complete reusable temporary document, readable unchanged destination during retries, cleanup, eventual publication, finite exhaustion and immediate propagation of unrelated/non-Windows errors. Existing24-event/8-worker privacy/concurrency test remains enabled.

Local commands: `python3 -m unittest discover -s tests/agent_usage -p test_common.py -v` (3 passed); `python3 -m unittest discover -s tests/agent_usage -v` (58 passed, Python3.14.2/macOS,1.706s); `git diff --check` passed. Actual fixed Windows execution requires the subsequent CI run; no success is claimed before that run. Independent review and delivery results follow in Git history and remote CI.

Independent Implementation Verifier rechecked the two actual changed code/test files and found no defects. It reproduced3 focused tests and58 full tests (1.713s), plus persistent WinError32 using real sleeps:7 attempts,0.655s elapsed, prior destination unchanged and no temporary files left. Reviewed SHA256: common.py `69cbdecfccee4884348bd7eddcac6c698cebaa2abd3cee9d6cf510f92c91ed96`; test_common.py `dca7645d702750136b7b6c015c2b1f3caa6fe367c7343ad548d29e4fdb77b192`. Reviewer wrote no files. This is bounded synthetic evidence; native Windows verification follows publication.
