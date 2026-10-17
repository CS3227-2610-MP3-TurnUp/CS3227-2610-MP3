# Contributing

The team uses lightweight SDD with ordinary Markdown and Git. Canonical [specs](specs/README.md) describe intended behaviour; [change records](changes/README.md) capture bounded work and actual evidence. No OpenSpec installation is required.

## Ownership

Each human member owns the complete Student or Organiser workflow, including UI, server authorisation, data operations, and tests. This does not create separate applications or duplicate shared rules. Keith owns Organiser workflows and Darryl owns Student workflows; the [implementation plan](specs/implementation-plan.md) records shared-contract leads and Keith as WP-001 lead. Record exact file writers/reviewers per change; agent activity does not replace human contribution evidence.

Shared contracts have one writer, an affected-role reviewer, and an explicit dependency handoff. Agree contract details before parallel implementations rely on them. Do not let two agents edit the same file concurrently.

## Concurrent work and change IDs

Keith uses prefix `K`; Darryl uses prefix `D`. Each human allocates an independent sequence using the [change naming rules](changes/README.md). Keep the allocated ID stable across branches, review, and archive. Each agent receives its human owner and change ID in its assignment; agents for the same human must coordinate allocation before dispatch.

Each concurrent change uses a separate clone/worktree and branch. Record exact file writers, shared-contract owners, reviewers, and dependencies before parallel implementation. Integrate prerequisite changes first, update dependent branches, and rerun affected checks. A clean merge alone does not establish behavioural compatibility. Student/Organiser ownership is assigned separately from the human's prefix.

## From requirement to evidence

1. **Define a bounded change.** Copy [the template](changes/_template/change.md) into a unique `changes/CHG-<OWNER>-NNN-short-name/` directory with `tasks.md` and `verification.md`. Select `K` or `D` and allocate that human's next number before creating the record. State intent, exclusions, owners/reviewer, source/spec revision, impacted IDs, deliverables, and blockers. Add `design.md` only for a material design choice.
2. **Reconcile the specification.** Update relevant role/shared specs and acceptance scenarios using the baseline and decisions. Preserve provenance and unresolved questions. Old source labels such as “confirmed” do not override later human decisions. When an accepted decision changes or resolves tracked work, follow [decision-to-issue reconciliation](#decision-to-issue-reconciliation).
3. **Plan dependent work.** Name each deliverable's writer/reviewer, allowed paths, and prerequisites in `tasks.md`. Parallelise independent reads or disjoint writes. Resolve blockers before dependent implementation; continue other authorised work.
4. **Implement the scoped slice.** Include complete role behaviour and server checks, sharing rules through defined contracts. Separate implementation choices from user behaviour. Application/dependency initialisation is separate from this documentation scaffold.
5. **Verify and review.** Record appropriate exact checks in `verification.md`. An independent reviewer checks requirements, privacy, role boundaries, failures, and shared contracts. Correct findings and recheck affected areas. Documentation checks cannot prove runtime correctness.
6. **Close the change.** Reconcile specs, tasks, evidence, and remaining decisions. Mark complete only when defined scope is satisfied. Archive completed records under `changes/archive/` when useful, updating links. Commit, merge, or deploy within the human-authorised workflow.

## Decision-to-issue reconciliation

When humans finalise or supersede a product decision, the change owner and Project Manager reconcile its affected tracking artifacts within the assigned scope. This is part of the decision-finalisation work, not a background synchronisation service.

1. Record the accepted decision, deciding humans, date/provenance, affected requirement IDs and any superseded decision in [specs/decisions.md](specs/decisions.md). Preserve stable IDs and unresolved portions. Technology selections belong in the assigned design record unless they change an agreed product constraint.
2. Update the affected canonical contracts/capabilities and acceptance scenarios. Follow producer/consumer dependencies and obtain the required affected-role/independent review. Approval establishes the agreed target; implementation and verification remain separate states.
3. Find impacted GitHub issues through decision, requirement, package and change references, including overview issues, implementation issues and dependent consumers. An issue need not cite the gate explicitly to be affected. Check previously closed issues when their scope is affected.
4. Reconcile issue scope, acceptance criteria, dependencies and readiness against the accepted decision. Explain the decision in plain language alongside its ID and link its authoritative record. Preserve discussion, unrelated checklists and original completion evidence. Keep the original source/implementation base distinct from the latest reconciled spec revision. Add a short dated reconciliation note identifying what changed. For affected closed work, explicitly disposition follow-up work versus reopening; do not silently erase its previous completion state.
5. Record affected issue URLs, the latest reconciled spec revision (or dated working-copy snapshot), review/results and remaining blockers in the assigned change record. Update GitHub within the task's authorised scope. If access is unavailable, a write is uncertain or remote updates are outside scope, record the specific pending updates and responsible owner; do not mark them synchronised. Read back remote updates before recording success. Append the prompt's results to the existing owner log under [member log policy](#member-logs).

Resolving one decision removes only its own blocker. Start dependent implementation only when all of its required decisions, contracts and assignments are ready. Never check off implementation/tests or close an implementation/overview issue merely because a decision was accepted; a decision-only issue may close when its own acceptance evidence is complete.

## Evidence and handoffs

A handoff includes objective, owner/reviewer, exact allowed paths, source/spec revision, requirement/scenario IDs, dependencies, expected outputs, actual checks, remaining findings, and the next bounded task. Before a Git revision exists, identify a dated working-copy snapshot and files; never invent a commit hash.

Use the [task reading map](specs/README.md#task-reading-map) to list exact authoritative document sections, requirement/scenario IDs and dependency contracts in the handoff. Load the assigned package and affected integration handoffs; broaden reading when consumers, references or decisions require it. Preserve full requirement/failure outcomes and evidence rather than maintaining copied summaries. Refresh context after relevant revision changes; historical records are read when evidence/provenance or log work needs them.

Checkboxes represent completed work with evidence. Record “not run” or “unavailable” with the reason where applicable. The current scaffold has no executable build/test commands; document them after actual application/tool initialisation.

## Member logs

Create **one log file per pull request's worth of incremental work**, under the explicitly designated human owner's directory: Keith (`K`) uses `logs/keith/`; Darryl (`D`) uses `logs/darryl/`. For a shared PR, choose one log owner and include both members' contributions. The assignment's specified owner determines the directory.

- Before creating a file, inspect that owner's logs for the same PR or planned increment. Reuse its current log throughout planning, implementation, corrections, review, and verification. Append to the bottom of that log; the latest log for another PR is not the target.
- **Append one entry for every substantial human prompt:** a prompt that creates, modifies, renames, or removes repository files to achieve an outcome. Also append an entry for an otherwise read-only/non-substantial prompt when the owner explicitly requests logging. Explicit instructions not to log take precedence.
- Each entry repeats the complete heading, `Request`, and `Results` format below. Summarise the specific prompt's objective in its PR/increment context and record attributable file changes, outcomes, checks, and limitations; cumulative increment totals may be included. Preserve earlier entries instead of replacing them with one consolidated PR summary.
- A follow-up prompt within the same increment gets a new entry when substantial, **not a new file**. Agent handoffs, retries, or commits do not each create entries on their own; combine agent contributions under the originating human prompt's entry and finalise its results after checks.
- A PR number is not required to start the file. Identify the planned increment by branch/scope, include related change IDs, and add the PR number/link when available. Several changes in one PR share the same log; separate PR increments get separate files.
- Create a new file only for a distinct PR-sized increment with a specified owner. If owner/increment is unclear, clarify before creating a file or appending to an unrelated log; continue independent authorised work. Standalone questions need no entry unless the owner requests one.
- Use the next unused file number in the owner's directory and a feature-based filename such as `XX-feature-summary.md`. The file number is independent of change IDs and PR numbers. Keep the filename stable once the PR number becomes known.
- Within each file, entry headings use their own increasing `XX` sequence (`01`, `02`, ...), a suitable title, and the date of that prompt. Continue the last entry number when appending; it is independent of the file number.
- Before PR review, check each entry's accuracy and completeness without collapsing the history. Existing historical entries remain unchanged unless explicitly assigned for correction.

```markdown
# XX - Suitable Title - DD Month YYYY

## Request

Summary of the PR-sized feature increment; related change IDs and PR reference, or planned branch/scope while the PR is pending.

## Results

Cumulative files added/modified/removed, measurable outcome, contributions, actual verification, and remaining limitations.
```

[Shared agent guidance](AGENTS.md) and specialist skills support this workflow. They do not establish unrequested approvals or make instruction text into a security sandbox.
