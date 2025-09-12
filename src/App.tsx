import { useEffect } from 'react';
import { useChatStore } from './stores/chatStore';
import { useBookStore } from './stores/bookStore';
import ChatContainer from './components/Chat/ChatContainer';
import ChatSidebar from './components/Sidebar/ChatSidebar';
import BookSidebar from './components/Sidebar/BookSidebar';
import BookContainer from './components/Book/BookContainer';
import SettingsPanel from './components/Settings/SettingsPanel';
import ThemeToggle from './components/UI/ThemeToggle';
import ModeToggle from './components/UI/ModeToggle';

function App() {
  const initializeApp = useChatStore(state => state.initializeApp);
  const showSettingsOverlay = useChatStore(state => state.showSettingsOverlay);
  const initializeBookStore = useBookStore(state => state.initializeBookStore);
  const currentMode = useBookStore(state => state.currentMode);

  useEffect(() => {
    const initialize = async () => {
      await initializeApp();
      await initializeBookStore();
    };
    initialize();
  }, [initializeApp, initializeBookStore]);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-neutral-800 dark:text-neutral-200 transition-colors">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border/60 bg-surface-alt/60 backdrop-blur z-20">
        <ModeToggle />
        <ThemeToggle />
      </header>
      <div className="flex flex-1 overflow-hidden">
        {currentMode === 'chat' ? (
          <>
            <ChatSidebar />
            <ChatContainer />
          </>
        ) : (
          <>
            <BookSidebar />
            <BookContainer />
          </>
        )}
      </div>
      {showSettingsOverlay && <SettingsPanel />}
    </div>
  );
}

export default App;