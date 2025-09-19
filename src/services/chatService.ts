import { ChatMessage, UsageInfo } from './types';
import OpenAI from 'openai';
import { executeTool, formatToolResultForAssistant, getRegisteredTools } from './toolService';
import { accumulateToolCalls, finalizeToolCalls, ToolCallMeta } from './toolCallAccumulator';

export interface ChatServiceConfig {
  apiKey?: string; // 클라이언트단에서는 보통 사용하지 않음 (프록시 권장)
  baseUrl?: string; // OpenAI 호환 프록시 또는 기본 엔드포인트
  timeout?: number;
}

// OpenAI SDK 초기화는 브라우저 환경에서 직접 API Key 사용이 위험하므로
// baseUrl 로 프록시를 가정. (ex: 서버에서 Authorization 헤더를 주입)
// 여기서는 API Key 미지정 상태로 사용하고, 필요 시 헤더를 커스터마이즈.

export class ChatService {
  private client: OpenAI;
  private timeout: number;
  private baseUrl?: string; // usage / custom endpoints 용

  constructor(config: ChatServiceConfig = {}) {
    this.timeout = config.timeout || 5 * 60 * 1000;
    this.baseUrl = config.baseUrl || undefined; // OpenAI SDK 기본값 사용 또는 프록시

    this.client = new OpenAI({
      // apiKey 가 클라이언트에 노출되지 않도록 빈 값. 프록시 서버 필요.
      apiKey: config.apiKey || (typeof window !== 'undefined' ? (window as any).__OPENAI_KEY__ : undefined) || 'sk-place-holder',
      baseURL: this.baseUrl, // 프록시가 OpenAI 호환 라우트를 제공한다고 가정
      dangerouslyAllowBrowser: true,
    });
  }

  // 모델 목록 조회: SDK models.list 사용. 실패 시 빈 배열.
  async getModels(): Promise<string[]> {
    try {
      const res = await this.client.models.list();
      // @ts-ignore (SDK 타입 상 data 존재)
      const data = (res as any).data || [];
      const ids = Array.isArray(data) ? data.map((m: any) => m.id).filter((x: any) => typeof x === 'string') : [];
      return Array.from(new Set(ids));
    } catch (e) {
      console.warn('Failed to fetch models via OpenAI SDK, returning fallback list.', e);
      // 최소 한 개 기본 모델을 제공 (UI 안정성)
      return ['gpt-4o'];
    }
  }

  // 채팅 응답 스트리밍 (Responses API 우선, 실패 시 Chat Completions fallback)
  async* getResponseStreaming(
    history: ChatMessage[],
    model: string,
    temperature: number = 1.0,
    _maxTokens?: number,
    signal?: AbortSignal
  ): AsyncIterable<string> {
    if (!model) throw new Error('model is required');

    // ChatMessage -> OpenAI message 변환
    const toApiMessages = (msgs: ChatMessage[]) => msgs.map(m => {
      if (m.role === 'tool') {
        // tool 메시지는 반드시 직전에 assistant 가 tool_calls 를 포함한 뒤에 위치해야 함
        return {
          role: 'tool',
          content: m.text,
          tool_call_id: m.toolCallId,
        } as any;
      }
      if (m.role === 'assistant') {
        if (m.toolCalls && m.toolCalls.length > 0) {
          return {
            role: 'assistant',
            content: m.text || null,
            tool_calls: m.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments }
            }))
          } as any;
        }
      }
      return { role: m.role, content: m.text } as any;
    });

    let workingMessages = [...history];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const combinedSignal = signal ? this.combineSignals([signal, controller.signal]) : controller.signal;

    try {
      // 최대 5회 tool-call 루프 방지
      for (let iteration = 0; iteration < 5; iteration++) {
        if (combinedSignal.aborted) throw new Error('Request was cancelled');

        const chatStream = await this.client.chat.completions.create({
          model,
            temperature,
          messages: toApiMessages(workingMessages) as any,
          stream: true,
          tools: getRegisteredTools(),
          tool_choice: 'auto'
        });

  let assistantAccum = '';
  let toolCallsMeta: ToolCallMeta[] = [];

        for await (const part of chatStream) {
          if (combinedSignal.aborted) throw new Error('Request was cancelled');
          const choice = part.choices?.[0];
          if (!choice) continue;
          const delta = choice.delta;
          if (delta?.content) {
            assistantAccum += delta.content;
            yield delta.content;
            await new Promise(r => setTimeout(r, 3));
          }
          // tool_calls delta 수집
          if (delta?.tool_calls) {
            toolCallsMeta = accumulateToolCalls(toolCallsMeta, delta.tool_calls as any, iteration);
          }
          const finish = choice.finish_reason;
          if (finish) {
            break;
          }
        }

        if (toolCallsMeta.length > 0) {
          toolCallsMeta = finalizeToolCalls(toolCallsMeta, iteration);
          workingMessages.push({ role: 'assistant', text: assistantAccum, toolCalls: toolCallsMeta.map(tc => ({ id: tc.id, name: tc.name, arguments: tc.args })) });

          for (const meta of toolCallsMeta) {
            const execution = await executeTool(meta.name, meta.args);
            const toolResultText = formatToolResultForAssistant(meta.name, meta.id, execution);
            workingMessages.push({
              role: 'tool',
              text: toolResultText,
              toolName: meta.name,
              toolCallId: meta.id,
              toolArgumentsJson: meta.args
            });
          }
          continue; // next loop
        }
        // no tool calls: finalize
        if (assistantAccum.trim().length > 0) {
          workingMessages.push({ role: 'assistant', text: assistantAccum });
        }
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getUsage(): Promise<UsageInfo | null> {
    if (!this.baseUrl) return null; // 프록시 없으면 사용량 불가
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/usage`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const usageInfo: UsageInfo = {};
      if (data.quota_snapshots?.premium_interactions) {
        const premium = data.quota_snapshots.premium_interactions;
        if (typeof premium.remaining === 'number') usageInfo.premiumRequestsLeft = premium.remaining;
        if (typeof premium.entitlement === 'number') usageInfo.totalPremiumRequests = premium.entitlement;
        if (usageInfo.totalPremiumRequests != null && usageInfo.premiumRequestsLeft != null) {
          usageInfo.premiumRequestsUsed = usageInfo.totalPremiumRequests - usageInfo.premiumRequestsLeft;
        }
      }
      return usageInfo;
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn('Failed to load usage info', e);
      return null;
    }
  }

  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signals.forEach(s => {
      if (s.aborted) controller.abort(); else s.addEventListener('abort', onAbort);
    });
    controller.signal.addEventListener('abort', () => {
      signals.forEach(s => s.removeEventListener('abort', onAbort));
    });
    return controller.signal;
  }
}

export const chatService = new ChatService({ baseUrl: 'http://localhost:4141' });