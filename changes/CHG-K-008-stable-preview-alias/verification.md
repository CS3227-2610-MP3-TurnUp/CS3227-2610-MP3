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

## Follow-up: Production-hostname isolation and PR typecheck

Source correction: `65b845f` plus the current CHG-K-008 working snapshot. The
reported collision is valid: a current Production `*.vercel.app` hostname passes
the original syntax regex and the upload shell passes it directly to alias set.
Vercel's [CLI reference](https://vercel.com/docs/cli/alias) documents reassignment;
its [project-domain API](https://vercel.com/docs/rest-api/projects/retrieve-project-domains-by-project-by-id-or-name)
provides production=true filtering and paginated results. No live destructive
reproduction was attempted. The initial review missed this DEP02/03 defect.

Correction: `.github/scripts/check-preview-alias.mjs` scans the current project's
Production domains (100 per page, at most 20 pages, 10-second per-fetch deadline),
rejects a collision and fails closed for HTTP/network/JSON/schema/pagination errors.
It uses the existing token and team/personal scope, never prints raw responses or
provider errors, and runs before deployment work and again before alias assignment.
There are no new GitHub configuration values. Provider domain changes still need
coordination because checking and assigning are separate, non-atomic operations.

The user also supplied the failed PR typecheck: Next's ProcessEnv requires NODE_ENV
in subprocess env. Corrected the original alias fixture and both new safety-test
subprocess environments to use NODE_ENV=test. Initial local checks had not run
full typechecking; that verification gap is corrected here.

| Follow-up command/check | Actual result |
| --- | --- |
| Node 24.21.0, `node node_modules/vitest/vitest.mjs run` | 152/152 tests passed in 10 files. Covers Production collision (including later pages and normalized DNS spelling), allowed alias, HTTP 401/403/404/429/500, malformed/unavailable metadata, pagination limits, account scoping, inert hostile configuration, fixed diagnostics, recheck failure and Production no-op. |
| Same Node PATH, `node node_modules/eslint/bin/eslint.js .` | Passed full lint. |
| `corepack pnpm typecheck` | Wrapper could not create external Corepack cache (EPERM); no checks executed by this invocation. |
| Same Node PATH, `node node_modules/prisma/build/index.js generate`, `node node_modules/next/dist/bin/next typegen`, `node node_modules/typescript/bin/tsc --noEmit` | All passed; same installed command sequence as package typecheck. |
| Same Node PATH, `node node_modules/prisma/build/index.js validate` | Passed. |
| Ruby YAML parse and Open3 bash -n on every workflow run block | YAML parsed; all 20 shell blocks passed. |
| `git diff --check` | Passed. |

Independent agent `verify_preview_alias` rechecked the correction against `65b845f`
without authorship or implementation edits: no actionable defects. It independently
passed full TypeScript checking using author-generated outputs, 152/152 tests, full
lint, YAML/20 shell blocks and whitespace. Additional CLI-wrapper tests injected
network/JSON/HTTP failures via synthetic fetch: exit 1, empty stdout and fixed stderr
only. Reviewed blobs: guard `44ee71d5ad7fa372f5841790e5792473e1fc3e49`, workflow
`235aaa8324479133a7bf1efdbe71237a0d3cc11c`, safety tests
`c3d179f98f636b629d2945cd31466b90f4fa8d9e`, alias tests
`76569562008a4a65ff46f182aa455324b837b827`, output tests
`d04cf5393dfb292aeae893651d748aca578da108`. No unresolved follow-up findings.

| Finding | Consequence | Disposition |
| --- | --- | --- |
| Production alias collision (high impact, DEP02/03) | Misconfigured Preview could replace Production hostname routing | Corrected with paginated API guard and regression tests; independently rechecked. |
| Missing NODE_ENV (CI failure) | Required PR TypeScript check fails on test subprocess env | Corrected in all affected fixtures; full tsc now passes independently. |

Live provider requests, alias mutations,
deployment and sharing-token checks remain unrun. Updated allowed paths include
the safety script and its synthetic regression tests; no product feature changed.

Correction delivery: committed `9ecf96d02dde6142279ff2913c8fc34ab8bf5f74`
(`fix: reject Production hostnames for Preview`), pushed without force to the same
branch, and confirmed PR #24 reports that head. Updated the PR description with
the current guard, TypeScript fix and 152-test evidence. GitHub-hosted checks are
separate from the passed local checks. This delivery update changes evidence only.
