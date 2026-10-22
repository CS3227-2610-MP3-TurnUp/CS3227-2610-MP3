# WP006 Production activation — 22 October 2026

Darryl authorises implementation,push and merge for Production testing. Direct clarification: a **separate Production pool with the same Preview limits**, not a shared counter and not a reset of Preview. This supersedes earlier Production-disabled boundaries for this increment only. Main agent only. Existing D006/log07 history stays intact; new PR increment uses logs/darryl/08-student-ai-production.md.

## Implemented boundary

- Explicit matching Vercel/app/database environment labels and Student-only server key. Production app/session/publication data uses only the Production database;no non-production credential/data fallback.
- Each database has its own singleton budget and approval identifier. Production uses wp006-production-20261022-200;Preview keeps its original approval/counters/expiry. 200attempts,200000reserved output tokens,1000output/request,20000ms provider timeout,65536inputbytes,10secondspacing,single60secondlease,five/account/15minutes;seven-dayexpiry from the first target-specific activation. No automatic reset/refund/renewal or model change.
- Additive20261022020000migration expands only the budget environment CHECK;it does not create/replace budgets or touch app data. Activation uses the protected target-specific migration connection and refuses mismatched existing environment/approval/model rows.
- Existing protected Production workflow applies migrations,activates the new approved pool once,uploads an unpromoted candidate with the nonsecret enable flag,then checks exact safe Student source guard behavior without a cookie/inference. The candidate URL differs from configured browser origin,so403invalid_request or401login_required confirms the application policy is enabled. Only then does the existing Production promotion job proceed. No protection bypass or direct master push.

## Checks and remaining operational requirements

Affectedpolicy/routes/key tests and disposable two-databaseSQL exercise valid Production,wrong environment/key denial,separate caps,wrong-database reuse refusal and activation/redeploy preserving spend/expiry. Types/lint/schema and workflow shell syntax checked;actualGitHubchecks/Previewbuild must pass before the requested merge. No agent live inference is authorised or necessary for configuration/source guard checks.

Operator must configure STUDENT_SOCLAAS_API_KEY privately in Vercel Production while keeping Keith's SOCLAAS_API_KEY unchanged. Existing shared SoCLaaS model/baseURL/numeric settings must be valid for the permitted qwen3.8:27b model. No secret is read/copied from Production by the agent. Production candidate verification fails closed if key/config is absent. GitHub owns merge requirements and the existing environment promotion gate. Record actual outcomes and concrete access/config blockers;do not claim deployment merely from a merge.

FullWP006/live semantic acceptance/contact/history/inbox are not completed by enabling Production. Published source/evidence/lifecycle/authentication and silent-refresh behavior remain unchanged.
