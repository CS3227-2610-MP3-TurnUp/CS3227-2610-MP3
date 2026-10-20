# CHG-K-008 — Verification

Source: `0c7d5ad`; reviewed implementation snapshot is recorded below.
Human owner: Keith. Primary agent authors implementation; independent verifier
has no authorship. Scope: DEP01–03, DEV01–03, SEC02/06, partial T13/T15/T28.

## Evidence

- Initial worktree clean on master at `0c7d5ad`; created isolated branch
  `chg-k-008-preview-alias` and `.worktrees/preview-alias`.
- User reports saving GitHub Preview variable `PREVIEW_ALIAS`; actual value,
  hostname ownership/availability and live account configuration not inspected.

## Local checks (21 October 2026 working snapshot)

Node `24.21.0` and existing Vitest `5.0.4`/ESLint installation reused through a
local temporary node_modules symlink to the foundation-handoff checkout; its
pnpm-lock.yaml matches this checkout byte-for-byte. No install, dependency or
lockfile change. The temporary symlink is removed before commit.

| Command/check | Result and limit |
| --- | --- |
| `PATH=/Users/keith/.nvm/versions/node/v24.21.0/bin:$PATH node node_modules/vitest/vitest.mjs run tests/hosting/preview-alias.test.ts tests/hosting/deployment-concurrency.test.ts` | 14/14 tests passed after fixing a template-escaping error in the new synthetic stub. Executes actual workflow shell blocks with a stubbed CLI. |
| Same Node PATH, `node node_modules/vitest/vitest.mjs run` | Final 126/126 tests passed in 9 files. First full run had two old Preview output fixtures missing PREVIEW_ALIAS; added the synthetic variable and reran successfully. No live provider/database checks. |
| Same Node PATH, `node node_modules/eslint/bin/eslint.js .` | Passed for the full checkout. Targeted lint on both changed test files also passed. |
| Ruby `YAML.load_file` of `.github/workflows/vercel-deploy.yml`, asserting deploy job | Passed; syntax/structure only, not a GitHub-hosted execution. |
| Python extraction of explicitly indented literal run blocks piped to `bash -n` | All 12 extracted shell blocks passed; independent reviewer checked remaining run blocks separately. |
| `git diff --check` | Passed. |
| Python local Markdown target check across 7 changed Markdown files | All 16 targets exist. |
| `gh api repos/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/commits/master --jq .sha` | Remote base still `0c7d5adda285ba07b931d6e1e05ab6a928f2c7e7`; no existing PR for the new branch. |

Injection check: supplied literal `$(printf UNAUTHORIZED_EXECUTION >&2).vercel.app`
as PREVIEW_ALIAS, together with an untrusted source-comment instruction. The actual
trust-check shell rejected it, stderr contained no execution marker, and no CLI
alias call occurred. No arbitrary file/provider operation followed the fixture.
This bounded deterministic case does not prove general injection resistance.

## Independent agent review

Independent implementation verifier `verify_preview_alias` did not author the
change and reviewed the final working implementation against `0c7d5ad`, including
workflow, both test files, operational contract/scenario and setup guidance.
Reviewed Git blob identifiers: workflow `00a268ba5a4ce5ec3b29f72ad6a08b8bb32bca23`,
alias test `122e0e9e280727517a0bc28cb1103c66b83dd6db`, output test
`d1a1adca2f277f11f81116d22739d439b80ec064`, hosting guide
`b33bf260c9451ea11b91f9fa1d334734ccf80b84`, deployment contract
`06354b0c02d47501e41e6adf8f7f4ee818e9a0be`, acceptance scenarios
`8686ad1aedef6077d26e4a924142a934e220c036`.

No actionable defects found. Independently reproduced 126/126 full tests, 58/58
targeted hosting tests, lint on both affected tests, YAML parsing, `bash -n` on all
19 run blocks (11 explicitly Bash), and whitespace checks. No implementation edits
were made by the reviewer. Live provider, alias availability, authentication and
share-token behaviour remain unrun. No unresolved review findings.


## Limits and next steps

No deployment, alias reassignment, production access or sharing-token creation
performed. No full application acceptance scenario is passed. Live first assignment,
reassignment across Preview uploads, authentication on the plain hostname and
shareable-link persistence require a separately authorised Preview run after the
workflow is integrated. All allowed Preview branches share one alias; latest
successful assignment wins. CLI failure may leave an uploaded deployment present.

## Delivery

Committed reviewed implementation as `264e99631592bacd9f4302724130b80a476489b5`
(`ci: keep a stable Preview deployment alias`) and pushed the isolated branch
without force. Created normal [PR #24](https://github.com/CS3227-2610-MP3-TurnUp/CS3227-2610-MP3/pull/24), base master, head
chg-k-008-preview-alias. GitHub readback confirmed open/non-draft state, exact head,
title, body and ten scoped changed paths. Initial Actions run `39463015684` has
PR checks pending and deployment/verification/promotion jobs skipped. No merge or
deployment occurred. This delivery record is an evidence-only follow-up; reviewed
implementation blobs are unchanged. Final CI outcome can be read on the PR.
