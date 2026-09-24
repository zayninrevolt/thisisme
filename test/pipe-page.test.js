import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readFile } from 'node:fs/promises';

const pipeRoot = new URL('../pipe/', import.meta.url);
const html = await readFile(new URL('index.html', pipeRoot), 'utf8');

test('pipe calculator is self-contained, accessible and protected by a restrictive CSP', async () => {
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.match(html, /id="calculation-purpose"/);
  assert.match(html, /id="add-section"/);
  assert.match(html, /id="calculator-error"/);
  assert.match(html, /http-equiv="Content-Security-Policy" content="[^"]*default-src 'self'/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /style-src 'self'/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval|\son[a-z]+=/i);
  for (const [, reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|#|data:)/.test(reference)) continue;
    await access(new URL(reference.replace(/^\//, ''), pipeRoot));
  }
});
