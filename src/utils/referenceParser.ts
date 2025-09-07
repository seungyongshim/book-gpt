import { ParsedReference } from '../types/domain';

// 패턴: @3, @3-5, @p:slug (후처리로 불완전 토큰 필터)
const REF_REGEX = /@([p]:[a-zA-Z0-9_-]+|\d+(?:-\d+)?)/g;

export interface ParseResult {
  cleanedText: string;
  references: ParsedReference[];
  warnings?: string[];
}

export function parseReferences(input: string): ParseResult {
  const references: ParsedReference[] = [];
  const map = new Map<string, ParsedReference>();
  let cleaned = input;
  const warnings: string[] = [];
  const matches = [...input.matchAll(REF_REGEX)];
  if (input.includes('@3-5')) {
    // Debug instrumentation for test
    // eslint-disable-next-line no-console
    console.log('DEBUG_MATCHES', matches.map(m => m[0]));
  }
  for (const m of matches) {
    const raw = m[0];
    const token = raw.substring(1); // remove @
    let refRaw = raw;
    if (map.has(refRaw)) {
      const pr = map.get(refRaw)!;
      pr.weight += 1;
      continue;
    }
    if (token.startsWith('p:')) {
      // slug reference - MVP pageIds unknown until resolved
      const pr: ParsedReference = { type: 'page', refRaw, pageIds: [], weight: 1 };
      map.set(refRaw, pr);
      references.push(pr);
    } else if (/^\d+(?:-\d+)?$/.test(token)) {
      // 시작 또는 끝이 하이픈으로 끝나는 불완전 패턴 제외 (@3- 또는 @-3)
      if (token.endsWith('-') || token.startsWith('-')) {
        continue;
      }
      if (token.includes('-')) {
        const [s, e] = token.split('-').map(n => parseInt(n, 10));
        const span = [] as string[];
        if (e - s > 50) {
          warnings.push(`참조 범위가 너무 큽니다: @${token}`);
          continue;
        }
        for (let i = s; i <= e; i++) span.push(String(i));
        const pr: ParsedReference = { type: 'page', refRaw, pageIds: span, weight: 1 };
        map.set(refRaw, pr);
        references.push(pr);
      } else {
        // 단일 페이지. 기존 범위 참조와 겹치면 해당 범위 weight 증가
        const pageId = token;
        let merged = false;
        for (const existing of references) {
          if (existing.pageIds && existing.pageIds.includes(pageId)) {
            existing.weight += 1;
            merged = true;
            break;
          }
        }
        if (!merged) {
          const pr: ParsedReference = { type: 'page', refRaw, pageIds: [token], weight: 1 };
          map.set(refRaw, pr);
          references.push(pr);
        }
      }
    }
  }
  if (input.includes('@3-5')) {
    // eslint-disable-next-line no-console
    console.log('DEBUG_REFS', references.map(r => ({ raw: r.refRaw, ids: r.pageIds, weight: r.weight })));
  }
  // cleanedText: remove raw tokens or keep? Keep but optional - for now keep.
  return { cleanedText: cleaned, references, warnings };
}
