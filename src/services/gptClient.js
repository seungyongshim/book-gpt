import { promptLayerToMessages } from '../utils/promptToMessages';
const DEFAULT_MODEL = 'gpt-4o-mini';
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
export async function streamChat(input, onEvent, opts) {
    const base = opts?.baseUrl || import.meta.env?.VITE_OPENAI_BASE_URL || 'http://localhost:4141/v1';
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
            const cat = classifyError(res.status, bodyJson);
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
