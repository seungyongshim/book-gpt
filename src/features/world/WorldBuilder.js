import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldStore } from '../../stores/worldStore';
import { summarizeWorld } from '../../utils/promptAssembler';
import GPTComposer from '../../components/GPTComposer';
const fields = [
    { key: 'premise', label: 'Premise (핵심 전제)', placeholder: '세계관 핵심 전제 / 갈등의 씨앗 요약' },
    { key: 'timeline', label: 'Timeline (주요 사건)', placeholder: '연표 형식으로 주요 사건 정리: 연도/사건' },
    { key: 'geography', label: 'Geography (지리/환경)', placeholder: '주요 지역, 기후, 상징적 장소' },
    { key: 'factions', label: 'Factions (세력)', placeholder: '세력 이름: 목표, 자원, 갈등 관계' },
    { key: 'characters', label: 'Characters (핵심 인물)', placeholder: '이름 - 역할 - 특성/비밀' },
    { key: 'magicOrTech', label: 'Magic / Tech 규칙', placeholder: '주요 규칙, 제약, 비용, 금기' },
    { key: 'constraints', label: 'Constraints (금기/제약)', placeholder: '표현 금지, 세계관 논리적 제약' },
    { key: 'styleGuide', label: 'Style Guide', placeholder: '문체, 어조, 서술 시점, 피해야 할 표현' }
];
const WorldBuilder = () => {
    const { bookId } = useParams();
    const { world, load, save, worldDerivedInvalidated, getWorldDerived } = useWorldStore();
    const [summary, setSummary] = useState('');
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [editing, setEditing] = useState({});
    const [autoSummary, setAutoSummary] = useState('');
    const [autoMode, setAutoMode] = useState(true);
    const [aiTargetField, setAiTargetField] = useState(null);
    const buildPromptLayer = (fieldKey) => (instruction) => {
        const baseDesc = fields.find(f => f.key === fieldKey)?.label || fieldKey;
        const current = editing[fieldKey] ?? world?.[fieldKey] ?? '';
        const worldSnapshot = summarizeWorld({ ...world, ...editing });
        return {
            system: 'You are assisting in building a structured Korean novel world setting. Provide concise, rich, concrete details. Output only the improved field content without meta commentary.',
            userInstruction: `필드: ${baseDesc}\n현재 초안:\n${current || '(비어있음)'}\n\n세계관 요약 (참고):\n${worldSnapshot}\n\n사용자 추가 지시:\n${instruction}\n\n목표: 구체성 향상, 중복 제거, 자연스러운 한국어. Bullet와 문장을 혼합하되 과도한 장황함 피함.`
        };
    };
    const debounceRef = useRef(null);
    useEffect(() => { if (bookId)
        load(bookId); }, [bookId, load]);
    const refreshSummary = useCallback(async () => {
        if (!bookId)
            return;
        setLoadingSummary(true);
        const s = await getWorldDerived(bookId);
        setSummary(s || '');
        setLoadingSummary(false);
    }, [bookId, getWorldDerived]);
    useEffect(() => { if (bookId)
        refreshSummary(); }, [bookId, refreshSummary]);
    const handleChange = (key, value) => {
        setEditing(prev => ({ ...prev, [key]: value }));
        // 디바운스된 자동 요약
        if (autoMode) {
            if (debounceRef.current)
                window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => {
                const draft = { ...world, ...editing, [key]: value };
                const s = summarizeWorld(draft);
                setAutoSummary(s);
            }, 700);
        }
    };
    const handleBlur = (key, value) => {
        if (!bookId)
            return;
        save(bookId, { [key]: value });
    };
    const effectiveSummary = autoMode ? (autoSummary || summary) : summary;
    return (_jsxs("div", { className: "p-4 space-y-6 max-w-3xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "text-xl font-semibold flex items-center gap-2", children: ["\uC138\uACC4\uAD00 \uC124\uC815 ", worldDerivedInvalidated && _jsx("span", { className: "text-xs bg-warn/20 text-warn px-2 py-0.5 rounded", children: "Modified*" })] }), _jsx("button", { onClick: refreshSummary, className: "text-xs px-2 py-1 rounded bg-surfaceAlt border border-border hover:bg-surface focus:outline-none focus:ring-1 focus:ring-primary", children: "\uC694\uC57D \uC0C8\uB85C\uACE0\uCE68" })] }), _jsx("div", { className: "grid gap-5", children: fields.map(f => {
                    const initialVal = world?.[f.key] || '';
                    const liveVal = editing[f.key] ?? initialVal;
                    return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-medium text-text-dim block", children: f.label }), _jsx("div", { className: "flex items-center gap-1", children: _jsx("button", { type: "button", onClick: () => setAiTargetField(aiTargetField === f.key ? null : f.key), className: "text-[10px] px-2 py-0.5 rounded border border-border bg-surfaceAlt hover:bg-surface", children: aiTargetField === f.key ? '닫기' : 'AI' }) })] }), _jsx("textarea", { className: "w-full text-sm p-2 rounded-md bg-surfaceAlt border border-border resize-y", style: { minHeight: '120px' }, placeholder: f.placeholder, value: liveVal, onChange: e => handleChange(f.key, e.target.value), onBlur: e => handleBlur(f.key, e.target.value) }), aiTargetField === f.key && (_jsx("div", { className: "mt-2", children: _jsx(GPTComposer, { seed: liveVal, buildPrompt: (instr) => buildPromptLayer(f.key)(instr), onApply: (txt) => { handleChange(f.key, txt); setAiTargetField(null); }, applyLabel: "\uD544\uB4DC\uC5D0 \uC801\uC6A9", compact: true, initialInstruction: "\uC774 \uD544\uB4DC\uB97C \uB354 \uAD6C\uCCB4\uC801\uC774\uACE0 \uC120\uBA85\uD558\uAC8C \uB2E4\uB4EC\uC5B4\uC918" }) }))] }, String(f.key)));
                }) }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: ["\uC790\uB3D9 \uC694\uC57D Preview ", _jsx("span", { className: "text-[10px] text-text-dim", children: "(world.summary \uCE90\uC2DC / \uB85C\uCEEC)" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("label", { className: "flex items-center gap-1 cursor-pointer select-none text-[11px]", children: [_jsx("input", { type: "checkbox", className: "scale-90", checked: autoMode, onChange: e => setAutoMode(e.target.checked) }), " Auto"] }), _jsx("button", { onClick: refreshSummary, className: "text-[10px] px-2 py-1 rounded bg-surfaceAlt border border-border hover:bg-surface focus:outline-none focus:ring-1 focus:ring-primary", children: "\uCE90\uC2DC \uC7AC\uC0DD\uC131" })] })] }), _jsx("div", { className: "border border-border rounded bg-surfaceAlt p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto", children: loadingSummary ? '요약 생성 중...' : (effectiveSummary || '요약이 비어 있습니다. 내용을 입력하면 자동 또는 캐시 불러오기가 표시됩니다.') }), _jsxs("p", { className: "text-[10px] text-text-dim", children: ["\uC785\uB825 \uBCC0\uACBD \uC2DC ", autoMode ? '약 0.7초 후 자동 요약 미리보기(저장 전 임시)' : '자동 요약 비활성화됨', " \u00B7 \uC800\uC7A5 \uC2DC \uBC84\uC804 \uC99D\uAC00 & \uCE90\uC2DC \uBB34\uD6A8\uD654 \u2192 \"\uCE90\uC2DC \uC7AC\uC0DD\uC131\" \uD074\uB9AD \uC2DC worldDerived \uC800\uC7A5."] })] })] }));
};
export default WorldBuilder;
