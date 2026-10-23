# CHG-K-017 — WP-005 FAQ gap questions

Status: in progress. Implemented locally and independently agent-reviewed, with findings dispositioned. The live synthetic FAQ check and an authorised commit/PR are still to come. See [verification.md](verification.md).

## Intent and source

- **Requested outcome:** FAQ generation should stop asking about fields every event already has, and should suggest questions participants actually need answered, such as organiser contact.
- **Assignment:** Keith, 23 October 2026. Keith reviewed the suggested topics, then asked for implementation.
- **Source revision:** `preview/wp-005` at `1c3785de13ae098290638a8be77ae41a9b64a318`, plus the uncommitted CHG-K-016 diff in the same worktree. The two changes share `public-candidates/prompt.ts` and `public-candidates.ts`.
- **Change ID:** `CHG-K-017`, confirmed by Keith.
- **Owner and writer:** Keith (Claude Code acting for Keith).
- **Log:** the same increment log as CHG-K-016, [logs/keith/15-wp-005-injection-safeguards.md](../../logs/keith/15-wp-005-injection-safeguards.md).
- **Issues:** pending.

## Scope

- **Requirements:** ORG07, the FAQ-gap portion. See [proposal assistant](../../specs/organiser/proposal-assistant.md).
- **Deliverables:**
  - **Prompt:** `src/server/proposal-assistance/public-candidates/prompt.ts` targets gap topics. The version is bumped to `CHG-K-017-faq-gap-questions-v5` in `src/features/proposal-assistance/public-candidates.ts`.
  - **Repeat filter:** `src/server/proposal-assistance/public-candidates/processor.ts` drops answered candidates that restate required fields, and withholds FAQs with invalid references.
  - **Diagnostic:** `src/app/api/organiser/events/[id]/public-candidates/route.ts` logs a count-only `proposal_candidate_faqs_withheld` diagnostic.
  - **Empty state:** `src/components/events/public-content-assistance.tsx` shows a message when nothing new was found.
  - **Tests and docs:** tests in `tests/proposal-assistance/public-candidates-processor.test.ts` and `public-content-assistance.test.tsx`; the guide and the spec note.
- **Exclusions:**
  - no change to the response schema, rejection codes or public bounds
  - no generated contact details
  - no Student chatbot or inbox change
  - no model or provider change, migration or dependency change
  - no commit, push or deployment unless Keith authorises it

## Decisions and acceptance

- **Decisions (Keith, 23 October 2026):**
  - same worktree as CHG-K-016, under a new ID
  - restated answers are dropped
- **Implementation decisions:**
  - **Required displayed fields:** title, description, start, end, location, capacity, fee, open-to and preparation. Other is never treated as a restatement.
  - **Restatement threshold:** every cited field is a required one, and the union of quoted non-whitespace characters covers at least 80% of each cited field. A specific detail quoted from a longer description is kept.
  - **Bounds:** the existing limits are checked on every validated FAQ before restatements are dropped, so the returned text is always within them.
  - **Invalid references (Keith, 23 October 2026, after a live `FAQ_REFERENCE_INVALID` 502):** a FAQ whose references fail the exact-quote checks is withheld and the others are kept, matching PDF extraction's per-field handling. The response is still rejected when every FAQ fails, and on any shape or bound failure. Only a count of withheld FAQs is logged.
- **Completion conditions:**
  - The deterministic tests show restatements are dropped and gaps and specific details are kept.
  - The prompt names gap topics and forbids invented contacts.
  - All checks pass, and agent review findings are dispositioned.
- **Limitations:**
  - Whether `qwen3.5:9b` actually prefers gap questions needs a live synthetic check.
  - A restatement the model words differently, or one citing less than 80% of a field, is not caught.
