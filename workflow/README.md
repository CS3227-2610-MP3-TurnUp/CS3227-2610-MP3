# Development workflow map

This folder consolidates portable workflow support without relocating files required
by Next.js, GitHub Actions, Prisma or existing repository conventions.

- `validate-docs.mjs`: credential-free source validation for the product guides and
  Pages configuration. Run `node workflow/validate-docs.mjs`; add
  `--require-screenshots` for final illustrated-guide readiness. It checks local links,
  contents anchors, assets, expected diagram types and placeholder coverage. It does
  not build Jekyll, render Mermaid or establish application/browser acceptance.
- `../AGENTS.md`, `../CONTRIBUTING.md`: current repository instructions, ownership,
  handoffs and evidence discipline.
- `../specs/`, `../changes/`: canonical behavior, acceptance scenarios, bounded plans,
  tasks and actual verification.
- `../logs/`: per-owner PR-increment prompt/interaction summaries.
- `../tests/`, `../vitest.config.ts`: automated checks and opt-in SQL fixtures.
- `../.github/workflows/`, `../.github/scripts/`: natural GitHub Actions locations for
  CI/deployment/usage checks and deployment output validation.
- `../scripts/`: provider budget activation and bounded private configuration utilities.
- `../docs/DeveloperGuide.md`: architecture/UML, setup, security and process explanation.
- `../docs/WEBSITE.md`: Jekyll/Pages preview and publishing instructions.

Local `.codex/agents/` and `.agents/skills/` customizations are deliberately not copied
into this folder or authorised for publication. Describing their responsibilities in
the Developer Guide does not revoke that exclusion. No replacement workflow toolkit
is installed, and no numeric change allocation is inferred by this map.
