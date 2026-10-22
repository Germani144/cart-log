# Home log

A shared grocery list, to-do list and list of dishes for a household, synced live between phones.
Works on Android and iPhone as an installable web app, no accounts needed, and keeps working offline.

Live: https://germani144-home.github.io/cart-log/ (the repo kept its original name, `cart-log`). It moved from `germani144.github.io` on 2026-10-20 because Chrome on Android installs only one app per address; after the move, enter the list code once on each phone.

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
- Several lists, picked with chips at the top of the tab. **Home** is the original shared list (tap it again to rename it or change its icon); **＋ New list** makes another one with a name and icon.
- Each new list is either **shared** (everyone with the list code sees it) or **private** (🔒, only this phone). Private lists are stored under the phone's own private code, which is never shared; it's shown in ⋯ → *Your private lists*, and *Restore private lists from another phone* brings them back on a new phone. A private list stays private (it can't be turned into a shared one).
- Tap the selected list's chip again to rename it, change its icon, or delete it with its to-dos.
- The title on the list card ("To do" for Home, the list's name for others) can be renamed by tapping it; clearing it brings back the default. Shared lists sync the title, private ones keep it private.
- Each list is an ordered list of bulleted to-dos (up to 50 open). Tap **H** next to the input to add the next entry as a **heading** instead (it switches back after one); headings group to-dos into sections, show bigger and bolder than to-dos, and have no tick box. Hold and drag a heading to move its whole section (its to-dos fold under it while dragging and come along); drag a single to-do to reorder it within a section or move it to another. To-dos above the first heading stay on top. Deleting a heading asks first; its to-dos stay in the list. Tap the ▾ arrow on a heading to fold its section (the heading shows how many items are hidden); folding is per phone and remembered, and adding an item to a folded last section unfolds it. The tab badge counts the open to-dos (not headings) of the list you're on.
- Paste several lines into *Add an item…* to add them all at once: lines starting with `-` (or `•`, `*`) become to-dos, other lines become headings, and a bare `-` is skipped. It asks before adding.
- Hold and drag to reorder; tick to move an item to Done (struck through, faded).

**Recipes**
- A shared, alphabetical list of saved dishes under a title you can rename (tap the heading; the name is shared by everyone on the list) (e.g. Lasagne, Chili sin carne). Add one by name; adding a name that's already saved just says so.
- Tap a dish to open its recipe: name, ingredients, and how many people the amounts are for (default 2). ✕ on the row deletes the dish.
- Ingredients come from the same item database as the grocery list (same search, æ/ø/å-proof). Pick one and its unit is filled in from the database and fixed; you only type the amount (e.g. 500 g, 1 l, 10 pcs). Typing `500 g mel` when flour is stored in kg gives 0,5 kg.
- An ingredient that isn't in the database yet gets a unit picker once; on Save it's added to the database under Andet / Other (it doesn't show up as a grocery suggestion until it's been bought).
- A brand-new list starts with one classic already in its recipes: Rachel's trifle (ladyfingers, jam, custard, raspberries, beef sautéed with peas and onions, bananas, cream). Delete it like any other dish. Lists you join keep what they have.
- **Starter dishes:** the *＋ Add N starter dishes with recipes* button under the dish list (also in ⋯) adds 35 everyday dishes (stews, quesadillas, halloumi dishes, noodle bowls…) with recipes for 2 from `dishes-pack.json`. Dishes the list already has (same name) are skipped, and missing ingredients (halloumi, chorizo, gyoza…) are added to the item database; nothing already saved is changed, so it's safe to tap again. The button under the list disappears once the list has them all. Pantry staples (salt, pepper, oil, flour, sugar, stock, dried spices, soy sauce, mayo, mustard, peanut butter, honey) are left out of the recipes on purpose.
- **Add to grocery list** asks for how many people, shows the scaled amounts, and puts every ingredient on the list. Countable units (pcs, pack, can…) round up. If an ingredient is already on the list, its amount is topped up (g↔kg and ml↔dl↔l are converted); if the units can't be combined, it's left as is and named in the message.

**General**
- Three tabs (Groceries, To-dos, Recipes); swipe left or right to switch, with live feedback while dragging. On narrow phones the tab icons sit above the labels and counts show as small badges.
- Share a list with its 8-character code or invite link (`?list=CODE`). Anyone with the code can see and edit it.
- Opening an invite link joins the list straight away, and the code stays in the address. On iPhone that matters: a home-screen app has its own storage, separate from Safari, so "Add to Home Screen" from that page installs an app that's already in the list. (The installed app only uses that code if it has no list yet, so leaving or switching lists in the app sticks.)
- Offline-first: changes made without signal sync when the phone is back online.
- Updates install themselves; the app reloads once when a new version is available. ⋯ → **Check for updates** compares with the version on the server and, if there's a newer one, clears the app's cache and reloads straight into it.
- The version (e.g. v1.0) shows next to the title, so you can tell which build a phone is running.
- Follows the phone's light or dark mode.
- **Backup:** ⋯ → **Export data** downloads `home-log-YYYY-MM-DD.json` with this shared list's groceries, item database, categories, to-dos, recipes and list settings, plus this phone's private to-dos as a separate section. List codes are never in the file. The file is made in the browser, so nothing is sent anywhere.
- ⋯ → **Import data** checks the whole file first (format, version and every field; old exports with missing fields are fine) and writes nothing if anything is wrong. A preview shows what's in it, then **Merge** (default) adds entries that aren't here yet and keeps everything that is (matched by id), or **Replace** wipes and restores, after a second confirmation because every phone on the list sees it. Shared data goes to this list, private to-dos only under this phone's private code (skipped if the phone has none yet).
- Dialogs open without popping up the keyboard; it appears when you tap a field. While the keyboard is up, the dialog fits above it and scrolls the field you're typing in to the top, so suggestions stay visible.

## Versioning

Each release bumps the version in two places, kept identical: the label next to the title in `index.html` and the cache name in `sw.js` (`cart-log-X.Y`). Small fixes and tweaks raise the second number (1.0 → 1.1); bigger features or redesigns raise the first (1.4 → 2.0).

## How it's built

Plain static files, no build step, no framework.

| File | What it does |
|---|---|
| `index.html` | The whole app: markup, styles and logic |
| `seed.js` | Built-in bilingual item database and categories |
| `dishes-pack.json` | Starter dishes with recipes, loaded by the *Add starter dishes* button |
| `firebase-config.js` | Firebase web config for the project |
| `sw.js` | Service worker: caches the app for offline use (cache name `cart-log-X.Y` matches the app version) |
| `manifest.json` | Install name, icons and colours; `scope` and `start_url` are `./`, so the installed app covers only `/cart-log/`, not the whole site. Not linked on iPhone/iPad, so Safari's "Add to Home Screen" starts the app at the current address (with the list code); iOS takes name, icon and full-screen mode from the `apple-*` tags instead |
| `icon-*.png` | App icons |

Hosting is GitHub Pages from `main`. Sync is Firebase Cloud Firestore (free Spark plan) with offline persistence.

### Offline and updates

Home log has its own address, but it still keeps strictly to its own cache and storage (so it stays clean if it ever shares an address with another app):

- The service worker only handles requests under its own scope (`/cart-log/`) plus the pinned Firebase SDK, and reads only from its own cache.
- On update it deletes only its own old caches (names starting with `cart-log-`), never other apps'.
- Files are fetched network-first, bypassing the browser's HTTP cache, so a new deploy shows on the next open; when offline, the cached copy is used.
- `localStorage` keys are prefixed `cart-log.` (older `cl_` keys are moved over automatically).
- Firebase runs as a named app (`cart-log`), so Firestore's offline database and its tab-sync `localStorage` keys (`firestore_…/cart-log/…`) are separate from any other app on the origin that uses the same Firebase project.

### Security

- No secrets in the code: the Firebase web config is public by design; the Firestore rules decide who may read or write.
- Everything synced or typed in is shown as text: it goes through `esc()` before it reaches the page, item ids included.
- `index.html` sets a Content-Security-Policy: scripts only from this site and the pinned Firebase SDK on gstatic.com, and data may only be sent to this site and Firestore (`firestore.googleapis.com`). Inline scripts are still allowed for now, because the app's code lives inside `index.html`; splitting it into files (planned readability refactor) lets the policy drop that.

### Data layout

Everything for one list lives under its code:

```
lists/{code}/items     grocery items (name, category, amount, unit, done)
lists/{code}/catalog   items added by the household, shared across the list
lists/{code}/cats      custom categories and their colours
lists/{code}/todos     to-dos (text, order, done, head: true for headings, list: absent for Home, else the list's id)
lists/{code}/dishes    saved dishes (name, serves, ingredients: [{cid, da, en, amt, unit}])
lists/{code}/meta      list settings: "dishes" (title of the dish list), "tl_main" (Home's name/icon/card title),
                       "tl_<id>" (each extra shared to-do list: name, emoji, optional card title)
lists/{private}/todos  a phone's private to-dos (same shape)
lists/{private}/meta   its private lists ("tl_<id>")
```

### Firestore rule

Only known list codes are allowed (set 2026-10-22). The rules live only in the Firebase console, never in this public repo, because they contain the real codes:

```
function listOk(id) { return id in ['<shared list code>', '<private to-do code>', ...]; }
match /lists/{listId}/{sub}/{id} {
  allow read, write: if listOk(listId);
}
```

Anyone can open the app, but with any other code nothing syncs: it can't read, write or create a list. **A new list (or a new private to-do list) only works after its code is added to the rules** in the Firebase console (Firestore → Rules → Publish). The same rules also cover Nap Log, which shares the Firebase project. The web config in `firebase-config.js` is not a secret.

## Running your own copy

1. Copy the files into your own repo and enable GitHub Pages (branch `main`, root).
2. Create a Firebase project, add a Firestore database, and publish the rule above.
3. Register a web app in Firebase and paste its config into `firebase-config.js`.
4. Open the Pages URL, create a list, and install it to the home screen.

Without a config the app still runs, but the list stays on that one phone ("local only").

### Export file format

```
{ "format": "home-log-export", "version": 1, "exportedAt": "…", "appVersion": "v4.0",
  "shared":  { "items": […], "catalog": […], "cats": […], "todos": […], "dishes": […], "meta": […] },
  "private": { "todos": […], "meta": […] } | null }
```

Each entry is a Firestore document with its `id`, using the fields from *Data layout*. Only known fields are exported and accepted; sections may be left out.
