// CLEAN REWRITE START
import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
import { useBooksStore } from '../../stores/booksStore';
import { useWorldStore } from '../../stores/worldStore';
import { assemblePrompt, totalPromptTokens, suggestTargetChars } from '../../utils/promptAssembler';
import { compressReferences, compressWorldSummary } from '../../utils/compression';
import { parseReferences } from '../../utils/referenceParser';
import { usePageGeneration } from '../../hooks/usePageGeneration';
import TokenMeter from '../../components/TokenMeter';
import PromptDrawer from '../../components/PromptDrawer';
import type { PageMeta } from '../../types/domain';


const PageEditor: React.FC = () => {
  const { bookId, pageIndex } = useParams();
  const { pages, load, getReferenceSummary, updatePage } = usePagesStore() as any;
  const { books } = useBooksStore();
  const { world, load: loadWorld, getWorldDerived } = useWorldStore();
  const navigate = useNavigate();
  const page = pages.find((p: PageMeta) => p.bookId === bookId && p.index === Number(pageIndex));
  const [title, setTitle] = React.useState(page?.title || '');
  const [slug, setSlug] = React.useState(page?.slug || '');
  useEffect(()=>{ if (page) { setTitle(page.title||''); setSlug(page.slug||''); } }, [page?.id]);
  const { output, running, run, abort, extend, progressRatio, targetChars, completionChars, canExtend } = usePageGeneration();
  const [model, setModel] = React.useState('gpt-4o-mini');
  const [temperature, setTemperature] = React.useState(0.8);
  const [manualTarget, setManualTarget] = React.useState<number | ''>('');
  const [suggestedTarget, setSuggestedTarget] = React.useState<number>(12000);
  const [instruction, setInstruction] = React.useState('');
  const [openDrawer, setOpenDrawer] = React.useState(false);

  useEffect(() => { if (bookId) { load(bookId); loadWorld(bookId); } }, [bookId, load, loadWorld]);

  const [worldSummary, setWorldSummary] = React.useState<string>('');
  const [refSummaries, setRefSummaries] = React.useState<Record<string,string>>({});
  const [compressedRefs, setCompressedRefs] = React.useState<Record<string,string>>({});
  const [worldCompressed, setWorldCompressed] = React.useState(false);

  // 참조 파싱 (요약 로딩 useEffect보다 먼저 선언 필요)
  const { references, warnings } = useMemo(() => parseReferences(instruction, { selfPageIndex: page?.index }), [instruction, page?.index]);

  // worldDerived 로드
  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const ws = await getWorldDerived(bookId);
      if (ws) setWorldSummary(ws);
    })();
  }, [bookId, world, getWorldDerived]);

  // 참조 요약 로드
  useEffect(() => {
    if (!references.length || !bookId) { setRefSummaries({}); return; }
    let cancelled = false;
    (async () => {
      const tasks: Promise<{ key: string; text: string } | null>[] = [];
      for (const r of references) {
        if (r.pageIds.length === 0 && r.refRaw.startsWith('@p:')) {
          const slugToken = r.refRaw.slice(3);
          const target = pages.find((p: PageMeta)=>p.bookId===bookId && p.slug===slugToken);
          if (target) {
            tasks.push((async()=>{
              const sum = await getReferenceSummary(target.id);
              return sum ? { key: r.refRaw, text: sum } : null;
            })());
          }
          continue;
        }
        tasks.push((async()=>{
          let merged = '';
          for (const idxStr of r.pageIds) {
            const idx = parseInt(idxStr, 10);
            const target = pages.find((p: PageMeta)=>p.bookId===bookId && p.index===idx);
            if (target) {
              const sum = await getReferenceSummary(target.id);
              if (sum) merged = merged ? merged + '\n' + sum : sum;
            }
          }
            return merged ? { key: r.refRaw, text: merged } : null;
        })());
      }
      const results = await Promise.all(tasks);
      if (cancelled) return;
      const acc: Record<string,string> = {};
      for (const r of results) if (r) acc[r.key] = r.text;
      setRefSummaries(acc);
    })();
    return () => { cancelled = true; };
  }, [references, pages, bookId, getReferenceSummary]);

  const layer = useMemo(() => assemblePrompt({
    system: '글로벌 규칙',
    bookSystem: '북 시스템',
    worldDerived: worldSummary || '세계관 요약 준비중...',
    pageSystem: '페이지 시스템',
    referencedSummaries: references.map(r => ({
      ref: r.refRaw,
      summary: (compressedRefs[r.refRaw] ?? refSummaries[r.refRaw]) || '로딩 중...'
    })),
    userInstruction: instruction
  }), [references, instruction, worldSummary, refSummaries, compressedRefs]);

  const promptTokens = React.useMemo(()=> totalPromptTokens(layer), [layer]);
  // Suggest target (assumes 16K context model for now; future: per-model config map)
  React.useEffect(()=>{
    const suggested = suggestTargetChars({ contextLimitTokens: 16000, promptTokens, desiredChars: 12000 });
    setSuggestedTarget(suggested);
  }, [promptTokens]);
  const effectiveTarget = manualTarget === '' ? suggestedTarget : manualTarget;
  const remainingTokensApprox = 16000 - promptTokens - 400; // reserve 400 tokens
  const estCompletionTokens = Math.max(0, remainingTokensApprox);
  const riskLevel = promptTokens / 16000; // crude
  const riskColor = riskLevel > 0.9 ? 'text-red-500' : riskLevel > 0.8 ? 'text-amber-500' : 'text-text-dim';

  const generate = () => { if (page) run(page.id, layer, { model, temperature, targetChars: effectiveTarget }); };

  if (!page) return <div className="p-4 text-sm">페이지 로딩 중 또는 없음</div>;

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/books/${bookId}`)} className="text-sm text-primary">← 목록</button>
          <h2 className="text-xl font-semibold">페이지 #{page.index}</h2>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={title}
            onChange={e=>setTitle(e.target.value)}
            onBlur={()=> page && updatePage(page.id, { title })}
            placeholder="제목"
            className="px-2 py-1 rounded border border-border bg-surfaceAlt text-sm w-full md:w-64"
          />
          <input
            value={slug}
            onChange={e=>setSlug(e.target.value)}
            onBlur={()=> page && updatePage(page.id, { slug })}
            placeholder="slug"
            className="px-2 py-1 rounded border border-border bg-surfaceAlt text-sm w-full md:w-48"
          />
        </div>
      </header>

      <TokenMeter layer={layer} onSuggestCompress={(strategy)=>{
        if (strategy === 'L1') {
          const list = references.map(r => ({ ref: r.refRaw, summary: refSummaries[r.refRaw] || '' }));
            const compressed = compressReferences({ summaries: list, level: 'L1' });
            const map: Record<string,string> = {};
            compressed.forEach((c: { ref: string; summary: string }) => { map[c.ref] = c.summary; });
            setCompressedRefs(map);
        } else if (strategy === 'world-compact') {
          if (!worldCompressed) {
            setWorldSummary(ws => compressWorldSummary(ws, 'world-compact'));
            setWorldCompressed(true);
          }
        }
      }} />
      <div className="border border-border rounded p-3 space-y-3 bg-surfaceAlt">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label className="text-[10px] font-medium text-text-dim">Model</label>
            <select value={model} onChange={e=>setModel(e.target.value)} className="text-sm px-2 py-1 rounded border border-border bg-surface">
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-medium text-text-dim">Temperature {temperature.toFixed(2)}</label>
            <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={e=>setTemperature(parseFloat(e.target.value))} className="w-40" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-medium text-text-dim">Target Chars</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={manualTarget === '' ? '' : manualTarget}
                placeholder={suggestedTarget.toString()}
                onChange={e=>{
                  const v = e.target.value;
                  if (v === '') setManualTarget(''); else setManualTarget(Math.max(1000, Math.min(18000, parseInt(v)||0)));}}
                className="w-28 text-sm px-2 py-1 rounded border border-border bg-surface"
              />
              <button onClick={()=>setManualTarget(suggestedTarget)} className="text-[11px] px-2 py-1 border border-border rounded">추천값</button>
            </div>
          </div>
          <div className="flex flex-col text-[11px] gap-0.5">
            <div><span className="text-text-dim">Prompt Tokens:</span> <span className="font-medium">{promptTokens}</span></div>
            <div><span className="text-text-dim">Remaining(est):</span> <span className="font-medium">{estCompletionTokens}</span></div>
            <div className={riskColor}>Usage {(riskLevel*100).toFixed(1)}%</div>
          </div>
        </div>
        <div className="text-[10px] text-text-dim flex flex-wrap gap-3">
          <span>추천 Target: {suggestedTarget}</span>
          <span>실행 Target: {effectiveTarget}</span>
          <span>현재 Completion: {completionChars}</span>
        </div>
      </div>
      {(page.tokensPrompt || page.tokensCompletion) && (
        <div className="text-[11px] text-text-dim flex gap-3">
          {page.tokensPrompt !== undefined && <span>프롬프트 추정: <span className="font-medium">{page.tokensPrompt}</span></span>}
          {page.tokensCompletion !== undefined && <span>생성 추정: <span className="font-medium">{page.tokensCompletion}</span></span>}
          {page.tokensUsed !== undefined && <span>총합: <span className="font-medium">{page.tokensUsed}</span></span>}
        </div>
      )}

      <textarea
        className="w-full h-32 text-sm p-2 rounded-md bg-surfaceAlt border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
        placeholder="지시문과 @참조 입력 (@3-5 등)"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      {(warnings && warnings.length>0) && (
        <div className="text-[11px] text-warn space-y-0.5">
          {warnings.map((w: string,i: number)=>(<div key={i}>⚠ {w}</div>))}
        </div>
      )}
      {references.length > 0 && (
        <div className="text-xs text-text-dim space-y-1">
          <div className="font-medium text-text">참조 ({references.length})</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {references.map((r: any) => (
              <li key={r.refRaw}>{r.refRaw} <span className="text-[10px] opacity-70">pages:{r.pageIds.join(',') || 'slug'}</span></li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <button
          disabled={running}
          onClick={generate}
          className="px-3 py-1.5 rounded bg-primary text-white text-sm disabled:opacity-50"
        >
          {running ? '생성중...' : '생성'}
        </button>
        {running && (
          <button
            onClick={abort}
            className="px-3 py-1.5 rounded border border-warn text-warn text-sm"
          >중단</button>
        )}
        {canExtend && !running && (
          <button
            onClick={()=> page && extend(page.id)}
            className="px-3 py-1.5 rounded border border-border text-sm"
          >이어쓰기(+)</button>
        )}
        <button
          onClick={() => setOpenDrawer(true)}
          className="px-3 py-1.5 rounded border border-border text-sm"
        >
          Prompt 보기
        </button>
        <div className="flex items-center gap-2 text-[11px] text-text-dim">
          <span>{completionChars}/{targetChars} chars</span>
          <span>{Math.round(progressRatio*100)}%</span>
        </div>
      </div>

      <div className="h-2 w-full rounded bg-border overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, progressRatio*100)}%` }} />
      </div>

      <div className="border border-border rounded-md p-3 h-80 overflow-auto text-sm whitespace-pre-wrap bg-surfaceAlt relative">
        {output || '출력 대기...'}
        {running && <div className="absolute bottom-1 right-2 text-[10px] text-text-dim">Streaming...</div>}
      </div>

      <PromptDrawer open={openDrawer} onClose={() => setOpenDrawer(false)} layer={layer} />
    </div>
  );
};
export default PageEditor;
// CLEAN REWRITE END

