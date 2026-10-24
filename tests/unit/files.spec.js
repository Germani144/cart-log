// Static checks on how the app's files fit together (no browser needed).
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const root = path.resolve(__dirname, '../..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const index = read('index.html');
const sw = read('sw.js');

const localFiles = [...index.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
const shell = JSON.parse(
  sw
    .match(/const SHELL = (\[[\s\S]*?\]);/)[1]
    .replace(/'/g, '"')
    .replace(/,\s*\]/, ']'),
);

test('every file index.html loads is precached by the service worker (offline start)', () => {
  expect(localFiles.length).toBeGreaterThan(10);
  for (const f of localFiles.filter((f) => f !== 'icon-180.png')) expect(shell, f).toContain(f);
  for (const f of shell.filter((f) => f !== './')) expect(fs.existsSync(path.join(root, f)), f).toBe(true);
});

test('no inline scripts or inline event handlers (the CSP blocks them)', () => {
  expect(index).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
  expect(index).not.toMatch(/<[a-z][^>]*\son[a-z]+=/i);
  const csp = index.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
  const scriptSrc = csp
    .match(/script-src ([^;]+);/)[1]
    .trim()
    .split(/\s+/);
  expect(scriptSrc).toEqual(["'self'", 'https://www.gstatic.com/firebasejs/']);
});

test('the version label and the service worker cache name match', () => {
  const label = index.match(/id="ver">v([\d.]+)</)[1];
  const cache = sw.match(/const CACHE=PREFIX\+'([\d.]+)';/)[1];
  expect(cache).toBe(label);
});

test('the manifest keeps its id and scope', () => {
  const m = JSON.parse(read('manifest.json'));
  expect(m).toMatchObject({ id: 'cart-log-v1', start_url: './', scope: './' });
});
