# 01 - Keep one Preview address - 21 October 2026

## Request

Keith allocated CHG-K-008 for the stable Preview alias, requested a separate branch
containing only this change, commit and pull request, and asked for next steps.
He reports adding the GitHub Preview environment variable. Planned increment:
`chg-k-008-preview-alias`; this is the sole owner log for that PR.

## Results

Created an isolated worktree/branch from `0c7d5ad`, preserving other checkouts.
Wired `PREVIEW_ALIAS` into deployment configuration, validated its hostname before
Preview deployment work, and assigned it only after successful Preview upload and
strict candidate URL parsing. The summary retains the candidate URL and prints the
stable hostname after successful alias assignment. Production does not assign it.
Updated the hosting guide and DEP01/03 operational contract; documented one shared
Preview target and separate live sharing/protection verification. Added workflow
shell regression checks. Exact checks, independent review, limitations and delivery
are maintained in [verification.md](../../changes/CHG-K-008-stable-preview-alias/verification.md).
No provider/account mutation, live deployment or merge is part of this increment.

Local full suite passed 126/126 tests in nine files, full lint passed, workflow YAML
and shell syntax checks passed, and 16 local Markdown targets resolved. Independent
agent verification reproduced the relevant checks and returned no actionable
defects. No live alias or shareable-link persistence result is claimed.
