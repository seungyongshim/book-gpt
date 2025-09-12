import { create } from 'zustand';
import { ChatMessage, Session, ModelSettings, UsageInfo, Book, BookPage, ToolCall } from '../services/types';
import { StorageService } from '../services/storageService';
import { chatService } from '../services/chatService';
import { bookService } from '../services/bookService';
import { toolsService } from '../services/toolsService';

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
  // 스트리밍 제어
  streamingController: AbortController | null;

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

  // 책 관리
  availableBooks: Book[];
  selectedBook: Book | null;
  loadingBooks: boolean;
  referencedPage: BookPage | null;

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
  sendMessage: (signal?: AbortSignal | AbortController) => Promise<void>;
  cancelStreaming: () => void;

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

  // 책 관리
  loadBooks: () => Promise<void>;
  setSelectedBook: (book: Book | null) => void;
  getBookContext: (userInput?: string) => Promise<string>;
  detectPageReference: (input: string) => number | null;

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
  streamingController: null,
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
  availableBooks: [],
  selectedBook: null,
  loadingBooks: false,
  referencedPage: null,

  // 앱 초기화
  initializeApp: async () => {
    // React.StrictMode 환경에서는 mount -> unmount -> remount 로 useEffect가 두 번 호출될 수 있으므로
    // 이미 초기화되었다면 재실행하지 않도록 가드
    if (typeof window !== 'undefined') {
      const alreadyInit = (window as any).__CHAT_APP_INITIALIZED__;
      if (alreadyInit) {
        return; // 중복 초기화 방지
      }
      (window as any).__CHAT_APP_INITIALIZED__ = true;
    }
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

    // 모델 목록 로드 및 이전 선택 복원
    try {
      const models = await chatService.getModels();
      set({ availableModels: models });

      if (models.length > 0) {
        // 복원 우선순위: LAST_MODEL -> DEFAULT_MODEL -> models[0]
        const lastModel = localStorage.getItem('LAST_MODEL');
        const defaultModel = localStorage.getItem('DEFAULT_MODEL');
        const candidate = lastModel && models.includes(lastModel)
          ? lastModel
          : (defaultModel && models.includes(defaultModel)
            ? defaultModel
            : models[0]);
        set({ selectedModel: candidate });
        await get().loadModelSettings();
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      // 모델 API 실패 시에도 이전 선택 복원 시도
      const lastModel = localStorage.getItem('LAST_MODEL');
      if (lastModel) {
        set({ selectedModel: lastModel });
        await get().loadModelSettings();
      } else {
        const defaultModel = localStorage.getItem('DEFAULT_MODEL');
        if (defaultModel) {
          set({ selectedModel: defaultModel });
          await get().loadModelSettings();
        }
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

    // 책 데이터 로드
    get().loadBooks();

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
  sendMessage: async (signalOrController?: AbortSignal | AbortController) => {
    const state = get();

    if (state.isSending) return;
    if (!state.userInput.trim()) return;

    const model = get().getEffectiveModel();
    if (!model) {
      set({ error: '모델을 선택하거나 입력하세요.' });
      return;
    }

    set({ isSending: true, error: null });

    // 컨트롤러 정규화
    let controller: AbortController | null = null;
    let signal: AbortSignal | undefined = undefined;
    if (signalOrController instanceof AbortController) {
      controller = signalOrController;
      signal = signalOrController.signal;
    } else if (signalOrController) {
      signal = signalOrController;
    } else {
      controller = new AbortController();
      signal = controller.signal;
    }
    if (controller) {
      set({ streamingController: controller });
    }

    try {
      // 사용자 메시지 추가
      const userMessage: ChatMessage = { role: 'user', text: state.userInput.trim() };
      
      // 선택된 책이 있으면 컨텍스트 추가
      let messagesWithContext = [...state.messages, userMessage];
      const bookContext = await get().getBookContext(state.userInput.trim());
      if (bookContext) {
        // 시스템 메시지에 책 컨텍스트 추가
        const contextMessage: ChatMessage = { 
          role: 'system', 
          text: `다음은 참고할 책의 내용입니다:\n\n${bookContext}\n\n위 내용을 참고하여 사용자의 질문에 답변해주세요. 필요시 save_response_as_book_page 또는 create_book_from_response 함수를 사용하여 응답을 책으로 저장할 수 있습니다.`
        };
        messagesWithContext = [...state.messages, contextMessage, userMessage];
      } else {
        // 책 컨텍스트가 없어도 tool 사용 안내 추가
        const toolHintMessage: ChatMessage = {
          role: 'system',
          text: '필요시 save_response_as_book_page 또는 create_book_from_response 함수를 사용하여 응답을 책으로 저장할 수 있습니다.'
        };
        messagesWithContext = [...state.messages, toolHintMessage, userMessage];
      }
      
      set({ messages: messagesWithContext, userInput: '' });

      // 어시스턴트 메시지 준비
      let assistantMessage: ChatMessage = { role: 'assistant', text: '' };
      let messagesWithAssistant = [...messagesWithContext, assistantMessage];
      set({ messages: messagesWithAssistant });

      // 스트리밍 응답 처리 (컨텍스트가 포함된 메시지 사용)
      let responseText = '';
      let toolCalls: ToolCall[] = [];
      
      const stream = chatService.getResponseStreaming(
        messagesWithContext,
        model,
        state.temperature,
        state.maxTokens ?? undefined,
        signal
      );

      for await (const chunk of stream) {
        if (chunk.type === 'content' && chunk.content) {
          responseText += chunk.content;
          assistantMessage = { role: 'assistant', text: responseText };
          messagesWithAssistant = [...messagesWithContext, assistantMessage];
          set({ messages: messagesWithAssistant });
        } else if (chunk.type === 'tool_calls' && chunk.tool_calls) {
          // Tool calls 누적
          toolCalls.push(...chunk.tool_calls);
          assistantMessage = { 
            role: 'assistant', 
            text: responseText,
            tool_calls: toolCalls
          };
          messagesWithAssistant = [...messagesWithContext, assistantMessage];
          set({ messages: messagesWithAssistant });
        }
      }

      // Tool calls 실행
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          try {
            // Tool 실행
            const toolResult = await toolsService.executeToolCall(toolCall);
            
            // Tool 결과 메시지 추가
            const toolMessage: ChatMessage = {
              role: 'tool',
              text: toolResult,
              tool_call_id: toolCall.id,
              name: toolCall.function.name
            };
            
            messagesWithAssistant = [...messagesWithAssistant, toolMessage];
            set({ messages: messagesWithAssistant });

            // 책 목록이 변경되었을 수 있으므로 재로드
            get().loadBooks();
            
          } catch (error) {
            console.error('Tool execution error:', error);
            const errorMessage: ChatMessage = {
              role: 'tool',
              text: `오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
              tool_call_id: toolCall.id,
              name: toolCall.function.name
            };
            messagesWithAssistant = [...messagesWithAssistant, errorMessage];
            set({ messages: messagesWithAssistant });
          }
        }
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
      set({ isSending: false, streamingController: null });
    }
  },

  // 스트리밍 취소
  cancelStreaming: () => {
    const state = get();
    if (state.streamingController && !state.streamingController.signal.aborted) {
      try {
        state.streamingController.abort();
      } catch (e) {
        console.warn('Abort failed', e);
      }
    }
    // isSending 은 sendMessage finally에서 false되지만 즉시 UI 반영 위해 설정
    set({ isSending: false, streamingController: null });
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
    // 선택 즉시 저장하여 새로고침 복원
    localStorage.setItem('LAST_MODEL', model);
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
  },

  // 책 로드
  loadBooks: async () => {
    const state = get();
    if (state.loadingBooks) return;

    set({ loadingBooks: true });

    try {
      await bookService.initializeBooks();
      const books = await bookService.getAllBooks();
      set({ availableBooks: books });
    } catch (error) {
      console.error('Failed to load books:', error);
      set({ availableBooks: [] });
    } finally {
      set({ loadingBooks: false });
    }
  },

  // 선택된 책 설정
  setSelectedBook: (book: Book | null) => {
    set({ selectedBook: book, referencedPage: null });
  },

  // 페이지 참조 감지 (#1, #2 등)
  detectPageReference: (input: string) => {
    const match = input.match(/#(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  },

  // 책 컨텍스트 반환 (페이지 참조 지원)
  getBookContext: async (userInput?: string) => {
    const state = get();
    if (!state.selectedBook) return '';
    
    // 사용자 입력에서 페이지 참조 확인
    const pageRef = userInput ? get().detectPageReference(userInput) : null;
    
    if (pageRef) {
      // 특정 페이지 참조
      try {
        const page = await bookService.getBookPage(state.selectedBook.id, pageRef);
        if (page) {
          set({ referencedPage: page });
          return `제목: ${state.selectedBook.title}\n저자: ${state.selectedBook.author}\n\n[페이지 ${page.pageNumber}: ${page.title}]\n\n${page.content}`;
        } else {
          // 페이지가 없는 경우 전체 내용 반환
          set({ referencedPage: null });
          return `제목: ${state.selectedBook.title}\n저자: ${state.selectedBook.author}\n\n전체 내용:\n\n${state.selectedBook.content}`;
        }
      } catch (error) {
        console.error('Failed to get book page:', error);
        set({ referencedPage: null });
        return `제목: ${state.selectedBook.title}\n저자: ${state.selectedBook.author}\n\n${state.selectedBook.content}`;
      }
    } else {
      // 페이지 참조 없음 - 전체 내용 반환
      set({ referencedPage: null });
      return `제목: ${state.selectedBook.title}\n저자: ${state.selectedBook.author}\n\n${state.selectedBook.content}`;
    }
  }
}));