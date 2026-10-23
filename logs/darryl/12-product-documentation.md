# 01 - Prepare Guides and Product Website - 23 October 2026

## Request

Prepare the User Guide, Developer Guide with UML, adequate actual-app screenshots and a GitHub Pages product website. Use implemented code as the source of truth and MP2 as the formatting reference. Subsequent clarification selects `https://turnup-nine.vercel.app/` as the current Production address. Preserve local-only agent/skill customizations.

## Results

Created `codex/product-documentation` and fast-forwarded to merged UI source `55d9cb7`. Main agent audited actual routes, policies, service transactions, assistant/history and schema, then authored `docs/UserGuide.md`, `DeveloperGuide.md` (five design diagrams), product home, Pages config/layout/head/style/renderer/Gemfile and maintenance notes. Adapted and acknowledged MP2's guide/Minima/Jekyll/Mermaid approach; no MP2 screenshot or behavior was represented as TurnUp. Added `workflow/README.md`, a credential-free documentation checker, README entry points and ignored Jekyll outputs. No application/schema change.

The user-selected Production address is used in guides and site launch links. Read-only HTTP access redirected to Vercel sign-in; no authenticated hosted success or deployment outcome is inferred. Browser attempts and reconnect remained disabled despite user consent. The follow-up instruction accepted manual screenshot placeholders (entry 02). Source scope/evidence/limitations and independent findings are consolidated in [documentation preparation](../../docs/documentation-preparation.md). No commit/push/Pages publication requested or executed for this increment. Unrelated local agent/usage/generated files and screenshot remain preserved.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 1,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "55d9cb7ee1155fbbb68a94bbcc06cce47b4297a8",
  "captured_at": "2026-10-22T20:01:53.199768+00:00",
  "delegation": "Main agent directly owns all drafting/source/configuration writes. Independent review of the completed site was dispatched under the continuing screenshot amendment recorded in entry 02.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Prepare code-grounded User and Developer Guides, UML and an MP2-style Pages website.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "Authored guides, five diagrams, Pages source/style/renderer, maintenance instructions, workflow inventory/checker and README entry points. Used user-selected Production URL; no app code or deployment changed.",
      "settings": {
        "model": null,
        "effort": null,
        "basis": "unknown"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "No exact prompt-scoped runtime usage available; root response remains active at snapshot."
      }
    }
  ],
  "usage_updates": []
}
```

# 02 - Make Manual Screenshot Capture Explicit - 23 October 2026

## Request

If built-in-browser capture remains unavailable, leave clear User Guide placeholders so Darryl can manually capture and supply screenshots.

## Results

Added UG-01 through UG-14 for account, Student, Organiser and assistant states, including desktop/mobile and tall-form framing. The guide and image checklist name exact synthetic-data/privacy constraints, filenames and replacement Markdown. No broken image paths or fabricated screenshots. Source checking preserves placeholder/figure IDs; final illustrated readiness deliberately fails while captures remain pending.

Reused `/root/ui_review` once for independent review of completed docs/site/checker against application source. It found the password-row control was Change, not Edit, and description-only edits do not trigger My Events flags. Corrected both, using a location change in the tester walkthrough; reviewer rechecked and reported no outstanding actionable defects. It independently reproduced source/readiness/syntax checks and a mocked renderer harness proving strict configuration, offline fallback, isolated failures and inert hostile instruction text. Those mocks do not establish graphical Mermaid or browser behavior. No reviewer authored changes.

Root checks: documentation source checker passed; strict screenshot mode exited 1 with 14 pending, as expected; existing locked js-yaml parsed Pages/page/layout front matter; renderer/checker syntax, focused ESLint and diff whitespace checks passed. Ruby/Bundler absent, so no Jekyll build, real screenshot/responsive walkthrough, hosted flow or live inference claim. Existing 688-test UI evidence is historical and explicitly separate; app tests were not rerun for documentation-only changes. Process-log validation is required before handoff. No new agent spawned, no production write and no local customization publication.

<!-- turnup-prompt:v1 -->
```json
{
  "version": 1,
  "entry": 2,
  "root_thread_id": null,
  "root_turn_id": null,
  "revision": "55d9cb7ee1155fbbb68a94bbcc06cce47b4297a8",
  "captured_at": "2026-10-22T20:01:53.199768+00:00",
  "delegation": "Reuse the existing non-author implementation verifier for executable Pages/checker review and code-grounded guide accuracy; no parallel author writes.",
  "agents": [
    {
      "id": "/root",
      "parent": null,
      "thread_id": null,
      "action": "root",
      "role": "main",
      "task": "Replace unavailable browser captures with clear manual screenshot placeholders and complete verification.",
      "reason": null,
      "dispatches": 0,
      "outcome": "completed",
      "result": "Prepared 14 numbered placeholders plus exact filenames/states/privacy guidance; source/YAML/syntax/lint checks passed. Independent review found two guide errors, corrected and rechecked. No screenshots or Jekyll build claimed.",
      "settings": {
        "model": null,
        "effort": null,
        "basis": "unknown"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "No exact prompt-scoped runtime usage available; root response remains active at snapshot."
      }
    },
    {
      "id": "/root/ui_review",
      "parent": "/root",
      "thread_id": null,
      "action": "reuse",
      "role": "implementation_verifier",
      "task": "Review final docs/site/checker against actual code and reproduce checks.",
      "reason": "Required independent review of executable site/configuration and substantive guide accuracy.",
      "dispatches": 1,
      "outcome": "completed",
      "result": "Found incorrect password-control label and description-change walkthrough expectation; both corrected/rechecked. No outstanding actionable defect. Source/readiness/syntax and mocked strict, offline and inert renderer checks passed.",
      "settings": {
        "model": "gpt-6.1-sol",
        "effort": "high",
        "basis": "configured"
      },
      "tokens": {
        "status": "unavailable",
        "responses": null,
        "input": null,
        "cached_input": null,
        "output": null,
        "reasoning_output": null,
        "total": null,
        "source": null,
        "note": "Reviewer runtime tokens unavailable; no earlier agent-lifetime totals reused."
      }
    }
  ],
  "usage_updates": []
}
```
