import { useState, useRef, useEffect, useCallback, memo } from 'react';
// Markdown 렌더러는 코드 스플리팅된 Lazy 컴포넌트 사용
import { MarkdownRenderer } from './MarkdownRenderer';
import { useChatStore } from '../../stores/chatStore';
import { ChatMessage } from '../../services/types';
import MessageActionButtons from './MessageActionButtons';
import { copyToClipboard, isEscapeKey } from '../../utils';

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

  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(120, textareaRef.current.scrollHeight) + 'px';
    }
  }, []);

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
  }, [isEditing, editingText, autoResize]);

  const handleStartEdit = useCallback(() => {
    startEditMessage(messageIndex);
  }, [startEditMessage, messageIndex]);

  const handleSaveEdit = useCallback(async () => {
    await saveEditMessage(messageIndex);
  }, [saveEditMessage, messageIndex]);

  const handleCancelEdit = useCallback(() => {
    cancelEditMessage();
    setLocalEditText('');
  }, [cancelEditMessage]);

  const handleDelete = useCallback(async () => {
    await deleteMessage(messageIndex);
  }, [deleteMessage, messageIndex]);

  const handleResend = useCallback(async () => {
    if (isSending) return;
    await resendMessage(messageIndex);
  }, [resendMessage, messageIndex, isSending]);

  const handleCopyToClipboard = useCallback(async () => {
    const success = await copyToClipboard(message.text);
    if (success) {
      console.log('텍스트가 클립보드에 복사되었습니다.');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      console.error('클립보드 복사 실패');
    }
  }, [message.text]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalEditText(newText);
    // Store에도 업데이트 (실시간 동기화)
    useChatStore.setState({ editingText: newText });
    autoResize();
  }, [autoResize]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (isEscapeKey(e)) {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'user': return '사용자';
      case 'assistant': return '어시스턴트';
      case 'system': return '시스템';
      default: return role;
    }
  };

  const getRoleClass = (role: string) => {
    const base = 'chat-bubble-base';
    switch (role) {
      case 'user': return base + ' chat-bubble-user self-end';
      case 'assistant': return base + ' chat-bubble-assistant';
      case 'system': return base + ' chat-bubble-system';
      default: return base;
    }
  };

  const isLastAssistantMessage =
    message.role === 'assistant' &&
    messages.length > 0 &&
    messages[messages.length - 1] === message;
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
          <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
            {message.role === 'assistant' ? (
              <MarkdownRenderer text={message.text} />
            ) : (
              <>{message.text}</>
            )}
          </div>
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
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MessageItem);