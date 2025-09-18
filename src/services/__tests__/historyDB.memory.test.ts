import { describe, it, beforeEach, expect } from 'vitest';
import { addHistory, getRecent, clearAll, pruneOld, countAll } from '../historyDB';

// IndexedDB 가 없다고 가정: jsdom 환경에서 globalThis.indexedDB 제거하여 fallback 사용
beforeEach(async () => {
  // @ts-expect-error - 강제로 제거
  delete globalThis.indexedDB;
  await clearAll();
});

describe('historyDB fallback(memory) behavior', () => {
  it('ignores empty or whitespace-only input', async () => {
    await addHistory('   ');
    const recent = await getRecent(10);
    expect(recent.length).toBe(0);
  });

  it('stores entries newest-first via getRecent', async () => {
    await addHistory('one');
    await addHistory('two');
    const recent = await getRecent(10);
    expect(recent.map(r => r.content)).toEqual(['two', 'one']);
  });

  it('skips immediate duplicate', async () => {
    await addHistory('dup');
    await addHistory('dup');
    const recent = await getRecent(10);
    expect(recent.length).toBe(1);
    expect(recent[0].content).toBe('dup');
  });

  it('countAll reflects number of stored records', async () => {
    await addHistory('a');
    await addHistory('b');
    expect(await countAll()).toBe(2);
  });

  it('pruneOld removes oldest beyond limit', async () => {
    for (let i = 0; i < 5; i++) await addHistory('m' + i);
    await pruneOld(3);
    const recent = await getRecent(10);
    // 최신 3개만 남음
    expect(recent.length).toBe(3);
    expect(recent.map(r => r.content)).toEqual(['m4', 'm3', 'm2']);
  });

  it('clearAll empties store', async () => {
    await addHistory('x');
    await clearAll();
    expect(await countAll()).toBe(0);
    const recent = await getRecent(5);
    expect(recent.length).toBe(0);
  });
});
