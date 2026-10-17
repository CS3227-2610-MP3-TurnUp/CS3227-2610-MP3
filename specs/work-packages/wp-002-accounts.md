# WP-002 - Fixed-role accounts and optional profile

Planned work under B1/D12; no implementation or passing runtime evidence is implied. Read the [common planning rules and ownership](../implementation-plan.md), the [task reading map](../README.md#task-reading-map), applicable [decision gates](../decisions.md) (G01/G02/G08) and the relevant [integration handoff](../integration-handoffs.md). Exact file writers and change IDs remain per-change assignments.

## Scope and dependencies

| Order / roadmap work package | Human ownership | Scope and requirement package | Depends on / observable completion |
| --- | --- | --- | --- |
| WP-002: fixed-role accounts and optional profile | Darryl leads, including profile integration; Keith reviews | Signup/login/logout, stable identity, credential changes, role guards and optional Student Name/Phone. SHR01–SHR05, SHR08–SHR09, SEC06–SEC07. | WP-001; decide session/credential rules before coding them. Direct API tests enforce fixed roles and ownership; empty optional profile does not block registration. |

## Bounded implementation slices

| Package / slice | Lead and responsibility areas | Ordered deliverables and planned checks | Prerequisites / limits |
| --- | --- | --- | --- |
| WP-002: account contract and access | Darryl; `specs/shared/accounts-and-access.md`, assigned `src/server/auth/`, `src/app/signup/`, `src/app/login/` and role-route guards; Keith reviews | First resolve G01/G02, then implement signup/login/logout, stable identity and server role/ownership enforcement. Check duplicate-username races, invalid credentials, cross-role denial and logout/expiry. SHR01/02/04/05; applicable T01/T02/T16/T32 portions. | Contract preparation can start during WP-001. Executable account work needs its foundation/data/configuration handoff; credential/session behaviour needs accepted G01 choices. |
| WP-002: credentials and optional profile | Darryl; account/profile operations and Student integration, with exact new files assigned in the change; Keith reviews | Implement username/password changes without changing identity and optional Student Name/Phone editing/removal. Check duplicate rename, approved reauthentication/revocation policy and blank-profile operation. SHR03/09; T01/T16/T32. | Account identity/session contract and G01/G02 disposition. Submission snapshot integration T20 remains with WP-004. |

## Planned acceptance targets

| Package | Planned acceptance targets in [acceptance-scenarios.md](../verification/acceptance-scenarios.md) |
| --- | --- |
| WP-002 | T01/T02/T16/T32; profile-snapshot integration T20 with WP-004 |

Read each applicable scenario's complete Given/When/Then and method, including coverage and evaluation guidance. Partial package evidence does not pass an entire scenario.
