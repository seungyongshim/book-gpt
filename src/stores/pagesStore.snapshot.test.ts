import { describe, it, expect, beforeEach } from 'vitest';
import { usePagesStore } from './pagesStore';
import { useBooksStore } from './booksStore';
import { act } from 'react-dom/test-utils';

// Simple in-memory mocks could rely on fake-indexeddb already configured in setup.

describe('pagesStore preApplySnapshot', () => {
  beforeEach(()=>{
    // reset zustand stores (re-importing not trivial, manual clear)
    const ps: any = usePagesStore.getState();
    ps.pages = [];
  });

  it('creates a snapshot version before modification when content changed', async () => {
    const bookId = 'b1';
    // Create page
    const page = await usePagesStore.getState().createPage(bookId);
    // Update page with some content (no snapshot yet besides initial blank)
    await usePagesStore.getState().updatePage(page.id, { rawContent: 'Hello World' });
    // Call preApplySnapshot
    await usePagesStore.getState().preApplySnapshot(page.id, 'user');
    // Modify content
    await usePagesStore.getState().updatePage(page.id, { rawContent: 'Hello World Extended' });
    const versions = await usePagesStore.getState().listVersions(page.id);
    // initial blank + preApply + final addVersion not auto; we created only preApply (diff not added automatically here)
    // So expect at least 2 versions (initial + preApply)
    expect(versions.length).toBeGreaterThanOrEqual(2);
    // preApply diff marker existence check
    const hasPre = versions.some(v=> (v.diff||'').includes('pre-apply'));
    expect(hasPre).toBe(true);
  });

  it('skips snapshot if content unchanged', async () => {
    const bookId='b2';
    const page = await usePagesStore.getState().createPage(bookId);
    await usePagesStore.getState().updatePage(page.id, { rawContent: '' });
    const before = await usePagesStore.getState().listVersions(page.id);
    await usePagesStore.getState().preApplySnapshot(page.id);
    const after = await usePagesStore.getState().listVersions(page.id);
    expect(after.length).toEqual(before.length); // no change
  });
});
