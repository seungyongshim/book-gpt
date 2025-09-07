import { create } from 'zustand';
import { get as dbGet, put } from '../db/database';
import { summarizeWorld } from '../utils/promptAssembler';
export const useWorldStore = create((set, get) => ({
    world: undefined,
    worldDerivedInvalidated: false,
    load: async (bookId) => {
        let ws = await dbGet('worldSettings', bookId);
        if (!ws) {
            // 존재하지 않으면 초기 레코드 생성 (TODO 항목 처리: worldStore.load 실패 정책)
            ws = { bookId, premise: '', version: 0, updatedAt: Date.now() };
            await put('worldSettings', ws);
        }
        set({ world: ws });
    },
    save: async (bookId, patch) => {
        const prev = get().world || { bookId, version: 0, updatedAt: 0 };
        const next = { ...prev, ...patch, bookId, version: prev.version + 1, updatedAt: Date.now() };
        await put('worldSettings', next);
        set({ world: next, worldDerivedInvalidated: true });
    },
    invalidateDerived: () => set({ worldDerivedInvalidated: true }),
    getWorldDerived: async (bookId) => {
        const st = get();
        const world = st.world && st.world.bookId === bookId ? st.world : undefined;
        if (!world)
            return undefined;
        const derivedId = `${bookId}:${world.version}`;
        if (!st.worldDerivedInvalidated) {
            const cached = await dbGet('worldDerived', derivedId);
            if (cached)
                return cached.summary;
        }
        // 재생성
        const summary = summarizeWorld(world);
        const rec = {
            id: derivedId,
            bookId,
            worldVersion: world.version,
            summary,
            createdAt: Date.now()
        };
        await put('worldDerived', rec);
        set({ worldDerivedInvalidated: false });
        return summary;
    }
}));
