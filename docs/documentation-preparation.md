# Documentation and product-site preparation

Owner: Darryl. Branch: `codex/product-documentation`. Application source baseline: `55d9cb7ee1155fbbb68a94bbcc06cce47b4297a8`, containing the merged UI work. No numeric change ID is inferred. Current explicit assignment authorises guides, actual-app screenshots, UML and a GitHub Pages site using MP2 as a formatting reference. No application feature/schema change, secret publication or deployment is required to prepare these artifacts.

Main agent is the single writer for guides, site assets/configuration, README pointers and this increment's log. An independent non-author agent will review the executable site configuration/renderer and check substantive documentation accuracy against code. Local agent/skill customizations, generated development types and unrelated screenshot remain outside the deliverable.

## Evidence and limitations

- Read MP2 `docs/UserGuide.md`, `DeveloperGuide.md`, `index.md`, `_config.yml`, document layout, Mermaid renderer, Gemfile and website-maintenance notes. Reuse is acknowledged in the DG.
- Read actual routes, UI, auth/account policies, event/publication service, registration queries/transactions/form contracts, assistant projection/admission/history and Prisma schema. Older roadmap completion summaries are not treated as product availability.
- The user selected `https://turnup-nine.vercel.app/` as the stable Production link, with later changes expected. The address is centralised in `_config.yml`. A read-only unauthenticated HTTP check redirected to Vercel sign-in; it did not establish successful application access.
- Built-in-browser attempts before and after user enablement, plus a connection reset/inventory refresh, still reported `Local browser use is disabled in Work settings`. Screenshots remain pending; no fabricated images, external browser bypass or private Production data access is used.
- Ruby/Bundler are not on PATH. Jekyll rendering and visual responsive checks are pending; source validation is not a site-build claim.

Checks, screenshot coverage and independent findings will be appended after execution. No live-provider request, production write, commit, push or Pages publication is claimed.

The user explicitly accepted clear manual screenshot placeholders after the browser remained unavailable. The User Guide contains UG-01 through UG-14, with exact state/framing and synthetic-data instructions; the image checklist provides stable filenames and replacement Markdown. No broken image paths or fabricated screenshots were added. Publication screenshots remain a later manual task, not a blocker to the requested placeholder-based preparation.

## Implemented outputs

- User Guide: actual implemented accounts, role navigation, Student discovery/registration/captured corrections/My Events/assistant/history, manual Organiser publication/lifecycle, settings, truthful failures and tester walkthrough. Fourteen explicit manual screenshot placeholders replace unavailable captures by the user's direct amendment.
- Developer Guide: code/route/schema-based setup, module/deployment view, persistent class relationships, publication-state diagram, registration sequence and assistant sequence; security/budgets/history, test isolation, workflow map and acknowledgements. Roadmap-only proposal/builder/roster/inbox and general retention work stay explicitly pending.
- Product site: MP2-style Minima/Jekyll home/navigation, TurnUp styling, strict pinned Mermaid renderer with readable failure fallback, project base path and selected app launch links. Separate website-maintenance instructions describe publication; no Pages setting was changed.
- Workflow map/checker consolidates discoverability while retaining framework-discovered files in their natural locations. Local agent/skill customizations are described, never copied or published.

## Independent verification

Non-author `/root/ui_review` reviewed `55d9cb7` plus final documentation/site changes without editing files. Two substantive User Guide errors were found: Password uses Change rather than Edit, and description-only updates do not create My Events flags. Both were corrected; the walkthrough now updates location. Reviewer rechecked both and found no outstanding actionable defects.

Independent source/readiness/syntax checks passed with accepted placeholders; strict readiness correctly failed for 14 pending images. A deterministic mocked renderer harness verified no import on empty pages, offline source retention, strict configuration, isolated diagram errors, successful sibling replacement and inert hostile instruction data. Initial harness module-format error was repaired without implementation changes. Minima 2.5.1 upstream layout/header and Pages 232 plugin/dependency assumptions were checked. No actual graphical rendering was claimed.

## Executed checks

- `node workflow/validate-docs.mjs` — passed; six source documents, site assets and five diagram definitions checked;14 pending captures reported.
- `node workflow/validate-docs.mjs --require-screenshots` — exit 1, deliberately identifying the 14 unreplaced screenshot placeholders. This is a remaining manual task, not a claimed illustrated-guide pass.
- `node --check workflow/validate-docs.mjs` and `node --check docs/assets/js/mermaid.js` — passed.
- `node node_modules/eslint/bin/eslint.js workflow/validate-docs.mjs docs/assets/js/mermaid.js` — passed.
- Existing locked `js-yaml` 4.3.2 parsed `_config.yml` and all page/document-layout front matter; expected app/project/layout settings checked. Initial Python YAML attempt found PyYAML absent; no Python package installed.
- `git diff --check` — passed, with ordinary LF/CRLF conversion notices.
- No application test/build rerun: application code is unchanged. Prior 688-test UI evidence remains linked from that increment and is not attributed to this one.
- Not run: Jekyll build (Ruby/Bundler unavailable), browser screenshots/layout checks (tool disabled; user accepted placeholders), actual diagram rendering, live-provider/database/hosted workflow checks and Pages publication. No deployment/commit/push claim.
