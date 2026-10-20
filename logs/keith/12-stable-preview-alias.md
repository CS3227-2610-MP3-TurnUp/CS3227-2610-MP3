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

Committed implementation as `264e996` and pushed the dedicated branch. Created and
read back normal [PR #24](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/pull/24) against master with only the ten scoped paths.
Initial PR checks were pending; deployment jobs were skipped. Recorded publication
in the change evidence; the final GitHub check outcome remains visible on the PR.
Next: integrate the workflow into a protected Preview branch, run it, then verify
the same hostname and complete sharing link across a second deployment. A master
merge follows the existing Production workflow; no merge was performed here.

# 02 - Reject Production hostnames from Preview aliasing - 21 October 2026

## Request

Verify the reported Production-hostname collision in CHG-K-008 and fix it before
Preview deployment work, preserving the existing branch/PR scope.

## Results

Confirmed the original regex accepts an existing Production `*.vercel.app` hostname
and the CLI can move that hostname to Preview. Added project/account-scoped,
read-only Production-domain lookup before deployment work and immediately before
alias assignment, with pagination, timeout, fixed diagnostics and fail-closed
metadata handling. Reused the existing Vercel configuration/token; no extra variable
or live provider mutation. Updated operational contract, scenario and setup guide;
expanded synthetic API and workflow-shell regression coverage. Exact results,
independent recheck and limitations are recorded in CHG-K-008 verification.

# 03 - Fix subprocess environment typechecking - 21 October 2026

## Request

Fix the reported PR check failure: the Preview alias test subprocess environment
omits NODE_ENV, which is required by the project's Next.js ProcessEnv types.

## Results

Added NODE_ENV=test to the existing alias test harness and both new safety-test
subprocess environments. Prisma generation, Next route type generation and full
TypeScript checking now pass using the installed tools on Node 24.21.0. The
Corepack wrapper first failed before running checks because its cache directory
was outside the sandbox; direct installed commands performed the same typecheck
script without a package download. Final full lint, 152/152 tests, Prisma schema
validation, workflow YAML and all 20 shell blocks passed. No dependency changed.
Independent recheck includes both the hostname guard and the environment fix.

The independent verifier re-ran TypeScript checking, 152 tests, full lint and
workflow syntax checks with no actionable defects. It also tested the actual CLI
wrapper against synthetic provider/network/JSON errors and confirmed fixed,
non-sensitive failure output. No live provider/API mutation was used.

Committed and pushed both corrections as `9ecf96d` to the existing CHG-K-008 branch;
PR #24 readback confirmed the new head. Updated its description to reflect the
current checks and limits. No new configuration variable is required; no live
Production/domain/deployment operation was performed.
