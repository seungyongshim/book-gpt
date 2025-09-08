import React from 'react';
import { useChatStore } from '../stores/chatStore';

interface FloatingGPTButtonProps { onOpen: ()=>void; }

const FloatingGPTButton: React.FC<FloatingGPTButtonProps> = ({ onOpen }) => {
  const running = useChatStore(s=>s.streamRunning);
  const label = running ? 'GPT 어시스턴트 열기 (생성 진행중)' : 'GPT 어시스턴트 열기';
  return (
    <button
      onClick={onOpen}
      aria-label={label}
      className="fixed z-50 bottom-6 right-6 rounded-full bg-primary text-white shadow-lg w-14 h-14 flex items-center justify-center text-lg font-bold hover:scale-105 transition relative"
    >
      GPT
      {running && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent animate-ping" aria-hidden="true" />}
      {running && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent" aria-hidden="true" />}
    </button>
  );
};

export default FloatingGPTButton;
