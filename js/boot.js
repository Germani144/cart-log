// Startup: pick up a ?list= code, draw the app, connect, and register the service worker.
// ---------- boot ----------
// (older versions stored the shared database under cl_catalog with single-language names; ignore it)
const q = new URLSearchParams(location.search).get('list');
// a link opened in the browser always wins. The installed app's start address may carry the code it was
// installed with: use it only if this app has no list yet and wasn't just left (so switching or leaving sticks).
if (q && cleanCode(q) !== listCode && (!standalone() || (!listCode && cleanCode(q) !== load('cl_left', '')))) {
  listCode = cleanCode(q);
  save('cl_code', listCode);
  resetLocal();
}
keepCodeInUrl();
setTab(tab);
render();
connect();
if ('serviceWorker' in navigator) {
  // a new version takes over -> reload once so the open app is never stuck on old code (not while typing or dragging)
  const had = !!navigator.serviceWorker.controller;
  let rl = 0;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had || rl) return;
    rl = 1;
    const go = () => {
      if (drag || document.activeElement?.matches?.('input,textarea')) return setTimeout(go, 1500);
      location.reload();
    };
    go();
  });
  navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).catch(() => {});
}
