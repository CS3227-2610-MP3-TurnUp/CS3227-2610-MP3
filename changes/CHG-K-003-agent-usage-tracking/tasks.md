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
