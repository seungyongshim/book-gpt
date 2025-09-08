import { useCallback, useRef, useState } from 'react';
import { createChatStream } from '../services/gptClient';
import { estimateCompletionTokens } from '../utils/promptAssembler';
import { useChatStore } from '../stores/chatStore';
// Use shared estimation helper (legacy char->token heuristic)
function estimateTokensFromChars(chars) { return estimateCompletionTokens(chars); }
export function useGPTStream(cfg) {
    const [text, setText] = useState('');
    const [running, setRunning] = useState(false);
    const [error, setError] = useState(null);
    const [tokensApprox, setTokensApprox] = useState(0);
    const controllerRef = useRef(null);
    const abort = useCallback(() => {
        controllerRef.current?.abort();
        setRunning(false);
        // global state 반영
        try {
            useChatStore.getState().setStreamRunning(false);
            useChatStore.getState().setAbortHandler(undefined);
        }
        catch { }
    }, []);
    const reset = useCallback(() => {
        setText('');
        setError(null);
        setTokensApprox(0);
        setRunning(false);
    }, []);
    const start = useCallback((input) => {
        if (running)
            return; // ignore parallel
        setText('');
        setError(null);
        setTokensApprox(0);
        setRunning(true);
        try {
            useChatStore.getState().setStreamRunning(true);
            useChatStore.getState().setAbortHandler(() => abort);
        }
        catch { }
        controllerRef.current = createChatStream(input, (ev) => {
            if (ev.delta) {
                setText(prev => { const next = prev + ev.delta; setTokensApprox(estimateTokensFromChars(next.length)); return next; });
            }
            if (ev.error && !ev.delta) {
                setError(ev.error);
            }
            if (ev.done) {
                setRunning(false);
                try {
                    useChatStore.getState().setStreamRunning(false);
                    useChatStore.getState().setAbortHandler(undefined);
                }
                catch { }
            }
        }, { model: cfg?.model, temperature: cfg?.temperature, baseUrl: cfg?.baseUrl, apiKey: cfg?.apiKey, directMessages: cfg?.directMessages });
    }, [cfg, running]);
    return { text, running, error, start, abort, reset, tokensApprox };
}
export default useGPTStream;
