# WP-006 real published-event Q&A — proposed plan v1.0

Subsequent explicit approval,entry23: Darryl replaced visible source/citation/unresolved panels with short conversational replies and internal evidence checks. Partial/unanswered facts now lead to a brief check-with-organiser suggestion instead of automatic forwarding. Keith supplies a public contact field in a later iteration;no schema/destination/link is assumed. This approved refinement supersedes the source-disclosure/false-no-send presentation in the original plan below. Local limits/no-live/no-delivery/main-only boundaries continue. Implemented prompt v4,internal-evidence UI and deterministic Singapore display-time projection are recorded in D006verification.

Prepared 22 October 2026 for Darryl. **Approved by Darryl's subsequent “approve”; implementation authorised, with offline verification only.** Main agent is the sole writer; no subagents will be spawned or reused. All later verification under this assignment is main-agent verification, not independent review.

## Revision, ownership and preserved work

Existing checkout: `C:/Users/darry/.codex/worktrees/wp006-student-ai/CS3227-2610-MP3`, branch `codex/wp-006-student-ai-components`, observed HEAD `32d62e315ce7b59ef5d77c835c64c0b86b1d1d60`. Keith's publication revision `1f0aa8773799f44229638cb473ff5584b3d3fb63` is an ancestor. HEAD already includes the merged WP-004 prerequisite through `d2930b3` and the current component/provider commits `99c0b5f` / `32d62e3`; earlier D006 references to the old uncommitted producer merge describe historical snapshots.

Continue D005/D006 and `logs/darryl/07-student-ai-components.md`; allocate no new change ID. Darryl owns this Student integration; Keith retains publication/provider/shared hosted-admission ownership. Main agent alone writes the consumer files listed below. Shared producer, schema/migration, provider transport and registration files are read-only in this plan. Existing staged/unstaged/untracked work, generated Prisma client, `next-env.d.ts`, local configuration, and Student discovery diagnostic changes remain preserved. Do not alter the index, agent/skill customisations, commit, push or deploy.

## Existing capability and concrete gaps

- Existing floating `ChatWidget`, reducer and strict citation/schema validator already support natural short replies, bounded volatile history, draft preservation, unsupported/partial/clarification outcomes and failure rendering. The sample harness can use the guarded server-only SoCLaaS adapter.
- `loadPublicationSource`, `recheckPublication` and `deliverPublicationAnswer` already consume `currentPublication`, bind publication UUID/revision/digest and reject stale/unavailable/revoked-session results. The separate development GET/inspection page cannot generate answers.
- `/student/events/[eventId]` currently renders only event details/registration. No real-event chat controller or authenticated answer endpoint exists. `answerSynthetic` performs fixture lookup and its prompt explicitly says synthetic; it cannot safely be called with an arbitrary real event ID.
- `projectPublication` currently refuses nonempty forms. The current D007 producer supports approved form questions, so the consumer must understand their public labels/help/options without fetching submissions. Add a citable title section as well as the existing title identity.
- Publication bounds allow 48,000 public-text bytes; the current assistant ceiling is 32,768 serialized source bytes. Keep the smaller assistant ceiling and fail explicitly on overflow; do not truncate or raise limits.
- Started/past-event Q&A is still denied by the existing `timing_policy_pending` policy. Keep this boundary for this slice. WP-004 post-start detail access does not resolve FAQ timing automatically.
- The strict development gate expects a server bound to `127.0.0.1:3001`. The recent local restart used `--hostname localhost`; after approval restore the existing loopback binding for testing. Browser origin must still match the existing local auth origin. Do not weaken the gate or rewrite auth configuration.

## Current private local limits (read-only snapshot)

Observed at 22 October 2026, approximately 15:28 Singapore time. Key presence was checked without displaying it. Base URL is the existing fixed SoCLaaS `/v1` endpoint and model is `qwen3.8:27b`.

| Setting | Observed value / effect |
| --- | --- |
| Environment ceilings | 65,536 input bytes; 4,096 output tokens; 30,000 ms |
| Local effective ceilings | 65,536 input bytes; **1,000 output tokens; 20,000 ms** |
| Attempts | 10 used of 150 total; **140 remaining** at this snapshot |
| Output reservation | 20,432 reserved of 160,432; 140,000 remaining reserved-output headroom |
| Spacing/concurrency | At least 10,000 ms between admissions; one in-flight local reservation |
| Expiry | **22 October 2026, 22:43:56.617 Singapore time** |
| Operator confirmations | Model permission and handling flags are true; no admission lock observed |

Reservations are conservative accounting, not actual provider consumption; input tokens are additional. These local confirmations/limits do not prove provider quota, live answer quality, or hosted permission. Re-read state before any later use; expiry/exhaustion blocks requests without renewal, counter reset or increased limits. Synthetic and real-publication local requests will share this same allowance, not receive separate extra attempts.

## Proposed smallest usable connection

1. On the authenticated real Student event page, show the existing corner launcher only in the existing pinned local-development environment. Asking does not require registration and changes no registration records. The real event source and sample harness remain separate; there is no sample fallback.
2. Opening/refocusing/refreshing the widget makes only authenticated source reads. Resolve the path event ID on the server, query its current `PUBLISHED` pointer through Keith's reader, validate its full canonical digest and parse public fields/form using the existing D007 validators. Project all approved public text, including each question's label/help/options/type/required status, into stable citable sections. Exclude drafts, owner identity, submissions, profiles, contact values, private replies and other events. Published capacity remains labelled as the advertised limit, never remaining places.
3. Add a local-only authenticated POST at `/api/dev/student-assistant/publication/[eventId]/answer`. Accept exactly `{ requestId, revision, question }`; event identity comes from the path, actor from the cookie, and source/owner can never be supplied by the client. Enforce strict UUID/revision/question validation, the existing 8 KiB streaming body limit, same-origin/host/JSON checks and private no-store responses. Invalid, anonymous, wrong-role, unavailable or stale-source requests fail before provider admission.
4. Refactor the existing server answer adapter into a shared source-based generation core plus the existing synthetic wrapper. Only trusted server adapters supply validated sources. Use a versioned neutral public-event prompt rather than calling real content synthetic. Send only this selected public source and current bounded question, with no conversation history, account/submission data or model tools. Preserve natural concise replies and exact citation checks. Use the existing server-only provider client with the effective admitted configuration; no shared-client/config/allowance-policy edit. The consumer fetch adapter will deny redirects and perform one provider attempt with no automatic retry.
5. After generation, perform a fresh authenticated publication read and binding/evidence check immediately before returning a result. A replaced/revised pointer discards output and asks for explicit refresh; withdrawal/cancellation/absence share generic unavailable. Revoked/expired sessions deny delivery. Private draft saves alone do not invalidate public chat. Recheck lifecycle after provider failure too so known unavailable content is cleared rather than retained behind a generic provider error. Hold no database transaction/row lock across inference; release the local admission lock on every exit. A failed/unknown remote result never resets or refunds the allowance.
6. The browser uses cookies, validates the response/request/event/revision identity and validates candidate evidence again. Ignore delayed responses after navigation, source replacement or a superseding request. While source freshness is unknown or unavailable, hide previous transcript/excerpts and disable sending; preserve the safe question draft. An unchanged source recheck should retain the existing conversation. Refresh/source-change never automatically resends a question.
7. Keep the nonmodal corner layout, accessible launcher/close/Escape focus behaviour, concise messages and expandable sources. No Clear Chat button or keyboard-instruction text. Change sample-only copy for this real-publication mode. Unsupported/partial answers truthfully say that organiser follow-up is not connected and no question was sent. Clarification remains bounded to the current question; genuine multi-turn contextual reasoning is deferred because display history is not model context.

Approving this plan authorises implementation and offline verification of this local route, whose explicit user Send action uses the existing private allowance for the selected approved non-production publication. **It does not authorise the agent to send a live request.** Do not send personal values in test questions; no production source/database is connected by this work. A separately authorised live check remains a later step.

## Exact planned writable paths

All paths below are relative to the existing WP-006 checkout. Existing files are changed only as needed for this slice; the main agent is their single writer.

| Files | Planned responsibility |
| --- | --- |
| `src/server/student-assistant/answer.ts` | Shared source-based generation core, synthetic compatibility wrapper and versioned public-event prompt; sanitized candidate result |
| `src/server/student-assistant/publication-source.ts` | Consume canonical approved nonempty forms; include citable title and complete public form text; retain digest/size/timing checks |
| `src/server/student-assistant/publication-lifecycle.ts` | Reuse/factor final binding and evidence checks without changing producer contracts |
| **new** `src/server/student-assistant/publication-answer.ts` | Authenticated load → admission → one generation → final recheck orchestration and safe failure mapping |
| **new** `src/app/api/dev/student-assistant/publication/[eventId]/answer/route.ts` | Local-only authenticated bounded POST, private cache headers and strict route/body/origin checks |
| **new** `src/features/student-assistant/publication-answer-transport.ts` | Cookie-bearing bounded POST transport, strict identity/result handling and cancellation |
| **new** `src/features/student-assistant/publication-chat.tsx` | Real-source loading, request lifecycle, draft/transcript preservation or invalidation, widget composition |
| `src/features/student-assistant/chat-panel.tsx` | Explicit real-publication presentation mode and friendly status/failure text while preserving sample mode |
| `src/app/student/events/[eventId]/page.tsx` | Mount the real-publication widget behind the existing local-development condition and Student page guard |
| `tests/student-assistant/provider-answer.test.ts`, `publication-source.test.ts`, `publication-lifecycle.test.ts`, `rendering.test.ts` | Affected adapter/projection/lifecycle/rendering regressions |
| **new** `tests/student-assistant/publication-answer.test.ts`, `publication-answer-route.test.ts`, `publication-answer-transport.test.ts`, `publication-chat.test.ts` | New service/route/transport/controller tests, mocked inference only |
| `tests/student-assistant/publication-sql.integration.test.ts` | Extend existing disposable SQL harness for actual publication/auth transitions during mocked inference, including approved forms |
| This plan; `changes/CHG-D-006-student-ai-local-provider/{change,tasks,verification,delivery}.md`; `logs/darryl/07-student-ai-components.md` | Scope/approval/tasks/results, delivery boundary and structured prompt/token evidence |
| `specs/student/faq-and-private-questions.md`, `specs/verification/acceptance-scenarios.md`, `specs/work-packages/wp-006-faq-and-inbox.md`, `specs/integration-handoffs.md` | After approval, record this local extension and its exact implemented/tested limitations; retain canonical/full-feature requirements |

No dependency installation, schema/migration, provider transport, local-admission algorithm, sample harness behaviour, registration query, .env/allowance file or agent/skill changes are planned. Read relevant installed Next.js guides before product-code changes. If inspection during implementation reveals another material shared-interface/policy dependency, return that specific extension for approval.

## Acceptance checks and proportionate commands after approval

Applicable contracts: SHR02/04/05/07/08; PAR06/07/08/11/12 and only non-forwarding portions of PAR09; SEC01/02/03/05/06. Scenario portions: **T02, T06, T07, T09, T10, T13, T14, T18, T27, T31 and T32**. Read each complete Given/When/Then/method in the canonical scenarios. This slice cannot pass their inbox, real-model quality or hosted portions.

| Check | Expected outcome / method |
| --- | --- |
| Authenticated Student, zero registrations, real future publication | Source loads and mocked supported answer cites exact current text; no join/submission effect. Route/service + disposable SQL |
| Private draft edit vs fresh publication | Draft version alone preserves chat; replacement discards pending output/transcript and requires explicit refresh. Service/controller + SQL |
| Withdraw/cancel/unknown event; revoked/expired session during generation | No answer/evidence delivered; generic unavailable or login status; draft retained, send disabled. Service/route/controller + SQL |
| Current nonempty approved form and hostile labels/options | All approved public text available as inert, citable source; malformed forms/digest rejected; no attendee values/notes/profile/other-event canaries in model request. Projection/context/SSR + SQL |
| 32 KiB source, body/question/response boundaries; forged body/role/source/revision; foreign origin | Strict bounded rejection, no silent truncation or source fallback; no inference on denied input. Unit/route/transport |
| Changed revision, changed event ID, forged quote, invalid schema, empty/truncated JSON | Whole invalid answer withheld; safe fixed error and question preserved; no false claim of missing information or sending. Adapter/service/transport/reducer |
| Timeout, provider 401/403/429/5xx, transport error, cancellation | Friendly distinct technical status, bounded attempt and admission cleanup; no automatic retry/refund. Fake fetch/timers/temp allowance directory |
| Absent/corrupt/expired/exhausted allowance, spacing conflict, concurrent sends | No provider call; existing shared local admission enforced. Reuse existing admission evidence, add orchestration tests; never touch the private allowance in tests |
| Corners/keyboard/320–375 px and desktop; technical/source errors | Details remain usable; open/close/Escape focus and retained draft; no sample-only copy, fake forwarding, Clear action or Enter hints. Mocked controller/SSR plus offline browser if available |
| Development/localhost-binding/production/Vercel boundary | Allowed pinned local configuration works; other bindings/production/Vercel reject both real-source/answer entry points and omit product-page widget. Mock guard/page tests; production build/static inspection, never a live call |

Run a single-worker Vitest selection containing the new four files and the four affected existing files listed above. Reuse unaffected D005/D006/provider/admission checks; rerun only the specific producer/client tests implicated by an actual change/failure. Then run the existing disposable SQL config with `RUN_LOCAL_PUBLICATION_SQL=1`; it creates isolated fixture data and never reads the assigned Neon URL. Run scoped ESLint, `tsc --noEmit --incremental false` and a production build because a route/page boundary is added. Builds remain offline with respect to inference. Run the structured log validator for entry 21 onward and subsequent implementation entries. Record exact results/failures, not assumed passes.

Manual offline walkthrough after implementation uses a mocked inference transport and synthetic publication fixtures: open a Student event, open/close chat, send a supported and unsupported example, inspect sources, retain a failed draft, then replace/withdraw/cancel/revoke during an in-flight fake answer. Opening an actual configured event can check source-only loading, but do not press Send to a live endpoint under the offline test authority. Browser checks remain unrun if browser control is unavailable. Do not seed/change shared Neon data for this walkthrough.

## Dependencies, deferred policy and hosted handoff

- **Local schema:** no new migration. Current checkout has the six existing migrations through `20261022000000_registration`; keep the regenerated Prisma client. Prior local diagnostics found account/event/publication/registration tables present and login/discovery now work; planning does not rerun database checks or certify shared-target migration history. Do not switch to Keith's database to obtain events.
- **G05:** retain current future-start-only FAQ policy, including the boundary crossing while generation runs. Started/past published details remain a WP-004 capability. Decide broader FAQ timing separately.
- **G03/source:** complete public forms now use D007's existing parser/public budget. Publications over the existing assistant envelope fail clearly; broader-size support needs its own source/provider-budget decision. No documents/private extraction retrieval is added.
- **G07/history:** retain only bounded in-memory current-source chat, cleared on detected changes/unavailability. No storage, push invalidation or claim to retract already delivered bytes. Stored-message emergency suppression remains unresolved.
- **Provider quality:** local permission/handling flags are operator assertions. Mock tests establish integration/failure contracts, not natural-answer relevance/entailment, output-cap sufficiency, remaining SoC quota or provider data handling. A later explicitly bounded live test needs unexpired allowance and separate request authorisation. Exact citations do not prove every generated sentence is entailed.
- **Preview/Production:** Keith's provider/budget handoff must supply confirmed permitted model/key/handling/course policy, intended-host connectivity, deployable request/function timeout and durable per-user/shared rate/concurrency/token admission across instances. The file-based local allowance is not deployable admission. Use separate server-only Preview/Production secrets and existing auth origin/configuration, coordinated migration status/application for each intended target, correct publication snapshot/digest contract and synthetic Preview data isolation. Do not copy personal local allowance/credentials into deployments or remove the development guard as a shortcut.
- **Release:** later hosted integration needs separate scope/authority, real cross-role publish → Student ask → replacement/withdraw/cancel/session-revocation evidence, safe diagnostic/usage metadata and recovery checks. No new host/deployment setting is changed now.
- **Full WP-006:** automatic unanswered forwarding, persistent private threads, My Questions, Organiser inbox/replies, idempotent delivery, explicit public reuse, retention and full hosted/live quality acceptance remain pending. This increment truthfully exposes that follow-up is not connected.

## Planning result and approval boundary

The original planning result used actual source, safe private-limit metadata and prior scoped evidence without implementation or external mutations. Darryl subsequently approved v1.0. Implementation/offline verification is recorded under log entry22 and D006verification/delivery;the local slice is complete with the documented live/browser/hosted/full-feature limits. Earlier independent evidence retains its original reviewed scope;this extension has main-agent verification only. No agent live request,allowance/configuration change,shared database mutation,subagent,commit,push or deployment occurred.
