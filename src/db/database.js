import { openDB } from 'idb';
const DB_NAME = 'book-gpt';
const DB_VERSION = 1;
let dbPromise = null;
export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('books')) {
                    const store = db.createObjectStore('books', { keyPath: 'id' });
                    store.createIndex('by-updated', 'updatedAt');
                }
                if (!db.objectStoreNames.contains('worldSettings')) {
                    db.createObjectStore('worldSettings', { keyPath: 'bookId' });
                }
                if (!db.objectStoreNames.contains('pages')) {
                    const store = db.createObjectStore('pages', { keyPath: 'id' });
                    store.createIndex('by-book', 'bookId');
                    store.createIndex('by-book-index', ['bookId', 'index']);
                }
                if (!db.objectStoreNames.contains('pageVersions')) {
                    const store = db.createObjectStore('pageVersions', { keyPath: 'id' });
                    store.createIndex('by-page', 'pageId');
                }
                if (!db.objectStoreNames.contains('referenceSummaries')) {
                    db.createObjectStore('referenceSummaries', { keyPath: 'pageId' });
                }
                if (!db.objectStoreNames.contains('worldDerived')) {
                    const store = db.createObjectStore('worldDerived', { keyPath: 'id' });
                    store.createIndex('by-book', 'bookId');
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            }
        });
    }
    return dbPromise;
}
// Generic helpers
export async function put(storeName, value) {
    const db = await getDB();
    return db.put(storeName, value);
}
export async function get(storeName, key) {
    const db = await getDB();
    return db.get(storeName, key);
}
export async function getAll(storeName, index, query) {
    const db = await getDB();
    if (index) {
        return db.getAllFromIndex(storeName, index, query);
    }
    return db.getAll(storeName);
}
export async function del(storeName, key) {
    const db = await getDB();
    return db.delete(storeName, key);
}
export async function tx(stores, fn) {
    const db = await getDB();
    const transaction = db.transaction(stores, 'readwrite');
    try {
        const result = await fn(transaction);
        await transaction.done;
        return result;
    }
    catch (e) {
        try {
            transaction.abort();
        }
        catch { }
        throw e;
    }
}
