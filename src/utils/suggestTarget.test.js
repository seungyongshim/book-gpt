import { describe, it, expect } from 'vitest';
import { suggestTargetChars } from './promptAssembler';
describe('suggestTargetChars', () => {
    it('returns desired when capacity sufficient', () => {
        const v = suggestTargetChars({ contextLimitTokens: 16000, promptTokens: 2000, desiredChars: 12000 });
        expect(v).toBe(12000);
    });
    it('caps at estimated capacity when insufficient', () => {
        const v = suggestTargetChars({ contextLimitTokens: 8000, promptTokens: 4000, desiredChars: 12000, avgCharsPerToken: 1.0, reserveTokens: 400 });
        // remaining = 8000-4000-400=3600 tokens; chars=3600
        expect(v).toBe(3600);
    });
    it('does not exceed maxChars', () => {
        const v = suggestTargetChars({ contextLimitTokens: 200000, promptTokens: 1000, desiredChars: 20000, maxChars: 15000 });
        expect(v).toBe(15000);
    });
});
