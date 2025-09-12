import { useBookStore } from '../../stores/bookStore';
import Icon from './Icon';

const ModeToggle = () => {
  const currentMode = useBookStore(state => state.currentMode);
  const setMode = useBookStore(state => state.setMode);

  const toggleMode = () => {
    setMode(currentMode === 'chat' ? 'book' : 'chat');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMode}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'chat' 
            ? 'bg-primary/10 text-primary border border-primary/20' 
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-border/60 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        }`}
        title={currentMode === 'chat' ? '채팅 모드 활성화됨' : '채팅 모드로 전환'}
      >
        <Icon name="message-square" size={16} />
        <span>채팅</span>
      </button>
      
      <button
        onClick={toggleMode}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'book' 
            ? 'bg-primary/10 text-primary border border-primary/20' 
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-border/60 hover:bg-neutral-200 dark:hover:bg-neutral-700'
        }`}
        title={currentMode === 'book' ? '책 쓰기 모드 활성화됨' : '책 쓰기 모드로 전환'}
      >
        <Icon name="book" size={16} />
        <span>책 쓰기</span>
      </button>
    </div>
  );
};

export default ModeToggle;