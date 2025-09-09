import { useState, useRef, useEffect } from 'react';
import TemperatureDial from '../UI/TemperatureDial';
import Icon from '../UI/Icon';
import Alert from '../UI/Alert';
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
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const setTemperature = useChatStore(state => state.setTemperature);

  const [localInput, setLocalInput] = useState('');
  const [cancellationController, setCancellationController] = useState<AbortController | null>(null);
  const [textareaHeight, setTextareaHeight] = useState(60);
  const [isResizing, setIsResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // userInput 변경 시 로컬 상태도 업데이트
  useEffect(() => {
    setLocalInput(userInput);
  }, [userInput]);

  // 자동 높이 조절 기능 (최소 높이를 현재 설정된 높이로)
  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(300, Math.max(textareaHeight, scrollHeight));
      textareaRef.current.style.height = newHeight + 'px';
    }
  };

  // 수동 리사이즈 기능
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = textareaHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.min(400, Math.max(60, startHeight + deltaY));
      setTextareaHeight(newHeight);

      if (textareaRef.current) {
        textareaRef.current.style.height = newHeight + 'px';
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    autoResize();
  }, [localInput, textareaHeight]);

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
    autoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendOrCancel();
    }
  };

  const handleSendOrCancel = async () => {
    if (isSending) {
      // 취소
      if (cancellationController) {
        cancellationController.abort();
        setCancellationController(null);
      }
      return;
    }

    if (!localInput.trim()) return;

    try {
      const controller = new AbortController();
      setCancellationController(controller);

      await sendMessage(controller.signal);

      setCancellationController(null);

      // 포커스를 다시 텍스트 영역으로
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);

    } catch (error) {
      setCancellationController(null);
      console.error('Send message error:', error);
    }
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    await setSelectedModel(model);
  };

  const handleTemperatureDirectChange = async (temp: number) => {
    await setTemperature(temp);
  };

  return (
    <div ref={containerRef} className="border-t border-border/60 bg-surface-alt dark:bg-neutral-900/70 backdrop-blur pt-3 md:pt-4 px-3 md:px-6 pb-4 flex flex-col gap-3">
      {error && (
        <Alert variant="error" icon="warning">
          {error}
        </Alert>
      )}

      <div className="flex gap-4 flex-wrap items-start">
        <div className="flex items-center gap-4 flex-wrap">
          {/* 모델 선택 + 라벨 */}
          <div className="flex flex-col gap-1">
            <label htmlFor="model-select" className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">모델</label>
            {availableModels.length > 0 ? (
              <select
                id="model-select"
                aria-label="응답 생성에 사용할 모델 선택"
                value={selectedModel}
                onChange={handleModelChange}
                className="h-10 min-w-[170px] max-w-[240px] rounded-md border border-border/60 bg-surface dark:bg-neutral-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 truncate"
              >
                {selectedModel === '' && <option value="" disabled>모델 선택...</option>}
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="모델명을 입력하세요"
                  aria-label="모델명 수동 입력"
                  className="h-10 min-w-[170px] max-w-[240px] rounded-md border border-border/60 bg-surface dark:bg-neutral-800 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="absolute -bottom-4 left-0 text-[10px] text-neutral-400 dark:text-neutral-500">엔터 전에 모델명 확인</span>
              </div>
            )}
          </div>

          {/* 온도 설정 (다이얼) */}
          <div className="flex items-center" aria-label="온도 설정">
            <TemperatureDial
              value={temperature}
              onChange={handleTemperatureDirectChange}
              min={0}
              max={2}
              step={0.1}
              size={88}
              ariaLabel="온도"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[260px] flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={localInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
              className="w-full rounded-md border border-border/60 bg-surface dark:bg-neutral-800 px-3 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSending}
              style={{ height: `${textareaHeight}px` }}
            />
            <div
              ref={resizeRef}
              onMouseDown={handleMouseDown}
              title="드래그하여 크기 조절"
              className={`absolute right-2 bottom-2 cursor-row-resize select-none flex flex-col items-center justify-center gap-[2px] opacity-60 hover:opacity-100 transition ${isResizing ? 'text-primary' : 'text-neutral-400 dark:text-neutral-500'}`}
            >
              <span className="block h-[2px] w-5 rounded bg-current" />
              <span className="block h-[2px] w-5 rounded bg-current" />
              <span className="block h-[2px] w-5 rounded bg-current" />
            </div>
          </div>

          <button
            onClick={handleSendOrCancel}
            disabled={!localInput.trim() && !isSending}
            className={`h-12 shrink-0 rounded-md px-4 inline-flex items-center gap-2 font-medium shadow transition-colors border text-sm ${isSending ? 'bg-red-500 hover:bg-red-600 text-white border-red-600' : 'bg-primary/90 hover:bg-primary text-white border-primary/70'} disabled:opacity-60 disabled:cursor-not-allowed`}
            title={isSending ? "전송 취소" : "메시지 전송"}
          >
            <div className="send-btn-layout">
              {isSending ? (
                <Icon name="x" size={16} />
              ) : (
                <Icon name="arrow-right" size={16} />
              )}
              <UsageInfo />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;