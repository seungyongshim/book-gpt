import { useEffect, useRef, useState } from 'react';
import { useBookStore } from '../../stores/bookStore';
import Icon from '../UI/Icon';
import { useInert } from '../../hooks/useInert';

const BookSidebar = () => {
  const bookProjects = useBookStore(state => state.bookProjects);
  const currentBookId = useBookStore(state => state.currentBookId);
  const currentBook = useBookStore(state => state.currentBook);
  const currentChapterId = useBookStore(state => state.currentChapterId);
  const createBookProject = useBookStore(state => state.createBookProject);
  const switchBook = useBookStore(state => state.switchBook);
  const deleteBook = useBookStore(state => state.deleteBook);
  const createChapter = useBookStore(state => state.createChapter);
  const switchChapter = useBookStore(state => state.switchChapter);
  const deleteChapter = useBookStore(state => state.deleteChapter);
  const getTotalWordCount = useBookStore(state => state.getTotalWordCount);

  const [showMobileBookSidebar, setShowMobileBookSidebar] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [showNewBookDialog, setShowNewBookDialog] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [showNewChapterDialog, setShowNewChapterDialog] = useState(false);

  const handleNewBook = () => {
    if (newBookTitle.trim()) {
      createBookProject(newBookTitle.trim());
      setNewBookTitle('');
      setShowNewBookDialog(false);
      setShowMobileBookSidebar(false);
    }
  };

  const handleSwitchBook = (id: string) => {
    switchBook(id);
    setShowMobileBookSidebar(false);
  };

  const handleDeleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (bookProjects.length <= 1) return;
    await deleteBook(id);
  };

  const handleNewChapter = () => {
    if (newChapterTitle.trim()) {
      createChapter(newChapterTitle.trim());
      setNewChapterTitle('');
      setShowNewChapterDialog(false);
    }
  };

  const handleSwitchChapter = (id: string) => {
    switchChapter(id);
    setShowMobileBookSidebar(false);
  };

  const handleDeleteChapter = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!currentBook || currentBook.chapters.length <= 1) return;
    await deleteChapter(id);
  };

  const asideRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  
  const inactive = isMobile && !showMobileBookSidebar;
  useInert(asideRef as any, inactive);

  return (
    <>
      {/* 모바일 사이드바 토글 버튼 */}
      <button
        className="md:hidden fixed top-3 left-3 z-30 h-10 w-10 rounded-md bg-surface-alt dark:bg-neutral-800 border border-border/60 shadow text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition focus:outline-none focus:ring-2 focus:ring-primary/50"
        onClick={() => setShowMobileBookSidebar(!showMobileBookSidebar)}
        aria-label="책 프로젝트 목록 열기"
      >
        <Icon name="book" size={18} />
      </button>

      {/* 사이드바 */}
      <aside
        ref={asideRef as any}
        className={`flex flex-col w-64 max-w-[70vw] shrink-0 border-r border-border/60 bg-surface-alt dark:bg-neutral-900/60 backdrop-blur pt-4 pb-4 px-3 gap-3 transform md:transform-none transition-transform fixed md:static inset-y-0 left-0 z-40 ${showMobileBookSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        aria-hidden={inactive}
        tabIndex={inactive ? -1 : 0}
      >
        {/* 새 책 프로젝트 버튼 */}
        <div className="flex items-center gap-2 mb-2">
          <button
            className="flex-1 inline-flex items-center gap-2 h-10 rounded-md bg-primary/90 hover:bg-primary text-white text-sm font-medium px-3 shadow focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={() => setShowNewBookDialog(true)}
            aria-label="새 책 프로젝트 만들기"
          >
            <Icon name="plus" size={18} />
            <span>새 책</span>
          </button>

          <button
            className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md border border-border/60 bg-surface text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={() => setShowMobileBookSidebar(false)}
            aria-label="사이드바 닫기"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* 책 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin overscroll-contain">
          {bookProjects.map((book) => (
            <div key={book.id} className="space-y-1">
              {/* 책 프로젝트 */}
              <div
                onClick={() => handleSwitchBook(book.id)}
                role="button"
                aria-pressed={book.id === currentBookId}
                className={`group relative rounded-md border border-border/50 px-3 py-2 cursor-pointer text-sm transition shadow-sm hover:shadow-md hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 flex flex-col ${book.id === currentBookId ? 'border-primary/60 bg-primary/10 dark:bg-primary/20' : 'bg-surface dark:bg-neutral-800/60'}`}
              >
                <div className="font-medium line-clamp-2 pr-7 min-w-0 break-words">{book.title}</div>
                <div className="text-xs mt-1 text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                  <span>{getTotalWordCount(book.id).toLocaleString()} 단어</span>
                  <span>•</span>
                  <span>{book.chapters.length}장</span>
                </div>
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {new Date(book.lastUpdated).toLocaleDateString('ko-KR')}
                </div>
                {bookProjects.length > 1 && (
                  <button
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition icon-btn h-6 w-6 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={(e) => handleDeleteBook(e, book.id)}
                    title="책 삭제"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                )}
              </div>

              {/* 현재 선택된 책의 챕터 목록 */}
              {book.id === currentBookId && currentBook && (
                <div className="ml-4 space-y-1">
                  <button
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    onClick={() => setShowNewChapterDialog(true)}
                  >
                    <Icon name="plus" size={12} />
                    새 챕터
                  </button>
                  {currentBook.chapters
                    .sort((a, b) => a.order - b.order)
                    .map((chapter) => (
                      <div
                        key={chapter.id}
                        onClick={() => handleSwitchChapter(chapter.id)}
                        role="button"
                        aria-pressed={chapter.id === currentChapterId}
                        className={`group relative rounded border border-border/30 px-2 py-1 cursor-pointer text-xs transition hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 ${chapter.id === currentChapterId ? 'border-primary/50 bg-primary/5 dark:bg-primary/15' : 'bg-surface/50 dark:bg-neutral-800/30'}`}
                      >
                        <div className="font-medium line-clamp-1 pr-5 min-w-0 break-words">{chapter.title}</div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {chapter.wordCount.toLocaleString()} 단어
                        </div>
                        {currentBook.chapters.length > 1 && (
                          <button
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition icon-btn h-4 w-4 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={(e) => handleDeleteChapter(e, chapter.id)}
                            title="챕터 삭제"
                          >
                            <Icon name="trash" size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* 새 책 프로젝트 다이얼로그 */}
      {showNewBookDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-neutral-800 rounded-lg border border-border/60 shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 책 프로젝트 만들기</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="book-title" className="block text-sm font-medium mb-2">
                  책 제목
                </label>
                <input
                  id="book-title"
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border/60 rounded-md bg-surface dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="책 제목을 입력하세요"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNewBook();
                    } else if (e.key === 'Escape') {
                      setShowNewBookDialog(false);
                      setNewBookTitle('');
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowNewBookDialog(false);
                    setNewBookTitle('');
                  }}
                  className="px-4 py-2 text-sm border border-border/60 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleNewBook}
                  disabled={!newBookTitle.trim()}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 새 챕터 다이얼로그 */}
      {showNewChapterDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-neutral-800 rounded-lg border border-border/60 shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">새 챕터 추가</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="chapter-title" className="block text-sm font-medium mb-2">
                  챕터 제목
                </label>
                <input
                  id="chapter-title"
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border/60 rounded-md bg-surface dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="챕터 제목을 입력하세요"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleNewChapter();
                    } else if (e.key === 'Escape') {
                      setShowNewChapterDialog(false);
                      setNewChapterTitle('');
                    }
                  }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowNewChapterDialog(false);
                    setNewChapterTitle('');
                  }}
                  className="px-4 py-2 text-sm border border-border/60 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleNewChapter}
                  disabled={!newChapterTitle.trim()}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 모바일 오버레이 */}
      {showMobileBookSidebar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden" onClick={() => setShowMobileBookSidebar(false)}></div>
      )}
    </>
  );
};

export default BookSidebar;