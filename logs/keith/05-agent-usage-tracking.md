# 01 - Implement Agent Usage Tracking - 18 October 2026

## Request

Implement the accepted Python project-wide agent usage tracking plan, CHG-K-003, branch agent-usage-tracking, source bd44c11927e2b7615d18efd9fd2579c26d99e614. Keith owns the increment; Darryl reviews the eventual PR.

## Results

- Delivered the standard-library Python CLI, incremental SQLite collector, explicit root/turn bindings, task annotations, normalized export/import, dated credit/API-equivalent pricing, offline HTML/CSV reporting and macOS/Windows setup/removal. Shared config identifies TurnUp across clones/worktrees; runtime data stays outside Git. No model calls or external service added.
- Parent owns integration/common/CLI/config, docs, CI and records. Collector, reporting and automation workers authored disjoint files; Implementation Verifier independently reviewed actual integrated code without edits. The owner log combines contributions under this originating human prompt. Changes to README/CONTRIBUTING link tooling and distinguish its executable checks from the unimplemented application.
- Final55 synthetic tests pass on Python3.14.2/macOS, plus compile, JavaScript syntax/DOM smoke, whitespace and local-file-link checks. Independent verifier reproduced55 tests and the final16-file tool/test snapshot `73e1c66d2477124d74231cbc47eb298c6b5f5341730e533a5d8f5bb90669f501`. F01 lifecycle queue persistence, F02 foreign-OS setup and F03 malformed exchange validation were corrected and independently rechecked; known-parent cycles also reject. Exact checks/findings are in change verification.
- Local default backfill initially collected729 unique responses across33 sessions, one without recorded response usage; actual task totals continue growing. Current implementation turn is explicitly bound to K-003, preserving older unassigned history. Generated report rendered in native Edge; local normalized export succeeded. Independent cross-member fixture imported twice yielded2 responses/300 input tokens and distinct contributors. Injection marker fixture was ignored without unauthorized effect or raw prompt retention; evidence is bounded.
- Installed6 user-level hook definitions and stable runtime. Persistent startup file failed EACCES because personal LaunchAgents directory is root-owned. Direct launchctl loading from state/setup succeeded with300-second interval and observed exit0/report refresh. This verifies automatic updates for the current login only. No ownership/security change, hook trust or trust bypass was performed. Administrator repair + setup retry is needed for future-login persistence; user `/hooks` review is still required. Local manifest records the limitation.
- Source is on branch `agent-usage-tracking`, relocated from `/private/tmp/turnup-agent-usage` to the repository's locally ignored `.worktrees/agent-usage-tracking` for durable handoff. Original checkout is preserved. Shared Git local exclude adds only `/.worktrees/`.
- Real Darryl/Windows operation, remote CI, future-login startup, actual billing reconciliation and application/runtime/provider scenarios remain unverified. CI is authored only. No production-data or LLM-provider access, dependency installation, commit/staging, push, PR/issue mutation, deployment or application implementation. No full T28 or other application scenario is marked passed.


# 02 - Commit and Push Usage Tracking - 18 October 2026

## Request

Commit this change and push it to origin using the same branch name, agent-usage-tracking. Continue CHG-K-003 and this increment log; no PR creation or merge is requested.

## Results

- Reviewed the worktree, existing staging, original-file diff, untracked deliverables, repository instructions, commit conventions and recent history. The 27-path tooling increment forms one coherent implementation/test/documentation commit; local ledgers, reports, exports and Python caches remain outside staging.
- Confirmed the 16-file runtime/test snapshot is unchanged from the independently reviewed 55-test version: `73e1c66d2477124d74231cbc47eb298c6b5f5341730e533a5d8f5bb90669f501`. Reused that validation evidence; no runtime changes justify repeating the suite.
- Updated delivery authorisation and historical status wording in change records. This prompt authorises the commit and a non-forced push to `origin/agent-usage-tracking`; human review, merge and PR creation remain separate. Actual commit identity and push result are recorded in Git/history and the delivery response, rather than predicting them here.
- Existing startup-permission, hook-trust, real Windows execution and billing limitations remain unchanged. Publishing the authored CI workflow does not itself establish CI success. Original checkout and other branches are preserved.
