/**
 * Unified GPT common utilities:
 * - Global default config (model, temperature, baseUrl)
 * - Model metadata merging (server list + local overrides)
 * - Token estimation helpers (future: plug calibration factor)
 * - Simple in-memory caches
 */
import { getCachedModels } from './models';
// Local known model overrides (can be expanded later)
const LOCAL_MODEL_HINTS = {
    'gpt-4o-mini': { contextWindow: 16384, recTemp: 0.8, caps: ['stream', 'json'] },
    'gpt-4o': { contextWindow: 128000, recTemp: 0.7, caps: ['stream', 'json', 'vision'] },
    'gpt-4.1-mini': { contextWindow: 32768, recTemp: 0.8, caps: ['stream'] },
    'gpt-4.1': { contextWindow: 128000, recTemp: 0.7, caps: ['stream'] }
};
let cachedModelInfos = null;
let cachedConfig = null;
export function getGPTConfig() {
    if (cachedConfig)
        return cachedConfig;
    const base = import.meta.env?.VITE_OPENAI_BASE_URL || 'http://localhost:4141/v1';
    const defaultModel = import.meta.env?.VITE_DEFAULT_MODEL || 'gpt-4o-mini';
    const defaultTemperature = parseFloat(import.meta.env?.VITE_DEFAULT_TEMPERATURE || '0.8');
    cachedConfig = { baseUrl: base, defaultModel, defaultTemperature };
    return cachedConfig;
}
/** Merge server reported model ids with local hints producing ModelInfo[] */
export async function getModelInfos(opts) {
    if (!opts?.force && cachedModelInfos)
        return cachedModelInfos;
    const serverModels = await getCachedModels({ force: opts?.force, fallback: Object.keys(LOCAL_MODEL_HINTS) });
    const merged = serverModels.map(id => ({ id, label: id, ...(LOCAL_MODEL_HINTS[id] || {}) }));
    // Ensure local hints not present from server are appended (rare offline case)
    for (const id of Object.keys(LOCAL_MODEL_HINTS)) {
        if (!merged.find(m => m.id === id))
            merged.push({ id, label: id, ...(LOCAL_MODEL_HINTS[id] || {}) });
    }
    // stable sort by id
    merged.sort((a, b) => a.id.localeCompare(b.id));
    cachedModelInfos = merged;
    return merged;
}
export function clearModelInfosCache() { cachedModelInfos = null; }
// Naive char->token with optional calibration factor support in future
let calibrationFactor = 0.9; // default as previously used
export function setCalibrationFactor(f) { calibrationFactor = Math.min(1.3, Math.max(0.7, f)); }
export function estimateTokensFromChars(chars) { return Math.round(chars * calibrationFactor); }
/** Rough token estimation given prompt layer raw string lengths. */
export function estimatePromptTokens(parts) {
    const sys = parts.system ? parts.system.length : 0;
    const book = parts.bookSystem ? parts.bookSystem.length : 0;
    const world = parts.worldDerived ? parts.worldDerived.length : 0;
    const page = parts.pageSystem ? parts.pageSystem.length : 0;
    const refs = parts.dynamicContext?.reduce((a, c) => a + c.summary.length, 0) || 0;
    const instr = parts.userInstruction ? parts.userInstruction.length : 0;
    const totalChars = sys + book + world + page + refs + instr;
    const total = estimateTokensFromChars(totalChars);
    return { system: estimateTokensFromChars(sys), book: estimateTokensFromChars(book), world: estimateTokensFromChars(world), page: estimateTokensFromChars(page), refs: estimateTokensFromChars(refs), instruction: estimateTokensFromChars(instr), total };
}
export function getModelInfo(id) { return cachedModelInfos?.find(m => m.id === id); }
