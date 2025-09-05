import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBooksStore } from '../../stores/booksStore';

const BookList: React.FC = () => {
  const { books, load, createBook } = useBooksStore();
  const navigate = useNavigate();
  useEffect(()=>{ load(); }, [load]);
  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">내 책</h1>
        <button onClick={async()=>{ const b = await createBook('새 책'); navigate(`/books/${b.id}`); }} className="px-3 py-1.5 rounded-md bg-primary text-white text-sm">+ 새 책</button>
      </header>
      {books.length===0 && <p className="text-text-dim text-sm">아직 책이 없습니다. 새 책을 추가해보세요.</p>}
      <ul className="space-y-2">
        {books.map(b=>(
          <li key={b.id}>
            <Link to={`/books/${b.id}`} className="block rounded-md border border-border p-3 hover:bg-surfaceAlt">
              <div className="font-medium text-sm">{b.title}</div>
              <div className="text-xs text-text-dim">업데이트: {new Date(b.updatedAt).toLocaleString()}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default BookList;
