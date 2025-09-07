import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldStore } from '../../stores/worldStore';

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

  useEffect(()=>{ if(bookId) load(bookId); }, [bookId, load]);

  const refreshSummary = useCallback(async ()=>{
    if (!bookId) return;
    setLoadingSummary(true);
    const s = await getWorldDerived(bookId);
    setSummary(s || '');
    setLoadingSummary(false);
  }, [bookId, getWorldDerived]);

  useEffect(()=>{ if(bookId) refreshSummary(); }, [bookId, refreshSummary]);

  const handleBlur = (key: string, value: string) => {
    if (!bookId) return;
    save(bookId, { [key]: value } as any);
  };

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">세계관 설정 {worldDerivedInvalidated && <span className="text-xs bg-warn/20 text-warn px-2 py-0.5 rounded">Modified*</span>}</h2>
        <button onClick={refreshSummary} className="text-xs px-2 py-1 rounded bg-surfaceAlt border border-border hover:bg-surface focus:outline-none focus:ring-1 focus:ring-primary">요약 새로고침</button>
      </div>
      <div className="grid gap-5">
        {fields.map(f=>{
          const val = (world as any)?.[f.key] || '';
          return (
            <div key={String(f.key)} className="space-y-1">
              <label className="text-xs font-medium text-text-dim block">{f.label}</label>
              <textarea
                className="w-full text-sm p-2 rounded-md bg-surfaceAlt border border-border resize-y"
                style={{ minHeight: '120px' }}
                placeholder={f.placeholder}
                defaultValue={val}
                onBlur={e=>handleBlur(f.key as string, e.target.value)}
              />
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">자동 요약 Preview <span className="text-[10px] text-text-dim">(world.summary 캐시)</span></h3>
        <div className="border border-border rounded bg-surfaceAlt p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto">
          {loadingSummary ? '요약 생성 중...' : (summary || '요약이 비어 있습니다. 내용을 입력 후 새로고침을 눌러 생성하세요.')}
        </div>
        <p className="text-[10px] text-text-dim">저장 시 버전이 증가하고 캐시가 무효화됩니다. 새 요약을 반영하려면 새로고침을 눌러 주세요.</p>
      </div>
    </div>
  );
};
export default WorldBuilder;
