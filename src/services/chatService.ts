import { ChatMessage, UsageInfo } from './types';

export interface ChatServiceConfig {
  baseUrl?: string;
  timeout?: number;
}

export class ChatService {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ChatServiceConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:4141';
    this.timeout = config.timeout || 5 * 60 * 1000; // 5분
  }

  // 모델 목록 조회
  async getModels(): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // OpenAI-compatible shape: { data: [{ id: "model" }, ...] }
      if (data.data && Array.isArray(data.data)) {
        const models = data.data
          .map((item: any) => item.id)
          .filter((id: string) => id && typeof id === 'string');

        if (models.length > 0) {
          return Array.from(new Set(models)); // 중복 제거
        }
      }

      // Fallback: { models: ["model1", "model2"] }
      if (data.models && Array.isArray(data.models)) {
        const models = data.models.filter((model: string) => model && typeof model === 'string');
        if (models.length > 0) {
          return models;
        }
      }

      // 빈 배열 반환
      return [];
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  // 채팅 응답 스트리밍
  async* getResponseStreaming(
    history: ChatMessage[],
    model: string,
    temperature: number = 1.0,
    maxTokens?: number,
    signal?: AbortSignal
  ): AsyncIterable<string> {
    if (!model || typeof model !== 'string') {
      throw new Error('model is required');
    }

    const messages = history.map(m => ({
      role: m.role,
      content: m.text || ''
    }));

    messages.push({ role: 'assistant', content: '응답하겠습니다.' });

    const body: any = {
      model,
      messages,
      temperature,
      stream: true
    };

    if (maxTokens) {
      body.max_tokens = maxTokens;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // 사용자가 제공한 signal과 타임아웃 signal을 결합
    const combinedSignal = signal ? this.combineSignals([signal, controller.signal]) : controller.signal;

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-beta': 'output-128k-2025-02-19'
        },
        body: JSON.stringify(body),
        signal: combinedSignal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('Stream completed normally');
            break;
          }

          if (combinedSignal.aborted) {
            throw new Error('Request was cancelled');
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonPart = line.slice(6).trim(); // "data: " 이후 부분

              if (jsonPart === '[DONE]') {
                return;
              }

              if (jsonPart === '') {
                continue; // 빈 데이터 라인 건너뛰기
              }

              try {
                const data = JSON.parse(jsonPart);

                // 스트림 종료 조건 체크
                if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
                  const firstChoice = data.choices[0];

                  // finish_reason이 있으면 스트림 종료
                  if (firstChoice.finish_reason) {
                    return;
                  }

                  // 컨텐츠가 있으면 yield
                  if (firstChoice.delta && firstChoice.delta.content) {
                    const content = firstChoice.delta.content;
                    if (typeof content === 'string' && content.length > 0) {
                      yield content;
                      // 작은 지연으로 UI 업데이트를 부드럽게
                      await new Promise(resolve => setTimeout(resolve, 3));
                    }
                  }
                }
              } catch (parseError) {
                // JSON 파싱 오류는 무시하고 계속 진행
                console.warn('Failed to parse streaming data:', jsonPart, parseError);
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Streaming error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      if (error instanceof Error && error.message.includes('NetworkError')) {
        throw new Error('Network connection lost during streaming');
      }
      throw error;
    }
  }

  // 사용량 조회
  async getUsage(): Promise<UsageInfo | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃

    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const usageInfo: UsageInfo = {};

      // quota_snapshots.premium_interactions 구조에서 정보 추출
      if (data.quota_snapshots?.premium_interactions) {
        const premium = data.quota_snapshots.premium_interactions;

        if (typeof premium.remaining === 'number') {
          usageInfo.premiumRequestsLeft = premium.remaining;
        }

        if (typeof premium.entitlement === 'number') {
          usageInfo.totalPremiumRequests = premium.entitlement;
        }

        // 사용량 계산
        if (usageInfo.totalPremiumRequests !== undefined && usageInfo.premiumRequestsLeft !== undefined) {
          usageInfo.premiumRequestsUsed = usageInfo.totalPremiumRequests - usageInfo.premiumRequestsLeft;
        }
      }

      return usageInfo;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Failed to load usage info:', error);
      return null;
    }
  }

  // 여러 AbortSignal을 결합하는 헬퍼 메서드
  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    const abortHandler = () => controller.abort();

    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', abortHandler);
      }
    });

    // 메모리 리크 방지를 위한 정리
    controller.signal.addEventListener('abort', () => {
      signals.forEach(signal => {
        signal.removeEventListener('abort', abortHandler);
      });
    });

    return controller.signal;
  }
}

// 기본 인스턴스 생성
export const chatService = new ChatService();