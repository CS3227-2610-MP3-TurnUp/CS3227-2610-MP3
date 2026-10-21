# Student FAQ and private questions

Owner: Darryl (Student); Keith (Organiser) reviews inbox handoff. B1 target, unimplemented. Depends on [privacy](../shared/ai-and-privacy.md) and [inbox](../organiser/registration-forms-and-inbox.md).

| ID | Observable requirement |
| --- | --- |
| PAR06 | Any authenticated Student may ask about a currently published event without registering. Explain unanswered-question forwarding; server resolves current approved source, ignoring client owner/source overrides. |
| PAR07 | Return relevant exact quotes/sections verified against current approved source. Do not infer missing prices, eligibility, equipment or promises. |
| PAR08 | Clarify ambiguous intent; bound off-topic/abusive replies without automatic inbox spam. |
| PAR09 | Code forwards valid unanswered/partly answered questions to event owner. Cite supported parts, identify unresolved parts; display sent only after one private inbox commit. |
| PAR10 | My Questions shows own pending/answered threads and labelled human replies, never automatic public evidence. Existing threads remain accessible after cancellation within retention. |
| PAR11 | Publication replacement invalidates old contexts/caches. Recheck source before delivery; discard stale output, retry within limits. Withdrawn/cancelled events deny new chat. |
| PAR12 | Preserve question on technical failure; report actual cause and offer bounded retry or direct in-app question submission. Failed writes never claim delivery; retries cannot duplicate a committed thread. |

Model outcomes: answered, partially answered, unanswered, needs clarification, out of scope. Outage/invalid schema is a technical failure, not missing event information. Application code chooses server-resolved owner and writes inbox records; models lack general message/database tools.

| Situation | Required effect |
| --- | --- |
| Supported | Current evidence/revision/sections |
| Partly supported | Supported evidence + unresolved portion + truthful forwarding status |
| Unsupported, inbox committed | Source lacks answer; question sent; My Questions reply path |
| Inbox failed | Not sent; retry |
| Provider unavailable | Temporary assistant failure; retry/direct in-app question option |
| Source changed/unavailable | Discard stale output; refresh/status notice; no private fallback |

Idempotency binds actor/event/operation/payload; Students' threads never merge. Refresh-based inboxes need no real-time service. Neither proposal/private replies nor other events are retrieval sources. Retain necessary question context only; user text may contain personal values. Emergency stored-message suppression remains G07.

Verification: T06/09–14/18/27/31. Live quality checks need labelled fixtures/model/prompt/configuration and actual context inspection.

## Conversational replies - approved22 October2026
Darryl approved natural short phrasing with event facts grounded in cited source. Existing PAR07 exact quotes remain available in expandable sources. Subjective questions acknowledge preference without guaranteeing enjoyment; missing information is honestly unknown. Source/revision/schema checks continue; they do not prove semantic entailment of paraphrases. Live quality evaluation remains pending. No extra source/history/private context or inbox effects authorised.
