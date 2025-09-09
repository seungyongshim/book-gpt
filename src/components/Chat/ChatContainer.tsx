import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatContainer = () => {
  return (
    <main className="chat-main">
      <div className="chat-content">
        <MessageList />
      </div>
      {/* 입력창은 완전히 분리하여 하단 고정 */}
      <ChatInput />
    </main>
  );
};

export default ChatContainer;