# Student FAQ and private questions

Owner: Darryl (Student); Keith (Organiser) reviews inbox handoff. B1 target, unimplemented. Depends on [privacy](../shared/ai-and-privacy.md) and [inbox](../organiser/registration-forms-and-inbox.md).

| ID | Observable requirement |
| --- | --- |
| PAR06 | Any authenticated Student may ask about a currently published event without registering. Server resolves current approved source, ignoring client owner/source overrides. Uncertainty follows the organiser-contact amendment below; no automatic forwarding. |
| PAR07 | Give a concise natural reply grounded in the current approved source; verify relevant exact quotes/sections internally. Do not display citation/revision/quote panels or infer missing prices, eligibility, equipment, promises or arrangements. |
| PAR08 | Clarify ambiguous intent; bound off-topic/abusive replies without automatic inbox spam. |
| PAR09 | For unanswered/partly answered event questions, admit the relevant uncertainty briefly and suggest checking with the organiser. A working contact action must use the event's approved server-resolved contact field once Keith supplies it. Never guess contact details, invent a button/destination or claim a question was sent. This supersedes automatic Student-assistant forwarding under the amendment below. |
| PAR10 | My Questions shows own pending/answered threads and labelled human replies, never automatic public evidence. Existing threads remain accessible after cancellation within retention. |
| PAR11 | Publication replacement invalidates old contexts/caches. Recheck source before delivery; discard stale output, retry within limits. Withdrawn/cancelled events deny new chat. |
| PAR12 | Preserve question on technical failure and offer bounded retry; organiser-contact guidance may provide follow-up when available. Technical failure is not missing event information. No automatic forwarding/delivery claim. Any separately implemented private write must still avoid false delivery and duplicate committed threads. |

Model outcomes: answered, partially answered, unanswered, needs clarification, out of scope. Outage/invalid schema is a technical failure, not missing event information. Models lack general message/database tools. This assistant does not write inbox records; any separately implemented private messaging operation remains code-controlled and outside this contact fallback.

| Situation | Required effect |
| --- | --- |
| Supported | Short direct reply; evidence/revision/sections verified internally |
| Partly supported | Answer the supported part and briefly admit the relevant uncertainty; suggest organiser contact, without quote dumps or an unresolved-question list |
| Unsupported | Brief uncertainty and organiser-contact guidance; no invented fact/contact or sent claim |
| Provider unavailable | Distinct temporary assistant failure; bounded retry/contact guidance rather than a missing-fact answer |
| Source changed/unavailable | Discard stale output; refresh/status notice; no private fallback |

Idempotency binds actor/event/operation/payload; Students' threads never merge. Refresh-based inboxes need no real-time service. Neither proposal/private replies nor other events are retrieval sources. Retain necessary question context only; user text may contain personal values. Emergency stored-message suppression remains G07.

The preceding thread/idempotency/My Questions rules remain requirements for separately planned private messaging, not an automatic effect of asking the assistant. They are not implemented by this chat/contact change.

Verification: T06/09–14/18/27/31. Live quality checks need labelled fixtures/model/prompt/configuration and actual context inspection.

## Conversational replies - approved22 October2026
Darryl approved natural short phrasing with event facts grounded in cited source. Existing PAR07 exact quotes remain available in expandable sources. Subjective questions acknowledge preference without guaranteeing enjoyment; missing information is honestly unknown. Source/revision/schema checks continue; they do not prove semantic entailment of paraphrases. Live quality evaluation remains pending. No extra source/history/private context or inbox effects authorised.

## Publication prerequisite -approved22October2026

D006 source-only development consumer integrates Keith1f0aa87 currentPublication reader. Student authentication is checked on source load and again at final delivery. Stable publication identity controls invalidation;private draft activity alone does not. Withdrawn/cancelled/absent sources share generic unavailable,clear transient excerpts anddeny new requests. Size overflow is explicit,no truncation;post-start timing remains G05pending and unavailable for this bounded inspection. Source revalidation occurs on request/refocus/open/refresh,not push;no historical-message suppression decision. No real-source inference or private forwarding connected. Actual checks/limits in D006verification.

## Local real-publication Q&A extension — approved 22 October 2026

Darryl approved [plan v1.0](../../docs/plans/wp-006-real-publication-qa-plan.md). The local Student event page now connects its corner chat to an authenticated current publication and the existing server-only completion client, using the existing shared private local allowance. Only an explicit Send performs inference; opening/refocusing/refreshing performs source reads only. The real-publication path has no synthetic fallback and needs no registration. Current public fields/title and approved form labels/help/types/required flags/options are citable; private drafts, submitted values, profiles and replies remain excluded.

The consumer checks the publication/session again after inference, including technical failures, and discards stale/unavailable results. Browser transport revalidates identity/evidence and clears visible source/transcript while freshness is unknown; unchanged refresh retains the volatile conversation, source/auth errors clear it while keeping the question draft. A lost/invalid response triggers only a source recheck, never automatic inference. No database lock spans a provider request. There is no automatic retry, counter refund, new allowance or limit increase.

This is a pinned-loopback development capability, not hosted Student FAQ completion. Existing future-start-only FAQ and32768serialized-source-byte limits remain; oversized content is refused whole. Started/past event details remain independently readable under WP004. Unsupported/partial answers explicitly say organiser follow-up is not connected and no question was sent. No private thread/history persistence, multi-turn model history, messaging or emergency stored-message policy is implemented. Main-agent-only checks and live/hosted/browser limitations are in D006verification; citations validate provenance, not semantic entailment.

## Conversational contact amendment — Darryl, 22 October 2026

Darryl explicitly confirmed that the user sees friendly, focused conversation rather than quotations, View sources/revision panels or unresolved-question lists. This supersedes those display requirements in the earlier conversational/local-source checkpoints. Backend and internal client evidence/revision validation remain; hiding metadata does not prove semantic entailment. Reply phrasing may safely paraphrase approved facts; server-derived Singapore dates/times prevent model timezone arithmetic from inventing arrangements. Reporting/arrival time is not inferred from start time or introduced unless relevant to the user's question. Greetings/warmth cannot assert popularity, guaranteed enjoyment or other unsupported promises.

For partial/unanswered event facts the application provides a short check-with-organiser suggestion in the same response, without automatic forwarding or false sent status. Model prompt v4 asks for focused1–2sentence replies and no source narration; extra unresolved lists remain internal. Legacy candidates without prose use conservative uncertainty instead of rendering quote-only dumps. Keith will add an Organiser contact field in a future iteration. Until its canonical public shape/validation/versioning/display and safe destination contract are handed off, there is text guidance only, no guessed schema/migration/contact value/link or working redirect. This records Darryl's Student decision and intended dependency, not Keith's implementation/approval. Broader private inbox capability is separate future work. Live semantic quality remains unverified.

## Response reliability refinement - 22 October 2026

Darryl approved a compact provider response for PAR07/08/12: the server supplies event/revision bookkeeping and validates exact short references before exposing natural replies. Slang, typos and garbled words are ordinary input; unclear intent requests friendly clarification, never a technical-input error. A joining question does not register anyone or prove eligibility, availability or a place. Unknown facts stay uncertain with organiser guidance. No keyword-to-answer table is used.

A single complete JSON fence may be unwrapped; arbitrary surrounding prose, truncated JSON, wrong identities, unknown fields or false evidence remain rejected. Actual provider/format failures preserve the question and use friendly retry guidance without JSON/parser/security jargon. No automatic retry or allowance increase. Metadata-only server diagnostics distinguish envelope, truncation, size, JSON and schema failures. Exact evidence still establishes provenance, not semantic entailment; mocked checks do not establish live model quality.

## Account-owned event chat history - 22 October 2026, log10

Darryl explicitly selected account-based history across devices and authorised commit/push. Completed question/reply or technical-failure turns are stored privately for the authenticated Student and selected event/current publication. Closing the popup, leaving the page or logout does not delete saved turns; only the same authenticated account may restore them. The displayed/stored working history is bounded to the latest20turns per event. Unsaved drafts and in-flight requests are not persisted or replayed. No transcript is added to provider context or used as event evidence.

Server authentication, role and fresh publication checks gate restoration and saving. Stored candidates are revalidated against the current source; old revisions and withdrawn/cancelled content remain hidden under the existing conservative suppression behaviour. This does not resolve broader G07messaging policy. Expiry is90days after the selected published end;expired rows are denied and appends perform opportunistic cleanup. Scheduled deletion/cancellation-based retention adjustments and backup erasure remain G06operational work,not a completion claim. Account/event deletion cascades to history. No browser-supplied actor/source/transcript write API exists. Technical history-read failure gives friendly guidance without inventing replies or dispatching inference.

Routine source refresh also reads authenticated account-scoped history without inference. An account switch clears the previous account's turns/draft;unchanged history preserves component focus/state without loading flicker. Failed history/identity reads clear cached private display,not saved database history.
