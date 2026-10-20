# CHG-D-002 — Verification

Source/spec base: `0c7d5adda285ba07b931d6e1e05ab6a928f2c7e7`, foundation `05e1b42`, B1/D12/D13; approved plan v1 and policy snapshot 20 October 2026. Human owner: Darryl. Evidence writer: parent. Independent completed-implementation reviewer: `/root/verify_signup_login` (non-author, completed review below).

## Current evidence

| Actor / check | Actual result | Limit |
| --- | --- | --- |
| Parent: status/source/tooling inspection | Source and absence of installed dependencies/local database file confirmed; five unrelated tracked agent edits preserved | Not application runtime evidence |
| Prior read-only explorer and analyst | Plan provenance limits, foundation readiness and proposed policy mapped | Neither implementation nor independent completed-change review |
| Human plan decision | Darryl explicitly said “approved” to plan v1/defaults | No joint G02 decision, manual acceptance, commit or deployment authority implied |
| Local feature branch | Created `codex/wp-002-signup-login`; initial sandbox write to Git refs failed, narrowly scoped elevated retry succeeded | No commit/push; unchanged source base |

## Implementation and deterministic checks

Implementer `/root/signup_login_implementation` used the instructed worker fallback at High reasoning and froze the integrated source on 20 October 2026. Actual runtime was Node **24.19.0** (within the supported engine range), not the unavailable `.nvmrc` pin 24.21.0; Corepack installed the pinned pnpm **12.14.0**. Existing dependency versions and lockfile are unchanged.

| Check / exact command | Actual result | Limit / correction |
| --- | --- | --- |
| `corepack pnpm install --frozen-lockfile` | Passed | Initial Corepack cache write failed EPERM; narrowly scoped elevated install succeeded. No new runtime dependency or lockfile change. |
| `corepack pnpm db:generate`; `corepack pnpm db:validate` | Passed | Generates/validates Prisma schema only; no migration applied or SQL connection established. |
| `corepack pnpm typecheck` | Passed in worker run | Final small logout client-navigation edit occurred later; independent final reproduction pending. |
| `corepack pnpm lint` | Final pass, zero errors/warnings | Corrected logout navigation warning with Next router replacement/refresh. |
| `corepack pnpm test` | Earlier complete run **163/163** across 14 files; final concurrent-load repeat **162/163**, with all **48/48 auth tests** passing | Existing Git Bash hosting subprocess exceeded its 5-second timeout at 7.056 seconds during concurrent work. No expectation or timeout was weakened. |
| Failed hosting file isolated rerun | **24/24 passed**, 22.14-second total | Explains the transient full-repeat failure; independent final sequential result pending. |
| `corepack pnpm build` | Credential-free Next 16.3.8 production build passed | Static signup/login and dynamic protected routes compiled; final logout navigation edit followed this worker build, so independent final build is required. |
| `corepack pnpm test:auth:db` without opt-in | Refused before execution, **0 SQL tests** | Demonstrates refusal only. Six gated live SQL tests remain not run without an assigned verified Darryl-owned synthetic database. |
| `git diff --check`; historical migration/lockfile comparison | Passed; existing migration history and lockfile unchanged | Only one additive account migration was authored; applying it is separate. |

The initial new test configuration broadly aliased `server-only`; the existing foundation poison test caught this and the author corrected it to per-auth-test mocks. The default production boundary remains exercised. The author also used one materialized database timestamp for session creation/absolute expiry. These corrections are included in the frozen source; independent review/reproduction follows below.

Windows verification setup: add `C:\Program Files\Git\bin` to the command process PATH for existing hosting shell checks. Those checks parse the checked-in LF workflow; its initially unmodified CRLF checkout failed 24 hosting cases. Parent normalised 320 local CRLF lines to LF only after verifying its normalised Git blob matched HEAD, then verified the same blob and empty workflow diff afterwards. No workflow/test semantics changed. This setup is not a deployment result.

## Local browser checks

Parent ran `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1` with process-only synthetic local authentication settings, `AUTH_ORIGIN=http://127.0.0.1:3000`, local source mode, a non-production synthetic digest secret and **empty database URLs**. No credential file or network database was used. The temporary browser tab was closed, viewport override reset and dev process stopped after checks.

| Actual local action | Observed outcome | Limit |
| --- | --- | --- |
| Signup form inspection at 320px and 375px; desktop login at 1280px | Labels, policy/recovery disclosure, fixed role selection and readable layouts; document widths 305/360/1280 respectively, with no horizontal overflow | Local UI only; screenshots observed through the browser tool, not a complete accessibility certification. |
| Invalid username signup | HTTP **400**, clear validation message, username/Organiser choice visibly retained, password empty, error focus; Tab advanced to username | No account creation or SQL. Browser's privacy-redacted DOM prevented exact username-value comparison; the screenshots visibly retained the synthetic value. |
| Valid-shaped synthetic signup with database URL absent | HTTP **503**, truthful unavailable notice, no success claim, username/role retained and password cleared | Deliberately tests configuration failure, not database availability or transaction success. |
| Short-password login | HTTP **400**, visible password policy error, password cleared | Does not establish valid/unknown/wrong login against persisted accounts. |
| Anonymous navigation to `/student` and `/organiser` | Each HTTP **307** to `/login`; no protected identity shown | No authenticated cross-role browser flow without database access. |

Next dev generated a managed suffix in `AGENTS.md` and dev type paths in `next-env.d.ts`. Parent verified the generator's source, stopped dev and removed only that generated suffix after confirming the remaining content matched original HEAD; AGENTS has no feature diff. Final type/build generation restores ordinary type paths. Existing five local agent-definition edits remain preserved. Generated instructions do not authorise publishing agent customisations.

## Independent implementation review

Non-author `/root/verify_signup_login` reviewed the completed integrated working diff on `codex/wp-002-signup-login` against base `0c7d5adda285ba07b931d6e1e05ab6a928f2c7e7`, fresh canonical contracts and complete affected scenarios. It did not edit implementation/specs/logs/records. Its reported aggregate SHA-256 snapshot of 32 implementation/configuration/test/README files is `abdb1562148cc66fe4ef80e92771a59a384f75f99aff8bca84cd370efda28e36`. Parent evidence/status-only updates followed; no product code changed after review.

**Findings: no actionable defects.** It inspected atomic signup/session creation, immutable roles, credential policy/hashing, strict origin/source handling, shared admission SQL, cookies, expiry/revocation, safe failure/cache behaviour, additive migration consistency and meaningful checks. No corrective implementation recheck was needed after this independent review.

| Independent sequential check | Actual result |
| --- | --- |
| `corepack pnpm typecheck` | Passed on the final implementation, including final logout navigation edit |
| `corepack pnpm build` | Passed; auth routes and `/student`/`/organiser` dynamic; protected pages not prerendered |
| `$env:PATH = 'C:\Program Files\Git\bin;' + $env:PATH; corepack pnpm test` | **163/163 passed across 14 files**, including all 48 auth tests; earlier transient hosting timeout did not recur |
| `corepack pnpm lint` | Passed |
| `corepack pnpm db:validate` | Passed |
| `git diff --check` | Passed |
| `git diff --exit-code -- AGENTS.md next-env.d.ts .github/workflows/vercel-deploy.yml prisma/migrations/20261018000000_foundation_probe prisma/migrations/20261019000000_soc_probe_gate pnpm-lock.yaml` | Passed; original instructions/workflow/history/lockfile and ordinary generated type references preserved |
| Clear `RUN_AUTH_DB_INTEGRATION`, then `corepack pnpm test:auth:db` | Expected exit **1** at explicit owner/opt-in gate, **0 tests**, no database connection |

Independent runtime: Node **24.19.0**, pnpm **12.14.0**. Exact Node pin 24.21.0 was unavailable. An in-memory untrusted source-comment/credential fixture requested unrelated reads/commands/marker creation/scope expansion; these instructions were not followed, the unknown credential instruction field was rejected, and its marker stayed absent. This finite observed check establishes neither universal injection resistance nor hosted application behaviour.

The reviewer did not reproduce parent browser observations, live SQL, migration execution, hosted source attribution or authenticated browser success. Its read-only review is independent agent evidence, not human GitHub approval or release authority.

## Initial handoff limits — superseded by subsequent live evidence below

The bounded code/schema/UI/tests are authored, independently reviewed without actionable defects, and verified locally as above. Do not label mocks as live database evidence or whole T01/T02/T16/T32/WP-002 as passed. G01 credential/profile policies and joint G02 recovery policy remain deferred. Real SQL/concurrency, successful browser signup/login/logout/cross-role flows and hosted configuration/source/cookie/persistence checks remain unrun without assigned access and authorised delivery. No hosted/provider/production operation was performed.

Next bounded prerequisite: Darryl obtains an explicitly assigned synthetic non-production Neon target and privately configures the matching pooled/direct URLs and new server-only auth settings. Keith coordinates schema/migration integration; apply the new migration only within that assigned target/release authorisation. Run the six gated SQL tests and the success-flow checklist before claiming integrated account behaviour. No database was provisioned, migrated, queried or reset in this increment. User's clarification question about the database was answered; it did not supply access or authorise provisioning.

## Initial manual acceptance handoff — subsequent results below

| Setup / action | Expected outcome | Evidence now |
| --- | --- | --- |
| Assigned synthetic database, all migrations, matching auth origin/source/digest configuration; create separate Student and Organiser accounts | One account/session per valid signup; redirect to stored-role destination, refresh retains identity | Pending database access |
| Try uppercase/whitespace-equivalent duplicate names and race the final signup | One canonical owner, no losing account/session; clear unavailable-name feedback | Deterministic checks; real SQL/browser race pending |
| Invalid username/password; then unavailable database | Clear error, safe username/role retained, password cleared, focus/keyboard path usable | Locally observed HTTP400/503 and browser UI |
| Anonymous open each role URL | Redirect to login, no protected identity | Locally observed both HTTP307 redirects |
| Log out; replay prior cookie; log back in; visit other-role URL | Revoked token denies, fresh token authenticates, other role cannot read protected content | Deterministic checks; persisted/browser success pending |
| Advance controlled SQL clock to exact idle/absolute boundaries; race admission requests | Exact expiry denies; counter caps cannot overshoot across instances | Gated SQL tests written; not run |
| Check narrow/wide keyboard/error/pending/recovery states | Readable, no horizontal overflow or password echo; truthful current recovery limit | Parent local 320/375/1280px observations; human acceptance not supplied |

Final scope: 32 implementation/configuration/test/README paths plus 13 plan/spec/change/log paths (45 feature paths). Five pre-existing local agent-definition edits are separate and preserved. Parent is the final writer of README's schema-status row after a sequential transfer; no code overlap occurred. `specs/README.md` and implementation-plan status sentences were reconciled as non-behavioural dependent documentation, not a new product scope. Exact path list is discoverable from the working diff and untracked feature files; no commit hash for uncommitted work is invented. Account/session/guard consumer interfaces and remaining database boundary are in [integration handoffs](../../specs/integration-handoffs.md).

Final parent structural check: whitespace passed for all **45** feature files, **128** local Markdown file targets resolved, `git diff --check` passed, baseline artifact comparison passed and the staged-path list was empty. The initial link helper mishandled the root README's empty relative parent path; it was corrected to absolute paths with terminating errors before these final results. External links/anchors were not exhaustively revalidated. No application checks were repeated for these evidence-only edits.

## Subsequent private setup — 20 October 2026

Darryl reported creating `dev/darryl`. `.env.local` now exists and database/local auth fields are populated; checks emitted presence flags only. Parent filled only its blank authentication throttle secret using 32 random bytes, validated the parsed candidate/secret shape and equality of all other settings before writing, and confirmed the file is ignored. An initial line-separator insertion failed pre-write validation without changing the file; the corrected line-only helper succeeded. No product code changed and no secret was recorded here. At this stage both URLs' provenance awaited explicit confirmation; no SQL result or identity was inferred from configuration presence. Subsequent confirmation and live preflight are recorded below.

## Authorised live preflight — connectivity blocked

On 20 October 2026 Darryl explicitly confirmed that both private URLs were copied from `turnup-nonprod` / `dev/darryl`, after the parent proposed target validation, account migration and real tests. The specialist `/root/verify_darryl_database` received bounded metadata/existing migration/synthetic-check authority on this target only; no shared/Production target, provisioning, provider call or deployment was assigned.

| Check | Actual result | Limit |
| --- | --- | --- |
| Private configuration shape/labels | Development/non-production; pooled/direct pair on `turnup`, ap-southeast-1 | Names are human-confirmed; actual server project/branch IDs remain unread |
| Specialist pg metadata query, six-second connection budget | Initial sandbox EACCES; escalated pooled and direct attempts both timed out | No metadata/query result, migration or SQL test |
| Parent pg metadata retry, IPv4-first, 20-second connection/10-second query budgets | DNS returned IPv4 addresses; both connections timed out | No successful authentication or actual target identity established |
| Parent raw TCP diagnostic to direct endpoint, 10-second bounds | Port 443 connected; port 5432 timed out | No credential or PostgreSQL query sent; narrows failure to the database connection path, not a proven specific firewall/VPN/endpoint cause |
| Private direct URL TLS normalization | Exactly one `sslmode=require` and `sslaccept=strict`; parsed candidate preserved target/credentials and all other settings | Local configuration only; secret untouched, no target change or DB write |

Darryl reported school/work Wi-Fi or VPN after the transport result. An appropriate alternate connection was requested; agents changed no network/security setting. Runtime and migration remain pending that external change. No migration status/deploy, synthetic SQL fixture, database cleanup or authenticated browser success check was executed in this preflight. Existing independent source/local test results remain valid at the same implementation snapshot. Resume with target metadata first, then migration/status and six SQL checks; do not treat HTTPS reachability as database readiness.

## Resumed assigned-database checks — 20 October 2026

After Darryl replied “ready”, pooled/direct metadata checks succeeded with certificate validation: database `turnup`, PostgreSQL 18.6, project `wispy-queen-37021878`, branch `br-purple-lake-az9zx6rm`. The branch name `dev/darryl` is human-confirmed; its observed ID differs from known Keith/Preview IDs. Specialist `/root/verify_darryl_database` rechecked before writes. Prisma status initially found only `20261020000000_accounts` pending (exit 1); `migrate deploy` applied that checked-in migration (exit 0), then status reported up to date (exit 0). No reset or new migration was performed.

The first live suite passed five of six cases; the shared-source throttle race admitted fewer than 30 of 35 attempts. Its original assertion did not distinguish intended 429 denials from unexpected database failures; raw output was discarded after sanitisation. The author added strict rejection assertions and safe class/status/code/count diagnostics, retaining original concurrency and caps, for a diagnostic rerun. No runtime product code changed. Subsequent outcome is recorded below.

Parent browser checks used the existing production build locally at `http://localhost:3000`, private development/non-production settings and the assigned pooled database. An initial sandboxed server returned truthful unavailable feedback; restarting it with narrowly approved database network access enabled success. No application or database security setting was weakened.

| Browser action | Observed result |
| --- | --- |
| Synthetic Student signup and refresh | Automatic `/student` navigation; canonical username and Student identity retained |
| Student visits `/organiser` | Access unavailable; no Organiser content |
| Logout then visit `/student` | Login page; protected identity absent |
| Wrong password | Generic incorrect-credentials error; username retained, password cleared |
| Correct password with uppercase equivalent username | Successful login to stored Student role |
| Whitespace/uppercase equivalent duplicate signup | Unavailable-name feedback |
| Synthetic Organiser signup and refresh | Automatic `/organiser` navigation; identity retained |
| Organiser visits `/student` | Access unavailable; no Student content |
| Organiser logout, then login | Login page followed by successful persisted Organiser login |
| Final logout | Login page visible; temporary test tab closed |

Only two uniquely named parent QA accounts were created; exact names were handed to the specialist for scoped cleanup, including cascading sessions. Source/name throttle records expire normally. The local server remains available for Darryl. These are agent observations, not human acceptance or hosted/Vercel evidence. Credential/profile editing, joint G02 and whole-package/event integration remain outside this verified slice.

Diagnostic rerun: **5/6 passed**, shared-source race **28/35 admitted**, seven rejections all Prisma `P2028`, no HTTP status. This establishes transaction failures, consistent with bounded acquisition/transaction expiry, without identifying which underlying limit fired. It does not establish intended 429 admission behaviour at 35-way load. The original author adjusted only the SQL test to fill 25 slots in five concurrent waves and race ten callers for five remaining slots. Exact total 30 admissions and five actual AuthError429 denials are required; username9/signup14 races remain unchanged. Runtime limits/timeouts/caps are unchanged. Original35-way availability failure remains a limitation.

The intermediate diagnostic helper was independently reviewed by non-author `/root/verify_signup_login`: no actionable defects; focused ESLint/typecheck and isolated actual-helper semantics/privacy checks passed. It accepted valid results, rejected shortfalls/storage errors/AuthError503 and excluded synthetic private markers from diagnostics. Intermediate file SHA256: `0c87564f1d45434d9a79629b03c172afbc82e46fc65983369fbe722a752ee5c8`. Final-wave review/results follow.

Browser-fixture cleanup: specialist deleted only the exact two assigned QA usernames, each already logged out with zero sessions. Post-check found zero matching accounts and sessions. No other account rows or browser throttle rows were deleted. All SQL-suite runs completed their scoped afterAll cleanup without hook errors.

Final bounded-wave SQL suite: **6/6 passed**, exit0, after both endpoints again matched the exact assigned database/project/branch. `VERCEL_ENV` was absent. Scoped fixture cleanup completed without hook error. This supplies live evidence for canonical signup races, rollback/immutable roles, session replacement/logout/replay, exact idle/absolute expiry and revoke races, bounded concurrent admission caps and stale-window cleanup. It does not erase the original35-way transaction-availability limit or supply hosted cookie/source/persistence, credential/profile/event or full WP-002 acceptance.

Final non-author test review: `/root/verify_signup_login` found no actionable defects in the bounded-wave correction; independently passed focused ESLint, TypeScript and isolated actual scheduling checks (35 distinct names attempted, max concurrency10, exactly30 admitted, all remaining failures429). Final test SHA256: `662349195604ac3e9f5d9c232691b0147e7278d63e541228306d8f46406015ab`. No DB or file mutation by reviewer. Earlier32-file aggregate describes the runtime snapshot before these test-only edits; runtime product code is unchanged. No full-suite/build repeat was necessary for this isolated SQL test change.

Final parent check: seven updated records passed whitespace and70 local file-link targets; git diff --check passed and staging remained empty. Running local signup URL returned HTTP200. Existing local agent edits remain preserved and unpublished. No commit/push/PR/merge/provision/deploy operation occurred.

## Authorised signup UI refinement — 20 October 2026

Darryl approved the cleaner one-page signup proposal with “do it”. Original implementer `/root/signup_login_implementation` changed only the shared auth component and auth-specific CSS selectors. The form now has a concise heading/account link, one required-fields statement, visible native role radios with immutable-role guidance, short field hints, password Show/Hide and quiet readable no-recovery disclosure before submit. Login shares consistent controls. Default Student, API payload/POST, server-enforced policy and error preservation/focus remain unchanged. Password remains uncontrolled/ref-held, hidden by default, cleared and hidden on submit, with autocomplete/paste and no autocorrection/spellchecking. No schema/server/dependency or policy change.

Author passed focused ESLint, typecheck and whitespace. Parent ran `corepack pnpm build`: passed with all original route types retained. Rebuilt local Next start uses the existing private assigned development configuration; no new database fixture/write or migration was needed. The earlier live SQL evidence is not rerun or relabelled as new UI evidence.

| Parent browser check | Observed result |
| --- | --- |
| Signup375px,320px and1280px | Readable native role choices/labels/controls/recovery text; no horizontal overflow (375/375,305/305 with scrollbar at320,1280/1280 client/scroll widths) |
| Login375px | Matching simpler form; no role selector |
| Keyboard ArrowRight on Student | Organiser selected, native radio semantics |
| Password Show/Hide | Correct type and accessible label; toggling does not submit |
| Submit invalid username after revealing password | Server validation shown; safe username/Organiser retained; password cleared/hidden; alert receives focus |
| Tab from error | Selected role radio reached in logical form order |
| Clean screenshot/handoff |375px signup screenshot saved outside repository; viewport restored and temporary tab closed; rebuilt server remains running |

No new live successful-account fixture was created; real persisted signup/login was verified before this presentation change and component payload/pending behaviour was independently exercised below. Native browser pending timing, formal screen-reader/zoom audit and hosted behaviour are not newly claimed.

Non-author `/root/verify_signup_login` independently reviewed final two-file source with **no actionable defects**. It passed focused ESLint, `git diff --check`, `corepack pnpm exec tsc --noEmit`, and an isolated harness of the actual component covering role selection, Show/Hide, pending controls, unchanged POST payload, password clearing/hiding, retained username/role and error focus. Its finite untrusted fixture caused no observed unrelated file/command/scope effects. Reviewer did not edit files or run browser/server/database operations. Final SHA256: component `3bf1b4c07d9a10eeeb24511d1025ae8efc4989c446c30445d679cec776673b91`; CSS `a49e91b4bd49e81530f9256453e37ab80da46441aaed026683f521e0d55920e4`. No runtime source changed after this review. Full163-test suite and six SQL cases are prior feature evidence, not newly executed for this two-file presentation refinement.

## Minor UI follow-up — 20 October 2026

Darryl explicitly requested direct single-agent execution to minimise tokens. Parent updated only the auth component and password CSS: removed required-fields/role/format hint copy and error retention commentary; placed20px eye/slashed-eye SVG inside a44px accessible password button. Native required validation and server error messages remain. No server/rules/schema/dependency changes, no agent dispatch or new independent review for this follow-up (explicit human exception). Previous review hashes describe the earlier UI, not these final edits.

Focused ESLint, `corepack pnpm typecheck`, production build and `git diff --check` passed. Parent browser observed blank submission's native “Please fill out this field” warning and username focus; eye toggle revealed/hid the password with updated accessible label; invalid username displayed only its format error; short password displayed only its length/spaces guidance. Submission still cleared/hid password. Signup320/375px had no horizontal overflow; matching login showed no static helper text. Clean375px screenshot saved outside repo; viewport reset and temporary tab closed. Rebuilt server remains running. No successful-account/database fixture was needed, and no hosted/full-suite/SQL/zoom/screen-reader pass is claimed. An initial CSS text replacement did not match LF line endings; corrected matching before the final lint/types/build/browser checks. Unrelated docs/agent-usage.md and local agent edits preserved.
