import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { generateUniqueSlug } from '../utils/slug';
import { diffWords } from '../utils/simpleDiff';
import { put, getAll, get, del } from '../db/database';
import { summarizeForReference } from '../utils/promptAssembler';
export const usePagesStore = create((set, getStore) => ({
    pages: [],
    load: async (bookId) => {
        const list = (await getAll('pages', 'by-book', IDBKeyRange.only(bookId))).sort((a, b) => a.index - b.index);
        set({ pages: list });
    },
    createPage: async (bookId, index) => {
        const pages = getStore().pages.filter((p) => p.bookId === bookId);
        const nextIndex = index ?? (pages.length ? Math.max(...pages.map((p) => p.index)) + 1 : 1);
        const page = {
            id: nanoid(),
            bookId,
            index: nextIndex,
            slug: generateUniqueSlug(`page-${nextIndex}`, pages.map(p => p.slug || '')),
            status: 'DRAFT',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await put('pages', page);
        set({ pages: [...getStore().pages, page].sort((a, b) => a.index - b.index) });
        // 최초 빈 버전 기록 (TODO 항목: Page 생성 시 최초 버전 자동 기록)
        const initialVersion = {
            id: nanoid(),
            pageId: page.id,
            timestamp: Date.now(),
            contentSnapshot: '',
            author: 'system'
        };
        await put('pageVersions', initialVersion);
        return page;
    },
    updatePage: async (id, patch) => {
        const existing = getStore().pages.find((p) => p.id === id);
        if (!existing)
            return;
        let merged = { ...existing, ...patch };
        // tokensPrompt / tokensCompletion 가 들어오면 tokensUsed 재계산 (레거시 호환)
        if (patch.tokensPrompt !== undefined || patch.tokensCompletion !== undefined) {
            const tp = patch.tokensPrompt ?? existing.tokensPrompt;
            const tc = patch.tokensCompletion ?? existing.tokensCompletion;
            if (tp && tc) {
                merged.tokensUsed = tp + tc;
            }
        }
        const updated = { ...merged, updatedAt: Date.now() };
        await put('pages', updated);
        set({ pages: getStore().pages.map((p) => p.id === id ? updated : p) });
    },
    addVersion: async (pageId, snapshot, author) => {
        const version = {
            id: nanoid(),
            pageId,
            timestamp: Date.now(),
            contentSnapshot: snapshot,
            author
        };
        // 직전 버전 diff 계산 (간단 word diff JSON 문자열)
        const existingVersions = await getAll('pageVersions', 'by-page', IDBKeyRange.only(pageId));
        if (existingVersions.length) {
            const last = existingVersions.sort((a, b) => b.timestamp - a.timestamp)[0];
            const diff = diffWords(last.contentSnapshot, snapshot).map((p) => ({ t: p.added ? '+' : p.removed ? '-' : '=', v: p.value })).slice(0, 5000); // 안전 자르기
            version.diff = JSON.stringify(diff);
        }
        await put('pageVersions', version);
        // 페이지 updatedAt 동기화 (TODO 항목: addVersion 후 pages 메타 갱신)
        const existing = getStore().pages.find((p) => p.id === pageId);
        if (existing) {
            const updated = { ...existing, updatedAt: Date.now() };
            await put('pages', updated);
            set({ pages: getStore().pages.map((p) => p.id === pageId ? updated : p) });
        }
    },
    getReferenceSummary: async (pageId) => {
        // Summary TTL / 재생성 정책
        // - TTL: 24h (추후 환경 변수화 가능)
        // - 페이지 updatedAt 이 summary.updatedAt 보다 최신이면 재생성
        const REF_SUMMARY_TTL_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const page = getStore().pages.find((p) => p.id === pageId);
        if (!page || !page.rawContent)
            return undefined;
        const cached = await get('referenceSummaries', pageId);
        const needRefresh = !cached
            || (now - cached.updatedAt) > REF_SUMMARY_TTL_MS
            || (page.updatedAt && cached.updatedAt < page.updatedAt); // 페이지 내용/메타가 새로 갱신됨
        if (!needRefresh && cached)
            return cached.summary;
        const summary = summarizeForReference(page.rawContent);
        const rec = { pageId, summary, updatedAt: now };
        await put('referenceSummaries', rec);
        return summary;
    },
    listVersions: async (pageId) => {
        // index 조회
        const all = await getAll('pageVersions', 'by-page', IDBKeyRange.only(pageId));
        return all.sort((a, b) => b.timestamp - a.timestamp);
    },
    getVersion: async (versionId) => {
        // 직접 objectStore 접근 (get helper 재사용 불가: 다른 키)
        // 간단히 전체 조회 후 필터 (버전 수 작다는 가정). 성능 필요 시 인덱스 추가 고려.
        const all = await getAll('pageVersions');
        return all.find(v => v.id === versionId);
    },
    deletePage: async (pageId) => {
        const st = getStore();
        const target = st.pages.find(p => p.id === pageId);
        if (!target)
            return;
        // 삭제 대상 bookId 저장
        const bookId = target.bookId;
        // 1) 관련 버전 삭제
        const versions = await getAll('pageVersions', 'by-page', IDBKeyRange.only(pageId));
        for (const v of versions)
            await del('pageVersions', v.id);
        // 2) referenceSummaries 캐시 삭제
        await del('referenceSummaries', pageId);
        // 3) 페이지 삭제
        await del('pages', pageId);
        // 4) 남은 페이지 재인덱싱 (빈 슬롯 제거, index 1부터 연속)
        const remaining = st.pages.filter(p => p.id !== pageId && p.bookId === bookId).sort((a, b) => a.index - b.index);
        let changed = false;
        for (let i = 0; i < remaining.length; i++) {
            const desired = i + 1;
            if (remaining[i].index !== desired) {
                remaining[i] = { ...remaining[i], index: desired, updatedAt: Date.now() };
                await put('pages', remaining[i]);
                changed = true;
            }
        }
        // 5) 상태 갱신
        const updatedPages = st.pages.filter(p => p.id !== pageId).map(p => {
            const repl = remaining.find(r => r.id === p.id);
            return repl ? repl : p;
        }).sort((a, b) => a.index - b.index);
        set({ pages: updatedPages });
    }
}));
