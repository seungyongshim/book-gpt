// CLEAN REWRITE START
import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
import { useWorldStore } from '../../stores/worldStore';
import { assemblePrompt } from '../../utils/promptAssembler';
import { parseReferences } from '../../utils/referenceParser';
import { usePageGeneration } from '../../hooks/usePageGeneration';
import TokenMeter from '../../components/TokenMeter';

const PromptDrawer: React.FC<{ open: boolean; onClose: () => void; layer: any; }> = ({ open, onClose, layer }) => (
  <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
    <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
    <div className={`absolute top-0 right-0 h-full w-[360px] bg-bg border-l border-border shadow-xl transform transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h3 className="text-sm font-semibold">Prompt Preview</h3>
        <button onClick={onClose} className="text-xs text-text-dim hover:text-text">닫기</button>
      </div>
      <div className="p-3 overflow-y-auto h-[calc(100%-48px)] space-y-4 text-xs">
        {['system','bookSystem','worldDerived','pageSystem'].map(k => layer[k] && (
          <div key={k}>
            <div className="font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim">{k}</div>
            <pre className="whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto">{layer[k]}</pre>
          </div>
        ))}
        {layer.dynamicContext && layer.dynamicContext.length > 0 && (
          <div>
            <div className="font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim">dynamicContext</div>
            <ul className="space-y-1">
              {layer.dynamicContext.map((d: any, i: number) => (
                <li key={i} className="border border-border rounded p-2 bg-surfaceAlt">
                  <div className="text-[11px] font-medium mb-1">{d.ref}</div>
                  <div className="whitespace-pre-wrap leading-relaxed">{d.summary}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {layer.userInstruction && (
          <div>
            <div className="font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim">userInstruction</div>
            <pre className="whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto">{layer.userInstruction}</pre>
          </div>
        )}
      </div>
    </div>
  </div>
);

const PageEditor: React.FC = () => {
  const { bookId, pageIndex } = useParams();
  const { pages, load, getReferenceSummary } = usePagesStore();
  const { world, load: loadWorld, getWorldDerived } = useWorldStore();
  const navigate = useNavigate();
  const page = pages.find(p => p.bookId === bookId && p.index === Number(pageIndex));
  const { output, running, run, abort } = usePageGeneration();
  const [instruction, setInstruction] = React.useState('');
  const [openDrawer, setOpenDrawer] = React.useState(false);

  useEffect(() => { if (bookId) { load(bookId); loadWorld(bookId); } }, [bookId, load, loadWorld]);

  const [worldSummary, setWorldSummary] = React.useState<string>('');
  const [refSummaries, setRefSummaries] = React.useState<Record<string,string>>({});

  // 참조 파싱 (요약 로딩 useEffect보다 먼저 선언 필요)
  const { references } = useMemo(() => parseReferences(instruction), [instruction]);

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
      const acc: Record<string,string> = {};
      for (const r of references) {
        for (const idxStr of r.pageIds) {
          const idx = parseInt(idxStr, 10);
            const target = pages.find(p=>p.bookId===bookId && p.index===idx);
            if (target) {
              const sum = await getReferenceSummary(target.id);
              if (sum) acc[r.refRaw] = (acc[r.refRaw] ? acc[r.refRaw] + '\n' : '') + sum;
            }
        }
      }
      if (!cancelled) setRefSummaries(acc);
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
      summary: refSummaries[r.refRaw] || '로딩 중...'
    })),
    userInstruction: instruction
  }), [references, instruction, worldSummary, refSummaries]);

  const generate = () => { if (page) run(page.id, layer); };

  if (!page) return <div className="p-4 text-sm">페이지 로딩 중 또는 없음</div>;

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-2">
        <button onClick={() => navigate(`/books/${bookId}`)} className="text-sm text-primary">← 목록</button>
        <h2 className="text-xl font-semibold">페이지 #{page.index}</h2>
      </header>

      <TokenMeter layer={layer} />

      <textarea
        className="w-full h-32 text-sm p-2 rounded-md bg-surfaceAlt border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
        placeholder="지시문과 @참조 입력 (@3-5 등)"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      {references.length > 0 && (
        <div className="text-xs text-text-dim space-y-1">
          <div className="font-medium text-text">참조 ({references.length})</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {references.map(r => (
              <li key={r.refRaw}>{r.refRaw} <span className="text-[10px] opacity-70">pages:{r.pageIds.join(',') || 'slug'}</span></li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
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
        <button
          onClick={() => setOpenDrawer(true)}
          className="px-3 py-1.5 rounded border border-border text-sm"
        >
          Prompt 보기
        </button>
      </div>

      <div className="border border-border rounded-md p-3 h-80 overflow-auto text-sm whitespace-pre-wrap bg-surfaceAlt">
        {output || '출력 대기...'}
      </div>

      <PromptDrawer open={openDrawer} onClose={() => setOpenDrawer(false)} layer={layer} />
    </div>
  );
};
export default PageEditor;
// CLEAN REWRITE END

