# CHG-<OWNER>-NNN — Change title

Status: proposed / in progress / complete (select one based on scoped delivery and actual verification; see verification.md for agent findings/checks, without duplicating review status here).

## Intent and source

- Requested outcome and concrete user behaviour:
- Human assignment/provenance and date:
- Source/spec revision: commit hash, or dated working-copy snapshot and file list.
- Context to read: authoritative document sections, complete requirement/scenario IDs and producer/consumer contracts from the [task reading map](../../specs/README.md#task-reading-map); expand when dependencies require it. Reference source content rather than copying it.
- Allocated change ID: `CHG-K-NNN` or `CHG-D-NNN`; allocating human Keith (`K`) or Darryl (`D`), following [allocation rules](../README.md).
- Human owner: Keith or Darryl (primary accountable member; prefix stays stable if ownership transfers).
- Writers, with one active writer per file:
- PR/feature increment and designated owner log: existing owner log path, or planned branch/scope and log owner; follow the [member log policy](../../CONTRIBUTING.md#member-logs) and append a full entry per substantial prompt (or explicit logging request) to that same file.
- Completed-change agent-review assignment: identify in tasks.md when implementation is assigned; standalone specification audits only when explicitly requested.
- Related overview/implementation issue URLs, if available; otherwise state pending:

## Scope

- Requirement IDs and linked canonical specs:
- Acceptance scenario IDs and links:
- Exact deliverable files/directories and responsible writer:
- Exclusions:
- Dependencies and preconditions: explicit owner-prefixed change IDs, or roadmap work-package labels pending allocation; numbers do not imply execution order.

## Decisions and acceptance

- Established decisions and provenance:
- Open decisions, affected work, and resolver:
- Block dependent implementation only where the decision/contract is required.
- Observable completion conditions:
- Verification approach and runtime/deployment limits:

Follow the [review policy](../../CONTRIBUTING.md#review-records): implement the assigned change, obtain independent agent review, correct/disposition findings and recheck material fixes, then push when authorised and use GitHub review as the final PR review. Agents do not assess human reviewer assignment, independence, approval, sign-off or merge readiness. Keep concise agent findings/checks/revision/limitations in verification.md. Evidence/log-only updates do not restart review.

## Decision-to-issue reconciliation

Follow [the reconciliation procedure](../../CONTRIBUTING.md#decision-to-issue-reconciliation) when a decision is accepted or superseded within this change.

- Decision IDs, deciding humans/date/provenance and authoritative records:
- Affected requirement/scenario IDs, canonical files and consumer dependencies:
- Affected overview/implementation issue URLs, including impacted closed scope:
- Latest reconciled spec revision or dated working-copy snapshot, distinct from the original source/implementation base:
- Dated issue updates, review and remote read-back results; follow-up/reopening dispositions where applicable:
- Remaining blockers or pending updates, responsible owner and reason; state not applicable with a reason if no tracked scope is affected:

An accepted decision changes the agreed target or readiness; implementation and verification need their own evidence. Preserve earlier completion evidence and record pending GitHub updates rather than claiming synchronisation.

## Handoff

Record objective, allowed paths, source/spec revision, IDs, dependencies, outputs, completed-change agent reviewer and checks in [tasks.md](tasks.md). Record actual evidence and findings in [verification.md](verification.md). Add `design.md` only for a material technical choice.
