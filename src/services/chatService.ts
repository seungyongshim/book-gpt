import { ChatMessage, UsageInfo } from './types';
import OpenAI from 'openai';
import { executeTool, formatToolResultForAssistant, getRegisteredTools } from './toolService';
import { accumulateToolCalls, finalizeToolCalls, ToolCallMeta } from './toolCallAccumulator';

export interface ChatServiceConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export class ChatService {
  private client: OpenAI;
  private timeout: number;
  private baseUrl?: string;

  private static readonly MAX_TOOL_ITERATIONS = 100;

  constructor(config: ChatServiceConfig = {}) {
    this.timeout = config.timeout || 5 * 60 * 1000;
  this.baseUrl = config.baseUrl || undefined;

    this.client = new OpenAI({
      apiKey: config.apiKey || (typeof window !== 'undefined' ? (window as any).__OPENAI_KEY__ : undefined) || 'sk-place-holder',
      baseURL: this.baseUrl,
      dangerouslyAllowBrowser: true,
    });
  }

  async getModels(): Promise<string[]> {
    try {
      const res = await this.client.models.list();
      const data = (res as any)?.data || [];
      const ids = Array.isArray(data) ? data.map((m: any) => m.id).filter((x: any) => typeof x === 'string') : [];
      return Array.from(new Set(ids));
    } catch (e) {
      console.warn('Failed to fetch models via OpenAI SDK, returning fallback list.', e);
      return ['gpt-4o'];
    }
  }

  async* getResponseStreaming(
    history: ChatMessage[],
    model: string,
    temperature: number = 1.0,
    _maxTokens?: number,
    signal?: AbortSignal,
    callbacks?: { onToolCalls?: (toolCalls: { id?: string; name: string; arguments: string }[]) => void }
  ): AsyncIterable<string> {
    if (!model) throw new Error('model is required');

    const sanitizeHistory = (msgs: ChatMessage[]): ChatMessage[] => {
      const toolIds = new Set<string>();
      msgs.forEach(m => { if (m.role === 'tool' && m.toolCallId) toolIds.add(m.toolCallId); });
      const cleaned = msgs.map(m => {
        if (m.role === 'assistant' && m.toolCalls?.length) {
          const filtered = m.toolCalls.filter(tc => tc.id && toolIds.has(tc.id));
          if (filtered.length !== m.toolCalls.length) {
            console.warn('[chatService] Stripped orphan tool_calls from assistant message:', {
              original: m.toolCalls.map(tc => tc.id),
              kept: filtered.map(tc => tc.id)
            });
          }
          if (!filtered.length) {
            const { toolCalls, ...rest } = m as any;
            return { ...rest } as ChatMessage; // toolCalls 제거
          }
          return { ...m, toolCalls: filtered };
        }
        return m;
      });
      return cleaned;
    };

    history = sanitizeHistory(history);

    const toApiMessages = (msgs: ChatMessage[]) => msgs.map(m => {
      if (m.role === 'tool') {
        return { role: 'tool', content: m.text, tool_call_id: m.toolCallId } as any;
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
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
      return { role: m.role, content: m.text } as any;
    });

  let workingMessages = [...history];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const combinedSignal = signal ? this.combineSignals([signal, controller.signal]) : controller.signal;

    try {
  const aggregateToolCalls: { id?: string; name: string; arguments: string }[] = [];
  for (let iteration = 0; iteration < ChatService.MAX_TOOL_ITERATIONS; iteration++) {
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
            const piece = delta.content;
            assistantAccum += piece;
            yield piece;
            await this.sleep(3);
          }
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
          const finalized = toolCallsMeta.map(tc => ({ id: tc.id, name: tc.name, arguments: tc.args }));
          aggregateToolCalls.push(...finalized);
          // 콜백으로 즉시 알림 (UI에서 배지 표시 업데이트 가능)
          callbacks?.onToolCalls?.(aggregateToolCalls);
          workingMessages.push({ role: 'assistant', text: assistantAccum, toolCalls: finalized });

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
    if (!this.baseUrl) return null;
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
    for (const s of signals) {
      if (s.aborted) controller.abort();
      else s.addEventListener('abort', onAbort);
    }
    controller.signal.addEventListener('abort', () => signals.forEach(s => s.removeEventListener('abort', onAbort)));
    return controller.signal;
  }

  private sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
}

export const chatService = new ChatService({ baseUrl: 'http://localhost:4141' });