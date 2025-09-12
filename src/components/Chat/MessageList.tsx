import { useChatStore } from '../../stores/chatStore';
import MessageItem from './MessageItem';

interface MessageListProps {
  /** 하단 스크롤을 위해 부모에서 전달하는 sentinel ref (선택) */
  endRef?: React.RefObject<HTMLDivElement>;
}

const MessageList = ({ endRef }: MessageListProps) => {
  const messages = useChatStore(state => state.messages);

  // 시스템 메시지를 먼저 렌더링하고, 나머지 메시지들을 순서대로 렌더링
  const systemMessage = messages.find(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  return (
    <div
      className="flex flex-col gap-4"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {systemMessage && (
        <MessageItem message={systemMessage} messageIndex={messages.indexOf(systemMessage)} />
      )}

      {otherMessages.map(message => {
        const originalIndex = messages.indexOf(message);
        return <MessageItem key={originalIndex} message={message} messageIndex={originalIndex} />;
      })}

      {/* 스크롤 하단 위치 관찰용 sentinel */}
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
};

export default MessageList;
