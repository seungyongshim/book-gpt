import React, { useState, useEffect, useCallback, useRef } from 'react';
import useGPTStream from '../hooks/useGPTStream';
import { PromptLayer } from '../types/domain';
import { useModels } from '../stores/modelsStore';
import { getModelInfo } from '../services/gptCommon';
import { ChatMessage } from '../services/gptClient';

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
  /** Initial model (overrides global default) */
  defaultModel?: string;
  /** Allow user to pick different models (supply list). If omitted, hide selector. */
  modelOptions?: string[];
  /** Initial temperature (0-2 typical) */
  defaultTemperature?: number;
  /** Show temperature slider (if false, hide) */
  showTemperature?: boolean;
  /** Callback when model/temperature changed (optional analytics) */
  onConfigChange?: (cfg: { model: string; temperature: number }) => void;
  /** Enable chat style interaction instead of single instruction generation */
  chatMode?: boolean;
  /** Optional system message for chat (not shown in transcript) */
  chatSystem?: string;
  /** Initial chat messages (user/assistant only). System is provided via chatSystem */
  initialMessages?: ChatMessage[];
  /** Callback whenever messages array changes */
  onMessagesChange?: (messages: ChatMessage[]) => void;
  /** Strategy for apply in chat mode: last assistant or merged. (default 'last') */
  chatApplyStrategy?: 'last' | 'allAssistantMerged';
  /** Placeholder for chat input */
  chatInputPlaceholder?: string;
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
  showTokenApprox = false,
  defaultModel = 'gpt-4o-mini',
  modelOptions = ['gpt-4o-mini','gpt-4o','gpt-4.1-mini','gpt-4.1'],
  defaultTemperature = 0.8,
  showTemperature = true,
  onConfigChange,
  chatMode = false,
  chatSystem,
  initialMessages = [],
  onMessagesChange,
  chatApplyStrategy = 'last',
  chatInputPlaceholder = '메시지를 입력하고 Enter를 눌러 전송'
}) => {
  const { models, modelInfos, loading: modelsLoading, error: modelsError, fetch: fetchModels, refresh: refreshModels } = useModels();
  const [model, setModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemperature);
  const userOverrodeTempRef = useRef(false);
  const gpt = useGPTStream({ model, temperature, directMessages: chatMode });
  const [instruction, setInstruction] = useState(initialInstruction);
  const [started, setStarted] = useState(false);
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages.map(m => ({ ...m })));
  const [chatInput, setChatInput] = useState('');
  const prevRunningRef = useRef(false);

  // propagate messages externally
  useEffect(()=>{ if (chatMode) onMessagesChange?.(messages); }, [messages, chatMode, onMessagesChange]);

  const start = useCallback(()=>{
    if (chatMode) return; // in chat mode we don't use single-instruction start
    const prompt = buildPrompt(instruction, seed);
    gpt.start(prompt as any);
    setStarted(true);
  }, [instruction, seed, buildPrompt, gpt, chatMode]);

  // Chat: send user message and start assistant streaming
  const sendChat = useCallback(() => {
    if (!chatMode) return;
    const content = chatInput.trim();
    if (!content) return;
    const newUser: ChatMessage = { role: 'user', content };
    const nextMessages = [...messages, newUser];
    setMessages(nextMessages);
    setChatInput('');
    // Build full history with optional system
    const full: ChatMessage[] = chatSystem ? [{ role: 'system', content: chatSystem }, ...nextMessages] : nextMessages;
    gpt.start(full as any);
  }, [chatMode, chatInput, messages, gpt, chatSystem]);

  // Detect completion of streaming in chat mode to commit assistant message
  useEffect(()=>{
    if (!chatMode) return;
    const prev = prevRunningRef.current;
    if (prev && !gpt.running) {
      // finished
      if (gpt.text) {
        setMessages(prevMsgs => [...prevMsgs, { role: 'assistant', content: gpt.text }]);
      }
    }
    prevRunningRef.current = gpt.running;
  }, [gpt.running, gpt.text, chatMode]);

  // Emit config changes upward if requested
  useEffect(()=>{ onConfigChange?.({ model, temperature }); }, [model, temperature, onConfigChange]);

  // When model changes, if user hasn't manually overridden temp, adopt model recommended temp
  useEffect(()=>{
    const info = modelInfos.find(m=>m.id===model);
    if (info && info.recTemp != null && !userOverrodeTempRef.current) {
      setTemperature(info.recTemp);
    }
  }, [model, modelInfos]);

  useEffect(()=>{ if (autoStart && !started) start(); }, [autoStart, started, start]);

  // Load models on mount (only once per app due to store caching)
  useEffect(()=>{ if (!models.length && !modelsLoading) fetchModels(); }, [models.length, modelsLoading, fetchModels]);

  // Choose dynamic list if available; fallback to provided modelOptions prop
  const dynamicModelList = models.length ? models : modelOptions;
  // Ensure current selected model stays in list
  useEffect(()=>{
    if (!dynamicModelList.includes(model) && dynamicModelList.length) {
      setModel(dynamicModelList[0]);
    }
  }, [dynamicModelList, model]);

  const disabled = gpt.running || modelsLoading;
  const baseCls = compact ? 'text-[11px]' : 'text-sm';

  return (
    <div className={`border border-border rounded-md bg-surfaceAlt flex flex-col ${compact ? 'p-2 gap-2' : 'p-3 gap-3'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h4>
            <div className="flex items-center gap-2">
              {showTokenApprox && <span className="text-[10px] text-text-dim">~{gpt.tokensApprox}tok</span>}
              {gpt.running && allowAbort && <button onClick={gpt.abort} className="text-[10px] px-2 py-0.5 rounded bg-warn/20 text-warn">중단</button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dynamicModelList?.length ? (
              <label className="flex items-center gap-1 text-[10px]">
                <span className="text-text-dim">Model</span>
                <select
                  className="bg-surface border border-border rounded px-1 py-0.5 text-[10px]"
                  value={model}
                  onChange={e=>setModel(e.target.value)}
                  disabled={gpt.running || modelsLoading}
                  title={(() => { const info = modelInfos.find(mi=>mi.id===model); return info ? `${info.id}\nctx: ${info.contextWindow || '?'} tokens${info.recTemp!=null ? `\nrecTemp: ${info.recTemp}`:''}` : model; })()}
                >
                  {dynamicModelList.map(m=> {
                    const info = modelInfos.find(mi=>mi.id===m);
                    const label = info?.label || m;
                    return <option key={m} value={m}>{label}</option>;
                  })}
                </select>
                {modelsLoading && <span className="text-[9px] text-text-dim animate-pulse">로딩...</span>}
                {modelsError && <button type="button" className="text-[9px] text-error underline" onClick={()=>refreshModels()}>재시도</button>}
                {!modelsLoading && !modelsError && <button type="button" className="text-[9px] text-text-dim hover:text-text" onClick={()=>refreshModels()}>갱신</button>}
              </label>
            ) : null}
            {showTemperature && (
              <label className="flex items-center gap-1 text-[10px]">
                <span className="text-text-dim">Temp</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={temperature}
                  onChange={e=>{ userOverrodeTempRef.current = true; setTemperature(parseFloat(e.target.value)); }}
                  disabled={gpt.running}
                />
                <input
                  type="number"
                  className="w-14 bg-surface border border-border rounded px-1 py-0.5"
                  min={0}
                  max={2}
                  step={0.05}
                  value={temperature}
                  onChange={e=>{
                    const v = parseFloat(e.target.value); if (!isNaN(v)) { userOverrodeTempRef.current = true; setTemperature(Math.min(2, Math.max(0, v))); } }}
                  disabled={gpt.running}
                />
              </label>
            )}
          </div>
        </div>
      </div>
      {!chatMode && (
        <>
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
        </>
      )}
      {chatMode && (
        <div className="flex flex-col gap-2">
          <div className={`flex flex-col gap-2 border border-border rounded p-2 bg-surface min-h-[160px] max-h-80 overflow-auto ${compact ? 'text-[11px]' : 'text-xs'}`}
               aria-label="chat transcript">
            {messages.length === 0 && !gpt.running && <div className="text-text-dim text-[11px]">대화를 시작해 보세요.</div>}
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded px-2 py-1 max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-white' : 'bg-surfaceAlt border border-border text-text'}`}>
                  {m.role === 'assistant' && <span className="sr-only">Assistant: </span>}
                  {m.content}
                </div>
              </div>
            ))}
            {gpt.running && (
              <div className="flex justify-start">
                <div className="rounded px-2 py-1 max-w-[85%] bg-surfaceAlt border border-border whitespace-pre-wrap animate-pulse">
                  {gpt.text || '...'}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              className={`flex-1 resize-none rounded bg-surface border border-border p-2 outline-none focus:ring-1 focus:ring-primary ${baseCls}`}
              rows={compact ? 2 : 3}
              placeholder={chatInputPlaceholder}
              value={chatInput}
              onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); if(!gpt.running) sendChat(); } }}
              disabled={gpt.running}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={sendChat}
                disabled={gpt.running || !chatInput.trim()}
                className="px-3 py-1 rounded bg-primary text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >{gpt.running ? '...' : '전송'}</button>
              <button
                onClick={()=>{ gpt.reset(); setMessages(initialMessages); setChatInput(''); }}
                disabled={gpt.running || (messages.length===0)}
                className="px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40"
              >초기화</button>
              <button
                onClick={()=>{
                  const assistants = messages.filter(m=>m.role==='assistant');
                  if (!assistants.length) return;
                  const textToApply = chatApplyStrategy === 'allAssistantMerged'
                    ? assistants.map(a=>a.content).join('\n')
                    : assistants[assistants.length-1].content;
                  onApply(textToApply.trim());
                }}
                disabled={messages.every(m=>m.role!=='assistant')}
                className="px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40"
              >{applyLabel}</button>
            </div>
          </div>
        </div>
      )}
      {gpt.error && <div className="text-error text-[11px]">에러: {gpt.error}</div>}
    </div>
  );
};

export default GPTComposer;
