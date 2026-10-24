// Recipes tab: saved dishes, the recipe dialog, adding a dish to the grocery list, the starter pack.
const { test, expect, LIST, addItem, groceryNames, dishNames, tab } = require('../fixtures');

const dishes = (cloud) => cloud.list(`lists/${LIST}/dishes`);
const items = (cloud) => cloud.list(`lists/${LIST}/items`);
const ingRows = (page) =>
  page.$$eval('#ingList .ing', (rows) =>
    rows.map((r) => `${r.querySelector('.da').textContent} ${r.querySelector('input').value} ${r.querySelector('.un')?.textContent ?? r.querySelector('select').value}`),
  );

async function addDish(page, name) {
  await page.fill('#dsNew', name);
  await page.press('#dsNew', 'Enter');
}
async function addIngredient(page, text) {
  await page.fill('#ingNew', text);
  await page.press('#ingNew', 'Enter');
}

test('dishes: add in alphabetical order, duplicates refused, rename and delete', async ({ phone, cloud }) => {
  const a = await phone();
  const b = await phone({ device: 'iPhone 13' });
  await tab(a, 'recipes');
  await tab(b, 'recipes');
  for (const d of ['Lasagne', '  Chili   sin carne ', 'æblekage', 'Boller i karry']) await addDish(a, d);
  await addDish(a, 'lasagne');
  await expect(a.locator('#dsHint')).toHaveText('"Lasagne" is already saved.');
  await expect.poll(() => dishNames(b)).toEqual(['Boller i karry', 'Chili sin carne', 'Lasagne', 'æblekage']);
  expect(dishes(cloud).find((d) => d.name === 'Lasagne')).toMatchObject({ serves: 2, ingredients: [] });
  await expect(a.locator('#dsList .dsub').first()).toHaveText('no recipe yet');

  await b.tap('#dsList .tdt >> text=Lasagne');
  await expect(b.locator('#dsDlg')).toBeVisible();
  await expect(b.locator('#dsDlg .dt')).toBeFocused(); // dialog opens without the keyboard
  await b.fill('#dsName', 'Lasagne al forno');
  await b.tap('#dsSave');
  await expect.poll(() => dishNames(a)).toEqual(['Boller i karry', 'Chili sin carne', 'Lasagne al forno', 'æblekage']);

  a.answers.push(true);
  await a.tap('#dsList .ds:has-text("Boller") .x');
  await expect.poll(() => dishNames(b)).toEqual(['Chili sin carne', 'Lasagne al forno', 'æblekage']);
  await b.tap('#dsList .tdt >> text=æblekage');
  b.answers.push(true);
  await b.tap('#dsDel');
  await expect.poll(() => dishes(cloud).map((d) => d.name).sort()).toEqual(['Chili sin carne', 'Lasagne al forno']);
});

test('the dish-list title is shared and editable; empty brings back the default', async ({ phone, cloud }) => {
  const a = await phone();
  const b = await phone({ device: 'iPhone 13' });
  await tab(a, 'recipes');
  await tab(b, 'recipes');
  await expect(a.locator('#dsTitle')).toHaveText("Badger's best dishes");
  a.answers.push('  Our   favourites ');
  await a.tap('#dsTitle');
  await expect(b.locator('#dsTitle')).toHaveText('Our favourites');
  expect(cloud.docs[`lists/${LIST}/meta/dishes`]).toEqual({ id: 'dishes', title: 'Our favourites' });
  b.answers.push('');
  await b.tap('#dsTitle');
  await expect(a.locator('#dsTitle')).toHaveText("Badger's best dishes");
});

test('recipe: ingredients from the item database with their unit fixed; new ingredients pick a unit once', async ({ phone, cloud }) => {
  const a = await phone();
  const b = await phone({ device: 'iPhone 13' });
  await tab(a, 'recipes');
  await addDish(a, 'Lasagne');
  await a.tap('#dsList .tdt');
  await a.fill('#ingNew', 'loeg');
  await expect(a.locator('#ingSug .sg').first()).toContainText('Løg');
  await a.tap('#ingSug .sg >> nth=0');
  await expect(a.locator('#ingList [data-ia="0"]')).toBeFocused();
  await a.keyboard.press('Control+A');
  await a.keyboard.type('0,2');
  await addIngredient(a, '500 g mel'); // flour is kept in kg: 500 g becomes 0,5 kg
  await addIngredient(a, '1 l mælk');
  await addIngredient(a, 'Hjemmelavet pesto'); // not in the database
  await expect(a.locator('#ingList select')).toHaveCount(1);
  await a.selectOption('#ingList select', 'pack');
  await a.fill('#ingList [data-ia="3"]', '1,5');
  await a.tap('#srvP');
  await expect(a.locator('#srvN')).toHaveText('3');
  expect(await ingRows(a)).toEqual(['Løg 0,2 kg', 'Mel 0,5 kg', 'Mælk 1 l', 'Hjemmelavet pesto 1,5 pack']);
  await a.tap('#dsSave');
  await expect(a.locator('#dsList .dsub')).toHaveText('4 ingredients · for 3');
  expect(dishes(cloud)[0]).toMatchObject({
    name: 'Lasagne',
    serves: 3,
    ingredients: [
      { cid: 'løg', da: 'Løg', en: 'Onions', amt: 0.2, unit: 'kg' },
      { cid: 'mel', da: 'Mel', en: 'Flour', amt: 0.5, unit: 'kg' },
      { cid: 'mælk', da: 'Mælk', en: 'Milk', amt: 1, unit: 'l' },
      { cid: 'hjemmelavet_pesto', da: 'Hjemmelavet pesto', en: '', amt: 1.5, unit: 'pack' },
    ],
  });
  expect(cloud.docs[`lists/${LIST}/catalog/hjemmelavet_pesto`]).toMatchObject({ cat: 'andet', unit: 'pack', n: 0 });

  // the other phone sees the recipe; the new ingredient is now a known item (no unit picker)
  await tab(b, 'recipes');
  await b.tap('#dsList .tdt');
  expect(await ingRows(b)).toEqual(['Løg 0,2 kg', 'Mel 0,5 kg', 'Mælk 1 l', 'Hjemmelavet pesto 1,5 pack']);
  await expect(b.locator('#ingList select')).toHaveCount(0);
  // Cancel throws away edits
  await b.tap('#ingList .x >> nth=0');
  await b.tap('#dsCancel');
  await expect(b.locator('#dsList .dsub')).toHaveText('4 ingredients · for 3');
});

test('add a dish to the grocery list for N people: scaled, countable units round up, existing items topped up', async ({ phone, cloud }) => {
  const a = await phone();
  await addItem(a, 'mælk'); // 1 l already on the list
  await tab(a, 'recipes');
  await addDish(a, 'Pandekager');
  await a.tap('#dsList .tdt');
  for (const t of ['1 l mælk', '3 æg', '200 g mel']) await a.fill('#ingNew', t), await a.press('#ingNew', 'Enter');
  await a.tap('#dsToList');
  await expect(a.locator('#ppDlg')).toBeVisible();
  await expect(a.locator('#ppTitle')).toBeFocused();
  await expect(a.locator('#ppN')).toHaveValue('2');
  await a.tap('#ppP');
  await expect(a.locator('#ppPrev')).toHaveText('1,5 l Mælk5 pcs Æg0,3 kg Mel'); // 3 people: 4,5 eggs round up to 5
  await a.tap('#ppGo');
  await expect(a.locator('#dsHint')).toHaveText('Pandekager for 3: 2 added, 1 topped up.');
  await expect.poll(() => items(cloud).map((i) => `${i.da} ${i.amt} ${i.unit}`).sort()).toEqual(['Mel 0.3 kg', 'Mælk 2.5 l', 'Æg 5 pcs']);
  await tab(a, 'groceries');
  expect(await groceryNames(a)).toEqual(expect.arrayContaining(['Mel', 'Mælk', 'Æg']));
});

test('starter dishes: the button shows the count, adds them all once, then hides', async ({ phone, cloud }) => {
  const a = await phone();
  await tab(a, 'recipes');
  await addDish(a, 'Quiche'); // already here: skipped
  await expect(a.locator('#packBtn2')).toHaveText('＋ Add 34 starter dishes with recipes');
  await a.tap('#packBtn2');
  expect(a.dialogs.pop()).toBe('Add 34 dishes with recipes (for 2) to this list? Dishes you already have are kept as they are.');
  await expect.poll(() => dishes(cloud).length).toBe(35);
  await expect(a.locator('#packBtn2')).toBeHidden();
  expect(cloud.docs[`lists/${LIST}/catalog/halloumi`]).toMatchObject({ da: 'Halloumi', cat: 'mejeri', unit: 'pack', n: 0 });
  const chili = dishes(cloud).find((d) => d.name === 'Chili con carne');
  expect(chili.ingredients[0]).toEqual({ cid: 'hakket_oksekød', da: 'Hakket oksekød', en: 'Ground beef', amt: 400, unit: 'g' });
  await a.tap('#menu');
  await a.tap('#packBtn');
  expect(a.dialogs.pop()).toBe('All starter dishes are already in this list.');
});

test('a brand-new list starts with Rachel’s trifle; joining a list adds nothing', async ({ phone, cloud }) => {
  const a = await phone({ list: null });
  await expect(a.locator('#setup')).toBeVisible();
  await a.tap('#create');
  const code = await a.evaluate(() => JSON.parse(localStorage.getItem('cart-log.code')));
  expect(code).toMatch(/^[A-Z2-9]{8}$/);
  await tab(a, 'recipes');
  await expect.poll(() => dishNames(a)).toEqual(["Rachel's trifle"]);
  await a.tap('#dsList .tdt');
  await expect(a.locator('#srvN')).toHaveText('8');
  expect(await ingRows(a)).toEqual([
    'Ladyfingers 1 pack', 'Marmelade 1 pack', 'Vaniljecreme 2 pack', 'Hindbær 250 g', 'Hakket oksekød 500 g',
    'Frosne ærter 1 pack', 'Løg 0,2 kg', 'Bananer 1 bunch', 'Piskefløde 5 dl',
  ]);
  const j = await phone({ list: 'JOINED22' });
  await tab(j, 'recipes');
  await j.waitForTimeout(300);
  expect(await dishNames(j)).toEqual([]);
  expect(cloud.keys('lists/JOINED22/')).toEqual([]);
});
