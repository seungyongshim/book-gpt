import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { useBooksStore } from './stores/booksStore';
import { usePagesStore } from './stores/pagesStore';
import { useWorldStore } from './stores/worldStore';
import { assemblePrompt } from './utils/promptAssembler';
import { usePageGeneration } from './hooks/usePageGeneration';
import { parseReferences } from './utils/referenceParser';
const BookList = () => {
    const { books, load, createBook } = useBooksStore();
    const navigate = useNavigate();
    useEffect(() => { load(); }, [load]);
    return (_jsxs("div", { className: "p-4 space-y-4 max-w-xl mx-auto", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\uB0B4 \uCC45" }), _jsx("button", { onClick: async () => {
                            const b = await createBook('새 책');
                            navigate(`/books/${b.id}`);
                        }, className: "px-3 py-1.5 rounded-md bg-primary text-white text-sm", children: "+ \uC0C8 \uCC45" })] }), books.length === 0 && (_jsx("p", { className: "text-text-dim text-sm", children: "\uC544\uC9C1 \uCC45\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0C8 \uCC45\uC744 \uCD94\uAC00\uD574\uBCF4\uC138\uC694." })), _jsx("ul", { className: "space-y-2", children: books.map(b => (_jsx("li", { children: _jsxs(Link, { to: `/books/${b.id}`, className: "block rounded-md border border-border p-3 hover:bg-surfaceAlt", children: [_jsx("div", { className: "font-medium text-sm", children: b.title }), _jsxs("div", { className: "text-xs text-text-dim", children: ["\uC5C5\uB370\uC774\uD2B8: ", new Date(b.updatedAt).toLocaleString()] })] }) }, b.id))) })] }));
};
const BookDashboard = () => {
    const { bookId } = useParams();
    const { books } = useBooksStore();
    const navigate = useNavigate();
    const { pages, load: loadPages, createPage } = usePagesStore();
    useEffect(() => { if (bookId)
        loadPages(bookId); }, [bookId, loadPages]);
    const book = books.find(b => b.id === bookId);
    return (_jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("button", { onClick: () => navigate('/'), className: "text-sm text-primary", children: "\u2190 \uBAA9\uB85D" }), _jsx("h2", { className: "text-xl font-semibold", children: book?.title || '책' }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Link, { to: `/books/${bookId}/world`, className: "text-sm underline", children: "\uC138\uACC4\uAD00" }), _jsx("button", { onClick: async () => { if (bookId) {
                                    const p = await createPage(bookId);
                                    navigate(`/books/${bookId}/pages/${p.index}`);
                                } }, className: "px-2 py-1 text-sm bg-primary text-white rounded-md", children: "+ \uD398\uC774\uC9C0" })] })] }), _jsx("ul", { className: "space-y-2", children: pages.filter(p => p.bookId === bookId).map(p => (_jsx("li", { children: _jsxs(Link, { to: `/books/${bookId}/pages/${p.index}`, className: "block p-3 rounded-md border border-border hover:bg-surfaceAlt", children: [_jsxs("div", { className: "text-sm font-medium", children: ["#", p.index, " ", p.title || '(제목 없음)'] }), _jsx("div", { className: "text-xs text-text-dim", children: p.status })] }) }, p.id))) })] }));
};
const WorldBuilder = () => {
    const { bookId } = useParams();
    const { world, load, save, worldDerivedInvalidated } = useWorldStore();
    useEffect(() => { if (bookId)
        load(bookId); }, [bookId, load]);
    return (_jsxs("div", { className: "p-4 space-y-4 max-w-2xl mx-auto", children: [_jsxs("h2", { className: "text-xl font-semibold flex items-center gap-2", children: ["\uC138\uACC4\uAD00 \uC124\uC815", worldDerivedInvalidated && _jsx("span", { className: "text-xs bg-warn/20 text-warn px-2 py-0.5 rounded", children: "Modified*" })] }), _jsx("textarea", { className: "w-full h-40 text-sm p-2 rounded-md bg-surfaceAlt border border-border", placeholder: "Premise", defaultValue: world?.premise, onBlur: (e) => bookId && save(bookId, { premise: e.target.value }) }), _jsx("textarea", { className: "w-full h-40 text-sm p-2 rounded-md bg-surfaceAlt border border-border", placeholder: "Style Guide", defaultValue: world?.styleGuide, onBlur: (e) => bookId && save(bookId, { styleGuide: e.target.value }) }), _jsx("p", { className: "text-xs text-text-dim", children: "\uC800\uC7A5 \uC2DC \uBC84\uC804 \uC99D\uAC00 \uBC0F world.summary \uCE90\uC2DC \uBB34\uD6A8\uD654." })] }));
};
const PageEditor = () => {
    const { bookId, pageIndex } = useParams();
    const { pages, load, updatePage } = usePagesStore();
    const navigate = useNavigate();
    const page = pages.find(p => p.bookId === bookId && p.index === Number(pageIndex));
    const { output, running, run } = usePageGeneration();
    useEffect(() => { if (bookId)
        load(bookId); }, [bookId, load]);
    const [instruction, setInstruction] = React.useState('');
    const generate = () => {
        const { references } = parseReferences(instruction);
        const layer = assemblePrompt({
            system: '글로벌 규칙',
            bookSystem: '북 시스템',
            worldDerived: '세계관 요약 (예시)',
            pageSystem: '페이지 시스템',
            referencedSummaries: references.map(r => ({ ref: r.refRaw, summary: '요약 placeholder' })),
            userInstruction: instruction
        });
        run(layer);
    };
    if (!page)
        return _jsx("div", { className: "p-4 text-sm", children: "\uD398\uC774\uC9C0 \uB85C\uB529 \uC911 \uB610\uB294 \uC5C6\uC74C" });
    return (_jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("header", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => navigate(`/books/${bookId}`), className: "text-sm text-primary", children: "\u2190 \uBAA9\uB85D" }), _jsxs("h2", { className: "text-xl font-semibold", children: ["\uD398\uC774\uC9C0 #", page.index] })] }), _jsx("textarea", { className: "w-full h-32 text-sm p-2 rounded-md bg-surfaceAlt border border-border", placeholder: "\uC9C0\uC2DC\uBB38\uACFC @\uCC38\uC870 \uC785\uB825 (@3-5 \uB4F1)", value: instruction, onChange: (e) => setInstruction(e.target.value) }), _jsx("div", { className: "flex gap-2", children: _jsx("button", { disabled: running, onClick: generate, className: "px-3 py-1.5 rounded bg-primary text-white text-sm disabled:opacity-50", children: running ? '생성중...' : '생성' }) }), _jsx("div", { className: "border border-border rounded-md p-3 h-80 overflow-auto text-sm whitespace-pre-wrap bg-surfaceAlt", children: output || '출력 대기...' })] }));
};
const VersionTimeline = () => {
    return (_jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: "\uBC84\uC804 \uD0C0\uC784\uB77C\uC778 (\uC2A4\uD141)" }), _jsx("p", { className: "text-sm text-text-dim", children: "\uCD94\uD6C4 PageVersion \uBAA9\uB85D & Diff \uC5F0\uACB0" })] }));
};
const DiffView = () => {
    return (_jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: "Diff View (\uC2A4\uD141)" }), _jsx("p", { className: "text-sm text-text-dim", children: "\uB450 \uBC84\uC804 \uAC04 \uCC28\uC774 \uD45C\uC2DC \uC608\uC815" })] }));
};
const Placeholder = ({ title }) => (_jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: title }), _jsx("p", { className: "text-sm text-text-dim", children: "\uAD6C\uD604 \uC608\uC815..." }), _jsx(Link, { to: "/", className: "text-primary underline text-sm", children: "\uCC45 \uBAA9\uB85D\uC73C\uB85C" })] }));
const App = () => {
    return (_jsx("div", { className: "min-h-screen bg-bg text-text", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(BookList, {}) }), _jsx(Route, { path: "/books/:bookId", element: _jsx(BookDashboard, {}) }), _jsx(Route, { path: "/books/:bookId/world", element: _jsx(WorldBuilder, {}) }), _jsx(Route, { path: "/books/:bookId/pages/:pageIndex", element: _jsx(PageEditor, {}) }), _jsx(Route, { path: "/books/:bookId/pages/:pageIndex/versions", element: _jsx(VersionTimeline, {}) }), _jsx(Route, { path: "/books/:bookId/pages/:pageIndex/diff/:versionId", element: _jsx(DiffView, {}) }), _jsx(Route, { path: "*", element: _jsx(Placeholder, { title: "Not Found" }) })] }) }));
};
export default App;
