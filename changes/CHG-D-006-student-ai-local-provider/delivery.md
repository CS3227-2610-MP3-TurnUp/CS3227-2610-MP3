# D-005/D-006 local Student assistant delivery

## Preview delivery authorisation — 22 October 2026

The current delivery branch is `preview/WP-006`. The user authorised logical commits, push, a PR to `master` and Preview deployment through the existing protected-branch workflow. This supersedes historical no-delivery statements below for this increment only. Completed local integration does not mean full WP006 completion: the chat and its inference endpoints remain deliberately disabled on Vercel. Hosted admissions/provider operation, organiser contact and the remaining inbox/history capabilities still need their own implementation and evidence.

Delivery checks: the current affected Student assistant suite passed 303 tests across 18 files. Existing scoped SQL, types, lint, build and production-denial evidence is retained in verification.md; no new provider calls, allowance changes or database writes were performed for delivery. Registration diagnostics and generated next-env.d.ts are excluded and preserved locally. Local customisations, environment files and private allowance state are excluded from every outgoing commit. Newer changes have main-agent verification only under the user's explicit override; earlier independent review remains historical.

Current checkout: branch codex/wp-006-student-ai-components, HEAD32d62e315ce7b59ef5d77c835c64c0b86b1d1d60 plus uncommitted work. The approved local real-publication Q&A extension is implemented and verified offline; successful live answering remains unverified. Main-agent-only implementation/review by explicit human override; no commit/push/deploy. Earlier base/hash/manifests below preserve historical snapshots and do not cover later changes automatically.

## Real-publication Q&A delivery increment — log entry22

Latest amendment,entry23: chat now displays only concise prose,with evidence/quotes/section/revision/unresolved metadata kept internal. Source/citation disclosure and duplicated unsupported-question lists were removed. Partial/unanswered facts get a short positive check-with-organiser suggestion;prompt v4 directs focused natural phrasing without assumptions or invented contacts. The real source includes server-formatted Singapore schedule text;no model timezone arithmetic needed. A changed deterministic projection now invalidates old transcript despite unchanged underlying publication identity. Source/evidence validation remains;it does not establish semantic entailment. Keith's future public contact field/type/validation/safe destination is still needed for a working contact action;there is guidance only,not a fake link/button or auto-forwarding.

Entry23changed paths: src/features/student-assistant/chat-panel.tsx,publication-chat.tsx,demo/scenarios.ts;src/server/student-assistant/answer.ts,publication-source.ts;tests/student-assistant/rendering.test.ts,provider-answer.test.ts,publication-source.test.ts,publication-chat.test.ts;current D006records/plan/log07;specs/student/faq-and-private-questions.md,shared/ai-and-privacy.md,decisions.md,verification/acceptance-scenarios.md,work-packages/wp-006-faq-and-inbox.md,integration-handoffs.md;docs/ui-screen-patterns.md. No contact schema,migration/provider/config/allowance/live-request or delivery change.

The event detail page now mounts the existing floating chat in pinned loopback development. Opening it loads authenticated current publication data; explicit Send reaches the new local-only answer endpoint. Approved public fields/title and form labels/help/types/required flags/options form the source. Only selected source plus current question enters the existing server-only provider client; no fixture fallback/history/private profile/answers/drafts. A fresh authenticated source/evidence check withholds replaced/withdrawn/cancelled/revoked/expired results. Provider failures remain technical failures and no organiser delivery is claimed. Same-source refresh preserves conversation; changed/unknown/unavailable source hides evidence while preserving the question. No automatic inference retry, allowance renewal or shared database change.

Implementation paths for this increment:

- src/server/student-assistant/answer.ts
- src/server/student-assistant/publication-source.ts
- src/server/student-assistant/publication-lifecycle.ts (boundary comment only)
- src/server/student-assistant/publication-answer.ts (new)
- src/app/api/dev/student-assistant/publication/[eventId]/answer/route.ts (new)
- src/features/student-assistant/publication-answer-transport.ts (new)
- src/features/student-assistant/publication-chat.tsx (new)
- src/features/student-assistant/chat-panel.tsx
- src/app/student/events/[eventId]/page.tsx

Affected tests: provider-answer.test.ts, publication-source.test.ts, rendering.test.ts, publication-sql.integration.test.ts, and new publication-answer.test.ts/publication-answer-route.test.ts/publication-answer-transport.test.ts/publication-chat.test.ts under tests/student-assistant. Existing publication-lifecycle tests were also exercised. Plan/D006records/log07 and the FAQ/scenarios/WP006/handoff specs carry the same scope/evidence. Preserve inherited staged files, untracked publication prerequisite files, generated Prisma/Next files, unrelated registration diagnostic edits and private/local-only settings; no index action was performed.

Checks and initial corrections are detailed in verification.md: mocked route/service/transport/controller/projection/rendering checks,12disposable SQL cases,scoped lint/types,production build and actual production API404/private-no-store checks. Development server restored at127.0.0.1:3001;normal browser/auth origin remains http://localhost:3001. An unauthenticated local sourceGETreturned401/login_required,verifying restored local guard without DB/provider dispatch. All new evidence is MAIN-AGENT VERIFICATION ONLY. No agent-issued live request or measured provider-token use in this increment; Codex prompt-token totals unavailable.

Manual handoff: log in as Student at http://localhost:3001/student, open a currently published future event and choose Ask about this event at bottom right. Opening/refreshing chat reads source only. Actual Send consumes the existing private local allowance and contacts SoCLaaS; the agent did not exercise it live. The latest entry23UI shows only the conversational reply and uncertainty/contact suggestion,not View sources. For offline samples use the development simulation page and Supported/Partly answered/Not in the source scenarios;no live requests are needed. Check close/Escape/mobile layouts separately;no automated visual/browser acceptance is claimed. Preserve the existing1000output-token/20000ms caps,10secondspacing and expiry;do not reset/increase if blocked.

Remaining: started/past FAQ policy, publications above32KiB assistant source size,live semantic/relevance/completeness and cap sufficiency, authenticated visual acceptance, provider/hosting handling and durable shared admissions, private forwarding/My Questions/Organiser inbox/replies, retained-history policies and full WP006 acceptance. No new migration is needed; shared-target migration status/application remains Keith-coordinated. WP005 integration uses the same reviewed publication and does not require direct access to its raw generated fields or PDF.

## Completed

D005: floating nonmodal event chat; transient current-source transcript; five answer states; schema/exact-quote validation; inert rendering, cancellation/stale-response/failure handling; synthetic scenarios. Close/reopen retains volatile state; no Clear chat or visible keyboard instructions.

D006: server-only adapter reusing unchanged shared client, server-owned synthetic sources, loopback development route, explicit Simulation/Live mode, durable admission and safe six-setting projection. No real publication or hosted Student endpoint.

Saved single generation: HTTP200, finish_reason length, no usable content.361prompt+512completion=873provider tokens. Allowance3->4attempts,1536->2048reserved output. No successful answer/evidence; unknown reasoning breakdown. No further live request or allowance change in finalisation.

Fix: preserve shared invalid_response instead of provider_unavailable. Earlier focused independent review covers mapping and missing-content test. Final empty-content/truncated-JSON test additions have MAIN-AGENT VERIFICATION ONLY. Earlier full review evidence remains in verification.md. Targeted suite188tests/11files passed with --maxWorkers1; previous worker-start error resolved without unrelated suites. Types/lint results recorded in verification.

## Exclusions and future delivery batches

Exclude AGENTS.md, next-env.d.ts, all .agents/.codex customisations, .env files, .student-assistant-local state/reports and build outputs. Preserve those local changes. WP004 unchanged; no package/schema/migration/shared-provider/workflow changes. No staging performed.

If separately authorised, logical batches are components/widget/synthetic harness; local provider/admission/config helper/tests; specs/plans/records/log. Deliver final integrated versions of overlapping paths.

## Remaining boundaries

Successful live answer/evidence/relevance requires a separately approved test and permitted budget/configuration decision. Current512cap is unchanged; no larger value/model/provider option is inferred. Do not retry under current authority.

Hosted integration still needs Keith publication/revision/availability/recheck handoff, authenticated Student access, shared persisted rate/concurrency/budget accounting, verified provider limits/handling and intended-host evidence. Current harness denies production/Vercel. Private forwarding, recipient/idempotency/thread persistence and My Questions/Organiser inbox remain future work with applicable G07 decisions. No full WP006/G04/G08 completion claim.

## Offline walkthrough

Open localhost3001/dev/student-assistant with the pinned loopback server; keep Simulation. Exercise supported/partial/unsupported/clarification/off-topic cases and inspect quotes. Simulate invalid evidence/timeout: preserve draft, no supported-answer/sent claim. Replace/withdraw source: discard old evidence/stale completions. Close/reopen keeps current volatile history; reload clears it. No live Send.

## Exact delivery paths
- .gitignore
- changes/CHG-D-005-student-ai-components/change.md
- changes/CHG-D-005-student-ai-components/tasks.md
- changes/CHG-D-005-student-ai-components/verification.md
- changes/CHG-D-006-student-ai-local-provider/change.md
- changes/CHG-D-006-student-ai-local-provider/delivery.md
- changes/CHG-D-006-student-ai-local-provider/tasks.md
- changes/CHG-D-006-student-ai-local-provider/verification.md
- docs/plans/wp-006-student-ai-components-plan.md
- docs/plans/wp-006-student-ai-local-provider-plan.md
- logs/darryl/07-student-ai-components.md
- scripts/copy-student-assistant-env.mjs
- specs/integration-handoffs.md
- specs/verification/acceptance-scenarios.md
- specs/work-packages/wp-006-faq-and-inbox.md
- src/app/api/dev/student-assistant/route.ts
- src/app/dev/student-assistant/page.tsx
- src/app/dev/student-assistant/preview.tsx
- src/features/student-assistant/chat-panel.module.css
- src/features/student-assistant/chat-panel.tsx
- src/features/student-assistant/chat-widget.tsx
- src/features/student-assistant/demo/scenarios.ts
- src/features/student-assistant/dev-transport.ts
- src/features/student-assistant/evidence.ts
- src/features/student-assistant/state.ts
- src/features/student-assistant/types.ts
- src/server/student-assistant/answer.ts
- src/server/student-assistant/development-policy.ts
- src/server/student-assistant/local-admission.ts
- src/server/student-assistant/synthetic-source.ts
- tests/student-assistant/dev-transport.test.ts
- tests/student-assistant/evidence.test.ts
- tests/student-assistant/local-admission-failure.test.ts
- tests/student-assistant/local-admission.test.ts
- tests/student-assistant/preview.test.ts
- tests/student-assistant/private-config.test.ts
- tests/student-assistant/provider-answer.test.ts
- tests/student-assistant/provider-route.test.ts
- tests/student-assistant/rendering.test.ts
- tests/student-assistant/state.test.ts
- vitest.config.ts

## Latest local test update (entry14)
User approved4096output cap; exactly one new generation failed before HTTP response (4212ms),provider usage unknown. Private counters now5/5attempts,6144reserved; no retry/refund/reset. No product files changed; private allowance excluded from delivery.4096success still unverified. Earlier512cap statements describe prior test, not current allowance.


## Conversational refinement (entry17)
Adds bounded natural reply with verified source quotes in expandable disclosure and subjective/unknown prompt examples;legacy quote-only candidates remain compatible. Source provenance is validated,paraphrase semantics are not proven. No live quality claim. Additional exact delivery paths beyond prior manifest:specs/shared/ai-and-privacy.md,specs/student/faq-and-private-questions.md,docs/ui-screen-patterns.md. Existing source/test paths in manifest carry current integrated versions. All entry17 changes have main-agent verification only;earlier independent hashes are historical.


## Delivery authorisation -entry18
Darryl authorised local commits in logical batches on22October2026;this supersedes earlier no-commit statements only for this delivery. No push or deployment. Two batches:chat components/conversational replies and local provider/devpreview. Private configuration/allowance and local customisations excluded;source verification remains as recorded. Git history is authoritative for resulting hashes.

## Publication prerequisite extension -entry20

Approved plan:docs/plans/wp-006-publication-source-integration-plan.md. Producer1f0aa87 integrated by uncommitted merge;HEAD remains6d5d250. Real-source Student GET/inspection and final source/session rechecks implemented;no inference connection. No new migration;incoming20261021000000_events and schema match producer. Future-start/empty-form/existing-size bounds,refresh-based generic lifecycle denial,interactive DB/auth prerequisite and main-only verification explicit in verification.md. Earlier synthetic-only limits are historical for this extension. No commit/push/deploy authorised here;incoming files remain staged by merge,consumer edits are unstaged/untracked. Do not abort/reset merge or discard existing work without instruction.

Additional exact paths beyond earlier delivery lists (producer import is separately identified by1f0aa87):
- docs/plans/wp-006-publication-source-integration-plan.md
- vitest.config.ts
- src/server/student-assistant/publication-source.ts
- src/server/student-assistant/publication-lifecycle.ts
- src/server/student-assistant/publication-http.ts
- src/app/api/dev/student-assistant/publication/[eventId]/route.ts
- src/app/dev/student-assistant/publication/[eventId]/page.tsx
- src/features/student-assistant/publication-transport.ts
- src/features/student-assistant/publication-preview.tsx
- src/features/student-assistant/chat-panel.tsx
- src/features/student-assistant/chat-widget.tsx
- tests/student-assistant/publication-fixture.ts
- tests/student-assistant/publication-source.test.ts
- tests/student-assistant/publication-lifecycle.test.ts
- tests/student-assistant/publication-route.test.ts
- tests/student-assistant/publication-preview.test.ts
- tests/student-assistant/publication-sql.integration.test.ts
- tests/student-assistant/publication-sql.config.ts

## Latest hosted Preview increment — log26

The approved200attempt hosted slice is now implemented locally;earlier localhost-only statements describe the previous delivery. Product /api/student/events/[eventId]/assistant/source and /answer routes use the existing current-publication/evidence core and new durable admissions. Workflow activates the approved Preview budget once with seven-dayexpiry and enables only preview/WP-006. Actual hosted deployment/activation results must be checked separately. Production stays disabled;no local secrets/allowance files/customisations delivered. See hosted plan and current verification;no full WP006,live quality or contact/inbox completion.

## Hosted Preview deployed — 22 October2026

Code f2272eb deployed successfully by push run39756062772;PRchecks39756070008also passed. Deploymentjob119748299791passed migrations,one-time activation and stablealias source-only anonymous401smoke. Activation reported0/200attempts used;no inference. Candidate https://turnup-2wqk5nxvy-mp3-dd27.vercel.app ;use https://turnup-team-preview.vercel.app as the configured browser/auth origin. Real-source corner chat is now enabled on that Preview deployment. No authenticated browser/live-answer quality or Production result is claimed. No agent live request,localallowancemutation or reset occurred. Later records-only redeploy is a separate run and must preserve counters/expiry.

## Separate Student provider credential — 22 October2026,log27

Darryl authorised explicit per-assistant credentials. Student local/synthetic/real-publication and hosted configuration now reads only STUDENT_SOCLAAS_API_KEY through a server-only adapter;missing/invalid Student key never falls back to SOCLAAS_API_KEY. Shared/Organiser readSoCConfig and client remain unchanged. Shared model/baseURL/numeric limits stay shared and Student caps/admission stay unchanged. Configure the new server-only variable privately in Vercel Preview before deploying;leave Keith's shared/Production values unchanged. The new variable is not NEXT_PUBLIC_ and is not sent to the browser/model prompt. Existing private local personal key was mapped to the new local name only if absent,preserving all original settings and allowance;no key was copied to GitHub/Vercel or tracked files.

## Silent publication refresh — log28,22October2026

Darryl approved keeping existing conversation/draft visible during routine open/focus/source-only checks,without loading-status flicker or composer disruption. Focus during an active answer does not cancel or replace that request;server initial/final source/session/evidence checks remain authoritative. Unchanged checks preserve edits/history;overlapping/stopped/superseded requests cannot publish old results. A confirmed replacement immediately invalidates old replies and reloads the current source without resending the draft;actual unavailability/checkfailure still clears stale source and shows a friendly status. This supersedes earlier instructions to clear the transcript at the start of every routine check. No new inference,provider/key/budget/schema behavior.

## Production activation authorised — 22 October2026

Darryl requests Production Student chat,push/merge and explicitly chooses a separate200attemptProductionpoolwithsamePreviewlimits. NewProductionapproval and matchingVercel/app/DBlabels preserve Preview counters and strict environment isolation. Additive20261022020000migration expands the budgetenvironmentCHECKonly;target-specificactivationneverresets/replacesexistingrows. ProductionusesitsownSTUDENT_SOCLAAS_API_KEY;Organiserkeyunchanged. Existingcandidate/root/sourceguard and protectedpromotionworkflowretained. See docs/plans/wp-006-production-activation.md and ownerlog08forcurrentchecks/outcomes;earlierProduction-disabledstatementsarehistoricalforthisapprovedextension. Noagentliveinferenceorfullpackagecompletion.

## Response reliability increment - log09

Ready for focused PR delivery: compact provider output bound to trusted source identity, friendly conversational/clarification instructions, complete JSON-fence handling, truncation metadata, metadata-only failure classification, friendly retry copy and offline regressions. Existing strict evidence/lifecycle checks, Student key isolation and local/Preview/Production budgets are unchanged. No live-inference quality result; organiser contact-field integration and other full WP006 dependencies remain pending. See log09 and verification.md for exact checks.

## Persistent event history - log10

New increment on mergedPR30base02bdca7: migration20261022030000,PrismaUser/Eventhistory relations,private server append/read,local/hosted historyGET routes,validated browser restoration and account/event keyed widget. No model history context,live inference,API key change or budget reset. Current publication/session/evidence checks suppress changed/withdrawn/cancelled history. Deploy migration before serving code;Preview workflow runs migrations. Production requires this new PR's merge and protected deployment. Hosted walkthrough andG06scheduled/backup retention remain pending.
