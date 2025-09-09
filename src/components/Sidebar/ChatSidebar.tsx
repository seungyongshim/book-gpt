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
        className="md:hidden fixed top-3 left-3 z-30 h-10 w-10 rounded-md bg-surface-alt dark:bg-neutral-800 border border-border/60 shadow text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
        onClick={toggleMobileHistory}
        title="대화 기록"
      >
        <i className="oi oi-list"></i>
      </button>

      {/* 사이드바 */}
      <aside className={`flex flex-col w-60 shrink-0 border-r border-border/60 bg-surface-alt dark:bg-neutral-900/60 backdrop-blur pt-4 pb-4 px-3 gap-3 transform md:transform-none transition-transform fixed md:static inset-y-0 left-0 z-40 ${showMobileHistory ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center gap-2 mb-2">
          <button className="flex-1 inline-flex items-center gap-2 h-10 rounded-md bg-primary/90 hover:bg-primary text-white text-sm font-medium px-3 shadow" onClick={handleNewChat}>
            <i className="oi oi-plus text-base"></i>
            새 대화
          </button>

          <button
            className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md border border-border/60 bg-surface text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={closeMobileHistory}
          >
            <i className="oi oi-x"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSwitchSession(session.id)}
              className={`group relative rounded-md border border-border/50 px-3 py-2 cursor-pointer text-sm transition shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 ${session.id === currentSessionId ? 'border-primary/60 bg-primary/10 dark:bg-primary/20' : 'bg-surface dark:bg-neutral-800/60'}`}
            >
              <div className="font-medium line-clamp-1 pr-7">{session.title}</div>
              <div className="text-[10px] mt-1 text-neutral-500 dark:text-neutral-400">
                {new Date(session.lastUpdated).toLocaleDateString('ko-KR')}
              </div>
              {sessions.length > 1 && (
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition icon-btn h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  title="대화 삭제"
                >
                  <i className="oi oi-trash text-xs"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {showMobileHistory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden" onClick={closeMobileHistory}></div>
      )}
    </>
  );
};

export default ChatSidebar;