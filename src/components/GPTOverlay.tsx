import React, { useEffect, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import { useChatStore } from '../stores/chatStore';

interface GPTOverlayProps {
  open: boolean;
  onClose: ()=>void;
  children: React.ReactNode;
}

const GPTOverlay: React.FC<GPTOverlayProps> = ({ open, onClose, children }) => {
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const containerRef = useRef<HTMLDivElement|null>(null);
  const streamRunning = useChatStore(s=>s.streamRunning);
  const abortCurrent = useChatStore(s=>s.abortCurrent);

  useEffect(()=>{
    if (!open) return;
    let lastEscTime = 0;
    let abortedOnce = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const now = Date.now();
      const withinWindow = now - lastEscTime < 3000; // 3초 이내
      lastEscTime = now;
      if (streamRunning && abortCurrent) {
        abortCurrent();
        abortedOnce = true;
        return;
      }
      if (abortedOnce && withinWindow) {
        onClose();
      } else if (!streamRunning) {
        // 스트리밍 아닌 상태에서는 단일 ESC 즉시 닫기
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return ()=>document.removeEventListener('keydown', onKey);
  }, [open, streamRunning, abortCurrent, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />
      <div
        ref={(el)=>{ containerRef.current = el; (trapRef as any).current = el; }}
        role="dialog" aria-modal="true" aria-labelledby="gptChatHeading"
        className="pointer-events-auto mt-12 mr-6 w-full max-w-md bg-bg border border-border rounded-lg shadow-xl flex flex-col h-[80vh] focus:outline-none"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
};

export default GPTOverlay;
