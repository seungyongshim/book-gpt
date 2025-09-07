import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
import { toast } from '../../stores/toastStore';
import { PageVersion } from '../../types/domain';

const VersionTimeline: React.FC = () => {
  const { bookId, pageIndex } = useParams();
  const navigate = useNavigate();
  const { pages, load, listVersions, rollbackVersion } = usePagesStore() as any;
  const page = pages.find((p: any)=>p.bookId===bookId && p.index===Number(pageIndex));
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [pick, setPick] = useState<string[]>([]); // 선택된 2개 버전 ID
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
  {versions.map((v: PageVersion)=>(
          <li key={v.id} className={`border border-border rounded p-3 bg-surfaceAlt relative ${pick.includes(v.id)?'ring-2 ring-primary/70':''}`}>
            <div className="flex items-center justify-between text-xs">
              <span>{new Date(v.timestamp).toLocaleString()}</span>
              <span className="opacity-70">{v.author}</span>
            </div>
            <div className="mt-1 text-[11px] text-text-dim">length: {v.contentSnapshot.length}</div>
            <div className="flex gap-2 mt-2">
              <Link to={`/books/${bookId}/pages/${pageIndex}/diff/${v.id}`} className="text-[11px] text-primary underline">단일 Diff</Link>
              <button
                className="text-[11px] px-2 py-0.5 border border-border rounded hover:bg-surface"
                onClick={()=>{
                  setPick(prev=>{
                    if (prev.includes(v.id)) return prev.filter(id=>id!==v.id);
                    if (prev.length===2) return [prev[1], v.id];
                    return [...prev, v.id];
                  });
                }}
              >{pick.includes(v.id)?'해제':'비교'}</button>
              <button
                className="text-[11px] px-2 py-0.5 border border-warn text-warn rounded hover:bg-warn/10"
                onClick={async()=>{
                  const ok = await rollbackVersion(v.id);
                  if (ok) {
                    toast('롤백 완료', 'success');
                    if (page) {
                      const vs = await listVersions(page.id);
                      setVersions(vs);
                    }
                  } else {
                    toast('롤백 실패', 'error');
                  }
                }}
              >롤백</button>
            </div>
          </li>
        ))}
        {versions.length===0 && <li className="text-xs text-text-dim">버전 없음</li>}
      </ul>
      {pick.length===2 && (
        <div className="pt-2 border-t border-border flex items-center gap-2">
          <span className="text-[11px] text-text-dim">선택됨 2개 비교:</span>
          <button
            className="text-[11px] px-2 py-1 rounded bg-primary text-white"
            onClick={()=>navigate(`/books/${bookId}/pages/${pageIndex}/diff/${pick[0]}?compare=${pick[1]}`)}
          >Diff 열기</button>
          <button className="text-[10px] text-text-dim underline" onClick={()=>setPick([])}>초기화</button>
        </div>
      )}
    </div>
  );
};
export default VersionTimeline;
