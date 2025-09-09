import { useChatStore } from '../../stores/chatStore';
import IconButton from './IconButton';

const ThemeToggle = () => {
  const isDarkMode = useChatStore(state => state.isDarkMode);
  const toggleTheme = useChatStore(state => state.toggleTheme);

  return (
    <IconButton
      variant="default"
      size="lg"
      onClick={toggleTheme}
      icon={isDarkMode ? 'sun' : 'moon'}
      title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="bg-surface-alt dark:bg-neutral-800 border border-border/60 shadow hover:bg-neutral-100 dark:hover:bg-neutral-700"
    />
  );
};

export default ThemeToggle;