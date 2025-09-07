import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// CLEAN REWRITE START
import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
import { useBooksStore } from '../../stores/booksStore';
import { useWorldStore } from '../../stores/worldStore';
import { assemblePrompt } from '../../utils/promptAssembler';
import { parseReferences } from '../../utils/referenceParser';
import { usePageGeneration } from '../../hooks/usePageGeneration';
import TokenMeter from '../../components/TokenMeter';
const PromptDrawer = ({ open, onClose, layer }) => (_jsxs("div", { className: `fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`, children: [_jsx("div", { className: `absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`, onClick: onClose }), _jsxs("div", { className: `absolute top-0 right-0 h-full w-[360px] bg-bg border-l border-border shadow-xl transform transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`, children: [_jsxs("div", { className: "p-4 flex items-center justify-between border-b border-border", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Prompt Preview" }), _jsx("button", { onClick: onClose, className: "text-xs text-text-dim hover:text-text", children: "\uB2EB\uAE30" })] }), _jsxs("div", { className: "p-3 overflow-y-auto h-[calc(100%-48px)] space-y-4 text-xs", children: [['system', 'bookSystem', 'worldDerived', 'pageSystem'].map((k) => layer[k] && (_jsxs("div", { children: [_jsx("div", { className: "font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim", children: k }), _jsx("pre", { className: "whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto", children: layer[k] })] }, k))), layer.dynamicContext && layer.dynamicContext.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: "font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim", children: "dynamicContext" }), _jsx("ul", { className: "space-y-1", children: layer.dynamicContext.map((d, i) => (_jsxs("li", { className: "border border-border rounded p-2 bg-surfaceAlt", children: [_jsx("div", { className: "text-[11px] font-medium mb-1", children: d.ref }), _jsx("div", { className: "whitespace-pre-wrap leading-relaxed", children: d.summary })] }, i))) })] })), layer.userInstruction && (_jsxs("div", { children: [_jsx("div", { className: "font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim", children: "userInstruction" }), _jsx("pre", { className: "whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto", children: layer.userInstruction })] }))] })] })] }));
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
    const { output, running, run, abort } = usePageGeneration();
    const [instruction, setInstruction] = React.useState('');
    const [openDrawer, setOpenDrawer] = React.useState(false);
    useEffect(() => { if (bookId) {
        load(bookId);
        loadWorld(bookId);
    } }, [bookId, load, loadWorld]);
    const [worldSummary, setWorldSummary] = React.useState('');
    const [refSummaries, setRefSummaries] = React.useState({});
    // 참조 파싱 (요약 로딩 useEffect보다 먼저 선언 필요)
    const { references, warnings } = useMemo(() => parseReferences(instruction), [instruction]);
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
            const acc = {};
            for (const r of references) {
                if (r.pageIds.length === 0 && r.refRaw.startsWith('@p:')) {
                    const slugToken = r.refRaw.slice(3); // @p:
                    const target = pages.find((p) => p.bookId === bookId && p.slug === slugToken);
                    if (target) {
                        const sum = await getReferenceSummary(target.id);
                        if (sum)
                            acc[r.refRaw] = sum;
                    }
                    continue;
                }
                for (const idxStr of r.pageIds) {
                    const idx = parseInt(idxStr, 10);
                    const target = pages.find((p) => p.bookId === bookId && p.index === idx);
                    if (target) {
                        const sum = await getReferenceSummary(target.id);
                        if (sum)
                            acc[r.refRaw] = (acc[r.refRaw] ? acc[r.refRaw] + '\n' : '') + sum;
                    }
                }
            }
            if (!cancelled)
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
            summary: refSummaries[r.refRaw] || '로딩 중...'
        })),
        userInstruction: instruction
    }), [references, instruction, worldSummary, refSummaries]);
    const generate = () => { if (page)
        run(page.id, layer); };
    if (!page)
        return _jsx("div", { className: "p-4 text-sm", children: "\uD398\uC774\uC9C0 \uB85C\uB529 \uC911 \uB610\uB294 \uC5C6\uC74C" });
    return (_jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("header", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => navigate(`/books/${bookId}`), className: "text-sm text-primary", children: "\u2190 \uBAA9\uB85D" }), _jsxs("h2", { className: "text-xl font-semibold", children: ["\uD398\uC774\uC9C0 #", page.index] })] }), _jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center", children: [_jsx("input", { value: title, onChange: e => setTitle(e.target.value), onBlur: () => page && updatePage(page.id, { title }), placeholder: "\uC81C\uBAA9", className: "px-2 py-1 rounded border border-border bg-surfaceAlt text-sm w-full md:w-64" }), _jsx("input", { value: slug, onChange: e => setSlug(e.target.value), onBlur: () => page && updatePage(page.id, { slug }), placeholder: "slug", className: "px-2 py-1 rounded border border-border bg-surfaceAlt text-sm w-full md:w-48" })] })] }), _jsx(TokenMeter, { layer: layer }), _jsx("textarea", { className: "w-full h-32 text-sm p-2 rounded-md bg-surfaceAlt border border-border focus:outline-none focus:ring-1 focus:ring-primary/50", placeholder: "\uC9C0\uC2DC\uBB38\uACFC @\uCC38\uC870 \uC785\uB825 (@3-5 \uB4F1)", value: instruction, onChange: (e) => setInstruction(e.target.value) }), (warnings && warnings.length > 0) && (_jsx("div", { className: "text-[11px] text-warn space-y-0.5", children: warnings.map((w, i) => (_jsxs("div", { children: ["\u26A0 ", w] }, i))) })), references.length > 0 && (_jsxs("div", { className: "text-xs text-text-dim space-y-1", children: [_jsxs("div", { className: "font-medium text-text", children: ["\uCC38\uC870 (", references.length, ")"] }), _jsx("ul", { className: "list-disc pl-4 space-y-0.5", children: references.map((r) => (_jsxs("li", { children: [r.refRaw, " ", _jsxs("span", { className: "text-[10px] opacity-70", children: ["pages:", r.pageIds.join(',') || 'slug'] })] }, r.refRaw))) })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { disabled: running, onClick: generate, className: "px-3 py-1.5 rounded bg-primary text-white text-sm disabled:opacity-50", children: running ? '생성중...' : '생성' }), running && (_jsx("button", { onClick: abort, className: "px-3 py-1.5 rounded border border-warn text-warn text-sm", children: "\uC911\uB2E8" })), _jsx("button", { onClick: () => setOpenDrawer(true), className: "px-3 py-1.5 rounded border border-border text-sm", children: "Prompt \uBCF4\uAE30" })] }), _jsx("div", { className: "border border-border rounded-md p-3 h-80 overflow-auto text-sm whitespace-pre-wrap bg-surfaceAlt", children: output || '출력 대기...' }), _jsx(PromptDrawer, { open: openDrawer, onClose: () => setOpenDrawer(false), layer: layer })] }));
};
export default PageEditor;
