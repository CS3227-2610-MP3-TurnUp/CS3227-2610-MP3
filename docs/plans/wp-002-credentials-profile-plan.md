# WP-002 credentials and optional Student profile — approved plan v1.3

Prepared 20 October 2026 for Darryl. **Plan approved under Darryl’s instruction to check industry UI/UX guidance and then approve it.** Version1.1 adds the guidance review below without changing the proposed security or profile bounds. This records Darryl’s delegated acceptance of the plan and allocation, not independent human review or implemented behaviour. This turn remains planning-only under the original no-implementation/commit/push instruction.

## Source and allocation

- Current branch: `codex/wp-002-signup-login`; HEAD `0c7d5adda285ba07b931d6e1e05ab6a928f2c7e7`. Reviewed foundation `05e1b42` is integrated. Authentication itself is an uncommitted/untracked [CHG-D-002](../../changes/CHG-D-002-signup-login/change.md) working-copy prerequisite, not content of HEAD.
- Prerequisite snapshot: 32 implementation/config/test/README files, aggregate SHA256 `cc92c1702bf8659f7e22f7cbbb86533013d7f1c0509beeb0d4a364a4d42f477d`. Digest uses sorted repository paths followed by NUL, file bytes, NUL. Files comprise the existing CHG-D-002 implementation manifest; private env and local agents/skills are excluded. Recheck against the later integrated revision before implementation.
- CHG-D-002 records163 unit tests and6 live SQL cases with bounded concurrency, authenticated browser checks and subsequent UI refinements. Its original35-way P2028 transaction-availability limitation and absent hosted feature evidence remain explicit. Those are prior results, not tests run for this plan; the last minor UI edit followed Darryl's explicit single-agent exception.
- **Allocated ID: CHG-D-003-credentials-profile**, accepted with the plan under Darryl’s conditional approval instruction. Its records now describe this assigned change, rather than reserving an unassigned roadmap item. The real local maximum is D-002; do not backfill D-001 or infer allocation from README examples.
- Allocation checked: active/untracked and archive paths; Darryl logs/plans; all22 local/remote-tracking refs and their change/log/plan/spec mentions; reachable change-path history; one worktree; empty stash list. No D-003 or higher assignment found. The15 live remote branch tips matched available tracking refs, so no fetch was needed. Relevant available project chat records exposed no competing next-change allocation. Remote GitHub issues/PR bodies and unpushed other machines' work were not exhaustively accessible; this is not a claim of global uniqueness. GitHub CLI is unavailable. Initial sandbox remote listing failed; narrow network-enabled read-only retry succeeded. No refs or remote records changed.
- Next distinct PR-sized increment: [05-credentials-and-profile.md](../../logs/darryl/05-credentials-and-profile.md), separate from the existing signup/login log. This planning document is authored in the current checkout only; no branch/worktree is created now. Proposed implementation branch `codex/wp-002-credentials-profile` must consume the full prerequisite through a recorded integration/stacked handoff; starting from current HEAD alone loses auth. Preserve local-only agents/skills and unrelated `docs/agent-usage.md` edits.

## Authoritative scope

Read the [task map](../../specs/README.md#task-reading-map), [baseline](../../specs/baseline.md), [G01/G02/G08](../../specs/decisions.md), [WP-002](../../specs/work-packages/wp-002-accounts.md), [accounts/access](../../specs/shared/accounts-and-access.md), [AI/privacy](../../specs/shared/ai-and-privacy.md), [domain contracts](../../specs/shared/domain-and-data-contracts.md), [Student registration](../../specs/student/discovery-and-registration.md), [retention](../../specs/shared/deployment-and-retention.md), [ownership](../../specs/implementation-plan.md) and [handoffs](../../specs/integration-handoffs.md). Full applicable scenarios: T01/T02/T16/T18/T20/T32 and coverage; evidence discipline T28. Use the existing [UI guidelines](../ui-guidelines.md) and account [screen pattern](../ui-screen-patterns.md#accounts-and-profile).

Existing: signup/login/logout, canonical username/password rules, immutable roles, opaque sessions, origin/body/hash/throttle controls and minimal role pages. No credential editor, settings route or persisted profile exists.

Proposed: both roles edit their own username/password; Students additionally edit/remove their own optional Name/Phone. Preserve UUID/role and all ownership relationships. One shared account settings page, linked from both destinations, displays credentials to both roles and profile to Students only. No extra signup fields. Retain the compact UI already approved: persistent labels, eye icons, conditional validation guidance, brief rejection reasons and safe-value preservation without verbose retention commentary.

## Approved decisions

| Area | Approved behaviour |
| --- | --- |
| Credential actions | Separate username/password saves. Each requires a live authenticated self-session and current password in that request; no reusable reauthentication grace window. |
| Actual successful change | Both actions atomically update credentials/revision and preserve UUID/role/profile/history. A username change keeps all existing sessions active, returns canonical username/new revision, stays on settings and requires no login. Only a password change revokes all sessions, clears the current cookie and routes to login; explain this consequence in the password section. |
| Username | Reuse trim/ASCII-lowercase/global3–32 letters-digits-underscore policy. Duplicate409 leaves account/sessions unchanged. Same canonical name returns200 unchanged, without revision increment or revocation, after successful authentication/reauthentication. |
| Password | Verify current password using existing NFC semantics; validate new password with existing15–128-code-point/common-password policy, never trimming. NFC-equivalent old/new password returns200 unchanged after verification; no revision/revocation. New-password policy must not incorrectly reject verification of the current password. |
| Reauthentication attempts | One persistent budget across username/password actions:5 admitted attempts per stable account UUID/15min and30 per trusted source/15min. Count all admitted attempts, including wrong passwords/no-ops, with no success reset. Existing login/signup budgets unchanged. UUID key prevents rename bypass. Storage failure fails closed. |
| Profile access | Student self only; live session suffices without current-password reentry or session revocation. Organiser cannot read/write any current global Student profile. Account UUID/role always server-derived; reject protected/unknown fields. |
| Name | One optional display name. NFC then trim surrounding whitespace; empty becomes null. If present,1–100 Unicode code points; preserve case, scripts, diacritics, internal spaces and punctuation. Reject remaining Unicode control characters and line/paragraph separators; render inert text. No first/last split or ASCII-only validation. |
| Phone | Optional contact string; trim, blank becomes null. Nonblank raw input at most64 code points. Permit ASCII digits, an optional leading +, spaces, hyphens and parentheses; remove presentation separators, then require7–15 digits. Preserve leading zeros/+; infer no country code. Reject other characters or misplaced/multiple +. This is a permissive project format rule, not E.164 compliance, ownership verification or recovery proof. |
| Profile save/removal | Full save includes name, phone and expectedProfileVersion; null/blank removes each independently. Validate both before one atomic write. Stale version409 preserves safe local input; never overwrite silently. Equal canonical values yield unchanged success without increment. Missing/protected fields fail rather than accidentally clearing data. |
| Privacy/history | Private no-store self reads/responses; never add profile to common Identity or AI/public data. Changing profile cannot rewrite past submissions. Actual confirmed event snapshots belong to WP-004, which is not implemented here. |

Current-password confirmation is supported by [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#change-password-feature); old-token invalidation aligns with [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#renew-the-session-id-after-any-privilege-level-change). Exact logout-all behaviour, numeric throttles and Name/Phone bounds above are TurnUp proposals, not values mandated by those sources.

Darryl’s instruction to check guidance and approve the plan accepts these G01 choices and confirms allocation after the check. Canonical accounts/G01/scenario records are reconciled to this dated decision; implementation and verification remain separate. **Recovery is a separate future planned feature:** no reset flow, OTP, email requirement or phone bypass here. Keep the existing no-current-recovery disclosure. Joint G02 and future recovery identity-proof/delivery/token/abuse policy remain separate decisions, not blockers invented for this bounded slice and not silently closed.

## Planned technical contract

- Reuse current Next.js/TypeScript, Prisma/Neon, scrypt, opaque cookies and security utilities. No new dependency, private environment variable, package script or framework expected.
- Add User.credentialVersion default0, nullable studentName/studentPhone and profileVersion default0. Existing rows retain UUID/username/hash/role, null profiles and initial revisions. Add database constraints for nonnegative versions and Organiser profile-null invariant. Normalisation/length rules are authoritative server validation with migration checks where appropriate. Keep old migrations immutable.
- One additive migration, proposed exact path `prisma/migrations/20261020010000_account_settings/migration.sql`; confirm ordering/collision with Keith before authoring. This is a plan, not authority to run it on any database.
- Close current login finalisation race in `src/server/auth/service.ts`: it now reads/verifies password before opening an unguarded session transaction. Merely deleting sessions on change allows an in-flight old-password login to mint a post-change session. Capture credential revision/canonical username, hash/verify outside transactions, then lock the user row and recheck username/revision before session issuance. A stale verification rejects generically; never silently reuse it after a change.
- Credential writes take the same short user-row lock, revalidate the presented session/expiry and expectedCredentialVersion at commit, update credentials/version atomically; delete all sessions only for an actual password change. A username change keeps session rows and cookies intact. Stable lock order user then session; coordinate queued logout/expiry and parallel changes. No scrypt inside locks. A request authorised before a revocation must recheck before mutation. Failed updates roll back credential/session changes; attempt counters and normal session touch metadata may remain.
- Profile writes similarly revalidate Student session and expectedProfileVersion at the commit boundary, without coupling ordinary profile saves to credential reauthentication. Clear-to-null remains a versioned write so stale tabs cannot restore removed data.
- Proposed POST `/api/account/credentials`: discriminated username or password action with currentPassword and expectedCredentialVersion plus only its new value. Never accepts userId/role. Username success returns changed:true plus canonical username/new credentialVersion without redirect/Set-Cookie; update UI state so a subsequent password save uses that revision. Password success returns changed:true/redirect:/login with clearing Set-Cookie. No-op returns changed:false; unknown keys rejected.
- Proposed GET/POST `/api/student/profile`: self only, returns only nullable current values/profileVersion; POST full name/phone/expectedProfileVersion. Private cache controls, exact trusted Origin/POST/body4KiB/5s controls for mutations. Session failures401, wrong role403, validation400, stale/duplicate409, admission429, unavailable503. Public messages never echo passwords/tokens or raw driver diagnostics.
- Proposed `/account` page: redirect anonymous to login; both roles get separate credential forms. Student profile is a separate optional section and save action. Stale conflicts offer reload/review while retaining safe inputs. Clear all password inputs on submission/error, use accessible labelled eye buttons and current/new-password autocomplete. Do not expose optional Name/Phone to Organiser UI/API projections.

## Exact planned file ownership

Parent is the sole plan/spec/change/log writer. One future High-effort implementation worker owns all application files below sequentially; no concurrent schema writer. Non-author verifier is read-only. Keith coordinates shared migration integration; this plan does not message him or edit his work.

Existing implementation files to modify:

- `prisma/schema.prisma`
- `src/server/auth/service.ts`
- `src/server/auth/session.ts`
- `src/server/auth/guards.ts`
- `src/server/auth/policy.ts`
- `src/server/auth/throttle.ts`
- `src/app/student/page.tsx`
- `src/app/organiser/page.tsx`
- `src/app/globals.css`
- `tests/auth/service-routes.test.ts`
- `tests/auth/guards.test.ts`
- `tests/auth/session-throttle.test.ts`
- `tests/auth/policy.test.ts`
- `README.md`

New implementation files:

- `prisma/migrations/20261020010000_account_settings/migration.sql`
- `src/server/accounts/policy.ts`
- `src/server/accounts/service.ts`
- `src/server/accounts/profile.ts`
- `src/app/api/account/credentials/route.ts`
- `src/app/api/student/profile/route.ts`
- `src/app/account/page.tsx`
- `src/components/account/credentials-form.tsx`
- `src/components/account/student-profile-form.tsx`
- `tests/auth/account-policy.test.ts`
- `tests/auth/account-routes.test.ts`
- `tests/auth/account-settings.integration.test.ts`

Parent documentation after authorisation: this plan; proposed `changes/CHG-D-003-credentials-profile/change.md`, `tasks.md`, `verification.md`; the new increment log; relevant sections of `specs/shared/accounts-and-access.md`, `specs/decisions.md`, `specs/verification/acceptance-scenarios.md`, `specs/work-packages/wp-002-accounts.md`, `specs/integration-handoffs.md`, `specs/implementation-plan.md`, `specs/README.md` and `specs/baseline.md`. No need to rewrite domain/Student behaviour already preserving future snapshots. Any required new path is a bounded plan amendment before writing, not blanket directory permission.

## Acceptance and tests to run after implementation

| Target | Concrete checks |
| --- | --- |
| SHR03 / T01 | Rename keeps UUID/role/profile; old name fails/new canonical name works. Two users race same replacement: one winner, losing account/sessions unchanged. Canonical no-op does not revoke. No event ownership tables invented merely to test future relationships. |
| SHR02/03/05 / T32 | Current password required for both actions; wrong/current/new-policy errors cannot mutate. Actual password changes invalidate all device tokens, clear cookie and require new login. Username changes retain all tokens and immediately update the displayed username/revision without login. No-op preserved; transaction failure cannot leave partial update/revocation. |
| T32 concurrency | Barrier-controlled old-password login versus password change, old-name login versus rename, concurrent credential saves, logout/expiry versus queued mutations. Stale work cannot mint a valid post-revocation session or silently overwrite winner. Test unexpected DB errors distinctly from intended denials. |
| T32 security/limits | Anonymous/expired/forged sessions; foreign/null/missing Origin; body/timeout/hash bounds; stableUUID/shared-action budgets and across-instance caps; throttle/database failures; no secret/driver output. Prior35-way P2028 availability limit remains visible. |
| SHR09 / T16 | Absent profile, independent add/remove/blank-to-null, Unicode/name100/101 and phone64/65 plus7/15 digit boundaries, punctuation/normalisation/controls, leading zero/+ preservation; invalid pair saves neither; stale save409 including removal race. |
| SHR04/05 / T02 and scoped T18 | Both roles self credentials only; Student self profile only; Organiser/foreign identity/private projection denied. Unknown role/userId/permission keys rejected; common Identity remains id/username/role only. |
| SHR09 / T20 handoff | Reader provides nullable current values+revision, no mutation of other domain data. Document explicit confirmed snapshot semantics. Real registration/roster/history/AI integration remains WP-004/later; do not call a stub a full T20 pass. |
| Browser/UI | Both roles settings navigation; credential reentry/password-only sign-out-all/username session retention/no-op/duplicate; Student empty/edit/remove/stale profile; brief errors/retained safe input/cleared passwords; native required and eye buttons; keyboard/focus320/375/1280px and enlarged text. Human acceptance only from actual feedback. |

Commands discovered: `corepack pnpm lint`, `typecheck`, `test`, `db:validate`, `build`; new live suite is automatically included by existing `corepack pnpm test:auth:db`. Existing Windows hosting tests need Git Bash on process PATH and checked-in LF workflow content; preserve expectations. Use final integrated source, independent non-author review and material-fix rechecks. No application tests were run for this planning-only prompt.

Live migration/SQL checks require a fresh matching metadata preflight and explicit authorisation for this new additive migration/synthetic suite on the assigned non-production branch. CHG-D-002's prior database authority is not an automatic migration/deployment grant for a new change. No private .env values are needed to review this plan. No Production/shared Preview/Keith branch, resets, provisioning or SoC calls.

## Ordered handoffs and stop point

1. Completed: reviewed guidance and recorded Darryl’s delegated approval of v1.1 policy/allocation. Parent reconciles accepted G01/scenarios before any code; G02 future recovery remains open.
2. Establish isolated next branch/worktree containing the complete CHG-D-002 prerequisite through recorded integration. Preserve current dirty work and local-only setup; no automatic commit/push. Recheck source and allocation for newly concurrent work.
3. Parent dispatches one implementer with exact files, requirement mapping and schema ownership. Coordinate migration ordering/consumer interfaces with Keith before shared integration. No implementation is dispatched in this planning turn.
4. Non-author verifier reviews completed integrated code, actual checks and bounded harmless development fixture; return findings to author and recheck fixes. Parent records focused browser evidence and real SQL only where authorised/actually run.
5. Keith/publication receives unchanged Identity/role guards plus the new revocation/concurrency contract and migration/reviewed revision. Profile is not part of that identity projection. Darryl/WP-004 receives a server-only self-profile reader and future confirmed-value snapshot rules. Actual publication/registration dependencies do not block this independent account slice.
6. Issue#7 scope/dependencies will need reconciliation during authorised remote delivery; none is claimed now. Remote publication, Preview/Production deployment, human GitHub review administration and recovery implementation remain outside this plan.

**Stop now at the approved plan.** The original no-implementation boundary is retained for this turn. No product file, test, executable configuration, database, branch/ref, commit or remote record was changed by preparing or approving it.

## UI/UX guidance review and acceptance — 20 October 2026

Darryl instructed: “just check through industry UI/UX standards and then approve the plan”. Parent checked primary GOV.UK Design System and W3C WAI guidance directly; no new agent or standalone audit was dispatched for this focused documentation check. Accepted refinements for the planned implementation:

- Group Profile, Change username and Change password into distinct sections/actions; each action saves only its own section. Use action-specific button labels and explain all-device sign-out before password submission only; username save stays signed in. Ordinary profile save needs no password reentry. Do not add a second confirmation step for a normal profile save.
- Use persistent labels “Name (optional)” and “Phone number (optional)”. Use one Unicode-capable name field with autocomplete=name, and a text/tel field with type=tel and autocomplete=tel; never number/spinners, numeric coercion, a forced country guess or an input mask. Leaving fields blank removes values. A short profile-section explanation states these values are optional defaults for future registration; event sharing requires explicit confirmation and is not implemented here. See [names](https://design-system.service.gov.uk/patterns/names/) and [phone numbers](https://design-system.service.gov.uk/patterns/phone-numbers/).
- Preserve Darryl’s compact form preference: no required-fields banner, persistent limit paragraphs or verbose retained-input remarks. Show actionable format/length errors after validation, beside the affected field with aria-invalid/aria-describedby. Use a focusable concise summary for submission/multiple-field failures and dependency/conflict errors; preserve safe values. Announce successful profile save via a status region without stealing focus. See [W3C notifications](https://www.w3.org/WAI/tutorials/forms/notifications/).
- Keep separate current/new password labels and autocomplete=current-password/new-password. Allow paste/password managers. Use the already approved eye/slashed-eye icons with distinct accessible labels per input and44px hit areas; hidden by default and on submit. The original v1.1 guidance omitted Confirm new password; Darryl's subsequent FoC reference adoption below supersedes that presentation choice. No composition checklist or forced periodic password change. See [password input](https://design-system.service.gov.uk/components/password-input/) and [password pattern](https://design-system.service.gov.uk/patterns/passwords/).
- Keyboard order, visible focus, narrow layouts, enlarged text and pending/error/success states remain acceptance checks. Screen-reader and actual user usability results require implemented UI testing; this is a guidance comparison, not WCAG conformance certification.

Disposition: retain the current15–128 password policy and Name100/Phone64-input/7–15-digit bounds as deliberate project constraints; cited design systems do not mandate those values or establish full global-phone validity. GOV.UK discourages restrictive maximum password lengths and asks teams to explain restrictions. This change preserves TurnUp’s already accepted bounded128-code-point ceiling and the user’s conditional-error preference rather than silently changing security/product rules. Recovery remains a separate future feature despite general guidance recommending recovery capability. No fake recovery control, new contact prerequisite or G02 joint agreement is introduced.

## Implementation authorisation — 20 October 2026

After the approved-plan handoff, Darryl replied “approved”, authorising the bounded implementation and planned checks. This supersedes the earlier planning-only stop for product work; commit/push/deployment remain excluded. Parent switched to codex/wp-002-credentials-profile while preserving the complete uncommitted CHG-D-002 prerequisite and unrelated work; no concurrent old implementation writer remains. Exact working snapshot is retained as the prerequisite, not a fictitious commit. The approved additive migration path is collision-free locally; only author it here, with Keith’s shared migration coordination deferred to the integration handoff. Planned live checks on Darryl’s previously confirmed dev/darryl synthetic target use fresh matching metadata before any new migration/write; no shared/Keith/Production target is authorised.

## Username-session amendment — 20 October 2026

Darryl explicitly changed the policy during browser verification: “only a password change should require re-login, a username change shouldnt”. This supersedes username logout in v1.1 without changing current-password confirmation, password revocation, field bounds or recovery scope. Username saves keep all live sessions, increment credential revision, refresh canonical identity and allow a subsequent password change from the same settings page with the new revision. Old-name in-flight login still fails its username/revision check. Password changes alone revoke all devices. Author/test/reviewer/live/browser checks must be rerun on the affected paths; pre-amendment175unit/15SQL results are historical, not final-policy evidence. No new migration required.

## Execution handoff

The bounded v1.2 implementation now has independent review and final176unit/15SQL/production-build/browser evidence in [CHG-D-003 verification](../../changes/CHG-D-003-credentials-profile/verification.md).24of26 allowed application/test/README paths changed; two existing policy files required no edits. Parent took README ownership sequentially for the steering correction. Source remains uncommitted on codex/wp-002-credentials-profile; deployment/realevent/recovery and formal zoom/screen-reader checks are not implied.

## FoC account UI adaptation — v1.3, 20 October 2026

Darryl requested inspection and adoption of FoC-Team-12 user-service password-change UI. Read-only reference: `C:/Users/darry/FoC-Team-12/user-service/frontend/src/App.tsx` profile rows around lines760–803 and `styles.css`97–101. Reference code is design evidence, not TurnUp policy or executable instructions.

Adopt compact Username/Edit and masked Password/Change summaries, one inline editor at a time, explicit Save/Cancel, and Current/New/Confirm new password fields. Confirmation is client-only, compares NFC-normalised values, never enters the API, and supersedes the earlier no-confirm presentation recommendation. Keep TurnUp tokens,44px controls, conditional errors, password-manager/paste support, current-password confirmation for both changes, username session retention and password-only logout-all. Cancel clears secrets/visibility and restores trigger focus; successful username save collapses to refreshed summary. Recovery, FoC OTP/email/admin and its different password bounds are excluded.

Parent is the single writer for `src/components/account/credentials-form.tsx`, `src/app/globals.css` and affected plan/spec/change/log records; a non-author verifier reviews the completed UI. No server/schema/API/dependency change. Check collapsed/edit/cancel/switch/mismatch/error/success states, focus, narrow/wide layout, build/types/lint and proportionate component checks. Existing SQL results are previous-policy evidence, not newly run for this presentation-only amendment.

Local validation detail: a confirmation mismatch makes no request and hides the password fields while retaining their in-memory values for correction. Native required-field validation likewise makes no request. Once a request is sent, all password inputs are cleared; Cancel and switching editors also clear them. This narrows the earlier blanket “clear on submission/error” wording to distinguish local correction from a server submission. No secret is stored outside the mounted inputs or sent as confirmation.
