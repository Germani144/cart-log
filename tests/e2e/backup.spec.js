// Settings → Export data / Import data.
const fs = require('fs');
const { test, expect, LIST, addItem, addTodo, paste, tab } = require('../fixtures');

const COLS = ['items', 'catalog', 'cats', 'todos', 'dishes', 'meta'];
const sortById = (list) => [...list].sort((x, y) => (x.id < y.id ? -1 : 1));
const sectionsEqual = (x, y) =>
  JSON.stringify(Object.fromEntries(Object.entries(x).map(([k, v]) => [k, sortById(v)]))) ===
  JSON.stringify(Object.fromEntries(Object.entries(y).map(([k, v]) => [k, sortById(v)])));

async function exportFile(page) {
  await page.tap('#menu');
  const [download] = await Promise.all([page.waitForEvent('download'), page.tap('#expBtn')]);
  const file = await download.path();
  await page.evaluate(() => document.querySelector('#dlg').close());
  return { name: download.suggestedFilename(), text: fs.readFileSync(file, 'utf8') };
}
async function importFile(page, content, name = 'backup.json') {
  await page.evaluate(() => {
    if (!document.querySelector('#dlg').open) document.querySelector('#menu').click();
    document.querySelector('#impFile').value = '';
  });
  await page.setInputFiles('#impFile', {
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)),
  });
  await page.waitForTimeout(200);
}

/** a list with a bit of everything, plus a private list on this phone */
async function seed(page) {
  for (const t of ['2 mælk', '500 g mel', 'Saffran']) await addItem(page, t);
  await tab(page, 'todos');
  await paste(page, '#tdNew', 'Kitchen\n- Fix drawer\n- Paint wall');
  page.answers.push('House');
  await page.tap('#tdTitle');
  await page.tap('#tlChips .chip.add');
  await page.fill('#tlName', 'Bike fleet');
  await page.tap('#tlSave');
  await addTodo(page, 'Bleed brakes');
  await tab(page, 'recipes');
  await page.tap('#packBtn2');
  await page.waitForTimeout(300);
  return page.evaluate(() => JSON.parse(localStorage.getItem('cart-log.me')));
}

test('export: one dated JSON file with every section and no list codes', async ({ phone, cloud }) => {
  const a = await phone();
  const me = await seed(a);
  const { name, text } = await exportFile(a);
  expect(name).toMatch(/^home-log-\d{4}-\d{2}-\d{2}\.json$/);
  expect(text).not.toContain(LIST);
  expect(text).not.toContain(me);
  const x = JSON.parse(text);
  expect(x).toMatchObject({ format: 'home-log-export', version: 1, appVersion: expect.stringMatching(/^v\d+\.\d+$/) });
  expect(Object.keys(x.shared)).toEqual(COLS);
  expect(Object.keys(x.private)).toEqual(['todos', 'meta']);
  for (const c of COLS) expect(x.shared[c].length, c).toBe(cloud.list(`lists/${LIST}/${c}`).length);
  expect(x.private.todos.map((t) => t.text)).toEqual(['Bleed brakes']);
});

test('export → replace → export gives the same data, and the other phone follows', async ({ phone, cloud }) => {
  const a = await phone();
  const b = await phone({ device: 'iPhone 13' });
  await seed(a);
  const first = JSON.parse((await exportFile(a)).text);

  // change things, then restore
  await tab(a, 'todos');
  await a.tap('#tlChips .chip >> text=Home');
  await addTodo(a, 'Extra to-do that should vanish');
  await tab(a, 'recipes');
  a.answers.push(true);
  await a.tap('#dsList .ds .x >> nth=0');
  await importFile(a, first);
  await expect(a.locator('#ioDlg')).toBeVisible();
  await a.tap('#ioDlg [data-im="replace"]');
  await expect(a.locator('#ioGo')).toHaveText('Replace…');
  a.answers.push(false); // cancel at the second confirmation: nothing changes
  await a.tap('#ioGo');
  expect(a.dialogs.pop()).toContain('Replace everything in this shared list with the file?');
  expect(cloud.list(`lists/${LIST}/todos`).some((t) => t.text.startsWith('Extra'))).toBe(true);
  a.answers.push(true);
  await a.tap('#ioGo');
  await expect.poll(() => cloud.list(`lists/${LIST}/todos`).some((t) => t.text.startsWith('Extra'))).toBe(false);
  for (const c of COLS) expect(cloud.list(`lists/${LIST}/${c}`).length, c).toBe(first.shared[c].length);
  await expect
    .poll(() => b.evaluate(() => JSON.parse(localStorage.getItem('cart-log.dishes')).length))
    .toBe(first.shared.dishes.length);

  const second = JSON.parse((await exportFile(a)).text);
  expect(sectionsEqual(first.shared, second.shared)).toBe(true);
  expect(sectionsEqual(first.private, second.private)).toBe(true);
});

test('merge adds only what is missing, keeps local changes, and private data goes only under the private code', async ({
  phone,
  cloud,
}) => {
  const a = await phone();
  await seed(a);
  const file = JSON.parse((await exportFile(a)).text);

  // another household, with its own item and its own private code
  const c = await phone({ list: 'OTHER222', storage: { 'cart-log.me': 'PRIVOTH2' } });
  await addItem(c, 'æg');
  await importFile(c, file);
  await expect(c.locator('#ioDlg [data-im="merge"]')).toHaveClass(/sel/);
  await expect(c.locator('#ioCounts')).toContainText(
    `Recipes${file.shared.dishes.length} (${file.shared.dishes.length} new)`,
  );
  await c.tap('#ioGo');
  await expect.poll(() => cloud.list('lists/OTHER222/items').length).toBe(1 + file.shared.items.length);
  expect(cloud.list('lists/OTHER222/dishes')).toHaveLength(file.shared.dishes.length);
  expect(cloud.list('lists/PRIVOTH2/todos').map((t) => t.text)).toEqual(['Bleed brakes']);
  const privListIds = file.private.meta.map((m) => m.id);
  expect(cloud.list('lists/OTHER222/todos').filter((t) => privListIds.includes(t.list))).toEqual([]);

  // a local change survives a second merge
  await tab(c, 'recipes');
  await c.tap('#dsList .tdt >> text=Quiche');
  await c.fill('#dsName', 'Quiche lorraine');
  await c.tap('#dsSave');
  await importFile(c, file);
  await expect(c.locator('#ioCounts')).toContainText('Recipes35 (0 new)');
  await c.tap('#ioGo');
  await expect.poll(() => cloud.list('lists/OTHER222/dishes').map((d) => d.name)).toContain('Quiche lorraine');
  expect(cloud.list('lists/OTHER222/dishes').map((d) => d.name)).not.toContain('Quiche');
});

test('a phone without a private code skips the private section', async ({ phone, cloud }) => {
  const a = await phone();
  await seed(a);
  const file = JSON.parse((await exportFile(a)).text);
  const d = await phone({ list: 'NOPRIV22' });
  await importFile(d, file);
  await expect(d.locator('#ioCounts')).toContainText('no private code yet');
  await d.tap('#ioGo');
  await expect.poll(() => cloud.list('lists/NOPRIV22/dishes').length).toBe(35);
  expect(await d.evaluate(() => localStorage.getItem('cart-log.me'))).toBeNull();
});

test('bad files are rejected with a reason and nothing is written', async ({ phone, cloud }) => {
  const a = await phone();
  await seed(a);
  const x = JSON.parse((await exportFile(a)).text);
  const with_ = (sec, col, list) => ({ ...x, [sec]: { ...x[sec], [col]: list } });
  const before = JSON.stringify(cloud.docs);
  const cases = [
    ['{oops', "the file isn't valid JSON"],
    [{ format: 'x', version: 1 }, "isn't a Home log export"],
    [{ ...x, version: 2 }, 'Unsupported export version 2'],
    [{ ...x, extra: 1 }, 'unknown top-level field "extra"'],
    [with_('shared', 'items', [{ ...x.shared.items[0], evil: 1 }]), 'shared.items[0]: unknown field "evil"'],
    [with_('shared', 'items', [{ ...x.shared.items[0], unit: 'barrel' }]), 'shared.items[0].unit: must be one of'],
    [with_('shared', 'todos', [x.shared.todos[0], x.shared.todos[0]]), 'appears twice'],
    [with_('shared', 'dishes', [{ id: 'a/b', name: 'x' }]), 'shared.dishes[0].id: must be a valid id'],
    [
      with_('shared', 'dishes', [
        { ...x.shared.dishes[0], ingredients: [{ cid: 'mel', da: 'Mel', amt: -1, unit: 'kg' }] },
      ]),
      'ingredients[0].amt: must be a positive amount',
    ],
    [with_('private', 'meta', [{ id: 'dishes', title: 'x' }]), 'private.meta[0]: unknown kind of entry'],
    [
      with_('shared', 'cats', [{ id: 'c', da: 'x', color: 'red;background:url(x)' }]),
      'shared.cats[0].color: must be a colour',
    ],
    [with_('shared', 'todos', [{ id: 't1', done: false }]), 'shared.todos[0].text: missing'],
  ];
  for (const [file, reason] of cases) {
    await importFile(a, file);
    expect(a.dialogs.pop(), reason).toContain(reason);
    await expect(a.locator('#ioDlg')).toBeHidden();
  }
  expect(JSON.stringify(cloud.docs)).toBe(before);
});

test('an old export with missing sections and fields still imports; imported text shows as text', async ({
  phone,
  cloud,
}) => {
  const a = await phone({ list: 'OLDFILE2' });
  await importFile(a, {
    format: 'home-log-export',
    version: 1,
    shared: {
      items: [{ id: 'old1', da: 'Mælk', qty: '2 l' }],
      catalog: [{ id: 'gammel', name: 'Gammel vare' }],
      todos: [{ id: 'o1', text: 'Old to-do' }],
      dishes: [{ id: 'x1', name: '<img src=x onerror=alert(1)>' }],
    },
  });
  await expect(a.locator('#ioDlg')).toBeVisible();
  await a.tap('#ioGo');
  await expect.poll(() => cloud.list('lists/OLDFILE2/items')).toEqual([{ id: 'old1', da: 'Mælk', qty: '2 l' }]);
  await expect(a.locator('#todo .qv b')).toHaveText('2');
  await tab(a, 'recipes');
  await expect(a.locator('#dsList img')).toHaveCount(0);
  await expect(a.locator('#dsList')).toContainText('<img src=x onerror=alert(1)>');
});
