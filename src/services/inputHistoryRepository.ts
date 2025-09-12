import { addHistory, getRecent, pruneOld, countAll } from './historyDB';

// 구성 상수
export const INPUT_HISTORY_MAX = 300; // 저장 상한
export const INPUT_HISTORY_PRELOAD = 200; // 훅 최초 로드시 메모리에 가져올 개수

// 최근 항목 캐시 (메모리) - 최신이 index 0
let recentCache: string[] | null = null;
let loadingPromise: Promise<string[]> | null = null;

async function ensureCache(): Promise<string[]> {
  if (recentCache) return recentCache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const rows = await getRecent(INPUT_HISTORY_PRELOAD);
    recentCache = rows.map(r => r.content);
    return recentCache;
  })();
  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export async function recordInput(content: string): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;
  await addHistory(trimmed);
  // prune + cache update
  pruneOld(INPUT_HISTORY_MAX).catch(() => {});
  if (recentCache) {
    if (recentCache[0] !== trimmed) {
      // 중복 제거 후 맨 앞 삽입
      recentCache = [trimmed, ...recentCache.filter(v => v !== trimmed)];
      if (recentCache.length > INPUT_HISTORY_PRELOAD) recentCache.length = INPUT_HISTORY_PRELOAD;
    }
  }
}

export async function getCachedRecent(): Promise<string[]> {
  return ensureCache();
}

export async function getTotalCount(): Promise<number> {
  return countAll();
}

export function invalidateHistoryCache() {
  recentCache = null;
}
