import { create } from 'zustand';
import { ChatMessage, Session, ModelSettings, UsageInfo } from '../services/types';
import { StorageService } from '../services/storageService';
import { chatService } from '../services/chatService';

// 간단한 UUID 생성 함수
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface ChatState {
  // 세션 관리
  sessions: Session[];
  currentSessionId: string | null;
  currentSession: Session | null;

  // 채팅 상태
  messages: ChatMessage[];
  userInput: string;
  isSending: boolean;
  error: string | null;

  // 모델 설정
  availableModels: string[];
  selectedModel: string;
  temperature: number;
  maxTokens: number | null;

  // UI 상태
  showMobileHistory: boolean;
  showSettingsOverlay: boolean;
  isDarkMode: boolean;

  // 메시지 편집
  editingMessageIndex: number | null;
  editingText: string;

  // 시스템 메시지
  systemMessage: string;

  // 사용량 정보
  currentUsage: UsageInfo | null;
  loadingUsage: boolean;

  // Actions
  initializeApp: () => Promise<void>;

  // 세션 관리
  newChat: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => Promise<void>;
  updateSessionTitle: () => void;
  saveSessions: () => Promise<void>;

  // 채팅
  setUserInput: (input: string) => void;
  sendMessage: (signal?: AbortSignal) => Promise<void>;

  // 메시지 관리
  startEditMessage: (index: number) => void;
  saveEditMessage: (index: number) => Promise<void>;
  cancelEditMessage: () => void;
  deleteMessage: (index: number) => Promise<void>;
  resendMessage: (index: number, signal?: AbortSignal) => Promise<void>;

  // 모델 설정
  setSelectedModel: (model: string) => Promise<void>;
  setTemperature: (temp: number) => Promise<void>;
  setMaxTokens: (tokens: number | null) => void;
  loadModelSettings: () => Promise<void>;
  saveModelSettings: () => Promise<void>;

  // 시스템 메시지
  setSystemMessage: (message: string) => Promise<void>;

  // UI 상태
  toggleMobileHistory: () => void;
  closeMobileHistory: () => void;
  toggleSettingsOverlay: () => void;
  closeSettingsOverlay: () => void;
  toggleTheme: () => Promise<void>;

  // 사용량
  loadUsage: () => Promise<void>;

  // 유틸리티
  getEffectiveModel: () => string;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 초기 상태
  sessions: [],
  currentSessionId: null,
  currentSession: null,
  messages: [],
  userInput: '',
  isSending: false,
  error: null,
  availableModels: [],
  selectedModel: '',
  temperature: 1.0,
  maxTokens: null,
  showMobileHistory: false,
  showSettingsOverlay: false,
  isDarkMode: false,
  editingMessageIndex: null,
  editingText: '',
  systemMessage: 'You are a helpful assistant.',
  currentUsage: null,
  loadingUsage: false,

  // 앱 초기화
  initializeApp: async () => {
    console.log('Initializing app...');

    // 스토리지 초기화
    await StorageService.initializeStorage();

    // 테마 로드
    const savedTheme = localStorage.getItem('THEME_PREFERENCE');
    const isDark = savedTheme === 'dark';
    set({ isDarkMode: isDark });

    // HTML 테마 속성 설정
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // 모델 목록 로드
    try {
      const models = await chatService.getModels();
      set({ availableModels: models });

      if (models.length > 0) {
        set({ selectedModel: models[0] });
        await get().loadModelSettings();
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      // 로컬 스토리지에서 마지막 사용 모델 복원
      const lastModel = localStorage.getItem('LAST_MODEL');
      if (lastModel) {
        set({ selectedModel: lastModel });
        await get().loadModelSettings();
      }
    }

    // 세션 로드
    const loadedSessions = await StorageService.loadSessions();

    if (loadedSessions.length === 0) {
      // 시스템 메시지 로드
      const savedSystemMessage = localStorage.getItem('SYSTEM_MESSAGE');
      const systemMsg = savedSystemMessage || 'You are a helpful assistant.';
      set({ systemMessage: systemMsg });

      // 기본 세션 생성
      const sessionId = generateId();
      const defaultSession: Session = {
        id: sessionId,
        title: '새 대화',
        history: [{ role: 'system', text: systemMsg }],
        lastUpdated: new Date(),
        systemMessage: systemMsg
      };

      set({
        sessions: [defaultSession],
        currentSessionId: sessionId,
        currentSession: defaultSession,
        messages: defaultSession.history
      });
    } else {
      const firstSession = loadedSessions[0];
      set({
        sessions: loadedSessions,
        currentSessionId: firstSession.id,
        currentSession: firstSession,
        messages: firstSession.history
      });

      // 현재 세션의 시스템 메시지 UI에 반영
      if (firstSession.systemMessage) {
        set({ systemMessage: firstSession.systemMessage });
      }
    }

    // 사용량 정보 로드
    get().loadUsage();

    console.log('App initialization completed');
  },

  // 새 채팅 생성
  newChat: () => {
    const state = get();
    const sessionId = generateId();
    const newSession: Session = {
      id: sessionId,
      title: '새 대화',
      history: [{ role: 'system', text: state.systemMessage }],
      lastUpdated: new Date(),
      systemMessage: state.systemMessage
    };

    const newSessions = [newSession, ...state.sessions];
    set({
      sessions: newSessions,
      currentSessionId: sessionId,
      currentSession: newSession,
      messages: newSession.history
    });

    get().saveSessions();
  },

  // 세션 전환
  switchSession: (id: string) => {
    const state = get();
    const session = state.sessions.find(s => s.id === id);
    if (session) {
      set({
        currentSessionId: id,
        currentSession: session,
        messages: session.history
      });

      // 세션의 시스템 메시지로 UI 업데이트
      if (session.systemMessage) {
        set({ systemMessage: session.systemMessage });
      }
    }
  },

  // 세션 삭제
  deleteSession: async (id: string) => {
    const state = get();
    if (state.sessions.length <= 1) return; // 최소 1개는 남김

    const newSessions = state.sessions.filter(s => s.id !== id);
    let newCurrentSession = state.currentSession;
    let newCurrentSessionId = state.currentSessionId;
    let newMessages = state.messages;

    // 삭제된 세션이 현재 활성 세션이었다면 다른 세션으로 전환
    if (state.currentSessionId === id) {
      newCurrentSession = newSessions[0];
      newCurrentSessionId = newCurrentSession.id;
      newMessages = newCurrentSession.history;
    }

    set({
      sessions: newSessions,
      currentSessionId: newCurrentSessionId,
      currentSession: newCurrentSession,
      messages: newMessages
    });

    await get().saveSessions();
  },

  // 현재 세션 제목 업데이트
  updateSessionTitle: () => {
    const state = get();
    if (!state.currentSession) return;

    const firstUserMessage = state.currentSession.history.find(m => m.role === 'user');
    if (firstUserMessage) {
      const title = firstUserMessage.text.length > 20
        ? firstUserMessage.text.substring(0, 20) + '…'
        : firstUserMessage.text;

      const updatedSession = { ...state.currentSession, title, lastUpdated: new Date() };
      const updatedSessions = state.sessions.map(s =>
        s.id === state.currentSessionId ? updatedSession : s
      );

      set({
        sessions: updatedSessions,
        currentSession: updatedSession
      });
    }
  },

  // 세션 저장
  saveSessions: async () => {
    const state = get();
    await StorageService.saveSessions(state.sessions);
  },

  // 사용자 입력 설정
  setUserInput: (input: string) => {
    set({ userInput: input });
  },

  // 메시지 전송
  sendMessage: async (signal?: AbortSignal) => {
    const state = get();

    if (state.isSending) return;
    if (!state.userInput.trim()) return;

    const model = get().getEffectiveModel();
    if (!model) {
      set({ error: '모델을 선택하거나 입력하세요.' });
      return;
    }

    set({ isSending: true, error: null });

    try {
      // 사용자 메시지 추가
      const userMessage: ChatMessage = { role: 'user', text: state.userInput.trim() };
      const newMessages = [...state.messages, userMessage];
      set({ messages: newMessages, userInput: '' });

      // 어시스턴트 메시지 준비
      const assistantMessage: ChatMessage = { role: 'assistant', text: '' };
      const messagesWithAssistant = [...newMessages, assistantMessage];
      set({ messages: messagesWithAssistant });

      // 스트리밍 응답 처리
      let responseText = '';
      const stream = chatService.getResponseStreaming(
        newMessages,
        model,
        state.temperature,
        state.maxTokens ?? undefined,
        signal
      );

      for await (const chunk of stream) {
        responseText += chunk;
        const updatedMessages = [...newMessages, { role: 'assistant' as const, text: responseText }];
        set({ messages: updatedMessages });
      }

      // 세션 업데이트
      get().updateSessionTitle();

      // 현재 세션의 메시지 업데이트
      if (state.currentSession) {
        const updatedSession = {
          ...state.currentSession,
          history: get().messages,
          lastUpdated: new Date()
        };

        const updatedSessions = state.sessions.map(s =>
          s.id === state.currentSessionId ? updatedSession : s
        );

        set({
          sessions: updatedSessions,
          currentSession: updatedSession
        });
      }

      await get().saveSessions();
      localStorage.setItem('LAST_MODEL', model);

      // 사용량 정보 업데이트 (백그라운드)
      get().loadUsage();

    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // 취소는 오류로 간주하지 않음
      } else {
        set({ error: error instanceof Error ? error.message : 'Unknown error' });

        // 빈 어시스턴트 메시지 제거
        const currentMessages = get().messages;
        if (currentMessages.length > 0 &&
          currentMessages[currentMessages.length - 1].role === 'assistant' &&
          !currentMessages[currentMessages.length - 1].text) {
          set({ messages: currentMessages.slice(0, -1) });
        }
      }
    } finally {
      set({ isSending: false });
    }
  },

  // 메시지 편집 시작
  startEditMessage: (index: number) => {
    const state = get();
    set({
      editingMessageIndex: index,
      editingText: state.messages[index]?.text || ''
    });
  },

  // 메시지 편집 저장
  saveEditMessage: async (index: number) => {
    const state = get();
    if (state.editingMessageIndex === index) {
      const updatedMessages = [...state.messages];
      updatedMessages[index] = { ...updatedMessages[index], text: state.editingText };

      set({
        messages: updatedMessages,
        editingMessageIndex: null,
        editingText: ''
      });

      // 시스템 메시지 편집한 경우
      if (updatedMessages[index].role === 'system') {
        set({ systemMessage: state.editingText });

        if (state.currentSession) {
          const updatedSession = {
            ...state.currentSession,
            systemMessage: state.editingText,
            history: updatedMessages,
            lastUpdated: new Date()
          };

          const updatedSessions = state.sessions.map(s =>
            s.id === state.currentSessionId ? updatedSession : s
          );

          set({
            sessions: updatedSessions,
            currentSession: updatedSession
          });
        }
      } else if (state.currentSession) {
        // 일반 메시지 편집한 경우
        const updatedSession = {
          ...state.currentSession,
          history: updatedMessages,
          lastUpdated: new Date()
        };

        const updatedSessions = state.sessions.map(s =>
          s.id === state.currentSessionId ? updatedSession : s
        );

        set({
          sessions: updatedSessions,
          currentSession: updatedSession
        });
      }

      await get().saveSessions();
    }
  },

  // 메시지 편집 취소
  cancelEditMessage: () => {
    set({
      editingMessageIndex: null,
      editingText: ''
    });
  },

  // 메시지 삭제
  deleteMessage: async (index: number) => {
    const state = get();
    const messageToDelete = state.messages[index];

    if (messageToDelete.role === 'system') {
      // 시스템 메시지는 삭제하지 않고 기본값으로 재설정
      const defaultSystemMessage = 'You are a helpful assistant.';
      const updatedMessages = [...state.messages];
      updatedMessages[index] = { role: 'system', text: defaultSystemMessage };

      set({
        messages: updatedMessages,
        systemMessage: defaultSystemMessage,
        editingMessageIndex: null,
        editingText: ''
      });

      if (state.currentSession) {
        const updatedSession = {
          ...state.currentSession,
          systemMessage: defaultSystemMessage,
          history: updatedMessages,
          lastUpdated: new Date()
        };

        const updatedSessions = state.sessions.map(s =>
          s.id === state.currentSessionId ? updatedSession : s
        );

        set({
          sessions: updatedSessions,
          currentSession: updatedSession
        });
      }
    } else {
      // 일반 메시지 삭제
      const updatedMessages = state.messages.filter((_, i) => i !== index);
      set({ messages: updatedMessages });

      // 편집 상태 조정
      if (state.editingMessageIndex === index) {
        set({ editingMessageIndex: null, editingText: '' });
      } else if (state.editingMessageIndex !== null && state.editingMessageIndex > index) {
        set({ editingMessageIndex: state.editingMessageIndex - 1 });
      }

      if (state.currentSession) {
        const updatedSession = {
          ...state.currentSession,
          history: updatedMessages,
          lastUpdated: new Date()
        };

        const updatedSessions = state.sessions.map(s =>
          s.id === state.currentSessionId ? updatedSession : s
        );

        set({
          sessions: updatedSessions,
          currentSession: updatedSession
        });
      }
    }

    await get().saveSessions();
  },

  // 메시지 재전송
  resendMessage: async (index: number, signal?: AbortSignal) => {
    const state = get();
    if (index < 0 || index >= state.messages.length || state.messages[index].role !== 'user') {
      return;
    }

    // 편집 모드 종료
    set({ editingMessageIndex: null, editingText: '' });

    // 해당 메시지 이후의 모든 메시지 삭제
    const messagesToKeep = state.messages.slice(0, index);
    const messageToResend = state.messages[index];

    set({
      messages: messagesToKeep,
      userInput: messageToResend.text
    });

    // 메시지 재전송
    await get().sendMessage(signal);
  },

  // 선택된 모델 설정
  setSelectedModel: async (model: string) => {
    set({ selectedModel: model });
    await get().loadModelSettings();
  },

  // 온도 설정
  setTemperature: async (temp: number) => {
    set({ temperature: temp });
    await get().saveModelSettings();
  },

  // 최대 토큰 설정
  setMaxTokens: (tokens: number | null) => {
    set({ maxTokens: tokens });
  },

  // 모델 설정 로드
  loadModelSettings: async () => {
    const state = get();
    if (!state.selectedModel) return;

    const key = `MODEL_SETTINGS::${state.selectedModel}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      try {
        const settings: ModelSettings = JSON.parse(saved);
        set({
          temperature: settings.temperature ?? 1.0,
          maxTokens: settings.maxTokens ?? null
        });
      } catch (error) {
        console.error('Failed to parse model settings:', error);
        set({ temperature: 1.0, maxTokens: null });
      }
    } else {
      set({ temperature: 1.0, maxTokens: null });
    }
  },

  // 모델 설정 저장
  saveModelSettings: async () => {
    const state = get();
    if (!state.selectedModel) return;

    const key = `MODEL_SETTINGS::${state.selectedModel}`;
    const settings: ModelSettings = {
      temperature: state.temperature,
      maxTokens: state.maxTokens ?? undefined
    };

    localStorage.setItem(key, JSON.stringify(settings));
  },

  // 시스템 메시지 설정
  setSystemMessage: async (message: string) => {
    set({ systemMessage: message });
    localStorage.setItem('SYSTEM_MESSAGE', message);

    const state = get();
    if (state.currentSession) {
      // 현재 세션의 시스템 메시지 업데이트
      const updatedSession = {
        ...state.currentSession,
        systemMessage: message,
        lastUpdated: new Date()
      };

      // 현재 세션의 첫 번째 메시지(시스템 메시지) 업데이트
      const updatedMessages = [...state.messages];
      const systemMsgIndex = updatedMessages.findIndex(m => m.role === 'system');
      if (systemMsgIndex !== -1) {
        updatedMessages[systemMsgIndex] = { role: 'system', text: message };
      } else {
        updatedMessages.unshift({ role: 'system', text: message });
      }

      updatedSession.history = updatedMessages;

      const updatedSessions = state.sessions.map(s =>
        s.id === state.currentSessionId ? updatedSession : s
      );

      set({
        sessions: updatedSessions,
        currentSession: updatedSession,
        messages: updatedMessages
      });

      await get().saveSessions();
    }
  },

  // 모바일 히스토리 토글
  toggleMobileHistory: () => {
    set(state => ({ showMobileHistory: !state.showMobileHistory }));
  },

  // 모바일 히스토리 닫기
  closeMobileHistory: () => {
    set({ showMobileHistory: false });
  },

  // 설정 오버레이 토글
  toggleSettingsOverlay: () => {
    set(state => ({ showSettingsOverlay: !state.showSettingsOverlay }));
  },

  // 설정 오버레이 닫기
  closeSettingsOverlay: () => {
    set({ showSettingsOverlay: false });
  },

  // 테마 토글
  toggleTheme: async () => {
    const state = get();
    const newDarkMode = !state.isDarkMode;

    set({ isDarkMode: newDarkMode });

    // HTML 속성 업데이트
    if (newDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // 로컬 스토리지에 저장
    localStorage.setItem('THEME_PREFERENCE', newDarkMode ? 'dark' : 'light');
  },

  // 사용량 로드
  loadUsage: async () => {
    const state = get();
    if (state.loadingUsage) return;

    set({ loadingUsage: true });

    try {
      const usage = await chatService.getUsage();
      set({ currentUsage: usage });
    } catch (error) {
      console.error('Failed to load usage:', error);
      set({ currentUsage: null });
    } finally {
      set({ loadingUsage: false });
    }
  },

  // 효과적인 모델 반환
  getEffectiveModel: () => {
    const state = get();
    return state.selectedModel || (state.availableModels.length > 0 ? state.availableModels[0] : 'gpt-4o');
  }
}));