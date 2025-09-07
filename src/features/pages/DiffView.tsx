import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';

interface SimpleDiffSegment { type: 'eq' | 'add' | 'del'; text: string; }

function simpleWordDiff(a: string, b: string): SimpleDiffSegment[] {
  if (a === b) return [{ type: 'eq', text: a }];
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  // LCS dynamic programming (small scale)
  const dp: number[][] = Array(aWords.length+1).fill(0).map(()=>Array(bWords.length+1).fill(0));
  for (let i=1;i<=aWords.length;i++) {
    for (let j=1;j<=bWords.length;j++) {
      if (aWords[i-1] === bWords[j-1]) dp[i][j] = dp[i-1][j-1]+1; else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  const segments: SimpleDiffSegment[] = [];
  let i=aWords.length, j=bWords.length;
  while (i>0 || j>0) {
    if (i>0 && j>0 && aWords[i-1] === bWords[j-1]) { segments.unshift({ type:'eq', text: aWords[i-1] }); i--; j--; }
    else if (j>0 && (i===0 || dp[i][j-1] >= dp[i-1][j])) { segments.unshift({ type:'add', text: bWords[j-1] }); j--; }
    else if (i>0 && (j===0 || dp[i][j-1] < dp[i-1][j])) { segments.unshift({ type:'del', text: aWords[i-1] }); i--; }
    else break;
  }
  // merge consecutive same-type
  const merged: SimpleDiffSegment[] = [];
  for (const s of segments) {
    const last = merged[merged.length-1];
    if (last && last.type === s.type) last.text += ' ' + s.text; else merged.push({ ...s });
  }
  return merged;
}

const DiffView: React.FC = () => {
  const { bookId, pageIndex, versionId } = useParams();
  const navigate = useNavigate();
  const { pages, load, getVersion, listVersions } = usePagesStore();
  const page = pages.find(p=>p.bookId===bookId && p.index===Number(pageIndex));
  const [targetText, setTargetText] = useState('');
  const [prevText, setPrevText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ if(bookId) load(bookId); }, [bookId, load]);
  useEffect(()=>{ (async()=>{
    if (!page || !versionId) { setLoading(false); return; }
    const v = await getVersion(versionId);
    if (!v) { setLoading(false); return; }
    setTargetText(v.contentSnapshot);
    const vs = await listVersions(page.id);
  const idx = vs.findIndex((x: any)=>x.id===v.id);
    const prev = vs[idx+1]; // 다음 항목이 이전 시점 (정렬: 최신→과거)
    setPrevText(prev? prev.contentSnapshot : '');
    setLoading(false);
  })(); }, [page, versionId, getVersion, listVersions]);

  const diffSegments = useMemo(()=> simpleWordDiff(prevText, targetText), [prevText, targetText]);
  const added = targetText.length - prevText.length;

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-2">
        <button onClick={()=>navigate(`/books/${bookId}/pages/${pageIndex}/versions`)} className="text-sm text-primary">← 타임라인</button>
        <h2 className="text-xl font-semibold">Diff #{pageIndex}</h2>
      </header>
      {loading && <p className="text-sm text-text-dim">로딩...</p>}
      {!loading && (
        <div className="space-y-3">
          <div className="text-xs text-text-dim">length(prev → curr): {prevText.length} → {targetText.length} (Δ {added>=0?'+':''}{added})</div>
          <div className="text-xs border border-border rounded p-3 bg-surfaceAlt leading-relaxed">
            {diffSegments.map((s: SimpleDiffSegment, i: number)=>(
              <span key={i} className={s.type==='add'? 'bg-green-500/20 text-green-600' : s.type==='del' ? 'bg-red-500/10 text-red-600 line-through' : ''}>{s.text} </span>
            ))}
          </div>
          <Link to={`/books/${bookId}/pages/${pageIndex}`} className="text-xs text-primary underline">에디터로</Link>
        </div>
      )}
    </div>
  );
};
export default DiffView;
