# CHG-K-008 — Stable Preview alias

Status: implemented and locally verified; PR publication pending.

## Intent and source

On 21 October 2026 Keith allocated CHG-K-008 and requested a new branch containing
only this change, implementation, commit and pull request. He reports configuring
`PREVIEW_ALIAS` in the GitHub preview environment. The requested outcome is one
bookmarkable Preview hostname across CLI uploads, while retaining protection.

Source: `0c7d5ad` on master; B1/D11–D13 and G08. Human owner: Keith (WP-001).
Branch: `chg-k-008-preview-alias`; isolated checkout: `.worktrees/preview-alias`.
Primary agent is the sole implementation/documentation writer. Independent agent
review is assigned after implementation, with findings in verification.md.
Owner log: `logs/keith/12-stable-preview-alias.md`. No separate issue assigned.

Read contracts: specs/README task map, baseline, deployment-and-retention
DEP01–03/DEV01–03, accounts-and-access, ai-and-privacy SEC02/06, WP-001,
implementation-plan ownership/common rules, integration-handoffs foundation and
release rows, decisions G08, CHG-K-002 selected CLI design, existing workflow and
hosting guide; applicable T13/T15/T28 and coverage guidance. Product role behaviour
is unchanged. Prerequisites CHG-K-005/006 are integrated in the source revision.

## Scope and acceptance

Allowed paths: `.github/workflows/vercel-deploy.yml`,
`tests/hosting/preview-alias.test.ts`, `tests/hosting/vercel-output.test.ts`, `docs/wp-001-hosting-setup.md`,
`specs/shared/deployment-and-retention.md`,
`specs/verification/acceptance-scenarios.md`, this change directory and the owner log.

- Read `PREVIEW_ALIAS` from the selected GitHub environment; validate a dedicated
  lowercase single-label `*.vercel.app` hostname before Preview build/migrations.
- After successful Preview upload and strict URL parsing, assign the configured
  alias with the pinned Vercel CLI. Report the stable URL only after CLI success.
- Production never assigns the Preview alias and requires no alias variable.
- Preserve unique candidate URL/source evidence, current protection and isolation.
- Document that all allowed Preview branches share the last assigned target;
  distinct branches do not have a meaningful global commit order.
- Exercise actual workflow shell with stubbed CLI: success, invalid config,
  upload/alias failure, Production isolation and inert hostile input.

No provider mutation, deployment, account changes, sharing-token generation, paid
upgrade, dependency changes, product features, log-fetching workflow or merge is
assigned. Push and normal PR creation are explicitly authorised. The new branch
name deliberately does not match `preview/*`, so publication runs PR checks only.

## Verification and handoff

Local shell/static tests and independent agent review establish only the bounded
workflow behaviour (portions of T13/T15/T28), not complete scenarios or live alias
availability. Live routing, protection, share-token persistence and the user's
saved GitHub variable remain unverified. Steps for the first authorised Preview
run are in the hosting guide. No product decision or existing issue scope is
changed; issue reconciliation is not applicable. See tasks.md and verification.md.
