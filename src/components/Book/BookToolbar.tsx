import { useState } from 'react';
import { useBookStore } from '../../stores/bookStore';
import Icon from '../UI/Icon';

const BookToolbar = () => {
  const currentChapter = useBookStore(state => state.currentChapter);
  const chapterContent = useBookStore(state => state.chapterContent);
  const isGenerating = useBookStore(state => state.isGenerating);
  const generateContent = useBookStore(state => state.generateContent);
  const cancelGeneration = useBookStore(state => state.cancelGeneration);
  const updateChapterTitle = useBookStore(state => state.updateChapterTitle);
  
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [generationMode, setGenerationMode] = useState<'continue' | 'rewrite' | 'new'>('continue');
  const [customPrompt, setCustomPrompt] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleGenerate = async () => {
    if (!customPrompt.trim()) return;
    
    await generateContent(customPrompt, generationMode);
    setShowPromptDialog(false);
    setCustomPrompt('');
  };

  const openPromptDialog = (mode: 'continue' | 'rewrite' | 'new') => {
    setGenerationMode(mode);
    setShowPromptDialog(true);
    
    // 기본 프롬프트 설정
    switch (mode) {
      case 'continue':
        setCustomPrompt('이어서 작성해주세요.');
        break;
      case 'rewrite':
        setCustomPrompt('이 내용을 더 흥미롭게 다시 써주세요.');
        break;
      case 'new':
        setCustomPrompt('새로운 내용을 작성해주세요.');
        break;
    }
  };

  const handleTitleEdit = () => {
    if (!currentChapter) return;
    setNewTitle(currentChapter.title);
    setEditingTitle(true);
  };

  const saveTitleEdit = async () => {
    if (!currentChapter || !newTitle.trim()) return;
    await updateChapterTitle(currentChapter.id, newTitle.trim());
    setEditingTitle(false);
  };

  const cancelTitleEdit = () => {
    setEditingTitle(false);
    setNewTitle('');
  };

  if (!currentChapter) return null;

  return (
    <>
      <div className="flex items-center justify-between p-3">
        {/* 왼쪽: 챕터 제목 */}
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="px-2 py-1 text-sm border border-border/60 rounded bg-surface dark:bg-neutral-700 focus:outline-none focus:ring-1 focus:ring-primary/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveTitleEdit();
                  } else if (e.key === 'Escape') {
                    cancelTitleEdit();
                  }
                }}
              />
              <button
                onClick={saveTitleEdit}
                className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                title="저장"
              >
                <Icon name="check" size={14} />
              </button>
              <button
                onClick={cancelTitleEdit}
                className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                title="취소"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleTitleEdit}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
            >
              <span className="font-medium text-sm">{currentChapter.title}</span>
              <Icon name="edit" size={14} className="opacity-50" />
            </button>
          )}
        </div>

        {/* 오른쪽: AI 도구들 */}
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <button
              onClick={cancelGeneration}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition"
            >
              <Icon name="square" size={14} />
              중단
            </button>
          ) : (
            <>
              <button
                onClick={() => openPromptDialog('continue')}
                disabled={!chapterContent.trim()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-400 text-white rounded-md transition disabled:cursor-not-allowed"
                title="현재 내용에서 이어서 작성"
              >
                <Icon name="arrow-right" size={14} />
                이어쓰기
              </button>
              
              <button
                onClick={() => openPromptDialog('rewrite')}
                disabled={!chapterContent.trim()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-400 text-white rounded-md transition disabled:cursor-not-allowed"
                title="선택한 내용을 다시 작성"
              >
                <Icon name="refresh-cw" size={14} />
                다시쓰기
              </button>
              
              <button
                onClick={() => openPromptDialog('new')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded-md transition"
                title="새로운 내용 생성"
              >
                <Icon name="sparkles" size={14} />
                새로 생성
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI 프롬프트 다이얼로그 */}
      {showPromptDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-neutral-800 rounded-lg border border-border/60 shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {generationMode === 'continue' && '이어서 작성'}
              {generationMode === 'rewrite' && '내용 다시 작성'}
              {generationMode === 'new' && '새로운 내용 생성'}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="ai-prompt" className="block text-sm font-medium mb-2">
                  AI에게 요청할 내용
                </label>
                <textarea
                  id="ai-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full h-24 px-3 py-2 border border-border/60 rounded-md bg-surface dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="예: 주인공이 새로운 인물을 만나는 장면을 추가해주세요."
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowPromptDialog(false);
                    setCustomPrompt('');
                  }}
                  className="px-4 py-2 text-sm border border-border/60 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
                >
                  취소
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!customPrompt.trim()}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookToolbar;