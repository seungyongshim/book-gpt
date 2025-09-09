import React, { useEffect, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { SHORTCUTS } from '../../constants';

/**
 * 키보드 단축키 핸들러 컴포넌트
 * 글로벌 키보드 이벤트를 감지하고 적절한 액션을 실행합니다.
 */
export const KeyboardShortcuts: React.FC = () => {
  const newChat = useChatStore(state => state.newChat);
  const toggleMobileHistory = useChatStore(state => state.toggleMobileHistory);
  const toggleSettingsOverlay = useChatStore(state => state.toggleSettingsOverlay);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 입력 필드에서 포커스된 경우 단축키 무시
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // Ctrl/Cmd + Shift + N: 새 대화
    if (event.ctrlKey && event.shiftKey && event.key === 'N') {
      event.preventDefault();
      newChat();
      return;
    }

    // Ctrl/Cmd + B: 사이드바 토글 (모바일)
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      toggleMobileHistory();
      return;
    }

    // Ctrl/Cmd + ,: 설정 토글
    if (event.ctrlKey && event.key === ',') {
      event.preventDefault();
      toggleSettingsOverlay();
      return;
    }

    // Escape: 오버레이 닫기
    if (event.key === 'Escape') {
      const settingsOverlay = useChatStore.getState().showSettingsOverlay;
      const mobileHistory = useChatStore.getState().showMobileHistory;
      
      if (settingsOverlay) {
        event.preventDefault();
        useChatStore.getState().closeSettingsOverlay();
        return;
      }
      
      if (mobileHistory) {
        event.preventDefault();
        useChatStore.getState().closeMobileHistory();
        return;
      }
    }
  }, [newChat, toggleMobileHistory, toggleSettingsOverlay]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 이 컴포넌트는 UI를 렌더링하지 않습니다 (이벤트 리스너만 등록)
  return null;
};

/**
 * 키보드 단축키 도움말 컴포넌트
 */
interface ShortcutHelpProps {
  className?: string;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ className = '' }) => {
  const shortcuts = [
    { key: SHORTCUTS.NEW_CHAT, description: '새 대화 시작' },
    { key: SHORTCUTS.TOGGLE_SIDEBAR, description: '사이드바 토글' },
    { key: SHORTCUTS.TOGGLE_SETTINGS, description: '설정 열기' },
    { key: SHORTCUTS.SEND_MESSAGE, description: '메시지 전송' },
    { key: SHORTCUTS.NEW_LINE, description: '줄바꿈' },
    { key: SHORTCUTS.CANCEL_EDIT, description: '편집 취소/오버레이 닫기' },
    { key: SHORTCUTS.SAVE_EDIT, description: '편집 저장' },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
        키보드 단축키
      </h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">
              {shortcut.description}
            </span>
            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-700 dark:text-neutral-300 font-mono text-[10px] border">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KeyboardShortcuts;