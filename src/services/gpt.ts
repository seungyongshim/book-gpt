import { PromptLayer, StreamChunk, GenerationConfig } from '../types/domain';
import { promptLayerToMessages } from '../utils/promptToMessages';

interface GenerateOptions {
  config?: Partial<GenerationConfig>;
  /** 수동으로 baseUrl override */
  baseUrl?: string;
}

const DEFAULT_CONFIG: GenerationConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.8,
  targetChars: 12000
};

// PromptLayer -> OpenAI Chat messages 변환
const buildMessages = promptLayerToMessages;

function classifyError(status: number | undefined, body: any): string {
  if (!status) return 'network-error';
  if (status === 401) return 'auth';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'server';
  return body?.error?.type || 'unknown';
}

// SSE data: lines starting with 'data:'; '[DONE]' sentinel
export async function generatePage(layer: PromptLayer, onChunk: (c: StreamChunk) => void, signal?: AbortSignal, opts?: GenerateOptions) {
  const cfg = { ...DEFAULT_CONFIG, ...(opts?.config || {}) } as GenerationConfig;
  const base = opts?.baseUrl || (import.meta as any).env?.VITE_OPENAI_BASE_URL || 'http://localhost:4141/v1';
  const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const url = base.replace(/\/$/, '') + '/chat/completions';
  const messages = buildMessages(layer);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature,
        stream: true,
        messages
      }),
      signal
    });
    if (!res.ok || !res.body) {
      let bodyJson: any = undefined;
      try { bodyJson = await res.json(); } catch { /* ignore */ }
      const cat = classifyError(res.status, bodyJson);
      onChunk({ text: `\n[ERROR:${cat}] 요청 실패`, done: true });
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      if (signal?.aborted) return; // 조기 중단
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\n/);
      // 마지막 줄이 반쪽이면 유지
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          onChunk({ text: '', done: true });
          return;
        }
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk({ text: content });
        } catch {
          // ignore malformed chunk
        }
      }
    }
    onChunk({ text: '', done: true });
  } catch (e: any) {
    if (signal?.aborted) {
      onChunk({ text: '\n[중단됨]', done: true });
    } else {
      onChunk({ text: `\n[ERROR:${e?.name||'unknown'}] ${e?.message||''}`, done: true });
    }
  }
}

export function estimateCompletionTokens(targetChars: number) {
  // 한글 평균 0.7~1.2 토큰 → 보수 계수 0.9
  return Math.round(targetChars * 0.9);
}
