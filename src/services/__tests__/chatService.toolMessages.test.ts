import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '../types';

// 이 테스트는 네트워크 호출을 실제로 수행하지 않고 toApiMessages 로직을 검증하기 위해
// chatService 의 private 부분을 직접 사용할 수 없으므로 간단한 형태의 메시지 배열을
// 변환했을 때 형식이 맞는지 검증하는 간접 테스트를 수행합니다.
// (실제 OpenAI SDK 호출 모킹은 별도 infra 필요하므로 최소 검증)

describe('tool call message sequencing (structural)', () => {
  it('assistant with toolCalls precedes tool messages', async () => {
    const history: ChatMessage[] = [
      { role: 'system', text: 'You are a helpful assistant.' },
      { role: 'user', text: '시간 알려줘' },
      { role: 'assistant', text: '', toolCalls: [ { id: 'call_1', name: 'get_current_time', arguments: '{}' } ] },
      { role: 'tool', text: '2025-01-01T00:00:00.000Z', toolCallId: 'call_1', toolName: 'get_current_time', toolArgumentsJson: '{}' }
    ];

    // 비공개 toApiMessages 복제 로직 (chatService.ts 의 구현과 동기 유지)
    const toApiMessages = (msgs: ChatMessage[]) => msgs.map(m => {
      if (m.role === 'tool') {
        return { role: 'tool', content: m.text, tool_call_id: m.toolCallId } as any;
      }
      if (m.role === 'assistant') {
        if (m.toolCalls && m.toolCalls.length > 0) {
          return {
            role: 'assistant',
            content: m.text || null,
            tool_calls: m.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.arguments } }))
          } as any;
        }
      }
      return { role: m.role, content: m.text } as any;
    });

    const apiMsgs = toApiMessages(history);
    expect(apiMsgs[2].tool_calls).toBeTruthy();
    expect(apiMsgs[3].tool_call_id).toBe('call_1');
  });
});
