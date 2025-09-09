/**
 * 유틸리티 함수들을 모아놓은 모듈
 */

/**
 * 현대적인 UUID 생성 함수
 * crypto.randomUUID()를 지원하는 환경에서는 이를 사용하고,
 * 그렇지 않은 경우 fallback 구현을 사용합니다.
 */
export const generateId = (): string => {
  // 현대적인 브라우저 환경에서 crypto.randomUUID() 사용
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: 기존 구현 (but with better entropy)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 디바운스 함수 - 연속적인 함수 호출을 지연시킵니다
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 쓰로틀 함수 - 함수 호출 빈도를 제한합니다
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 안전한 JSON 파싱 함수
 */
export const safeJsonParse = <T = any>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return defaultValue;
  }
};

/**
 * 텍스트 자르기 함수 (줄임표 포함)
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + '…';
};

/**
 * 키보드 이벤트 헬퍼
 */
export const isEnterKey = (event: React.KeyboardEvent): boolean => {
  return event.key === 'Enter' && !event.shiftKey;
};

export const isEnterWithShift = (event: React.KeyboardEvent): boolean => {
  return event.key === 'Enter' && event.shiftKey;
};

export const isEscapeKey = (event: React.KeyboardEvent): boolean => {
  return event.key === 'Escape';
};

/**
 * 포커스 관리 헬퍼
 */
export const focusElement = (selector: string, delay: number = 0): void => {
  setTimeout(() => {
    const element = document.querySelector(selector) as HTMLElement;
    element?.focus();
  }, delay);
};

/**
 * 클립보드 복사 함수 (modern API 사용)
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * 로컬 스토리지 안전 접근 헬퍼
 */
export const localStorageHelper = {
  get: <T = string>(key: string, defaultValue: T): T => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      // Try to parse as JSON first, fallback to string
      if (typeof defaultValue === 'string') {
        return item as unknown as T;
      }
      
      return safeJsonParse(item, defaultValue);
    } catch (error) {
      console.warn(`LocalStorage get error for key "${key}":`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): boolean => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      window.localStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      console.warn(`LocalStorage set error for key "${key}":`, error);
      return false;
    }
  },

  remove: (key: string): boolean => {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`LocalStorage remove error for key "${key}":`, error);
      return false;
    }
  },

  clear: (): boolean => {
    try {
      window.localStorage.clear();
      return true;
    } catch (error) {
      console.warn('LocalStorage clear error:', error);
      return false;
    }
  }
};

/**
 * 성능 측정 유틸리티
 */
export const measurePerformance = (name: string) => {
  const start = performance.now();
  
  return {
    end: () => {
      const end = performance.now();
      const duration = end - start;
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
  };
};

/**
 * 환경 변수 헬퍼
 */
export const env = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};