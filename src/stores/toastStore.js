import { create } from 'zustand';
export const useToastStore = create((set, get) => ({
    toasts: [],
    push: ({ type, message, ttl = 4000, id }) => {
        const tid = id || crypto.randomUUID();
        const item = { id: tid, type, message, ttl, createdAt: Date.now() };
        set({ toasts: [...get().toasts, item] });
        return tid;
    },
    dismiss: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
    prune: () => set({ toasts: get().toasts.filter(t => Date.now() - t.createdAt < t.ttl) })
}));
// Optional helper
export function toast(message, type = 'info', ttl = 4000) {
    useToastStore.getState().push({ type, message, ttl });
}
