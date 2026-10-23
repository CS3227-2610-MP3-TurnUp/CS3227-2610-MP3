# Maintaining the TurnUp product website

The site follows MP2's Markdown → Jekyll → GitHub Pages approach, with Minima 2.5.1
from the pinned `github-pages` 232 toolchain. It is separate from the Next.js/Vercel
application. No custom Pages deployment workflow or server credentials are needed
for the branch-based approach below.

## Files

| File | Purpose |
| --- | --- |
| `index.md` | Product introduction, implemented capabilities and links. |
| `UserGuide.md`, `DeveloperGuide.md` | Canonical guides, rendered both as Markdown and site pages. |
| `_config.yml` | Site title, project base path, navigation, application URL and exclusions. |
| `_layouts/document.html` | Wraps documents using Minima's default layout; shared footer/skip navigation and Mermaid script. |
| `_includes/head.html` | Theme-compatible head override with metadata and shared styles. |
| `assets/css/site.css` | TurnUp colours, page hierarchy, responsive cards/tables and print presentation. |
| `assets/js/mermaid.js` | Adapted MP2 renderer, pinned Mermaid 11.4.1, strict mode and readable fallback. |
| `assets/images/README.md` | Screenshot replacement/capture checklist; excluded from the product site. |
| `Gemfile` | Optional local Ruby toolchain. No application dependency is added. |
| `../workflow/validate-docs.mjs` | Credential-free source/link/screenshot-placeholder validation. |

The exclusions keep internal plans, source references and operational notes out of
the product website. They do not remove anything from GitHub. Do not place credentials
or personal data anywhere in `docs/`, even if a file is excluded from the site.

## Preview locally

Install Ruby 3.3 and Bundler in an appropriate development environment. The local
Jekyll toolchain was not available during initial preparation; do not treat source
checks as proof of a successful Jekyll build.

From `docs/`:

```sh
bundle install
bundle exec jekyll build --strict_front_matter
bundle exec jekyll serve --host 127.0.0.1
```

Open `http://127.0.0.1:4000/CS3227-2610-MP3/`. Do not omit the project base path.
Generate/review `Gemfile.lock` after resolving on the intended platform and commit it
with an authorised toolchain update; MP2's old multi-platform lock was not copied.
Use the installed Jekyll/GitHub Pages versions rather than assuming Minima v3 APIs.
Generated `_site`, cache, vendor and local Bundler directories are ignored.

Check home → both guides → home, all contents links, diagrams, narrow tables and
keyboard navigation. Verify launch links target the intended app. Block the diagram
CDN once to confirm source remains readable, and inspect print layout if exporting.

## Publish when authorised

1. Merge/push the reviewed site files to the chosen publishing branch, normally
   `master`, through the team's normal delivery process.
2. In the repository, open **Settings → Pages → Build and deployment**.
3. Choose **Deploy from a branch**, the selected branch and **/docs**, then Save.
4. Wait for the actual Pages build/deployment run and inspect failures if any.
5. Open the configured project address:
   `https://cs3227-2610-mp3-turnup.github.io/CS3227-2610-MP3/`.
6. Verify links, images, diagrams and the live application target from the published site.

This is a publishing procedure, not a record of an executed deployment. Do not add
`.nojekyll`: these Markdown sources require Jekyll rendering. GitHub Pages sites are
public; publishing is distinct from the app's Vercel access controls.

See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Change the application address

The user selected `https://turnup-nine.vercel.app/` for initial preparation.

1. Update `app_url` in `_config.yml`; home/footer links use it.
2. Update portable application links in `UserGuide.md` and `DeveloperGuide.md`, plus
   the README quick link if present. Those Markdown files also work on GitHub without
   Liquid, so their direct links are intentionally explicit.
3. Check whether Vercel access protection appears before the TurnUp page. Record
   that separately from a successful app login; never publish bypass tokens.

The documentation site's `url`/`baseurl` configure GitHub Pages, not `AUTH_ORIGIN` or
the app. A repository rename/custom domain needs a corresponding Pages path update.

## Screenshots and diagrams

Replace each User Guide placeholder with an actual image using the numbered image
checklist. Commit only approved synthetic screenshots and accurate captions. Do not
publish the checklist as a product page. An optional home-page screenshot can reuse
the final discovery capture with a descriptive caption; no fake screenshot is required.

Mermaid blocks are maintained in `DeveloperGuide.md`. GitHub can render them directly;
the site script converts Jekyll code blocks in strict mode. The script loads pinned
Mermaid from jsDelivr only if a page contains diagrams. If JavaScript/CDN/rendering
fails, definitions stay readable. Inspect graphical output before claiming UML visual
verification. Keep source relationships aligned with the current schema and services.
