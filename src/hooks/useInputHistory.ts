import { useCallback, useEffect, useRef, useState } from 'react';
import { getCachedRecent, recordInput } from '../services/inputHistoryRepository';

export interface InputHistoryController {
  ready: boolean;
  prev: () => string | null; // 이전(과거로 이동) -> 더 오래된 입력
  next: () => string | null; // 다음(현재로 이동) -> 최신 방향
  resetPointer: () => void;
  record: (content: string) => Promise<void>;
  isNavigating: () => boolean; // 현재 히스토리 탐색 모드 여부
}

// 내부 캐싱된 리스트는 최신이 index 0
export function useInputHistory(): InputHistoryController {
  const [ready, setReady] = useState(false);
  const historyRef = useRef<string[]>([]);
  const pointerRef = useRef<number>(-1); // -1 => 현재 입력 (빈 상태)

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await getCachedRecent();
        if (!cancelled) {
          historyRef.current = items; // items already 최신순
          setReady(true);
        }
      } catch (e) {
        console.warn('[useInputHistory] preload failed', e);
        if (!cancelled) setReady(true); // fallback ready
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const resetPointer = useCallback(() => {
    pointerRef.current = -1;
  }, []);

  const prev = useCallback(() => {
    if (!ready) return null;
    const list = historyRef.current;
    if (pointerRef.current + 1 < list.length) {
      pointerRef.current += 1;
      return list[pointerRef.current];
    }
    return list[pointerRef.current] ?? null; // 끝에 도달 시 그대로 유지
  }, [ready]);

  const next = useCallback(() => {
    if (!ready) return null;
    const list = historyRef.current;
    if (pointerRef.current === -1) return null; // 이미 현재 위치
    if (pointerRef.current - 1 >= 0) {
      pointerRef.current -= 1;
      return list[pointerRef.current];
    } else {
      pointerRef.current = -1;
      return ''; // 빈 입력으로 복귀
    }
  }, [ready]);

  const record = useCallback(async (content: string) => {
    await recordInput(content);
    // 캐시 즉시 반영: recordInput 내부가 recentCache 업데이트 수행
    // 여기서는 historyRef 재동기화 필요
    const list = await getCachedRecent();
    historyRef.current = list;
    resetPointer();
  }, [resetPointer]);

  const isNavigating = useCallback(() => pointerRef.current !== -1, []);

  return { ready, prev, next, resetPointer, record, isNavigating };
}
