import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBooksStore } from '../../stores/booksStore';
import { usePagesStore } from '../../stores/pagesStore';
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
export default BookDashboard;
