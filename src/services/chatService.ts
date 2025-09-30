import { ChatMessage, UsageInfo } from './types';
import OpenAI from 'openai';
import type { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';
import { executeTool, formatToolResultForAssistant, getRegisteredTools, setChatServiceInstance } from './toolService';
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

    // Register this instance for tool use
    setChatServiceInstance(this);
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
    callbacks?: { onToolCalls?: (toolCalls: { id?: string; name: string; arguments: string }[]) => void },
    enableTools: boolean = true
  ): AsyncIterable<string> {
    if (!model) throw new Error('model is required');

    const sanitizeHistory = (msgs: ChatMessage[]): ChatMessage[] => {
      const toolIds = new Set<string>();
      msgs.forEach(m => { if (m.role === 'tool' && m.toolCallId) toolIds.add(m.toolCallId); });
      return msgs.map(m => {
        if (m.role === 'assistant' && m.toolCalls?.length) {
          const filtered = m.toolCalls.filter(tc => tc.id && toolIds.has(tc.id));
            if (!filtered.length) {
              const { toolCalls, ...rest } = m as any;
              return { ...rest } as ChatMessage;
            }
            if (filtered.length !== m.toolCalls.length) {
              console.warn('[chatService] Stripped orphan tool_calls from assistant message:', {
                original: m.toolCalls.map(tc => tc.id),
                kept: filtered.map(tc => tc.id)
              });
            }
            return { ...m, toolCalls: filtered };
        }
        return m;
      });
    };

    history = sanitizeHistory(history);

    const toApiMessages = (msgs: ChatMessage[]) => msgs.map(m => {
      if (m.role === 'tool') return { role: 'tool', content: m.text, tool_call_id: m.toolCallId } as any;
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant',
          content: m.text || null,
          tool_calls: m.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } }))
        } as any;
      }
      return { role: m.role, content: m.text } as any;
    });

  let workingMessages = [...history];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const combinedSignal = signal ? this.combineSignals([signal, controller.signal]) : controller.signal;

    try {
      type AggregatedToolCall = { id?: string; name: string; arguments: string };
      const aggregateToolCalls: AggregatedToolCall[] = [];

      const assertNotAborted = () => {
        if (combinedSignal.aborted) throw new Error('Request was cancelled');
      };

      const finalizeAndExecuteToolCalls = async (iteration: number, assistantAccum: string, toolCallsMeta: ToolCallMeta[]) => {
        const finalizedMeta = finalizeToolCalls(toolCallsMeta, iteration);
        const finalized = finalizedMeta.map(tc => ({ id: tc.id, name: tc.name, arguments: tc.args }));
        aggregateToolCalls.push(...finalized);
        callbacks?.onToolCalls?.(aggregateToolCalls);
        workingMessages.push({ role: 'assistant', text: assistantAccum, toolCalls: finalized });
        for (const meta of finalizedMeta) {
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
      };

      for (let iteration = 0; iteration < ChatService.MAX_TOOL_ITERATIONS; iteration++) {
        assertNotAborted();

        const createParams: ChatCompletionCreateParamsStreaming = {
          model,
          temperature,
          messages: toApiMessages(workingMessages) as any,
          stream: true
        };

        if (enableTools) {
          (createParams as any).tools = await getRegisteredTools();
          (createParams as any).tool_choice = 'auto';
        }

        const chatStream = await this.client.chat.completions.create(createParams);

  let assistantAccum = '';
  let toolCallsMeta: ToolCallMeta[] = [];
  let toolCallNewlineInjected = false; // 최초 tool_call 감지 후 개행 1회만 스트리밍

        for await (const part of chatStream) {
          assertNotAborted();
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
            const beforeLen = toolCallsMeta.length;
            toolCallsMeta = accumulateToolCalls(toolCallsMeta, delta.tool_calls as any, iteration);
            // 최초 tool_call 감지되고 아직 개행을 안 넣었으면 개행 스트리밍
            if (!toolCallNewlineInjected && beforeLen === 0 && toolCallsMeta.length > 0) {
              assistantAccum += '\n';
              toolCallNewlineInjected = true;
              yield '\n';
            }
          }
          if (choice.finish_reason) break;
        }

        if (toolCallsMeta.length > 0) {
          await finalizeAndExecuteToolCalls(iteration, assistantAccum, toolCallsMeta);
          continue;
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
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const usageInfo: UsageInfo = {};
      const premium = data.quota_snapshots?.premium_interactions;
      if (premium) {
        if (typeof premium.remaining === 'number') usageInfo.premiumRequestsLeft = premium.remaining;
        if (typeof premium.entitlement === 'number') usageInfo.totalPremiumRequests = premium.entitlement;
        if (usageInfo.totalPremiumRequests != null && usageInfo.premiumRequestsLeft != null) {
          usageInfo.premiumRequestsUsed = usageInfo.totalPremiumRequests - usageInfo.premiumRequestsLeft;
        }
      }
      return usageInfo;
    } catch (e) {
      console.warn('Failed to load usage info', e);
      return null;
    } finally {
      clearTimeout(timeoutId);
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