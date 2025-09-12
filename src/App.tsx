import { useEffect } from 'react';
import { useChatStore } from './stores/chatStore';
import ChatContainer from './components/Chat/ChatContainer';
import ChatSidebar from './components/Sidebar/ChatSidebar';
import SettingsPanel from './components/Settings/SettingsPanel';
import ThemeToggle from './components/UI/ThemeToggle';

function App() {
  const initializeApp = useChatStore(state => state.initializeApp);
  const showSettingsOverlay = useChatStore(state => state.showSettingsOverlay);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-neutral-800 dark:text-neutral-200 transition-colors">
      <header className="h-14 shrink-0 flex items-center justify-end px-4 border-b border-border/60 bg-surface-alt/60 backdrop-blur z-20">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar />
        <ChatContainer />
      </div>
      {showSettingsOverlay && <SettingsPanel />}
    </div>
  );
}

export default App;
