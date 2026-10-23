# CHG-K-017 — Verification

Source revision: `preview/wp-005` at `1c3785d`, plus the uncommitted CHG-K-016 and CHG-K-017 diff in `.worktrees/wp-005-injection-safeguards`. Human owner: Keith. Writer: Claude Code (Opus 5.5) for Keith. Agent reviewer: a separate general-purpose review agent that did not author the change; it reviewed once and rechecked once, read-only.

## Evidence

| Date / actor | Scope | Exact check | Result | Evidence / limitation |
| --- | --- | --- | --- | --- |
| 23 Oct 2026 / writer | All | `corepack pnpm lint` | Pass | Clean |
| 23 Oct 2026 / writer | All | `corepack pnpm exec tsc --noEmit` | Pass | Exit 0 |
| 23 Oct 2026 / writer | All | `corepack pnpm test` | Pass | 395 tests across 40 files; 396 after per-FAQ withholding |
| 23 Oct 2026 / Keith (live) | FAQ route | Generate FAQ suggestions on a local synthetic draft (prompt v5) | 502 | The dev log showed `FAQ_REFERENCE_INVALID`. Led to per-FAQ withholding; a live retry is not yet recorded. |
| 23 Oct 2026 / reviewer | Per-FAQ withholding | Proposal tests (118), lint, `tsc`, code reading | No actionable code defects | SEC03, all-invalid rejection, rejection-code coverage, client contract and count-only log were checked |
| 23 Oct 2026 / writer | Proposal assistance | `corepack pnpm exec vitest run tests/proposal-assistance` | Pass | 117 tests across 14 files |
| 23 Oct 2026 / writer | All | `corepack pnpm build` | Pass, then failed | Passed before per-FAQ withholding. The rebuild of the final source failed with `ENOSPC` (disk full); it is an environment failure, not a compile error, and must be rerun after freeing space. |
| 23 Oct 2026 / reviewer | FAQ | Same proposal tests, lint and `tsc`, plus vitest probes (overlap, whitespace, mixed references, Unicode, repeated substrings) | Pass | Probes stayed outside the repository |
| Not run | ORG07 live | Generate FAQ suggestions on a saved synthetic draft | Not run | Needs Keith's local synthetic flag and allowance. Whether `qwen3.5:9b` prefers gap questions is unverified. |

## Findings and decisions

| ID / severity | Area | Consequence | Correction or disposition | Recheck |
| --- | --- | --- | --- | --- |
| 1 Medium | `restatesRequiredFields` | Overlapping or whitespace-variant quotes were double-counted, so a specific-detail answer was dropped | Coverage is the union of quoted non-whitespace positions. Test added. | Resolved |
| 2 Low | Spec line 68 | Contradicted the new topics and the empty-result behaviour | Reworded | Resolved |
| 3 Low | Guide | Still called v3 the current prompt | Reworded | Resolved |
| 4 Low | Prompt | The contact rule conflicted with the description rule | "unless description or other already states that contact" | Resolved |
| 5 Nit | UI | Contradictory notices on an all-dropped result | The notice depends on whether any suggestions remain. Test asserts it. | Resolved |
| 6 Low | Spec | Still said the bounds are checked on the full model output after per-FAQ withholding | Now says "all validated FAQs" | Resolved (writer) |
| 7 Nit | UI | "No new questions were found" was inaccurate when a FAQ had been withheld for an invalid reference | Neutral wording: "No new questions to suggest…" | Resolved (writer) |
| Nit | Coverage unit | UTF-16 code units, so emoji count double (e.g. "😀😀😀😀 ab") | Accepted: negligible for event text, and the spec fixes no unit | Not changed |
| Note | First occurrence | A repeated substring uses its first occurrence | Accepted: it can only undercount, which keeps the FAQ (the safe direction) | Not changed |

## Completion and handoff

- **Scope satisfied locally:**
  - prompt v5 gap focus with no generated contacts
  - restatement filter applied after the existing bounds
  - empty-state UI
  - tests, the guide and the ORG07 note
- **Remaining:** the live synthetic FAQ check by Keith. Commit, push and PR when Keith authorises them.
- **Changed paths:**
  - **Source:**
    - `src/server/proposal-assistance/public-candidates/{prompt.ts,processor.ts}`
    - `src/features/proposal-assistance/public-candidates.ts`
    - `src/components/events/public-content-assistance.tsx`
  - **Tests:** `tests/proposal-assistance/{public-candidates-processor.test.ts,public-content-assistance.test.tsx}`
  - **Docs and specs:** `docs/wp-005-proposal-integration.md`, `specs/organiser/proposal-assistant.md`
  - **Records:** this change directory and log entry 02 in `logs/keith/15-wp-005-injection-safeguards.md`
