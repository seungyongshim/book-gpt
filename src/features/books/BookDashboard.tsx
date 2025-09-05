import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBooksStore } from '../../stores/booksStore';
import { usePagesStore } from '../../stores/pagesStore';

const BookDashboard: React.FC = () => {
  const { bookId } = useParams();
  const { books } = useBooksStore();
  const navigate = useNavigate();
  const { pages, load: loadPages, createPage } = usePagesStore();
  useEffect(()=>{ if(bookId) loadPages(bookId); }, [bookId, loadPages]);
  const book = books.find(b=>b.id===bookId);
  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <button onClick={()=>navigate('/')} className="text-sm text-primary">← 목록</button>
        <h2 className="text-xl font-semibold">{book?.title || '책'}</h2>
        <div className="flex gap-2">
          <Link to={`/books/${bookId}/world`} className="text-sm underline">세계관</Link>
          <button onClick={async()=>{ if(bookId){ const p = await createPage(bookId); navigate(`/books/${bookId}/pages/${p.index}`);} }} className="px-2 py-1 text-sm bg-primary text-white rounded-md">+ 페이지</button>
        </div>
      </header>
      <ul className="space-y-2">
        {pages.filter(p=>p.bookId===bookId).map(p=>(
          <li key={p.id}>
            <Link to={`/books/${bookId}/pages/${p.index}`} className="block p-3 rounded-md border border-border hover:bg-surfaceAlt">
              <div className="text-sm font-medium">#{p.index} {p.title || '(제목 없음)'}</div>
              <div className="text-xs text-text-dim">{p.status}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default BookDashboard;
