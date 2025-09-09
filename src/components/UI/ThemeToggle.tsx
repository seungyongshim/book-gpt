import { useChatStore } from '../../stores/chatStore';

const ThemeToggle = () => {
  const isDarkMode = useChatStore(state => state.isDarkMode);
  const toggleTheme = useChatStore(state => state.toggleTheme);

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      <i className={`oi ${isDarkMode ? "oi-sun" : "oi-moon"}`}></i>
    </button>
  );
};

export default ThemeToggle;