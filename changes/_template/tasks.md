# CHG-<OWNER>-NNN — Tasks and handoffs

Source/spec revision: identify the same snapshot as [change.md](change.md).

| Order | Task / output files | Writer / actor | Preconditions / dependencies | Requirement / scenario IDs | Completion check |
| --- | --- | --- | --- | --- | --- |
| 1 | Reconcile scoped behaviour and decisions | Assign | Assignment and source snapshot | Fill in | Traceable specs and unresolved decisions |
| 2 | Implement exact assigned slice | Assign | Required contracts/blockers resolved | Fill in | Observable scoped behaviour and checks |
| 3 | Agent review of completed change, correction and evidence | Assign reviewer/author | Implementation available | Fill in | Findings dispositioned and material fixes rechecked |

Human owner: Keith (`K`) or Darryl (`D`). Confirm the allocated change ID and disjoint file writers before dispatching concurrent agents.

Completed-change agent reviewer: assign an agent that did not author the implementation, including executable configuration and agent/workflow instructions. Do not require a separate reviewer per file/document. Standalone specification audits occur only when explicitly assigned. Record concise findings/checks/revision/limitations in verification.md. Evidence/log-only updates do not restart review. After an authorised push, GitHub review is the final PR review.

## Work state

- [ ] Scope, owners, permitted files, source/spec revision, IDs, and preconditions recorded.
- [ ] Relevant specs and acceptance scenarios reconciled.
- [ ] Scoped deliverables handed off without overlapping writers.
- [ ] Actual checks and the implementation's independent agent review (or an explicitly assigned standalone audit) recorded in [verification.md](verification.md); state not applicable for documentation-only work without an assigned audit.
- [ ] Findings corrected or explicitly dispositioned; dependent blockers visible.
- [ ] Final scope, task states, evidence, and next bounded work agree.

## Handoff record

- From / to / date:
- Objective and allowed files:
- PR/planned increment, designated log owner, shared log path, and originating prompt entry (append per substantial prompt; reuse file across handoffs):
- Source/spec revision and affected IDs:
- Context read set: authoritative sections and complete applicable scenarios, dependency contracts and revisions; refresh after relevant changes and expand beyond this list when needed:
- Dependencies satisfied / outstanding:
- Outputs and actual checks:
- Findings, limitations, and next bounded task:

Repeat the handoff record per transfer where useful. Check a task only when its evidence exists.

Agents do not assess human reviewer assignment, independence, approval, sign-off or merge readiness from any source; follow the [review policy](../../CONTRIBUTING.md#review-records). Accepted product decisions and application approval/access rules remain separate requirements.
