# 01 - Correct Vercel pnpm install fallback - 19 October 2026

## Request

Verify the empty Vercel install-command workaround for the failed post-merge Production build, then commit the fix and open a new pull request against `master`. This is a separate [PR #19](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/pull/19) increment on `fix-vercel-pnpm-install` within CHG-K-005.

## Results

The existing uncommitted `vercel.json` edit was retained and its final newline normalized. The setup guide now explains why the workflow's same-job frozen pnpm install precedes a Vercel build with the install override. CHG-K-005 change, tasks and verification records capture the failed Actions run, scoped correction and actual checks. A sandboxed local install first failed to reach the npm registry; the restored frozen install then passed with network access. Lint, 91 tests, typecheck, local production build, JSON/workflow assertion and whitespace checks passed with Node 24.21.0. An independent verifier reviewed the two-file implementation against pinned Vercel 58.4.4 source, reproduced four installer-branch cases and found no actionable defect; exact hashes, findings and limits are in [verification](../../changes/CHG-K-005-wp-001-hosted-feasibility/verification.md). A real Vercel build, migration, upload and promotion remain unrun, so this increment does not establish a deployed fix. The reviewed implementation and initial evidence were committed as `0ac06b98da2d8ccb300991ca97771618b88d59ec` and pushed; PR #19 is open against `master`. The PR link and delivery status are evidence-only updates.
