// Firestore: connecting to the list (and this phone's private code) and writing documents.
// ---------- sync ----------
function connect() {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  if (!listCode || !firebaseConfigured()) {
    showSyncStatus();
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
    unsubscribers.push(
      collectionFor(code, name).onSnapshot(
        { includeMetadataChanges: true },
        (q) => {
          pendingWrites[(code === listCode ? '' : 'p_') + name] = q.metadata.hasPendingWrites;
          apply(q.docs.map((d) => d.data()));
          showSyncStatus();
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
    listMeta = {};
    l.forEach((v) => (listMeta[v.id] = v));
    save('cl_meta', listMeta);
  });
  watch('catalog', (l) => {
    catalog = {};
    l.forEach((v) => {
      catalog[v.id] = v.da ? v : { ...v, da: v.name || v.id, en: '' };
    });
    save('cl_shared', catalog);
  });
  watch('cats', (l) => {
    customCategories = {};
    l.forEach((v) => (customCategories[v.id] = v));
    save('cl_cats', customCategories);
  });
  // private to-do lists live under this phone's own code, which is never shared
  if (privateCode && privateCode !== listCode) {
    watch(
      'todos',
      (l) => {
        privateTodos = l;
        save('cl_ptodos', privateTodos);
      },
      privateCode,
    );
    watch(
      'meta',
      (l) => {
        privateMeta = {};
        l.forEach((v) => (privateMeta[v.id] = v));
        save('cl_pmeta', privateMeta);
      },
      privateCode,
    );
  }
}
function showSyncStatus() {
  if (!firebaseConfigured() || !listCode) {
    $('#sync').textContent = 'local only';
    $('#dot').className = 'dot';
    return;
  }
  const p = Object.values(pendingWrites).some(Boolean);
  $('#sync').textContent = !isOnline ? 'offline' : p ? 'syncing…' : 'live';
  $('#dot').className = 'dot ' + (!isOnline ? '' : p ? 'wait' : 'on');
}
addEventListener('online', () => {
  isOnline = true;
  showSyncStatus();
});
addEventListener('offline', () => {
  isOnline = false;
  showSyncStatus();
});

// ---------- data ops (optimistic locally; Firestore queues writes when offline) ----------
const writeShared = (name, doc) => {
  if (db) listCollection(name).doc(doc.id).set(doc).catch(console.error);
};
const deleteShared = (name, id) => {
  if (db) listCollection(name).doc(id).delete().catch(console.error);
};
const writePrivate = (name, doc) => {
  if (db && privateCode) collectionFor(privateCode, name).doc(doc.id).set(doc).catch(console.error);
};
const deletePrivate = (name, id) => {
  if (db && privateCode) collectionFor(privateCode, name).doc(id).delete().catch(console.error);
};
function saveItem(it) {
  const i = items.findIndex((x) => x.id === it.id);
  if (i < 0) items.push(it);
  else items[i] = it;
  save('cl_items', items);
  render();
  writeShared('items', it);
}
function removeItem(id) {
  items = items.filter((x) => x.id !== id);
  save('cl_items', items);
  render();
  deleteShared('items', id);
}
function saveCatalogEntry(e) {
  catalog[e.id] = e;
  save('cl_shared', catalog);
  writeShared('catalog', e);
}
function deleteCatalogEntry(id) {
  delete catalog[id];
  save('cl_shared', catalog);
  deleteShared('catalog', id);
}
function saveCategory(c) {
  customCategories[c.id] = c;
  save('cl_cats', customCategories);
  writeShared('cats', c);
}
function deleteCategory(id) {
  delete customCategories[id];
  save('cl_cats', customCategories);
  deleteShared('cats', id);
}

// an item's amount and unit (older items stored a text "qty"; see itemAmount in logic.js)
const itemQuantity = (it) => itemAmount(it, () => standardAmount(itemDatabase()[itemId(it)]));
const withAmount = (it, amt, unit) => {
  const { qty, ...r } = it;
  return { ...r, amt, unit };
};
function stepItemAmount(it, dir) {
  const { amt, unit } = itemQuantity(it),
    n = stepAmount(amt, unit, dir);
  if (n !== amt || typeof it.amt !== 'number') saveItem(withAmount(it, n, unit));
}
// put an item on the to-buy list. typed = {amt,unit?} from "2 l mælk"; setDef = remember this amount/unit as the item's standard
function addToGroceryList(e, typed, setDef) {
  const cid = itemKey(e.da);
  if (items.some((i) => !i.done && itemId(i) === cid)) return;
  const def = standardAmount(e);
  const amt = typed && typed.amt != null ? typed.amt : def.amt,
    unit = typed && typed.unit ? typed.unit : def.unit;
  const prev = catalog[cid];
  saveCatalogEntry({
    id: cid,
    da: e.da,
    en: e.en || '',
    cat: e.cat,
    amt: setDef ? amt : def.amt,
    unit: setDef ? unit : def.unit,
    n: (prev ? prev.n : 0) + 1,
    at: Date.now(),
  });
  const inCart = items.find((i) => i.done && itemId(i) === cid);
  const base = { cid, da: e.da, en: e.en || '', cat: e.cat, done: false, ts: Date.now() };
  saveItem(withAmount(inCart ? { ...inCart, ...base } : { id: newId(), ...base }, amt, unit));
}
