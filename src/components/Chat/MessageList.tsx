import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import MessageItem from './MessageItem';

const MessageList = () => {
  const messages = useChatStore(state => state.messages);

  const listRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  // 스크롤 위치 추적: 사용자가 위로 스크롤하면 하단 고정 해제
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      setStickToBottom(nearBottom);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll as EventListener);
  }, []);

  // 새 메시지 도착 시 하단 고정 상태면 자동 스크롤
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickToBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, stickToBottom]);

  // 시스템 메시지를 먼저 렌더링하고, 나머지 메시지들을 순서대로 렌더링
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  return (
    <div className="message-list" ref={listRef}>
      {systemMessage && (
        <MessageItem
          message={systemMessage}
          messageIndex={messages.indexOf(systemMessage)}
        />
      )}

      {otherMessages.map((message) => {
        const originalIndex = messages.indexOf(message);
        return (
          <MessageItem
            key={originalIndex}
            message={message}
            messageIndex={originalIndex}
          />
        );
      })}

      {/* 기존 '...' 타이핑 인디케이터 제거됨: 마지막 assistant 말풍선 내 문자수 카운터로 대체 */}
    </div>
  );
};

export default MessageList;