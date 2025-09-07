export function promptLayerToMessages(layer) {
    const systemChunks = [];
    if (layer.system)
        systemChunks.push(`[GLOBAL]\n${layer.system}`);
    if (layer.bookSystem)
        systemChunks.push(`[BOOK]\n${layer.bookSystem}`);
    if (layer.worldDerived)
        systemChunks.push(`[WORLD]\n${layer.worldDerived}`);
    if (layer.pageSystem)
        systemChunks.push(`[PAGE]\n${layer.pageSystem}`);
    if (layer.dynamicContext?.length) {
        systemChunks.push('[REFERENCES]\n' + layer.dynamicContext.map(r => `${r.ref}: ${r.summary}`).join('\n---\n'));
    }
    const systemContent = systemChunks.join('\n\n');
    const messages = [];
    if (systemContent)
        messages.push({ role: 'system', content: systemContent });
    if (layer.userInstruction)
        messages.push({ role: 'user', content: layer.userInstruction });
    return messages;
}
