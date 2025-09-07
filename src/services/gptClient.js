import { getGPTConfig } from './gptCommon';
import { promptLayerToMessages } from '../utils/promptToMessages';
import { estimateCompletionTokens as simpleCharTokenEstimate } from '../utils/promptAssembler';
const { defaultModel: DEFAULT_MODEL, baseUrl: DEFAULT_BASE_URL } = getGPTConfig();
export function classifyGPTError(status, body) {
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
export async function streamChat(input, onEvent, opts) {
    const base = opts?.baseUrl || DEFAULT_BASE_URL;
    const apiKey = opts?.apiKey || import.meta.env?.VITE_OPENAI_API_KEY;
    const url = base.replace(/\/$/, '') + '/chat/completions';
    const messages = Array.isArray(input) && opts?.directMessages
        ? input
        : promptLayerToMessages(input);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
            },
            body: JSON.stringify({
                model: opts?.model || DEFAULT_MODEL,
                temperature: opts?.temperature ?? 0.8,
                stream: true,
                messages
            }),
            signal: opts?.signal
        });
        if (!res.ok || !res.body) {
            let bodyJson = undefined;
            try {
                bodyJson = await res.json();
            }
            catch { /* noop */ }
            const cat = classifyGPTError(res.status, bodyJson);
            onEvent({ done: true, error: cat });
            return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            if (opts?.signal?.aborted)
                return; // abort silently
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\n/);
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:'))
                    continue;
                const data = trimmed.slice(5).trim();
                if (data === '[DONE]') {
                    onEvent({ done: true });
                    return;
                }
                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (content)
                        onEvent({ delta: content, raw: json });
                }
                catch { /* ignore */ }
            }
        }
        onEvent({ done: true });
    }
    catch (e) {
        if (opts?.signal?.aborted) {
            onEvent({ done: true, error: 'aborted' });
        }
        else {
            onEvent({ done: true, error: e?.message || 'unknown' });
        }
    }
}
export function createChatStream(input, onEvent, opts) {
    const controller = new AbortController();
    streamChat(input, onEvent, { ...opts, signal: controller.signal });
    return {
        abort: () => controller.abort()
    };
}
export async function generateFromPromptLayer(layer, onChunk, opts, signal) {
    await streamChat(layer, ev => {
        if (ev.delta)
            onChunk({ text: ev.delta });
        if (ev.error && !ev.delta)
            onChunk({ text: `\n[ERROR:${ev.error}]`, error: ev.error, done: true });
        if (ev.done)
            onChunk({ text: '', done: true });
    }, { model: opts?.model, temperature: opts?.temperature, baseUrl: opts?.baseUrl, apiKey: opts?.apiKey, signal });
}
// Simple completion token estimate (legacy helper) kept for compatibility
export const estimateCompletionTokens = simpleCharTokenEstimate;
