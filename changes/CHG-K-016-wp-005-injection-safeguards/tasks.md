# CHG-K-016 — Tasks and handoffs

Source revision: `preview/wp-005` at `1c3785de13ae098290638a8be77ae41a9b64a318`. Human owner: Keith (`K`). Writer: Claude Code for Keith (single writer).

| Order | Task / output files | Writer / actor | Preconditions | IDs | Completion check |
| --- | --- | --- | --- | --- | --- |
| 1 | Plan and decisions (base, ID, hidden-text policy) | Claude Code with Keith | Suggested safeguards reviewed | SEC02/03, T13 | Plan approved 23 Oct 2026 |
| 2 | Parser cleaning and hidden-text filter (`pdf-text.ts`) | Claude Code | Task 1 | SEC02/04, T13 | `pdf-text.test.ts` cases |
| 3 | Prompt rules and reminders (`prompt-safety.ts`, `prompts.ts`, `public-candidates/prompt.ts`, `public-candidates.ts`) | Claude Code | Task 1 | SEC02, T13 | Processor and FAQ prompt tests |
| 4 | Server validation (`validation.ts`, `json-extraction-validation.ts`) | Claude Code | Task 1 | SEC03, T13 | Processor and validation tests |
| 5 | Guide, SEC02 note, T13 note, change records, log | Claude Code | Tasks 2–4 | SEC02, T13 | Docs match behaviour |
| 6 | Independent agent review of the completed change | Separate review agent | Tasks 2–5 | SEC02/03, T13 | Findings dispositioned in verification.md |
| 7 | Live synthetic injection check (guide variants A–E) | Keith | Local synthetic flag and bounded allowance | T13 | Results recorded in verification.md |

## Work state

- [x] Scope, owner, files, source revision, IDs and preconditions recorded.
- [x] Relevant specs and scenarios reconciled (SEC02 note, T13 note).
- [x] Deliverables implemented by one writer.
- [x] Independent agent review recorded in [verification.md](verification.md) (three rounds).
- [x] Findings corrected or dispositioned.
- [ ] Live synthetic injection check (task 7). Not run by agents.
