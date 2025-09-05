import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { totalPromptTokens } from '../utils/promptAssembler';
export const TokenMeter = ({ layer, budget = 3000 }) => {
    const tokens = totalPromptTokens(layer);
    const pct = Math.min(100, (tokens / budget) * 100);
    return (_jsxs("div", { className: "w-full flex flex-col gap-1", "aria-label": "token-meter", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] text-text-dim", children: [_jsx("span", { children: "Prompt Tokens" }), _jsxs("span", { children: [tokens, " / ", budget, tokens > budget && _jsx("span", { className: "text-warn ml-1", children: "OVER" })] })] }), _jsx("div", { className: "h-2 rounded bg-surfaceAlt overflow-hidden border border-border", children: _jsx("div", { className: `h-full ${tokens > budget ? 'bg-warn' : 'bg-primary'}`, style: { width: pct + '%' } }) })] }));
};
export default TokenMeter;
