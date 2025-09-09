// API 응답 타입 정의
export interface ModelResponse {
  data: Array<{ id: string }>;
}

export interface ModelsListResponse {
  models: string[];
}

export interface ChatCompletionResponse {
  choices: Array<{
    delta?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export interface UsageResponse {
  quota_snapshots?: {
    premium_interactions?: {
      remaining?: number;
      entitlement?: number;
    };
  };
}

export interface ChatRequestBody {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature: number;
  stream: boolean;
  max_tokens?: number;
}

export interface ServiceError extends Error {
  status?: number;
  code?: string;
}