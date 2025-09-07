import { describe, it, expect } from 'vitest';
import { parseReferences } from './referenceParser';
describe('referenceParser', () => {
    it('parses single numeric reference', () => {
        const r = parseReferences('이것은 테스트 @3 문장');
        expect(r.references.length).toBe(1);
        expect(r.references[0].pageIds).toEqual(['3']);
    });
    it('parses range reference', () => {
        const r = parseReferences('범위 테스트 @2-4 입니다');
        expect(r.references[0].pageIds).toEqual(['2', '3', '4']);
    });
    it('warns on oversized range', () => {
        const r = parseReferences('@1-70 너무 넓은 범위');
        expect(r.warnings?.length).toBe(1);
    });
    it('deduplicates and increments weight', () => {
        const r = parseReferences('중복 @5 그리고 또 @5');
        expect(r.references.length).toBe(1);
        expect(r.references[0].weight).toBe(2);
    });
    it('parses slug reference', () => {
        const r = parseReferences('슬러그 @p:intro 예시');
        expect(r.references[0].refRaw).toBe('@p:intro');
    });
});
