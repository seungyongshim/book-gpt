import { create } from 'zustand';
import { nanoid } from 'nanoid';

// Chat message + session (MVP: single session, in-memory)
export type ChatMode = 'assist' | 'extend' | 'ref';

export interface ChatAction {
  type: 'insert' | 'replace' | 'newPage';
  label: string;
  payload?: any;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ChatAction[]; // assistant 제안에 대한 후속 버튼
  meta?: { mode?: ChatMode; applied?: boolean; errorType?: string; selectionHash?: string };
  createdAt: number;
}

export interface ChatContextSnapshot {
  bookId?: string;
  pageId?: string;
  selection?: string; // 선택 텍스트 (optional, 긴 경우 앞/뒤 절단)
  references?: string[]; // '@3','@5-6'
  worldDirty?: boolean;
  pageTail?: string; // extend 모드용
}

export interface ChatSessionState {
  id: string;
  mode: ChatMode;
  messages: ChatMessageItem[];
  context: ChatContextSnapshot;
}

interface ChatStoreState {
  session: ChatSessionState;
  append: (m: Omit<ChatMessageItem, 'id' | 'createdAt'> & { id?: string }) => string;
  updateMessage: (id: string, patch: Partial<ChatMessageItem>) => void;
  setMode: (mode: ChatMode) => void;
  setContext: (patch: Partial<ChatContextSnapshot>) => void;
  reset: () => void;
  // streaming 상태(A11 ESC 이중 동작/FAB indicator 용)
  streamRunning: boolean;
  setStreamRunning: (running: boolean) => void;
  abortCurrent?: () => void; // 현재 스트림 abort 핸들러 (ESC 1회차)
  setAbortHandler: (fn?: () => void) => void;
}

const initialSession = (): ChatSessionState => ({
  id: nanoid(),
  mode: 'assist',
  messages: [],
  context: {}
});

export const useChatStore = create<ChatStoreState>((set, get) => ({
  session: initialSession(),
  append: (m) => {
    const id = m.id || nanoid();
    const item: ChatMessageItem = { id, createdAt: Date.now(), ...m } as ChatMessageItem;
    set({ session: { ...get().session, messages: [...get().session.messages, item] } });
    return id;
  },
  updateMessage: (id, patch) => {
    const s = get().session;
    const msgs = s.messages.map(m=> m.id===id ? { ...m, ...patch, meta: { ...m.meta, ...patch.meta } } : m);
    set({ session: { ...s, messages: msgs } });
  },
  setMode: (mode) => set({ session: { ...get().session, mode } }),
  setContext: (patch) => set({ session: { ...get().session, context: { ...get().session.context, ...patch } } }),
  reset: () => set({ session: initialSession(), streamRunning: false, abortCurrent: undefined }),
  streamRunning: false,
  setStreamRunning: (running) => set({ streamRunning: running }),
  setAbortHandler: (fn) => set({ abortCurrent: fn })
}));

// Convenience helpers
export function addSystemMessage(content: string) {
  useChatStore.getState().append({ role: 'system', content });
}
export function addUserMessage(content: string, mode?: ChatMode) {
  useChatStore.getState().append({ role: 'user', content, meta: mode ? { mode } : undefined });
}
export function addAssistantMessage(content: string, actions?: ChatAction[], mode?: ChatMode) {
  useChatStore.getState().append({ role: 'assistant', content, actions, meta: mode ? { mode } : undefined });
}
