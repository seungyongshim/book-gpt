import { create } from 'zustand';
import { WorldSetting, WorldDerivedCache } from '../types/domain';
import { get as dbGet, put } from '../db/database';

interface WorldState {
  world?: WorldSetting;
  worldDerivedInvalidated: boolean;
  load: (bookId: string) => Promise<void>;
  save: (bookId: string, patch: Partial<WorldSetting>) => Promise<void>;
  invalidateDerived: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  world: undefined,
  worldDerivedInvalidated: false,
  load: async (bookId: string) => {
    const ws = await dbGet('worldSettings', bookId) as WorldSetting | undefined;
    if (ws) set({ world: ws });
  },
  save: async (bookId, patch) => {
    const prev = get().world || { bookId, version: 0, updatedAt: 0 } as WorldSetting;
    const next: WorldSetting = { ...prev, ...patch, bookId, version: prev.version + 1, updatedAt: Date.now() };
    await put('worldSettings', next);
    set({ world: next, worldDerivedInvalidated: true });
  },
  invalidateDerived: () => set({ worldDerivedInvalidated: true })
}));
