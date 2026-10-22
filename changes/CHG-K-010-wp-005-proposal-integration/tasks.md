# Tasks and file ownership

Orchestrator /root follows sdd_coordinator; owns this directory, logs/keith/14-wp-005-proposal-integration.md, scoped specs/docs status updates. No application code authorship.

Application agent: application_foundation_engineer, explicitly assigned feature integration. Owns src/features/proposal-assistance/**, src/server/proposal-assistance/** EXCEPT transport.ts, src/components/events/**, src/app/api/organiser/events/[id]/proposal-extraction/**, tests/proposal-assistance/** EXCEPT transport.test.ts, package.json, pnpm-lock.yaml, .env.example, vitest.config.ts, next.config.ts, src/app/globals.css. Selectively reuse prototype parser/processor/validator/types; no prototype development endpoint/page port. Sole dependency/config writer.

Provider agent: hosting_soc_engineer. Owns src/server/proposal-assistance/transport.ts, tests/proposal-assistance/transport.test.ts, src/server/ai/soclaas-{client,config,error-diagnostics}.ts and corresponding tests only. Coordinate interface with application before writing. No shared manifests/schema/gate changes without sequential reassignment.

Provider contract: export requestProposalCompletion(input:{system:string;user:string;signal?:AbortSignal}) returning prototype-compatible discriminated completion result for processExtraction. Application owns prompt/processor and imports this function. Provider owns guards/model/profile/budgets and exports documented availability semantics. Agree exact reuse types together before dependent work. No caller model/prompt settings in HTTP API.

Endpoint: POST /api/organiser/events/[id]/proposal-extraction, multipart file + expectedVersion + revisions JSON {source,facts,editor}. Authenticate/origin/role/owner/editable state/version before parsing/inference and recheck before delivery. Return validated extraction + revisions; no persistence or publish. Findings can keep prototype purpose/feeStatus internal IDs with explicit adapter to EventFields description/fee. Server-owned prompt aligns labels/bounds. Session only private state. Manual correction of missing/conflicting fields; complete source dates/times prefill as canonical UTC with explicit source timezone or accepted SGT default when omitted. No invented date/time components or ambiguous zone defaults. Concurrent client edit/source change must reject output.

- [x] Implement application and provider assignments with disjoint writers.
- [x] Run focused/full tests, lint, typecheck, schema/build and scoped local UI attempt; browser limits recorded.
- [x] Independent implementation_verifier review; author fixes/recheck.
- [x] Record exact evidence/limits and final status. No hosted/live claim from mocks.

## Temporary local UI verification assignment

Application agent additionally owns src/app/dev/wp005-check/page.tsx, temporary local-only route mounting the real editor with synthetic mocked fetch responses and no credentials/database/provider. May create a disposable synthetic PDF in /private/tmp for local upload control checks. Coordinator drives native Edge. Remove temporary route/fixture and stop server before final source freeze/build/review; never retain this route in final product. No test auth bypass in product endpoints.

## Generate-to-prefill amendment — 22 October 2026

Keith requested automatic prefilling of all successfully extracted known fields into the existing Event Creation inputs, including normalized complete dates/times, with quote/page evidence directly below corresponding inputs. Supersedes per-field Apply and duplicate date controls; Save/Preview/Publish remain explicit. Missing/invalid/conflicting/unprocessed findings do not overwrite existing values. Existing fields at Generate snapshot may be replaced by successful extraction; newer edits while processing still reject the response. Evidence must identify the generated value and stop claiming justification after manual edits. Current next-env.d.ts modification is pre-existing for this amendment; preserve its exact bytes, original prototype and private env.

Application agent is sole implementation writer for current assigned app paths plus existing field-adapter/date helpers under src/features/proposal-assistance and related tests. Own UI, prompt/schema/server date validation and regressions sequentially; no provider transport/config change required. Coordinator owns specs/docs/records/log. Independent implementation_verifier reviews completed amendment and material fixes. Date storage is canonical UTC ISO; existing editor displays Singapore local time. Keith clarified: complete source date/time with omitted timezone defaults to Singapore time (+08:00); explicit source timezone takes precedence, ambiguous stated zones/missing calendar/time components stay unresolved. Implement strict canonical UTC output plus visible SGT-default note, not mandatory timezone-evidence rejection. No live provider/DB/migration/config/commit/deploy.

## Title capture and date-layout correction — 22 October 2026

Keith reports the guide's basic synthetic proposal title is not prefilled and date inputs move/stretch when one field's evidence disappears. Continue same increment/worktree, preserve all existing private/generated/user state. Application agent owns assigned prompt/parser/adapter/components/CSS/tests to investigate title handling end-to-end and fix date-grid intrinsic alignment. Keep exact evidence validation; no guessed title fallback, quote repair, raw-payload logging or extra Generate calls. Investigate flattened heading text, required title JSON shape/limits/duplicates. Add guide-fixture heading→title validation→prefill regression and current layout interaction evidence. Coordinator owns records/spec/docs/log. Independent implementation_verifier reviews completed changes.

Temporary UI fixture if useful: application owns src/app/dev/wp005-layout-check/page.tsx, synthetic local-only markup/components using current global CSS and a remove-evidence control. No real auth/DB/provider and no changes to user server/config; remove fixture before final review/build. Provider specialist may separately inspect configured non-production gate and perform at most ONE bounded synthetic inference check of the exact guide text using current accepted profile, only if live allowance/unused slot is confirmed; no reset/recovery/automatic retry or real/private data. Return sanitized title classification/validation/prefill results, not credentials/raw private data.

## File picker and field punctuation refinement — 22 October 2026

Keith requested replacing native No file chosen/extra Selected row with one filename+size status at the selection control, returning to No file chosen on Remove proposal. Application agent owns ProposalAssistance/CSS/currentprompt/component+processor tests. Use accessible Choose PDF button+hidden native input/custom status if needed; preserve same-file re-selection, disabled/pending behavior, selection-only no upload, Remove preserving generated event values. Canceling replacement dialog should preserve current selected proposal. No redundant native filename status/Selected row.

Prompt-only punctuation change: instruct generated field values/conflicting alternatives not to append terminal sentence full stops; omit sentence-ending periods where appropriate while retaining meaningful internal punctuation/decimals/abbreviations, canonical timestamps, and verbatim evidence quotes. Do not add broad punctuation-stripping postprocessing or weaken quote checks. Increment promptversion. Coordinator owns specs/docs/log/evidence. Independent implementation_verifier reviews final change; no providercall/budget use/privateenv/dependency/migration/commit/deployment. Preserve current next-env snapshot/user processes.


## Local synthetic allowance refill — 23 October 2026

Keith explicitly authorizes an additive allowance of ten attempts with4096output tokens per attempt. Provider agent owns only the local private environment's two cumulative cap values and the non-production singleton gate's matching caps; preserve all counters, leases, last-admission time, concurrency and interval. Coordinator owns evidence/log. Independent verifier reads back the executed operation. No inference, reset, server restart, deployment, provider quota purchase or application change.


## Conflict selection and description refinement — 23 October 2026

Keith requests clickable conflict suggestions that fill their matching original textbox and disappear; human-readable SGT date/time suggestions that apply canonical values correctly; purpose/description rephrasing in second person or an impersonal descriptive style; and shortlisting up to three most plausible supported alternatives. Owner choice resolves a conflict, not model confidence. Preserve exact evidence, required bounds, stale/busy guards, explicit Save/Preview/Publish and earlier prompt rules. This is extraction wording refinement, not full ORG07 generation.

Reactivated application_foundation_engineer (gpt-6-luna/xhigh) owns current application components, field adapter, schema/validation/prompt, CSS as needed and tests. Independent implementation_verifier (gpt-6.1-sol/high) reviews completed implementation without authorship. Coordinator owns scoped specs, guide, change evidence and log08. No provider calls, quota operations, dependencies, migrations, user server changes, commits or deployment. Preserve task-start next-env bytes and private configuration. Use isolated sanitized build; record native-browser/live-model limits.


## Field semantics and same-purpose conflicts — 23 October 2026

Keith requests clearer prompt definitions for location/participation venue or remote medium, Open to target participants, preparation participant pre-attendance conditions, and conflict detection among information serving the same purpose. Keep complementary details separate from incompatible alternatives; preserve exact evidence, missing-state handling and existing schema/field bounds. Bump prompt v6. Application agent (application_foundation_engineer, gpt-6-luna/xhigh) owns prompts.ts and processor.test.ts only; independent reviewer (implementation_verifier, gpt-6.1-sol/high) checks the completed amendment. Coordinator owns scoped specs/scenarios/guide/evidence/log09. String/test-only change uses proportional deterministic checks; no live model/DB/gate/private configuration/dependencies/schema/UI/commit/deployment work, and no build/typegen needed absent a material reason.


## Prompt source readability — 23 October 2026

Keith requests readable source formatting in prompts.ts without changing the prompts. Application agent (gpt-6-luna/xhigh) owns prompts.ts only; use readable string segments while preserving all assembled system/user bytes, field/property ordering and v6. Capture the pre-edit source for exact runtime comparison using synthetic empty/single/multipage inputs. Independent verifier (gpt-6.1-sol/high) repeats exact equivalence and proportionate processor/lint checks. Coordinator owns log10 and evidence. No behaviour/spec change, permanent mirrored tests, model call, configuration/generated-file change, build/typegen or commit/deployment.
