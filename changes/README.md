# Change records

Use a `CHG-<OWNER>-NNN-short-name/` directory for each bounded change. Canonical requirements live in [specs](../specs/README.md); these records capture intent, tasks, and actual evidence. Template text is not proof of completion or an approval.

## Change ID allocation

- Format: `CHG-<OWNER>-NNN-short-name/`, where `K` = Keith and `D` = Darryl. Examples: `CHG-K-001-account-foundation/` and `CHG-D-001-event-publication/` can coexist.
- Each human allocates their own monotonically increasing, zero-padded number (at least three digits). Start new sequences at `001`; retain existing migrated numbers, including Keith's setup change `CHG-K-000`. Never reuse an allocated number, including archived or abandoned changes.
- Before allocating, account for that owner's active, archived, and already assigned work on other branches. For concurrent agents under one human, the human/coordinator allocates distinct IDs in the assignments before dispatch. An agent without a confirmed allocation obtains one from that owner rather than guessing from its local checkout.
- The ID stays stable through implementation, review, archive, and later ownership transfer. Record the current accountable human in `change.md`; the prefix records the original allocating human. A change has one primary human owner even when both members contribute.
- Numbers identify changes; dependencies are explicit in `change.md`/`tasks.md`. Unassigned roadmap work uses `WP-NNN` labels until assigned an actual owner-prefixed change ID. Do not create directories merely to reserve roadmap items.
- Each member uses a separate clone/worktree and branch. Use one active writer per file and a named owner for shared contracts/schema changes; integrate prerequisites first and rerun affected checks.

| File | Contents |
| --- | --- |
| `change.md` | Intent, scope/exclusions, source/spec revision, IDs, ownership, decisions and acceptance |
| `tasks.md` | Ordered tasks, file writers, reviewers, dependencies, checks and handoffs |
| `verification.md` | Actual checks, findings, dispositions, limitations and completion evidence |
| `design.md` | Optional material technical design explanation |

- Copy [_template/change.md](_template/change.md), [_template/tasks.md](_template/tasks.md), and [_template/verification.md](_template/verification.md) for future assigned work. Replace `<OWNER>` with `K` or `D` and `NNN` with the allocated number. Record human ownership and dependencies.
- [CHG-K-000 — SDD repository setup](CHG-K-000-sdd-repository-setup/change.md) records the initial scaffold; application implementation remains future work.
- `archive/` is reserved for completed change records. Preserve evidence and update incoming/relative links when moving them.

Change records and member logs have different granularity: record the shared PR/increment and its designated owner log in each change. Several changes in one PR reuse one log under the [member log policy](../CONTRIBUTING.md#member-logs); each substantial human prompt appends its own Request/Results entry, and creating another change record within that PR does not create another log file.

Follow the [review policy](../CONTRIBUTING.md#review-records): obtain independent agent review of the completed implementation change and final GitHub review after an authorised push. Standalone specification audits require explicit assignment. Agents do not assess human reviewer assignment, independence, approval, sign-off or merge readiness from any source. Keep concise agent findings/checks/revision/limitations in verification.md rather than repeating review-passed statuses across documents; evidence/log-only updates do not restart review.

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) and [the implementation plan](../specs/implementation-plan.md). Do not create future application changes or mark their scope complete simply to populate directories.
