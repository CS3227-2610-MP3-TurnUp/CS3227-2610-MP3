# CHG-K-003 — Tasks and handoffs

Base `bd44c11927e2b7615d18efd9fd2579c26d99e614`; human/log owner Keith; branch `agent-usage-tracking`; increment log `logs/keith/05-agent-usage-tracking.md`. DEV01–03/T28 repository portions only.

| Output | Sole writer | Prerequisite | Check |
| --- | --- | --- | --- |
| store.py, collector.py, exchange.py; test_core.py | Collector worker | Accepted plan and snapshot contract in design | Incremental accounting, attribution and exchange fixtures |
| report.py, rates.json, report.html; test_report.py | Reporting worker | Snapshot contract; fetched official rate/hook sources | Calculations, offline filtering, escaping |
| automation.py; test_automation.py | Automation worker | Registry/CLI contract; official hooks docs | Queue, setup artifacts, preservation/uninstall |
| Other tooling, common/CLI, CI, docs and records/log | Parent | Disjoint worker outputs | CLI integration, real local backfill, documentation |
| Read-only independent verification | Implementation verifier | Integrated implementation | Reproduce tests, inspect privacy/accounting and report findings |

Agents share the same worktree, must preserve others' work and must not edit outside assigned files. Read set: user accepted plan; AGENTS.md; CONTRIBUTING.md workflow/evidence/log policy; specs README/baseline/deployment DEV01–03, full T28/coverage; implementation ownership and integration handoffs. Skill/role definitions are required for selected specialists. No worker edits owner records/log. Parent integrates sequentially and records all contributions under prompt entry 01. All workers return exact paths, checks and limitations. Independent reviewer receives actual integrated files and source revision, not only summaries. No remote mutations, commits or provider calls.

- [x] Scope, allocation and single writers recorded before dispatch.
- [x] Implement and integrate bounded tool.
- [x] Run synthetic/platform checks and local backfill; initial local-only evidence is supplemented by the Windows CI correction below.
- [x] Independently review; correct/disposition and recheck findings.
- [x] Finalise evidence, log and operating instructions; local startup permission limitation retained.

Final handoff: all workers released ownership before final integration. Independent verifier reproduced the integrated 55-test suite and F01–F03 corrections. Parent moved the worktree into locally ignored `.worktrees/agent-usage-tracking`; original checkout and all product/specification/agent inputs remain unchanged. Git local exclude adds `/.worktrees/` only. At implementation handoff no Git commit/staging or remote publication had occurred. The later delivery request authorises one logical commit and same-name origin push; log entry02 records that request.


## Windows CI correction — 18 October 2026

Continue this change at `2fc8aa0b67dd920434a306ed946ef93bf3f15926`. Parent is the sole writer of `tools/agent_usage/common.py`, new `tests/agent_usage/test_common.py`, and these change/log records. The existing independent Implementation Verifier performs read-only review and relevant regression checks. Preserve earlier outputs and original log entries. Scope: transient Windows replacement errors during concurrent hook association publication; no provider, application or OS-installation changes. The existing same-branch delivery authorisation carries the correction to CI after local validation/review.


## Review-pointer fix assignments — 18 October 2026

Source `c06e668d0ffc0e46a8dc0015b7f3ac24f02763e2`; worktree `.worktrees/agent-usage-tracking`; branch `agent-usage-tracking`; human/log owner Keith; DEV01–03/T28 repository evidence only. These assignments are recorded before dispatch. Preserve all unrelated edits. The parent coordinates configured roles and owns integration checks; no commit/push, real private-state operation, live installation or remote mutation is authorised for this prompt.

| Deliverable / exact allowed paths | Sole writer | Dependencies / handoff | Observable acceptance |
| --- | --- | --- | --- |
| `tools/agent_usage/store.py`, `report.py`, `report.html`; `tests/agent_usage/test_core.py`, `test_report.py`; `collector.py` only if needed and announced | Application Foundation Engineer A (lifecycle/report) | Existing snapshot/schema; privacy helper interface from B before A alone adds store calls | Interrupt contributes an end observation. Shared root discovery combines responses, collected root turns and root-thread lifecycle evidence, retains descendant attribution and invents no roots. Zero-response tasks annotate and appear in HTML/CSV/JSON with additive `usage_status=missing`; response-bearing tasks use `observed`. Summary exposes `tasks_without_responses`; missing usage is excluded from fully priced accepted-task metrics. Exchange schema remains unchanged. |
| New `tools/agent_usage/privacy.py`; `cli.py`, `automation.py`; new `tests/agent_usage/test_privacy.py`; `common.py` only if needed and announced | Application Foundation Engineer B (private storage) | Publish exact helper signatures/failure contract to A and parent before store integration; never edit store.py | State directories and ledger are created/repaired as POSIX 0700/0600 or protected Windows current-user-only ACLs through stdlib ctypes. Clear failure if protection cannot be enforced; synthetic creation/repair/failure checks preserve prior data. |
| K-003 `change.md`, `design.md`, `tasks.md`, `verification.md`; `docs/agent-usage.md`; existing `logs/keith/05-agent-usage-tracking.md` | SDD Coordinator | Read actual files and primary/worker/reviewer evidence; finalise after integrated checks | Describe actual behaviour and limitations; retain historical evidence and one new Request/Results entry for this human prompt. No unrun result is recorded as passed. |
| Integrated checks and coordination | Parent | A/B release ownership; inspect actual outputs | Run appropriate synthetic integration/full suite and report exact revision/checks/limitations; writes only to unowned paths after coordination. |
| Read-only integrated implementation review | Independent Implementation Verifier | Completed A/B implementation, actual final source/files and checks | Review implementation/configuration against these contracts, reproduce relevant checks, report actionable findings and limitations; author no implementation. No assessment of human review. |

Read set: applicable AGENTS guidance, selected configured role/skills, specs task map/baseline, deployment DEV01–03, complete T28 and coverage, implementation ownership/handoffs, CONTRIBUTING evidence/log rules and these K-003 records. Workers report changed paths, actual checks, limitations and dependency release to the parent/coordinator. All contributions belong under log entry04; workers do not edit coordinator-owned records. Independent review covers the integrated implementation once; evidence/log-only completion does not restart it.

- [x] Bounded owners, source, dependencies, acceptance and exclusions recorded before dispatch.
- [x] B publishes private-storage interface; A integrates it sequentially in store.py.
- [x] A/B complete fixes and release ownership with actual checks.
- [x] Parent checks integrated files and regression suite.
- [x] Independent verifier reviews completed implementation; no actionable defects found.
- [x] Coordinator finalises docs, verification and prompt log from actual evidence.


A released only store.py/report.py/report.html/test_core.py/test_report.py; collector.py required no changes. B released privacy.py/cli.py/automation.py/test_privacy.py; common.py required no changes. B's state-only/ledger helper interface and controlled `PrivacyError(OSError)` were integrated by A alone. Parent inspection identified the Windows LocalFree DLL binding and foreign-platform permission-mutation order; B corrected both before full checks. Verification records exact checks. The independent verifier reviewed the final 19-file integrated implementation snapshot read-only and found no actionable defects; Python 3.11/3.14 each ran 70 tests with 69 passing and one native Windows ACL skip. Coordinator settled documentation, evidence and log entry04. No corrective review round is required. Native Windows ACL execution and any future runtime refresh remain separate bounded work; neither was performed here.

## File-URI redaction correction — 18 October 2026

Continue K-003 from `e2831b8dc42beb095293f587504860c27087396b` in the existing branch/worktree. The human assigns a generator–verifier workflow: configured Application Foundation Engineer `/root/file_uri_generator` owns only `tools/agent_usage/exchange.py` and `tests/agent_usage/test_core.py`; the primary agent verifies the implementation independently and owns these records, operating documentation and log entry05. The primary authors no implementation. Preserve unrelated work; no commit/push, live state, installation or remote mutation.

The generator adds case-insensitive whole-token file-URI redaction after HTTPS shielding and before existing raw-path redaction. Keep parentheses inside the token, the existing raw-path boundaries, exchange schema and APIs. Imports reject unsanitized file-URI evidence through the shared validation/redaction logic. Tests cover the reported POSIX/Windows forms, uppercase scheme, localhost/network authorities, percent encoding, parenthesized path components, adjacent HTTPS evidence, unchanged source annotations, atomic rejection and repeated sanitized import.

- [x] Record source, single-writer ownership, contract and generator/verifier handoff before implementation.
- [x] Generator implements scoped change and regression tests, then releases ownership with evidence.
- [x] Primary independently reviews actual source and reproduces focused/integrated checks; no actionable defects remain.
- [x] Finalize verification, operating documentation and existing increment log from actual results.

Generator released only exchange.py and test_core.py. The primary authored no implementation/test changes and independently verified the completed diff. Both Python 3.11 and 3.14 ran 71 tests: 70 passed and the existing native Windows ACL test skipped. A separate nine-case export/import harness confirmed source preservation, raw annotation rejection, populated-destination atomicity and repeated sanitized import. Exact evidence and reviewed snapshot are in verification.md.
