/**
 * Custom hook for managing message action button props
 * Eliminates duplication of MessageActionButtons prop generation
 */

import { useMemo } from 'react';

export interface MessageActionHandlers {
  onStartEdit: () => void;
  onCopy: () => void;
  onResend: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export interface MessageActionState {
  isEditing: boolean;
  messageRole: string;
  isSending: boolean;
  copied: boolean;
  isSystemReset?: boolean;
}

export interface UseMessageActionButtonsOptions {
  showFooterVariant?: boolean;
  isSystemReset?: boolean;
}

/**
 * Hook that generates consistent props for MessageActionButtons component
 */
export function useMessageActionButtons(
  state: MessageActionState,
  handlers: MessageActionHandlers,
  options: UseMessageActionButtonsOptions = {}
) {
  const { showFooterVariant = false, isSystemReset } = options;

  return useMemo(() => ({
    isEditing: state.isEditing,
    messageRole: state.messageRole,
    isSending: state.isSending,
    copied: state.copied,
    onStartEdit: handlers.onStartEdit,
    onCopy: handlers.onCopy,
    onResend: handlers.onResend,
    onDelete: handlers.onDelete,
    onSave: handlers.onSave,
    onCancel: handlers.onCancel,
    showFooterVariant,
    isSystemReset: isSystemReset ?? (state.messageRole === 'system')
  }), [
    state.isEditing,
    state.messageRole,
    state.isSending,
    state.copied,
    handlers.onStartEdit,
    handlers.onCopy,
    handlers.onResend,
    handlers.onDelete,
    handlers.onSave,
    handlers.onCancel,
    showFooterVariant,
    isSystemReset
  ]);
}