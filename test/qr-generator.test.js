import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8');
}

test('QR generator is a self-contained browser tool with safe local assets', async () => {
  for (const path of [
    'qr-generator/index.html',
    'qr-generator/styles.css',
    'qr-generator/app.js',
    'qr-generator/vendor/qrcode-generator.js',
  ]) {
    await access(new URL(path, root));
  }

  const html = await read('qr-generator/index.html');
  assert.match(html, /<main\b/);
  assert.match(html, /id="qr-content"/);
  assert.match(html, /id="error-correction"/);
  assert.match(html, /id="qr-canvas"/);
  assert.match(html, /id="download-png"/);
  assert.match(html, /src="app\.js"/);
  assert.match(html, /src="vendor\/qrcode-generator\.js"/);
  const scriptSources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(scriptSources.every((source) => !/^https?:\/\//.test(source)));
  assert.doesNotMatch(html, /\son[a-z]+=/i);

  const app = await read('qr-generator/app.js');
  assert.match(app, /toDataURL\('image\/png'\)/);
  assert.match(app, /addEventListener\('input'/);
  assert.match(app, /textContent/);
});

test('homepage advertises the QR generator as a live working tool', async () => {
  const home = await read('index.html');
  assert.match(home, /QR generator/);
  assert.match(home, /href="\/qr-generator\/"/);
});
