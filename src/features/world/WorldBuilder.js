import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldStore } from '../../stores/worldStore';
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
    const handleBlur = (key, value) => {
        if (!bookId)
            return;
        save(bookId, { [key]: value });
    };
    return (_jsxs("div", { className: "p-4 space-y-6 max-w-3xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "text-xl font-semibold flex items-center gap-2", children: ["\uC138\uACC4\uAD00 \uC124\uC815 ", worldDerivedInvalidated && _jsx("span", { className: "text-xs bg-warn/20 text-warn px-2 py-0.5 rounded", children: "Modified*" })] }), _jsx("button", { onClick: refreshSummary, className: "text-xs px-2 py-1 rounded bg-surfaceAlt border border-border hover:bg-surface focus:outline-none focus:ring-1 focus:ring-primary", children: "\uC694\uC57D \uC0C8\uB85C\uACE0\uCE68" })] }), _jsx("div", { className: "grid gap-5", children: fields.map(f => {
                    const val = world?.[f.key] || '';
                    return (_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium text-text-dim block", children: f.label }), _jsx("textarea", { className: "w-full text-sm p-2 rounded-md bg-surfaceAlt border border-border resize-y", style: { minHeight: '120px' }, placeholder: f.placeholder, defaultValue: val, onBlur: e => handleBlur(f.key, e.target.value) })] }, String(f.key)));
                }) }), _jsxs("div", { className: "space-y-2", children: [_jsxs("h3", { className: "text-sm font-semibold flex items-center gap-2", children: ["\uC790\uB3D9 \uC694\uC57D Preview ", _jsx("span", { className: "text-[10px] text-text-dim", children: "(world.summary \uCE90\uC2DC)" })] }), _jsx("div", { className: "border border-border rounded bg-surfaceAlt p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto", children: loadingSummary ? '요약 생성 중...' : (summary || '요약이 비어 있습니다. 내용을 입력 후 새로고침을 눌러 생성하세요.') }), _jsx("p", { className: "text-[10px] text-text-dim", children: "\uC800\uC7A5 \uC2DC \uBC84\uC804\uC774 \uC99D\uAC00\uD558\uACE0 \uCE90\uC2DC\uAC00 \uBB34\uD6A8\uD654\uB429\uB2C8\uB2E4. \uC0C8 \uC694\uC57D\uC744 \uBC18\uC601\uD558\uB824\uBA74 \uC0C8\uB85C\uACE0\uCE68\uC744 \uB20C\uB7EC \uC8FC\uC138\uC694." })] })] }));
};
export default WorldBuilder;
