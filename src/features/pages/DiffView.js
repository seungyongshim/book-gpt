import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { usePagesStore } from '../../stores/pagesStore';
function segmentize(text, granularity) {
    if (!text)
        return [];
    switch (granularity) {
        case 'sentence':
            return text
                .replace(/\r/g, '')
                .split(/(?<=[.!?。！？])\s+|\n+/)
                .map(s => s.trim())
                .filter(Boolean);
        case 'paragraph':
            return text
                .replace(/\r/g, '')
                .split(/\n{2,}/)
                .map(p => p.trim())
                .filter(Boolean);
        default:
            return text.split(/\s+/).filter(Boolean);
    }
}
function genericDiff(a, b, granularity) {
    if (a === b)
        return [{ type: 'eq', text: a }];
    const aSeg = segmentize(a, granularity);
    const bSeg = segmentize(b, granularity);
    const dp = Array(aSeg.length + 1).fill(0).map(() => Array(bSeg.length + 1).fill(0));
    for (let i = 1; i <= aSeg.length; i++) {
        for (let j = 1; j <= bSeg.length; j++) {
            if (aSeg[i - 1] === bSeg[j - 1])
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const segments = [];
    let i = aSeg.length, j = bSeg.length;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && aSeg[i - 1] === bSeg[j - 1]) {
            segments.unshift({ type: 'eq', text: aSeg[i - 1] });
            i--;
            j--;
        }
        else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            segments.unshift({ type: 'add', text: bSeg[j - 1] });
            j--;
        }
        else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            segments.unshift({ type: 'del', text: aSeg[i - 1] });
            i--;
        }
        else
            break;
    }
    // merge same type
    const merged = [];
    for (const s of segments) {
        const last = merged[merged.length - 1];
        if (last && last.type === s.type)
            last.text += (granularity === 'word' ? ' ' : '\n') + s.text;
        else
            merged.push({ ...s });
    }
    return merged;
}
function simpleWordDiff(a, b) {
    if (a === b)
        return [{ type: 'eq', text: a }];
    const aWords = a.split(/\s+/);
    const bWords = b.split(/\s+/);
    // LCS dynamic programming (small scale)
    const dp = Array(aWords.length + 1).fill(0).map(() => Array(bWords.length + 1).fill(0));
    for (let i = 1; i <= aWords.length; i++) {
        for (let j = 1; j <= bWords.length; j++) {
            if (aWords[i - 1] === bWords[j - 1])
                dp[i][j] = dp[i - 1][j - 1] + 1;
            else
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const segments = [];
    let i = aWords.length, j = bWords.length;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && aWords[i - 1] === bWords[j - 1]) {
            segments.unshift({ type: 'eq', text: aWords[i - 1] });
            i--;
            j--;
        }
        else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            segments.unshift({ type: 'add', text: bWords[j - 1] });
            j--;
        }
        else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            segments.unshift({ type: 'del', text: aWords[i - 1] });
            i--;
        }
        else
            break;
    }
    // merge consecutive same-type
    const merged = [];
    for (const s of segments) {
        const last = merged[merged.length - 1];
        if (last && last.type === s.type)
            last.text += ' ' + s.text;
        else
            merged.push({ ...s });
    }
    return merged;
}
const DiffView = () => {
    const { bookId, pageIndex, versionId } = useParams();
    const navigate = useNavigate();
    const { pages, load, getVersion, listVersions } = usePagesStore();
    const location = useLocation();
    const compareId = useMemo(() => {
        const sp = new URLSearchParams(location.search);
        return sp.get('compare');
    }, [location.search]);
    const page = pages.find(p => p.bookId === bookId && p.index === Number(pageIndex));
    const [targetText, setTargetText] = useState('');
    const [prevText, setPrevText] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => { if (bookId)
        load(bookId); }, [bookId, load]);
    useEffect(() => {
        (async () => {
            if (!page || !versionId) {
                setLoading(false);
                return;
            }
            const primary = await getVersion(versionId);
            if (!primary) {
                setLoading(false);
                return;
            }
            setTargetText(primary.contentSnapshot);
            if (compareId) {
                const other = await getVersion(compareId);
                setPrevText(other ? other.contentSnapshot : '');
            }
            else {
                const vs = await listVersions(page.id);
                const idx = vs.findIndex((x) => x.id === primary.id);
                const prev = vs[idx + 1];
                setPrevText(prev ? prev.contentSnapshot : '');
            }
            setLoading(false);
        })();
    }, [page, versionId, getVersion, listVersions]);
    const [granularity, setGranularity] = useState('word');
    const [collapseUnchanged, setCollapseUnchanged] = useState(true);
    const diffSegments = useMemo(() => {
        if (granularity === 'word')
            return simpleWordDiff(prevText, targetText);
        return genericDiff(prevText, targetText, granularity);
    }, [prevText, targetText, granularity]);
    // Collapse logic: group eq blocks > threshold
    const THRESHOLD_HIDE_UNCHANGED = granularity === 'word' ? 80 : granularity === 'sentence' ? 6 : 2;
    const processed = useMemo(() => {
        if (!collapseUnchanged)
            return diffSegments.map(d => ({ ...d, hidden: false }));
        const out = [];
        for (const s of diffSegments) {
            if (s.type === 'eq' && s.text.split(/\s+/).length > THRESHOLD_HIDE_UNCHANGED) {
                out.push({ ...s, hidden: true });
            }
            else
                out.push(s);
        }
        return out;
    }, [diffSegments, collapseUnchanged, granularity]);
    const toggleSegment = useCallback((idx) => {
        const seg = processed[idx];
        if (!seg || seg.type !== 'eq' || !seg.hidden)
            return;
        seg.hidden = false; // mutate local derived copy (safe re-render trigger below)
    }, [processed]);
    const added = targetText.length - prevText.length;
    return (_jsxs("div", { className: "p-4 space-y-4", children: [_jsxs("header", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => navigate(`/books/${bookId}/pages/${pageIndex}/versions`), className: "text-sm text-primary", children: "\u2190 \uD0C0\uC784\uB77C\uC778" }), _jsxs("h2", { className: "text-xl font-semibold", children: ["Diff #", pageIndex] }), compareId && _jsx("span", { className: "text-xs text-text-dim", children: "(\uCEE4\uC2A4\uD140 \uBE44\uAD50)" })] }), loading && _jsx("p", { className: "text-sm text-text-dim", children: "\uB85C\uB529..." }), _jsxs("div", { className: "flex gap-3 text-xs items-center flex-wrap", children: [_jsxs("label", { className: "flex items-center gap-1", children: ["Granularity:", _jsxs("select", { value: granularity, onChange: e => setGranularity(e.target.value), className: "border border-border bg-surfaceAlt rounded px-1 py-0.5", children: [_jsx("option", { value: "word", children: "\uB2E8\uC5B4" }), _jsx("option", { value: "sentence", children: "\uBB38\uC7A5" }), _jsx("option", { value: "paragraph", children: "\uBB38\uB2E8" })] })] }), _jsxs("label", { className: "flex items-center gap-1", children: [_jsx("input", { type: "checkbox", checked: collapseUnchanged, onChange: e => setCollapseUnchanged(e.target.checked) }), " \uAE34 \uB3D9\uC77C \uAD6C\uAC04 \uC811\uAE30"] })] }), !loading && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "text-xs text-text-dim", children: ["length(prev \u2192 curr): ", prevText.length, " \u2192 ", targetText.length, " (\u0394 ", added >= 0 ? '+' : '', added, ")"] }), _jsx("div", { className: "text-xs border border-border rounded p-3 bg-surfaceAlt leading-relaxed space-y-1", children: processed.map((s, i) => {
                            if (s.hidden)
                                return (_jsx("div", { className: "my-1", children: _jsxs("button", { onClick: () => { s.hidden = false; /* force update via state flip */ /* force update via state flip */ setCollapseUnchanged(c => c); }, className: "text-[10px] px-1 py-0.5 bg-surface border border-border rounded hover:bg-surfaceAlt", children: ["\u2026 ", granularity === 'word' ? s.text.split(/\s+/).length + 'w' : granularity === 'sentence' ? s.text.split(/\n/).length + 's' : 'block', " \uB3D9\uC77C \uAD6C\uAC04 \uD3BC\uCE58\uAE30"] }) }, i));
                            return (_jsxs("span", { className: s.type === 'add' ? 'bg-green-500/20 text-green-600' : s.type === 'del' ? 'bg-red-500/10 text-red-600 line-through' : '', children: [s.text, granularity === 'word' ? ' ' : '\n'] }, i));
                        }) }), _jsx(Link, { to: `/books/${bookId}/pages/${pageIndex}`, className: "text-xs text-primary underline", children: "\uC5D0\uB514\uD130\uB85C" })] }))] }));
};
export default DiffView;
