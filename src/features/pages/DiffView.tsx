import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';

interface SimpleDiffSegment { type: 'eq' | 'add' | 'del'; text: string; }

type DiffGranularity = 'word' | 'sentence' | 'paragraph';

function segmentize(text: string, granularity: DiffGranularity): string[] {
  if (!text) return [];
  switch (granularity) {
    case 'sentence':
      return text
        .replace(/\r/g,'')
        .split(/(?<=[.!?。！？])\s+|\n+/)
        .map(s=>s.trim())
        .filter(Boolean);
    case 'paragraph':
      return text
        .replace(/\r/g,'')
        .split(/\n{2,}/)
        .map(p=>p.trim())
        .filter(Boolean);
    default:
      return text.split(/\s+/).filter(Boolean);
  }
}

function genericDiff(a: string, b: string, granularity: DiffGranularity): SimpleDiffSegment[] {
  if (a === b) return [{ type: 'eq', text: a }];
  const aSeg = segmentize(a, granularity);
  const bSeg = segmentize(b, granularity);
  const dp: number[][] = Array(aSeg.length+1).fill(0).map(()=>Array(bSeg.length+1).fill(0));
  for (let i=1;i<=aSeg.length;i++) {
    for (let j=1;j<=bSeg.length;j++) {
      if (aSeg[i-1] === bSeg[j-1]) dp[i][j] = dp[i-1][j-1]+1; else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  const segments: SimpleDiffSegment[] = [];
  let i=aSeg.length, j=bSeg.length;
  while (i>0 || j>0) {
    if (i>0 && j>0 && aSeg[i-1] === bSeg[j-1]) { segments.unshift({ type:'eq', text: aSeg[i-1] }); i--; j--; }
    else if (j>0 && (i===0 || dp[i][j-1] >= dp[i-1][j])) { segments.unshift({ type:'add', text: bSeg[j-1] }); j--; }
    else if (i>0 && (j===0 || dp[i][j-1] < dp[i-1][j])) { segments.unshift({ type:'del', text: aSeg[i-1] }); i--; }
    else break;
  }
  // merge same type
  const merged: SimpleDiffSegment[] = [];
  for (const s of segments) {
    const last = merged[merged.length-1];
    if (last && last.type===s.type) last.text += (granularity==='word'?' ':'\n') + s.text; else merged.push({...s});
  }
  return merged;
}

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
  const location = useLocation();
  const compareId = useMemo(()=>{
    const sp = new URLSearchParams(location.search);
    return sp.get('compare');
  }, [location.search]);
  const page = pages.find(p=>p.bookId===bookId && p.index===Number(pageIndex));
  const [targetText, setTargetText] = useState('');
  const [prevText, setPrevText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ if(bookId) load(bookId); }, [bookId, load]);
  useEffect(()=>{ (async()=>{
    if (!page || !versionId) { setLoading(false); return; }
    const primary = await getVersion(versionId);
    if (!primary) { setLoading(false); return; }
    setTargetText(primary.contentSnapshot);
    if (compareId) {
      const other = await getVersion(compareId);
      setPrevText(other? other.contentSnapshot : '');
    } else {
      const vs = await listVersions(page.id);
      const idx = vs.findIndex((x: any)=>x.id===primary.id);
      const prev = vs[idx+1];
      setPrevText(prev? prev.contentSnapshot : '');
    }
    setLoading(false);
  })(); }, [page, versionId, getVersion, listVersions]);

  const [granularity, setGranularity] = useState<DiffGranularity>('word');
  const [collapseUnchanged, setCollapseUnchanged] = useState(true);
  const diffSegments = useMemo(()=> {
    if (granularity==='word') return simpleWordDiff(prevText, targetText);
    return genericDiff(prevText, targetText, granularity);
  }, [prevText, targetText, granularity]);

  // Collapse logic: group eq blocks > threshold
  const THRESHOLD_HIDE_UNCHANGED = granularity==='word' ? 80 : granularity==='sentence' ? 6 : 2;
  const processed = useMemo(()=>{
    if (!collapseUnchanged) return diffSegments.map(d=>({ ...d, hidden:false }));
    const out: (SimpleDiffSegment & { hidden?: boolean })[] = [];
    for (const s of diffSegments) {
      if (s.type==='eq' && s.text.split(/\s+/).length > THRESHOLD_HIDE_UNCHANGED) {
        out.push({ ...s, hidden:true });
      } else out.push(s);
    }
    return out;
  }, [diffSegments, collapseUnchanged, granularity]);

  const toggleSegment = useCallback((idx: number)=>{
    const seg = processed[idx];
    if (!seg || seg.type!=='eq' || !seg.hidden) return;
    seg.hidden = false; // mutate local derived copy (safe re-render trigger below)
  }, [processed]);
  const added = targetText.length - prevText.length;

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-2">
        <button onClick={()=>navigate(`/books/${bookId}/pages/${pageIndex}/versions`)} className="text-sm text-primary">← 타임라인</button>
        <h2 className="text-xl font-semibold">Diff #{pageIndex}</h2>
        {compareId && <span className="text-xs text-text-dim">(커스텀 비교)</span>}
      </header>
      {loading && <p className="text-sm text-text-dim">로딩...</p>}
      <div className="flex gap-3 text-xs items-center flex-wrap">
        <label className="flex items-center gap-1">Granularity:
          <select value={granularity} onChange={e=>setGranularity(e.target.value as DiffGranularity)} className="border border-border bg-surfaceAlt rounded px-1 py-0.5">
            <option value="word">단어</option>
            <option value="sentence">문장</option>
            <option value="paragraph">문단</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={collapseUnchanged} onChange={e=>setCollapseUnchanged(e.target.checked)} /> 긴 동일 구간 접기
        </label>
      </div>
      {!loading && (
        <div className="space-y-3">
          <div className="text-xs text-text-dim">length(prev → curr): {prevText.length} → {targetText.length} (Δ {added>=0?'+':''}{added})</div>
          <div className="text-xs border border-border rounded p-3 bg-surfaceAlt leading-relaxed space-y-1">
            {processed.map((s: any, i: number)=>{
              if (s.hidden) return (
                <div key={i} className="my-1">
                  <button onClick={()=>{ s.hidden=false; /* force update via state flip */ setCollapseUnchanged(c=>c); }} className="text-[10px] px-1 py-0.5 bg-surface border border-border rounded hover:bg-surfaceAlt">
                    … {granularity==='word'? s.text.split(/\s+/).length+'w': granularity==='sentence'? s.text.split(/\n/).length+'s': 'block'} 동일 구간 펼치기
                  </button>
                </div>
              );
              return (
                <span key={i} className={s.type==='add'? 'bg-green-500/20 text-green-600' : s.type==='del' ? 'bg-red-500/10 text-red-600 line-through' : ''}>{s.text}{granularity==='word'?' ':'\n'}</span>
              );
            })}
          </div>
          <Link to={`/books/${bookId}/pages/${pageIndex}`} className="text-xs text-primary underline">에디터로</Link>
        </div>
      )}
    </div>
  );
};
export default DiffView;
