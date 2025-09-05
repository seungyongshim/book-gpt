import { openDB, IDBPDatabase, IDBPTransaction } from 'idb';
import { BookMeta, WorldSetting, PageMeta, PageVersion, ReferenceSummaryCache, WorldDerivedCache } from '../types/domain';

export interface BookGPTDB extends IDBPDatabase<any> {
  // just typing helper label
}

const DB_NAME = 'book-gpt';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db: IDBPDatabase) {
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
export async function put<T = any>(storeName: string, value: T) {
  const db = await getDB();
  return db.put(storeName, value as any);
}

export async function get<T = any>(storeName: string, key: IDBValidKey) {
  const db = await getDB();
  return db.get(storeName, key) as Promise<T | undefined>;
}

export async function getAll<T = any>(storeName: string, index?: string, query?: IDBValidKey | IDBKeyRange) {
  const db = await getDB();
  if (index) {
    return db.getAllFromIndex(storeName, index, query) as Promise<T[]>;
  }
  return db.getAll(storeName) as Promise<T[]>;
}

export async function del(storeName: string, key: IDBValidKey) {
  const db = await getDB();
  return db.delete(storeName, key);
}

export async function tx<T>(stores: string[], fn: (tx: IDBPTransaction<any, string[], 'readwrite'>) => Promise<T>) {
  const db = await getDB();
  const transaction = db.transaction(stores, 'readwrite');
  try {
    const result = await fn(transaction as IDBPTransaction<any, string[], 'readwrite'>);
    await transaction.done;
    return result;
  } catch (e) {
    try { transaction.abort(); } catch {}
    throw e;
  }
}
