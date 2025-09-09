import { useChatStore } from '../../stores/chatStore';
import Icon from './Icon';

const ThemeToggle = () => {
  const isDarkMode = useChatStore(state => state.isDarkMode);
  const toggleTheme = useChatStore(state => state.toggleTheme);

  return (
    <button
      className="fixed top-3 right-3 z-30 h-10 w-10 rounded-md bg-surface-alt dark:bg-neutral-800 border border-border/60 shadow text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
      onClick={toggleTheme}
      title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
  <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} />
    </button>
  );
};

export default ThemeToggle;