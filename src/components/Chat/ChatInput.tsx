import { useState, useRef, useEffect, useCallback } from 'react';
import { useInputHistory } from '../../hooks/useInputHistory';
import Icon from '../UI/Icon';
import Alert from '../UI/Alert';
import BookSelector from '../UI/BookSelector';
import { useChatStore } from '../../stores/chatStore';
import UsageInfo from '../UI/UsageInfo';

const ChatInput = () => {
  const userInput = useChatStore(state => state.userInput);
  const isSending = useChatStore(state => state.isSending);
  const error = useChatStore(state => state.error);
  const temperature = useChatStore(state => state.temperature);
  const availableModels = useChatStore(state => state.availableModels);
  const selectedModel = useChatStore(state => state.selectedModel);

  const setUserInput = useChatStore(state => state.setUserInput);
  const sendMessage = useChatStore(state => state.sendMessage);
  const cancelStreaming = useChatStore(state => state.cancelStreaming);
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const setTemperature = useChatStore(state => state.setTemperature);

  const [localInput, setLocalInput] = useState('');
  const [textareaHeight] = useState(52); // 기본 높이 (고정 시작 높이)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputHistory = useInputHistory();

  // userInput 변경 시 로컬 상태도 업데이트
  useEffect(() => {
    setLocalInput(userInput);
  }, [userInput]);

  // 자동 높이 조절 기능 (최소 높이를 현재 설정된 높이로)
  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(300, Math.max(textareaHeight, scrollHeight));
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [textareaHeight]);

  // 수동 리사이즈 기능
  // (이전 수동 리사이즈 제거 – 자동 높이만)

  useEffect(() => {
    autoResize();
  }, [localInput, textareaHeight, autoResize]);

  // 입력 컨테이너 높이를 CSS 변수로 반영하여 컨텐츠 하단 패딩과 동기화
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateVar = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--chat-input-h', `${Math.ceil(h)}px`);
    };

    updateVar();

    const ro = new ResizeObserver(() => updateVar());
    ro.observe(el);

    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--chat-input-h');
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalInput(value);
    setUserInput(value);
    inputHistory.resetPointer();
    autoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME 조합 중이면 무시
    const anyEvt: any = e; // IME 조합 상태 확인용
    if (anyEvt.isComposing) return;

    // 전송 단축키
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendOrCancel();
      return;
    }

    // 히스토리 탐색 (빈 입력 상태에서만)
  if (!e.shiftKey && (localInput.trim() === '' || inputHistory.isNavigating()) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      if (!inputHistory.ready) return; // 아직 로드 안됨
      e.preventDefault();
      if (e.key === 'ArrowUp') {
        const prev = inputHistory.prev();
        if (prev !== null) {
          setLocalInput(prev);
          setUserInput(prev);
        }
      } else if (e.key === 'ArrowDown') {
        const next = inputHistory.next();
        if (next !== null) {
          setLocalInput(next);
          setUserInput(next);
        }
      }
      // 커서를 끝으로 이동
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const len = textareaRef.current.value.length;
          textareaRef.current.selectionStart = len;
          textareaRef.current.selectionEnd = len;
        }
      });
    }
  };

  const handleSendOrCancel = async () => {
    if (isSending) {
      cancelStreaming();
      return;
    }

    if (!localInput.trim()) return;

    try {
      const controller = new AbortController();
      const originalInput = localInput; // 전송 직전 내용 보관
      // sendMessage는 AbortController도 허용 (스토어 내부에서 처리)
      await sendMessage(controller);

      // 히스토리에 기록 (비동기, 실패 무시)
      inputHistory.record(originalInput).catch(() => {});

      // 포커스를 다시 텍스트 영역으로
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);

    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    await setSelectedModel(model);
  };

  const handleTemperatureSlide = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    await setTemperature(v);
  };

  return (
  <div ref={containerRef} className="absolute inset-x-0 bottom-0 w-full z-10 border-t border-border/40 bg-gradient-to-b from-neutral-50/60 via-neutral-50/80 to-neutral-100/90 dark:from-neutral-900/40 dark:via-neutral-900/60 dark:to-neutral-900/80 backdrop-blur-md">
      <div className="px-3 md:px-6 pt-3 md:pt-4 flex flex-col gap-2">
        {error && (
          <Alert variant="error" icon="warning">
            {error}
          </Alert>
        )}
        {/* 입력 영역 */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={localInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요. Ctrl+Enter 전송"
            className="w-full rounded-md bg-neutral-100/70 dark:bg-neutral-800/70 border border-border/60 px-3 py-3 pr-14 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none scrollbar-thin"
            style={{ height: `${textareaHeight}px` }}
            disabled={isSending}
            aria-label="채팅 메시지 입력"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleSendOrCancel}
              disabled={!localInput.trim() && !isSending}
              className={`w-9 h-9 rounded-md flex items-center justify-center text-white text-sm font-medium shadow transition-colors ${isSending ? 'bg-red-500 hover:bg-red-600' : 'bg-primary/90 hover:bg-primary disabled:opacity-60 disabled:cursor-not-allowed'}`}
              aria-label={isSending ? '전송 취소' : '메시지 전송'}
            >
              {isSending ? <Icon name="x" size={18} /> : <Icon name="arrow-right" size={18} />}
            </button>
          </div>
          <div className="absolute -bottom-5 right-1 text-[10px] text-neutral-500 dark:text-neutral-400"><UsageInfo /></div>
        </div>
        {/* 하단 컨트롤 바 */}
        <div className="flex flex-wrap items-center gap-3 py-2 px-2 rounded-md bg-neutral-100/60 dark:bg-neutral-800/60 border border-border/50">
          {/* 책 선택 */}
          <BookSelector />
          
          <div className="flex items-center gap-2">
            {availableModels.length > 0 ? (
              <select
                aria-label="모델 선택"
                value={selectedModel}
                onChange={handleModelChange}
                className="h-8 rounded-md bg-white/70 dark:bg-neutral-900/60 border border-border/60 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {selectedModel === '' && <option value="" disabled>모델…</option>}
                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input
                aria-label="모델명 입력"
                placeholder="모델명"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="h-8 w-[140px] rounded-md bg-white/70 dark:bg-neutral-900/60 border border-border/60 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Temp</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={handleTemperatureSlide}
              aria-label="온도"
              className="h-2 w-32 accent-primary cursor-pointer"
            />
            <span className="text-xs tabular-nums w-8 text-right text-neutral-600 dark:text-neutral-300">{temperature.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChatInput;