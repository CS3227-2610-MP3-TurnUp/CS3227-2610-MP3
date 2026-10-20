# CHG-D-002 — Tasks and handoffs

Human owner: Darryl. Source/spec: `0c7d5ad`, B1/D12/D13 plus the 20 October 2026 [approved plan v1](../../docs/plans/wp-002-signup-login-plan.md); foundation `05e1b42`/K-006. Parent owns records and [increment log](../../logs/darryl/04-signup-and-login.md), approval prompt entry 02.

| Order | Output | Sole writer / actor | Preconditions | IDs / checks |
| --- | --- | --- | --- | --- |
| 1 | Canonical policy/scenario reconciliation and plan/records | Parent | Darryl's explicit plan approval | G01 scoped, G02 partial; SHR01/02/04/05/09, T01/02/16/32 |
| 2 | Exact code/schema/test/configuration/README paths in approved plan | Instructed worker `signup_login_implementation` | Policy reconciliation, frozen tooling; one schema writer, no shared database mutation | Plan acceptance mapping, lint/types/tests/schema/build and focused manual checks |
| 3 | Completed integrated diff review, relevant reproduced checks | Non-author `implementation_verifier` | Completed worker output; implementation writer pauses | Account acceptance first, security/access/atomicity, harmless development injection; return findings to parent |
| 4 | Correct findings, recheck material fixes | Original worker then original verifier | Concrete review findings | Exact results in verification |
| 5 | Consolidated evidence, manual checklist and consumer handoff | Parent | Actual implementation/review/check results | Partial scenarios and unavailable live/hosted evidence explicit |

## Work state

- [x] Approved bounded scope, owner, allocation, source/prerequisite and exact writers recorded.
- [x] Canonical specs/scenarios reconciled before dependent code; 20 October 2026 approved-policy snapshot.
- [x] Implementation and actual checks returned; live SQL/access limits and transient hosting timeout recorded in verification.
- [x] Independent completed-change review recorded with no actionable defects; final sequential lint/type/schema/build and 163/163 tests passed, so no post-review material fix recheck was required.
- [x] Final evidence, observed local UI checks, pending live/manual checks and next consumer handoff reconciled. This checkbox does not pass unavailable SQL or whole product scenarios.

## Writer and dependency handoff

Parent → worker: read AGENTS, CONTRIBUTING, task map, approved plan, canonical account/privacy/domain contracts, WP-002, full T01/T02/T16/T32 and coverage, UI guidelines/account pattern, K-006 foundation handoff, actual source/tooling. Read the local feature implementer role and implementation/test/UI skills. Worker owns only the exact paths in the approved plan; no records/spec/log edits or child agents. Unrelated writers' changes must be preserved.

Shared schema/migrations: the worker is the only local writer for the additive account models/migration. Historical foundation migrations remain immutable. Keith coordinates later integration; do not query/reset/migrate his development/shared Preview/Production targets. A verified Darryl-owned synthetic target is prerequisite to live tests, not deterministic code work. No existing such target/configuration was found in this checkout.

Worker → parent: changed paths, actual exact check results, source/working snapshot, corrections, partial coverage, manual steps and unrun evidence. Parent → verifier: frozen integrated diff and canonical contracts, no product edits. Verifier → parent: consequential findings with reproduction/lines, reproduced results and limits. Parent returns fixes to the worker and requests independent material rechecks.

Completed handoff, 20 October 2026: `/root/signup_login_implementation` authored the allowed implementation at High effort; parent observed local browser failure/anonymous/layout checks and stopped its temporary server; non-author `/root/verify_signup_login` reproduced final sequential checks with no actionable defects. No product edits followed independent review. Parent sequentially took README ownership for its schema-status row and reconciled dependent spec-index/implementation-plan status only. The next owner action is assigned synthetic database configuration/migration coordination and then actual SQL/success-flow verification, not a claim that those checks already passed.

Subsequent assigned-database handoff: Darryl confirmed private dev/darryl credentials and authorised target validation/migration/synthetic checks. Reverified metadata isolated that target; checked-in account migration applied and status is current. Real browser signup/login/logout/refresh/role denials passed for both roles, then QA accounts/sessions were scoped-cleaned. Final six SQL cases passed after a reviewed test-only bounded-wave correction; the original35-way P2028 availability limitation remains explicit. No runtime source changed. Hosted checks and deferred credential/profile/recovery integration remain outstanding; no deployment is implied.

UI refinement handoff: original implementer owns only `src/components/auth/auth-form.tsx` and auth-related `src/app/globals.css` selectors; parent owns approved-plan addendum, records/log/browser checks; original non-author verifier reviews the completed two-file change. Final lint/types/build and focused browser checks passed; independent review found no actionable defects. Server/API/schema files and prior SQL tests are unchanged by this refinement.
