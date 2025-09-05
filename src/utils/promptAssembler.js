export function assemblePrompt(opts) {
    return {
        system: opts.system,
        bookSystem: opts.bookSystem,
        worldDerived: opts.worldDerived,
        pageSystem: opts.pageSystem,
        dynamicContext: opts.referencedSummaries,
        userInstruction: opts.userInstruction
    };
}
export function estimateTokens(str) {
    if (!str)
        return 0;
    // Rough heuristic: Korean char ~1 token ~ fallback 0.8 multiplier
    return Math.ceil(str.length * 1.0);
}
export function totalPromptTokens(layer) {
    let total = 0;
    total += estimateTokens(layer.system || '');
    total += estimateTokens(layer.bookSystem || '');
    total += estimateTokens(layer.worldDerived || '');
    total += estimateTokens(layer.pageSystem || '');
    if (layer.dynamicContext) {
        for (const d of layer.dynamicContext)
            total += estimateTokens(d.summary);
    }
    total += estimateTokens(layer.userInstruction || '');
    return total;
}
// 간단 문장 기반 축약: 마침표/줄바꿈 단위로 자르며 목표 길이 초과 시 중단
export function simpleSummarize(text, targetChars) {
    if (!text)
        return '';
    if (text.length <= targetChars)
        return text;
    const segments = text
        .replace(/\r/g, '')
        .split(/(?<=\.)\s+|\n+/) // 문장 경계 또는 줄바꿈
        .map(s => s.trim())
        .filter(Boolean);
    let acc = '';
    for (const s of segments) {
        if ((acc + ' ' + s).trim().length > targetChars)
            break;
        acc = acc ? acc + ' ' + s : s;
    }
    // 최소 확보 실패 시 단순 절단
    if (!acc)
        return text.slice(0, targetChars);
    return acc;
}
export function summarizeForReference(raw) {
    if (!raw)
        return '';
    return simpleSummarize(raw, 300);
}
export function summarizeWorld(setting) {
    const parts = [];
    const push = (label, v, cap = 250) => { if (v)
        parts.push(`[${label}] ` + simpleSummarize(v, cap)); };
    push('Premise', setting.premise, 200);
    push('Timeline', setting.timeline, 220);
    push('Geography', setting.geography, 180);
    push('Factions', setting.factions, 220);
    push('Characters', setting.characters, 250);
    push('Magic/Tech', setting.magicOrTech, 160);
    push('Constraints', setting.constraints, 160);
    push('Style', setting.styleGuide, 180);
    const joined = parts.join('\n');
    return joined.length > 1200 ? simpleSummarize(joined, 1200) : joined;
}
