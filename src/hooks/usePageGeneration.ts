import { useState, useCallback, useRef } from 'react';
import { PromptLayer } from '../types/domain';
import { generatePage } from '../services/gpt';
import { usePagesStore } from '../stores/pagesStore';
import { summarizeForReference } from '../utils/promptAssembler';

export function usePageGeneration() {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pagesStore = usePagesStore();
  const [lastSavedLen, setLastSavedLen] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const run = useCallback(async (pageId: string, layer: PromptLayer) => {
    setOutput('');
    setRunning(true);
    setError(null);
    setLastSavedLen(0);
    const controller = new AbortController();
    controllerRef.current = controller;
    let buffer = '';
    try {
      await generatePage(layer, async c => {
        if (c.done) {
          // 최종 저장 + summary + version
            await pagesStore.updatePage(pageId, { rawContent: buffer, tokensUsed: buffer.length });
            const sum = summarizeForReference(buffer).slice(0, 400);
            await pagesStore.updatePage(pageId, { summary: sum });
            await pagesStore.addVersion(pageId, buffer, 'system');
          setRunning(false);
        } else {
          buffer += c.text;
          setOutput((prev: string) => prev + c.text);
          if (buffer.length - lastSavedLen >= 2000) {
            await pagesStore.updatePage(pageId, { rawContent: buffer });
            setLastSavedLen(buffer.length);
          }
        }
      }, controller.signal);
    } catch (e: any) {
      setError(e.message || '생성 오류');
      setRunning(false);
    }
  }, [pagesStore, lastSavedLen]);
  const abort = useCallback(()=>{
    controllerRef.current?.abort();
    setRunning(false);
  }, []);

  return { output, running, error, run, abort };
}
