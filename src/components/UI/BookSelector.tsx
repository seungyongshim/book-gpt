import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { Book } from '../../services/types';
import { bookService } from '../../services/bookService';
import Icon from './Icon';

interface BookSelectorProps {
  className?: string;
}

const BookSelector: React.FC<BookSelectorProps> = ({ className = '' }) => {
  const availableBooks = useChatStore(state => state.availableBooks);
  const selectedBook = useChatStore(state => state.selectedBook);
  const referencedPage = useChatStore(state => state.referencedPage);
  const loadingBooks = useChatStore(state => state.loadingBooks);
  const setSelectedBook = useChatStore(state => state.setSelectedBook);
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageCount, setPageCount] = useState<number>(0);

  // 검색 필터링
  const filteredBooks = availableBooks.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 선택된 책의 페이지 수 로드
  useEffect(() => {
    const loadPageCount = async () => {
      if (selectedBook) {
        try {
          const count = await bookService.getBookPageCount(selectedBook.id);
          setPageCount(count);
        } catch (error) {
          console.error('Failed to get page count:', error);
          setPageCount(0);
        }
      } else {
        setPageCount(0);
      }
    };

    loadPageCount();
  }, [selectedBook]);

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedBook(null);
    setIsOpen(false);
  };

  if (loadingBooks) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Icon name="loader" size={16} className="animate-spin" />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">책 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-8 px-3 rounded-md bg-white/70 dark:bg-neutral-900/60 border border-border/60 text-xs hover:bg-white/90 dark:hover:bg-neutral-900/80 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
        aria-label="책 선택"
        title={selectedBook ? `${selectedBook.title} (${pageCount}페이지, #N으로 페이지 참조 가능)` : '책 선택'}
      >
        <Icon name="book-open" size={14} />
        <div className="flex flex-col items-start truncate max-w-[120px]">
          <span className="truncate">
            {selectedBook ? selectedBook.title : '책 선택'}
          </span>
          {selectedBook && pageCount > 0 && (
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {referencedPage ? `페이지 ${referencedPage.pageNumber}` : `${pageCount}페이지`}
            </span>
          )}
        </div>
        <Icon 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={12} 
          className="ml-1 flex-shrink-0" 
        />
      </button>

      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 드롭다운 메뉴 */}
          <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-neutral-800 border border-border/60 rounded-md shadow-lg z-40 max-h-80 flex flex-col">
            {/* 페이지 참조 도움말 */}
            {selectedBook && pageCount > 0 && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border-b border-border/60">
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <Icon name="info" size={12} />
                  <span>메시지에서 <code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">#1</code>, <code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">#2</code> 등으로 특정 페이지 참조 가능 (총 {pageCount}페이지)</span>
                </div>
              </div>
            )}
            
            {/* 검색 입력 */}
            <div className="p-2 border-b border-border/60">
              <input
                type="text"
                placeholder="책 제목이나 저자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 px-2 text-xs rounded border border-border/60 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </div>

            {/* 선택 해제 옵션 */}
            {selectedBook && (
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-2 p-2 text-xs text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 border-b border-border/30"
              >
                <Icon name="x" size={14} className="text-red-500" />
                <span className="text-red-600 dark:text-red-400">선택 해제</span>
              </button>
            )}

            {/* 책 목록 */}
            <div className="flex-1 overflow-y-auto">
              {filteredBooks.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  {searchQuery ? '검색 결과가 없습니다' : '책이 없습니다'}
                </div>
              ) : (
                filteredBooks.map((book) => {
                  // 각 책의 페이지 수를 계산 (간단한 추정)
                  const estimatedPages = Math.max(1, (book.content.match(/^## /gm) || []).length);
                  
                  return (
                    <button
                      key={book.id}
                      onClick={() => handleBookSelect(book)}
                      className={`w-full p-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 border-b border-border/30 last:border-b-0 ${
                        selectedBook?.id === book.id ? 'bg-primary/10 dark:bg-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon 
                          name="book" 
                          size={14} 
                          className={`mt-0.5 flex-shrink-0 ${
                            selectedBook?.id === book.id ? 'text-primary' : 'text-neutral-500 dark:text-neutral-400'
                          }`} 
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${
                            selectedBook?.id === book.id ? 'text-primary' : 'text-neutral-900 dark:text-neutral-100'
                          }`}>
                            {book.title}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {book.author} • {estimatedPages}페이지
                          </div>
                          {book.description && (
                            <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2">
                              {book.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BookSelector;