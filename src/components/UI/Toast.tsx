/**
 * 토스트 알림 시스템
 * 사용자에게 즉시 피드백을 제공하는 알림 컴포넌트
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { generateId } from '../../utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

/**
 * 토스트 컨텍스트 사용 훅
 */
export const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

/**
 * 개별 토스트 컴포넌트
 */
const ToastItem: React.FC<{
  toast: Toast;
  onHide: (id: string) => void;
}> = React.memo(({ toast, onHide }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // 마운트 시 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleHide = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onHide(toast.id);
    }, 300); // 애니메이션 시간
  }, [toast.id, onHide]);

  // 자동 숨김
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleHide();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleHide]);

  const getToastStyles = () => {
    const baseStyles = 'flex items-start space-x-3 p-4 rounded-lg shadow-lg border transition-all duration-300 transform';
    const typeStyles = {
      success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
      error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
    };
    
    const visibilityStyles = isVisible && !isExiting 
      ? 'translate-x-0 opacity-100' 
      : 'translate-x-full opacity-0';
    
    return `${baseStyles} ${typeStyles[toast.type]} ${visibilityStyles}`;
  };

  const getIconName = () => {
    switch (toast.type) {
      case 'success': return 'check-circle';
      case 'error': return 'x-circle';
      case 'warning': return 'exclamation-triangle';
      case 'info': return 'information-circle';
      default: return 'information-circle';
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex-shrink-0 pt-0.5">
        <Icon name={getIconName()} className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="font-medium text-sm mb-1">
            {toast.title}
          </h4>
        )}
        <p className="text-sm">
          {toast.message}
        </p>
        
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={handleHide}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current transition-colors"
        aria-label="알림 닫기"
      >
        <Icon name="x" className="w-4 h-4" />
      </button>
    </div>
  );
});

ToastItem.displayName = 'ToastItem';

/**
 * 토스트 컨테이너 컴포넌트
 */
const ToastContainer: React.FC<{ toasts: Toast[]; onHide: (id: string) => void }> = ({ toasts, onHide }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div 
      className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full"
      aria-live="polite"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onHide={onHide}
        />
      ))}
    </div>,
    document.body
  );
};

/**
 * 토스트 프로바이더 컴포넌트
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = generateId();
    const toast: Toast = {
      id,
      duration: 4000, // 기본 4초
      ...toastData,
    };

    setToasts(prev => [...prev, toast]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // 최대 토스트 개수 제한 (5개)
  useEffect(() => {
    if (toasts.length > 5) {
      setToasts(prev => prev.slice(-5));
    }
  }, [toasts.length]);

  const contextValue: ToastContextType = {
    showToast,
    hideToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
};

/**
 * 토스트 헬퍼 함수들
 */
export const toast = {
  success: (message: string, title?: string, action?: Toast['action']) => {
    // 이 함수는 컴포넌트 외부에서 사용할 수 있도록 전역 토스트 매니저에서 구현
    console.log('Toast success:', { message, title, action });
  },
  
  error: (message: string, title?: string, action?: Toast['action']) => {
    console.log('Toast error:', { message, title, action });
  },
  
  warning: (message: string, title?: string, action?: Toast['action']) => {
    console.log('Toast warning:', { message, title, action });
  },
  
  info: (message: string, title?: string, action?: Toast['action']) => {
    console.log('Toast info:', { message, title, action });
  }
};

// 전역 토스트 매니저 (컴포넌트 외부에서 사용)
let globalToastManager: ToastContextType | null = null;

export const setGlobalToastManager = (manager: ToastContextType) => {
  globalToastManager = manager;
  
  // 헬퍼 함수들 업데이트
  toast.success = (message: string, title?: string, action?: Toast['action']) => {
    globalToastManager?.showToast({ type: 'success', message, title, action });
  };
  
  toast.error = (message: string, title?: string, action?: Toast['action']) => {
    globalToastManager?.showToast({ type: 'error', message, title, action });
  };
  
  toast.warning = (message: string, title?: string, action?: Toast['action']) => {
    globalToastManager?.showToast({ type: 'warning', message, title, action });
  };
  
  toast.info = (message: string, title?: string, action?: Toast['action']) => {
    globalToastManager?.showToast({ type: 'info', message, title, action });
  };
};