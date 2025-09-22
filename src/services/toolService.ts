import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { StoredTool, ChatMessage } from './types';
import { StorageService } from './storageService';

export interface LocalToolDefinition {
  name: string;
  description: string;
  // JSON Schema (partial) for parameters (properties + required)
  parameters?: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  enabled: boolean;
  // 실행 함수
  execute: (args: any) => Promise<any> | any;
}

// GPT 호출을 위한 인터페이스
export interface GPTCallOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// GPT 호출 결과 인터페이스  
export interface GPTCallResult {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// chatService 인스턴스를 저장하기 위한 변수
let chatServiceInstance: any = null;

// ChatService 인스턴스를 설정하는 함수 (순환 의존성 방지)
export function setChatServiceInstance(chatService: any): void {
  chatServiceInstance = chatService;
}

// 도구 실행 환경에서 사용할 GPT 호출 함수
async function callGPT(options: GPTCallOptions): Promise<GPTCallResult> {
  if (!chatServiceInstance) {
    throw new Error('ChatService not available - GPT calling is not initialized');
  }

  const { messages, model = 'gpt-4o', temperature = 0.7, maxTokens } = options;
  
  try {
    let fullResponse = '';
    const stream = chatServiceInstance.getResponseStreaming(
      messages,
      model,
      temperature,
      maxTokens,
      undefined, // signal
      undefined  // callbacks
    );

    for await (const chunk of stream) {
      fullResponse += chunk;
    }

    return {
      content: fullResponse.trim(),
      usage: {
        // Note: Usage info would need to be provided by the chatService
        // This is a simplified implementation
      }
    };
  } catch (error) {
    throw new Error(`GPT call failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 저장된 도구를 LocalToolDefinition으로 변환하는 함수
function convertStoredToolToLocal(storedTool: StoredTool): LocalToolDefinition {
  return {
    name: storedTool.name,
    description: storedTool.description,
    parameters: storedTool.parameters,
    enabled: storedTool.enabled,
    execute: async (args: any) => {
      try {
        // 저장된 JavaScript 코드를 실행
        // GPT 호출 기능과 기타 유틸리티를 컨텍스트에 제공
        // async function으로 래핑하여 await 사용 가능하게 함
        const asyncExecuteFunction = new Function(
          'args', 
          'callGPT', 
          'console',
          `return (async () => { ${storedTool.executeCode} })()`
        );
        const result = asyncExecuteFunction(args, callGPT, console);
        
        // Promise 또는 일반 값 모두 처리
        return await Promise.resolve(result);
      } catch (error) {
        throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
}

// 도구 캐시
let toolsCache: LocalToolDefinition[] = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5000; // 5 seconds

// 도구 목록을 가져오는 함수 (캐시 사용)
async function getTools(): Promise<LocalToolDefinition[]> {
  const now = Date.now();
  if (toolsCache.length === 0 || now - lastCacheUpdate > CACHE_DURATION) {
    try {
      const storedTools = await StorageService.loadTools();
      toolsCache = storedTools.map(convertStoredToolToLocal);
      lastCacheUpdate = now;
    } catch (error) {
      console.error('Failed to load tools from storage:', error);
      // 폴백으로 빈 배열 사용
      toolsCache = [];
    }
  }
  return toolsCache;
}

// 도구 캐시 무효화 (도구가 변경되었을 때 호출)
export function invalidateToolsCache(): void {
  toolsCache = [];
  lastCacheUpdate = 0;
}

// 2. OpenAI ChatCompletionTool[] 변환 --------------------------------------------------
export async function getRegisteredTools(): Promise<ChatCompletionTool[]> {
  const tools = await getTools();
  // Only include enabled tools
  const enabledTools = tools.filter(t => t.enabled);
  return enabledTools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters || { type: 'object', properties: {} }
    }
  }));
}

// 3. 실행기 구현 ----------------------------------------------------------------------
export async function executeTool(name: string, argsJson: string | null | undefined): Promise<{ result: any; error?: string; parsedArgs?: any; }>{
  const tools = await getTools();
  const tool = tools.find(t => t.name === name);
  if (!tool) {
    return { result: null, error: `Unknown tool: ${name}` };
  }
  if (!tool.enabled) {
    return { result: null, error: `Tool '${name}' is disabled` };
  }
  let parsed: any = {};
  if (argsJson) {
    try {
      parsed = JSON.parse(argsJson);
    } catch (e) {
      return { result: null, error: 'Failed to parse arguments JSON', parsedArgs: argsJson };
    }
  }
  try {
    const result = await tool.execute(parsed);
    return { result, parsedArgs: parsed };
  } catch (e: any) {
    return { result: null, error: e?.message || String(e), parsedArgs: parsed };
  }
}

// 4. 직렬화 헬퍼 ----------------------------------------------------------------------
export function formatToolResultForAssistant(name: string, _callId: string | undefined, execution: { result: any; error?: string; parsedArgs?: any; }): string {
  // 모델에게 툴 실행 결과를 전달할 메시지 텍스트 구성
  if (execution.error) {
    return `Tool '${name}' execution failed: ${execution.error}`;
  }
  return typeof execution.result === 'string'
    ? execution.result
    : JSON.stringify(execution.result);
}
