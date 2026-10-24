// Dev-only stand-in for the Firebase compat SDK (firebase-app-compat.js), loaded by the tests instead of the
// real one. It keeps documents in memory and behaves like Firestore where the app cares:
// - a write shows up in this phone's listeners at once (with hasPendingWrites), like Firestore's local cache;
// - the test runner ("cloud") receives every write through window.__fakeSync and pushes it to every phone.
(function () {
  const docs = Object.assign({}, window.__fakeInit || {});
  const subs = [];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const childrenOf = (path) => {
    const p = path + '/';
    return Object.keys(docs)
      .filter((k) => k.startsWith(p) && !k.slice(p.length).includes('/'))
      .sort()
      .map((k) => ({ id: k.slice(p.length), data: () => clone(docs[k]) }));
  };
  const notify = (docPath, pending) =>
    subs.forEach((s) => {
      if (docPath.startsWith(s.path + '/') && !docPath.slice(s.path.length + 1).includes('/'))
        s.cb({ metadata: { hasPendingWrites: pending }, docs: childrenOf(s.path) });
    });
  window.__fakeDocs = docs;
  window.__fakeApply = (docPath, value) => {
    if (value === null) delete docs[docPath];
    else docs[docPath] = value;
    notify(docPath, false);
  };
  const sync = (docPath, value) => (window.__fakeSync ? window.__fakeSync(docPath, value) : Promise.resolve());
  function collectionRef(path) {
    return {
      doc: (id) => docRef(path + '/' + id),
      onSnapshot(opts, cb) {
        const s = { path, cb };
        subs.push(s);
        setTimeout(() => cb({ metadata: { hasPendingWrites: false }, docs: childrenOf(path) }), 0);
        return () => {
          const i = subs.indexOf(s);
          if (i >= 0) subs.splice(i, 1);
        };
      },
    };
  }
  function docRef(path) {
    return {
      collection: (n) => collectionRef(path + '/' + n),
      set(data) {
        docs[path] = clone(data);
        notify(path, true);
        return Promise.resolve(sync(path, clone(data)));
      },
      delete() {
        delete docs[path];
        notify(path, true);
        return Promise.resolve(sync(path, null));
      },
    };
  }
  const db = { enablePersistence: () => Promise.resolve(), collection: (n) => collectionRef(n) };
  window.firebase = {
    apps: [],
    initializeApp(options, name) {
      const app = { name, options, firestore: () => db };
      window.firebase.apps.push(app);
      return app;
    },
  };
})();
