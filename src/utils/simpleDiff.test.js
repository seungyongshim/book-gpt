import { describe, it, expect } from 'vitest';
import { diffWords } from './simpleDiff';
describe('simpleDiff', () => {
    it('returns single token when identical', () => {
        const r = diffWords('hello world', 'hello world');
        expect(r.length).toBe(1);
        expect(r[0].value).toContain('hello');
    });
    it('detects addition', () => {
        const r = diffWords('a b', 'a b c');
        expect(r.some(t => t.added && t.value === 'c')).toBe(true);
    });
    it('detects deletion', () => {
        const r = diffWords('a b c', 'a b');
        expect(r.some(t => t.removed && t.value === 'c')).toBe(true);
    });
    it('handles substitution (add+remove)', () => {
        const r = diffWords('a X c', 'a Y c');
        const removedX = r.find(t => t.removed && t.value === 'X');
        const addedY = r.find(t => t.added && t.value === 'Y');
        expect(removedX).toBeTruthy();
        expect(addedY).toBeTruthy();
    });
    it('handles empty original', () => {
        const r = diffWords('', 'new text');
        expect(r.every(t => t.added)).toBe(true);
    });
});
