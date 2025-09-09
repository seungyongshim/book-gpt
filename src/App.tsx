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
    <div className="app">
      <ThemeToggle />

      <div className="chat-layout">
        <ChatSidebar />
        <ChatContainer />
      </div>

      {showSettingsOverlay && <SettingsPanel />}
    </div>
  );
}

export default App;