import React, { useState } from 'react';
import Icon from '../UI/Icon';
import { ChatMessage } from '../../services/types';

interface ToolCallDetailsProps {
  toolCalls: NonNullable<ChatMessage['toolCalls']>;
  className?: string;
}

// 도구 호출 정보를 펼쳐 JSON (pretty print)로 보여주는 컴포넌트
// 보기 용도만 있으며 LLM 재활용/수정 기능 없음
const ToolCallDetails: React.FC<ToolCallDetailsProps> = ({ toolCalls, className }) => {
  const [open, setOpen] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[11px] font-medium rounded-md px-2 py-1 border border-border/60 bg-surface-alt/60 dark:bg-neutral-800/60 hover:bg-surface-alt dark:hover:bg-neutral-700 transition-colors"
        aria-expanded={open}
        aria-controls="tool-call-json-panel"
      >
        <Icon name="list" size={14} />
        <span>툴 호출 JSON 보기 ({toolCalls.length})</span>
        <span className="ml-1 text-[10px] text-neutral-500 dark:text-neutral-400">{open ? '숨기기' : '펼치기'}</span>
      </button>
      {open && (
        <div
          id="tool-call-json-panel"
          className="mt-2 rounded-md border border-border/60 bg-neutral-50 dark:bg-neutral-900/70 p-2 max-h-64 overflow-auto text-xs font-mono leading-relaxed whitespace-pre text-neutral-800 dark:text-neutral-200"
        >
          {toolCalls.map((tc, idx) => {
            let parsed: any = null;
            try {
              parsed = JSON.parse(tc.arguments);
            } catch (e) {
              // 파싱 실패시 원문 그대로 표시
            }
            return (
              <div key={tc.id || idx} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary-700 dark:text-primary-300 border border-primary/30">{idx + 1}</span>
                  <span className="font-semibold">{tc.name}</span>
                  {tc.id && <code className="text-[10px] opacity-70">{tc.id}</code>}
                </div>
                <pre className="m-0 p-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
{parsed ? JSON.stringify(parsed, null, 2) : tc.arguments}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ToolCallDetails;
