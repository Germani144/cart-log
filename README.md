# cart-log

Shared grocery list PWA. Live sync via Firebase Firestore (same project as nap-log).
Share a list with the 8-character code or the invite link. Works offline.

- Shared item database with autocomplete (`lists/{code}/catalog`)
- New items ask for a category (existing or new); the list is grouped by category
- Lists live under `lists/{code}/items`

Firestore rule:

```
match /lists/{listId}/{sub}/{id} {
  allow read, write: if true;
}
```
