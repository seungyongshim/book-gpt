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
 * 추가 개선점:
 * 1) 카테고리 비율 기반 엔트로피(혼합도) 가중치: 한국어+영어 혼합 시 토크나이저 overhead 소폭 증가
 * 2) 긴 ASCII 연속(12+ chars) 보정: 실제로는 더 많이 쪼개지므로 penalty 적용
 * 3) 숫자 + 단위 패턴(\d+%) / (\d+\w) 그룹화: token 폭 감소 효과 반영
 * 4) 연속 구두점/기호(.,!?… 등 2개 이상) 묶음: 1 token 근사
 */
export function estimateTokens(str) {
    if (!str)
        return 0;
    let ascii = 0, digits = 0, cjk = 0, punct = 0;
    // 1-pass category counting
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
    // 기본 비율
    const rAscii = ascii / totalChars;
    const rDigits = digits / totalChars;
    const rCJK = cjk / totalChars;
    const rPunct = punct / totalChars;
    // 카테고리 엔트로피 (최대 log2(4)=2) → 0~1 스케일
    const probs = [rAscii, rDigits, rCJK, rPunct].filter(p => p > 0);
    let entropy = 0;
    for (const p of probs)
        entropy += -p * Math.log2(p);
    const mixFactor = 1 + (entropy / 2) * 0.05; // 최대 +5%
    // 긴 ASCII 단어 penalty (토큰 분절 증가)
    const longAsciiMatches = str.match(/[A-Za-z]{12,}/g) || [];
    let longAsciiPenalty = 0;
    for (const w of longAsciiMatches) {
        // 단어 길이 12 이상: (len / 12)*0.15 토큰 증가 근사 -> 후에 전체 * (1 + penalty)
        longAsciiPenalty += (w.length / 12) * 0.15;
    }
    const longPenaltyFactor = 1 + Math.min(0.12, longAsciiPenalty / 50); // 상한 12%
    // 숫자+단위 패턴 감소 (예: 100km, 25%, 3일) → 숫자 tokenization 효율 향상
    const numberUnitPatterns = (str.match(/\b\d+(?:[%]|[A-Za-zㄱ-ㅎ가-힣]{1,2})\b/g) || []).length;
    const numberUnitDiscount = numberUnitPatterns * 0.05; // 패턴당 0.05 token 감소 근사
    // 연속 구두점 묶음 감소
    const punctBundles = (str.match(/[.,!?…]{2,}/g) || []).length;
    const punctBundleDiscount = punctBundles * 0.04;
    // 기본 카테고리별 토큰 근사
    let asciiTokens = ascii / 4.1; // 약간 상향 (이전 4 → 4.1)으로 안정
    let digitTokens = digits / 3.3;
    let cjkTokens = cjk * 1.05; // 한글/한자 약간 상향
    let punctTokens = punct / 3.05;
    let total = asciiTokens + digitTokens + cjkTokens + punctTokens;
    // Discount 적용 (clip to >=0.5 token)
    total = Math.max(0.5, total - numberUnitDiscount - punctBundleDiscount);
    // 혼합도 / 길이 penalty 적용
    total = total * mixFactor * longPenaltyFactor;
    // 전역 보정 계수
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
// 최근 N회 이동 평균을 settings store 에 저장하기 위한 키
export const TOKEN_CALIBRATION_SETTING_KEY = 'tokenCalibration';
/**
 * 새로운 실제/추정 비율(ratio)을 받아 이동 평균으로 calibrationFactor를 조정.
 * ratio = (실제추정토큰) / (현재추정토큰)
 */
export function applyCalibrationSample(ratio) {
    if (!isFinite(ratio) || ratio <= 0)
        return calibrationFactor;
    // 0.5 ~ 1.5 범위 밖 extreme 은 무시 (이상치)
    if (ratio < 0.5 || ratio > 1.5)
        return calibrationFactor;
    // 느린 이동 평균 (alpha) - 10 샘플 정도 안정화 목표
    const alpha = 0.15;
    calibrationFactor = calibrationFactor * (1 - alpha) + ratio * alpha;
    // safety clamp
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
export function buildChatPromptLayer(p) {
    const system = 'You are a helpful Korean writing assistant. Return only content unless explicitly asked.';
    let userInstruction = p.instruction.trim();
    const dynamicContext = [];
    let pageSystem;
    if (p.mode === 'assist' && p.selectionText) {
        dynamicContext.push({ ref: 'selection', summary: `선택된 텍스트:\n${p.selectionText}` });
    }
    else if (p.mode === 'extend' && p.pageTail) {
        pageSystem = '다음은 최근 본문 끝 부분입니다. 자연스럽게 이어서 작성하세요.';
        dynamicContext.push({ ref: 'tail', summary: p.pageTail });
    }
    else if (p.mode === 'ref' && p.referenceSummaries?.length) {
        for (const r of p.referenceSummaries)
            dynamicContext.push(r);
    }
    return {
        system,
        pageSystem,
        dynamicContext: dynamicContext.length ? dynamicContext : undefined,
        userInstruction: userInstruction
    };
}
// ===== Dynamic target length heuristic =====
// contextLimitTokens: 모델 전체 컨텍스트 한도 (예: 16000)
// reserveTokens: 응답 후반/안전 버퍼 (기본 200~500)
// avgCharsPerToken: 한글 혼합 기준 평균 문자/토큰 (기본 1.2 보수)
export function suggestTargetChars(params) {
    const { contextLimitTokens, promptTokens } = params;
    const reserve = params.reserveTokens ?? 400;
    const avgC = params.avgCharsPerToken ?? 1.2;
    const maxChars = params.maxChars ?? 14000; // 절대 상한 (UX 보호)
    const desired = params.desiredChars ?? 12000;
    const remainingTokens = Math.max(0, contextLimitTokens - promptTokens - reserve);
    const estimatedCharsCapacity = Math.floor(remainingTokens * avgC);
    // 여유가 충분하면 desired, 아니면 capacity 한도
    return Math.min(maxChars, Math.min(desired, estimatedCharsCapacity));
}
// ===== Simple legacy char->token estimation (for UI incremental counters) =====
// Centralizing here so hooks & client share identical logic.
export function simpleCharTokenEstimate(chars, factor = 0.9) {
    if (!chars)
        return 0;
    return Math.round(chars * factor);
}
// Backward compatibility alias (used previously in gptClient / hooks)
export const estimateCompletionTokens = simpleCharTokenEstimate;
