import { describe, it, expect } from 'vitest';
import ReactDOMServer from 'react-dom/server';
import MessageItem from '../MessageItem';
import { ChatMessage } from '../../../services/types';
import { useChatStore } from '../../../stores/chatStore';

function init(messages: ChatMessage[]) {
  useChatStore.setState({ messages });
}

describe('ToolCallDetails', () => {
  it('renders toggle button when toolCalls exist', () => {
    const msgs: ChatMessage[] = [
      { role: 'assistant', text: '응답', toolCalls: [{ id: 't1', name: 'echo', arguments: '{"text":"hi"}' }] }
    ];
    init(msgs);
    const html = ReactDOMServer.renderToString(<MessageItem message={msgs[0]} messageIndex={0} />);
    expect(html).toMatch(/툴 호출 JSON 보기/);
  });

  it('does not render toggle button when no toolCalls', () => {
    const msgs: ChatMessage[] = [ { role: 'assistant', text: '일반' } ];
    init(msgs);
    const html = ReactDOMServer.renderToString(<MessageItem message={msgs[0]} messageIndex={0} />);
    expect(html).not.toMatch(/툴 호출 JSON 보기/);
  });
});
