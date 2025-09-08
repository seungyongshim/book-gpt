import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import TokenMeter from './TokenMeter';
export const PromptDrawer = ({ open, onClose, layer, onCopy }) => {
    const fullText = useMemo(() => {
        const parts = [];
        const push = (label, v) => { if (v)
            parts.push(`[${label}]\n${v}`); };
        push('system', layer.system);
        push('bookSystem', layer.bookSystem);
        push('worldDerived', layer.worldDerived);
        push('pageSystem', layer.pageSystem);
        if (layer.dynamicContext?.length) {
            parts.push('[dynamicContext]\n' + layer.dynamicContext.map(d => `${d.ref}: ${d.summary}`).join('\n---\n'));
        }
        push('userInstruction', layer.userInstruction);
        return parts.join('\n\n');
    }, [layer]);
    const copy = (text) => {
        if (onCopy)
            onCopy(text);
        else
            navigator.clipboard?.writeText(text).catch(() => { });
    };
    return (_jsxs("div", { className: `fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`, children: [_jsx("div", { className: `absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`, onClick: onClose }), _jsxs("div", { className: `absolute top-0 right-0 h-full w-[400px] bg-bg border-l border-border shadow-xl transform transition-transform duration-200 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`, children: [_jsxs("div", { className: "p-4 flex items-center justify-between border-b border-border gap-2", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Prompt Preview" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => copy(fullText), className: "text-[10px] px-2 py-1 rounded border border-border hover:bg-surfaceAlt", children: "Copy All" }), _jsx("button", { onClick: onClose, className: "text-[10px] px-2 py-1 rounded border border-border hover:bg-surfaceAlt", children: "\uB2EB\uAE30" })] })] }), _jsx("div", { className: "p-3 border-b border-border", children: _jsx(TokenMeter, { layer: layer, showBreakdown: true }) }), _jsxs("div", { className: "p-3 overflow-y-auto flex-1 space-y-4 text-xs", children: [['system', 'bookSystem', 'worldDerived', 'pageSystem'].map(k => layer[k] && (_jsxs("div", { className: "group", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("div", { className: "font-medium text-[11px] uppercase tracking-wide text-text-dim", children: k }), _jsx("button", { onClick: () => copy(layer[k]), className: "opacity-0 group-hover:opacity-100 transition text-[10px] px-1 py-0.5 border border-border rounded", children: "Copy" })] }), _jsx("pre", { className: "whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto", children: layer[k] })] }, k))), layer.dynamicContext && layer.dynamicContext.length > 0 && (_jsxs("div", { className: "group", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("div", { className: "font-medium text-[11px] uppercase tracking-wide text-text-dim", children: "dynamicContext" }), _jsx("button", { onClick: () => copy(layer.dynamicContext.map(d => `${d.ref}: ${d.summary}`).join('\n')), className: "opacity-0 group-hover:opacity-100 transition text-[10px] px-1 py-0.5 border border-border rounded", children: "Copy" })] }), _jsx("ul", { className: "space-y-1", children: layer.dynamicContext.map((d, i) => (_jsxs("li", { className: "border border-border rounded p-2 bg-surfaceAlt", children: [_jsxs("div", { className: "text-[11px] font-medium mb-1 flex justify-between items-center", children: [_jsx("span", { children: d.ref }), _jsx("button", { onClick: () => copy(d.summary), className: "text-[10px] px-1 py-0.5 border border-border rounded hover:bg-surface", children: "Copy" })] }), _jsx("div", { className: "whitespace-pre-wrap leading-relaxed", children: d.summary })] }, i))) })] })), layer.userInstruction && (_jsxs("div", { className: "group", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("div", { className: "font-medium text-[11px] uppercase tracking-wide text-text-dim", children: "userInstruction" }), _jsx("button", { onClick: () => copy(layer.userInstruction), className: "opacity-0 group-hover:opacity-100 transition text-[10px] px-1 py-0.5 border border-border rounded", children: "Copy" })] }), _jsx("pre", { className: "whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto", children: layer.userInstruction })] }))] })] })] }));
};
export default PromptDrawer;
