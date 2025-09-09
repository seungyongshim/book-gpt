import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useChatStore } from '../../stores/chatStore';
import { ChatMessage } from '../../services/types';

interface MessageItemProps {
  message: ChatMessage;
  messageIndex: number;
}

const MessageItem = ({ message, messageIndex }: MessageItemProps) => {
  const editingMessageIndex = useChatStore(state => state.editingMessageIndex);
  const editingText = useChatStore(state => state.editingText);
  const startEditMessage = useChatStore(state => state.startEditMessage);
  const saveEditMessage = useChatStore(state => state.saveEditMessage);
  const cancelEditMessage = useChatStore(state => state.cancelEditMessage);
  const deleteMessage = useChatStore(state => state.deleteMessage);
  const resendMessage = useChatStore(state => state.resendMessage);
  const isSending = useChatStore(state => state.isSending);
  const messages = useChatStore(state => state.messages);

  const [localEditText, setLocalEditText] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = editingMessageIndex === messageIndex;

  useEffect(() => {
    if (isEditing) {
      setLocalEditText(editingText);
      // 다음 렌더링 사이클에서 포커스 및 크기 조절
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          autoResize();
        }
      }, 50);
    }
  }, [isEditing, editingText]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(120, textareaRef.current.scrollHeight) + 'px';
    }
  };

  const handleStartEdit = () => {
    startEditMessage(messageIndex);
  };

  const handleSaveEdit = async () => {
    await saveEditMessage(messageIndex);
  };

  const handleCancelEdit = () => {
    cancelEditMessage();
    setLocalEditText('');
  };

  const handleDelete = async () => {
    await deleteMessage(messageIndex);
  };

  const handleResend = async () => {
    if (isSending) return;
    await resendMessage(messageIndex);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      console.log('텍스트가 클립보드에 복사되었습니다.');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      // 폴백: 텍스트 선택을 통한 복사
      const textArea = document.createElement('textarea');
      textArea.value = message.text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        console.log('폴백 방법으로 클립보드에 복사되었습니다.');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error('폴백 복사도 실패:', fallbackError);
      }

      document.body.removeChild(textArea);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalEditText(newText);
    // Store에도 업데이트 (실시간 동기화)
    useChatStore.setState({ editingText: newText });
    autoResize();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'user': return '사용자';
      case 'assistant': return '어시스턴트';
      case 'system': return '시스템';
      default: return role;
    }
  };

  const getRoleClass = (role: string) => {
    return `message-item message-${role}`;
  };

  const isLastAssistantMessage =
    message.role === 'assistant' &&
    messages.length > 0 &&
    messages[messages.length - 1] === message;
  const charCount = isEditing ? localEditText.length : message.text.length;

  return (
    <div className={getRoleClass(message.role)}>
      <div className="message-header">
        <div className="message-role">{getRoleDisplayName(message.role)}</div>
        <div className="message-actions">
          {!isEditing && (
            <>
              <button
                className="message-action-btn"
                onClick={handleStartEdit}
                title="편집"
              >
                <i className="oi oi-pencil"></i>
              </button>

              <button
                className="message-action-btn copy-btn"
                onClick={handleCopyToClipboard}
                title="복사"
              >
                <i className="oi oi-clipboard"></i>
              </button>
              {copied && (
                <span className="copy-feedback" aria-live="polite">복사됨</span>
              )}

              {message.role === 'user' && (
                <button
                  className="message-action-btn"
                  onClick={handleResend}
                  disabled={isSending}
                  title="재전송"
                >
                  <i className="oi oi-reload"></i>
                </button>
              )}

              <button
                className="message-action-btn delete-btn"
                onClick={handleDelete}
                title={message.role === 'system' ? "기본값으로 재설정" : "삭제"}
              >
                <i className={message.role === 'system' ? "oi oi-loop-circular" : "oi oi-trash"}></i>
              </button>
            </>
          )}

          {isEditing && (
            <>
              <button
                className="message-action-btn save-btn"
                onClick={handleSaveEdit}
                title="저장 (Ctrl+Enter)"
              >
                <i className="oi oi-check"></i>
              </button>

              <button
                className="message-action-btn cancel-btn"
                onClick={handleCancelEdit}
                title="취소 (Esc)"
              >
                <i className="oi oi-x"></i>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="message-content">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localEditText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="message-edit-textarea"
            placeholder="메시지를 입력하세요..."
          />
        ) : (
          <div className="message-text">
            {message.role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  a: (props) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  )
                }}
              >
                {message.text}
              </ReactMarkdown>
            ) : (
              <>{message.text}</>
            )}
          </div>
        )}

        {/* 어시스턴트 메시지 하단에 문자수 카운트 상시 표시
            - 스트리밍 중 마지막 어시스턴트일 때만 aria-live로 부드럽게 업데이트 */}
        {message.role === 'assistant' && (
          <div className="message-meta">
            <span
              className="char-counter"
              aria-live={isLastAssistantMessage && isSending ? 'polite' : 'off'}
            >
              {charCount.toLocaleString()}자
            </span>
          </div>
        )}

        {/* 어시스턴트(응답) 메시지 버블 하단에도 동일한 액션 버튼 표시 */}
        {message.role === 'assistant' && !isEditing && (
          <div className="message-footer">
            <div className="message-actions">
              <button
                className="message-action-btn"
                onClick={handleStartEdit}
                title="편집"
                aria-label="편집"
              >
                <i className="oi oi-pencil"></i>
              </button>

              <button
                className="message-action-btn copy-btn"
                onClick={handleCopyToClipboard}
                title="복사"
                aria-label="복사"
              >
                <i className="oi oi-clipboard"></i>
              </button>
              {copied && (
                <span className="copy-feedback" aria-live="polite">복사됨</span>
              )}

              <button
                className="message-action-btn delete-btn"
                onClick={handleDelete}
                title="삭제"
                aria-label="삭제"
              >
                <i className="oi oi-trash"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;