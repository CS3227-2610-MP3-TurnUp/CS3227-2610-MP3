# AI and privacy

Contract leads: Keith for AI budgets/provider calls/private-public context separation and retention infrastructure; Darryl for chat sources/evidence and private thread delivery, with reciprocal review. Each member implements their role's entry points and access checks. Follow [ownership and single-writer handoffs](../implementation-plan.md#human-ownership); unresolved privacy policies remain open. B1 target; implementation/evaluation pending.

| ID | Observable requirement |
| --- | --- |
| SEC01 | Separate private preparation, approved publication and private user data before context construction. Student AI receives selected current approved public representation and minimal question context only. Neither AI receives rosters/attendee answers/arbitrary profiles. |
| SEC02 | Proposal/public text, questions and development fixtures are untrusted instructions. Models cannot publish, alter roles, execute code, query arbitrary records or choose inbox recipients; code controls effects. |
| SEC03 | Validate model schemas, allowed fields, current revisions, sections and exact quotes; render inert text. Invalid evidence is a technical failure/bounded retry, never a supported answer. Labelled evaluation must also check relevance/completeness. |
| SEC04 | Bound uploads/parsing before inference; original PDF/fulltext stay transient with cleanup on success/rejection/failure. No public proposal-serving route. Unsupported/malformed/excessive inputs fail clearly. Numeric/type policy G04. |
| SEC05 | Bound per-user/shared rate, concurrency, token budgets, parsing/model timeouts and retries against verified provider limits. Exhaustion stops predictably; manual completion remains available. |
| SEC06 | Keep credentials server-side; logs contain minimal actor/action/revision/outcome metadata, no raw private proposals/answers/credentials/prompts. Retention covers audits/derived copies. |
| SEC07 | Only submitting Student and owning Organiser read event submissions. Scope queries before disclosure; form labels/answers are inert and cannot overwrite permissions. Failed joins expose no partial submission. |

Organiser assistance may use temporary proposals/necessary private preparation, producing candidates and review findings without approval authority. Student assistance cannot reuse Organiser conversations/indexes/caches, PDFs/private extracts/clarifications/notes/replies/rosters, another event or historical model replies as factual evidence.

Server resolves the current publication, supplies complete bounded public content and rechecks source before delivery. Replacement discards stale context/cache/output; withdrawal/cancellation denies new chat. Do not silently truncate approved documents. A vector database is unnecessary for the proposed bounded single-event source; future retrieval needs a scoped design/change.

Darryl approved conversational Student replies on22 October2026: short natural-language summaries may accompany verified quotes/sections in expandable sources. Every event fact must be supported by the selected source; subjective enjoyment is acknowledged as a preference, not an event promise. Missing facts must remain explicitly unknown. Exact citation validation establishes provenance, not semantic entailment of generated prose; separate relevance/completeness and unsupported-claim evaluation remains required. Quote-only replies remain a compatible fallback. User claims/history may clarify intent but cannot establish facts. Live capacity/registration state comes from code. Provider failure is not “missing event information”; application code performs forwarding, never autonomous model tools.

Local PDF selection alone transmits nothing. Generate starts temporary authenticated processing; release bytes/fulltext and clean temporary files on all exits. Necessary structured facts/short evidence/page references/clarifications/drafts may be retained privately. Verify provider handling before claiming deletion outside application control. Sensitivity detection can miss secrets; owner review remains required. Previously delivered information cannot be retracted; historical-message suppression is G07.

Verification: T04/06/09–14/18/21/26/27; [retention](deployment-and-retention.md), [gates](../decisions.md).
