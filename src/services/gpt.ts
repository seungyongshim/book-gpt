/**
 * Deprecated shim – use generateFromPromptLayer / streamChat from gptClient.ts instead.
 * 남겨진 이유: 기존 import 경로 호환.
 */
import { PromptLayer, StreamChunk } from '../types/domain';
import { generateFromPromptLayer, estimateCompletionTokens } from './gptClient';

export interface GenerateOptionsShim { config?: { model?: string; temperature?: number; targetChars?: number }; baseUrl?: string; }

export async function generatePage(layer: PromptLayer, onChunk: (c: StreamChunk) => void, signal?: AbortSignal, opts?: GenerateOptionsShim) {
  await generateFromPromptLayer(layer, c => onChunk({ text: c.text, done: c.done, ...(c.error ? {} : {}) }), {
    model: opts?.config?.model,
    temperature: opts?.config?.temperature,
    baseUrl: opts?.baseUrl
  }, signal);
}

export { estimateCompletionTokens };
