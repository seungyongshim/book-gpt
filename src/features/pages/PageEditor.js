import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// CLEAN REWRITE START
import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
import { useBooksStore } from '../../stores/booksStore';
import { useWorldStore } from '../../stores/worldStore';
import { assemblePrompt, totalPromptTokens, suggestTargetChars } from '../../utils/promptAssembler';
import { compressReferences, compressWorldSummary } from '../../utils/compression';
import { parseReferences } from '../../utils/referenceParser';
import { usePageGeneration } from '../../hooks/usePageGeneration';
import TokenMeter from '../../components/TokenMeter';
import PromptDrawer from '../../components/PromptDrawer';
const PageEditor = () => {
    const { bookId, pageIndex } = useParams();
    const { pages, load, getReferenceSummary, updatePage } = usePagesStore();
    const { books } = useBooksStore();
    const { world, load: loadWorld, getWorldDerived } = useWorldStore();
    const navigate = useNavigate();
    const page = pages.find((p) => p.bookId === bookId && p.index === Number(pageIndex));
    const [title, setTitle] = React.useState(page?.title || '');
    const [slug, setSlug] = React.useState(page?.slug || '');
    useEffect(() => { if (page) {
        setTitle(page.title || '');
        setSlug(page.slug || '');
    } }, [page?.id]);
    const { output, running, run, abort, extend, progressRatio, targetChars, completionChars, canExtend } = usePageGeneration();
    const [model, setModel] = React.useState('gpt-4o-mini');
    const [temperature, setTemperature] = React.useState(0.8);
    const [manualTarget, setManualTarget] = React.useState('');
    const [suggestedTarget, setSuggestedTarget] = React.useState(12000);
    const [instruction, setInstruction] = React.useState('');
    const [openDrawer, setOpenDrawer] = React.useState(false);
    useEffect(() => { if (bookId) {
        load(bookId);
        loadWorld(bookId);
    } }, [bookId, load, loadWorld]);
    const [worldSummary, setWorldSummary] = React.useState('');
    const [refSummaries, setRefSummaries] = React.useState({});
    const [compressedRefs, setCompressedRefs] = React.useState({});
    const [worldCompressed, setWorldCompressed] = React.useState(false);
    // 참조 파싱 (요약 로딩 useEffect보다 먼저 선언 필요)
    const { references, warnings } = useMemo(() => parseReferences(instruction, { selfPageIndex: page?.index }), [instruction, page?.index]);
    // worldDerived 로드
    useEffect(() => {
        if (!bookId)
            return;
        (async () => {
            const ws = await getWorldDerived(bookId);
            if (ws)
                setWorldSummary(ws);
        })();
    }, [bookId, world, getWorldDerived]);
    // 참조 요약 로드
    useEffect(() => {
        if (!references.length || !bookId) {
            setRefSummaries({});
            return;
        }
        let cancelled = false;
        (async () => {
            const tasks = [];
            for (const r of references) {
                if (r.pageIds.length === 0 && r.refRaw.startsWith('@p:')) {
                    const slugToken = r.refRaw.slice(3);
                    const target = pages.find((p) => p.bookId === bookId && p.slug === slugToken);
                    if (target) {
                        tasks.push((async () => {
                            const sum = await getReferenceSummary(target.id);
                            return sum ? { key: r.refRaw, text: sum } : null;
                        })());
                    }
                    continue;
                }
                tasks.push((async () => {
                    let merged = '';
                    for (const idxStr of r.pageIds) {
                        const idx = parseInt(idxStr, 10);
                        const target = pages.find((p) => p.bookId === bookId && p.index === idx);
                        if (target) {
                            const sum = await getReferenceSummary(target.id);
                            if (sum)
                                merged = merged ? merged + '\n' + sum : sum;
                        }
                    }
                    return merged ? { key: r.refRaw, text: merged } : null;
                })());
            }
            const results = await Promise.all(tasks);
            if (cancelled)
                return;
            const acc = {};
            for (const r of results)
                if (r)
                    acc[r.key] = r.text;
            setRefSummaries(acc);
        })();
        return () => { cancelled = true; };
    }, [references, pages, bookId, getReferenceSummary]);
    const layer = useMemo(() => assemblePrompt({
        system: '글로벌 규칙',
        bookSystem: '북 시스템',
        worldDerived: worldSummary || '세계관 요약 준비중...',
        pageSystem: '페이지 시스템',
        referencedSummaries: references.map(r => ({
            ref: r.refRaw,
            summary: (compressedRefs[r.refRaw] ?? refSummaries[r.refRaw]) || '로딩 중...'
        })),
        userInstruction: instruction
    }), [references, instruction, worldSummary, refSummaries, compressedRefs]);
    const promptTokens = React.useMemo(() => totalPromptTokens(layer), [layer]);
    // Suggest target (assumes 16K context model for now; future: per-model config map)
    React.useEffect(() => {
        const suggested = suggestTargetChars({ contextLimitTokens: 16000, promptTokens, desiredChars: 12000 });
        setSuggestedTarget(suggested);
    }, [promptTokens]);
    const effectiveTarget = manualTarget === '' ? suggestedTarget : manualTarget;
    const remainingTokensApprox = 16000 - promptTokens - 400; // reserve 400 tokens
    const estCompletionTokens = Math.max(0, remainingTokensApprox);
    const riskLevel = promptTokens / 16000; // crude
    const riskColor = riskLevel > 0.9 ? 'text-red-500' : riskLevel > 0.8 ? 'text-amber-500' : 'text-text-dim';
    const generate = () => { if (page)
        run(page.id, layer, { model, temperature, targetChars: effectiveTarget }); };
    if (!page)
        return _jsx("div", { className: "p-4 text-sm", children: "\uD398\uC774\uC9C0 \uB85C\uB529 \uC911 \uB610\uB294 \uC5C6\uC74C" });
    return (_jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("header", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => navigate(`/books/${bookId}`), className: "text-sm text-primary", children: "\u2190 \uBAA9\uB85D" }), _jsxs("h2", { className: "text-xl font-semibold", children: ["\uD398\uC774\uC9C0 #", page.index] })] }), _jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center", children: [_jsx("input", { value: title, onChange: e => setTitle(e.target.value), onBlur: () => page && updatePage(page.id, { title }), placeholder: "\uC81C\uBAA9", className: "px-2 py-1 rounded border border-border bg-surfaceAlt text-sm w-full md:w-64" }), _jsx("input", { value: slug, onChange: e => setSlug(e.target.value), onBlur: () => page && updatePage(page.id, { slug }), placeholder: "slug", className: "px-2 py-1 rounded border border-border bg-surfaceAlt text-sm w-full md:w-48" })] })] }), _jsx(TokenMeter, { layer: layer, onSuggestCompress: (strategy) => {
                    if (strategy === 'L1') {
                        const list = references.map(r => ({ ref: r.refRaw, summary: refSummaries[r.refRaw] || '' }));
                        const compressed = compressReferences({ summaries: list, level: 'L1' });
                        const map = {};
                        compressed.forEach((c) => { map[c.ref] = c.summary; });
                        setCompressedRefs(map);
                    }
                    else if (strategy === 'world-compact') {
                        if (!worldCompressed) {
                            setWorldSummary(ws => compressWorldSummary(ws, 'world-compact'));
                            setWorldCompressed(true);
                        }
                    }
                } }), _jsxs("div", { className: "border border-border rounded p-3 space-y-3 bg-surfaceAlt", children: [_jsxs("div", { className: "flex flex-wrap gap-4 items-end", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("label", { className: "text-[10px] font-medium text-text-dim", children: "Model" }), _jsxs("select", { value: model, onChange: e => setModel(e.target.value), className: "text-sm px-2 py-1 rounded border border-border bg-surface", children: [_jsx("option", { value: "gpt-4o-mini", children: "gpt-4o-mini" }), _jsx("option", { value: "gpt-4o", children: "gpt-4o" }), _jsx("option", { value: "gpt-4.1-mini", children: "gpt-4.1-mini" })] })] }), _jsxs("div", { className: "flex flex-col", children: [_jsxs("label", { className: "text-[10px] font-medium text-text-dim", children: ["Temperature ", temperature.toFixed(2)] }), _jsx("input", { type: "range", min: 0, max: 1, step: 0.05, value: temperature, onChange: e => setTemperature(parseFloat(e.target.value)), className: "w-40" })] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("label", { className: "text-[10px] font-medium text-text-dim", children: "Target Chars" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", value: manualTarget === '' ? '' : manualTarget, placeholder: suggestedTarget.toString(), onChange: e => {
                                                    const v = e.target.value;
                                                    if (v === '')
                                                        setManualTarget('');
                                                    else
                                                        setManualTarget(Math.max(1000, Math.min(18000, parseInt(v) || 0)));
                                                }, className: "w-28 text-sm px-2 py-1 rounded border border-border bg-surface" }), _jsx("button", { onClick: () => setManualTarget(suggestedTarget), className: "text-[11px] px-2 py-1 border border-border rounded", children: "\uCD94\uCC9C\uAC12" })] })] }), _jsxs("div", { className: "flex flex-col text-[11px] gap-0.5", children: [_jsxs("div", { children: [_jsx("span", { className: "text-text-dim", children: "Prompt Tokens:" }), " ", _jsx("span", { className: "font-medium", children: promptTokens })] }), _jsxs("div", { children: [_jsx("span", { className: "text-text-dim", children: "Remaining(est):" }), " ", _jsx("span", { className: "font-medium", children: estCompletionTokens })] }), _jsxs("div", { className: riskColor, children: ["Usage ", (riskLevel * 100).toFixed(1), "%"] })] })] }), _jsxs("div", { className: "text-[10px] text-text-dim flex flex-wrap gap-3", children: [_jsxs("span", { children: ["\uCD94\uCC9C Target: ", suggestedTarget] }), _jsxs("span", { children: ["\uC2E4\uD589 Target: ", effectiveTarget] }), _jsxs("span", { children: ["\uD604\uC7AC Completion: ", completionChars] })] })] }), (page.tokensPrompt || page.tokensCompletion) && (_jsxs("div", { className: "text-[11px] text-text-dim flex gap-3", children: [page.tokensPrompt !== undefined && _jsxs("span", { children: ["\uD504\uB86C\uD504\uD2B8 \uCD94\uC815: ", _jsx("span", { className: "font-medium", children: page.tokensPrompt })] }), page.tokensCompletion !== undefined && _jsxs("span", { children: ["\uC0DD\uC131 \uCD94\uC815: ", _jsx("span", { className: "font-medium", children: page.tokensCompletion })] }), page.tokensUsed !== undefined && _jsxs("span", { children: ["\uCD1D\uD569: ", _jsx("span", { className: "font-medium", children: page.tokensUsed })] })] })), _jsx("textarea", { className: "w-full h-32 text-sm p-2 rounded-md bg-surfaceAlt border border-border focus:outline-none focus:ring-1 focus:ring-primary/50", placeholder: "\uC9C0\uC2DC\uBB38\uACFC @\uCC38\uC870 \uC785\uB825 (@3-5 \uB4F1)", value: instruction, onChange: (e) => setInstruction(e.target.value) }), (warnings && warnings.length > 0) && (_jsx("div", { className: "text-[11px] text-warn space-y-0.5", children: warnings.map((w, i) => (_jsxs("div", { children: ["\u26A0 ", w] }, i))) })), references.length > 0 && (_jsxs("div", { className: "text-xs text-text-dim space-y-1", children: [_jsxs("div", { className: "font-medium text-text", children: ["\uCC38\uC870 (", references.length, ")"] }), _jsx("ul", { className: "list-disc pl-4 space-y-0.5", children: references.map((r) => (_jsxs("li", { children: [r.refRaw, " ", _jsxs("span", { className: "text-[10px] opacity-70", children: ["pages:", r.pageIds.join(',') || 'slug'] })] }, r.refRaw))) })] })), _jsxs("div", { className: "flex gap-2 items-center flex-wrap", children: [_jsx("button", { disabled: running, onClick: generate, className: "px-3 py-1.5 rounded bg-primary text-white text-sm disabled:opacity-50", children: running ? '생성중...' : '생성' }), running && (_jsx("button", { onClick: abort, className: "px-3 py-1.5 rounded border border-warn text-warn text-sm", children: "\uC911\uB2E8" })), canExtend && !running && (_jsx("button", { onClick: () => page && extend(page.id), className: "px-3 py-1.5 rounded border border-border text-sm", children: "\uC774\uC5B4\uC4F0\uAE30(+)" })), _jsx("button", { onClick: () => setOpenDrawer(true), className: "px-3 py-1.5 rounded border border-border text-sm", children: "Prompt \uBCF4\uAE30" }), _jsxs("div", { className: "flex items-center gap-2 text-[11px] text-text-dim", children: [_jsxs("span", { children: [completionChars, "/", targetChars, " chars"] }), _jsxs("span", { children: [Math.round(progressRatio * 100), "%"] })] })] }), _jsx("div", { className: "h-2 w-full rounded bg-border overflow-hidden", children: _jsx("div", { className: "h-full bg-primary transition-all", style: { width: `${Math.min(100, progressRatio * 100)}%` } }) }), _jsxs("div", { className: "border border-border rounded-md p-3 h-80 overflow-auto text-sm whitespace-pre-wrap bg-surfaceAlt relative", children: [output || '출력 대기...', running && _jsx("div", { className: "absolute bottom-1 right-2 text-[10px] text-text-dim", children: "Streaming..." })] }), _jsx(PromptDrawer, { open: openDrawer, onClose: () => setOpenDrawer(false), layer: layer })] }));
};
export default PageEditor;
