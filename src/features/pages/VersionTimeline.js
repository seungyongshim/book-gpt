import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
const VersionTimeline = () => {
    const { bookId, pageIndex } = useParams();
    const navigate = useNavigate();
    const { pages, load, listVersions } = usePagesStore();
    const page = pages.find(p => p.bookId === bookId && p.index === Number(pageIndex));
    const [versions, setVersions] = useState([]);
    const [pick, setPick] = useState([]); // 선택된 2개 버전 ID
    useEffect(() => { if (bookId)
        load(bookId); }, [bookId, load]);
    useEffect(() => { (async () => { if (page) {
        const vs = await listVersions(page.id);
        setVersions(vs);
    } })(); }, [page, listVersions]);
    return (_jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("header", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => navigate(`/books/${bookId}/pages/${pageIndex}`), className: "text-sm text-primary", children: "\u2190 \uD398\uC774\uC9C0" }), _jsxs("h2", { className: "text-xl font-semibold", children: ["\uBC84\uC804 \uD0C0\uC784\uB77C\uC778 #", pageIndex] })] }), !page && _jsx("p", { className: "text-sm text-warn", children: "\uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }), _jsxs("ul", { className: "space-y-2", children: [versions.map((v) => (_jsxs("li", { className: `border border-border rounded p-3 bg-surfaceAlt relative ${pick.includes(v.id) ? 'ring-2 ring-primary/70' : ''}`, children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { children: new Date(v.timestamp).toLocaleString() }), _jsx("span", { className: "opacity-70", children: v.author })] }), _jsxs("div", { className: "mt-1 text-[11px] text-text-dim", children: ["length: ", v.contentSnapshot.length] }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx(Link, { to: `/books/${bookId}/pages/${pageIndex}/diff/${v.id}`, className: "text-[11px] text-primary underline", children: "\uB2E8\uC77C Diff" }), _jsx("button", { className: "text-[11px] px-2 py-0.5 border border-border rounded hover:bg-surface", onClick: () => {
                                            setPick(prev => {
                                                if (prev.includes(v.id))
                                                    return prev.filter(id => id !== v.id);
                                                if (prev.length === 2)
                                                    return [prev[1], v.id];
                                                return [...prev, v.id];
                                            });
                                        }, children: pick.includes(v.id) ? '해제' : '비교' })] })] }, v.id))), versions.length === 0 && _jsx("li", { className: "text-xs text-text-dim", children: "\uBC84\uC804 \uC5C6\uC74C" })] }), pick.length === 2 && (_jsxs("div", { className: "pt-2 border-t border-border flex items-center gap-2", children: [_jsx("span", { className: "text-[11px] text-text-dim", children: "\uC120\uD0DD\uB428 2\uAC1C \uBE44\uAD50:" }), _jsx("button", { className: "text-[11px] px-2 py-1 rounded bg-primary text-white", onClick: () => navigate(`/books/${bookId}/pages/${pageIndex}/diff/${pick[0]}?compare=${pick[1]}`), children: "Diff \uC5F4\uAE30" }), _jsx("button", { className: "text-[10px] text-text-dim underline", onClick: () => setPick([]), children: "\uCD08\uAE30\uD654" })] }))] }));
};
export default VersionTimeline;
