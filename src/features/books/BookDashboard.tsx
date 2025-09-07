import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBooksStore } from '../../stores/booksStore';
import { usePagesStore } from '../../stores/pagesStore';

const BookDashboard: React.FC = () => {
  const { bookId } = useParams();
  const { books, updateBook } = useBooksStore();
  const navigate = useNavigate();
  const { pages, load: loadPages, createPage, deletePage } = usePagesStore() as any;
  useEffect(()=>{ if(bookId) loadPages(bookId); }, [bookId, loadPages]);
  const book = books.find(b=>b.id===bookId);
  const [title, setTitle] = useState(book?.title || '');
  useEffect(()=>{ setTitle(book?.title || ''); }, [book?.title]);
  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <button onClick={()=>navigate('/')} className="text-sm text-primary">← 목록</button>
        <input
          className="text-xl font-semibold bg-transparent border-b border-transparent focus:border-border outline-none w-48"
          value={title}
          onChange={e=>setTitle(e.target.value)}
          onBlur={()=>{ if(book && title!==book.title) updateBook(book.id,{ title }); }}
        />
        <div className="flex gap-2">
          <Link to={`/books/${bookId}/world`} className="text-sm underline">세계관</Link>
          <button onClick={async()=>{ if(bookId){ const p = await createPage(bookId); navigate(`/books/${bookId}/pages/${p.index}`);} }} className="px-2 py-1 text-sm bg-primary text-white rounded-md">+ 페이지</button>
        </div>
      </header>
      <ul className="space-y-2">
        {pages.filter((p: any)=>p.bookId===bookId).map((p: any)=> (
          <li key={p.id} className="group relative">
            <Link to={`/books/${bookId}/pages/${p.index}`} className="block p-3 rounded-md border border-border hover:bg-surfaceAlt pr-16">
              <div className="text-sm font-medium">#{p.index} {p.title || '(제목 없음)'}</div>
              <div className="text-xs text-text-dim">{p.status}</div>
            </Link>
            <button
              onClick={async (e: React.MouseEvent)=>{ e.preventDefault(); e.stopPropagation(); if (confirm(`페이지 #${p.index} 삭제? 되돌릴 수 없습니다.`)) { await deletePage(p.id); }} }
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-1 rounded bg-red-600 text-white"
              title="페이지 삭제"
            >삭제</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default BookDashboard;
