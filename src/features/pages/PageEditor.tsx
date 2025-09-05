import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
import { assemblePrompt } from '../../utils/promptAssembler';
import { parseReferences } from '../../utils/referenceParser';
import { usePageGeneration } from '../../hooks/usePageGeneration';
import TokenMeter from '../../components/TokenMeter';

const PromptDrawer: React.FC<{ open: boolean; onClose: () => void; layer: any; }> = ({ open, onClose, layer }) => {
  return (
    <div className={`fixed inset-0 z-40 ${open? '' : 'pointer-events-none'}`}>\n      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />\n      <div className={`absolute top-0 right-0 h-full w-[340px] bg-bg border-l border-border shadow-xl transform transition-transform ${open? 'translate-x-0' : 'translate-x-full'}`}>\n        <div className="p-4 flex items-center justify-between border-b border-border">\n          <h3 className="text-sm font-semibold">Prompt Preview</h3>\n          <button onClick={onClose} className="text-xs text-text-dim hover:text-text">닫기</button>\n        </div>\n        <div className="p-3 overflow-y-auto h-[calc(100%-48px)] space-y-4 text-xs">\n          {['system','bookSystem','worldDerived','pageSystem'].map(k=> layer[k] && (\n            <div key={k}>\n              <div className="font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim">{k}</div>\n              <pre className="whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto">{layer[k]}</pre>\n            </div>\n          ))}\n          {layer.dynamicContext && layer.dynamicContext.length>0 && (\n            <div>\n              <div className="font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim">dynamicContext</div>\n              <ul className="space-y-1">\n                {layer.dynamicContext.map((d:any,i:number)=>(\n                  <li key={i} className="border border-border rounded p-2 bg-surfaceAlt">\n                    <div className="text-[11px] font-medium mb-1">{d.ref}</div>\n                    <div className="whitespace-pre-wrap">{d.summary}</div>\n                  </li>\n                ))}\n              </ul>\n            </div>\n          )}\n          {layer.userInstruction && (\n            <div>\n              <div className="font-medium mb-1 text-[11px] uppercase tracking-wide text-text-dim">userInstruction</div>\n              <pre className="whitespace-pre-wrap bg-surfaceAlt p-2 rounded border border-border max-h-40 overflow-auto">{layer.userInstruction}</pre>\n            </div>\n          )}\n        </div>\n      </div>\n    </div>\n  );
};

const PageEditor: React.FC = () => {
  const { bookId, pageIndex } = useParams();
  const { pages, load } = usePagesStore();
  const navigate = useNavigate();
  const page = pages.find(p=>p.bookId===bookId && p.index===Number(pageIndex));
  const { output, running, run } = usePageGeneration();
  const [instruction, setInstruction] = React.useState('');
  const [openDrawer, setOpenDrawer] = React.useState(false);
  useEffect(()=>{ if(bookId) load(bookId); }, [bookId, load]);

  const { references } = useMemo(()=>parseReferences(instruction), [instruction]);

  const layer = useMemo(()=> assemblePrompt({
    system: '글로벌 규칙',
    bookSystem: '북 시스템',
    worldDerived: '세계관 요약 (예시)',
    pageSystem: '페이지 시스템',
    referencedSummaries: references.map(r=>({ ref: r.refRaw, summary: '요약 placeholder' })),
    userInstruction: instruction
  }), [references, instruction]);

  const generate = () => { run(layer); };

  if(!page) return <div className="p-4 text-sm">페이지 로딩 중 또는 없음</div>;
  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-2">
        <button onClick={()=>navigate(`/books/${bookId}`)} className="text-sm text-primary">← 목록</button>
        <h2 className="text-xl font-semibold">페이지 #{page.index}</h2>
      </header>
  <TokenMeter layer={layer} />
      <textarea className="w-full h-32 text-sm p-2 rounded-md bg-surfaceAlt border border-border" placeholder="지시문과 @참조 입력 (@3-5 등)" value={instruction} onChange={(e)=>setInstruction(e.target.value)} />
      {references.length>0 && (
        <div className="text-xs text-text-dim space-y-1">
          <div className="font-medium text-text">참조 ({references.length})</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {references.map(r=> <li key={r.refRaw}>{r.refRaw} <span className="text-[10px] opacity-70">pages:{r.pageIds.join(',')||'slug'}</span></li>)}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <button disabled={running} onClick={generate} className="px-3 py-1.5 rounded bg-primary text-white text-sm disabled:opacity-50">{running? '생성중...' : '생성'}</button>
        <button onClick={()=>setOpenDrawer(true)} className="px-3 py-1.5 rounded border border-border text-sm">Prompt 보기</button>
      </div>
      <div className="border border-border rounded-md p-3 h-80 overflow-auto text-sm whitespace-pre-wrap bg-surfaceAlt">
        {output || '출력 대기...'}
      </div>
      <PromptDrawer open={openDrawer} onClose={()=>setOpenDrawer(false)} layer={layer} />
    </div>
  );
};
export default PageEditor;
