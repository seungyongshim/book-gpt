import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export interface LocalToolDefinition {
  name: string;
  description: string;
  // JSON Schema (partial) for parameters (properties + required)
  parameters?: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  // 실행 함수
  execute: (args: any) => Promise<any> | any;
}

// 1. 로컬 도구 정의 ------------------------------------------------------------------
// 데모용 간단한 도구 2개 (시간 조회, 에코)
const localTools: LocalToolDefinition[] = [
  {
    name: 'get_current_time',
    description: '현재 UTC 시간을 ISO 문자열로 반환합니다.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: () => new Date().toISOString()
  },
  {
    name: 'echo',
    description: '전달된 문자열을 그대로 다시 반환합니다.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '반환할 문자열' }
      },
      required: ['text']
    },
    execute: (args: any) => {
      if (!args || typeof args.text !== 'string') {
        return 'Invalid arguments: expected { text: string }';
      }
      return args.text;
    }
  }
];

// 2. OpenAI ChatCompletionTool[] 변환 --------------------------------------------------
export function getRegisteredTools(): ChatCompletionTool[] {
  return localTools.map(t => ({
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
  const tool = localTools.find(t => t.name === name);
  if (!tool) {
    return { result: null, error: `Unknown tool: ${name}` };
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
