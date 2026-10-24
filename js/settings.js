// Joining, sharing and leaving a list, the settings menu, private-code restore, updates and starter dishes.
// ---------- list setup / sharing ----------
const link = () => location.origin + location.pathname + '?list=' + listCode;
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
// in the browser, keep ?list=CODE in the address so adding to the home screen (iPhone) takes the list along
function keepCodeInUrl() {
  history.replaceState(null, '', location.pathname + (listCode && !standalone() ? '?list=' + listCode : ''));
}
function resetLocal() {
  items = [];
  todos = [];
  dishes = [];
  meta = {};
  save('cl_dishes', []);
  save('cl_meta', {});
  shared = {};
  customCats = {};
  save('cl_todos', []);
  save('cl_items', []);
  save('cl_shared', {});
  save('cl_cats', {});
}
function joinList(code) {
  code = cleanCode(code);
  if (code.length < 4) return alert('Enter the list code');
  listCode = code;
  save('cl_code', code);
  resetLocal();
  keepCodeInUrl();
  connect();
  render();
}
$('#create').onclick = () => {
  joinList(newCode());
  addDishes(WELCOME_ITEMS, WELCOME_DISHES);
};
$('#join').onclick = () => joinList($('#joinCode').value);
$('#joinCode').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinList(e.target.value);
});
function drawMe() {
  $('#meShow').hidden = !me;
  $('#meShow').textContent = me;
  $('#meInfo').textContent = me
    ? "Private lists are stored under this phone's own code. Keep it to get them back on a new phone (Restore there). Don't share it."
    : 'None yet. Make one in To-dos with ＋ New list → Private.';
}
$('#meBtn').onclick = () => {
  const v = cleanCode(prompt('Private code from your other phone', '') || '');
  if (!v) return;
  if (v.length < 6 || v === listCode) return alert("That doesn't look like a private code.");
  if (
    me &&
    me !== v &&
    !confirm('Switch to that private code? Private lists on this phone stay under the old code ' + me + '.')
  )
    return;
  me = v;
  save('cl_me', me);
  ptodos = [];
  pmeta = {};
  save('cl_ptodos', []);
  save('cl_pmeta', {});
  connect();
  drawMe();
  renderTodos();
};
// compare the version on the server (cache name in sw.js) with this copy; if newer, drop this app's caches and reload
$('#updBtn').onclick = async () => {
  const btn = $('#updBtn'),
    cur = $('#ver').textContent.replace(/^v/, '');
  btn.textContent = 'Checking…';
  btn.disabled = true;
  let latest = null;
  try {
    const t = await (await fetch('sw.js?check=' + Date.now(), { cache: 'no-store' })).text();
    latest = (/PREFIX\+'([\d.]+)'/.exec(t) || [])[1] || null;
  } catch {}
  btn.textContent = 'Check for updates';
  btn.disabled = false;
  if (!latest) return alert("Couldn't reach the server. Check the connection and try again.");
  if (latest === cur) return alert(`You're on the latest version (v${cur}).`);
  if (!confirm(`Version v${latest} is available (you have v${cur}). Update now?`)) return;
  btn.textContent = 'Updating…';
  btn.disabled = true;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.update();
  } catch {}
  try {
    for (const k of await caches.keys()) if (k.startsWith('cart-log-')) await caches.delete(k);
  } catch {}
  location.reload();
};
$('#menu').onclick = () => {
  $('#codeShow').textContent = listCode;
  drawMe();
  $('#shareBtn').hidden = !navigator.share;
  $('#dlg').showModal();
};
$('#closeBtn').onclick = () => $('#dlg').close();
$('#mgrBtn').onclick = () => {
  $('#dlg').close();
  drawMgr();
  $('#mgrDlg').showModal();
};
$('#mgrClose').onclick = () => $('#mgrDlg').close();
// starter dishes (dishes-pack.json): adds the dishes this list doesn't have yet (by name) and any missing items
// to the shared database. Safe to run again: nothing already saved is changed.
// add dishes ({name,serves,ingredients:[{da,en,amt,unit}]}) plus any missing items to the database; nothing saved is changed
function addDishes(newItems, list) {
  for (const it of newItems) {
    const cid = keyOf(it.da);
    if (!entries()[cid])
      upsertShared({
        id: cid,
        da: it.da,
        en: it.en,
        cat: it.cat,
        amt: it.amt,
        unit: it.unit,
        n: 0,
        at: Date.now(),
      });
  }
  list.forEach((d, i) =>
    putDish({
      id: uid(),
      name: d.name,
      serves: d.serves || 2,
      ts: Date.now() + i,
      ingredients: d.ingredients.map((g) => {
        const cid = keyOf(g.da),
          e = entries()[cid],
          u = e ? entryDef(e).unit : g.unit,
          c = conv(g.amt, g.unit, u);
        return {
          cid,
          da: e ? e.da : g.da,
          en: e ? e.en : g.en,
          amt: c != null ? Math.round(c * 1000) / 1000 : g.amt,
          unit: c != null ? u : g.unit,
        };
      }),
    }),
  );
}
// every brand-new list starts with one classic in its recipes (lists you join keep what they have)
const WELCOME_ITEMS = [
  { da: 'Ladyfingers', en: 'Ladyfingers', cat: 'kolonial', unit: 'pack', amt: 1 },
  { da: 'Vaniljecreme', en: 'Custard', cat: 'mejeri', unit: 'pack', amt: 1 },
];
const WELCOME_DISHES = [
  {
    name: "Rachel's trifle",
    serves: 8,
    ingredients: [
      { da: 'Ladyfingers', en: 'Ladyfingers', amt: 1, unit: 'pack' },
      { da: 'Marmelade', en: 'Jam', amt: 1, unit: 'pack' },
      { da: 'Vaniljecreme', en: 'Custard', amt: 2, unit: 'pack' },
      { da: 'Hindbær', en: 'Raspberries', amt: 250, unit: 'g' },
      { da: 'Hakket oksekød', en: 'Ground beef', amt: 500, unit: 'g' },
      { da: 'Frosne ærter', en: 'Frozen peas', amt: 1, unit: 'pack' },
      { da: 'Løg', en: 'Onions', amt: 0.2, unit: 'kg' },
      { da: 'Bananer', en: 'Bananas', amt: 1, unit: 'bunch' },
      { da: 'Piskefløde', en: 'Whipping cream', amt: 5, unit: 'dl' },
    ],
  },
];
var pack = null;
async function loadPack() {
  if (!pack)
    try {
      pack = await (await fetch('dishes-pack.json', { cache: 'no-cache' })).json();
    } catch {}
  return pack;
}
// in the Dishes tab: a button that says how many starter dishes this list doesn't have yet (hidden when none)
function packHint() {
  const b = $('#packBtn2');
  if (!pack || !listCode) {
    b.hidden = true;
    return;
  }
  const n = pack.dishes.filter((d) => !dishByName(d.name)).length;
  b.hidden = !n;
  b.textContent = `＋ Add ${n} starter dishes with recipes`;
}
loadPack().then(packHint);
$('#packBtn2').onclick = () => $('#packBtn').onclick();
$('#packBtn').onclick = async () => {
  if (!(await loadPack())) return alert("Couldn't load the starter dishes. Check the connection and try again.");
  const todo = pack.dishes.filter((d) => !dishByName(d.name));
  if (!todo.length) return alert('All starter dishes are already in this list.');
  if (
    !confirm(
      `Add ${todo.length} dishes with recipes (for 2) to this list? Dishes you already have are kept as they are.`,
    )
  )
    return;
  addDishes(pack.items, todo);
  $('#dlg').close();
  setTab('d', 1);
  $('#dsHint').textContent = `Added ${todo.length} dishes. Tap one to see its recipe.`;
  setTimeout(() => ($('#dsHint').textContent = ''), 6000);
};
