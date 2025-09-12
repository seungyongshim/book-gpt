import { useEffect, useRef, useState } from 'react';
import { useBookStore } from '../../stores/bookStore';
import BookEditor from './BookEditor';
import BookToolbar from './BookToolbar';
import BookStats from './BookStats';

const BookContainer = () => {
  const currentBook = useBookStore(state => state.currentBook);
  const currentChapter = useBookStore(state => state.currentChapter);
  const chapterContent = useBookStore(state => state.chapterContent);
  const setChapterContent = useBookStore(state => state.setChapterContent);
  const saveChapterContent = useBookStore(state => state.saveChapterContent);
  
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // 자동 저장 (3초 지연)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (chapterContent !== (currentChapter?.content || '')) {
        await saveChapterContent();
        setLastSaved(new Date());
      }
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chapterContent, currentChapter?.content, saveChapterContent]);

  // 수동 저장 (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveChapterContent().then(() => {
          setLastSaved(new Date());
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveChapterContent]);

  if (!currentBook || !currentChapter) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface/50">
        <div className="text-center space-y-4">
          <div className="text-6xl text-neutral-300 dark:text-neutral-600">📚</div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-600 dark:text-neutral-300">
              책을 선택하거나 새로 만들어보세요
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              사이드바에서 새 책 프로젝트를 만들거나 기존 책을 선택할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 overflow-hidden">
      {/* 상단 툴바 */}
      <div className="shrink-0 border-b border-border/60 bg-surface/80 backdrop-blur">
        <BookToolbar />
      </div>
      
      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 에디터 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <BookEditor 
            content={chapterContent}
            onContentChange={setChapterContent}
            lastSaved={lastSaved}
          />
        </div>
        
        {/* 오른쪽 패널 (통계 등) */}
        <div className="w-64 border-l border-border/60 bg-surface-alt/60 overflow-y-auto">
          <BookStats />
        </div>
      </div>
    </main>
  );
};

export default BookContainer;