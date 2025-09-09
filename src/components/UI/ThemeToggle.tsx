import { useChatStore } from '../../stores/chatStore';
import Icon from './Icon';

const ThemeToggle = () => {
  const isDarkMode = useChatStore(state => state.isDarkMode);
  const toggleTheme = useChatStore(state => state.toggleTheme);

  return (
    <button
      className="h-10 w-10 rounded-md bg-surface-alt dark:bg-neutral-800 border border-border/60 shadow text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition focus:outline-none focus:ring-2 focus:ring-primary/50"
      onClick={toggleTheme}
      aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} />
    </button>
  );
};

export default ThemeToggle;