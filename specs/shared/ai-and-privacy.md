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

WP-005 PDF injection safeguards (CHG-K-016; implemented locally with deterministic tests, live model behaviour not yet verified):
- **Parsing:** extracted page text is NFKC-normalised, with zero-width, bidirectional-control and Unicode tag characters removed. Text items under 1 pt or whose origin is outside the page are dropped before inference. Not detected: white-on-white text, invisible rendering mode (common in OCR layers), near-zero horizontal scaling, clipped text and runs that start on the page but extend off it.
- **Prompts:** extraction and FAQ-candidate system prompts start with a shared security-rules block, and an end-of-untrusted-data reminder follows the supplied data.
- **Evidence:** the server rejects an evidence quote unless it occurs at least once outside every sentence that contains an assistant-directed instruction marker.
- **Contacts:** a model-written value or conflict alternative may not contain a URL, domain, email or phone-like number absent from its cited quotes. A private note may not contain a URL, domain or email absent from the pages. Values are NFKC-normalised with invisible characters removed, and dot look-alikes, bracketed dots and a space before a dot are read as dots. Not detected: a bare spelled-out "dot", "name. domain" (indistinguishable from a sentence ending) and letter-spaced text. Any letters-only ending of 2–24 characters counts as a domain, so a value that rewrites a dotted name (for example `Mr.Ng` from "Mr Ng") or turns a time range into an 8-digit run is withheld for manual entry.
- **Review note:** a page with such markers always gains the private review note "Page N contains text addressed to an automated assistant; check values cited from this page."
- **Limits:** an injection split across sentences without marker words, and ordinary-looking false statements, cannot be distinguished from real facts. A genuine sentence such as "ignore the instructions on the old flyer" is treated as an instruction marker, so a fact quoted from it is withheld and the page gets the review note. Organiser review of every prefilled value remains the control.

Organiser assistance may use temporary proposals/necessary private preparation, producing candidates and review findings without approval authority. Student assistance cannot reuse Organiser conversations/indexes/caches, PDFs/private extracts/clarifications/notes/replies/rosters, another event or historical model replies as factual evidence.

Server resolves the current publication, supplies complete bounded public content and rechecks source before delivery. Replacement discards stale context/cache/output; withdrawal/cancellation denies new chat. Do not silently truncate approved documents. A vector database is unnecessary for the proposed bounded single-event source; future retrieval needs a scoped design/change.

Extractive replies use verified quotes/sections in a fixed display template. User claims/history may clarify intent but cannot establish facts. Live capacity/registration state comes from code. Provider failure is not “missing event information”; application code performs forwarding, never autonomous model tools.

Local PDF selection alone transmits nothing. Generate starts temporary authenticated processing; release bytes/fulltext and clean temporary files on all exits. Necessary structured facts/short evidence/page references/clarifications/drafts may be retained privately. Verify provider handling before claiming deletion outside application control. Sensitivity detection can miss secrets; owner review remains required. Previously delivered information cannot be retracted; historical-message suppression is G07.

Verification: T04/06/09–14/18/21/26/27; [retention](deployment-and-retention.md), [gates](../decisions.md).
