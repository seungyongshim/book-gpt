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
// 내부 보존 가능한 간단한 사고(추론) 메모 기록 (선택적으로 유지)
interface ThoughtMeta {
  timestamp: string;
  purpose?: string;
  length: number;
}
const _thoughtHistory: ThoughtMeta[] = [];
const _THOUGHT_HISTORY_LIMIT = 5; // 최근 5개만 유지

// 데모용 간단한 도구 2개 (시간 조회, 에코) + Claude "think" tool 컨셉을 참고한 scratchpad 도구
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
    name: 'directing',
    description: '소설/영화 장면을 연출합니다. 장소, 등장인물, 상황, 소품 등을 설명합니다.',
    parameters: {
      type: 'object',
      properties: {
        stage: { type: 'string', description: '장소 상태' },
        notes: { type: 'string', description: '상황 설명'},
        characters: { type: 'string', description: '등장인물 상태' },
        props: { type: 'string', description: '소품 상태' },
      },
      required: ['stage']
    },
    execute: (args: any) => {
      return 'thought';
    }
  },
  {
    name: 'think',
    description: 'Use the tool to think about something. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.',
    parameters: {
      type: 'object',
      properties: {
        thought: { type: 'string', description: 'A thought to think about.' },
      },
      required: ['notes']
    },
    execute: (args: any) => {
      return 'thought';
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
