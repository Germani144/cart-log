# Working on Home log (repo: cart-log)

Rules for any Claude chat working on this repo.

## Scope
- One chat per app: a chat working on Home log touches only `germani144-home/cart-log`. Don't read or push other repos (nap-log, lift-log); tell Pedro to use that app's chat instead.
- Always fetch and reset to the latest `origin/main` before editing. Another chat may have pushed since you last looked.

## Every change
- Update `README.md` in the same commit whenever a change adds, removes or changes a feature, a setting, the data layout, the Firestore rule, the files, or the setup steps.
- Bump the version on every release that changes app files, in both places with the same number: the `v1.0`-style label next to "Home log" in `index.html`, and the cache name `cart-log-X.Y` in `sw.js`. Small fix or tweak: +0.1. Big feature or redesign: next whole number. Tell Pedro the new version number when you push.
- Test before pushing. UI changes: run the app in mobile-emulated Chromium (touch events) and check the affected flows, including both tabs, swipe, and to-do drag. Logic changes: test against a fake Firestore.
- No build step: the app is plain static files served by GitHub Pages from `main`.

## Don'ts
- Keep personal details (Firebase project sharing, names) out of public files like the README.
- Firestore data lives under `lists/{code}/{items|catalog|cats|todos|dishes|meta}`; don't move it without a migration, or existing lists disappear.
- Private to-do lists live under each phone's own private code (`localStorage` `cart-log.me`): `lists/{me}/{todos|meta}`. Never write private data under the shared list code, and never show the private code anywhere but the ⋯ menu. Home's to-dos have no `list` field; keep it that way so older data still shows.

## Security rules
- `index.html` has a Content-Security-Policy. Keep it: if a feature needs another address, add exactly that address to the right directive (`connect-src` for data, `script-src` for scripts) and say so in the README. Never add `*` or broad wildcards.
- Anything that came from Firestore, the catalog or the user goes through `esc()` before it is put into HTML (text and attributes, ids included). Prefer `textContent` where possible.
- No secrets in this public repo, and no personal data (lists, exports) committed. Export files (`home-log-*.json`) are in `.gitignore`; never commit one.
- Export/import (`EXP_VERSION`, `SPEC`, `metaSpec` in `index.html`): when a document gets a new field, add it to the spec too, or exports drop it and imports reject it. If the file format changes incompatibly, bump `EXP_VERSION` and keep reading the old version.

## Address and storage rules

Home log lives at https://germani144-home.github.io/cart-log/ (repo `germani144-home/cart-log`, moved from `Germani144/cart-log` on 2026-10-20).

**One installable app per address.** Chrome on Android lets only one app per address (origin) be installed: a second app on the same address shows "This app is already installed" and can't be installed (found 2026-10-20). So every app Pedro installs needs its own address. Nap Log is the installed app on `germani144.github.io`; Lift Log moved to `germani144-lift.github.io` and Home log to `germani144-home.github.io` (each its own free GitHub organization). Changes that apply to every app at once are made from Pedro's orchestration chat; they never touch UI or calculations. Never move Home log back onto an address another installable app uses. The rules below still apply, so Home log stays clean if it ever shares an address again.

- **Service worker:** Cache names start with `cart-log-` (the cache is `cart-log-X.Y`, same number as the version label). The pinned Firebase SDK on gstatic.com is the one outside file it also handles, because offline sync needs it. On activate, delete only caches with that prefix (never "every cache but the current one"). Read from this app's own cache (`caches.open(C).then(c => c.match(...))`), never the global `caches.match()`. Only handle requests whose URL starts with `self.registration.scope`; leave other apps, the GitHub API and other origins alone.
- **Updates:** fetch network-first with `{cache: 'no-cache'}`, store only `r.ok` responses, fall back to this app's own cache when offline. Register the worker with `{scope: './', updateViaCache: 'none'}`.
- **Storage:** every `localStorage` key starts with `cart-log.` (use the `load`/`save` helpers).
- **Manifest:** `scope` and `start_url` are `./`. **Never change the manifest `id`**, not even to fix an install problem, unless Pedro explicitly asks for it in that chat. The id is how Android recognises the installed app: changing it orphans the installed copy. If installing fails on the phone, investigate and report; don't change the id.
- Keep Firebase initialised as the named app `cart-log` (never the default app): Nap Log uses the same Firebase project, and the app name keeps Firestore's offline database and `firestore_…` keys separate if the apps ever share an address again.
- The manifest `id` is `cart-log-v1`.
- On iPhone/iPad the manifest is deliberately not linked (script in `<head>`), and in the browser the address keeps `?list=CODE`: that's how the home-screen app, whose storage is separate from Safari's, starts already in the list. Don't strip the code from the URL or link the manifest on iOS.

## Notes
- The app reloads itself once when a new service worker takes over, so updates show on the next open. Re-installing is only needed for icon or name changes on the home screen.
