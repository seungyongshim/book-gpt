export function compressReferences(opts) {
    const { summaries, level } = opts;
    if (level === 'L1') {
        const half = Math.ceil(summaries.length / 2);
        return summaries.map((s, idx) => {
            if (idx >= half) {
                const target = Math.max(80, Math.round(s.summary.length * 0.5));
                const trimmed = s.summary.slice(0, target);
                return { ...s, summary: trimmed + (s.summary.length > target ? '…' : '') };
            }
            return s;
        });
    }
    if (level === 'L3') {
        return summaries.map(s => {
            const cut = s.summary.split(/(?<=\.)\s+/).slice(0, 3).join(' ');
            const target = cut.slice(0, 120);
            return { ...s, summary: target + (cut.length > 120 ? '…' : '') };
        });
    }
    return summaries;
}
export function compressWorldSummary(world, mode) {
    if (!world)
        return world;
    if (mode === 'world-compact') {
        if (world.length <= 820)
            return world;
        const segments = world.split(/\n+/).filter(Boolean);
        let acc = '';
        for (const seg of segments) {
            if ((acc + '\n' + seg).trim().length > 800)
                break;
            acc = acc ? acc + '\n' + seg : seg;
        }
        return acc || world.slice(0, 800);
    }
    if (mode === 'world-bullet') {
        const lines = world.split(/\n+/).filter(Boolean).slice(0, 12);
        return lines.map(l => '- ' + l.replace(/^\[[^\]]+\]\s*/, '').slice(0, 110)).join('\n');
    }
    return world;
}
