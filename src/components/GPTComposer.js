import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from 'react';
import useGPTStream from '../hooks/useGPTStream';
import { useModels } from '../stores/modelsStore';
/**
 * Reusable GPT generation panel (instruction + streaming output + apply) for any domain context.
 */
export const GPTComposer = ({ seed, buildPrompt, onApply, applyLabel = '적용', compact, readOnlyInstruction, title = 'AI Composer', autoStart, initialInstruction = '', allowAbort = true, showTokenApprox = false, defaultModel = 'gpt-4o-mini', modelOptions = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'], defaultTemperature = 0.8, showTemperature = true, onConfigChange, chatMode = false, chatSystem, initialMessages = [], onMessagesChange, chatApplyStrategy = 'last', chatInputPlaceholder = '메시지를 입력하고 Enter를 눌러 전송' }) => {
    const { models, modelInfos, loading: modelsLoading, error: modelsError, fetch: fetchModels, refresh: refreshModels } = useModels();
    const [model, setModel] = useState(defaultModel);
    const [temperature, setTemperature] = useState(defaultTemperature);
    const userOverrodeTempRef = useRef(false);
    const gpt = useGPTStream({ model, temperature, directMessages: chatMode });
    const [instruction, setInstruction] = useState(initialInstruction);
    const [started, setStarted] = useState(false);
    // Chat state
    const [messages, setMessages] = useState(() => initialMessages.map(m => ({ ...m })));
    const [chatInput, setChatInput] = useState('');
    const prevRunningRef = useRef(false);
    // propagate messages externally
    useEffect(() => { if (chatMode)
        onMessagesChange?.(messages); }, [messages, chatMode, onMessagesChange]);
    const start = useCallback(() => {
        if (chatMode)
            return; // in chat mode we don't use single-instruction start
        const prompt = buildPrompt(instruction, seed);
        gpt.start(prompt);
        setStarted(true);
    }, [instruction, seed, buildPrompt, gpt, chatMode]);
    // Chat: send user message and start assistant streaming
    const sendChat = useCallback(() => {
        if (!chatMode)
            return;
        const content = chatInput.trim();
        if (!content)
            return;
        const newUser = { role: 'user', content };
        const nextMessages = [...messages, newUser];
        setMessages(nextMessages);
        setChatInput('');
        // Build full history with optional system
        const full = chatSystem ? [{ role: 'system', content: chatSystem }, ...nextMessages] : nextMessages;
        gpt.start(full);
    }, [chatMode, chatInput, messages, gpt, chatSystem]);
    // Detect completion of streaming in chat mode to commit assistant message
    useEffect(() => {
        if (!chatMode)
            return;
        const prev = prevRunningRef.current;
        if (prev && !gpt.running) {
            // finished
            if (gpt.text) {
                setMessages(prevMsgs => [...prevMsgs, { role: 'assistant', content: gpt.text }]);
            }
        }
        prevRunningRef.current = gpt.running;
    }, [gpt.running, gpt.text, chatMode]);
    // Emit config changes upward if requested
    useEffect(() => { onConfigChange?.({ model, temperature }); }, [model, temperature, onConfigChange]);
    // When model changes, if user hasn't manually overridden temp, adopt model recommended temp
    useEffect(() => {
        const info = modelInfos.find(m => m.id === model);
        if (info && info.recTemp != null && !userOverrodeTempRef.current) {
            setTemperature(info.recTemp);
        }
    }, [model, modelInfos]);
    useEffect(() => { if (autoStart && !started)
        start(); }, [autoStart, started, start]);
    // Load models on mount (only once per app due to store caching)
    useEffect(() => { if (!models.length && !modelsLoading)
        fetchModels(); }, [models.length, modelsLoading, fetchModels]);
    // Choose dynamic list if available; fallback to provided modelOptions prop
    const dynamicModelList = models.length ? models : modelOptions;
    // Ensure current selected model stays in list
    useEffect(() => {
        if (!dynamicModelList.includes(model) && dynamicModelList.length) {
            setModel(dynamicModelList[0]);
        }
    }, [dynamicModelList, model]);
    const disabled = gpt.running || modelsLoading;
    const baseCls = compact ? 'text-[11px]' : 'text-sm';
    return (_jsxs("div", { className: `border border-border rounded-md bg-surfaceAlt flex flex-col ${compact ? 'p-2 gap-2' : 'p-3 gap-3'}`, children: [_jsx("div", { className: "flex items-start justify-between gap-2", children: _jsxs("div", { className: "flex flex-col gap-1 flex-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: `font-semibold ${compact ? 'text-xs' : 'text-sm'}`, children: title }), _jsxs("div", { className: "flex items-center gap-2", children: [showTokenApprox && _jsxs("span", { className: "text-[10px] text-text-dim", children: ["~", gpt.tokensApprox, "tok"] }), gpt.running && allowAbort && _jsx("button", { onClick: gpt.abort, className: "text-[10px] px-2 py-0.5 rounded bg-warn/20 text-warn", children: "\uC911\uB2E8" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [dynamicModelList?.length ? (_jsxs("label", { className: "flex items-center gap-1 text-[10px]", children: [_jsx("span", { className: "text-text-dim", children: "Model" }), _jsx("select", { className: "bg-surface border border-border rounded px-1 py-0.5 text-[10px]", value: model, onChange: e => setModel(e.target.value), disabled: gpt.running || modelsLoading, title: (() => { const info = modelInfos.find(mi => mi.id === model); return info ? `${info.id}\nctx: ${info.contextWindow || '?'} tokens${info.recTemp != null ? `\nrecTemp: ${info.recTemp}` : ''}` : model; })(), children: dynamicModelList.map(m => {
                                                const info = modelInfos.find(mi => mi.id === m);
                                                const label = info?.label || m;
                                                return _jsx("option", { value: m, children: label }, m);
                                            }) }), modelsLoading && _jsx("span", { className: "text-[9px] text-text-dim animate-pulse", children: "\uB85C\uB529..." }), modelsError && _jsx("button", { type: "button", className: "text-[9px] text-error underline", onClick: () => refreshModels(), children: "\uC7AC\uC2DC\uB3C4" }), !modelsLoading && !modelsError && _jsx("button", { type: "button", className: "text-[9px] text-text-dim hover:text-text", onClick: () => refreshModels(), children: "\uAC31\uC2E0" })] })) : null, showTemperature && (_jsxs("label", { className: "flex items-center gap-1 text-[10px]", children: [_jsx("span", { className: "text-text-dim", children: "Temp" }), _jsx("input", { type: "range", min: 0, max: 2, step: 0.05, value: temperature, onChange: e => { userOverrodeTempRef.current = true; setTemperature(parseFloat(e.target.value)); }, disabled: gpt.running }), _jsx("input", { type: "number", className: "w-14 bg-surface border border-border rounded px-1 py-0.5", min: 0, max: 2, step: 0.05, value: temperature, onChange: e => {
                                                const v = parseFloat(e.target.value);
                                                if (!isNaN(v)) {
                                                    userOverrodeTempRef.current = true;
                                                    setTemperature(Math.min(2, Math.max(0, v)));
                                                }
                                            }, disabled: gpt.running })] }))] })] }) }), !chatMode && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("textarea", { className: `w-full resize-y rounded bg-surface border border-border p-2 outline-none focus:ring-1 focus:ring-primary ${baseCls}`, rows: compact ? 3 : 4, placeholder: "AI\uC5D0 \uC904 \uC9C0\uC2DC\uB97C \uC785\uB825\uD558\uC138\uC694", value: instruction, onChange: e => setInstruction(e.target.value), readOnly: readOnlyInstruction }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { disabled: disabled || !instruction.trim(), onClick: start, className: "px-3 py-1 rounded bg-primary text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed", children: gpt.running ? '생성중...' : '생성' }), _jsx("button", { disabled: !gpt.text, onClick: () => onApply(gpt.text.trim()), className: "px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40", children: applyLabel }), _jsx("button", { disabled: !gpt.text && !instruction, onClick: () => { gpt.reset(); setInstruction(initialInstruction); setStarted(false); }, className: "px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40", children: "\uCD08\uAE30\uD654" })] })] }), _jsx("div", { className: `min-h-[80px] max-h-64 overflow-auto whitespace-pre-wrap rounded bg-surface p-2 border border-border ${compact ? 'text-[11px]' : 'text-xs'}`, children: gpt.text || (gpt.running ? '생성 중...' : '결과가 여기에 표시됩니다.') })] })), chatMode && (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: `flex flex-col gap-2 border border-border rounded p-2 bg-surface min-h-[160px] max-h-80 overflow-auto ${compact ? 'text-[11px]' : 'text-xs'}`, "aria-label": "chat transcript", children: [messages.length === 0 && !gpt.running && _jsx("div", { className: "text-text-dim text-[11px]", children: "\uB300\uD654\uB97C \uC2DC\uC791\uD574 \uBCF4\uC138\uC694." }), messages.map((m, idx) => (_jsx("div", { className: `flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `rounded px-2 py-1 max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-white' : 'bg-surfaceAlt border border-border text-text'}`, children: [m.role === 'assistant' && _jsx("span", { className: "sr-only", children: "Assistant: " }), m.content] }) }, idx))), gpt.running && (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: "rounded px-2 py-1 max-w-[85%] bg-surfaceAlt border border-border whitespace-pre-wrap animate-pulse", children: gpt.text || '...' }) }))] }), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx("textarea", { className: `flex-1 resize-none rounded bg-surface border border-border p-2 outline-none focus:ring-1 focus:ring-primary ${baseCls}`, rows: compact ? 2 : 3, placeholder: chatInputPlaceholder, value: chatInput, onChange: e => setChatInput(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!gpt.running)
                                        sendChat();
                                } }, disabled: gpt.running }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("button", { onClick: sendChat, disabled: gpt.running || !chatInput.trim(), className: "px-3 py-1 rounded bg-primary text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed", children: gpt.running ? '...' : '전송' }), _jsx("button", { onClick: () => { gpt.reset(); setMessages(initialMessages); setChatInput(''); }, disabled: gpt.running || (messages.length === 0), className: "px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40", children: "\uCD08\uAE30\uD654" }), _jsx("button", { onClick: () => {
                                            const assistants = messages.filter(m => m.role === 'assistant');
                                            if (!assistants.length)
                                                return;
                                            const textToApply = chatApplyStrategy === 'allAssistantMerged'
                                                ? assistants.map(a => a.content).join('\n')
                                                : assistants[assistants.length - 1].content;
                                            onApply(textToApply.trim());
                                        }, disabled: messages.every(m => m.role !== 'assistant'), className: "px-3 py-1 rounded bg-surface border border-border text-xs disabled:opacity-40", children: applyLabel })] })] })] })), gpt.error && _jsxs("div", { className: "text-error text-[11px]", children: ["\uC5D0\uB7EC: ", gpt.error] })] }));
};
export default GPTComposer;
