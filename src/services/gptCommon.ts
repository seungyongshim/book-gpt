/**
 * Unified GPT common utilities:
 * - Global default config (model, temperature, baseUrl)
 * - Model metadata merging (server list + local overrides)
 * - Token estimation helpers (future: plug calibration factor)
 * - Simple in-memory caches
 */
import { getCachedModels, fetchModels } from './models';

export interface GPTConfig {
  baseUrl: string;
  defaultModel: string;
  defaultTemperature: number;
}

export interface ModelInfo {
  id: string;
  /** Optional human label */
  label?: string;
  /** Approximate max context tokens */
  contextWindow?: number;
  /** Recommended temperature default */
  recTemp?: number;
  /** Capabilities flags (stream, vision, json, etc.) */
  caps?: string[];
  /** Arbitrary extra meta */
  meta?: Record<string, any>;
}

// Local known model overrides (can be expanded later)
const LOCAL_MODEL_HINTS: Record<string, Partial<ModelInfo>> = {
  'gpt-4o-mini': { contextWindow: 16384, recTemp: 0.8, caps: ['stream','json'] },
  'gpt-4o': { contextWindow: 128000, recTemp: 0.7, caps: ['stream','json','vision'] },
  'gpt-4.1-mini': { contextWindow: 32768, recTemp: 0.8, caps: ['stream'] },
  'gpt-4.1': { contextWindow: 128000, recTemp: 0.7, caps: ['stream'] }
};

let cachedModelInfos: ModelInfo[] | null = null;
let cachedConfig: GPTConfig | null = null;

export function getGPTConfig(): GPTConfig {
  if (cachedConfig) return cachedConfig;
  const base = (import.meta as any).env?.VITE_OPENAI_BASE_URL || 'http://localhost:4141/v1';
  const defaultModel = (import.meta as any).env?.VITE_DEFAULT_MODEL || 'gpt-4o-mini';
  const defaultTemperature = parseFloat((import.meta as any).env?.VITE_DEFAULT_TEMPERATURE || '0.8');
  cachedConfig = { baseUrl: base, defaultModel, defaultTemperature };
  return cachedConfig;
}

/** Merge server reported model ids with local hints producing ModelInfo[] */
export async function getModelInfos(opts?: { force?: boolean }): Promise<ModelInfo[]> {
  if (!opts?.force && cachedModelInfos) return cachedModelInfos;
  const serverModels = await getCachedModels({ force: opts?.force, fallback: Object.keys(LOCAL_MODEL_HINTS) });
  const merged: ModelInfo[] = serverModels.map(id => ({ id, label: id, ...(LOCAL_MODEL_HINTS[id] || {}) }));
  // Ensure local hints not present from server are appended (rare offline case)
  for (const id of Object.keys(LOCAL_MODEL_HINTS)) {
    if (!merged.find(m=>m.id===id)) merged.push({ id, label: id, ...(LOCAL_MODEL_HINTS[id] || {}) });
  }
  // stable sort by id
  merged.sort((a,b)=> a.id.localeCompare(b.id));
  cachedModelInfos = merged;
  return merged;
}

export function clearModelInfosCache() { cachedModelInfos = null; }

// Naive char->token with optional calibration factor support in future
let calibrationFactor = 0.9; // default as previously used
export function setCalibrationFactor(f: number) { calibrationFactor = Math.min(1.3, Math.max(0.7, f)); }
export function estimateTokensFromChars(chars: number) { return Math.round(chars * calibrationFactor); }

export interface TokenBudgetBreakdown {
  system: number; book: number; world: number; page: number; refs: number; instruction: number; total: number;
}

/** Rough token estimation given prompt layer raw string lengths. */
export function estimatePromptTokens(parts: { system?: string; bookSystem?: string; worldDerived?: string; pageSystem?: string; dynamicContext?: { summary: string }[]; userInstruction?: string }): TokenBudgetBreakdown {
  const sys = parts.system ? parts.system.length : 0;
  const book = parts.bookSystem ? parts.bookSystem.length : 0;
  const world = parts.worldDerived ? parts.worldDerived.length : 0;
  const page = parts.pageSystem ? parts.pageSystem.length : 0;
  const refs = parts.dynamicContext?.reduce((a,c)=> a + c.summary.length, 0) || 0;
  const instr = parts.userInstruction ? parts.userInstruction.length : 0;
  const totalChars = sys + book + world + page + refs + instr;
  const total = estimateTokensFromChars(totalChars);
  return { system: estimateTokensFromChars(sys), book: estimateTokensFromChars(book), world: estimateTokensFromChars(world), page: estimateTokensFromChars(page), refs: estimateTokensFromChars(refs), instruction: estimateTokensFromChars(instr), total };
}

export function getModelInfo(id: string): ModelInfo | undefined { return cachedModelInfos?.find(m=>m.id===id); }
