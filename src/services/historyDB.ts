/*
 * Input History IndexedDB Helper
 * - Object Store: chat_input_history
 * - Schema Version: 1
 * Record shape:
 *   { id: number (auto), content: string, createdAt: number }
 */
import { openDB, IDBPDatabase } from 'idb';

export interface InputHistoryRecord {
  id?: number; // autoIncrement primary key
  content: string;
  createdAt: number; // epoch ms
}

const DB_NAME = 'chat_input_history_db';
const DB_VERSION = 1;
const STORE = 'chat_input_history';

let dbPromise: Promise<IDBPDatabase> | null = null;
let idbAvailable: boolean | null = null;

function detectIndexedDB(): boolean {
  if (idbAvailable !== null) return idbAvailable;
  try {
    idbAvailable = typeof indexedDB !== 'undefined';
  } catch {
    idbAvailable = false;
  }
  return idbAvailable;
}

export function getDB(): Promise<IDBPDatabase | null> {
  if (!detectIndexedDB()) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      }
    }).catch(err => {
      console.warn('[historyDB] open failed, fallback to memory', err);
      return null as any;
    });
  }
  return dbPromise;
}

// Fallback in-memory store (session scoped)
const memoryStore: InputHistoryRecord[] = [];

export async function addHistory(content: string): Promise<void> {
  const trimmed = content.trim();
  if (trimmed.length < 1) return;
  const db = await getDB();
  if (!db) {
    // skip duplicate immediate
    if (memoryStore[0]?.content === trimmed) return;
    memoryStore.unshift({ content: trimmed, createdAt: Date.now() });
    return;
  }
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  // fetch last recent (highest id) quickly by opening a cursor on autoIncrement descending not directly supported,
  // so we use createdAt index descending cursor
  let lastRecent: InputHistoryRecord | undefined;
  try {
    let cursor = await store.index('createdAt').openCursor(null, 'prev');
    if (cursor) lastRecent = cursor.value as InputHistoryRecord;
  } catch {
    // Silently ignore cursor errors
  }
  if (lastRecent && lastRecent.content === trimmed) {
    await tx.done; return;
  }
  await store.add({ content: trimmed, createdAt: Date.now() });
  await tx.done;
}

export async function getRecent(limit: number): Promise<InputHistoryRecord[]> {
  const db = await getDB();
  if (!db) {
    return memoryStore.slice(0, limit);
  }
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const idx = store.index('createdAt');
  const result: InputHistoryRecord[] = [];
  let cursor = await idx.openCursor(null, 'prev');
  while (cursor && result.length < limit) {
    result.push(cursor.value as InputHistoryRecord);
    cursor = await cursor.continue();
  }
  await tx.done;
  return result;
}

export async function countAll(): Promise<number> {
  const db = await getDB();
  if (!db) return memoryStore.length;
  return db.count(STORE);
}

export async function pruneOld(max: number): Promise<void> {
  if (max <= 0) return;
  const db = await getDB();
  if (!db) {
    if (memoryStore.length > max) memoryStore.splice(max);
    return;
  }
  const total = await db.count(STORE);
  if (total <= max) return;
  const toDelete = total - max;
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const idx = store.index('createdAt');
  // oldest first (ascending)
  let cursor = await idx.openCursor();
  let removed = 0;
  while (cursor && removed < toDelete) {
    await cursor.delete();
    removed++;
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  if (!db) {
    memoryStore.length = 0;
    return;
  }
  const tx = db.transaction(STORE, 'readwrite');
  await tx.objectStore(STORE).clear();
  await tx.done;
}
