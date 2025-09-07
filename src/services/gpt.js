import { promptLayerToMessages } from '../utils/promptToMessages';
import { streamChat } from './gptClient';
const DEFAULT_CONFIG = {
    model: 'gpt-4o-mini',
    temperature: 0.8,
    targetChars: 12000
};
// PromptLayer -> OpenAI Chat messages 변환
const buildMessages = promptLayerToMessages;
function classifyError(status, body) {
    if (!status)
        return 'network-error';
    if (status === 401)
        return 'auth';
    if (status === 429)
        return 'rate-limit';
    if (status >= 500)
        return 'server';
    return body?.error?.type || 'unknown';
}
// Backwards compatible API using generic streamChat
export async function generatePage(layer, onChunk, signal, opts) {
    const cfg = { ...DEFAULT_CONFIG, ...(opts?.config || {}) };
    await streamChat(layer, ev => {
        if (ev.delta)
            onChunk({ text: ev.delta });
        if (ev.error && !ev.delta)
            onChunk({ text: `\n[ERROR:${ev.error}]`, done: true });
        if (ev.done)
            onChunk({ text: ev.error ? '' : '', done: true });
    }, { baseUrl: opts?.baseUrl, model: cfg.model, temperature: cfg.temperature, signal });
}
export function estimateCompletionTokens(targetChars) {
    // 한글 평균 0.7~1.2 토큰 → 보수 계수 0.9
    return Math.round(targetChars * 0.9);
}
