import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldStore } from '../../stores/worldStore';

const WorldBuilder: React.FC = () => {
  const { bookId } = useParams();
  const { world, load, save, worldDerivedInvalidated } = useWorldStore();
  useEffect(()=>{ if(bookId) load(bookId); }, [bookId, load]);
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold flex items-center gap-2">세계관 설정 {worldDerivedInvalidated && <span className="text-xs bg-warn/20 text-warn px-2 py-0.5 rounded">Modified*</span>}</h2>
      <textarea className="w-full h-40 text-sm p-2 rounded-md bg-surfaceAlt border border-border" placeholder="Premise" defaultValue={world?.premise} onBlur={(e)=> bookId && save(bookId,{ premise: e.target.value })} />
      <textarea className="w-full h-40 text-sm p-2 rounded-md bg-surfaceAlt border border-border" placeholder="Style Guide" defaultValue={world?.styleGuide} onBlur={(e)=> bookId && save(bookId,{ styleGuide: e.target.value })} />
      <p className="text-xs text-text-dim">저장 시 버전 증가 및 world.summary 캐시 무효화.</p>
    </div>
  );
};
export default WorldBuilder;
