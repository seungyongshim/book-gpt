import { useState, useCallback, useRef } from 'react';
import { PromptLayer } from '../types/domain';
import { generatePage } from '../services/gpt';
import { usePagesStore } from '../stores/pagesStore';
import { summarizeForReference, totalPromptTokens } from '../utils/promptAssembler';
import { updateCalibrationWithSample, saveCalibration } from '../utils/calibration';

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
  const promptEstimated = totalPromptTokens(layer); // 생성 호출 시점 추정 (프롬프트)
    try {
      await generatePage(layer, async c => {
        if (c.done) {
          // Completion 토큰 근사 (문자 길이 기반) - 추후 실제 usage 통합 시 교체
          const completionApprox = Math.max(1, Math.round(buffer.length * 0.95));
          const totalApprox = promptEstimated + completionApprox;
          // 페이지 저장 (분리 필드 + 레거시)
          await pagesStore.updatePage(pageId, { 
            rawContent: buffer,
            tokensPrompt: promptEstimated,
            tokensCompletion: completionApprox,
            tokensUsed: totalApprox
          });
          const sum = summarizeForReference(buffer).slice(0, 400);
          await pagesStore.updatePage(pageId, { summary: sum });
          await pagesStore.addVersion(pageId, buffer, 'system');
          // === Calibration 업데이트 ===
          const ratio = totalApprox / (promptEstimated + completionApprox || 1);
          updateCalibrationWithSample(ratio);
          await saveCalibration();
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
