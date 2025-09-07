// Service to fetch available models from OpenAI-compatible endpoint
// Expected endpoint: GET /v1/models returning shape { data: [{ id: string, ... }] }
// We only extract unique string ids, filter out duplicates, and sort (stable alphabetical).
export async function fetchModels(baseUrl, signal) {
    const base = baseUrl || import.meta.env?.VITE_OPENAI_BASE_URL || 'http://localhost:4141/v1';
    const url = base.replace(/\/$/, '') + '/models';
    let res;
    try {
        res = await fetch(url, { signal });
    }
    catch (e) {
        // Network-level failure → return empty list (caller can show retry)
        return { models: [] };
    }
    if (!res.ok) {
        return { models: [] };
    }
    let json;
    try {
        json = await res.json();
    }
    catch {
        return { models: [] };
    }
    const data = Array.isArray(json?.data) ? json.data : [];
    const ids = [];
    for (const item of data) {
        const id = item?.id;
        if (typeof id === 'string' && id.trim())
            ids.push(id.trim());
    }
    // de-dup & sort
    const uniq = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
    return { models: uniq, raw: json };
}
// Simple in-memory cache with optional TTL handling (default 5 minutes)
let cache = null;
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
export async function getCachedModels(opts) {
    const ttl = opts?.ttlMs ?? DEFAULT_TTL;
    const now = Date.now();
    if (!opts?.force && cache && (now - cache.ts) < ttl) {
        return cache.models;
    }
    const { models } = await fetchModels(opts?.baseUrl, opts?.signal);
    if (models.length) {
        cache = { ts: now, models };
        return models;
    }
    // fallback if provided or previously cached
    if (cache)
        return cache.models;
    return opts?.fallback || [];
}
export function clearModelCache() { cache = null; }
