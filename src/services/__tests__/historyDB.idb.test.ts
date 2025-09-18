import { describe, it, beforeEach, expect } from 'vitest';
import { addHistory, getRecent, clearAll, pruneOld, countAll } from '../historyDB';
// fake-indexeddb 제공
import 'fake-indexeddb/auto';

beforeEach(async () => {
  await clearAll();
});

describe('historyDB with IndexedDB (fake)', () => {
  it('adds and retrieves newest first', async () => {
    await addHistory('a');
    await addHistory('b');
    const recent = await getRecent(5);
    expect(recent.map(r => r.content)).toEqual(['b', 'a']);
  });

  it('skips immediate duplicate (cursor check)', async () => {
    await addHistory('same');
    await addHistory('same');
    const recent = await getRecent(5);
    expect(recent.length).toBe(1);
  });

  it('countAll matches number of records', async () => {
    await addHistory('1');
    await addHistory('2');
    expect(await countAll()).toBe(2);
  });

  it('pruneOld removes oldest using index asc cursor', async () => {
    for (let i = 0; i < 6; i++) await addHistory('x' + i);
    await pruneOld(2);
    const recent = await getRecent(10);
    expect(recent.map(r => r.content)).toEqual(['x5', 'x4']);
  });

  it('clearAll empties object store', async () => {
    await addHistory('temp');
    await clearAll();
    expect(await countAll()).toBe(0);
  });
});
