import { describe, it, expect } from 'vitest';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import MessageItem from '../MessageItem';
import { ChatMessage } from '../../../services/types';
import { useChatStore } from '../../../stores/chatStore';

// 스토어 초기화 헬퍼
function initStore(messages: ChatMessage[]) {
  useChatStore.setState({ messages });
}

describe('MessageItem toolCalls badge', () => {
  it('renders badge when assistant message has toolCalls', () => {
    const msgs: ChatMessage[] = [
      { role: 'system', text: 'sys' },
      { role: 'assistant', text: '결과입니다', toolCalls: [ { id: 'c1', name: 'echo', arguments: '{"text":"hi"}' } ] }
    ];
    initStore(msgs);
  const html = ReactDOMServer.renderToString(<MessageItem message={msgs[1]} messageIndex={1} />);
  expect(html).toMatch(/aria-label=\"이 메시지에는 1개의 도구 호출이 포함됩니다\./);
  });

  it('does not render badge when no toolCalls', () => {
    const msgs: ChatMessage[] = [
      { role: 'assistant', text: '일반 메시지' }
    ];
    initStore(msgs);
    const html = ReactDOMServer.renderToString(<MessageItem message={msgs[0]} messageIndex={0} />);
    expect(html).not.toMatch(/tool [0-9]+/i);
  });
});
