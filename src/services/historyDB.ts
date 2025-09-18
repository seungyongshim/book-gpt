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

// DB 핸들 캐시
let dbPromise: Promise<IDBPDatabase | null> | null = null;
const hasIDB = () => typeof indexedDB !== 'undefined';

export function getDB(): Promise<IDBPDatabase | null> {
  if (!hasIDB()) return Promise.resolve(null);
  return (dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db: any) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt');
      }
    }
  }).catch(err => {
    console.warn('[historyDB] open failed, fallback to memory', err);
    return null as any;
  }));
}

// Fallback in-memory store (session scoped)
const memoryStore: InputHistoryRecord[] = [];

export async function addHistory(content: string): Promise<void> {
  const value = content.trim();
  if (!value) return;
  const db = await getDB();
  if (!db) {
    if (memoryStore[0]?.content === value) return; // 즉시 중복 억제
    memoryStore.unshift({ content: value, createdAt: Date.now() });
    return;
  }
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  try {
    const cur = await store.index('createdAt').openCursor(null, 'prev');
    if (cur && (cur.value as InputHistoryRecord).content === value) { await tx.done; return; }
  } catch {/* noop */}
  await store.add({ content: value, createdAt: Date.now() });
  await tx.done;
}

export async function getRecent(limit: number): Promise<InputHistoryRecord[]> {
  const db = await getDB();
  if (!db) return memoryStore.slice(0, limit);
  const tx = db.transaction(STORE, 'readonly');
  const idx = tx.objectStore(STORE).index('createdAt');
  const out: InputHistoryRecord[] = [];
  for (let cur = await idx.openCursor(null, 'prev'); cur && out.length < limit; cur = await cur.continue()) {
    out.push(cur.value as InputHistoryRecord);
  }
  await tx.done; return out;
}

export async function countAll(): Promise<number> {
  const db = await getDB();
  if (!db) return memoryStore.length;
  return db.count(STORE);
}

export async function pruneOld(max: number): Promise<void> {
  if (max <= 0) return;
  const db = await getDB();
  if (!db) { if (memoryStore.length > max) memoryStore.splice(max); return; }
  const total = await db.count(STORE);
  if (total <= max) return;
  const tx = db.transaction(STORE, 'readwrite');
  const idx = tx.objectStore(STORE).index('createdAt');
  let cur = await idx.openCursor();
  for (let removed = 0, need = total - max; cur && removed < need; removed++, cur = await cur.continue()) {
    await cur.delete();
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
