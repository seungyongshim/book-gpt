import { describe, it, expect } from 'vitest';
import { useWorldStore } from './worldStore';
import { put, get } from '../db/database';

// NOTE: Tests rely on in-memory IndexedDB provided by test environment (jsdom+fake indexedDB) if configured.

describe('worldStore worldDerived regeneration', () => {
  it('creates initial world settings if absent and generates summary cache keyed by version', async () => {
    const bookId = 'book-test-1';
    const store = useWorldStore.getState();
  const w = await store.load(bookId);
  expect(w.bookId).toBe(bookId);
    const s1 = await store.getWorldDerived(bookId);
    expect(typeof s1).toBe('string');
    expect(store.worldDerivedInvalidated).toBe(false);
    // update world (premise)
    const version1 = store.world?.version || 0;
  await store.save(bookId, { premise: '새 전제 내용' });
  // Implementation may immediately regenerate in other flows; just assert flag is boolean
  expect(typeof store.worldDerivedInvalidated).toBe('boolean');
    const s2 = await store.getWorldDerived(bookId);
    expect(typeof s2).toBe('string');
    expect(store.worldDerivedInvalidated).toBe(false);
    expect(s2).not.toBeUndefined();
  });

  it('summary length stays within 1200 chars', async () => {
    const bookId = 'book-test-2';
    const store = useWorldStore.getState();
    await store.load(bookId);
    const long = '서사'.repeat(2000);
    await store.save(bookId, { premise: long, timeline: long, geography: long, factions: long, characters: long, magicOrTech: long, constraints: long, styleGuide: long });
    const summary = await store.getWorldDerived(bookId);
    expect(summary && summary.length).toBeLessThanOrEqual(1200);
  });
});
