# Working on Home log (repo: cart-log)

Rules for any Claude chat working on this repo.

## Scope
- One chat per app: a chat working on Home log touches only `Germani144/cart-log`. Don't read or push other repos (nap-log, lift-log); tell Pedro to use that app's chat instead.
- Always fetch and reset to the latest `origin/main` before editing. Another chat may have pushed since you last looked.

## Every change
- Update `README.md` in the same commit whenever a change adds, removes or changes a feature, a setting, the data layout, the Firestore rule, the files, or the setup steps.
- Bump the version on every release that changes app files, in both places with the same number: the `v1.0`-style label next to "Home log" in `index.html`, and the cache name `cart-log-X.Y` in `sw.js`. Small fix or tweak: +0.1. Big feature or redesign: next whole number. Tell Pedro the new version number when you push.
- Test before pushing. UI changes: run the app in mobile-emulated Chromium (touch events) and check the affected flows, including both tabs, swipe, and to-do drag. Logic changes: test against a fake Firestore.
- No build step: the app is plain static files served by GitHub Pages from `main`.

## Don'ts
- Keep personal details (Firebase project sharing, names) out of public files like the README.
- Firestore data lives under `lists/{code}/{items|catalog|cats|todos}`; don't move it without a migration, or existing lists disappear.

## Shared origin (all of Pedro's apps live on germani144.github.io)

Every app is served from the same origin, so they share one CacheStorage, one localStorage and one IndexedDB namespace. Keep these rules. Changes that apply to every app at once (caching and the like) are made from Pedro's orchestration chat; they never touch UI or calculations.

- **Service worker:** Cache names start with `cart-log-` (the cache is `cart-log-X.Y`, same number as the version label). The pinned Firebase SDK on gstatic.com is the one outside file it also handles, because offline sync needs it. On activate, delete only caches with that prefix (never "every cache but the current one"). Read from this app's own cache (`caches.open(C).then(c => c.match(...))`), never the global `caches.match()`. Only handle requests whose URL starts with `self.registration.scope`; leave other apps, the GitHub API and other origins alone.
- **Updates:** fetch network-first with `{cache: 'no-cache'}`, store only `r.ok` responses, fall back to this app's own cache when offline. Register the worker with `{scope: './', updateViaCache: 'none'}`.
- **Storage:** every `localStorage` key starts with `cart-log.` (use the `load`/`save` helpers).
- **Manifest:** `scope` and `start_url` are `./`. **Never change the manifest `id`**, not even to fix an install problem, unless Pedro explicitly asks for it in that chat. The id is how Android recognises the installed app: changing it orphans the installed copy, and Chrome can get stuck saying "already installed" / "Could not open app" with no way to install it again short of clearing Chrome's storage (this happened on 2026-10-20). If installing fails on the phone, investigate and report; don't change the id.
- Keep Firebase initialised as the named app `cart-log` (never the default app): other apps on the origin share the Firebase project, and the app name is what keeps Firestore's offline database and `firestore_…` keys separate.
- The manifest `id` is `cart-log-v1` (fixed; see the Manifest rule).

## Notes
- The app reloads itself once when a new service worker takes over, so updates show on the next open. Re-installing is only needed for icon or name changes on the home screen.
