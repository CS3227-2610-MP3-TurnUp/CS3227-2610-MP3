# Accounts and access

Owner: shared authentication owner — assign before coding. B1 target; G01/G02 details open; implementation unverified.

| ID | Observable requirement |
| --- | --- |
| SHR01 | Signup accepts username/password/one fixed role only; assigns stable UUID, unique username and password hash; successful creation authenticates and routes by role. Equivalent concurrent usernames create at most one account. Exact equivalence/bounds: G01. |
| SHR02 | Login authorises the fixed role; logout/expiry deny protected operations. Invalid credentials disclose no private account data. Session lifetime/invalidation: G01. |
| SHR03 | Authenticated username/password changes preserve stable ownership/history; duplicate replacement usernames fail. Reauthentication and session revocation policy must close G01 before coding. |
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

Verification: T01/02/16/18/20; [G01/G02](../decisions.md).
