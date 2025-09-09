import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatContainer = () => {
  return (
    <main className="relative flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-[var(--chat-input-h)] space-y-4">
        <MessageList />
      </div>
      {/* 입력창은 완전히 분리하여 하단 고정 */}
      <ChatInput />
    </main>
  );
};

export default ChatContainer;