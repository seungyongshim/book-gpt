import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchModels, getCachedModels, clearModelCache } from './models';
// Helper to mock global fetch
function mockFetchOnce(data, ok = true) {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok,
        json: async () => data
    });
}
describe('models service', () => {
    beforeEach(() => {
        clearModelCache();
        globalThis.fetch = vi.fn();
    });
    it('parses model ids from data array', async () => {
        mockFetchOnce({ data: [{ id: 'a' }, { id: 'b' }] });
        const res = await fetchModels('http://x');
        expect(res.models).toEqual(['a', 'b']);
    });
    it('deduplicates and sorts ids', async () => {
        mockFetchOnce({ data: [{ id: 'c' }, { id: 'a' }, { id: 'c' }] });
        const res = await fetchModels('http://x');
        expect(res.models).toEqual(['a', 'c']);
    });
    it('returns empty on malformed response', async () => {
        mockFetchOnce({ foo: 1 });
        const res = await fetchModels('http://x');
        expect(res.models).toEqual([]);
    });
    it('cached fetch returns same list until ttl', async () => {
        mockFetchOnce({ data: [{ id: 'm1' }] });
        const first = await getCachedModels({ baseUrl: 'http://x', ttlMs: 10000 });
        expect(first).toEqual(['m1']);
        // second call should not invoke fetch again
        const second = await getCachedModels({ baseUrl: 'http://x', ttlMs: 10000 });
        expect(second).toEqual(['m1']);
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
    it('force refresh bypasses cache', async () => {
        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'm1' }] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'm2' }] }) });
        const first = await getCachedModels({ baseUrl: 'http://x', ttlMs: 10000 });
        expect(first).toEqual(['m1']);
        const refreshed = await getCachedModels({ baseUrl: 'http://x', force: true });
        expect(refreshed).toEqual(['m2']);
        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
});
