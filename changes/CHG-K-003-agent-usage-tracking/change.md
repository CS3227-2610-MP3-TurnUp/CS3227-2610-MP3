# CHG-K-003 — Agent usage tracking

Status: tooling implementation and independent verification complete. Local backfill and current-login scheduling verified; login persistence, hook trust, Windows runtime and remote CI remain limited as recorded in verification.md. Human PR approval and publication are separate.

## Intent and source

Keith requested implementation of the accepted project-wide Python collector plan on 18 October 2026. Base: `bd44c11927e2b7615d18efd9fd2579c26d99e614`, B1/D12, with maintained foundation selections. Initial worktree `/private/tmp/turnup-agent-usage`, subsequently moved to `.worktrees/agent-usage-tracking` under the original repository for durable handoff; branch `agent-usage-tracking`. Keith owns this tooling increment; Darryl is the affected-member PR reviewer. The implementation assignment excluded delivery. The later 18 October 2026 request authorises a commit and non-forced push to `origin/agent-usage-tracking`; PR creation and merge remain outside scope.

K-003 is allocated after inspecting local refs/worktrees/active and archived records, six live remote branch trees, nine all-state issues and five all-state PRs. Earlier allocated Keith changes are K-000/001/002; no K-003 allocation found. Remote checks were read-only.

## Scope and contracts

Implement local Codex response accounting, multi-agent attribution, exchange, credit/API-equivalent estimates, offline HTML/CSV reports, macOS/Windows automation and synthetic tests. Selected decisions: both members collect locally; shared normalized exports; tokens and estimated credits; local HTML/CSV; hooks plus catch-up; explicit root-task binding; macOS/Windows. Python 3.11+, standard library only. Runtime data stays outside Git. No product requirement changes, application/provider calls, hosted service, credentials or production data access.

Consumes DEV01–03 and repository/evidence portions of T28 only; tests here do not complete application scenarios. Tool behaviour and acceptance are specified in [design.md](design.md); operation in [documentation](../../docs/agent-usage.md). Canonical product requirements remain unchanged.

Single writers: collector agent owns store/collector/exchange and core tests; report agent owns reporting, rate card, HTML assets and report tests; automation agent owns automation and its tests. Parent owns CLI/common/bootstrap, shared config, CI, README/CONTRIBUTING links, documentation, change records and `logs/keith/05-agent-usage-tracking.md`. Independent implementation verifier reviews without implementation writes. See [tasks](tasks.md).

## Acceptance and boundaries

Response deduplication, incremental recovery, descendant attribution, explicit overrides, missing/unpriced coverage, privacy-limited idempotent exchange, offline reports, hook preservation and reversible scheduling must have synthetic evidence. Record real backfill separately from fixtures. Windows runtime, GitHub CI execution and hook trust require actual evidence; generated files alone do not prove activation.

No existing feature issue is closed or reconciled: this is an additive development tool, not a product decision. Human review lives on GitHub PRs; no local human-approval gate.
