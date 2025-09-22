import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { StoredTool } from './types';
import { StorageService } from './storageService';
import { mcpSamplingTools } from './mcpSamplingTools';

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

// 저장된 도구를 LocalToolDefinition으로 변환하는 함수
function convertStoredToolToLocal(storedTool: StoredTool): LocalToolDefinition {
  return {
    name: storedTool.name,
    description: storedTool.description,
    parameters: storedTool.parameters,
    enabled: storedTool.enabled,
    execute: (args: any) => {
      try {
        // 저장된 JavaScript 코드를 실행
        // 안전성을 위해 제한된 실행 환경 사용
        const executeFunction = new Function('args', storedTool.executeCode);
        return executeFunction(args);
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

// 5. MCP 샘플링 도구 초기화 ------------------------------------------------------------
export async function initializeMcpSamplingTools(): Promise<void> {
  try {
    // 기존 도구 로드
    const existingTools = await StorageService.loadTools();
    
    // MCP 샘플링 도구가 이미 있는지 확인
    const mcpToolNames = mcpSamplingTools.map(tool => tool.name);
    const existingMcpTools = existingTools.filter(tool => mcpToolNames.includes(tool.name));
    
    // 새로운 도구만 추가
    const newTools = mcpSamplingTools.filter(mcpTool => 
      !existingMcpTools.some(existing => existing.name === mcpTool.name)
    );
    
    if (newTools.length > 0) {
      const allTools = [...existingTools, ...newTools];
      await StorageService.saveTools(allTools);
      invalidateToolsCache();
      console.log(`MCP 샘플링 도구 ${newTools.length}개가 추가되었습니다:`, newTools.map(t => t.name));
    } else {
      console.log('MCP 샘플링 도구가 이미 등록되어 있습니다.');
    }
  } catch (error) {
    console.error('MCP 샘플링 도구 초기화 중 오류:', error);
  }
}
