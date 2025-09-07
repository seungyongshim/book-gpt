# IndexedDB Migration Strategy

Current DB Version: `1`
Database Name: `book-gpt`

## Object Stores (v1)
- `books` (keyPath: `id`) indexes: `by-updated`
- `worldSettings` (keyPath: `bookId`)
- `pages` (keyPath: `id`) indexes: `by-book`, `by-book-index`
- `pageVersions` (keyPath: `id`) indexes: `by-page`
- `referenceSummaries` (keyPath: `pageId`)
- `worldDerived` (keyPath: `id`) indexes: `by-book`
- `settings` (keyPath: `key`)

## Versioning Principles
1. Increment `DB_VERSION` when adding/removing stores or indexes, or changing keyPaths.
2. Never mutate existing records destructively; prefer additive changes (new fields) without version bump.
3. For large structural changes, create transitional stores, migrate, then optionally delete legacy stores in a later version.
4. Each upgrade block must be idempotent: guard with `db.objectStoreNames.contains(...)` before creation.
5. Field-level migrations (e.g., setting default values) should iterate with a cursor inside `upgrade` when version threshold matches.

## Planned Future Changes
| Tentative Version | Change | Notes |
|-------------------|--------|-------|
| 2 | Add `tokensUsedPrompt` & `tokensUsedCompletion` to `pages`; backfill from existing `tokensUsed` if present | Non-breaking additive fields |
| 2 | Add index `by-book-updated` on `pages` (`[bookId, updatedAt]`) | For faster recent page queries |
| 3 | New store `embeddings` (keyPath: `id`) | Vector search roadmap |
| 4 | New store `worldSettingsHistory` for versioned world diffs | Enables rollback |

## Upgrade Template (Example v2)
```ts
const DB_VERSION = 2;
openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 2) {
      const pages = db.transaction.objectStore('pages');
      // Add new index
      if (!pages.indexNames.contains('by-book-updated')) {
        pages.createIndex('by-book-updated', ['bookId', 'updatedAt']);
      }
      // Field backfill (optional) using a cursor
      const req = pages.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const value: any = cursor.value;
          if (value.tokensUsed && typeof value.tokensUsed === 'number') {
            value.tokensUsedPrompt = value.tokensUsed; // heuristic
            value.tokensUsedCompletion = 0; // unknown
            cursor.update(value);
          }
          cursor.continue();
        }
      };
    }
  }
});
```

## Data Compression Policy
Large text fields are currently stored raw. Future optional compression (>50KB) will add a `compressed: true` flag and LZ-string encode the text field. Migration will:
1. Iterate pages and versions; detect size threshold.
2. Compress and update records in-place.
3. Maintain backward compatibility by checking flag on read.

## Rollback Strategy
IndexedDB does not support downgrading schema automatically. For dev/testing:
- Bump version only forward.
- To reset locally, delete the database via DevTools Application panel or run `indexedDB.deleteDatabase('book-gpt')` in console.

## Integrity / Recovery
- Add future `settings` key `lastMigration` to record timestamp & success status.
- On load, if anomalies detected (e.g., missing required index), prompt user to export & reinitialize.

## Changelog
- v1: Initial schema (baseline in repository)

---
This document must be updated whenever `DB_VERSION` changes or migration logic is introduced.