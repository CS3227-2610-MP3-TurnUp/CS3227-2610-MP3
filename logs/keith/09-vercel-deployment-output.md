# 01 - Correct Vercel deployment output capture - 20 October 2026

## Request

Perform the remaining deployment fixes after Keith supplied the failed URL-capture log and screenshots showing the uploaded candidate as Production / Staged. This is a new planned PR increment within CHG-K-005 after PR #19; current worktree branch `fix-vercel-pnpm-install` is retained. No commit, push or deployment was requested.

## Results

Updated `.github/workflows/vercel-deploy.yml` to separate captured CLI results for upload and the HTTPS smoke check, preserving failed CLI exits and the existing staged/candidate/promotion sequence. Added `.github/scripts/read-vercel-output.mjs` to recognise only the exact known Vercel 58.4.4 lockfile diagnostic and require one validated URL/status; unexpected output fails without being echoed. Removed redundant `--prod` while retaining the explicit Production target and `--skip-domain`. Added `tests/hosting/vercel-output.test.ts`, updated the setup guide, and appended CHG-K-005 scope/tasks/verification evidence.

Pinned source inspection and an existing-store YAML parser reproduced the two-document lockfile incompatibility; no lockfile or dependency edit was made. The diagnostic remains a visible compatibility warning, not a claimed upstream parser repair. Focused checks passed 46/46, the default suite passed 114/114, and corrected typecheck, full lint, YAML/all 19 shell-block syntax checks and whitespace checks passed. The initial new test harness lacked required `NODE_ENV`; that was corrected before final typecheck and independent reproduction.

Independent agent `review_deployment_output` initially failed twice due to a sign-in token error, then completed after Keith's Continue message. It authored no implementation, reproduced all checks above plus the helper syntax check, and reported no actionable defect. It also performed a harmless development injection check without executing the fixture's requested effects. Exact reviewed hashes, commands and limitations are in [verification.md](../../changes/CHG-K-005-wp-001-hosted-feasibility/verification.md).

Owner-supplied screenshots establish the reported candidate as Production / Staged; browser automation supplied no independent hosted evidence. No secrets were accessed or changed. Public source was fetched read-only; no application build, database operation, deployment, promotion, provider call, commit or push was performed for this correction. Changes remain local on `fix-vercel-pnpm-install`; the corrected workflow still needs an authorised hosted run after delivery. Full T15/T28 and G04/G08 are not closed by these local checks.


# 02 - Commit and publish the deployment output fix - 20 October 2026

## Request

Check whether further changes are needed; if none, commit the reviewed correction on a new branch and push it.

## Results

No further implementation change was identified: all four implementation hashes match the independent review snapshot and its recorded passing checks remain applicable. Fetched current `origin/master` at `60e5630` (PR #19 merge), then created `fix-vercel-deployment-output` from that revision while preserving the reviewed changes. The integration base contains the original review base with no intervening file-content difference, so no implementation recheck was required. This prompt authorises one logical fix commit containing the workflow, output reader, regression checks, setup guide and CHG-K-005/log evidence, followed by publication of this new branch only. Final commit and remote read-back results are reported in the delivery response; no application deployment, promotion or merge is part of this delivery.
