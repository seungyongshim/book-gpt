import { create } from 'zustand';
import { clearModelCache } from '../services/models';
import { getModelInfos, clearModelInfosCache } from '../services/gptCommon';
import type { ModelInfo } from '../types/domain';

interface ModelsState {
  models: string[];           // legacy flat list
  modelInfos: ModelInfo[];    // enriched metadata
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetch: (opts?: { force?: boolean }) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useModelsStore = create<ModelsState>((set, get) => ({
  models: [],
  modelInfos: [],
  loading: false,
  error: null,
  lastFetched: null,
  fetch: async (opts) => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const infos = await getModelInfos({ force: opts?.force });
      set({ models: infos.map(i=>i.id), modelInfos: infos, loading: false, error: null, lastFetched: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'fetch-failed' });
    }
  },
  refresh: async () => {
    clearModelCache();
    clearModelInfosCache();
    await get().fetch({ force: true });
  }
}));

// Convenience hook (thin wrapper) if a component only needs consumption.
export function useModels() {
  const { models, modelInfos, loading, error, fetch, refresh, lastFetched } = useModelsStore();
  return { models, modelInfos, loading, error, fetch, refresh, lastFetched };
}
