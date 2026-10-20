# WP-002 signup and login — approved plan v1

Prepared 20 October 2026 for Darryl's `$turnup-iterate-feature WP-002: Implement signup and login` request. **Darryl explicitly approved this plan and its defaults in the next human message, “approved”. Implementation is authorised; verification is recorded separately.**

## Source, provenance and prerequisite

- Working source/spec revision: `0c7d5adda285ba07b931d6e1e05ab6a928f2c7e7` on local `master`, B1/D12/D13. Reviewed foundation source `05e1b42c69ce57d389172a5b0c290d08ff0c729e` is integrated.
- Consume the [foundation handoff](../../changes/CHG-K-006-foundation-handoff/verification.md#foundation--accounts-handoff), [accounts contract](../../specs/shared/accounts-and-access.md), [AI/privacy contract](../../specs/shared/ai-and-privacy.md), logical User contract in [domain/data](../../specs/shared/domain-and-data-contracts.md), [WP-002](../../specs/work-packages/wp-002-accounts.md), [decisions](../../specs/decisions.md), [ownership](../../specs/implementation-plan.md) and [acceptance scenarios and coverage](../../specs/verification/acceptance-scenarios.md).
- Database foundation evidence is delivered for synthetic non-production integration. Outstanding SoC provider evidence does not block this feature. At plan preparation the checkout had neither `node_modules` nor `.env.local`; frozen dependencies and local checks are now available, but the assigned database configuration/live access remain absent. Actual results are in [change verification](../../changes/CHG-D-002-signup-login/verification.md).
- Earlier conversation context referred to an approved account plan, but neither that plan nor its exact policy/approval record exists in this checkout or the local account-plan branch. The read-only explorer found no recoverable committed/stashed/unreachable copy. This does not revoke a previous human decision; it prevents claiming this newly detailed policy is the same approved version. Reuse an exact supplied earlier decision instead of asking again if it becomes available.
- Human owner: Darryl. New signup/login PR increment; designated log: [04-signup-and-login.md](../../logs/darryl/04-signup-and-login.md). Plan approval confirms allocation `CHG-D-002`; local/remote refs and existing active/archive records expose no competing allocation. Implementation branch: `codex/wp-002-signup-login`.

## Existing and proposed behaviour

Existing application has a static homepage, database fixtures and hosting checks; it has no product account model or authentication routes.

Implement only:

1. Signup using username, password and exactly one fixed Student/Organiser role. Create a stable UUID account and session atomically, then route to its role destination. No name, phone, email or affiliation prerequisite.
2. Login with username/password, generic invalid-credential feedback, a fresh session, and a destination derived from the stored role.
3. Logout that revokes the current server-side session and clears its cookie; server-enforced session expiry.
4. Minimal `/student` and `/organiser` destination pages with server role guards, account identity and logout. These are authentication proof surfaces, not event workflows. Anonymous protected navigation returns to login; another role gets denial without private disclosure.
5. Accessible green/white authentication screens following [visual guidelines](../ui-guidelines.md) and [account screen pattern](../ui-screen-patterns.md#accounts-and-profile). Preserve safe username/role values on errors, never echo passwords or session tokens.

## Approved G01 choices and Darryl's G02 disposition

The following choices were approved for this slice on 20 October 2026. The unresolved joint G02 aspect and deferred credential/profile policies remain explicitly open; this is not a claim about an earlier plan's exact content.

| Topic | Proposed choice |
| --- | --- |
| Username | Trim surrounding whitespace, canonicalise ASCII letters to lowercase; accept 3–32 characters from `a-z`, `0-9`, `_`. Global database uniqueness across roles, so `Alice`, `alice` and ` alice ` identify the same username. Display the canonical username. |
| Password | 15–128 Unicode code points after consistent NFC normalisation; permit spaces, no trimming or required character categories. Reject common/known-compromised choices from a documented local blocklist, with no password sent to an external service. Never silently truncate. |
| Session | 30-minute idle expiry and 8-hour absolute expiry; multiple separate sessions allowed. Logout revokes the current session. A new successful authentication generates a fresh token and replaces any presented current session. |
| Browser controls | Host-only HttpOnly SameSite=Lax cookie, Path=/, Secure on deployed HTTPS; `__Host-` prefix on HTTPS, separate local-development cookie name. No browser local-storage token. Mutations require POST and strict configured-origin checking; reject foreign, opaque/null or missing Origin before expensive work. |
| Login throttling | Atomic PostgreSQL counters shared across instances: at most 5 admitted attempts per canonical username per 15 minutes and 30 per validated source per 15 minutes; count all attempts, including unknown accounts. Do not reset on a successful login. |
| Signup throttling | At most 10 admitted attempts per validated source per hour; concurrent counter admission must not overshoot. |
| Resource/privacy bounds | Bound authentication body size and concurrent password-hash work before expensive operations. Use keyed digests of source/username identifiers for throttle keys, short counter expiry and no raw IP/credential/token logging. Trusted source extraction must be established for local and Vercel runtimes; no arbitrary client-supplied header as an authority. Missing required production configuration or unavailable database denies access. |
| Recovery | Recommend no recovery in this MVP, with an explicit signup/login warning that forgotten credentials cannot currently be recovered. Future password recovery remains a separate required design/implementation task if adopted; no fake reset action, mandatory email or unverified-phone bypass. G02 is a joint product policy and remains joint-pending until the affected humans' product decision is recorded. |

G01 is resolved only for this slice after approval. Username/password editing, its reauthentication/revocation policy and optional profile validation remain open for later slices; no credential-edit endpoint will exist here. Signup/login implementation does not imply the entire G01/G02 gate or WP-002 is complete. The MVP no-recovery position can be recorded as Darryl's decision while its joint-policy aspect remains explicit; do not claim joint agreement or production release readiness.

## Technical design and ownership

- Use the installed Next.js Node runtime, Prisma/`pg` and Neon foundation. Propose Node's maintained `crypto` primitives with asynchronous scrypt (N=2^17, r=8, p=1, unique random salt and explicit sufficient memory limit), constant-time hash comparison and bounded hash concurrency. Include equivalent dummy password verification for an unknown username. No new runtime authentication dependency is proposed; the implementer owns the small session/access layer and the independent reviewer checks it.
- Generate a 32-byte cryptographically random opaque session token; store only its digest in PostgreSQL, linked to the user's stable UUID and server timestamps. Resolve the role from the database on protected access. Use atomic account/session creation and fail closed on storage errors; uniqueness is enforced in the database, not only a preliminary lookup.
- Add account, session and throttle models through one new additive migration. Preserve both existing foundation migrations byte-for-byte. Keith coordinates shared schema/migrations; Darryl supplies and owns the account contract. Assign one writer for the new account schema/migration, confirm no overlapping schema work, and provide the migration/guard interface as a sequential handoff. Do not apply a migration to Keith's development, shared Preview or Production database during local implementation.
- Authentication origin and throttle-digest configuration are server-only settings, documented in `.env.example` and README. No secrets are generated into tracked files or retrieved from Production.
- Parent is the sole writer of plan, change/tasks/verification, canonical decision/spec updates and increment log. After approval, one implementer owns the application/schema/test paths below; a non-author verifier has read-only review responsibility. They return results to the parent and do not spawn further agents.
- The locally defined `feature_implementer` type is not exposed by the session. After approval, use built-in `worker` with its complete local role instructions and High reasoning for authentication. This is a disclosed fallback, not an edit to agent configuration.

### Planned allowed paths

| Writer | Paths |
| --- | --- |
| Parent | This plan; `changes/CHG-D-002-signup-login/{change,tasks,verification}.md` after allocation; `logs/darryl/04-signup-and-login.md`; affected sections of `specs/shared/accounts-and-access.md`, `specs/decisions.md`, `specs/verification/acceptance-scenarios.md`, `specs/work-packages/wp-002-accounts.md`, `specs/integration-handoffs.md` and `specs/baseline.md`. Non-behavioural final status reconciliation also includes `specs/README.md` and `specs/implementation-plan.md`; this adds no product behaviour or executable configuration. |
| Implementer, after approval | `src/server/auth/{policy,password,session,throttle,guards,service,request-security}.ts`; `src/app/api/auth/{signup,login,logout}/route.ts`; `src/app/{signup,login,student,organiser}/page.tsx`; `src/components/auth/{auth-form,logout-button}.tsx`; `src/app/page.tsx`, `src/app/globals.css`; `prisma/schema.prisma`; one new `prisma/migrations/*_accounts/migration.sql`; `tests/auth/*.test.ts`, `tests/auth/*.integration.test.ts`, `tests/auth/vitest.database.config.ts`; `vitest.config.ts`, `package.json` for test inclusion/command only; `.env.example`; `README.md` for setup/check instructions. |
| Independent verifier | Read the completed integrated diff and canonical contracts; reproduce checks with generated build/test outputs permitted. No product/spec/log edits. |

Only the listed files are assigned; any additional source/configuration path or runtime dependency needs an explicit scoped plan amendment. Local agent/skill edits stay untouched and unpublished. No concurrent writers on schema, CSS, manifest or records.

## Acceptance and checks

| Requirement/scenario portion | Planned evidence |
| --- | --- |
| SHR01 / T01 signup portion | Valid signup for each role, database-only UUID/hash, automatic authentication; equivalent-name concurrency produces one account and no orphan/partial session. Boundary/invalid-role/unknown-field rejection. Rename portion excluded. |
| SHR02 / T32 login/session portion | Valid/invalid/unknown login, cookie forgery, fresh tokens, logout replay denial, exact idle/absolute boundaries with controlled time, dependency failure; throttle concurrency and expiry. Credential edits excluded. |
| SHR04–05, SEC01 / T02 guard portion | Anonymous and cross-role direct requests cannot obtain protected content; tampered role/user fields cannot change identity or enable the other role. Existing event APIs do not exist and are not claimed tested. |
| SHR01 / T16 signup portion | Signup succeeds without name/phone/email. Optional profile editing/removal and registration integration excluded. |
| SEC06, DEP02 / scoped T28 | No plaintext password/raw token returned, persisted or logged; server-only module boundary, protected pages not shared-cached, separate synthetic-only database checks and source/evidence traceability. No whole-scenario claim. |

- Install the existing frozen toolchain when execution is authorised; run lint, typecheck, ordinary Vitest tests, Prisma schema validation and production build. Extend the actual test include list so authentication tests genuinely run.
- Add separately gated real PostgreSQL account/session/concurrency tests. Run only against Darryl's explicitly identified synthetic non-production target with verified pooled/direct pairing. Use uniquely identified fixtures and scoped cleanup; no reset, production label, foundation gate reset or provider calls. Missing target/access means these checks remain **not run**, not passed. Mock tests do not establish transaction/unique-index correctness.
- Independently review the finished integrated diff; reproduce relevant checks, fix actionable findings and recheck material fixes. Review includes a harmless untrusted development fixture with no execution effect.
- Manual checklist: sign up as Student and Organiser separately; verify destination and refresh; log out and retry a protected URL; log in again; submit equivalent duplicate usernames, bad credentials and forged roles; check keyboard flow, errors, password non-echo and layouts at 320/375/1280px. Controlled-clock checks cover expiry without making a human wait. Record actual browser evidence, not invented human acceptance.

## Exclusions and delivery boundary

No profile UI, username/password editing, implemented recovery, account deletion, event/discovery/registration/chat/PDF work, paid service, new cloud resources, production data access, reset, commit, push, issue/PR mutation, merge or deployment is authorised by this skill invocation. The existing Preview workflow is available for a separately authorised later delivery. Any affected issue reconciliation remains assigned to Darryl for authorised delivery and must not be claimed synchronised.

Next consumer handoff: exact account/session/role-guard interfaces, additive migration and source revision, checks/findings and unresolved product portions for Keith's publication work. No complete WP-002 or cross-role product scenario is declared passed by this slice.

## Research supporting the proposed design

- [Node.js 24 crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html): scrypt, secure randomness and timing-safe comparison primitives; verify actual behaviour against the pinned runtime during implementation.
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): memory-hard password hashing and scrypt parameter alternatives. Argon2id is its preferred option; scrypt is the proposed built-in alternative here.
- [OWASP authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): password strength, generic errors and throttling guidance.
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): opaque session identifiers, cookie controls and server-enforced idle/absolute expiry. The precise TurnUp values above are proposed product choices, not values mandated by these references.

Research and planning are not implementation, independent implementation review, a live database check or hosted verification.

## Authorised UI refinement — 20 October 2026

Darryl approved the proposed cleaner signup layout with “do it”. Scope: existing auth form and its CSS only; visible role radios, concise instructions, one required-fields statement, compact visible recovery disclosure, persistent labels and accessible password Show/Hide. Login shares the same component and receives consistent typography/password controls. Existing credential rules, immutable role, recovery limits, server/API/database/security behaviour remain unchanged. Original implementer owns the two UI files; parent owns records/browser checks; non-author verifier reviews the completed refinement. Focused lint/types, production build and mobile/desktop/keyboard/error/pending checks provide evidence; no new framework, schema operation or deployment.

UI refinement follow-up: Darryl explicitly requested single-agent minor fixes. Remove the required-fields statement, immutable-role hint, static username/password hints and error retention commentary. Keep native blank-field validation, existing server rules and preservation; show format/length guidance only for invalid submission. Use a small eye/slashed-eye password icon with accessible label and44px hit target. This supersedes those presentation details of the prior addendum; no product policy change.
