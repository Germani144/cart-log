// Runs in <head>, before the page is parsed: links the web-app manifest everywhere except iPhone/iPad.
// iPhone/iPad: no manifest. Then "Add to Home Screen" starts the app at the page's current address,
// which carries ?list=CODE, so the home-screen app joins the list by itself (its storage is separate from Safari's).
// Android and desktop keep the normal manifest (its id must never change).
(function () {
  var ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!ios) {
    var l = document.createElement('link');
    l.rel = 'manifest';
    l.href = 'manifest.json';
    document.head.appendChild(l);
  }
})();
