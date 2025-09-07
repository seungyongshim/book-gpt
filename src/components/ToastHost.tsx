import React, { useEffect } from 'react';
import { useToastStore } from '../stores/toastStore';

const typeColors: Record<string, string> = {
  info: 'bg-surfaceAlt border-border',
  success: 'bg-emerald-600/90 border-emerald-400 text-white',
  error: 'bg-red-600/90 border-red-400 text-white',
  warn: 'bg-amber-500/90 border-amber-300 text-white'
};

export const ToastHost: React.FC = () => {
  const { toasts, dismiss, prune } = useToastStore();
  useEffect(() => {
    const iv = setInterval(() => prune(), 1000);
    return () => clearInterval(iv);
  }, [prune]);
  if (!toasts.length) return null;
  return (
    <div aria-live="polite" className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 w-[240px]">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`text-xs rounded shadow border p-3 animate-fade-in ${typeColors[t.type] || typeColors.info}`}
          role="status"
        >
          <div className="flex justify-between items-start gap-2">
            <span className="leading-snug whitespace-pre-wrap">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-[10px] opacity-70 hover:opacity-100">×</button>
          </div>
        </div>
      ))}
    </div>
  );
};
export default ToastHost;
