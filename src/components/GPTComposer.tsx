import React, { useState, useEffect, useCallback } from 'react';
import useGPTStream from '../hooks/useGPTStream';
import { PromptLayer } from '../types/domain';

export interface GPTComposerProps {
  /** Optional seed text (e.g., current field content) */
  seed?: string;
  /** Build a PromptLayer from the current user input + seed */
  buildPrompt: (userInstruction: string, seed?: string) => PromptLayer;
  /** Called when final text is applied */
  onApply: (text: string) => void;
  /** Optional label for apply button */
  applyLabel?: string;
  /** Compact mode (smaller padding / fonts) */
  compact?: boolean;
  /** Disable editing of instruction */
  readOnlyInstruction?: boolean;
  /** Custom header label */
  title?: string;
  /** Auto-start generation when mounted */
  autoStart?: boolean;
  /** Initial instruction text */
  initialInstruction?: string;
  /** Allow abort if running */
  allowAbort?: boolean;
  /** When true show tokens approx */
  showTokenApprox?: boolean;
}

/**
 * Reusable GPT generation panel (instruction + streaming output + apply) for any domain context.
 */
export const GPTComposer: React.FC<GPTComposerProps> = ({
  seed,
  buildPrompt,
  onApply,
  applyLabel = '적용',
  compact,
  readOnlyInstruction,
  title = 'AI Composer',
  autoStart,
  initialInstruction = '',
  allowAbort = true,
  showTokenApprox = false
}) => {
  const gpt = useGPTStream();
  const [instruction, setInstruction] = useState(initialInstruction);
  const [started, setStarted] = useState(false);

  const start = useCallback(()=>{
    const prompt = buildPrompt(instruction, seed);
    gpt.start(prompt as any);
    setStarted(true);
  }, [instruction, seed, buildPrompt, gpt]);

  useEffect(()=>{ if (autoStart && !started) start(); }, [autoStart, started, start]);

  const disabled = gpt.running;
  const baseCls = compact ? 'text-[11px]' : 'text-sm';

  return (
    <div className={`border border-border rounded-md bg-surfaceAlt flex flex-col ${compact ? 'p-2 gap-2' : 'p-3 gap-3'}`}>
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h4>
        <div className="flex items-center gap-2">
          {showTokenApprox && <span className="text-[10px] text-text-dim">~{gpt.tokensApprox}tok</span>}
          {gpt.running && allowAbort && <button onClick={gpt.abort} className="text-[10px] px-2 py-0.5 rounded bg-warn/20 text-warn">중단</button>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          className={`w-full resize-y rounded bg-surface border border-border p-2 outline-none focus:ring-1 focus:ring-primary ${baseCls}`}
          rows={compact ? 3 : 4}
          placeholder="AI에 줄 지시를 입력하세요"
          value={instruction}
          onChange={e=>setInstruction(e.target.value)}
          readOnly={readOnlyInstruction}
        />
        <div className="flex gap-2">
          <button
            disabled={disabled || !instruction.trim()}
            onClick={start}
            className="px-3 py-1 rounded bg-primary text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >{gpt.running ? '생성중...' : '생성'}</button>
          <button
            disabled={!gpt.text}
            onClick={()=>onApply(gpt.text.trim())}
            className="px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40"
          >{applyLabel}</button>
          <button
            disabled={!gpt.text && !instruction}
            onClick={()=>{ gpt.reset(); setInstruction(initialInstruction); setStarted(false); }}
            className="px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40"
          >초기화</button>
        </div>
      </div>
      <div className={`min-h-[80px] max-h-64 overflow-auto whitespace-pre-wrap rounded bg-surface p-2 border border-border ${compact ? 'text-[11px]' : 'text-xs'}`}>{gpt.text || (gpt.running ? '생성 중...' : '결과가 여기에 표시됩니다.')}</div>
      {gpt.error && <div className="text-error text-[11px]">에러: {gpt.error}</div>}
    </div>
  );
};

export default GPTComposer;
