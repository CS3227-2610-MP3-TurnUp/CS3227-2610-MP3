import { readFile, access } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Source checks only: no network, app/database/provider calls or generated files.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sources = ['docs/index.md', 'docs/UserGuide.md', 'docs/DeveloperGuide.md', 'docs/WEBSITE.md', 'docs/assets/images/README.md', 'workflow/README.md'];
const failures = [];
const read = (path) => readFile(resolve(root, path), 'utf8');
const withoutCode = (text) => text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
const slug = (heading) => heading.toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');
const headings = (text) => new Set([...withoutCode(text).matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slug(match[1])));

for (const file of sources) {
  const text = await read(file);
  const fences = text.split('\n').filter((line) => /^```/.test(line));
  if (fences.length % 2) failures.push(`${file}: unclosed code fence`);
  for (const match of withoutCode(text).matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^(https?:|mailto:)/.test(target)) {
      try { const url = new URL(target); if (url.username || url.password) failures.push(`${file}: credential-bearing URL`); }
      catch { failures.push(`${file}: malformed URL ${target}`); }
      continue;
    }
    if (target.includes('{{')) continue;
    const [path, anchor] = target.split('#');
    const full = path ? resolve(root, dirname(file), decodeURIComponent(path)) : resolve(root, file);
    if (relative(root, full).split(sep).includes('..')) { failures.push(`${file}: link escapes repository`); continue; }
    try {
      await access(full);
      if (anchor && full.endsWith('.md') && !headings(await readFile(full, 'utf8')).has(decodeURIComponent(anchor))) {
        failures.push(`${file}: missing heading ${target}`);
      }
      if (/!\[/.test(match[0]) && /\.png$/i.test(full)) {
        const bytes = await readFile(full);
        if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) failures.push(`${file}: invalid PNG ${path}`);
      }
    } catch { failures.push(`${file}: missing local target ${target}`); }
  }
}

const config = await read('docs/_config.yml');
for (const asset of ['docs/_layouts/document.html', 'docs/_includes/head.html', 'docs/assets/css/site.css', 'docs/assets/js/mermaid.js']) await access(resolve(root, asset));
if (!config.includes('baseurl: "/CS3227-2610-MP3"') || !config.includes('theme: minima')) failures.push('Pages project path or theme missing');
const appOrigin = config.match(/^app_url:\s*"([^"]+)"\s*$/m)?.[1];
try {
  const url = new URL(appOrigin);
  if (url.protocol !== 'https:' || url.origin !== appOrigin || url.username || url.password) throw new Error();
  for (const file of ['docs/UserGuide.md', 'docs/DeveloperGuide.md']) {
    if (!(await read(file)).includes(`(${appOrigin}/)`)) failures.push(`${file}: direct application link differs from app_url`);
  }
} catch { failures.push('Pages app_url must be an HTTPS origin without credentials, path or trailing slash'); }
for (const file of ['index.md', 'UserGuide.md', 'DeveloperGuide.md']) {
  if (!config.includes(`  - ${file}`)) failures.push(`Missing navigation page ${file}`);
  if (!/^---\r?\n[\s\S]*?\btitle:[\s\S]*?\r?\n---/.test(await read(`docs/${file}`))) failures.push(`Missing page front matter: ${file}`);
}

const dg = await read('docs/DeveloperGuide.md');
const diagrams = [...dg.matchAll(/^```mermaid\r?\n([\s\S]*?)^```/gm)];
for (const type of ['flowchart TB', 'classDiagram', 'stateDiagram-v2', 'sequenceDiagram']) {
  if (!diagrams.some((match) => match[1].trim().startsWith(type))) failures.push(`Missing expected diagram type: ${type}`);
}
if (diagrams.length !== 5) failures.push(`Expected 5 design diagrams; found ${diagrams.length}`);
const ug = await read('docs/UserGuide.md');
const pending = [...ug.matchAll(/\*\*Screenshot (UG-\d{2}) —/g)].map((match) => match[1]);
if (new Set(pending).size !== pending.length) failures.push('Duplicate screenshot placeholder IDs');
for (let index = 1; index <= 14; index++) {
  const id = `UG-${String(index).padStart(2, '0')}`;
  const captioned = new RegExp(`Figure ${id}\\.`).test(ug);
  if (!pending.includes(id) && !captioned) failures.push(`${id}: preserve the placeholder or supply its figure caption and image`);
}
if (process.argv.includes('--require-screenshots') && pending.length) failures.push(`${pending.length} screenshot placeholders still require capture`);

for (const failure of failures) console.error(`FAIL: ${failure}`);
console.log(`Checked ${sources.length} documents, Pages source assets and ${diagrams.length} diagram definitions.`);
console.log(`Pending screenshot placeholders (${pending.length}): ${pending.join(', ') || 'none'}`);
console.log('Source checks do not establish Jekyll build, diagram rendering, browser behavior or deployment success.');
process.exitCode = failures.length ? 1 : 0;
