export function assemblePrompt(opts) {
    return {
        system: opts.system,
        bookSystem: opts.bookSystem,
        worldDerived: opts.worldDerived,
        pageSystem: opts.pageSystem,
        dynamicContext: opts.referencedSummaries,
        userInstruction: opts.userInstruction
    };
}
export function estimateTokens(str) {
    if (!str)
        return 0;
    // Rough heuristic: Korean char ~1 token ~ fallback 0.8 multiplier
    return Math.ceil(str.length * 1.0);
}
export function totalPromptTokens(layer) {
    let total = 0;
    total += estimateTokens(layer.system || '');
    total += estimateTokens(layer.bookSystem || '');
    total += estimateTokens(layer.worldDerived || '');
    total += estimateTokens(layer.pageSystem || '');
    if (layer.dynamicContext) {
        for (const d of layer.dynamicContext)
            total += estimateTokens(d.summary);
    }
    total += estimateTokens(layer.userInstruction || '');
    return total;
}
