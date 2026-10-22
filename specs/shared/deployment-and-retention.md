# Deployment, retention and development evidence

Owner: Keith for database migrations, retention infrastructure, deployment and release checks; reviewer: Darryl. Both humans decide unresolved retention policies and supply role evidence. See [ownership](../implementation-plan.md#human-ownership). B1 target; local foundation checks are recorded in [CHG-K-004](../../changes/CHG-K-004-wp-001-foundation/verification.md), while [CHG-K-006](../../changes/CHG-K-006-foundation-handoff/verification.md) records the successful Production foundation workflow, passed non-production migration/persistence/recovery checks and the remaining provider prerequisites. Complete application scenarios remain unverified.

| ID | Observable requirement |
| --- | --- |
| DEP01 | Run Next.js/TypeScript frontend/server and durable data online over HTTPS on Vercel Hobby; second-device workflows need no developer laptop. Persistent records survive requests/redeployments. |
| DEP02 | Isolate development/test and production configuration/credentials/data; enforce retention/deletion across stores and derived copies. Development agents cannot access production private data. |
| DEP03 | Team-managed releases have required checks, migrations and recovery/rollback instructions with actual evidence; failed required checks block release. Automation design G08. |
| DEP04 | Verify server-side SoC LLM integration for both AI workflows from intended hosting using Keith-supplied API-key access (D13): access, credentials, limits, truthful failure. Confirm course-specific provider rules from authoritative material before claiming compliance. |
| DEV01 | Team Markdown/Git SDD without installing/running OpenSpec: requirements/scenarios precede implementation; scoped changes link affected IDs, tasks, code and actual checks. |
| DEV02 | Use specialised specification/implementation/independent review agents; retain instructions, input versions, handoffs, changes, findings, actual output and human decisions. Include harmless development-time injection verification. |
| DEV03 | Preserve contribution/reflection evidence: role/shared human ownership, decisions, failures/fixes/checks/limitations, quantified reuse where applicable. |

Vercel function storage is not the durable application store. Originals/fulltext are transient by product decision; users/events/forms/registrations/messages need an external persistent database. Keith selected [Neon PostgreSQL and the foundation stack](../../changes/CHG-K-002-wp-001-foundation-design/design.md#selected-application-foundation) for development and production on 18 October 2026. Follow that design's separate synthetic-only non-production and independent production projects; preview/test data derives only from synthetic non-production data. Development agents receive no production credentials or private data. Selected versions, migration tooling and connection modes require actual compatibility/access/recovery checks; no free allowance is guaranteed. Validate current provider eligibility/resources/costs (G04/G08); free hosting does not imply all dependencies are free. Do not invent cron/provider capabilities or working deploy commands.

[D13](../decisions.md) settles the SoC credential mechanism and supplier only. Keep the key within the SEC06 server-side boundary; provider access or configuration failures must remain technical failures rather than missing event information. The [CHG-K-002 design](../../changes/CHG-K-002-wp-001-foundation-design/design.md) distinguishes selected foundation/deployment choices from remaining provider proposals and constraints. G04/G08 still require permitted-model, limit, data-handling, intended-host reachability, deployment-eligibility and course evidence before their dependent work or claims. Documentation research supplies no hosted/provider runtime result.

Keith selected the [CLI deployment route](../../changes/CHG-K-002-wp-001-foundation-design/design.md#selected-cli-deployment-route) on 18 October 2026 under G08. That design governs the organization-repository build/deployment path and its environment, credential and migration boundaries. The [CHG-K-005 hosted feasibility increment](../../changes/CHG-K-005-wp-001-hosted-feasibility/change.md) implements the workflow and server-only probe; CHG-K-006 carries current Production workflow evidence, distinct passed non-production runtime persistence/replay/recovery checks and the incomplete provider handoff. A successful Production run does not establish all account/resource isolation facts or policy/course eligibility, and does not waive DEP02/03 or SEC06. Preserve revision, build-artifact, environment/target, deployment URL, required-check and migration/recovery evidence through the [integration handoffs](../integration-handoffs.md).

## Stable Preview routing (CHG-K-008)

Keith assigned a stable Preview address on 21 October 2026. For the CLI workflow,
DEP01/DEP03 retain each upload's unique candidate URL/revision and additionally
assign the configured dedicated `PREVIEW_ALIAS` after a successful Preview upload.
Missing/malformed Preview alias configuration blocks before deployment work.
The alias must not match any current project Production domain: check the complete
paginated Production-domain list before deployment work and again immediately
before alias assignment. An unavailable/malformed/incomplete lookup fails closed;
no Production-hostname reassignment is permitted by this Preview path. Concurrent
provider domain-setting changes require operational coordination because checking
and assigning are separate provider requests;
failed alias assignment fails the job without claiming the stable URL was updated.
All permitted Preview branches share this address; the last successful assignment
determines its target. Production does not assign it. Keep deployment protection
and DEP02 environment isolation intact. Routing does not establish persistent
shareable-link access; hosted routing/protection/sharing checks remain separate
evidence in [CHG-K-008](../../changes/CHG-K-008-stable-preview-alias/verification.md).

## Retention targets

| Data | Accepted target | Open operational detail |
| --- | --- | --- |
| Original PDF/full extracted text | Processing only; no application persistence | All-exit cleanup, provider handling G04 |
| Inactive private preparation/saved drafts | 30 days inactivity, advance notice | Inactivity/notice lead time, derivatives G06 |
| Registration details/historical submissions/private threads/messages | Delete/anonymise 90 days after completion/cancellation | Completion reference, integrity, account deletion G06 |
| Minimal audits | 90 days; exclude raw private content | Copies/expiry evidence G06 |
| Optional Student profile | Until Student removes/account deletion | Historical identity relationship G06 |

Do not delete live publications with inactive draft cleanup or retain personal history indefinitely merely because versions are immutable. Define derived/cached/backup expiry and deletion/anonymisation relationships; do not claim erasure while recoverable backups remain under policy. See [G06/G07](../decisions.md).

Verification: T14/15/26/28. Actual hosted walkthrough, deterministic suite and bounded live-model evaluation are release evidence. Local foundation/provider checks are partial evidence; documentation checks alone validate documents only.

## Scoped Student assistant Preview activation — 22 October2026

Darryl authorised the D006hosted Preview extension and200total-attempt budget. Product answering uses durable Neon admission,not local filesystem counters. The protected preview/WP-006 workflow applies the additive migration and activates one fixed Preview approval with seven-dayexpiry from first activation;redeploys preserve counts and expiry. It passes only a nonsecret runtime enable flag to that Preview deployment. Production answering stays disabled even if that flag is accidentally present. Missing/expired/disabled policy,model mismatch or database failure denies inference;no automatic retry/reset/renewal. Developer keys/allowance files are never copied by activation. See hosted plan/D006verification for exact request/global/account caps and actual runtime checks;no full G04/G08 or Production readiness is implied.

## Production activation authorised — 22 October2026

Darryl requests Production Student chat,push/merge and explicitly chooses a separate200attemptProductionpoolwithsamePreviewlimits. NewProductionapproval and matchingVercel/app/DBlabels preserve Preview counters and strict environment isolation. Additive20261022020000migration expands the budgetenvironmentCHECKonly;target-specificactivationneverresets/replacesexistingrows. ProductionusesitsownSTUDENT_SOCLAAS_API_KEY;Organiserkeyunchanged. Existingcandidate/root/sourceguard and protectedpromotionworkflowretained. See docs/plans/wp-006-production-activation.md and ownerlog08forcurrentchecks/outcomes;earlierProduction-disabledstatementsarehistoricalforthisapprovedextension. Noagentliveinferenceorfullpackagecompletion.

## Hosted Student account window - 22 October 2026, log09entry04

Darryl increased the shared hosted per-account ceiling from5to20attempts in a rolling15minute window for both Preview and Production. The separate200attempttotal pools,200000output reservation cap,1000output/request,20second timeout,10second shared spacing,lease,deduplication,existing spend and expiry remain unchanged. No migration,activation,reset or live inference. Focused disposable SQL checks verify20admissions,21st denial and window recovery in each environment; actual check results are recorded in log09. New verification remains main-agent-only.

## Private Student assistant history - log10

The additive20261022030000_student_ai_history migration must deploy before the new history endpoints/answer persistence. Preview and Production store private history in their respective databases,with no cross-environment copy. Payloads are bounded to40000bytes per turn and20turns per account/event/current publication. Expiry,query suppression,opportunistic deletion and pending scheduled/cancellation/backup retention details are specified in the Student FAQ history amendment. This is explicit user content storage,not diagnostic logging;no private prompt/output text enters logs. No new provider service,secret,AI request or allowance is required to read saved history.
