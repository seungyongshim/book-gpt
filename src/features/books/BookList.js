import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBooksStore } from '../../stores/booksStore';
const BookList = () => {
    const { books, load, createBook } = useBooksStore();
    const navigate = useNavigate();
    useEffect(() => { load(); }, [load]);
    return (_jsxs("div", { className: "p-4 space-y-4 max-w-xl mx-auto", children: [_jsxs("header", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-semibold", children: "\uB0B4 \uCC45" }), _jsx("button", { onClick: async () => { const b = await createBook('새 책'); navigate(`/books/${b.id}`); }, className: "px-3 py-1.5 rounded-md bg-primary text-white text-sm", children: "+ \uC0C8 \uCC45" })] }), books.length === 0 && _jsx("p", { className: "text-text-dim text-sm", children: "\uC544\uC9C1 \uCC45\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0C8 \uCC45\uC744 \uCD94\uAC00\uD574\uBCF4\uC138\uC694." }), _jsx("ul", { className: "space-y-2", children: books.map(b => (_jsx("li", { children: _jsxs(Link, { to: `/books/${b.id}`, className: "block rounded-md border border-border p-3 hover:bg-surfaceAlt", children: [_jsx("div", { className: "font-medium text-sm", children: b.title }), _jsxs("div", { className: "text-xs text-text-dim", children: ["\uC5C5\uB370\uC774\uD2B8: ", new Date(b.updatedAt).toLocaleString()] })] }) }, b.id))) })] }));
};
export default BookList;
