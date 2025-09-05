import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { put, getAll, get } from '../db/database';
import { summarizeForReference } from '../utils/promptAssembler';
export const usePagesStore = create((set, getStore) => ({
    pages: [],
    load: async (bookId) => {
        const list = (await getAll('pages', 'by-book', IDBKeyRange.only(bookId))).sort((a, b) => a.index - b.index);
        set({ pages: list });
    },
    createPage: async (bookId, index) => {
        const pages = getStore().pages.filter(p => p.bookId === bookId);
        const nextIndex = index ?? (pages.length ? Math.max(...pages.map(p => p.index)) + 1 : 1);
        const page = {
            id: nanoid(),
            bookId,
            index: nextIndex,
            status: 'DRAFT',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await put('pages', page);
        set({ pages: [...getStore().pages, page].sort((a, b) => a.index - b.index) });
        return page;
    },
    updatePage: async (id, patch) => {
        const existing = getStore().pages.find(p => p.id === id);
        if (!existing)
            return;
        const updated = { ...existing, ...patch, updatedAt: Date.now() };
        await put('pages', updated);
        set({ pages: getStore().pages.map(p => p.id === id ? updated : p) });
    },
    addVersion: async (pageId, snapshot, author) => {
        const version = {
            id: nanoid(),
            pageId,
            timestamp: Date.now(),
            contentSnapshot: snapshot,
            author
        };
        await put('pageVersions', version);
    },
    getReferenceSummary: async (pageId) => {
        // 캐시 조회
        const cached = await get('referenceSummaries', pageId);
        if (cached)
            return cached.summary;
        // 페이지 본문 확보
        const page = getStore().pages.find(p => p.id === pageId);
        if (!page || !page.rawContent)
            return undefined;
        const summary = summarizeForReference(page.rawContent);
        const rec = { pageId, summary, updatedAt: Date.now() };
        await put('referenceSummaries', rec);
        return summary;
    }
}));
