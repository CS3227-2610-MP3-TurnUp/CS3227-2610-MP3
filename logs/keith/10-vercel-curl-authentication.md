# 01 - Correct candidate smoke CLI authentication - 20 October 2026

## Request

Fix the `verify-promotion-candidate` failure reported after merge to master: Vercel CLI 58.4.4 obtains Deployment Protection bypass, then system curl rejects the forwarded `--token=…` argument. This is a new planned PR increment within CHG-K-005 from local source `802cdfa`.

## Results

Updated `.github/workflows/vercel-deploy.yml` to authenticate the protected smoke command using its existing step-scoped `VERCEL_TOKEN` environment variable, supported by the pinned CLI source. Added executable-shell argument/environment regression coverage in `tests/hosting/vercel-output.test.ts`, updated `docs/wp-001-hosting-setup.md`, and appended scope/tasks/evidence to CHG-K-005. The new regression failed on the original token argument and passed after the fix.

Focused checks passed 47/47; default tests passed 115/115 across eight files. Lint, typecheck, YAML loading, all 19 shell-block syntax checks and whitespace checks passed on Node 24.21.0 / pnpm 12.14.0. Initial use of the shell's Node 22/default Corepack cache failed before tests; the existing runtime and temporary cache resolved it without installation. Independent agent `review_curl_auth` found no actionable defect, independently reproduced focused/default tests and relevant syntax/lint checks, confirmed pinned source token handling, and performed a harmless development injection check without executing its requested effects. Exact review evidence and limitations are recorded in [verification.md](../../changes/CHG-K-005-wp-001-hosted-feasibility/verification.md).

No secrets or dependencies changed. No build, database/migration, live provider request, Vercel deployment/promotion, commit or push ran. The correction remains local; hosted behavior requires a subsequent workflow run. Full T15/T28 and G04/G08 remain open.


# 02 - Commit and publish candidate smoke authentication fix - 20 October 2026

## Request

Commit the reviewed CHG-K-005 candidate smoke authentication correction on a new branch and create a pull request against `master` using a delivery agent.

## Results

Fetched `origin/master` at `aac2fcc142165d2d8da1c3af4d10c79466aa72c8`, containing prerequisite `802cdfa`, then created `fix-vercel-curl-authentication` from that base. Committed the seven assigned paths as `3f5db5d44fedc5ed05303f54b26e81376e2ccdd8` (`fix: correct Vercel curl authentication`) and pushed the branch. Remote `git ls-remote` matched the commit. Opened [PR #21](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/pull/21) against `master`; `gh pr view` read back the expected open state, base, head and description. The final branch diff whitespace check passed. The PR records the 47 focused / 115 default passing tests, lint, typecheck, YAML and shell checks, independent review, synthetic failure reproduction, and limitation that no live hosted workflow rerun has occurred. No merge, deployment or promotion occurred.
