# CHG-K-003 — Verification

Status: review-pointer fixes are implemented, locally checked and independently reviewed as of 18 October 2026; no actionable defects remain in the reviewed scope. Earlier implementation and independent verification completed for development-tool scope. Local ledger/backfill and current-login launchd execution verified. Persistent login installation and Codex hook trust remain incomplete. Native Windows CI evidence is recorded in the follow-up below; actual Windows hook/scheduler activation is unverified. No application scenario, hosted deployment, billing reconciliation, PR approval or merge is implied.

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

Native CI confirmation: [run39063890430](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/actions/runs/39063890430), source commit `2c46e45393f2449fe91f94c7cff198855b7db857`, passed all four macOS/Windows Python3.11/3.14 jobs. Both Windows jobs successfully ran the original concurrent/privacy test and the full58-test suite. This confirms the reported Windows test failure is corrected; it does not establish actual Windows scheduler installation or hook trust. Runtime source was not changed after this run.


## Review-pointer fixes — 18 October 2026

Source `c06e668d0ffc0e46a8dc0015b7f3ac24f02763e2` plus this bounded working copy. Coordinator recorded single-writer assignments in tasks.md before worker dispatch. Required fixes: Interrupt end timing, annotation/reporting of evidenced zero-response root tasks with honest missing-usage accounting, and platform-specific private state/ledger creation and repair. Parent reports the existing 58-test baseline passed in the prior read-only verification; no new pre-change run is claimed here.

### Integrated implementation and checks

A authored store.py/report.py/report.html and core/report regressions. B authored new privacy.py/test_privacy.py and CLI/automation integration. No collector.py or common.py change was needed. B published the helper interface; A alone integrated store calls. Parent inspected the integrated files. Before final tests B corrected the parent's findings: LocalFree belongs to kernel32, and explicit foreign-platform apply must reject before permission mutation. Coordinator inspected the actual changed code and reconciled the operating docs.

| Actor / check | Actual result / limitation |
| --- | --- |
| A / focused core and reporting suites | 25 core and 14 reporting tests pass after integration. |
| B / private-storage, CLI and automation suites | Privacy: 6 pass, 1 native Windows skip. CLI: 6 pass. Automation: 15 pass. |
| Parent / `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests/agent_usage -q` | 70 tests ran in 2.150s on macOS/Python 3.14: 69 passed, 1 native Windows ACL test skipped. |
| Parent / `PYTHONDONTWRITEBYTECODE=1 python3.11 -m unittest discover -s tests/agent_usage -q` | 70 tests ran in 1.663s on macOS/Python 3.11: 69 passed, 1 native Windows ACL test skipped. |
| Parent / `compileall`, `git diff --check`, generated HTML script `node --check` | Passed. JavaScript syntax checking is not a browser-rendering claim. |
| Parent / isolated synthetic CLI init → queued Interrupt → `collect --scheduled` → annotation → report | Synthetic Codex home only; native completion/token usage absent. Queued event acknowledged once and queue empty. One needs_changes task: 60s elapsed, usage_status=missing, no missing elapsed bounds, null token/cost values and zero fully priced accepted tasks. Task CSV shows missing status and blank cost; malicious fixture content absent from the snapshot. |
| Parent / synthetic state0755/ledger0644 then CLI report | Repaired to state0700/ledger0600. No real private ledger accessed or modified. |

Integrated runtime/test snapshot: **`b0949c6bd896d95e5e0bcb675b7abb603bdf322556787579b4a35095d4fdd9b3`**, 19 files. Algorithm: sort relative paths recursively under tools/ and tests/agent_usage/, excluding __pycache__/pyc; hash each relative path's bytes followed by exact file bytes. Documentation/evidence are outside this snapshot.

### Independent implementation review

Independent Implementation Verifier `/root/fix_verifier` reviewed the actual completed working copy at the 19-file snapshot above, including operation docs, and authored no implementation/report files. It found no actionable defects; no corrective review round was needed.

| Independent check | Actual result / limitation |
| --- | --- |
| `python3 -m unittest discover -s tests/agent_usage -v`; same command with `python3.11` | Python 3.14: 70 tests in 2.056s; Python 3.11: 70 tests in 1.475s. Each: 69 passed, 1 native Windows ACL test skipped. |
| `compileall`, `git diff --check`, final generated HTML script Node syntax | Passed. No browser-render or native Windows result implied. |
| Isolated malicious user-message/response-item harness | Fixture requested a canary read and marker command. Instrumented io.open/subprocess.Popen/os.system observed no unauthorized reads/commands; marker absent and raw prompt absent from normalized snapshot. This is bounded parser evidence. |
| Same isolated harness: no-response root → Interrupt → needs_changes report | One task, 60s observed elapsed, usage_status=missing, null cost; state0700/ledger0600; SQLite `PRAGMA integrity_check` returned ok. |
| Protection failure and unsafe ledger fixtures | Injected fchmod denial prevented sqlite3.connect and preserved existing ledger bytes. Hard-link and FIFO ledgers rejected, preserving outside bytes/mode. |
| Windows ACL static audit | Checked API mappings/types, SID use and descriptor/ACL lifetimes. Native Windows execution unavailable; static inspection does not establish it. |

Coordinator independently reproduced the final snapshot hash; `git diff --check` and four local documentation link targets passed. Evidence/log-only finalisation does not change the reviewed runtime/test snapshot.

### Limits and rollout

This prompt excludes real private-ledger access/modification, live hook/scheduler installation, commits/pushes and remote mutations. Commands from updated source repair selected state/ledger protection on access; already installed automation uses copied code and needs the usual `setup --apply` refresh to acquire the fix. No such live refresh or real permission repair ran. Existing startup/hook-trust/billing limitations remain unchanged. Native Windows ACL execution is unavailable here; platform mocks or macOS checks alone cannot establish it. Historical native Windows CI above covers the earlier concurrency correction, not this revision. No full T28/application scenario is marked passed.

## File-URI export correction — 18 October 2026

Status: implemented by configured Application Foundation Engineer `/root/file_uri_generator` and independently reviewed by the primary agent, which authored no implementation/test changes. Source `e2831b8dc42beb095293f587504860c27087396b` plus the uncommitted exchange.py/test_core.py diff. No actionable defects remain in the assigned implementation. The primary owns documentation, these evidence records and log entry05.

The generator added a dedicated case-insensitive file-URI matcher after HTTPS shielding and before raw-path redaction. The existing shared validation now rejects unsanitized imported URIs. APIs/schema are unchanged. The first read-only proposal was returned because excluding parentheses exposed path components; the implemented matcher retains parentheses inside tokens. The generator reported red-before/green-after export and import regressions, then a full Python 3.14 suite with 71 tests (70 passed, one native Windows ACL skip).

| Independent primary check | Actual result / limitation |
| --- | --- |
| Actual exchange.py/test_core.py diff review | Two production lines added; tests cover URI variants, source preservation, HTTPS/scheme controls, idempotence and atomic import rejection. No implementation authored by the reviewer. |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests/agent_usage -q` | 71 tests in 2.233s on Python 3.14.2/macOS: 70 passed, one existing native Windows ACL skip. |
| Same command with `python3.11` | 71 tests in 1.586s: 70 passed, the same native Windows ACL skip. |
| `python3 -m compileall -q tools tests/agent_usage`; `git diff --check` | Passed. |
| Separate isolated nine-case URI harness | Both reported forms plus uppercase, triple-slash Windows drive, localhost/network, percent encoding and two parenthesized paths fully redacted. Quoted mixed evidence keeps the HTTPS URL. Each raw annotation fails validation; each sanitized export imports idempotently; exporting preserves the raw source snapshot. A raw annotation with an additional valid binding fails import without changing the populated destination. |
| HTTPS/unrelated scheme controls | HTTPS evidence, profile:///example and my-file:///example remain unchanged. |
| Bounded annotation-injection harness | Annotation requested a synthetic canary read and marker command. Instrumented io.open/subprocess.Popen/os.system observed no unauthorized access/process/command; marker absent and canary unchanged. This is bounded data-processing evidence, not universal injection resistance. |

Reviewed runtime/test snapshot: **`735a9c92f007f7c0ec72fe08879a86b2acd4cef29a3a932dc2491da88889fe56`**, 19 files. Same sorted relative-path-byte then content algorithm under tools/ and tests/agent_usage/, excluding __pycache__/pyc. Documentation/evidence updates do not change the reviewed source snapshot or restart review.

No real private ledger/transcripts, live runtime refresh, provider calls, commit/push or remote mutation. URI checks are synthetic and platform-independent; native Windows ACL execution remains unverified. Historical exports are not rewritten; regenerating them from updated source applies redaction. Evidence covers bounded DEV01–03/T28 tooling only, not a complete application scenario.
