import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const linkedin = 'https://uk.linkedin.com/in/richard-chamberlain-577043230';

test('homepage is a professional card with reachable working tools, DokkaDoki and the exact LinkedIn destination', () => {
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Gas building surveyor/);
  assert.match(html, /renewable technology\./);
  assert.ok(html.includes(`href="${linkedin}"`));
  assert.match(html, /id="tools"/);
  assert.match(html, /Heat loss survey/);
  assert.match(html, /href="https:\/\/heatloss\.justzayn\.com\/"/);
  assert.match(html, /Pipe sizing/);
  assert.match(html, /Cylinder sizing/);
  assert.match(html, /id="dokkadoki"/);
  assert.match(html, /DokkaDoki is[\s\S]*more than/);
  assert.match(html, /Manga to discover/);
  assert.match(html, /href="\/desktop\/"/);
  assert.match(html, /href="\/links\/"/);
  assert.doesNotMatch(html, /hello@example\.com|\u2014/);
});

test('homepage security allows existing analytics but no inline code or embeds', async () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  for (const directive of ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "form-action 'none'", "style-src 'self'", "frame-src 'none'"]) assert.ok(csp.includes(directive));
  assert.match(csp, /script-src https:\/\/gc\.zgo\.at/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.doesNotMatch(html, /<style\b|<script>|\sstyle="|\son[a-z]+="/i);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|#|data:)/.test(reference)) continue;
    await access(new URL(reference.replace(/^\//,''), root));
  }
});

test('production styles retain the complete approved stylesheet', async () => {
  const css = await readFile(new URL('home.css', root), 'utf8');
  assert.doesNotMatch(css, /\[truncated\]/);
  assert.match(css, /\.open-intro\{padding:/);
  assert.match(css, /\.open-intro \.profession\{font-family:Georgia/);
  assert.match(html, /class="open-intro"/);
  assert.doesNotMatch(html, /class="business-card"|>↗</);
});

test('homepage social preview is a real local 1200 by 630 PNG with current metadata', async () => {
  assert.match(html, /rel="canonical" href="https:\/\/justzayn\.com\/"/);
  assert.match(html, /property="og:url" content="https:\/\/justzayn\.com\/"/);
  assert.match(html, /property="og:title" content="Zayn \| Building surveys &amp; renewable technology"/);
  assert.match(html, /property="og:image" content="https:\/\/justzayn\.com\/img\/business-card-og\.png"/);
  const image = await readFile(new URL('img/business-card-og.png', root));
  assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16),1200);
  assert.equal(image.readUInt32BE(20),630);
});
