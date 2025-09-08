import { create } from 'zustand';
import { nanoid } from 'nanoid';
const initialSession = () => ({
    id: nanoid(),
    mode: 'assist',
    messages: [],
    context: {}
});
export const useChatStore = create((set, get) => ({
    session: initialSession(),
    append: (m) => {
        const id = m.id || nanoid();
        const item = { id, createdAt: Date.now(), ...m };
        set({ session: { ...get().session, messages: [...get().session.messages, item] } });
        return id;
    },
    updateMessage: (id, patch) => {
        const s = get().session;
        const msgs = s.messages.map(m => m.id === id ? { ...m, ...patch, meta: { ...m.meta, ...patch.meta } } : m);
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
export function addSystemMessage(content) {
    useChatStore.getState().append({ role: 'system', content });
}
export function addUserMessage(content, mode) {
    useChatStore.getState().append({ role: 'user', content, meta: mode ? { mode } : undefined });
}
export function addAssistantMessage(content, actions, mode) {
    useChatStore.getState().append({ role: 'assistant', content, actions, meta: mode ? { mode } : undefined });
}
