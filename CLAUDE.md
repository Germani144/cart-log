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
- The origin (germani144.github.io) is shared with other apps: the service worker must only delete caches starting with `cart-log-`, only handle URLs under its own scope (plus the pinned Firebase SDK), and read from its own cache, never the global `caches.match()`. Every `localStorage` key must start with `cart-log.` (use the `load`/`save` helpers).
- Never change the manifest `id` (`cart-log-v1`): it would make installed copies a different app.
- Keep personal details (Firebase project sharing, names) out of public files like the README.
- Firestore data lives under `lists/{code}/{items|catalog|cats|todos}`; don't move it without a migration, or existing lists disappear.

## Notes
- The app reloads itself once when a new service worker takes over, so updates show on the next open. Re-installing is only needed for icon or name changes on the home screen.
