# 01 - Plan and Implement Prompt-Injection Safeguards - 23 October 2026

## Request

Keith asked for a plan to implement prompt-injection safeguards for WP-005 proposal extraction, covering direct, obfuscated, Best-of-N and indirect (PDF-borne) injection. The plan was to:
- work in a separate worktree
- state which files would be committed
- explain how to test in the TurnUp app locally

Keith chose:
- to base the work on `preview/wp-005`
- to allocate CHG-K-016
- to drop tiny and off-page PDF text

Keith then approved the plan for implementation. CHG-K-016 is a planned increment on branch `wp-005-injection-safeguards`.

## Results

Created worktree `.worktrees/wp-005-injection-safeguards` from `1c3785d` and ran a frozen install.

**Implementation:**
- **Parsing:** NFKC normalisation; removal of invisible, bidirectional-control and tag characters; filtering of text under 1 pt or outside the page.
- **Prompts:** a shared security-rules block first in the extraction and FAQ prompts, and an end-of-data reminder after the data. Prompt versions bumped to v7 (extraction) and v4 (FAQ).
- **Validation:**
  - server rejection of instruction-like evidence quotes
  - contact binding for values and alternatives, and for private notes against the page text
  - a deterministic server review note for pages that contain assistant-directed instructions

**Correction during implementation:** a test showed that contact binding alone accepted an injected URL when the model quoted the injected sentence. The instruction-quote rejection and the server note were added in response.

**Checks:**
- **Passed:**
  - `corepack pnpm lint`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`: 386 tests across 40 files (before the review fixes)
  - `corepack pnpm build`
- **New and updated tests:**
  - **Parser:** hidden-text and character-cleaning cases.
  - **Processor:** injected link, supported link, conflict-alternative contact, and server-note deduplication.
  - **Validation:** private-note contacts, and an AI topic versus instruction-like evidence.

Updated the guide's injection walkthrough (variants A–E), the SEC02 note and the T13 note, and added the CHG-K-016 change records.

**Independent review:** a separate read-only review agent reviewed the change and rechecked it twice.
- **First round:** seven findings (F1–F7). The main ones were quadratic regex backtracking (about 35 s of blocking on a crafted page), instruction markers that were too broad, and an overclaiming review note.
- **Recheck:** three issues introduced by the fixes (N1–N3).
- **Resolution:** all findings were fixed or documented as limits; see the CHG-K-016 verification.

**Final checks:**
- `corepack pnpm lint`: pass
- `corepack pnpm exec tsc --noEmit`: pass
- `corepack pnpm test`: 391 tests across 40 files, pass
- `corepack pnpm build`: pass

No model, provider, database or budget operation took place, and nothing was committed, pushed or deployed. Live synthetic injection runs remain Keith's step.


# 02 - Focus FAQ Suggestions on Gap Questions - 23 October 2026

## Request

Keith asked how FAQ generation could stop asking about fields that every event already has, with examples such as organiser contact information. He first asked for suggestions only and then for implementation. He chose to put it in the same worktree under a new ID (CHG-K-017) and to drop restated answers.

## Results

Implemented CHG-K-017 in `.worktrees/wp-005-injection-safeguards`, on top of the uncommitted CHG-K-016 changes:
- **Prompt v5:** steers the model to event-appropriate gap topics such as on-the-day contact, check-in, access, food, cancellation, recording and recognition. It excludes the required displayed fields and registration state, and contact details are never generated.
- **Server filter:** drops answered candidates that only restate required fields. The existing bounds are still checked on the full output first.
- **UI:** a message for the case where nothing new was found.
- **Tests and docs:** updated and new tests, the guide and the ORG07 spec note.

**Checks:**
- `corepack pnpm lint`: pass
- `corepack pnpm exec tsc --noEmit`: pass
- `corepack pnpm test`: 394 tests across 40 files, pass
- `corepack pnpm build`: pass

**Independent review:** a separate review agent found one medium issue and four low ones.
- **Medium:** overlapping quotes were double-counted when measuring coverage, so detail answers were wrongly dropped.
- **Low:** spec wording, the guide's version reference, a conflicting contact rule in the prompt, and contradictory UI notices.

All were fixed and rechecked. A code-unit counting nit was accepted. After the fixes: 395 tests across 40 files, with lint, `tsc` and build all passing. Details are in the CHG-K-017 verification. No model, provider or database operation took place, and nothing was committed, pushed or deployed. Live FAQ quality remains Keith's synthetic check.


# 03 - Fix FAQ Generation 502 - 23 October 2026

## Request

Keith reported a 502 from the FAQ suggestions endpoint, `POST /api/organiser/events/<id>/public-candidates`, after running prompt v5 locally. He chose to withhold only the FAQs with invalid references and keep the rest.

## Results

**Cause:** the dev server log `.next/dev/logs/next-development.log` showed the safe diagnostic `FAQ_REFERENCE_INVALID`. At least one model-cited quote was not an exact substring of the saved field, and the processor rejected the whole response because of it.

**Change (CHG-K-017):**
- **Processor:** withholds each FAQ that fails the exact-quote checks, and rejects the response only when every FAQ fails. Shape and bound failures still reject the whole response.
- **Route:** logs only a count, as `proposal_candidate_faqs_withheld`.
- **Tests:** the processor test is updated and a route test is added.
- **Docs:** the guide's 502 section, the spec note and the change record are updated.

**Independent review:** a separate review agent found no code defects. One stale spec sentence and a misleading empty-state notice were corrected.

**Checks:**
- `corepack pnpm lint`: pass
- `corepack pnpm exec tsc --noEmit`: pass
- `corepack pnpm test`: 396 tests across 40 files, pass
- `corepack pnpm build`: **failed with `ENOSPC` (disk full, about 400 MB free)** after the final wording fix. The previous build, before per-FAQ withholding and the wording changes, passed. A build of the final source has not passed yet.

Keith's live retry is not yet recorded. Nothing was committed or pushed.


# 04 - Merge Remote Preview and Push - 23 October 2026

## Request

Keith asked to fetch the remote `preview/wp-005`, resolve any merge conflicts and push the result back to `preview/wp-005`.

## Results

**Commit:** the local CHG-K-016 and CHG-K-017 work was committed as `8f4f7d9`.

**Merge:** merged `origin/preview/wp-005` at `2bec1eb`. That branch includes the master merge, CHG-K-014/015 hosted generation, WP-006 and the UI and documentation updates.
- **Conflict:** one, in `src/features/proposal-assistance/public-candidates.ts`. Resolved by keeping the remote's `GenerationLimitDetails` import together with the `CHG-K-017-faq-gap-questions-v5` prompt version.
- **Auto-merged:** the route, the component, `pdf-text.ts` and the tests. Remote added Prisma migrations; no dependency changes.

**Checks on the merged tree:**
- `corepack pnpm typecheck` (with Prisma generate): pass
- `corepack pnpm lint`: pass
- `corepack pnpm test`: 897 passed and 5 skipped, across 80 files

**Not run:** a local production build. Only about 200 MB is free, and the previous build failed with `ENOSPC`. The Preview workflow builds on push.

**Database:** the local database needs the remote's new migrations before the app is used against it.
