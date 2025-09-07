import { generateFromPromptLayer, estimateCompletionTokens } from './gptClient';
export async function generatePage(layer, onChunk, signal, opts) {
    await generateFromPromptLayer(layer, c => onChunk({ text: c.text, done: c.done, ...(c.error ? {} : {}) }), {
        model: opts?.config?.model,
        temperature: opts?.config?.temperature,
        baseUrl: opts?.baseUrl
    }, signal);
}
export { estimateCompletionTokens };
