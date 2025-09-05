import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldStore } from '../../stores/worldStore';
const WorldBuilder = () => {
    const { bookId } = useParams();
    const { world, load, save, worldDerivedInvalidated } = useWorldStore();
    useEffect(() => { if (bookId)
        load(bookId); }, [bookId, load]);
    return (_jsxs("div", { className: "p-4 space-y-4 max-w-2xl mx-auto", children: [_jsxs("h2", { className: "text-xl font-semibold flex items-center gap-2", children: ["\uC138\uACC4\uAD00 \uC124\uC815 ", worldDerivedInvalidated && _jsx("span", { className: "text-xs bg-warn/20 text-warn px-2 py-0.5 rounded", children: "Modified*" })] }), _jsx("textarea", { className: "w-full h-40 text-sm p-2 rounded-md bg-surfaceAlt border border-border", placeholder: "Premise", defaultValue: world?.premise, onBlur: (e) => bookId && save(bookId, { premise: e.target.value }) }), _jsx("textarea", { className: "w-full h-40 text-sm p-2 rounded-md bg-surfaceAlt border border-border", placeholder: "Style Guide", defaultValue: world?.styleGuide, onBlur: (e) => bookId && save(bookId, { styleGuide: e.target.value }) }), _jsx("p", { className: "text-xs text-text-dim", children: "\uC800\uC7A5 \uC2DC \uBC84\uC804 \uC99D\uAC00 \uBC0F world.summary \uCE90\uC2DC \uBB34\uD6A8\uD654." })] }));
};
export default WorldBuilder;
