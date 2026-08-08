import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('loads local styles and application code without inline blocks', () => {
  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script src="app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.doesNotMatch(html, /<script>\s/);
});

test('uses one page landmark and names each simulated window as a dialog', () => {
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  const dialogs = html.match(/<section class="window"[^>]+role="dialog"[^>]*>/g) || [];
  assert.equal(dialogs.length, 6);
  for (const dialog of dialogs) assert.match(dialog, /aria-labelledby="[^"]+"/);
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
});

test('application code implements focus restoration, Escape handling, and request timeouts', async () => {
  const js = await readFile(new URL('../app.js', import.meta.url), 'utf8');
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
  const js = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const pageIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const requestedIds = [...js.matchAll(/getElementById\('([^']+)'\)/g)].map((match) => match[1]);
  for (const id of requestedIds) assert.ok(pageIds.has(id), `Missing element #${id}`);
});

test('quality workflow runs the repository test command', async () => {
  const workflow = await readFile(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8');
  assert.match(workflow, /npm test/);
});
