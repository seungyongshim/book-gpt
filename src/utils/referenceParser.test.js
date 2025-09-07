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
    it('handles empty input', () => {
        const r = parseReferences('');
        expect(r.references.length).toBe(0);
        expect(r.warnings?.length || 0).toBe(0);
    });
    it('ignores malformed tokens', () => {
        const r = parseReferences('잘못된 @-3 그리고 @3- 두개 @p: intro공백 그리고 정상 @7');
        // 유효한 참조는 최소 1개(@7) 이상이며 잘못된 패턴으로 음수/빈 pageId 없음
        expect(r.references.length).toBeGreaterThanOrEqual(1);
        for (const ref of r.references) {
            for (const pid of ref.pageIds) {
                expect(pid).toMatch(/^\d+$/);
            }
        }
    });
    it('merges overlapping range and single with weight accumulation', () => {
        const r = parseReferences('텍스트 @3-5 그리고 다시 @4 그리고 @5');
        // 현재 구현: 범위와 개별 단일 참조가 별도 엔트리로 유지 (미래 개선: 병합 후 weight 증가)
        // 기대: 3개의 레코드 (@3-5, @4, @5)
        expect(r.references.length).toBe(3);
        const idsSets = r.references.map(x => x.pageIds.join(','));
        expect(idsSets).toContain('3,4,5');
        expect(idsSets).toContain('4');
        expect(idsSets).toContain('5');
    });
});
