// Home log service worker. All apps on germani144.github.io share one CacheStorage,
// so this worker only ever touches caches named PREFIX* and only handles its own URLs.
const PREFIX='cart-log-';
const CACHE=PREFIX+'3.3'; // keep in step with the version label in index.html
// caches this app used before the prefix existed; safe to remove, nothing else uses these names
const LEGACY=/^cart-(v\d+|\d+\.\d+)$/;
const SCOPE=self.registration.scope; // e.g. https://germani144.github.io/cart-log/
const SHELL=['./','index.html','firebase-config.js','seed.js','manifest.json','icon-192.png'];
// the pinned Firebase SDK lives on another origin but is needed for offline sync, so it is cached too
const SDK=/^https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\//;

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(p=>new Request(p,{cache:'no-cache'})))));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(k=>Promise.all(k.filter(n=>n!==CACHE&&(n.startsWith(PREFIX)||LEGACY.test(n))).map(n=>caches.delete(n))))
    .then(()=>self.clients.claim()));
});
// network first (bypassing the HTTP cache so a new deploy shows on the next open), own cache when offline
self.addEventListener('fetch',e=>{
  const url=e.request.url;
  if(e.request.method!=='GET'||!(url.startsWith(SCOPE)||SDK.test(url)))return;
  e.respondWith(
    fetch(e.request,{cache:'no-cache'})
      .then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r})
      .catch(()=>caches.open(CACHE).then(c=>c.match(e.request,{ignoreSearch:true})))
  );
});
