import { PromptLayer } from '../types/domain';
import { promptLayerToMessages } from '../utils/promptToMessages';

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export interface StreamEvent {
  delta?: string;        // incremental content
  done?: boolean;        // end of stream
  error?: string;        // error classification / message
  raw?: any;             // raw JSON chunk (optional debug)
}

export interface StreamOptions {
  model?: string;
  temperature?: number;
  baseUrl?: string;          // override base (default env or localhost)
  apiKey?: string;           // explicit key override (else env)
  signal?: AbortSignal;
  /** If true, pass messages as-is; if false (default) treat input as PromptLayer */
  directMessages?: boolean;
}

export type StreamCallback = (ev: StreamEvent) => void;

const DEFAULT_MODEL = 'gpt-4o-mini';

function classifyError(status: number | undefined, body: any): string {
  if (!status) return 'network-error';
  if (status === 401) return 'auth';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'server';
  return body?.error?.type || 'unknown';
}

export async function streamChat(input: PromptLayer | ChatMessage[], onEvent: StreamCallback, opts?: StreamOptions) {
  const base = opts?.baseUrl || (import.meta as any).env?.VITE_OPENAI_BASE_URL || 'http://localhost:4141/v1';
  const apiKey = opts?.apiKey || (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const url = base.replace(/\/$/, '') + '/chat/completions';
  const messages: ChatMessage[] = Array.isArray(input) && opts?.directMessages
    ? input as ChatMessage[]
    : (promptLayerToMessages(input as PromptLayer) as ChatMessage[]);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: opts?.model || DEFAULT_MODEL,
        temperature: opts?.temperature ?? 0.8,
        stream: true,
        messages
      }),
      signal: opts?.signal
    });
    if (!res.ok || !res.body) {
      let bodyJson: any = undefined;
      try { bodyJson = await res.json(); } catch { /* noop */ }
      const cat = classifyError(res.status, bodyJson);
      onEvent({ done: true, error: cat });
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      if (opts?.signal?.aborted) return; // abort silently
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          onEvent({ done: true });
          return;
        }
        try {
          const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) onEvent({ delta: content, raw: json });
        } catch { /* ignore */ }
      }
    }
    onEvent({ done: true });
  } catch (e: any) {
    if (opts?.signal?.aborted) {
      onEvent({ done: true, error: 'aborted' });
    } else {
      onEvent({ done: true, error: e?.message || 'unknown' });
    }
  }
}

export interface StreamController {
  abort: () => void;
}

export function createChatStream(input: PromptLayer | ChatMessage[], onEvent: StreamCallback, opts?: Omit<StreamOptions, 'signal'>): StreamController {
  const controller = new AbortController();
  streamChat(input, onEvent, { ...opts, signal: controller.signal });
  return {
    abort: () => controller.abort()
  };
}
