import React from 'react';
import IconButton from '../UI/IconButton';

interface MessageActionButtonsProps {
  isEditing: boolean;
  messageRole: string;
  isSending: boolean;
  copied: boolean;
  onStartEdit: () => void;
  onCopy: () => void;
  onResend: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  showFooterVariant?: boolean; // footer 위치 (assistant)
  isSystemReset?: boolean;
}

const MessageActionButtons: React.FC<MessageActionButtonsProps> = ({
  isEditing,
  messageRole,
  isSending,
  copied,
  onStartEdit,
  onCopy,
  onResend,
  onDelete,
  onSave,
  onCancel,
  showFooterVariant,
  isSystemReset
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <IconButton icon="check" variant="success" title="저장 (Ctrl+Enter)" ariaLabel="저장" onClick={onSave} />
        <IconButton icon="x" title="취소 (Esc)" ariaLabel="취소" onClick={onCancel} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <IconButton icon="pencil" title="편집" ariaLabel="편집" onClick={onStartEdit} />
      <IconButton icon="clipboard" title="복사" ariaLabel="복사" onClick={onCopy} />
      {copied && (
        <span className="text-xs text-green-600 dark:text-green-400" aria-live="polite">복사됨</span>
      )}
      {messageRole === 'user' && !showFooterVariant && (
        <IconButton icon="reload" title="재전송" ariaLabel="재전송" onClick={onResend} disabled={isSending} />
      )}
      <IconButton
        icon={isSystemReset ? 'loop-circular' : 'trash'}
        variant="danger"
        title={isSystemReset ? '기본값으로 재설정' : '삭제'}
        ariaLabel={isSystemReset ? '기본값으로 재설정' : '삭제'}
        onClick={onDelete}
      />
    </div>
  );
};

export default MessageActionButtons;
