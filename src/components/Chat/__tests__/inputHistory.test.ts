import { describe, it, expect, beforeEach } from 'vitest';
import { getRecent, clearAll, pruneOld } from '../../../services/historyDB';
import { recordInput, getCachedRecent, invalidateHistoryCache, INPUT_HISTORY_MAX } from '../../../services/inputHistoryRepository';

// NOTE: historyDB는 fallback(in-memory)을 사용하므로 fake-indexeddb 없이도 기본 동작 테스트 가능.
// 실제 IndexedDB 환경 테스트가 필요하면 fake-indexeddb를 setup 단계에서 주입.

describe('input history repository', () => {
  beforeEach(async () => {
    await clearAll();
    invalidateHistoryCache();
  });

  it('skips empty or whitespace-only entries', async () => {
    await recordInput('   ');
    const recent = await getCachedRecent();
    expect(recent.length).toBe(0);
  });

  it('records and retrieves recent inputs (latest first)', async () => {
    await recordInput('first');
    await recordInput('second');
    const recent = await getCachedRecent();
    expect(recent[0]).toBe('second');
    expect(recent[1]).toBe('first');
  });

  it('deduplicates immediate same entry', async () => {
    await recordInput('same');
    await recordInput('same');
    const recent = await getCachedRecent();
    expect(recent.length).toBe(1);
  });

  it('moves existing entry to front when re-entered', async () => {
    await recordInput('one');
    await recordInput('two');
    await recordInput('one');
    const recent = await getCachedRecent();
    expect(recent[0]).toBe('one');
    expect(recent[1]).toBe('two');
  });

  it('prunes oldest entries beyond max', async () => {
    const target = INPUT_HISTORY_MAX + 5;
    for (let i = 0; i < target; i++) {
      await recordInput('msg-' + i);
    }
    const recent = await getCachedRecent();
    expect(recent.length).toBeGreaterThan(0);
    // 전체 DB 레코드가 max 이하인지 pruneOld 수동 호출 후 확인
    await pruneOld(INPUT_HISTORY_MAX);
    const afterRecent = await getRecent(INPUT_HISTORY_MAX + 10);
    expect(afterRecent.length).toBeLessThanOrEqual(INPUT_HISTORY_MAX);
  });
});
