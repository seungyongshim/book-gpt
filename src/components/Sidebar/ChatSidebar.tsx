import { useChatStore } from '../../stores/chatStore';

const ChatSidebar = () => {
  const sessions = useChatStore(state => state.sessions);
  const currentSessionId = useChatStore(state => state.currentSessionId);
  const showMobileHistory = useChatStore(state => state.showMobileHistory);
  const newChat = useChatStore(state => state.newChat);
  const switchSession = useChatStore(state => state.switchSession);
  const deleteSession = useChatStore(state => state.deleteSession);
  const toggleMobileHistory = useChatStore(state => state.toggleMobileHistory);
  const closeMobileHistory = useChatStore(state => state.closeMobileHistory);

  const handleNewChat = () => {
    newChat();
    closeMobileHistory();
  };

  const handleSwitchSession = (id: string) => {
    switchSession(id);
    closeMobileHistory();
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    await deleteSession(id);
  };

  return (
    <>
      {/* 모바일 히스토리 토글 버튼 */}
      <button
        className="mobile-history-toggle md:hidden"
        onClick={toggleMobileHistory}
        title="대화 기록"
      >
        <i className="oi oi-list"></i>
      </button>

      {/* 사이드바 */}
      <aside className={`chat-sidebar ${showMobileHistory ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <i className="oi oi-plus"></i>
            새 대화
          </button>

          {/* 모바일에서 닫기 버튼 */}
          <button
            className="mobile-close-btn md:hidden"
            onClick={closeMobileHistory}
          >
            <i className="oi oi-x"></i>
          </button>
        </div>

        <div className="session-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
              onClick={() => handleSwitchSession(session.id)}
            >
              <div className="session-title">{session.title}</div>
              <div className="session-date">
                {new Date(session.lastUpdated).toLocaleDateString('ko-KR')}
              </div>
              {sessions.length > 1 && (
                <button
                  className="delete-session-btn"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  title="대화 삭제"
                >
                  <i className="oi oi-trash"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {showMobileHistory && (
        <div className="mobile-overlay md:hidden" onClick={closeMobileHistory}></div>
      )}
    </>
  );
};

export default ChatSidebar;