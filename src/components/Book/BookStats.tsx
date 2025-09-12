import { useBookStore } from '../../stores/bookStore';
import Icon from '../UI/Icon';

const BookStats = () => {
  const currentBook = useBookStore(state => state.currentBook);
  const currentChapter = useBookStore(state => state.currentChapter);
  const chapterContent = useBookStore(state => state.chapterContent);
  const getTotalWordCount = useBookStore(state => state.getTotalWordCount);
  const getBookProgress = useBookStore(state => state.getBookProgress);

  if (!currentBook || !currentChapter) return null;

  const currentWordCount = chapterContent.trim() 
    ? chapterContent.trim().split(/\s+/).filter(word => word.length > 0).length 
    : 0;

  const totalWords = getTotalWordCount();
  const progress = getBookProgress();
  const averageWordsPerChapter = totalWords / currentBook.chapters.length;
  const estimatedReadingTime = Math.ceil(totalWords / 250); // 분당 250단어 기준

  return (
    <div className="p-4 space-y-6">
      {/* 책 정보 */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <Icon name="book" size={16} />
          책 정보
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">전체 단어 수</span>
            <span className="font-medium">{totalWords.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">총 챕터</span>
            <span className="font-medium">{currentBook.chapters.length}개</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">예상 독서시간</span>
            <span className="font-medium">{estimatedReadingTime}분</span>
          </div>
          {currentBook.targetWordCount && (
            <>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">목표 단어 수</span>
                <span className="font-medium">{currentBook.targetWordCount.toLocaleString()}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">진행률</span>
                  <span className="font-medium">{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all duration-300"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 현재 챕터 정보 */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <Icon name="file-text" size={16} />
          현재 챕터
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">단어 수</span>
            <span className="font-medium">{currentWordCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">예상 페이지</span>
            <span className="font-medium">{Math.ceil(currentWordCount / 250)}쪽</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">문자 수</span>
            <span className="font-medium">{chapterContent.length.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">문단 수</span>
            <span className="font-medium">
              {chapterContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length}개
            </span>
          </div>
        </div>
      </div>

      {/* 작성 통계 */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <Icon name="bar-chart" size={16} />
          작성 통계
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">평균 챕터 길이</span>
            <span className="font-medium">{Math.round(averageWordsPerChapter).toLocaleString()}단어</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">마지막 수정</span>
            <span className="font-medium text-xs">
              {currentChapter.lastUpdated.toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
      </div>

      {/* 챕터 목록 */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <Icon name="list" size={16} />
          챕터 목록
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {currentBook.chapters
            .sort((a, b) => a.order - b.order)
            .map((chapter) => (
              <div 
                key={chapter.id}
                className={`p-2 rounded text-xs border transition ${
                  chapter.id === currentChapter.id
                    ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                    : 'border-border/30 bg-surface/50 dark:bg-neutral-800/30'
                }`}
              >
                <div className="font-medium line-clamp-1">{chapter.title}</div>
                <div className="text-neutral-500 dark:text-neutral-400 mt-1">
                  {chapter.wordCount.toLocaleString()} 단어
                </div>
                {chapter.wordCount === 0 && (
                  <div className="text-amber-600 dark:text-amber-400 mt-1">
                    작성되지 않음
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* 빠른 작업 */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <Icon name="zap" size={16} />
          빠른 팁
        </h3>
        <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <strong>Ctrl + S</strong>로 수동 저장할 수 있습니다.
          </div>
          <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            자동 저장은 입력 후 3초 뒤에 실행됩니다.
          </div>
          <div className="p-2 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            AI 도구를 사용해 창작 과정을 가속화하세요.
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookStats;