// 패턴: @3, @3-5, @p:slug (후처리로 불완전 토큰 필터)
const REF_REGEX = /@([p]:[a-zA-Z0-9_-]+|\d+(?:-\d+)?)/g;

/**
 * JS 동등 구현: TypeScript 버전(parseReferences.ts)와 동기화
 * @param {string} input
 * @param {object} [opts]
 * @param {number} [opts.selfPageIndex] - 자기 자신 단일 참조 제거
 * @param {number} [opts.maxTotalPageRefs] - 누적 pageIds 상한 (기본 15)
 */
export function parseReferences(input, opts = {}) {
    const references = [];
    const map = new Map();
    const warnings = [];
    const maxTotal = opts.maxTotalPageRefs ?? 15;
    const matches = [...input.matchAll(REF_REGEX)];
    for (const m of matches) {
        const raw = m[0];
        const token = raw.substring(1); // remove @
        const refRaw = raw;
        if (map.has(refRaw)) {
            const pr = map.get(refRaw);
            pr.weight += 1;
            continue;
        }
        if (token.startsWith('p:')) {
            const pr = { type: 'page', refRaw, pageIds: [], weight: 1 };
            map.set(refRaw, pr);
            references.push(pr);
            continue;
        }
        if (!/^\d+(?:-\d+)?$/.test(token)) continue;
        if (token.endsWith('-') || token.startsWith('-')) continue; // 불완전 패턴
        if (token.includes('-')) {
            const [s, e] = token.split('-').map(n => parseInt(n, 10));
            if (e - s > 50) { warnings.push(`참조 범위가 너무 큽니다: @${token}`); continue; }
            const span = [];
            for (let i = s; i <= e; i++) span.push(String(i));
            const pr = { type: 'page', refRaw, pageIds: span, weight: 1 };
            map.set(refRaw, pr);
            references.push(pr);
        } else {
            const pageId = token;
            if (typeof opts.selfPageIndex === 'number' && Number(pageId) === opts.selfPageIndex) {
                // 자기 자신 단일 참조 스킵
                continue;
            }
            let merged = false;
            for (const existing of references) {
                if (existing.pageIds && existing.pageIds.includes(pageId)) {
                    existing.weight += 1;
                    merged = true;
                    break;
                }
            }
            if (!merged) {
                const pr = { type: 'page', refRaw, pageIds: [pageId], weight: 1 };
                map.set(refRaw, pr);
                references.push(pr);
            }
        }
    }
    // 총 누적 pageId 수 제한 적용 (순서 유지하면서 슬라이스)
    let totalIds = 0;
    for (const r of references) totalIds += (r.pageIds?.length || 0);
    let truncated = false;
    if (totalIds > maxTotal) {
        truncated = true;
        warnings.push(`참조 페이지 수가 ${maxTotal}개를 초과하여 일부가 제외되었습니다.`);
        let remaining = maxTotal;
        for (const ref of references) {
            const len = ref.pageIds?.length || 0;
            if (!len) continue;
            if (remaining <= 0) { ref.pageIds = []; continue; }
            if (len <= remaining) {
                remaining -= len;
            } else {
                ref.pageIds = ref.pageIds.slice(0, remaining);
                remaining = 0;
            }
        }
    }
    return { cleanedText: input, references, warnings, truncated };
}
