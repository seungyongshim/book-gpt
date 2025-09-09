import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import Icon from '../UI/Icon';
import IconButton from '../UI/IconButton';
import Button from '../UI/Button';
import { useInert } from '../../hooks/useInert';

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

  const asideRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const inactive = isMobile && !showMobileHistory;
  useInert(asideRef as any, inactive);

  return (
    <>
      {/* 모바일 히스토리 토글 버튼 */}
      <IconButton
        variant="default"
        size="md"
        onClick={toggleMobileHistory}
        icon="list"
        title="대화 기록 열기"
        className="md:hidden fixed top-3 left-3 z-30 bg-surface-alt dark:bg-neutral-800 border border-border/60 shadow hover:bg-neutral-100 dark:hover:bg-neutral-700"
      />

      {/* 사이드바 */}
      <aside
        ref={asideRef as any}
        className={`flex flex-col w-60 max-w-[70vw] shrink-0 border-r border-border/60 bg-surface-alt dark:bg-neutral-900/60 backdrop-blur pt-4 pb-4 px-3 gap-3 transform md:transform-none transition-transform fixed md:static inset-y-0 left-0 z-40 ${showMobileHistory ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        aria-hidden={inactive}
        tabIndex={inactive ? -1 : 0}
      >
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleNewChat}
            leftIcon="plus"
            className="flex-1 shadow"
            title="새 대화 시작"
          >
            새 대화
          </Button>

          <IconButton
            variant="default"
            size="md"
            onClick={closeMobileHistory}
            icon="x"
            title="사이드바 닫기"
            className="md:hidden border border-border/60 bg-surface hover:bg-neutral-100 dark:hover:bg-neutral-800"
          />
        </div>

  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin overscroll-contain">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSwitchSession(session.id)}
              role="button"
              aria-pressed={session.id === currentSessionId}
              className={`group relative rounded-md border border-border/50 px-3 py-2 cursor-pointer text-sm transition shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 flex flex-col ${session.id === currentSessionId ? 'border-primary/60 bg-primary/10 dark:bg-primary/20' : 'bg-surface dark:bg-neutral-800/60'}`}
            >
              <div className="font-medium line-clamp-1 pr-7 min-w-0 break-words">{session.title}</div>
              <div className="text-[10px] mt-1 text-neutral-500 dark:text-neutral-400 min-w-0">
                {new Date(session.lastUpdated).toLocaleDateString('ko-KR')}
              </div>
              {sessions.length > 1 && (
                <IconButton
                  variant="danger"
                  size="sm"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  icon="trash"
                  title="대화 삭제"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition"
                />
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