import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
  createdAt: number;
  ttl: number; // ms
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id' | 'createdAt'> & { id?: string }) => string;
  dismiss: (id: string) => void;
  prune: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ type, message, ttl = 4000, id }) => {
    const tid = id || crypto.randomUUID();
    const item: ToastItem = { id: tid, type, message, ttl, createdAt: Date.now() };
    set({ toasts: [...get().toasts, item] });
    return tid;
  },
  dismiss: (id: string) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
  prune: () => set({ toasts: get().toasts.filter(t => Date.now() - t.createdAt < t.ttl) })
}));

// Optional helper
export function toast(message: string, type: ToastItem['type']='info', ttl=4000) {
  useToastStore.getState().push({ type, message, ttl });
}
