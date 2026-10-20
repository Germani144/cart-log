# Home log

A shared grocery list and to-do list for a household, synced live between phones.
Works on Android and iPhone as an installable web app, no accounts needed, and keeps working offline.

Live: https://germani144.github.io/cart-log/ (the repo kept its original name, `cart-log`)

## Features

**Groceries**
- Add items in Danish or English (`2 mælk`, `milk`, `æbler`). Search ignores æ/ø/å spelling differences.
- Built-in item database of ~280 items in 16 categories, each with a Danish and English name and a sensible default amount (milk 1 l, eggs 10 pcs, coffee 500 g).
- Unknown items go straight onto the list under Andet / Other, no questions asked. Tap one later to give it a category (existing or new), an English name and a standard amount; it's then saved to the shared database, so next time it lands in the right category.
- One-off buys: the edit screen of an item you added yourself has **Forget item** at the top, which removes it from the list and from the saved database so it stops being suggested. ("Remove from list" keeps it saved. Built-in items can't be forgotten.)
- List grouped by category, each with its own colour; new categories get a colour picker.
- Amount and unit per item (pcs, g, kg, ml, dl, l, pack, can, bottle, bunch) with one-tap − / + right on the row.
- Tick items into "In the cart", clear them all when you're done shopping.

**To-dos**
- A plain ordered list numbered i., ii., iii. … up to l. (50 open items).
- Hold and drag to reorder; tick to move an item to Done (struck through, faded).

**General**
- Swipe left or right to switch tabs, with live feedback while dragging.
- Share a list with its 8-character code or invite link (`?list=CODE`). Anyone with the code can see and edit it.
- Offline-first: changes made without signal sync when the phone is back online.
- Updates install themselves; the app reloads once when a new version is available.
- The version (e.g. v1.0) shows next to the title, so you can tell which build a phone is running.
- Follows the phone's light or dark mode.

## Versioning

Each release bumps the version in two places, kept identical: the label next to the title in `index.html` and the cache name in `sw.js` (`cart-log-X.Y`). Small fixes and tweaks raise the second number (1.0 → 1.1); bigger features or redesigns raise the first (1.4 → 2.0).

## How it's built

Plain static files, no build step, no framework.

| File | What it does |
|---|---|
| `index.html` | The whole app: markup, styles and logic |
| `seed.js` | Built-in bilingual item database and categories |
| `firebase-config.js` | Firebase web config for the project |
| `sw.js` | Service worker: caches the app for offline use (cache name `cart-log-X.Y` matches the app version) |
| `manifest.json` | Install name, icons and colours |
| `icon-*.png` | App icons |

Hosting is GitHub Pages from `main`. Sync is Firebase Cloud Firestore (free Spark plan) with offline persistence.

### Offline and updates

Every app on `germani144.github.io` shares one browser cache store and one `localStorage`, so this app keeps to its own:

- The service worker only handles requests under its own scope (`/cart-log/`) plus the pinned Firebase SDK, and reads only from its own cache.
- On update it deletes only its own old caches (names starting with `cart-log-`), never other apps'.
- Files are fetched network-first, bypassing the browser's HTTP cache, so a new deploy shows on the next open; when offline, the cached copy is used.
- `localStorage` keys are prefixed `cart-log.` (older `cl_` keys are moved over automatically).
- Firebase runs as a named app (`cart-log`), so Firestore's offline database and its tab-sync `localStorage` keys (`firestore_…/cart-log/…`) are separate from any other app on the origin that uses the same Firebase project.

### Data layout

Everything for one list lives under its code:

```
lists/{code}/items     grocery items (name, category, amount, unit, done)
lists/{code}/catalog   items added by the household, shared across the list
lists/{code}/cats      custom categories and their colours
lists/{code}/todos     to-dos (text, order, done)
```

### Firestore rule

```
match /lists/{listId}/{sub}/{id} {
  allow read, write: if true;
}
```

Rules are open by design: the unguessable list code is what keeps a list private. The web config in `firebase-config.js` is not a secret.

## Running your own copy

1. Copy the files into your own repo and enable GitHub Pages (branch `main`, root).
2. Create a Firebase project, add a Firestore database, and publish the rule above.
3. Register a web app in Firebase and paste its config into `firebase-config.js`.
4. Open the Pages URL, create a list, and install it to the home screen.

Without a config the app still runs, but the list stays on that one phone ("local only").
