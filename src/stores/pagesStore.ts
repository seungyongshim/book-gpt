import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { PageMeta, PageVersion, PageStatus } from '../types/domain';
import { put, getAll, tx, get } from '../db/database';

interface PagesState {
  pages: PageMeta[];
  load: (bookId: string) => Promise<void>;
  createPage: (bookId: string, index?: number) => Promise<PageMeta>;
  updatePage: (id: string, patch: Partial<PageMeta>) => Promise<void>;
  addVersion: (pageId: string, snapshot: string, author: 'system' | 'user') => Promise<void>;
}

export const usePagesStore = create<PagesState>((set, getStore) => ({
  pages: [],
  load: async (bookId) => {
    const list = (await getAll<PageMeta>('pages', 'by-book', IDBKeyRange.only(bookId))).sort((a,b)=>a.index-b.index);
    set({ pages: list });
  },
  createPage: async (bookId, index) => {
    const pages = getStore().pages.filter(p=>p.bookId===bookId);
    const nextIndex = index ?? (pages.length ? Math.max(...pages.map(p=>p.index))+1 : 1);
    const page: PageMeta = {
      id: nanoid(),
      bookId,
      index: nextIndex,
      status: 'DRAFT',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await put('pages', page);
    set({ pages: [...getStore().pages, page].sort((a,b)=>a.index-b.index) });
    return page;
  },
  updatePage: async (id, patch) => {
    const existing = getStore().pages.find(p=>p.id===id);
    if (!existing) return;
    const updated: PageMeta = { ...existing, ...patch, updatedAt: Date.now() };
    await put('pages', updated);
    set({ pages: getStore().pages.map(p=>p.id===id?updated:p) });
  },
  addVersion: async (pageId, snapshot, author) => {
    const version: PageVersion = {
      id: nanoid(),
      pageId,
      timestamp: Date.now(),
      contentSnapshot: snapshot,
      author
    };
    await put('pageVersions', version);
  }
}));
