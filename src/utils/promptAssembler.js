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
/**
 * Improved heuristic token estimator.
 * Strategy:
 * - ASCII letters/digits: ~4 chars per token (englishWordsChars / 4)
 * - CJK (가-힣, 一-龥, etc.) & Hangul syllables: ~1 char per token
 * - Whitespace: ignored (already counted in splits)
 * - Punctuation / symbols: grouped ~3 per token
 * A small safety multiplier (calibrationFactor) allows runtime adjustment (future calibration pipeline).
 */
let calibrationFactor = 1.0; // future: adapt via moving average vs actual usage
export function setTokenCalibrationFactor(f) { calibrationFactor = f > 0 ? f : calibrationFactor; }
/**
 * Advanced mixed-language heuristic.
 * 1) Category entropy mix factor (max +5%)
 * 2) Long ASCII run penalty
 * 3) Number+unit pattern discount
 * 4) Punctuation bundle discount
 */
export function estimateTokens(str) {
    if (!str)
        return 0;
    let ascii = 0, digits = 0, cjk = 0, punct = 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (/[A-Za-z]/.test(ch))
            ascii++;
        else if (/[0-9]/.test(ch))
            digits++;
        else if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF\u3400-\u4DBF]/.test(ch))
            cjk++;
        else if (/\s/.test(ch)) { /* ignore spaces */ }
        else
            punct++;
    }
    const totalChars = ascii + digits + cjk + punct || 1;
    const rAscii = ascii / totalChars;
    const rDigits = digits / totalChars;
    const rCJK = cjk / totalChars;
    const rPunct = punct / totalChars;
    const probs = [rAscii, rDigits, rCJK, rPunct].filter(p => p > 0);
    let entropy = 0;
    for (const p of probs)
        entropy += -p * Math.log2(p);
    const mixFactor = 1 + (entropy / 2) * 0.05; // <= +5%
    const longAsciiMatches = str.match(/[A-Za-z]{12,}/g) || [];
    let longAsciiPenalty = 0;
    for (const w of longAsciiMatches) {
        longAsciiPenalty += (w.length / 12) * 0.15;
    }
    const longPenaltyFactor = 1 + Math.min(0.12, longAsciiPenalty / 50);
    const numberUnitPatterns = (str.match(/\b\d+(?:[%]|[A-Za-zㄱ-ㅎ가-힣]{1,2})\b/g) || []).length;
    const numberUnitDiscount = numberUnitPatterns * 0.05;
    const punctBundles = (str.match(/[.,!?…]{2,}/g) || []).length;
    const punctBundleDiscount = punctBundles * 0.04;
    let asciiTokens = ascii / 4.1;
    let digitTokens = digits / 3.3;
    let cjkTokens = cjk * 1.05;
    let punctTokens = punct / 3.05;
    let total = asciiTokens + digitTokens + cjkTokens + punctTokens;
    total = Math.max(0.5, total - numberUnitDiscount - punctBundleDiscount);
    total = total * mixFactor * longPenaltyFactor;
    total = total * calibrationFactor;
    return Math.max(1, Math.ceil(total));
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
// ===== Calibration helpers (adaptive) =====
export const TOKEN_CALIBRATION_SETTING_KEY = 'tokenCalibration';
export function applyCalibrationSample(ratio) {
    if (!isFinite(ratio) || ratio <= 0)
        return calibrationFactor;
    if (ratio < 0.5 || ratio > 1.5)
        return calibrationFactor; // outlier guard
    const alpha = 0.15;
    calibrationFactor = calibrationFactor * (1 - alpha) + ratio * alpha;
    calibrationFactor = Math.min(1.3, Math.max(0.7, calibrationFactor));
    return calibrationFactor;
}
export function getCalibrationFactor() { return calibrationFactor; }
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
