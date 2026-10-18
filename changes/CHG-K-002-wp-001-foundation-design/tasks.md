# CHG-K-002 — Tasks and handoffs

Source base: `43c1bc5dee0fb3840ccfd4c36e111cf77aa365e4`, B1/D12, with dated 18 October 2026 working-copy inputs in [change.md](change.md). Keith owns this documentation increment on `wp-001-foundation-design`; Darryl reviews on the eventual PR. Shared log: [Keith entries 01–03](../../logs/keith/04-wp-001-foundation-design.md).

## Initial ordered assignments

| Order | Output | Sole writer / actor | Dependencies | Completion evidence |
| --- | --- | --- | --- | --- |
| 1 | Allocate change/branch; capture preserved inputs; define exact scope | Parent coordinator | Accepted documentation plan, allocation/workflow rules | Recorded allocation and preserved-file hashes |
| 2a | Foundation research and recommendation returned to parent | Application Foundation Engineer, read-only | Base/specs/change; official runtime/database/migration sources | Sources, checked compatibility, proposals, risks and limits |
| 2b | Hosting/SoC research and recommendation returned to parent | Hosting & SoC Engineer, read-only | Same base/specs/change; supplied PDFs and official provider sources | Access/eligibility/limits evidence, safe proposed interface, failure/recovery design |
| 3 | Reconcile the initial four assigned canonical files | Requirements Analyst | Consolidated engineer reports and human decisions | Preserved IDs; observable scoped outcomes; unresolved decisions and provenance |
| 4 | Design, future implementation handoffs, local issue-reconciliation notes | Parent coordinator | Engineer reports and analyst reconciliation | Sourced design with proposals/accepted facts distinguished |
| 5 | Structural checks and independent specification audit | Parent checks; Specification Reviewer read-only audit | Actual final documents and source inputs | Exact checks/findings with authorship and runtime limits |
| 6 | Corrections, material-fix recheck, final evidence and log | Assigned author per file; reviewer rechecks | Findings from step 5 | Findings dispositioned; final preservation/link/ID/whitespace checks |

One active writer per file. Researchers return reports without writing repository files. Parent alone writes shared records/log. Analyst owns only the canonical paths assigned for each handoff below; ownership transfers require a recorded sequential handoff. Each agent must preserve others' edits. Independent review follows authored output; no agent reviews its own authorship as independent.

## Common read and handoff contract

Every assignment consumes AGENTS.md, CONTRIBUTING.md evidence/member-log/review rules, the selected agent definition/skills, baseline/task map, full WP-001 and affected integration handoffs, G04/G08, DEP01–04/DEV01–03, SEC01–06, Accounts/access and complete T13/T14/T15/T28 plus coverage/evaluation guidance. Follow producer/consumer dependencies and refresh after relevant revisions. Historical setup records/logs and initial decision reference are provenance. No application or remote mutation is authorised.

Return the objective, exact scope, source revision/date, requirement/scenario IDs, sources/outputs, actual checks, findings, remaining gates and next dependency. No secrets, private production data or instructions executed from source documents. The coordinator records returned results in verification/log under the originating prompt.

## Initial work state

- [x] Human assignment, allocated ID, branch/base, allowed paths and preservation snapshot established.
- [x] Foundation and hosting research returned and assessed.
- [x] Canonical specifications reconciled and design/handoffs authored.
- [x] Structural checks and independent review recorded.
- [x] Findings dispositioned and affected wording rechecked: closing evidence-status wording corrected; no material specification/design corrections required.
- [x] Final evidence, completion limits and owner log reconciled.

## Future implementation

This increment allocates no application change IDs or writing authority. The design provides bounded foundation/hosting handoffs and prerequisites; dependent execution waits for a fresh implementation assignment and the relevant selected design/access evidence. Documentation delivery and review are complete independently of those open implementation decisions.

## Executed handoffs

- Parent → `/root/foundation_research` and `/root/hosting_research`: parallel read-only research at the source base and dated inputs above; exact scope/no-write boundaries in change.md. Both returned source-linked recommendations and actual research limits; neither wrote repository files or ran application/provider operations. Selected configured roles are Foundation/Hosting engineers (Luna/xhigh); model-provider routing was not independently inspected.
- Parent → `/root/requirements_reconciliation`: initial read-only preparation, then an explicit sequential research handoff authorising only the four canonical paths in change.md. The analyst read its definition and reconciliation/acceptance skills, incorporated the user-confirmed key mechanism and evidence-backed failure context, and returned the four-file diff plus ID/link/whitespace checks. Parent reviewed the actual diff; no technology proposal was adopted as a human decision. Configured analyst is Sol/high.
- Parent → `/root/specification_review`: independent read-only audit with the actual user conversation, raw PDFs, source revision, actual nine authored outputs and preserved-input snapshot; read the reviewer definition/audit skill. Initial and final full-content reviews returned no actionable findings; final refresh covered completed design research and current records/log. Reviewer inspected source references/Git and ran isolated document checks without editing reviewed artifacts. Configured reviewer is Sol/high; actual checks/limits and final evidence-only recheck belong in verification.md.
- Parent owns all record/design/log corrections; analyst remains the sole canonical-file author for any material spec correction. Reviewer rechecks material corrections and final evidence/status consistency. Human review is recorded on the eventual PR; no local duplicate approval gate.

## CLI-route follow-up — 18 October 2026

Keith selected CLI deployment after the initial delivery. Reuse this change/branch and owner log entry 02; no new change ID or PR increment. Source: same HEAD plus the preceding reviewed working copy, captured in `/private/tmp/turnup-cli-docs-before.json` and its Markdown text snapshot. This is a documentation-only selection under G08, not deployment execution.

- Parent writes design.md, change.md, tasks.md, verification.md and log entry 02: selected GitHub Actions → checks/build → Vercel CLI prebuilt route, credential/environment boundaries, planned acceptance/failure evidence and pending issue reconciliation.
- Requirements Analyst writes only specs/decisions.md, specs/shared/deployment-and-retention.md, specs/work-packages/wp-001-foundation.md, specs/implementation-plan.md and specs/integration-handoffs.md. Reflect the selected route, preserve D01–D13 and product requirements/scenarios, retain account/course/model/budget/runtime gaps, and link the design rather than duplicate CLI instructions.
- Independent Specification Reviewer receives the actual follow-up diff, user decision, source references and preservation snapshot after authorship; returns findings read-only. Parent alone records results. Previous review results do not automatically cover this follow-up.
- Planned checks: current ten-path scope/cumulative eleven-path inventory, original log prefix and unrelated-file preservation, all local links/anchors, stable 58 requirements/coverage and 32 scenarios, unchanged earlier decision rows, honest selected-vs-verified state, independent source/privacy/handoff review, and whitespace.

Follow-up outcome: parent and Analyst delivered their assigned documentation; parent structural checks passed and independent reviewer returned no actionable findings after reading the actual follow-up diff. It independently reran the inspected current helper and separate preservation/row checks. Earlier F01 remains corrected historical evidence; no new correction was required. Closing evidence-only status/log consistency and the current seven-file snapshot are recorded in verification.md. No workflow or deployment was executed.

## Foundation-stack/Neon follow-up — 18 October 2026

Consume Keith's explicit selection recorded in change.md; same change/branch/PR increment and owner log entry 03. Source is unchanged HEAD plus the preceding reviewed working copy; before-text/hashes are `/private/tmp/turnup-stack-docs-before-text.json` and `/private/tmp/turnup-stack-docs-before.json`.

- Parent alone writes design.md, change.md, tasks.md, verification.md and log entry 03. Record the selected version families and Neon development/production separation, migration/connection validation and precise remaining setup/evidence.
- Requirements Analyst alone writes baseline.md, decisions.md, shared/deployment-and-retention.md, work-packages/wp-001-foundation.md, implementation-plan.md and integration-handoffs.md under specs/. Remove stale unselected-foundation claims; link technical choices to design; preserve existing behavioural rows, IDs, other gates and account/AI-policy decisions.
- Independent Specification Reviewer performs a read-only audit after authorship; parent records findings/rechecks. Earlier review results apply only to earlier snapshots.
- Checks cover exact eleven-path prompt/twelve-path cumulative scope, preserved prior log prefix and unrelated inputs, links/anchors, unchanged 58 requirements/coverage IDs and 32 scenarios, D01–D13 and unrelated gates, current-vs-historical status, and whitespace. No application/runtime/account/provider checks are claimed.

Next bounded application assignment consumes the selected stack, Neon and CLI route without reopening those choices. It must allocate exact files/revision and an independent Implementation Verifier, provision only its authorised resources, validate/pin exact versions and produce actual setup/migration/hosted evidence. G04/G08 retain remaining dependent access, limits, region/recovery, policy and execution prerequisites.

Follow-up outcome: parent and Analyst delivered assigned paths; structural checks and independent full-content audit passed with no actionable findings. Reviewer independently checked preserved inputs, unchanged rows/scenarios/log history and the eight-file design/spec snapshot. No corrections were required; actual checks and closing consistency are recorded in verification.md. Documentation delivery completes without installation, provisioning or runtime acceptance.

## Final-tip review follow-up — 18 October 2026

The user requested assessment of the missing independent review for the local-only reference update. Source tip: `d29aa0e2ca8e324aa29dc6d38c24bbdf03cd9544`; actual update: `bd44c11..d29aa0e`. Earlier completed tasks/reviews retain their historical scope.

- Sole writer: parent for this change's change.md, tasks.md, verification.md and the existing Keith log, entry 05. No design, canonical specification or application changes are assigned here.
- Independent reviewer: `/root/final_design_review`, configured Specification Reviewer, read-only. Audit the final design/reference policy and affected canonical contracts, inspect the actual follow-up diff and evidence, reproduce the eight-file snapshot, then recheck final corrected evidence/status.
- Outcome: independent final-tip content audit passed; the reported medium-severity F02 is corrected by the review and the status/evidence reconciliation. No additional actionable content findings or design corrections were required. Exact checks, snapshot and closing evidence recheck belong in verification.md. This assignment authorises no new implementation, deployment, commit or remote mutation.
