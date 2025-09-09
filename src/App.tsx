import { useEffect } from 'react';
import { useChatStore } from './stores/chatStore';
import ChatContainer from './components/Chat/ChatContainer';
import ChatSidebar from './components/Sidebar/ChatSidebar';
import SettingsPanel from './components/Settings/SettingsPanel';
import ThemeToggle from './components/UI/ThemeToggle';
import ErrorBoundary from './components/UI/ErrorBoundary';
import KeyboardShortcuts from './components/UI/KeyboardShortcuts';
import { ToastProvider, setGlobalToastManager, useToast } from './components/UI/Toast';
import './utils/pwa'; // PWA 기능 초기화

function AppContent() {
  const initializeApp = useChatStore(state => state.initializeApp);
  const showSettingsOverlay = useChatStore(state => state.showSettingsOverlay);
  const toastManager = useToast();

  useEffect(() => {
    // 토스트 매니저를 전역으로 설정
    setGlobalToastManager(toastManager);
    
    // 앱 초기화
    initializeApp();
  }, [initializeApp, toastManager]);

  return (
    <ErrorBoundary>
      <KeyboardShortcuts />
      <div className="min-h-screen flex flex-col bg-surface text-neutral-800 dark:text-neutral-200 transition-colors">
        <header className="h-14 shrink-0 flex items-center justify-end px-4 border-b border-border/60 bg-surface-alt/60 backdrop-blur z-20">
          <ThemeToggle />
        </header>
        <div className="flex flex-1 overflow-hidden">
          <ErrorBoundary>
            <ChatSidebar />
          </ErrorBoundary>
          <ErrorBoundary>
            <ChatContainer />
          </ErrorBoundary>
        </div>
        {showSettingsOverlay && (
          <ErrorBoundary>
            <SettingsPanel />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;