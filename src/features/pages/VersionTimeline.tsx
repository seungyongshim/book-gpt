import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';

const VersionTimeline: React.FC = () => {
  const { bookId, pageIndex } = useParams();
  const navigate = useNavigate();
  const { pages, load, listVersions } = usePagesStore();
  const page = pages.find(p=>p.bookId===bookId && p.index===Number(pageIndex));
  const [versions, setVersions] = useState<any[]>([]);
  useEffect(()=>{ if(bookId) load(bookId); }, [bookId, load]);
  useEffect(()=>{ (async()=>{ if(page) { const vs = await listVersions(page.id); setVersions(vs);} })(); }, [page, listVersions]);
  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-2">
        <button onClick={()=>navigate(`/books/${bookId}/pages/${pageIndex}`)} className="text-sm text-primary">← 페이지</button>
        <h2 className="text-xl font-semibold">버전 타임라인 #{pageIndex}</h2>
      </header>
      {!page && <p className="text-sm text-warn">페이지를 찾을 수 없습니다.</p>}
      <ul className="space-y-2">
  {versions.map((v: any)=>(
          <li key={v.id} className="border border-border rounded p-3 bg-surfaceAlt">
            <div className="flex items-center justify-between text-xs">
              <span>{new Date(v.timestamp).toLocaleString()}</span>
              <span className="opacity-70">{v.author}</span>
            </div>
            <div className="mt-1 text-[11px] text-text-dim">length: {v.contentSnapshot.length}</div>
            <Link to={`/books/${bookId}/pages/${pageIndex}/diff/${v.id}`} className="inline-block mt-1 text-[11px] text-primary underline">Diff 보기</Link>
          </li>
        ))}
        {versions.length===0 && <li className="text-xs text-text-dim">버전 없음</li>}
      </ul>
    </div>
  );
};
export default VersionTimeline;
