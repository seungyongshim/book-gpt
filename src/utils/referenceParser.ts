import { ParsedReference } from '../types/domain';

const REF_REGEX = /@([p]:[a-zA-Z0-9_-]+|\d+(?:-\d+)?)/g; // @3 @3-5 @p:slug

export interface ParseResult {
  cleanedText: string;
  references: ParsedReference[];
}

export function parseReferences(input: string): ParseResult {
  const references: ParsedReference[] = [];
  const map = new Map<string, ParsedReference>();
  let cleaned = input;
  const matches = [...input.matchAll(REF_REGEX)];
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
      if (token.includes('-')) {
        const [s, e] = token.split('-').map(n => parseInt(n, 10));
        const span = [] as string[];
        if (e - s > 50) return { cleanedText: input, references: [] }; // guard too large
        for (let i = s; i <= e; i++) span.push(String(i));
        const pr: ParsedReference = { type: 'page', refRaw, pageIds: span, weight: 1 };
        map.set(refRaw, pr);
        references.push(pr);
      } else {
        const pr: ParsedReference = { type: 'page', refRaw, pageIds: [token], weight: 1 };
        map.set(refRaw, pr);
        references.push(pr);
      }
    }
  }
  // cleanedText: remove raw tokens or keep? Keep but optional - for now keep.
  return { cleanedText: cleaned, references };
}
