import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldStore } from '../../stores/worldStore';
import { summarizeWorld } from '../../utils/promptAssembler';

const fields: { key: keyof any; label: string; placeholder: string; rows?: number }[] = [
  { key: 'premise', label: 'Premise (핵심 전제)', placeholder: '세계관 핵심 전제 / 갈등의 씨앗 요약' },
  { key: 'timeline', label: 'Timeline (주요 사건)', placeholder: '연표 형식으로 주요 사건 정리: 연도/사건' },
  { key: 'geography', label: 'Geography (지리/환경)', placeholder: '주요 지역, 기후, 상징적 장소' },
  { key: 'factions', label: 'Factions (세력)', placeholder: '세력 이름: 목표, 자원, 갈등 관계' },
  { key: 'characters', label: 'Characters (핵심 인물)', placeholder: '이름 - 역할 - 특성/비밀' },
  { key: 'magicOrTech', label: 'Magic / Tech 규칙', placeholder: '주요 규칙, 제약, 비용, 금기' },
  { key: 'constraints', label: 'Constraints (금기/제약)', placeholder: '표현 금지, 세계관 논리적 제약' },
  { key: 'styleGuide', label: 'Style Guide', placeholder: '문체, 어조, 서술 시점, 피해야 할 표현' }
];

const WorldBuilder: React.FC = () => {
  const { bookId } = useParams();
  const { world, load, save, worldDerivedInvalidated, getWorldDerived } = useWorldStore();
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editing, setEditing] = useState<Record<string,string>>({});
  const [autoSummary, setAutoSummary] = useState<string>('');
  const [autoMode, setAutoMode] = useState(true);
  const debounceRef = useRef<number | null>(null);

  useEffect(()=>{ if(bookId) load(bookId); }, [bookId, load]);

  const refreshSummary = useCallback(async ()=>{
    if (!bookId) return;
    setLoadingSummary(true);
    const s = await getWorldDerived(bookId);
    setSummary(s || '');
    setLoadingSummary(false);
  }, [bookId, getWorldDerived]);

  useEffect(()=>{ if(bookId) refreshSummary(); }, [bookId, refreshSummary]);

  const handleChange = (key: string, value: string) => {
    setEditing(prev => ({ ...prev, [key]: value }));
    // 디바운스된 자동 요약
    if (autoMode) {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(()=>{
        const draft = { ...world, ...editing, [key]: value } as any;
        const s = summarizeWorld(draft);
        setAutoSummary(s);
      }, 700);
    }
  };

  const handleBlur = (key: string, value: string) => {
    if (!bookId) return;
    save(bookId, { [key]: value } as any);
  };

  const effectiveSummary = autoMode ? (autoSummary || summary) : summary;

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">세계관 설정 {worldDerivedInvalidated && <span className="text-xs bg-warn/20 text-warn px-2 py-0.5 rounded">Modified*</span>}</h2>
        <button onClick={refreshSummary} className="text-xs px-2 py-1 rounded bg-surfaceAlt border border-border hover:bg-surface focus:outline-none focus:ring-1 focus:ring-primary">요약 새로고침</button>
      </div>
      <div className="grid gap-5">
        {fields.map(f=>{
          const initialVal = (world as any)?.[f.key] || '';
          const liveVal = editing[f.key as string] ?? initialVal;
          return (
            <div key={String(f.key)} className="space-y-1">
              <label className="text-xs font-medium text-text-dim block">{f.label}</label>
              <textarea
                className="w-full text-sm p-2 rounded-md bg-surfaceAlt border border-border resize-y"
                style={{ minHeight: '120px' }}
                placeholder={f.placeholder}
                value={liveVal}
                onChange={e=>handleChange(f.key as string, e.target.value)}
                onBlur={e=>handleBlur(f.key as string, e.target.value)}
              />
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">자동 요약 Preview <span className="text-[10px] text-text-dim">(world.summary 캐시 / 로컬)</span></h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer select-none text-[11px]">
              <input type="checkbox" className="scale-90" checked={autoMode} onChange={e=>setAutoMode(e.target.checked)} /> Auto
            </label>
            <button onClick={refreshSummary} className="text-[10px] px-2 py-1 rounded bg-surfaceAlt border border-border hover:bg-surface focus:outline-none focus:ring-1 focus:ring-primary">캐시 재생성</button>
          </div>
        </div>
        <div className="border border-border rounded bg-surfaceAlt p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto">
          {loadingSummary ? '요약 생성 중...' : (effectiveSummary || '요약이 비어 있습니다. 내용을 입력하면 자동 또는 캐시 불러오기가 표시됩니다.')}
        </div>
        <p className="text-[10px] text-text-dim">입력 변경 시 {autoMode ? '약 0.7초 후 자동 요약 미리보기(저장 전 임시)' : '자동 요약 비활성화됨'} · 저장 시 버전 증가 & 캐시 무효화 → "캐시 재생성" 클릭 시 worldDerived 저장.</p>
      </div>
    </div>
  );
};
export default WorldBuilder;
