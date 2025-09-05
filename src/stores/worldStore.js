import { create } from 'zustand';
import { get as dbGet, put } from '../db/database';
export const useWorldStore = create((set, get) => ({
    world: undefined,
    worldDerivedInvalidated: false,
    load: async (bookId) => {
        const ws = await dbGet('worldSettings', bookId);
        if (ws)
            set({ world: ws });
    },
    save: async (bookId, patch) => {
        const prev = get().world || { bookId, version: 0, updatedAt: 0 };
        const next = { ...prev, ...patch, bookId, version: prev.version + 1, updatedAt: Date.now() };
        await put('worldSettings', next);
        set({ world: next, worldDerivedInvalidated: true });
    },
    invalidateDerived: () => set({ worldDerivedInvalidated: true })
}));
