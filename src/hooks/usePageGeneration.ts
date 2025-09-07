import { useState, useCallback, useRef } from 'react';
import { PromptLayer, GenerationConfig } from '../types/domain';
import { generatePage } from '../services/gpt';
import { usePagesStore } from '../stores/pagesStore';
import { summarizeForReference, totalPromptTokens } from '../utils/promptAssembler';
import { updateCalibrationWithSample, saveCalibration } from '../utils/calibration';

export function usePageGeneration() {
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetChars, setTargetChars] = useState<number>(12000);
  const [promptTokens, setPromptTokens] = useState<number>(0);
  const [completionChars, setCompletionChars] = useState<number>(0);
  const [finalized, setFinalized] = useState(false);
  const pagesStore = usePagesStore();
  const [lastSavedLen, setLastSavedLen] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const latestLayerRef = useRef<PromptLayer | null>(null);
  const baseContinuationRef = useRef<string>('');

  const finalizeAndPersist = useCallback(async (pageId: string, buffer: string, promptEstimated: number) => {
    // Completion 토큰 근사 (문자 길이 기반) - 추후 실제 usage 통합 시 교체
    const completionApprox = Math.max(1, Math.round(buffer.length * 0.95));
    const totalApprox = promptEstimated + completionApprox;
    await pagesStore.updatePage(pageId, { 
      rawContent: buffer,
      tokensPrompt: promptEstimated,
      tokensCompletion: completionApprox,
      tokensUsed: totalApprox
    });
    const sum = summarizeForReference(buffer).slice(0, 400);
    await pagesStore.updatePage(pageId, { summary: sum });
    await pagesStore.addVersion(pageId, buffer, 'system');
    const ratio = totalApprox / (promptEstimated + completionApprox || 1);
    updateCalibrationWithSample(ratio);
    await saveCalibration();
  }, [pagesStore]);

  const run = useCallback(async (pageId: string, layer: PromptLayer, cfg?: Partial<GenerationConfig>) => {
    setOutput('');
    setRunning(true);
    setError(null);
    setLastSavedLen(0);
    setFinalized(false);
    const controller = new AbortController();
    controllerRef.current = controller;
    latestLayerRef.current = layer;
    const promptEstimated = totalPromptTokens(layer);
    setPromptTokens(promptEstimated);
  const tChars = cfg?.targetChars ?? targetChars;
    setTargetChars(tChars);
    let buffer = '';
    baseContinuationRef.current = '';
    try {
  await generatePage(layer, async c => {
        if (c.done) {
          if (!finalized) {
            await finalizeAndPersist(pageId, buffer, promptEstimated);
            setFinalized(true);
          }
          setRunning(false);
        } else {
          buffer += c.text;
          setCompletionChars(buffer.length);
          setOutput(prev => prev + c.text);
          // 자동 저장 (2,000자 단위)
            if (buffer.length - lastSavedLen >= 2000) {
              await pagesStore.updatePage(pageId, { rawContent: buffer });
              setLastSavedLen(buffer.length);
            }
          // 목표 길이 초과 감시 (2% 여유)
          if (!finalized && buffer.length >= tChars * 1.02) {
            controllerRef.current?.abort();
            await finalizeAndPersist(pageId, buffer, promptEstimated);
            setFinalized(true);
            setRunning(false);
          }
        }
  }, controller.signal, { config: { targetChars: tChars, ...(cfg||{}) } });
    } catch (e: any) {
      if (!finalized) setError(e.message || '생성 오류');
      setRunning(false);
    }
  }, [pagesStore, lastSavedLen, finalizeAndPersist, finalized]);

  const abort = useCallback(()=>{
    controllerRef.current?.abort();
    setRunning(false);
  }, []);

  // Extend: 추가 생성 (미완성 본문일 때만)
  const extend = useCallback(async (pageId: string, extraChars = 4000) => {
    if (running || !latestLayerRef.current) return;
    const baseText = output;
    const tail = baseText.slice(-800); // 마지막 800자 맥락
    const layer = { ...latestLayerRef.current, userInstruction: (latestLayerRef.current.userInstruction || '') + `\n\n이전 내용의 스타일과 연속성을 유지하여 이어서 작성: ${tail}` };
    await run(pageId, layer, { targetChars: output.length + extraChars });
  }, [run, output, running]);

  const progressRatio = targetChars ? Math.min(1, completionChars / targetChars) : 0;
  const canExtend = !running && !finalized && completionChars < targetChars * 0.9;

  return {
    output,
    running,
    error,
    run,
    abort,
    extend,
    progressRatio,
    promptTokens,
    completionChars,
    targetChars,
    canExtend
  };
}
