# CHG-K-017 — Tasks and handoffs

Source revision: `preview/wp-005` at `1c3785d` plus the uncommitted CHG-K-016 diff. Human owner: Keith (`K`). Writer: Claude Code for Keith (single writer).

| Order | Task / output files | Writer / actor | Preconditions | IDs | Completion check |
| --- | --- | --- | --- | --- | --- |
| 1 | Suggest gap topics and logic changes | Claude Code | FAQ prompt read | ORG07 | Keith reviewed them and asked for implementation |
| 2 | Prompt v5 (`public-candidates/prompt.ts`, `public-candidates.ts`) | Claude Code | Task 1; CHG-K-016 prompt edits | ORG07, SEC02 | Prompt tests |
| 3 | Restatement filter (`public-candidates/processor.ts`) | Claude Code | Task 1 | ORG07 | Processor tests |
| 4 | Empty-state message (`public-content-assistance.tsx`) | Claude Code | Task 3 | ORG07 | Component test |
| 5 | Guide, ORG07 note, records and log | Claude Code | Tasks 2–4 | ORG07 | Docs match behaviour |
| 6 | Independent agent review | Separate review agent | Tasks 2–5 | ORG07 | Findings dispositioned |
| 7 | Live synthetic FAQ check | Keith | Local synthetic flag and allowance | ORG07 | Results recorded in verification.md |

## Work state

- [x] Scope, owner, files, source revision and IDs recorded.
- [x] Spec and guide reconciled.
- [x] Deliverables implemented by one writer.
- [x] Independent agent review recorded in [verification.md](verification.md) (review plus one recheck).
- [x] Findings corrected or dispositioned.
- [ ] Live synthetic FAQ check (task 7). Not run by agents.
