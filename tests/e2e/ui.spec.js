// Main UI flows: tabs and swipe, joining by link, the iPhone home-screen rules, leaving, updates, offline.
const { test, expect, LIST, addItem, groceryNames, swipe, tab, currentTab } = require('../fixtures');

test('tabs switch by tap and by swipe, and the last tab is remembered', async ({ phone }) => {
  const a = await phone();
  expect(await currentTab(a)).toBe('groceries');
  await expect(a.locator('.tab')).toHaveText([/Groceries/, /To-dos/, /Recipes/]);
  const seq = [];
  for (const dir of ['left', 'left', 'left', 'right', 'right', 'right']) {
    await swipe(a, dir);
    seq.push(await currentTab(a));
  }
  expect(seq).toEqual(['todos', 'recipes', 'recipes', 'todos', 'groceries', 'groceries']);
  await expect(a.locator('#paneG')).toBeVisible();
  await expect(a.locator('#paneT')).toBeHidden();
  await tab(a, 'recipes');
  await expect(a.locator('#paneD')).toBeVisible();
  await a.reload();
  expect(await currentTab(a)).toBe('recipes');
});

test('an invite link joins the list and keeps the code in the address', async ({ phone }) => {
  const a = await phone();
  await addItem(a, 'mælk');
  const b = await phone({ device: 'iPhone 13', list: null, url: `./?list=${LIST.toLowerCase()}` });
  await expect.poll(() => groceryNames(b)).toEqual(['Mælk']);
  expect(new URL(b.url()).search).toBe(`?list=${LIST}`);
  expect(await b.evaluate(() => JSON.parse(localStorage.getItem('cart-log.code')))).toBe(LIST);
  // typing a code on the start screen works too
  const c = await phone({ list: null });
  await expect(c.locator('#setup')).toBeVisible();
  await c.fill('#joinCode', 'test-list');
  await c.tap('#join');
  await expect.poll(() => groceryNames(c)).toEqual(['Mælk']);
  expect(new URL(c.url()).search).toBe(`?list=${LIST}`);
});

test('the share menu shows the list code and the invite link', async ({ phone }) => {
  const a = await phone();
  await a.tap('#menu');
  await expect(a.locator('#codeShow')).toHaveText(LIST);
  await expect(a.locator('#dlg')).toBeVisible();
});

test('manifest is linked on Android but not on iPhone (so Add to Home Screen keeps ?list=)', async ({
  phone,
}, testInfo) => {
  const a = await phone();
  const links = await a.$$eval('link[rel=manifest]', (l) => l.map((x) => x.getAttribute('href')));
  if (testInfo.project.name === 'iphone') expect(links).toEqual([]);
  else expect(links).toEqual(['manifest.json']);
  const m = await (await a.request.get('manifest.json')).json();
  expect(m).toMatchObject({ id: 'cart-log-v1', start_url: './', scope: './', display: 'standalone' });
});

test('the installed app only uses a start-address code when it has no list yet', async ({ phone }) => {
  const a = await phone({ list: null });
  await a.context().addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  await a.goto(`./?list=${LIST}`);
  expect(await a.evaluate(() => JSON.parse(localStorage.getItem('cart-log.code')))).toBe(LIST);
  expect(new URL(a.url()).search).toBe(''); // the installed app doesn't show the code in its address
  // leave, relaunch from the same start address: stays out
  await a.tap('#menu');
  a.answers.push(true);
  await a.tap('#leaveBtn');
  await expect(a.locator('#setup')).toBeVisible();
  await a.goto(`./?list=${LIST}`);
  await expect(a.locator('#setup')).toBeVisible();
  // join another list, relaunch from the old start address: keeps the new one
  await a.fill('#joinCode', 'OTHER222');
  await a.tap('#join');
  await a.goto(`./?list=${LIST}`);
  expect(await a.evaluate(() => JSON.parse(localStorage.getItem('cart-log.code')))).toBe('OTHER222');
});

test('leaving a list goes back to the start screen and forgets the list on this phone', async ({ phone }) => {
  const a = await phone();
  await addItem(a, 'mælk');
  await a.tap('#menu');
  a.answers.push(true);
  await a.tap('#leaveBtn');
  await expect(a.locator('#setup')).toBeVisible();
  expect(await a.evaluate(() => JSON.parse(localStorage.getItem('cart-log.items')))).toEqual([]);
  expect(new URL(a.url()).search).toBe('');
});

test('“Check for updates” says when this copy is the latest', async ({ phone }) => {
  const a = await phone();
  await a.tap('#menu');
  await a.tap('#updBtn');
  await expect.poll(() => a.dialogs.at(-1)).toMatch(/^You're on the latest version \(v\d+\.\d+\)\.$/);
});

test('every localStorage key the app writes starts with "cart-log."', async ({ phone }) => {
  const a = await phone();
  await addItem(a, 'mælk');
  await tab(a, 'todos');
  await tab(a, 'recipes');
  const keys = await a.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(3);
  expect(keys.filter((k) => !k.startsWith('cart-log.') && !k.startsWith('firestore_'))).toEqual([]);
});

test('offline: the service worker serves the app and the list from this phone', async ({ phone }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'same service worker; checked once');
  const a = await phone({ serviceWorkers: 'allow' });
  await a.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await a.reload(); // now controlled by the worker, which caches what it serves
  await expect.poll(() => a.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await addItem(a, 'mælk');
  await a.waitForTimeout(300);
  const caches_ = await a.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('cart-log-')));
  expect(caches_).toHaveLength(1);
  await a.context().setOffline(true);
  await a.reload();
  await expect.poll(() => groceryNames(a)).toEqual(['Mælk']);
  await expect(a.locator('#sync')).toHaveText('offline');
  await a.context().setOffline(false);
});
