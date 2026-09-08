import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

async function readLocalModuleSources(entry) {
  const seen = new Set();
  const chunks = [];

  async function visit(url) {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const source = await readFile(url, 'utf8');
    chunks.push(source);
    const imports = [...source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g)];
    await Promise.all(imports.map((match) => visit(new URL(match[1], url))));
  }

  await visit(new URL(entry, import.meta.url));
  return chunks;
}

async function readLocalModuleGraph(entry) {
  return (await readLocalModuleSources(entry)).join('\n');
}

test('loads local styles and application code without inline blocks', () => {
  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script type="module" src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.doesNotMatch(html, /<script>\s/);
  assert.doesNotMatch(html, /\sstyle="[^"]*"/i);
});

test('uses one page landmark and exposes simulated windows as named regions', () => {
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  const windows = html.match(/<section class="[^"]*\bwindow\b[^"]*"[^>]+role="region"[^>]*>/g) || [];
  assert.equal(windows.length, 6);
  for (const window of windows) assert.match(window, /aria-labelledby="[^"]+"/);
  assert.doesNotMatch(html, /<section class="[^"]*\bwindow\b[^"]*"[^>]+role="dialog"/);
});

test('Discord links to the verified account ID rather than a username', () => {
  assert.match(html, /href="https:\/\/discord\.com\/users\/531892280726913034"/);
  assert.doesNotMatch(html, /discord\.com\/users\/just\.zayn/);
});

test('canonical and crawl files consistently identify the production homepage', async () => {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(canonical, 'https://justzayn.com/');
  const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/justzayn\.com\/sitemap\.xml/);
  const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const linksHtml = await readFile(new URL('../links/index.html', import.meta.url), 'utf8');
  const linksCanonical = linksHtml.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(linksCanonical, 'https://justzayn.com/links/');
  assert.deepEqual(urls, [canonical, linksCanonical]);
});

test('uses an accessible native About dialog', () => {
  assert.match(html, /<dialog class="dialog-backdrop" id="aboutDialog"/);
  assert.match(html, /id="aboutClose"[^>]*aria-label="Close About ZayninRevolt"/);
});

test('defines a restrictive content security policy for required integrations', () => {
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] || '';
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self' https:\/\/gc\.zgo\.at/);
  assert.match(policy, /frame-src https:\/\/open\.spotify\.com https:\/\/player\.twitch\.tv/);
  assert.doesNotMatch(policy.match(/script-src[^;]+/)?.[0] || '', /'unsafe-inline'/);
  const imagePolicy = policy.match(/img-src[^;]+/)?.[0] || '';
  assert.match(imagePolicy, /https:\/\/d15f34w2p8l1cc\.cloudfront\.net/);
  assert.match(imagePolicy, /https:\/\/static\.playoverwatch\.com/);
  assert.doesNotMatch(policy.match(/style-src[^;]+/)?.[0] || '', /'unsafe-inline'/);
});

test('application entry point delegates distinct responsibilities to local modules', async () => {
  const entry = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const localImports = [...entry.matchAll(/import\s+(?:[^'";]+?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g)];
  assert.ok(localImports.length >= 3, 'app.js should compose at least three focused local modules');
  await Promise.all(localImports.map((match) => access(new URL(match[1], new URL('../app.js', import.meta.url)))));
});

test('application code implements focus restoration, Escape handling, and request timeouts', async () => {
  const js = await readLocalModuleGraph('../app.js');
  assert.match(js, /previousFocus/);
  assert.match(js, /focusFirstControl/);
  assert.match(js, /event\.key !== 'Escape'/);
  assert.match(js, /AbortSignal\.timeout/);
  assert.match(js, /Twitch status unavailable/);
  assert.doesNotMatch(js, /owRanks\.innerHTML/);
  assert.match(js, /safeHttpsUrl/);
  assert.match(js, /event\.key === 'ArrowDown'/);
  assert.match(js, /role', 'gridcell'/);
});

test('boot sequence skips its delay when reduced motion is requested', async () => {
  const js = await readLocalModuleGraph('../app.js');
  assert.match(js, /matchMedia\(['"]\(prefers-reduced-motion:\s*reduce\)['"]\)/);
  assert.match(js, /prefersReducedMotion|reducedMotion/);
});

test('Minesweeper implements a roving tab stop and complete keyboard controls', async () => {
  const modules = await readLocalModuleSources('../app.js');
  const js = modules.find((source) => /getElementById\(['"]msGrid['"]\)/.test(source)) || '';
  assert.ok(js, 'A local module should own the Minesweeper board behavior');
  assert.match(js, /tabIndex\s*=\s*i\s*===\s*0\s*\?\s*0\s*:\s*-1|setAttribute\(['"]tabindex['"],\s*i\s*===\s*0\s*\?\s*['"]0['"]\s*:\s*['"]-1['"]\)/);
  assert.match(js, /grid\.addEventListener\(['"]keydown['"]/);
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
    assert.match(js, new RegExp(`['"]${key}['"]`), `Missing Minesweeper ${key} handling`);
  }
  assert.match(js, /event\.key\.toLowerCase\(\)\s*===\s*['"]f['"]|['"]f['"]\s*===\s*event\.key\.toLowerCase\(\)/);
  assert.match(html, /id="msStatus"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(js, /msStatus/);
});

test('taskbar exposes a control for every simulated window', () => {
  const windowIds = [...html.matchAll(/<section\b(?=[^>]*class="[^"]*\bwindow\b[^"]*")(?=[^>]*\bid="([^"]+)")[^>]*>/g)]
    .map((match) => match[1]);
  const taskTargets = [...html.matchAll(/<button\b(?=[^>]*class="[^"]*\btask\b[^"]*")(?=[^>]*\bdata-window-target="([^"]+)")[^>]*>/g)]
    .map((match) => match[1]);
  assert.deepEqual(new Set(taskTargets), new Set(windowIds));
  assert.equal(taskTargets.length, windowIds.length);
});

test('all local page assets exist', async () => {
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  const localReferences = references.filter((reference) =>
    !reference.startsWith('#') && !reference.startsWith('http') && !reference.startsWith('//'));

  await Promise.all(localReferences.map((reference) =>
    access(new URL(`../${reference}`, import.meta.url))));
});

test('external links opened in a new tab prevent opener access', () => {
  const externalTabs = html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
  assert.ok(externalTabs.length > 0);
  for (const link of externalTabs) assert.match(link, /rel="[^"]*noopener[^"]*"/);
});

test('page avoids inline event handlers and duplicate IDs', () => {
  assert.doesNotMatch(html, /\son[a-z]+="/i);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('application ID lookups all resolve to page elements', async () => {
  const js = await readLocalModuleGraph('../app.js');
  const pageIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const requestedIds = [...js.matchAll(/getElementById\('([^']+)'\)/g)].map((match) => match[1]);
  for (const id of requestedIds) assert.ok(pageIds.has(id), `Missing element #${id}`);
});

test('simple page has safe links, local assets, one landmark and no scripts', async () => {
  const pageUrl = new URL('../links/index.html', import.meta.url);
  const page = await readFile(pageUrl, 'utf8');
  assert.equal((page.match(/<main\b/g) || []).length, 1);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(page, /<script\b|\son[a-z]+="|\sstyle="/i);
  assert.match(page, /script-src 'none'/);
  const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const tag of page.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) {
    assert.match(tag, /rel="[^"]*noopener[^"]*"/);
  }
  for (const match of page.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (!/^(https?:|#)/.test(match[1])) await access(new URL(match[1], pageUrl));
  }
});

test('quality workflow runs the repository test command', async () => {
  const workflow = await readFile(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8');
  assert.match(workflow, /npm test/);
});
