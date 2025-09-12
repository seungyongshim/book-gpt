import { useBookStore } from '../../stores/bookStore';

interface BookEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  lastSaved: Date | null;
}

const BookEditor = ({ content, onContentChange, lastSaved }: BookEditorProps) => {
  const currentChapter = useBookStore(state => state.currentChapter);
  const isGenerating = useBookStore(state => state.isGenerating);
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value);
  };

  // 단어 수 계산
  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(word => word.length > 0).length : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 챕터 헤더 */}
      <div className="shrink-0 p-4 border-b border-border/30 bg-surface/50">
        <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
          {currentChapter?.title || '제목 없음'}
        </h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          <span>{wordCount.toLocaleString()} 단어</span>
          <span>•</span>
          <span>약 {Math.ceil(wordCount / 250)} 페이지</span>
          {lastSaved && (
            <>
              <span>•</span>
              <span>
                마지막 저장: {lastSaved.toLocaleTimeString()}
              </span>
            </>
          )}
          {isGenerating && (
            <>
              <span>•</span>
              <span className="text-primary">AI 생성 중...</span>
            </>
          )}
        </div>
      </div>

      {/* 에디터 영역 */}
      <div className="flex-1 p-4 overflow-hidden">
        <textarea
          value={content}
          onChange={handleTextareaChange}
          disabled={isGenerating}
          className="w-full h-full resize-none bg-transparent border-none focus:outline-none text-base leading-relaxed font-serif placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          placeholder={
            currentChapter?.order === 0 
              ? "여기에 첫 번째 챕터를 작성해보세요. AI의 도움을 받으려면 상단 툴바의 버튼을 사용하세요."
              : "이 챕터의 내용을 작성해보세요. 언제든지 AI의 도움을 요청할 수 있습니다."
          }
          spellCheck={true}
          style={{
            fontFamily: '"Noto Serif KR", "Times New Roman", serif',
            lineHeight: '1.8'
          }}
        />
      </div>
    </div>
  );
};

export default BookEditor;