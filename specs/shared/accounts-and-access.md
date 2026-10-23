# Accounts and access

Owner: Darryl; reviewer: Keith. Accounts, fixed-role guards and sessions follow [D12 ownership](../implementation-plan.md#human-ownership). B1 target; Darryl approved the signup/login policy below on 20 October 2026. Credential/profile policies were accepted for CHG-D-003 on 20 October 2026; implementation now has scoped local evidence in CHG-D-003 verification. Joint G02 remains open. Implementation and actual checks are tracked in [CHG-D-002](../../changes/CHG-D-002-signup-login/change.md).

| ID | Observable requirement |
| --- | --- |
| SHR01 | Signup accepts username/password/one fixed role only; assigns stable UUID, unique canonical username and password hash; successful creation atomically establishes authentication and routes by stored role. Equivalent concurrent usernames create at most one account, with no orphan session or partial account after a failed creation. Apply the approved account policy below. |
| SHR02 | Login authorises the fixed stored role; logout/expiry deny protected operations. Invalid credentials disclose no private account data. Apply the approved session and failure policy below. |
| SHR03 | Authenticated username/password changes preserve stable ownership/history; duplicate replacement usernames fail. Reauthentication and session revocation follow the approved credential/profile policy below; implementation remains separate. |
| SHR04 | An account has exactly one immutable MVP role. API fields/navigation cannot enable another role. No role-switch or enable-organiser operation exists. |
| SHR05 | Server checks identity, fixed role, ownership and state on every operation. Rejection discloses no inaccessible private data and causes no mutation; hiding buttons is insufficient. |
| SHR09 | Student Name and Phone Number are optional private profile fields editable/removable after login. Absence never blocks registration; future prefills change, earlier submissions do not. |

## Access matrix

“Owner” means server-resolved event Organiser, “self” the authenticated account. Anonymous users have login/signup only in this MVP; guest access is not agreed.

| Operation | Student | Owning Organiser | Other Organiser |
| --- | --- | --- | --- |
| Student discovery / FAQ / registration | Yes, state rules apply | No | No |
| Account credentials | Self | Self | Self |
| Optional Student profile | Self | No | No |
| Organiser public preview | No | Own event only | No |
| Private draft/proposal/clarification/generation | No | Own event | No |
| Publish/withdraw/cancel/delete | No | Own event, lifecycle rules | No |
| Form configuration / roster | No | Own event | No |
| Read submission | Own | Own event | No |
| Edit/cancel registration | Own, cutoff rules | No | No |
| Read private question thread | Asking Student | Own event | No |
| Reply as Organiser | No | Own-event thread | No |

Organiser preview is read-only rendering, not a Student identity or chatbot session. Username changes preserve UUIDs and relationships. Required event questions are distinct from optional global profile fields; see [contracts](domain-and-data-contracts.md). Credentials never enter public APIs or either AI context.

## Approved signup/login policy

Darryl explicitly approved [plan v1](../../docs/plans/wp-002-signup-login-plan.md) and its defaults on 20 October 2026. This resolves only the signup/login/session portion of G01; it does not implement or verify it.

- Trim surrounding username whitespace, lowercase ASCII letters, and require 3–32 characters from `a-z`, `0-9`, `_`. Store/display the canonical username; equivalence and uniqueness apply globally across both roles. UUID, never username, is the stable identity.
- Normalise passwords to NFC consistently at signup/login and require 15–128 Unicode code points. Do not trim, truncate or impose character-category/periodic-change rules. Reject choices from a documented local common/known-compromised-password blocklist; no password goes to an external checking service. Never return/store/log plaintext passwords or expose hashes.
- Successful authentication creates a fresh unpredictable session token and replaces any presented current session. Permit separate sessions on different devices. Enforce a 30-minute idle limit and 8-hour absolute limit on the server, including exact-boundary rejection. Logout immediately revokes the current server-side session and clears its cookie; other device sessions remain valid.
- Use host-only HttpOnly SameSite=Lax cookies, Path=/ and no Domain. Deployed HTTPS cookies are Secure with `__Host-` prefix; local HTTP has a distinct cookie name. No session token in URLs, browser storage or public responses/logs. Resolve the role from authoritative server records on every protected operation; do not trust role/user IDs from the client or a cached page.
- Signup/login/logout mutate only through POST with exact configured trusted-origin checks. Missing, opaque/null or foreign Origin is rejected before expensive work or mutation. Fail closed if required server configuration or database access is unavailable. Wrong-password and unknown-account failures use the same public credential error and equivalent password-verification work.
- Persist atomic fixed-window admissions across instances: login 5 attempts per canonical username per 15 minutes and 30 per trusted source per 15 minutes; signup 10 per trusted source per hour. Count all admitted attempts before hashing, including unknown accounts, and do not reset on success. Once a bound is spent, deny until its window expires. Throttle storage failure grants no authentication/access. Validate source attribution at the hosting boundary and key identifiers with server-only digests; do not trust arbitrary client headers or log raw IPs.
- Bound incoming bodies and concurrent password hashing; expired throttle records have short-lived cleanup. Limits and failures must work across deployed instances without relying exclusively on process-local state.
- Signup requires no Name, Phone, email or affiliation. The original signup/login slice has no credential-change, profile-change or role-switch operation. Protected landing pages establish role access only; they do not represent completed Student/Organiser features.

## Approved credential changes and optional profile policy

On20 October2026 Darryl directed a UI/UX guidance check followed by plan approval. The [approved v1.2 plan](../../docs/plans/wp-002-credentials-profile-plan.md) and [CHG-D-003](../../changes/CHG-D-003-credentials-profile/change.md) record that delegated acceptance. These are agreed targets, not implemented or verified capabilities.

- Both roles change only their own username/password through separate actions, each requiring a live session and current password. No reusable reauthentication grace period. Reuse existing canonical username/new-password rules. Duplicate replacement fails without credential/session mutation. Canonical/NFC-equivalent unchanged values return unchanged success after reauthentication, without revision increment or revocation.
- Both actions atomically update credentials/revision. A username change preserves all live sessions/cookies, updates canonical identity/revision in the current settings view and requires no login. Only an actual password change revokes all sessions including current, clears its cookie and routes to login; explain that consequence in the password section. Darryl explicitly superseded username logout on20 October2026. UUID, immutable role and ownership/history remain unchanged. Login issuance and changes serialize/recheck authoritative credential state so in-flight old-credential verification cannot mint a valid post-change session. Revalidate session/expiry at mutation commit; failures cannot partially change credentials or revoke sessions.
- One shared persistent credential-change budget across both actions:5 admitted attempts per stable UUID/15min and30 per trusted source/15min, including wrong-password/no-op attempts, no success reset. Existing login/signup limits stay unchanged. Admission failure grants no mutation; counters may record failed attempts.
- Student-only self profile: live session, no password reentry or session revocation. Name/Phone are independently optional/removable. Name is NFC-normalised then trimmed; blank becomes null, nonblank1–100 Unicode code points, preserving scripts/case/internal spaces/punctuation while rejecting remaining controls and line/paragraph separators.
- Phone is trimmed, blank becomes null; nonblank raw input≤64 code points. Accept ASCII digits, optional leading+, spaces/hyphens/parentheses; remove separators and require7–15 digits. Preserve leading zeros/+, infer no country. Reject other characters or malformed+. This is contact-format validation, never verification/recovery proof.
- Profile full save supplies both fields plus expected version; validate/commit atomically. Invalid/stale requests change neither field. Stale409 preserves safe client input; canonical no-op changes no version. Null/blank independently removes each field. Private/no-store responses; reject unknown/protected identity/role fields, server derives self. Organisers cannot access current Student profiles. Common Identity and public/AI projections exclude profile data.
- Profile changes affect current defaults only; future registration shares only explicitly confirmed event snapshots and never rewrites earlier submissions. WP-004 must verify real integration later.
- Settings follow approved compact UI: persistent optional labels, name/tel autofill, accessible labelled eye controls, conditional concise field-associated errors, safe-value preservation and cleared passwords.
- Student profile follows the credential rows: saved Name/Phone or “Not set”, individual Edit actions and one expanded profile editor at a time, with explicit Save/Cancel and save confirmation. Cancel/switch discards the active draft and Cancel/save restores focus to its Edit action. Each save retains the other saved field and the version check; conflict reload retains the active draft while refreshing the other field/version. Profile edits require no password confirmation or re-login.

## Account scope

Darryl clarified on 23 October 2026 that the account scope is signup, login and authenticated credential/profile changes, and removed the forgotten-credential disclosure from signup/login and product documentation. Do not present additional account-access functionality as planned work. This supersedes the earlier disclosure requirement under G02; it does not change authenticated credential checks or establish full release readiness.

Verification: complete relevant T01/02/16/18/20/32 and coverage in [acceptance scenarios](../verification/acceptance-scenarios.md); signup/login is partial coverage only. [G01/G02](../decisions.md).

### Credential settings presentation — 20 October 2026

21 October2026 account navigation update: authenticated Student, Organiser and account-settings headers share the FoC-derived top-right avatar/username dropdown with Profile linking to /account and Log out using the existing server revocation action. Escape closes it and restores trigger focus; outside clicks and focus leaving close it. Mobile retains an accessible account trigger while visually hiding the username. This changes navigation presentation only, with no role switch, credential or server access-policy change.

Darryl requested the FoC-Team-12 user-service inline editing design. Show compact Username/Edit and masked Password/Change rows, expanding only the selected editor with Save/Cancel. Password editing includes Current, New and Confirm new password; the client compares NFC-normalised confirmation locally and does not send it to the server. Cancel clears secret fields/visibility and restores focus; a successful username edit returns to the canonical summary without re-login. These presentation choices supersede the initial no-confirm recommendation; credential bounds, current-password checks, session policy and recovery scope are unchanged. See [plan v1.3](../../docs/plans/wp-002-credentials-profile-plan.md#foc-account-ui-adaptation--v13-20-october-2026).

A local confirmation mismatch hides but retains password inputs for correction without a network request; actual server submissions clear them. Cancel/switching editors clear secrets and visibility. No confirmation value enters the server contract or durable browser storage.

### Registration feedback and operational diagnostics — 21 October 2026

Signup/login validate existing username/NFC password-length rules before a browser request, showing only invalid-submission field errors with associated labels, invalid state and first-error focus. Server remains authoritative. Local correction retains mounted hidden password input; actual submitted requests clear it. Hosted failure with valid input remains a separate investigation. Private unexpected/5xx auth diagnostics contain fixed action/stage/code metadata only, with no credentials, identity, IP, cookies, payload, driver/error text or configuration values. Public failures remain generic; no diagnostic API is exposed.
