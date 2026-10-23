# WP-006 independent Student assistant components — plan v1

Prepared21 October2026 for Darryl. **Darryl explicitly approved planv1 and CHG-D-005 allocation on21 October2026. Implementation of this synthetic-only scope is authorised; live integration and delivery remain excluded.** This is an independently testable synthetic component slice, not live AI, publication integration or private question delivery. No commit, push or deployment authorised.

## Source and existing work

- Inspected revision: master `54024616eb2c5dd93dcdee458fd66b53c03354b2`, including account/profile prerequisite `4b0aad5`. Current UI/test tooling: Next.js16.3.8/React19.2.8/TypeScript5.9.3/Vitest5.0.4; use the existing locked dependency set, no new package.
- WP-004 plan v0.3 (uncommitted in the original checkout at C:/Users/darry/CS3227-2610-MP3/docs/plans/wp-004-student-registration-plan.md) is attendance-only and conditionally approved, but has **no implemented Student discovery, event/publication or registration code/schema** in this checkout. Its plan/log remain untracked and preserved. No edits to their contents, account/navigation, Student routes or registration directories are part of this slice.
- WP-004 preserved SHA256: plan `29d18823ca77fef20fface7ef8e3d2a1f485e02e8a1dd96a6d46b3ccab9e5a8e`; log06 `939c2ec2c608d04db849cd7eff2fa0086dbd65d6bd0e6914c8e115df8c82d756`. Recheck before handoff. Unrelated agent/setup/docs/generated edits stay untouched.
- Keith's delivered foundation/database handoff: CHG-K-006 based on05e1b42, integrated in current source. His provider code exists at `src/server/ai/soclaas-client.ts`, `soclaas-config.ts`, `soclaas-probe-config.ts` with tests. `requestSoCCompletion` supplies bounded server-only text-completion results/failures; it is **not** an implemented Student evidence-answer contract.
- CHG-K-006 provider handoff is explicitly incomplete: model/ceilings selected, but permission/allowance/spacing/data-handling/course and intended-host inference evidence remain missing. No publication implementation/public-source projection or private-question persistence contract is delivered in available records. Do not call/import the provider client from this feature, read credentials or query a database to fill those gaps.
- Human owner: Darryl; [new increment log07](../../logs/darryl/07-student-ai-components.md). Allocation audit of active/archive/available ref/plan/log records exposes D001–D003, with D004 still an unallocated candidate in WP-004's plan. **CHG-D-005-student-ai-components allocated by Darryl's explicit approval; D004 remains unallocated for WP-004.** Never conflate WP/log numbering with change allocation or consume WP-004's candidate.

## Authority and scope

Read [task map](../../specs/README.md#task-reading-map), [baseline](../../specs/baseline.md), [WP-006](../../specs/work-packages/wp-006-faq-and-inbox.md), [ownership](../../specs/implementation-plan.md), [handoffs](../../specs/integration-handoffs.md), [Student FAQ](../../specs/student/faq-and-private-questions.md), [accounts](../../specs/shared/accounts-and-access.md), [domain/data](../../specs/shared/domain-and-data-contracts.md), [AI/privacy](../../specs/shared/ai-and-privacy.md), [deployment/retention](../../specs/shared/deployment-and-retention.md), [gates](../../specs/decisions.md) G03/G04/G07/G08, Organiser inbox contract and complete affected [T02/T06/T09–14/T18/T27/T31 plus coverage](../../specs/verification/acceptance-scenarios.md). Reused unchanged source/reading context from the same revision; current handoffs/source inspected directly. Visual guidance: existing TurnUp tokens and Student FAQ/private-reply screen pattern.

After approval, complete reusable chat presentation, a pure answer-state reducer and strict evidence validator against synthetic approved-public-shaped fixtures and simulated responses. This demonstrates bounded component behaviour for PAR06–08/11/12 and SEC01–03/06. PAR09/10/12 message delivery and My Questions persistence, ORG15–17 and full live scenarios remain pending.

### Included components

1. **Chat panel:** selected sample event, question composer, pending/answer feedback, exact evidence cards, preserved question after failures, retry, separate partial/unanswered/clarification/out-of-scope/technical-failure states. Use accessible labels/status/error regions, keyboard/focus and responsive TurnUp styling. No arbitrary generated factual prose or unsafe HTML rendering.
2. **Evidence validation:** schema/field allowlist, exact event/publication identity, section IDs and literal quote matching against the selected source; reject empty/missing/mismatched/oversized/malformed evidence. Answered/partial outcomes require valid nonempty evidence; unsupported/clarification/out-of-scope outcomes cannot smuggle factual answer paragraphs. Invalid output is a technical failure, not an unanswered-question claim.
3. **State and stale-result handling:** one pending request, request identity plus event/revision binding, source replacement/withdrawal/cancellation notice, discard obsolete completions, preserve draft for retry. Clear displayed source-derived answers on replacement/withdrawal/event switch rather than presenting old excerpts as current. This is a conservative volatile preview behaviour, not a resolution of G07 stored-message policy.
4. **Synthetic development preview:** deterministic scenario controls for supported, partial, unanswered, clarification, out of scope, timeout/provider failure, bad evidence, source replacement and withdrawal. Fixtures carry labelled questions/expected outcomes. No live transport, persistent chat or pretend inbox delivery. Freeform questions without a matching simulation return an explicit preview-limitation notice rather than pretending an AI analysed them or the source lacks the answer.

### Explicit exclusions

No actual provider request, prompt/model selection, network AI client, API endpoint, database/schema/migration, account/session change, live publication resolver, registration dependency, public Student-page integration, automatic forwarding, direct-question commit, My Questions/inbox, private replies, vector database, document/PDF processing, real usage quota or deployment changes. No credential/environment-file access. No fictional Sent status: unanswered/partial results identify that organiser follow-up is not connected in the preview.

## Internal component interfaces, not Keith's producer contracts

These are newly proposed local types for the independently testable component. They do not redefine Keith's publication/provider DTOs or prove data passed by a caller is approved. No production caller is added. After actual handoffs, adapters and authoritative server checks require a separate approved integration slice.

| Local type/port | Shape and constraint |
| --- | --- |
| `PublicSourceSnapshot` | Sample eventId, revision, public event title and ordered public sections `{id, label, text}`. Only published/available snapshots can provide evidence; unavailable/replaced source is a separate state event. Reject unknown/private fields and duplicate sections. Future server, not browser/model, supplies trusted current values |
| `EvidenceReference` | eventId, revision, sectionId, exact quote. All identity fields must match the selected active snapshot; quote must literally occur in that section, not another section/event/revision. No fuzzy matching or silent Unicode/text normalisation to manufacture a match |
| `AnswerCandidate` | Strict discriminated answered/partially_answered/unanswered/needs_clarification/out_of_scope structure. Answered states contain references, not free-form factual answer text. Partial results separate bounded unresolved question fragments. Clarification is bounded guidance, not evidence. Unknown states/fields and incompatible evidence shapes fail closed |
| `ValidatedAnswer` | Created only by the validator; UI builds a fixed extractive template from verified source quotes/section labels. Raw candidate/provider text cannot bypass validation by being cast into the rendering path |
| `AssistantState/Event` | Question draft, current source identity, pending requestId and validated result/failure. Completion is ignored unless requestId/event/revision still match. New source/event invalidates old evidence; no previous response/history becomes source material |
| `SimulationPort` | Local asynchronous function using fixtures/abort signal. No fetch/provider/DB imports. Simulated timeout/failure/late completion drives the same state handling. The demo cannot make a real authority or forwarding decision |

Proposed **preview-only engineering ceilings**: question1,000 Unicode code points, source32KiB UTF-8 and32 sections, candidate32KiB, up to8 evidence references with quotes≤500 code points, clarification/unresolved fragments≤500 code points. Reject over-bound input without truncating source/answers. These are finite fixture/parser safeguards, not final provider/production G03/G04 budgets; live mapping must respect Keith's actual prompt/input/output/time allowance. One pending request and explicit user retry; no automatic retry loop or model tools.

Exact matching proves provenance of a quotation, **not** that it is relevant, complete, safe to act on or semantically answers the question. Labelled deterministic fixtures check expected presentation/relevance only for those examples. Future live quality evaluation must exercise real model/prompt/source cases; no claim of hallucination-proof or completed T09 follows from substring validation.

## Exact file ownership after approval

Use a dedicated feature branch/worktree from the then-current inspected revision, preserving the current WP-004 plan/log and unrelated edits. Follow worktree reuse/isolation rules; copy only this feature's plan/log where needed. Custom agents/skills remain local-only and never enter staged/outgoing content. No branch/worktree or implementation dispatch in this planning turn.

User explicitly requested specialist implementation and independent verification. A bounded worker will implement the separable evidence/state core and tests; main chat owns UI/preview/integration/configuration/shared records. This keeps core parsing/state work disjoint from browser presentation. One independent non-author verifier then reviews the integrated change; no per-file agents or second coordinator.

| Writer | Exact proposed paths |
| --- | --- |
| Specialist core worker | `src/features/student-assistant/types.ts`; `src/features/student-assistant/evidence.ts`; `src/features/student-assistant/state.ts`; `tests/student-assistant/evidence.test.ts`; `tests/student-assistant/state.test.ts` |
| Main chat UI | `src/features/student-assistant/chat-panel.tsx`; `src/features/student-assistant/chat-panel.module.css`; `tests/student-assistant/rendering.test.ts` |
| Main chat synthetic harness | `src/features/student-assistant/demo/scenarios.ts`; `src/app/dev/student-assistant/preview.tsx`; `src/app/dev/student-assistant/page.tsx`; `tests/student-assistant/preview.test.ts` |
| Main chat only shared executable file | Existing `vitest.config.ts`: add the new deterministic test include; preserve all existing includes/excludes and any integrated WP-004 changes. No package/dependency/configuration changes elsewhere |
| Main chat planning/evidence | This plan; log07; after confirmed allocation, `changes/CHG-D-005-student-ai-components/change.md`, `tasks.md`, `verification.md` |
| Main chat scoped status/scenario updates | `specs/work-packages/wp-006-faq-and-inbox.md`; `specs/verification/acceptance-scenarios.md`; `specs/integration-handoffs.md`: record synthetic component scope/evidence and pending live adapters without changing Keith's contracts or closing open gates |
| Independent verifier | Read-only integrated code/spec/test diff and focused check reproduction; returns findings to parent; no source writes |

The custom feature_implementer type is not exposed in this session. After approval use a built-in worker with the already-read local feature-implementer role/instructions, assigned skills/contract references and exact files; disclose this fallback. No agent/skill configuration changes. The verifier uses the available implementation_verifier role and cannot have authored the reviewed change. Parent writes all logs and integrates results sequentially.

`/dev/student-assistant` is an unlinked **development-only fixture harness**, visibly marked synthetic/no live AI. The server page must return notFound outside development before rendering/importing fixture data. No normal Student route/menu links to it. It deliberately supplies no real user/session/data access: this is not a guest feature or proof of production role enforcement. Production Preview/Production builds must not expose a usable harness. No environment switch that secretly enables live transport.

## Acceptance and verification

| Target | Concrete independent checks and limits |
| --- | --- |
| T09 / PAR07 / SEC03 portions | Valid literal quotes render with section/event/revision; reject fabricated text, wrong section/event/revision, duplicate/blank/missing evidence, malformed structures, unknown fields and all boundary/oversize cases. Irrelevant-but-literal quote fixture must demonstrate why provenance alone is not semantic validation; do not call it verified answer quality |
| T06 / PAR11 portions | Pending completion after source replacement/event switch/withdrawal is ignored; displayed excerpts invalidated; old retry cannot overwrite newer request; draft retained appropriately. This tests local state events, not real publication subscriptions/invalidation |
| T10 / PAR09 portions | Partial supported evidence separated from missing parts; unanswered has no fabricated evidence. No Sent or thread ID/inbox success in UI. Actual automatic forwarding and owner routing remain unimplemented |
| T14/T31 / PAR08/12 portions | Clarification and out-of-scope differ from timeout/unavailable/invalid-schema/evidence failures. Question survives technical failure; bounded explicit retry; duplicate submission disabled; no automatic send/spam; unsupported freeform simulation honestly labelled |
| T12/T18 / SEC01/06 portions | Source DTO/fixture construction excludes private replies/profiles/attendee data/proposals and other-event source; no persistent browser storage/logging/raw provider bodies. Fixture absence/allowlisting is not a proof of future server access control |
| T13 / SEC02 portions | Inert malicious instructions/scripts in source/question/candidate cannot execute/render active HTML, change roles, publish, read files, select recipients or trigger any network/tool action. Check actual effects, not refusal wording |
| Development boundary | Actual production-mode server-page test returns notFound; no normal navigation entry, API/provider/DB call/import, credentials or live fallback; synthetic harness is the only caller |
| UI | Mobile320/375 and desktop1280 layout; long/empty source/question; labelled composer; focus/status/error announcements; visible evidence/source; pending/retry/clear states. Browser scenarios use real components and deterministic simulated responses only |

After approval run the new deterministic suite, scoped lint/types, then relevant full `corepack pnpm lint`, `typecheck`, `test`, `build` gates. Existing SoC tests can run with their mocked transport; no live call. Verify the newly added test directory actually executes. Browser tests/manual simulation walkthrough are separate from model/provider/DB/hosted evidence. Independent verifier reproduces meaningful evidence/state/rendering/boundary checks and reviews privacy/stale handling before completion. No DB/concurrency/provider test is justified by this independent slice.

Manual checklist: open the local development harness; select sample event/question and scenario; submit; inspect exact evidence/state; repeat with partial/unanswered/clarification/out-of-scope/failure/bad-evidence scenarios; retry; replace/withdraw source during a pending response; confirm no obsolete answer or Sent status. Check keyboard and narrow/wide layouts. Production-mode harness must404. Human acceptance recorded only from actual user feedback.

## Remaining handoffs and integration dependencies

1. **Keith publication/source:** actual implementation revision, safe immutable public sections and current event state/revision, authoritative selected-event resolution, replacement/withdrawal/cancellation recheck interface, complete bounded approved content and public-field limits. Client-provided snapshots are never sufficient production authority. No current producer is invented.
2. **Keith provider:** selected permitted model, source-only prompt/result schema agreement, key/allowance/spacing/concurrency/token/time/data-handling/course/intended-host evidence and safe failure mapping. Existing bounded completion transport may be adapted later; this plan does not alter its API or claim its live handoff complete.
3. **Darryl source/evidence contract to Keith:** validated extractive-result expectations and stale-source requirements, labelled fixtures and limitations, plus exact component interfaces. Final server adapters/schema are a later agreed integration change, not a mock promoted into a shared contract.
4. **Private messaging:** actual thread schema, session/role/owner resolution, idempotency, commit-before-sent, inbox/reply consumer and G07 retained-history policy. No fake persistence, owner lookup or automatic forwarding here.
5. **WP-004:** no registration prerequisite to ask a public event question (PAR06). Later Student discovery/details can mount the completed panel after real publication/provider/access integration. Its attendance code and shared test includes must be integrated sequentially; no concurrent writers to vitest/spec files.

G03/G04/G07/G08 remain open only for their dependent live/integrated work; they do not block this fixture-driven component slice. Completed output will be described as UI/state/evidence components with synthetic verification; live AI, real publication/permissions/inbox and full WP-006/T15/T09 quality remain pending.

## Approval and implementation handoff

Darryl approved this bounded plan and D005 allocation on21 October2026. Completed the isolated synthetic component slice with disjoint specialist core, main-chat UI/integration and independent non-author verification. Exact checks, reviewed source manifest, Windows test-environment adjustment, local usage and remaining dependencies are in [CHG-D-005 verification](../../changes/CHG-D-005-student-ai-components/verification.md). This plan remains the authorised scope; no commit/push/deployment or live integration occurred. Human acceptance is pending an actual walkthrough.

Planning-only checks from the prior prompt remain historical: source/handoff/WP-004 inventory, documentation links and structured log validation, with no feature implementation dispatched in that planning prompt. Implementation and agent results are separately recorded under log07 entry02. Token measurements remain unavailable, not estimated.

## Approved chat presentation refinement — 21 October2026

Darryl requested and authorised implementing the suggested event-specific chat layout: question/assistant bubbles, bottom composer, starter questions, expandable evidence metadata and inline retry; development controls stay separate. Same CHG-D-005 and branch. Main chat owns UI/wrapper and local transcript types/reducer/tests. Keep at most20 transient exchanges for the current source; never use display history as model input or browser storage. Draft edits retain earlier current-source exchanges, superseding the original single-result presentation rule only for this display history. Source replacement/withdrawal/cancellation/event switch and Clear remove transcript evidence. Runtime evidence validation and production404 stay unchanged. Focused state/render/browser/type/lint/build checks and reused independent verification follow; live AI, messaging and delivery remain excluded.

## Approved corner-widget refinement — 21 October2026

Darryl requested a corner pop-up so event information remains visible. Main chat adds reusable chat-widget.tsx with nonmodal launcher/open/close/Escape/focus return, an optional close action on ChatPanel and responsive CSS. The development harness shows existing synthetic public sections underneath; no live event route/service is invented. Closing preserves parent-owned volatile conversation/draft/pending state, while existing source replacement/unavailability still purges evidence. Focused rendering/browser/type/lint/build checks and reused non-author verification apply. No new dependency, persistence, live integration or delivery authority.

21 October2026 presentation amendment: Darryl explicitly removed Clear chat from the header. Close/Hide/Escape retain conversation; source changes/reload still invalidate transient history. Earlier user-clear presentation targets are superseded; internal reset handling remains available without a visible button.
