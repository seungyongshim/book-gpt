// 타입 정의
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  text: string;
  // tool 호출 결과 / 메타데이터
  toolName?: string;          // role === 'tool' 일 때 실행된 도구 이름
  toolCallId?: string;        // model이 부여한 tool_call_id
  toolArgumentsJson?: string; // 실행된 arguments (원본 JSON 문자열)
  // assistant 가 tool_calls 를 요청한 경우 (role === 'assistant')
  toolCalls?: { id?: string; name: string; arguments: string }[];
}

export interface Session {
  id: string;
  title: string;
  history: ChatMessage[];
  lastUpdated: Date;
  systemMessage?: string;
}

export interface SessionDto {
  id: string;
  title: string;
  history: { role: string; text: string }[];
  lastUpdated: string;
  systemMessage?: string;
}

export interface ModelSettings {
  temperature?: number;
  maxTokens?: number;
}

export interface UsageInfo {
  premiumRequestsLeft?: number;
  totalPremiumRequests?: number;
  premiumRequestsUsed?: number;
}