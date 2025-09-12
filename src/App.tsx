import { useEffect } from 'react';
import { useChatStore } from './stores/chatStore';
import ChatContainer from './components/Chat/ChatContainer';
import ChatSidebar from './components/Sidebar/ChatSidebar';
import SettingsPanel from './components/Settings/SettingsPanel';
import ThemeToggle from './components/UI/ThemeToggle';
import NovelGenerator from './components/Novel/NovelGenerator';
import { MessageSquare, BookOpen } from 'lucide-react';

function App() {
  const initializeApp = useChatStore(state => state.initializeApp);
  const showSettingsOverlay = useChatStore(state => state.showSettingsOverlay);
  const currentView = useChatStore(state => state.currentView);
  const setCurrentView = useChatStore(state => state.setCurrentView);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-neutral-800 dark:text-neutral-200 transition-colors">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border/60 bg-surface-alt/60 backdrop-blur z-20">
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                currentView === 'chat'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              채팅
            </button>
            <button
              onClick={() => setCurrentView('novel-generator')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                currentView === 'novel-generator'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              소설 생성
            </button>
          </nav>
        </div>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'chat' && (
          <>
            <ChatSidebar />
            <ChatContainer />
          </>
        )}
        {currentView === 'novel-generator' && (
          <div className="flex-1 overflow-auto">
            <NovelGenerator />
          </div>
        )}
      </div>
      {showSettingsOverlay && <SettingsPanel />}
    </div>
  );
}

export default App;