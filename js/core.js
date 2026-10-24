// Shared helpers, localStorage, text search folding, the built-in item database and the app's state.
const $ = (s) => document.querySelector(s);
// localStorage is shared by every app on this origin, so keys are stored as "cart-log.<name>".
// Older builds used "cl_<name>"; those are moved over the first time they're read.
const LSK = (k) => 'cart-log.' + k.replace(/^cl_/, '');
const load = (k, d) => {
  try {
    let raw = localStorage.getItem(LSK(k));
    if (raw === null && (raw = localStorage.getItem(k)) !== null) {
      localStorage.setItem(LSK(k), raw);
      localStorage.removeItem(k);
    }
    const v = JSON.parse(raw);
    return v ?? d;
  } catch {
    return d;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(LSK(k), JSON.stringify(v));
  } catch {}
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const cleanCode = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const newCode = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  crypto.getRandomValues(new Uint8Array(8)).forEach((n) => (s += a[n % a.length]));
  return s;
};
const keyOf = (s) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[\/\s]+/g, '_');

// ---------- search folding: æ/ø/å and plain a/o/aa/oe/ae all find each other ----------
const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const forms = (s) => {
  const l = (s || '').toLowerCase();
  return [
    strip(l.replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')),
    strip(l.replace(/æ/g, 'a').replace(/ø/g, 'o').replace(/å/g, 'a')),
  ];
};
const hasAny = (hay, needles) => hay.some((h) => needles.some((n) => h.includes(n)));
const startsAny = (hay, needles) => hay.some((h) => needles.some((n) => h.startsWith(n)));
const eqAny = (a, b) => a.some((x) => b.includes(x));

// ---------- built-in database ----------
const seedCatMap = {},
  seedCatOrder = {},
  seedItems = {};
SEED_CATS.forEach(([id, da, en, color], i) => {
  seedCatMap[id] = { id, da, en, color };
  seedCatOrder[id] = i;
});
const UNITS = ['pcs', 'g', 'kg', 'ml', 'dl', 'l', 'pack', 'can', 'bottle', 'bunch'];
const UNIT_ALIAS = {
  x: 'pcs',
  stk: 'pcs',
  pcs: 'pcs',
  pk: 'pack',
  pak: 'pack',
  pakke: 'pack',
  pakker: 'pack',
  pack: 'pack',
  packs: 'pack',
  dåse: 'can',
  dåser: 'can',
  can: 'can',
  cans: 'can',
  fl: 'bottle',
  flaske: 'bottle',
  flasker: 'bottle',
  bottle: 'bottle',
  bottles: 'bottle',
  bdt: 'bunch',
  bundt: 'bunch',
  bunch: 'bunch',
  liter: 'l',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  dl: 'dl',
  l: 'l',
};
const unitOf = (s) => UNIT_ALIAS[(s || '').toLowerCase()] || null;
const parseAmt = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return n > 0 ? n : 1;
};
const fmt = (n) => String(Math.round(n * 100) / 100).replace('.', ',');
const defMap = {};
SEED_DEF.split(';').forEach((p) => {
  const [n, v] = p.split('=');
  defMap[n] = v;
});
const splitDef = (v) => {
  const [a, u] = (v || '1 pcs').split(' ');
  return { amt: parseAmt(a), unit: u || 'pcs' };
};
Object.entries(SEED_ITEMS).forEach(([cat, s]) =>
  s.split(';').forEach((p) => {
    const [da, en] = p.split('=');
    const id = keyOf(da);
    seedItems[id] = { id, da, en: en || '', cat, n: 0, at: 0, ...splitDef(defMap[da] || SEED_CATDEF[cat]) };
  }),
);

// ---------- state ----------
let listCode = load('cl_code', ''),
  items = load('cl_items', []),
  todos = load('cl_todos', []),
  me = load('cl_me', ''),
  ptodos = load('cl_ptodos', []),
  pmeta = load('cl_pmeta', {}),
  dishes = load('cl_dishes', []),
  meta = load('cl_meta', {}),
  shared = load('cl_shared', {}),
  customCats = load('cl_cats', {}),
  db = null,
  unsubs = [],
  online = navigator.onLine,
  pend = {},
  dlgState = null;
const hasCfg = () =>
  typeof firebase !== 'undefined' &&
  typeof FIREBASE_CONFIG !== 'undefined' &&
  FIREBASE_CONFIG &&
  FIREBASE_CONFIG.apiKey &&
  !/YOUR_/.test(FIREBASE_CONFIG.apiKey);
const colIn = (code, n) => db.collection('lists').doc(code).collection(n);
const col = (n) => colIn(listCode, n);

// the item database = built-in + whatever this list has added/used (shared entries win)
const entries = () => {
  const o = {};
  for (const k of new Set([...Object.keys(seedItems), ...Object.keys(shared)]))
    o[k] = { ...seedItems[k], ...shared[k] };
  return o;
};
const itemCid = (i) => i.cid || keyOf(i.da || i.text || '');
const itemDa = (i) => i.da || i.text || '';
const catInfo = (id) => customCats[id] || seedCatMap[id] || { id, da: id || 'Andet', en: id ? '' : 'Other' };
// category colors: banner = the color, item rows = the same color at low opacity; text on the banner flips white/dark by luminance
const DEFAULT_COLOR = '#5F6B7A',
  PALETTE = SEED_CATS.map((c) => c[3]);
const safeColor = (c) => (/^#[0-9a-fA-F]{6}$/.test(c || '') ? c : DEFAULT_COLOR);
const lum = (h) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const textOn = (h) => (lum(h) < 0.3 ? '#fff' : `color-mix(in srgb,${h} 22%,#000)`);
const catStyle = (id) => {
  const c = safeColor(catInfo(id).color);
  return `--c:${c};--t:${textOn(c)}`;
};
const hashColor = (t) => PALETTE[[...t].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
const allCats = () => [
  ...SEED_CATS.map((c) => seedCatMap[c[0]]),
  ...Object.values(customCats).sort((a, b) => a.da.localeCompare(b.da, 'da')),
];
const catRank = (id) => (id === 'andet' ? 9999 : id in seedCatOrder ? seedCatOrder[id] : id in customCats ? 500 : 700);
