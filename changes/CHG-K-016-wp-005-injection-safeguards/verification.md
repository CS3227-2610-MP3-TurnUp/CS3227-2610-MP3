# CHG-K-016 — Verification

Source revision: `preview/wp-005` at `1c3785de13ae098290638a8be77ae41a9b64a318` plus the uncommitted CHG-K-016 diff in `.worktrees/wp-005-injection-safeguards`. Human owner: Keith. Writer: Claude Code (Opus 5.5) for Keith. Agent reviewer: a separate general-purpose review agent that did not author the change; it reviewed and rechecked three times, read-only.

## Evidence

| Date / actor | Scope | Exact check | Result | Evidence / limitation |
| --- | --- | --- | --- | --- |
| 23 Oct 2026 / writer | All | `corepack pnpm lint` | Pass | Clean. |
| 23 Oct 2026 / writer | All | `corepack pnpm typecheck` and `corepack pnpm exec tsc --noEmit` | Pass | Exit 0. |
| 23 Oct 2026 / writer | All | `corepack pnpm test` | Pass | 391 tests across 40 files (386 before the review fixes). |
| 23 Oct 2026 / writer | Proposal assistance | `corepack pnpm exec vitest run tests/proposal-assistance` | Pass | 113 tests across 14 files, including the new injection cases. |
| 23 Oct 2026 / writer | All | `corepack pnpm build` | Pass | Exit 0. |
| 23 Oct 2026 / reviewer | Proposal assistance | Same proposal tests, lint and `tsc`, plus Node/jiti probes of the real modules (scripts under the job tmp folder, not in the repo) | Pass | Probes covered false positives, bypasses and 48 KB adversarial timing (8–20 ms after fixes). |
| Not run | T13 live | Guide injection check, variants A–E | Not run | Needs Keith's local synthetic flag, SoCLaaS key and bounded gate allowance. No model, provider, database or budget operation occurred. |

## Findings and decisions

| ID / severity | Area | Consequence | Correction or disposition | Recheck |
| --- | --- | --- | --- | --- |
| F1 Medium | Contact regex | Quadratic backtracking: about 35 s of event-loop blocking from a crafted 48 KB page | Bounded quantifiers; page tokens built once | Resolved (reviewer: 0.4–12.5 ms) |
| F2 Medium | Instruction markers | Ordinary sentences ("ignore safety rules", "you are now registered", "system prompt" workshops) withheld facts and flagged pages | Markers narrowed twice; negative tests added | Resolved for every reported sentence. Narrower residual cases ("Note to the AI ethics panel", "Forget the other prompts…") are accepted as low and documented. |
| F3 Low-Med | Note text, guide B | The note claimed "not used"; an injected domain could be quoted from the instruction sentence | Note reworded to "check values cited from this page". Quotes are rejected unless they occur outside every marker sentence. | Resolved. Split-sentence injection is documented as a limit. |
| F4 Low | Contact matching | Dates, dotted names, host and phone format differences caused false rejections | Typed tokens; host and phone-suffix matching; dates skipped; private notes skip the phone check | Mostly resolved. Remaining rewrites (Mr.Ng, hyphenated times) are documented. |
| F5 Low | Disguised contacts | Full-width dots, `[.]`, IDN and similar forms passed | NFKC normalisation, invisible-character stripping, look-alike, bracketed and spaced dots, Unicode labels | Partly resolved. Bare "dot", "name. domain" and letter-spaced text are documented as undetected. The final invisible-character and spacing additions are covered by tests; there was no further reviewer round. |
| F6 Low | Prompt rule 2 | Could suppress proposals addressed to reviewers | Rule needs an AI target plus a requested behaviour change; text to reviewers is ordinary content | Resolved (live behaviour unverified) |
| F7 Low | Spec | Undetected hidden-text forms were not listed | Spec lists them | Resolved |
| N1 Low-Med | TLD whitelist (introduced by a fix) | Unlisted TLDs bypassed the check | Any letters-only ending of 2–24 characters counts | Resolved |
| N2 Low-Med | Lookbehind (introduced by a fix) | A domain preceded by `.` or `@` was missed | Lookbehind corrected | Resolved |
| N3 Low | Span check (introduced by a fix) | About 1.2 s on a crafted response | Merged spans, binary search, 200-occurrence cap | Resolved (20 ms). The cap fails closed, which needs more than 200 injection sentences on one page. |

## Completion and handoff

- **Scope satisfied locally:**
  - parser cleaning and hidden-text filter
  - prompt rules and reminders (extraction v7, FAQ v4)
  - server evidence and contact checks
  - deterministic review note
  - tests, guide, SEC02 note and T13 note
- **Remaining:** the live synthetic injection check (guide variants A–E) by Keith. Commit, push and PR when Keith authorises them.
- **Known limits:** see the SEC02 note in `specs/shared/ai-and-privacy.md`. A finite suite does not prove absence of injection, and Organiser review of prefilled values remains required.
- **Changed paths:**
  - **Source:**
    - `src/server/proposal-assistance/{pdf-text.ts,prompt-safety.ts,prompts.ts,public-candidates/prompt.ts}`
    - `src/features/proposal-assistance/{validation.ts,json-extraction-validation.ts,public-candidates.ts}`
  - **Tests:** `tests/proposal-assistance/{pdf-text,processor,json-extraction-validation,public-candidates-processor}.test.ts`
  - **Docs and specs:** `docs/wp-005-proposal-integration.md`, `specs/shared/ai-and-privacy.md`, `specs/verification/acceptance-scenarios.md`
  - **Records:** this change directory and `logs/keith/15-wp-005-injection-safeguards.md`
