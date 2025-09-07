import React, { useMemo } from 'react';
import TokenMeter from './TokenMeter';
import { PromptLayer } from '../types/domain';

interface PromptDrawerProps {
  open: boolean;
  onClose: () => void;
  layer: PromptLayer;
  onCopy?: (text: string) => void; // optional override
}

export const PromptDrawer: React.FC<PromptDrawerProps> = ({ open, onClose, layer, onCopy }) => {
  const fullText = useMemo(()=>{
    const parts: string[] = [];
    const push = (label: string, v?: string) => { if (v) parts.push(`[${label}]\n${v}`); };
    push('system', layer.system);
    push('bookSystem', layer.bookSystem);
    push('worldDerived', layer.worldDerived);
    push('pageSystem', layer.pageSystem);
    if (layer.dynamicContext?.length) {
      parts.push('[dynamicContext]\n' + layer.dynamicContext.map(d=>`${d.ref}: ${d.summary}`).join('\n---\n'));
    }
    push('userInstruction', layer.userInstruction);
    return parts.join('\n\n');
  }, [layer]);

  const copy = (text: string) => {
    if (onCopy) onCopy(text); else navigator.clipboard?.writeText(text).catch(()=>{});
  };

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute top-0 right-0 h-full w-[400px] bg-bg border-l border-border shadow-xl transform transition-transform duration-200 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between border-b border-border gap-2">
          <h3 className="text-sm font-semibold">Prompt Preview</h3>
          <div className="flex gap-2">
            <button onClick={()=>copy(fullText)} className="text-[10px] px-2 py-1 rounded border border-border hover:bg-surfaceAlt">Copy All</button>
            <button onClick={onClose} className="text-[10px] px-2 py-1 rounded border border-border hover:bg-surfaceAlt">닫기</button>
          </div>
        </div>
        <div className="p-3 border-b border-border">
          <TokenMeter layer={layer} showBreakdown />
        </div>
        <div className="p-3 overflow-y-auto flex-1 space-y-4 text-xs">
          {(['system','bookSystem','worldDerived','pageSystem'] as const).map(k => (layer as any)[k] && (
            <div key={k} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-[11px] uppercase tracking-wide text-text-dim">{k}</div>
                <button onClick={()=>copy((layer as any)[k])} className="opacity-0 group-hover:opacity-100 transition text-[10px] px-1 py-0.5 border border-border rounded">Copy</button>
              </div>
              <pre className="whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto">{(layer as any)[k]}</pre>
            </div>
          ))}
          {layer.dynamicContext && layer.dynamicContext.length>0 && (
            <div className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-[11px] uppercase tracking-wide text-text-dim">dynamicContext</div>
                <button onClick={()=>copy(layer.dynamicContext!.map(d=>`${d.ref}: ${d.summary}`).join('\n'))} className="opacity-0 group-hover:opacity-100 transition text-[10px] px-1 py-0.5 border border-border rounded">Copy</button>
              </div>
              <ul className="space-y-1">
                {layer.dynamicContext.map((d,i)=>(
                  <li key={i} className="border border-border rounded p-2 bg-surfaceAlt">
                    <div className="text-[11px] font-medium mb-1 flex justify-between items-center">
                      <span>{d.ref}</span>
                      <button onClick={()=>copy(d.summary)} className="text-[10px] px-1 py-0.5 border border-border rounded hover:bg-surface">Copy</button>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{d.summary}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {layer.userInstruction && (
            <div className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-[11px] uppercase tracking-wide text-text-dim">userInstruction</div>
                <button onClick={()=>copy(layer.userInstruction!)} className="opacity-0 group-hover:opacity-100 transition text-[10px] px-1 py-0.5 border border-border rounded">Copy</button>
              </div>
              <pre className="whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto">{layer.userInstruction}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default PromptDrawer;
