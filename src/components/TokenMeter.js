import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { estimateTokens, getCalibrationFactor } from '../utils/promptAssembler';
export const TokenMeter = ({ layer, budget = 3000, showBreakdown = true, onSuggestCompress }) => {
    const [calib, setCalib] = useState(() => getCalibrationFactor());
    // 추후: generation 완료 이벤트를 글로벌 bus 로 받아 실제 vs 추정 비교 반영 가능
    useEffect(() => {
        // 간단 폴링(저비용) 또는 prop 변화시 재조회; 현재는 mount 시 1회
        setCalib(getCalibrationFactor());
    }, [layer]);
    const sections = [];
    const push = (label, text) => {
        if (!text)
            return;
        const v = estimateTokens(text);
        if (v > 0)
            sections.push({ label, value: v });
    };
    push('system', layer.system);
    push('book', layer.bookSystem);
    push('world', layer.worldDerived);
    push('page', layer.pageSystem);
    if (layer.dynamicContext?.length) {
        sections.push({ label: `refs(${layer.dynamicContext.length})`, value: layer.dynamicContext.reduce((a, c) => a + estimateTokens(c.summary), 0) });
    }
    push('user', layer.userInstruction);
    const tokens = sections.reduce((a, s) => a + s.value, 0);
    const pct = Math.min(100, (tokens / budget) * 100);
    const over = tokens > budget;
    const sorted = [...sections].sort((a, b) => b.value - a.value);
    const largest = sorted[0];
    const distribution = sorted.map(s => ({ ...s, pct: ((s.value / tokens) * 100) || 0 }));
    return (_jsxs("div", { className: "w-full flex flex-col gap-1", "aria-label": "token-meter", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] text-text-dim", children: [_jsxs("span", { children: ["Prompt Tokens ", _jsxs("span", { className: "ml-1 text-[10px] text-text-dim/70", children: ["calib ", calib.toFixed(3), "x"] })] }), _jsxs("span", { children: [tokens, " / ", budget, over && _jsx("span", { className: "text-warn ml-1", children: "OVER" })] })] }), _jsx("div", { className: "h-2 rounded bg-surfaceAlt overflow-hidden border border-border", children: _jsx("div", { className: `h-full ${over ? 'bg-warn' : 'bg-primary'}`, style: { width: pct + '%' } }) }), showBreakdown && (_jsx("div", { className: "flex flex-wrap gap-1 mt-1", children: sections.map(s => (_jsxs("span", { className: "px-1 py-[2px] rounded bg-surfaceAlt border border-border text-[10px] text-text-dim", children: [s.label, ":", s.value] }, s.label))) })), showBreakdown && (_jsx("div", { className: "text-[10px] text-text-dim flex gap-2 mt-1", children: _jsx("span", { className: "opacity-70", children: "(\uC2E4\uC81C Usage \uC218\uC9D1 \uC804)" }) })), showBreakdown && (_jsxs("div", { className: "mt-1 border border-border rounded bg-surfaceAlt/50 p-2 flex flex-col gap-1", children: [_jsx("div", { className: "text-[10px] text-text-dim", children: "\uB808\uC774\uC5B4 \uBD84\uD3EC" }), _jsx("div", { className: "flex flex-col gap-0.5", children: distribution.map(d => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-14 text-[10px] text-text-dim", children: d.label }), _jsx("div", { className: "flex-1 h-1.5 bg-surfaceAlt rounded overflow-hidden", children: _jsx("div", { className: "h-full bg-primary/60", style: { width: d.pct + '%' } }) }), _jsxs("div", { className: "text-[10px] w-10 text-right text-text-dim", children: [d.pct.toFixed(1), "%"] })] }, d.label))) }), largest && (_jsxs("div", { className: "text-[10px] text-text-dim mt-1", children: ["\uAC00\uC7A5 \uD070 \uB808\uC774\uC5B4: ", _jsx("span", { className: "font-medium", children: largest.label }), " (", largest.value, " tokens)"] }))] })), over && (_jsxs("div", { className: "mt-1 flex gap-2 flex-wrap", children: [_jsx("button", { className: "text-[10px] px-2 py-1 border border-border rounded bg-surfaceAlt hover:bg-surface", title: "\uCC38\uC870 \uCD95\uC57D", onClick: () => onSuggestCompress && onSuggestCompress('L1'), children: "L1 \uCD95\uC57D" }), _jsx("button", { className: "text-[10px] px-2 py-1 border border-border rounded bg-surfaceAlt hover:bg-surface", title: "\uC138\uACC4\uAD00 \uC694\uC57D \uB354 \uC555\uCD95", onClick: () => onSuggestCompress && onSuggestCompress('world-compact'), children: "World 800\uC790" })] }))] }));
};
export default TokenMeter;
