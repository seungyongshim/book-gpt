import { useState, useRef, useEffect } from 'react';
import TemperatureDial from '../UI/TemperatureDial';
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
    <div className="chat-input-container" ref={containerRef}>
      {error && (
        <div className="error-message">
          <i className="oi oi-warning"></i>
          {error}
        </div>
      )}

      <div className="chat-input-wrapper">
        <div className="input-controls">
          {/* 모델 선택 */}
          {availableModels.length > 0 ? (
            <select
              id="model-select"
              value={selectedModel}
              onChange={handleModelChange}
              className="model-select"
            >
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder="모델명을 입력하세요"
              className="model-input"
            />
          )}

          {/* 온도 설정 (다이얼) */}
          <div className="temperature-group" aria-label="온도 설정">
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

        <div className="input-area">
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              value={localInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
              className="message-input"
              disabled={isSending}
              style={{ height: `${textareaHeight}px` }}
            />
            <div
              ref={resizeRef}
              className={`resize-handle ${isResizing ? 'resizing' : ''}`}
              onMouseDown={handleMouseDown}
              title="드래그하여 크기 조절"
            >
              <div className="resize-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSendOrCancel}
            disabled={!localInput.trim() && !isSending}
            className={`send-btn ${isSending ? 'sending' : ''}`}
            title={isSending ? "전송 취소" : "메시지 전송"}
          >
            <div className="send-btn-content">
              {isSending ? (
                <i className="oi oi-x"></i>
              ) : (
                <i className="oi oi-arrow-right"></i>
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