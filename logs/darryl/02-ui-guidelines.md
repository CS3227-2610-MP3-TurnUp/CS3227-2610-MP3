# 01 - TurnUp UI Guidelines - 17 October 2026

## Request

Create shared visual guidelines for TurnUp on a new branch from the default branch. Darryl-owned UI documentation increment, now named `codex/ui-guidelines`, based on freshly fetched `origin/master` at `f8804f0d39c49a4ac10c19d07b31ab73395b6528` (this repository has no `main`). Separate from the planning/context-optimisation increment whose allocated log is `01-implementation-planning.md` on the other branch. No implementation change ID is allocated or reserved by this documentation assignment.

## Results

- Added `docs/ui-guidelines.md` for colours, type/spacing/radii, shell/grid dimensions, components, responsive defaults, feedback, accessibility and shared implementation handoffs.
- Added `docs/ui-screen-patterns.md` for accounts/profile, discovery/details, registration/My Events, Organiser preparation/publication, proposal assistance, FAQ/private replies and forms/roster. Linked existing IDs/specs and preserved their role, privacy and feature boundaries.
- Updated root README and specification-index navigation to load UI context only for interface work; canonical behavioural files, decisions and acceptance scenarios remain authoritative. The context-optimisation branch was not merged into this branch.
- Spot contrast calculations: action/white 6.90:1, ink/white 13.35:1, muted/white 6.12:1, decorative line/white 1.39:1. The guide calls for stronger control identification where needed and robust focus handling; these spot checks are not full accessibility validation.
- Initial-draft checks passed: all 14 palette values, 157 local Markdown links/anchors, six then-present documents' whitespace/final-newline checks and `git diff --check`. Canonical behaviour/decision/scenario files, ownership plan and instructions match `origin/master`. Branch HEAD/base both equal `f8804f0` before any commit. The following entry records simplification of the draft and its updated checks.
- Independent Specification Reviewer checked numeric tokens/layout/font/contrast and TurnUp contract consistency. One low-severity finding corrected public reply reuse from ambiguous 'move' wording to explicit copy with no private-thread removal. Sequential recheck confirmed the correction, scalable font guidance, approval/publication distinction and log facts; no actionable findings remained. The reviewer independently ran `git diff --check`; full structural validation remains parent evidence.
- No application, rendering, screenshot comparison, dependency installation, commit, push or deployment is claimed. Future rendered UI/accessibility checks are still required.

# 02 - Standalone UI Documentation - 17 October 2026

## Request

Make the guidelines wholly about TurnUp's UI, without external attribution, comparisons or background references. Continue the same documentation increment and preserve the visual direction.

## Results

- Reworded both guides and navigation as standalone TurnUp design instructions. Removed the separate background document and its links, and renamed the local branch to `codex/ui-guidelines`.
- Updated identifying wording in the earlier log entry under this explicit correction request while retaining its design/check/review history. No visual token, layout dimension, component rule, role/privacy boundary or canonical requirement was changed by this correction.
- Final checks passed: standalone wording scan, all 14 palette colours and checked layout/contrast values preserved, all 151 local links/anchors resolving, five documents' formatting and `git diff --check`. Canonical behaviour, decisions, scenarios, process instructions and prior evidence remain unchanged against `origin/master`.
- Independent reviewer rechecked both guides, navigation and corrected log; visual/accessibility rules and role/privacy boundaries remain intact, with no actionable findings. It independently reran `git diff --check`. Rendered UI/full accessibility evaluation remains future implementation work. No application code, dependency installation, commit or push is included.
