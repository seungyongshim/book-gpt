import { useCallback, useRef, useState } from 'react';
import { PromptLayer } from '../types/domain';
import { ChatMessage, createChatStream, StreamEvent } from '../services/gptClient';
import { estimateCompletionTokens } from '../utils/promptAssembler';

export interface UseGPTStreamConfig {
  model?: string;
  temperature?: number;
  baseUrl?: string;
  apiKey?: string;
  directMessages?: boolean; // if true, pass messages directly
}

export interface UseGPTStreamResult {
  text: string;
  running: boolean;
  error: string | null;
  start: (input: PromptLayer | ChatMessage[]) => void;
  abort: () => void;
  reset: () => void;
  tokensApprox: number; // naive char -> token approximation for quick UI meter
}

// Use shared estimation helper (legacy char->token heuristic)
function estimateTokensFromChars(chars: number) { return estimateCompletionTokens(chars); }

export function useGPTStream(cfg?: UseGPTStreamConfig): UseGPTStreamResult {
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokensApprox, setTokensApprox] = useState(0);
  const controllerRef = useRef<{ abort: () => void } | null>(null);

  const abort = useCallback(()=>{
    controllerRef.current?.abort();
    setRunning(false);
  }, []);

  const reset = useCallback(()=>{
    setText(''); setError(null); setTokensApprox(0); setRunning(false);
  }, []);

  const start = useCallback((input: PromptLayer | ChatMessage[]) => {
    if (running) return; // ignore parallel
    setText(''); setError(null); setTokensApprox(0); setRunning(true);
    controllerRef.current = createChatStream(input, (ev: StreamEvent) => {
      if (ev.delta) {
        setText(prev => { const next = prev + ev.delta; setTokensApprox(estimateTokensFromChars(next.length)); return next; });
      }
      if (ev.error && !ev.delta) {
        setError(ev.error);
      }
      if (ev.done) {
        setRunning(false);
      }
    }, { model: cfg?.model, temperature: cfg?.temperature, baseUrl: cfg?.baseUrl, apiKey: cfg?.apiKey, directMessages: cfg?.directMessages });
  }, [cfg, running]);

  return { text, running, error, start, abort, reset, tokensApprox };
}

export default useGPTStream;
