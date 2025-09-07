import React, { useEffect, useState } from 'react';
import { totalPromptTokens, estimateTokens, getCalibrationFactor } from '../utils/promptAssembler';
import { PromptLayer } from '../types/domain';

interface TokenMeterProps {
  layer: PromptLayer;
  budget?: number;
  showBreakdown?: boolean;
  onSuggestCompress?: (strategy: string) => void;
}

export const TokenMeter: React.FC<TokenMeterProps> = ({ layer, budget = 3000, showBreakdown = true, onSuggestCompress }: TokenMeterProps) => {
  const [calib, setCalib] = useState<number>(()=>getCalibrationFactor());
  // 추후: generation 완료 이벤트를 글로벌 bus 로 받아 실제 vs 추정 비교 반영 가능
  useEffect(()=>{
    // 간단 폴링(저비용) 또는 prop 변화시 재조회; 현재는 mount 시 1회
    setCalib(getCalibrationFactor());
  }, [layer]);
  const sections: { label: string; value: number }[] = [];
  const push = (label: string, text?: string) => {
    if (!text) return; const v = estimateTokens(text); if (v>0) sections.push({ label, value: v });
  };
  push('system', layer.system);
  push('book', layer.bookSystem);
  push('world', layer.worldDerived);
  push('page', layer.pageSystem);
  if (layer.dynamicContext?.length) {
    sections.push({ label: `refs(${layer.dynamicContext.length})`, value: layer.dynamicContext.reduce((a: number, c: { summary: string })=>a+estimateTokens(c.summary),0) });
  }
  push('user', layer.userInstruction);
  const tokens = sections.reduce((a,s)=>a+s.value,0);
  const pct = Math.min(100, (tokens / budget) * 100);
  const over = tokens > budget;
  const sorted = [...sections].sort((a,b)=>b.value-a.value);
  const largest = sorted[0];
  const distribution = sorted.map(s=>({ ...s, pct: ((s.value / tokens) * 100) || 0 }));
  return (
    <div className="w-full flex flex-col gap-1" aria-label="token-meter">
      <div className="flex items-center justify-between text-[11px] text-text-dim">
        <span>Prompt Tokens <span className="ml-1 text-[10px] text-text-dim/70">calib {calib.toFixed(3)}x</span></span>
        <span>{tokens} / {budget}{over && <span className="text-warn ml-1">OVER</span>}</span>
      </div>
      <div className="h-2 rounded bg-surfaceAlt overflow-hidden border border-border">
        <div className={`h-full ${over? 'bg-warn' : 'bg-primary'}`} style={{ width: pct+'%' }} />
      </div>
      {showBreakdown && (
        <div className="flex flex-wrap gap-1 mt-1">
          {sections.map(s => (
            <span key={s.label} className="px-1 py-[2px] rounded bg-surfaceAlt border border-border text-[10px] text-text-dim">
              {s.label}:{s.value}
            </span>
          ))}
        </div>
      )}
      {showBreakdown && (
        <div className="text-[10px] text-text-dim flex gap-2 mt-1">
          <span className="opacity-70">(실제 Usage 수집 전)</span>
        </div>
      )}
      {showBreakdown && (
        <div className="mt-1 border border-border rounded bg-surfaceAlt/50 p-2 flex flex-col gap-1">
          <div className="text-[10px] text-text-dim">레이어 분포</div>
          <div className="flex flex-col gap-0.5">
            {distribution.map(d=> (
              <div key={d.label} className="flex items-center gap-2">
                <div className="w-14 text-[10px] text-text-dim">{d.label}</div>
                <div className="flex-1 h-1.5 bg-surfaceAlt rounded overflow-hidden">
                  <div className="h-full bg-primary/60" style={{ width: d.pct+'%' }} />
                </div>
                <div className="text-[10px] w-10 text-right text-text-dim">{d.pct.toFixed(1)}%</div>
              </div>
            ))}
          </div>
          {largest && (
            <div className="text-[10px] text-text-dim mt-1">가장 큰 레이어: <span className="font-medium">{largest.label}</span> ({largest.value} tokens)</div>
          )}
        </div>
      )}
      {over && (
        <div className="mt-1 flex gap-2 flex-wrap">
          <button className="text-[10px] px-2 py-1 border border-border rounded bg-surfaceAlt hover:bg-surface" title="참조 축약" onClick={()=> onSuggestCompress && onSuggestCompress('L1') }>
            L1 축약
          </button>
          <button className="text-[10px] px-2 py-1 border border-border rounded bg-surfaceAlt hover:bg-surface" title="세계관 요약 더 압축" onClick={()=> onSuggestCompress && onSuggestCompress('world-compact') }>
            World 800자
          </button>
        </div>
      )}
    </div>
  );
};
export default TokenMeter;
