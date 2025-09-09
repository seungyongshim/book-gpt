/**
 * 앱 전반에서 사용되는 상수들
 */

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  THEME_PREFERENCE: 'THEME_PREFERENCE',
  LAST_MODEL: 'LAST_MODEL',
  SYSTEM_MESSAGE: 'SYSTEM_MESSAGE',
  MODEL_SETTINGS: 'MODEL_SETTINGS',
} as const;

// 기본값들
export const DEFAULTS = {
  SYSTEM_MESSAGE: 'You are a helpful assistant.',
  TEMPERATURE: 1.0,
  MAX_TOKENS: null,
  SESSION_TITLE: '새 대화',
  TEXTAREA_MIN_HEIGHT: 60,
  TEXTAREA_MAX_HEIGHT: 400,
  AUTOCOMPLETE_DELAY: 150,
} as const;

// API 관련 상수
export const API = {
  TIMEOUT: {
    DEFAULT: 5 * 60 * 1000, // 5분
    MODELS: 30 * 1000, // 30초
    USAGE: 15 * 1000, // 15초
  },
  ENDPOINTS: {
    MODELS: '/v1/models',
    CHAT: '/v1/chat/completions',
    USAGE: '/usage',
  },
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    ANTHROPIC_BETA: 'output-128k-2025-02-19',
  },
} as const;

// UI 관련 상수
export const UI = {
  NOTIFICATION_DURATION: 2000, // 2초
  DEBOUNCE_DELAY: 150,
  THROTTLE_DELAY: 100,
  FOCUS_DELAY: 100,
  ANIMATION_DURATION: 300,
} as const;

// 텍스트 처리 상수
export const TEXT = {
  MAX_TITLE_LENGTH: 20,
  TITLE_ELLIPSIS: '…',
  MIN_PASSWORD_LENGTH: 8,
} as const;

// 성능 상수
export const PERFORMANCE = {
  LAZY_LOAD_DELAY: 50,
  SCROLL_THROTTLE: 16, // ~60fps
  RESIZE_DEBOUNCE: 250,
} as const;

// 개발 환경 상수
export const DEV = {
  LOG_PREFIX: '⏱️',
  ERROR_PREFIX: '❌',
  SUCCESS_PREFIX: '✅',
} as const;

// 접근성 상수
export const A11Y = {
  LIVE_REGION_DELAY: 100,
  FOCUS_VISIBLE_DELAY: 150,
  SCREEN_READER_DELAY: 250,
} as const;

// 색상 시스템 (Tailwind와 매핑)
export const COLORS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'red-500',
  SUCCESS: 'green-500',
  WARNING: 'yellow-500',
  INFO: 'blue-500',
} as const;

// 파일 타입
export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT: ['application/pdf', 'text/plain', 'text/markdown'],
  JSON: 'application/json',
} as const;

// 정규식 패턴
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
} as const;

// 키보드 단축키
export const SHORTCUTS = {
  SEND_MESSAGE: 'Enter',
  NEW_LINE: 'Shift+Enter',
  CANCEL_EDIT: 'Escape',
  SAVE_EDIT: 'Ctrl+Enter',
  NEW_CHAT: 'Ctrl+Shift+N',
  TOGGLE_SIDEBAR: 'Ctrl+B',
  TOGGLE_SETTINGS: 'Ctrl+,',
} as const;

// 에러 메시지
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 연결을 확인해 주세요.',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  CLIPBOARD_ERROR: '클립보드 복사에 실패했습니다.',
  MODEL_REQUIRED: '모델을 선택하거나 입력하세요.',
  EMPTY_MESSAGE: '메시지를 입력해 주세요.',
} as const;