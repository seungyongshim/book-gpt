import { useState, useRef, useEffect } from 'react';
// Markdown 렌더러는 코드 스플리팅된 Lazy 컴포넌트 사용
import { MarkdownRenderer } from './MarkdownRenderer';
import { useChatStore } from '../../stores/chatStore';
import { ChatMessage } from '../../services/types';
import MessageActionButtons from './MessageActionButtons';

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
  const cancelStreaming = useChatStore(state => state.cancelStreaming);
  const streamingController = useChatStore(state => state.streamingController);

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
      case 'tool': return '도구 실행 결과';
      default: return role;
    }
  };

  const getRoleClass = (role: string) => {
    const base = 'chat-bubble-base';
    switch (role) {
      case 'user': return base + ' chat-bubble-user self-end';
      case 'assistant': return base + ' chat-bubble-assistant';
      case 'system': return base + ' chat-bubble-system';
      case 'tool': return base + ' chat-bubble-tool border-l-4 border-l-blue-400';
      default: return base;
    }
  };

  // Tool calls 렌더링을 위한 함수
  const renderToolCalls = () => {
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 space-y-2">
        {message.tool_calls.map((toolCall, index) => (
          <div key={`${toolCall.id}-${index}`} className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3 border-l-4 border-l-blue-400">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
              🛠️ 도구 호출: {toolCall.function.name}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isLastAssistantMessage =
    message.role === 'assistant' &&
    messages.length > 0 &&
    messages[messages.length - 1] === message;
  const isStreamingThis = isLastAssistantMessage && isSending && streamingController !== null;
  const charCount = isEditing ? localEditText.length : message.text.length;

  return (
    <div className={getRoleClass(message.role)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
          {getRoleDisplayName(message.role)}
        </div>
        <MessageActionButtons
          isEditing={isEditing}
          messageRole={message.role}
          isSending={isSending}
          copied={copied}
          onStartEdit={handleStartEdit}
          onCopy={handleCopyToClipboard}
            onResend={handleResend}
          onDelete={handleDelete}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          isSystemReset={message.role === 'system'}
          showStop={isStreamingThis}
          onStop={cancelStreaming}
        />
      </div>

      <div className="space-y-2 text-sm leading-relaxed">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localEditText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-border/60 bg-surface-alt dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder="메시지를 입력하세요..."
          />
        ) : (
          <>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm whitespace-pre-wrap break-words">
              <MarkdownRenderer text={message.text} />
            </div>
            {/* Tool calls 렌더링 */}
            {renderToolCalls()}
            {/* Tool message인 경우 함수 이름 표시 */}
            {message.role === 'tool' && message.name && (
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                📋 {message.name} 실행 완료
              </div>
            )}
          </>
        )}

        {/* 어시스턴트 메시지 하단에 문자수 카운트 상시 표시
            - 스트리밍 중 마지막 어시스턴트일 때만 aria-live로 부드럽게 업데이트 */}
        {message.role === 'assistant' && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            <span aria-live={isLastAssistantMessage && isSending ? 'polite' : 'off'}>
              {charCount.toLocaleString()}자
            </span>
          </div>
        )}

        {/* 어시스턴트(응답) 메시지 버블 하단에도 동일한 액션 버튼 표시 */}
        {message.role === 'assistant' && !isEditing && (
          <div className="pt-1">
            <MessageActionButtons
              isEditing={false}
              messageRole={message.role}
              isSending={isSending}
              copied={copied}
              onStartEdit={handleStartEdit}
              onCopy={handleCopyToClipboard}
              onResend={handleResend}
              onDelete={handleDelete}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              showFooterVariant
              isSystemReset={false}
              showStop={isStreamingThis}
              onStop={cancelStreaming}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;