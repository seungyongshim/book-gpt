import { create } from 'zustand';
import { WorldSetting, WorldDerivedCache } from '../types/domain';
import { get as dbGet, put } from '../db/database';
import { summarizeWorld } from '../utils/promptAssembler';

interface WorldState {
  world?: WorldSetting;
  worldDerivedInvalidated: boolean;
  load: (bookId: string) => Promise<WorldSetting>;
  save: (bookId: string, patch: Partial<WorldSetting>) => Promise<void>;
  invalidateDerived: () => void;
  getWorldDerived: (bookId: string) => Promise<string | undefined>;
}

export const useWorldStore = create<WorldState>((set: (partial: any, replace?: boolean)=>void, get: ()=>WorldState) => ({
  world: undefined,
  worldDerivedInvalidated: false,
  load: async (bookId: string) => {
    let ws = await dbGet('worldSettings', bookId) as WorldSetting | undefined;
    if (!ws) {
      // 존재하지 않으면 초기 레코드 생성 (TODO 항목 처리: worldStore.load 실패 정책)
      ws = { bookId, premise: '', version: 0, updatedAt: Date.now() } as WorldSetting;
      await put('worldSettings', ws);
    }
    set({ world: ws });
    return ws;
  },
  save: async (bookId: string, patch: Partial<WorldSetting>) => {
    let prev = get().world;
    if (!prev || prev.bookId !== bookId) {
      // fetch from DB to ensure correct latest version
      prev = (await dbGet('worldSettings', bookId)) as WorldSetting | undefined;
    }
    prev = prev || { bookId, version: 0, updatedAt: 0 } as WorldSetting;
    const next: WorldSetting = { ...prev, ...patch, bookId, version: prev.version + 1, updatedAt: Date.now() };
    await put('worldSettings', next);
    set({ world: next, worldDerivedInvalidated: true });
  },
  invalidateDerived: () => set({ worldDerivedInvalidated: true }),
  getWorldDerived: async (bookId: string) => {
    const st = get();
    const world = st.world && st.world.bookId === bookId ? st.world : undefined;
    if (!world) return undefined;
    const derivedId = `${bookId}:${world.version}`;
    if (!st.worldDerivedInvalidated) {
      const cached = await dbGet('worldDerived', derivedId) as WorldDerivedCache | undefined;
      if (cached) return cached.summary;
    }
    // 재생성
    const summary = summarizeWorld(world);
    const rec: WorldDerivedCache = {
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
