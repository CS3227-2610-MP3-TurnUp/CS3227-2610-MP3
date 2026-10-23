# CHG-K-016 — WP-005 prompt-injection safeguards

Status: in progress. Implemented locally and independently agent-reviewed, with findings dispositioned. The live synthetic injection check and an authorised commit/PR are still to come. See [verification.md](verification.md).

## Intent and source

- **Requested outcome:** harden proposal PDF extraction and FAQ candidate generation against direct, obfuscated, Best-of-N and indirect (PDF-borne) prompt injection.
- **Assignment:** Keith, 23 October 2026. Keith reviewed suggested safeguards, then approved an implementation plan in a separate worktree.
- **Source revision:** `preview/wp-005` at `1c3785de13ae098290638a8be77ae41a9b64a318`. Branch `wp-005-injection-safeguards` in `.worktrees/wp-005-injection-safeguards`.
- **Context read:**
  - [AI and privacy](../../specs/shared/ai-and-privacy.md) SEC01–SEC05
  - [acceptance scenarios](../../specs/verification/acceptance-scenarios.md) T13/T14
  - [WP-005 guide](../../docs/wp-005-proposal-integration.md)
  - CHG-K-010 and CHG-K-012 records
- **Allocated change ID:** `CHG-K-016`, confirmed by Keith. CHG-K-014 and CHG-K-015 exist on the daily-generation and hosted branches.
- **Human owner and writer:** Keith (Claude Code acting for Keith).
- **Log:** [logs/keith/15-wp-005-injection-safeguards.md](../../logs/keith/15-wp-005-injection-safeguards.md). If this ships in the same PR as `preview/wp-005`, append later entries to `14-wp-005-proposal-integration.md` instead.
- **Issues:** pending.

## Scope

- **Requirements and scenarios:** SEC02 and SEC03 (PDF extraction and FAQ prompt portions). Scenario T13, PDF and public-document portions.
- **Deliverables:**
  - **Parsing:** `src/server/proposal-assistance/pdf-text.ts` normalises text, removes invisible characters and drops tiny or off-page text items.
  - **Prompt rules:** `src/server/proposal-assistance/prompt-safety.ts` is the shared security-rules block and end-of-data reminder.
  - **Prompts:** `src/server/proposal-assistance/prompts.ts` and `src/server/proposal-assistance/public-candidates/prompt.ts` use the rules first and the reminder last. The prompt versions are bumped: `CHG-K-016-injection-safeguards-v7`, and `CHG-K-016-public-candidates-v4` in `src/features/proposal-assistance/public-candidates.ts`.
  - **Validation:** `src/features/proposal-assistance/validation.ts` and `json-extraction-validation.ts`:
    - reject instruction-like evidence quotes
    - reject contacts in values or alternatives that their cited quotes don't support
    - drop private notes that add contacts absent from the pages
    - add a deterministic server review note for pages with instruction markers
  - **Tests:** focused tests under `tests/proposal-assistance/`.
  - **Docs and spec:** the guide, the SEC02 note and the T13 note.
- **Exclusions:**
  - no new rate limiter (Best-of-N is bounded by the existing per-owner window, shared gate, `temperature: 0` and the CHG-K-014 daily allowances)
  - no white-on-white detection
  - no model or provider change, migration or dependency change
  - no commit, push or deployment unless Keith authorises it
- **Dependencies:** CHG-K-010 and CHG-K-012 behaviour on `preview/wp-005`. Rebasing onto `preview/wp-005-hosted` (CHG-K-014/015) touches no files shared with this change.

## Decisions and acceptance

- **Decisions (Keith, 23 October 2026):**
  - base on `preview/wp-005`
  - allocate CHG-K-016
  - drop tiny (under 1 pt) and off-page text
- **Implementation decisions:**
  - The existing tuned task/field guidance stays in the user message to avoid extraction regressions on `qwen3.5:9b`.
  - Instruction markers need an AI target or an instruction-override phrase, so a topic such as "AI Ethics Workshop" is unaffected.
  - Evidence quotes from inside a marker sentence are rejected.
  - Contact checks treat any letters-only ending as a domain. This accepts some false rejections (withheld for manual entry) in exchange for no TLD-list bypass.
- **Completion conditions:**
  - Deterministic tests show injected or hidden text cannot reach accepted facts through the covered paths.
  - Supported links are still accepted.
  - All existing checks pass.
  - Independent agent review findings are dispositioned.
- **Limitations:**
  - A finite suite does not prove absence of injection.
  - Ordinary-looking false statements remain indistinguishable from real facts; Organiser review of prefilled values remains required.
  - Live model behaviour needs separately authorised synthetic runs (the guide's injection check).

## Handoff

See [tasks.md](tasks.md) and [verification.md](verification.md).
