import { useEffect } from 'react';
import { useChatStore } from './stores/chatStore';
import { useToolStore } from './stores/toolStore';
import ChatContainer from './components/Chat/ChatContainer';
import ChatSidebar from './components/Sidebar/ChatSidebar';
import SettingsPanel from './components/Settings/SettingsPanel';
import ToolsPanel from './components/Tools/ToolsPanel';
import ThemeToggle from './components/UI/ThemeToggle';
import Icon from './components/UI/Icon';

function App() {
  const initializeApp = useChatStore(state => state.initializeApp);
  const showSettingsOverlay = useChatStore(state => state.showSettingsOverlay);
  const currentTab = useChatStore(state => state.currentTab);
  const setCurrentTab = useChatStore(state => state.setCurrentTab);
  const initializeTools = useToolStore(state => state.initializeTools);

  useEffect(() => {
    initializeApp();
    initializeTools();
  }, [initializeApp, initializeTools]);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-neutral-800 dark:text-neutral-200 transition-colors">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border/60 bg-surface-alt/60 backdrop-blur z-20">
        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentTab('chat')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'chat'
                ? 'bg-primary text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Icon name="list" size={16} />
            채팅
          </button>
          <button
            onClick={() => setCurrentTab('tools')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'tools'
                ? 'bg-primary text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Icon name="wrench" size={16} />
            도구
          </button>
        </div>
        
        <ThemeToggle />
      </header>
      <div className="flex flex-1 overflow-hidden">
        {currentTab === 'chat' ? (
          <>
            <ChatSidebar />
            <ChatContainer />
          </>
        ) : (
          <ToolsPanel />
        )}
      </div>
      {showSettingsOverlay && <SettingsPanel />}
    </div>
  );
}

export default App;