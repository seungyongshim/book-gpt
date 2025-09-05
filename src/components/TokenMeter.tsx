import React from 'react';
import { totalPromptTokens } from '../utils/promptAssembler';
import { PromptLayer } from '../types/domain';

interface TokenMeterProps {
  layer: PromptLayer;
  budget?: number;
}

export const TokenMeter: React.FC<TokenMeterProps> = ({ layer, budget = 3000 }) => {
  const tokens = totalPromptTokens(layer);
  const pct = Math.min(100, (tokens / budget) * 100);
  return (
    <div className="w-full flex flex-col gap-1" aria-label="token-meter">
      <div className="flex items-center justify-between text-[11px] text-text-dim">
        <span>Prompt Tokens</span>
        <span>{tokens} / {budget}{tokens>budget && <span className="text-warn ml-1">OVER</span>}</span>
      </div>
      <div className="h-2 rounded bg-surfaceAlt overflow-hidden border border-border">
        <div className={`h-full ${tokens>budget? 'bg-warn' : 'bg-primary'}`} style={{ width: pct+'%' }} />
      </div>
    </div>
  );
};
export default TokenMeter;
