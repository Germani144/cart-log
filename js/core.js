// Page helpers, localStorage, the built-in item database (from seed.js) and the app's state.
const $ = (s) => document.querySelector(s);
// localStorage is shared by every app on this origin, so keys are stored as "cart-log.<name>".
// Older builds used "cl_<name>"; those are moved over the first time they're read.
const storageKey = (k) => 'cart-log.' + k.replace(/^cl_/, '');
const load = (k, d) => {
  try {
    let raw = localStorage.getItem(storageKey(k));
    if (raw === null && (raw = localStorage.getItem(k)) !== null) {
      localStorage.setItem(storageKey(k), raw);
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
    localStorage.setItem(storageKey(k), JSON.stringify(v));
  } catch {}
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const generateCode = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  crypto.getRandomValues(new Uint8Array(8)).forEach((n) => (s += a[n % a.length]));
  return s;
};

// ---------- built-in database (seed.js) ----------
const {
  categories: builtInCategories,
  categoryOrder: builtInCategoryOrder,
  items: builtInItems,
} = buildBuiltInDatabase(SEED_CATS, SEED_ITEMS, SEED_DEF, SEED_CATDEF);

// ---------- state ----------
let listCode = load('cl_code', ''),
  items = load('cl_items', []),
  todos = load('cl_todos', []),
  privateCode = load('cl_me', ''),
  privateTodos = load('cl_ptodos', []),
  privateMeta = load('cl_pmeta', {}),
  dishes = load('cl_dishes', []),
  listMeta = load('cl_meta', {}),
  catalog = load('cl_shared', {}),
  customCategories = load('cl_cats', {}),
  db = null,
  unsubscribers = [],
  isOnline = navigator.onLine,
  pendingWrites = {},
  itemDialog = null;
const firebaseConfigured = () =>
  typeof firebase !== 'undefined' &&
  typeof FIREBASE_CONFIG !== 'undefined' &&
  FIREBASE_CONFIG &&
  FIREBASE_CONFIG.apiKey &&
  !/YOUR_/.test(FIREBASE_CONFIG.apiKey);
const collectionFor = (code, n) => db.collection('lists').doc(code).collection(n);
const listCollection = (n) => collectionFor(listCode, n);

// the item database = built-in + whatever this list has added/used (shared entries win)
const itemDatabase = () => combineDatabase(builtInItems, catalog);
const itemId = (i) => i.cid || itemKey(i.da || i.text || '');
const itemName = (i) => i.da || i.text || '';
const categoryInfo = (id) =>
  customCategories[id] || builtInCategories[id] || { id, da: id || 'Andet', en: id ? '' : 'Other' };
// category colors: banner = the color, item rows = the same color at low opacity; text on the banner flips white/dark by luminance
const PALETTE = SEED_CATS.map((c) => c[3]);
const categoryStyle = (id) => {
  const c = safeColor(categoryInfo(id).color);
  return `--c:${c};--t:${textColorOn(c)}`;
};
const allCategories = () => [
  ...SEED_CATS.map((c) => builtInCategories[c[0]]),
  ...Object.values(customCategories).sort((a, b) => a.da.localeCompare(b.da, 'da')),
];
const categoryRank = (id) =>
  id === 'andet' ? 9999 : id in builtInCategoryOrder ? builtInCategoryOrder[id] : id in customCategories ? 500 : 700;
