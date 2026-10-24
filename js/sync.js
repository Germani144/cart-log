// Firestore: connecting to the list (and this phone's private code) and writing documents.
// ---------- sync ----------
function connect() {
  unsubs.forEach((u) => u());
  unsubs = [];
  if (!listCode || !hasCfg()) {
    setSync();
    return;
  }
  if (!db) {
    // named app: other apps on this origin use the same Firebase project, and Firestore's offline
    // database and tab-sync keys are named after the app, so "cart-log" keeps ours separate
    const fb = firebase.apps.find((a) => a.name === 'cart-log') || firebase.initializeApp(FIREBASE_CONFIG, 'cart-log');
    try {
      fb.firestore()
        .enablePersistence({ synchronizeTabs: true })
        .catch(() => {});
    } catch {}
    db = fb.firestore();
  }
  const bad = (err) => {
    console.error(err);
    $('#sync').textContent = 'sync error';
    $('#dot').className = 'dot';
  };
  const watch = (name, apply, code = listCode) =>
    unsubs.push(
      colIn(code, name).onSnapshot(
        { includeMetadataChanges: true },
        (q) => {
          pend[(code === listCode ? '' : 'p_') + name] = q.metadata.hasPendingWrites;
          apply(q.docs.map((d) => d.data()));
          setSync();
          render();
        },
        bad,
      ),
    );
  watch('items', (l) => {
    items = l;
    save('cl_items', items);
  });
  watch('todos', (l) => {
    todos = l;
    save('cl_todos', todos);
  });
  watch('dishes', (l) => {
    dishes = l;
    save('cl_dishes', dishes);
  });
  watch('meta', (l) => {
    meta = {};
    l.forEach((v) => (meta[v.id] = v));
    save('cl_meta', meta);
  });
  watch('catalog', (l) => {
    shared = {};
    l.forEach((v) => {
      shared[v.id] = v.da ? v : { ...v, da: v.name || v.id, en: '' };
    });
    save('cl_shared', shared);
  });
  watch('cats', (l) => {
    customCats = {};
    l.forEach((v) => (customCats[v.id] = v));
    save('cl_cats', customCats);
  });
  // private to-do lists live under this phone's own code, which is never shared
  if (me && me !== listCode) {
    watch(
      'todos',
      (l) => {
        ptodos = l;
        save('cl_ptodos', ptodos);
      },
      me,
    );
    watch(
      'meta',
      (l) => {
        pmeta = {};
        l.forEach((v) => (pmeta[v.id] = v));
        save('cl_pmeta', pmeta);
      },
      me,
    );
  }
}
function setSync() {
  if (!hasCfg() || !listCode) {
    $('#sync').textContent = 'local only';
    $('#dot').className = 'dot';
    return;
  }
  const p = Object.values(pend).some(Boolean);
  $('#sync').textContent = !online ? 'offline' : p ? 'syncing…' : 'live';
  $('#dot').className = 'dot ' + (!online ? '' : p ? 'wait' : 'on');
}
addEventListener('online', () => {
  online = true;
  setSync();
});
addEventListener('offline', () => {
  online = false;
  setSync();
});

// ---------- data ops (optimistic locally; Firestore queues writes when offline) ----------
const put = (name, doc) => {
  if (db) col(name).doc(doc.id).set(doc).catch(console.error);
};
const del = (name, id) => {
  if (db) col(name).doc(id).delete().catch(console.error);
};
const putP = (name, doc) => {
  if (db && me) colIn(me, name).doc(doc.id).set(doc).catch(console.error);
};
const delP = (name, id) => {
  if (db && me) colIn(me, name).doc(id).delete().catch(console.error);
};
function putItem(it) {
  const i = items.findIndex((x) => x.id === it.id);
  if (i < 0) items.push(it);
  else items[i] = it;
  save('cl_items', items);
  render();
  put('items', it);
}
function removeItem(id) {
  items = items.filter((x) => x.id !== id);
  save('cl_items', items);
  render();
  del('items', id);
}
function upsertShared(e) {
  shared[e.id] = e;
  save('cl_shared', shared);
  put('catalog', e);
}
function delShared(id) {
  delete shared[id];
  save('cl_shared', shared);
  del('catalog', id);
}
function upsertCat(c) {
  customCats[c.id] = c;
  save('cl_cats', customCats);
  put('cats', c);
}
function delCat(id) {
  delete customCats[id];
  save('cl_cats', customCats);
  del('cats', id);
}

// standard amount+unit of a database entry, and the amount+unit of a list item (older items stored a text "qty")
const entryDef = (e) => ({ amt: typeof (e && e.amt) === 'number' ? e.amt : 1, unit: (e && e.unit) || 'pcs' });
function itemQty(it) {
  if (typeof it.amt === 'number') return { amt: it.amt, unit: it.unit || 'pcs' };
  const m = /^(\d+(?:[.,]\d+)?)\s*([^\d\s]*)$/.exec((it.qty || '').trim());
  const d = entryDef(entries()[itemCid(it)]);
  return m ? { amt: parseAmt(m[1]), unit: unitOf(m[2]) || d.unit } : d;
}
const withQty = (it, amt, unit) => {
  const { qty, ...r } = it;
  return { ...r, amt, unit };
};
const STEP = { pcs: 1, pack: 1, can: 1, bottle: 1, bunch: 1, g: 50, kg: 0.5, ml: 50, dl: 1, l: 0.5 };
function stepVal(a, u, dir) {
  let st = STEP[u] || 1;
  if ((u === 'g' || u === 'ml') && a >= 500) st = 100;
  const n = Math.round((a + dir * st) * 100) / 100;
  return n < (STEP[u] || 1) ? a : n;
}
function stepQty(it, dir) {
  const { amt, unit } = itemQty(it),
    n = stepVal(amt, unit, dir);
  if (n !== amt || typeof it.amt !== 'number') putItem(withQty(it, n, unit));
}
// put an item on the to-buy list. typed = {amt,unit?} from "2 l mælk"; setDef = remember this amount/unit as the item's standard
function addToList(e, typed, setDef) {
  const cid = keyOf(e.da);
  if (items.some((i) => !i.done && itemCid(i) === cid)) return;
  const def = entryDef(e);
  const amt = typed && typed.amt != null ? typed.amt : def.amt,
    unit = typed && typed.unit ? typed.unit : def.unit;
  const prev = shared[cid];
  upsertShared({
    id: cid,
    da: e.da,
    en: e.en || '',
    cat: e.cat,
    amt: setDef ? amt : def.amt,
    unit: setDef ? unit : def.unit,
    n: (prev ? prev.n : 0) + 1,
    at: Date.now(),
  });
  const inCart = items.find((i) => i.done && itemCid(i) === cid);
  const base = { cid, da: e.da, en: e.en || '', cat: e.cat, done: false, ts: Date.now() };
  putItem(withQty(inCart ? { ...inCart, ...base } : { id: uid(), ...base }, amt, unit));
}
