import { useEffect, useRef, useState } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useChatStore } from '../../stores/chatStore';

const ChatContainer = () => {
  const messages = useChatStore(state => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  // 스크롤 이벤트로 하단 고정 여부 판단
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      // 32px 이내면 하단에 붙어있는 것으로 간주
      setStickToBottom(distance < 32);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // 메시지 변경(스트리밍 포함) 시 자동 스크롤
  useEffect(() => {
    if (!stickToBottom) return; // 사용자가 위로 스크롤한 경우 강제 이동 없음
    const el = endRef.current;
    if (el) {
      // scrollIntoView는 레이아웃 안정성을 위해 smooth 적용
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, stickToBottom]);

  // 초기 로드시 하단 이동
  useEffect(() => {
    const el = endRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, []);

  return (
    <main className="relative flex flex-col flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-[var(--chat-input-h)] space-y-4"
      >
        <MessageList endRef={endRef} />
      </div>
      {/* 입력창은 완전히 분리하여 하단 고정 */}
      <ChatInput />
    </main>
  );
};

export default ChatContainer;