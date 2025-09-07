// Vitest global setup
// Provide indexedDB mock for idb usage in tests
import 'fake-indexeddb/auto';
// Silence debug console noise in tests (optional)
const origLog = console.log;
console.log = (...args) => {
    if (typeof args[0] === 'string' && args[0].startsWith('DEBUG_'))
        return;
    origLog(...args);
};
// Polyfill crypto.randomUUID if absent (jsdom older)
if (!globalThis.crypto?.randomUUID) {
    globalThis.crypto = {
        ...globalThis.crypto,
        randomUUID: () => 'uuid-' + Math.random().toString(16).slice(2)
    };
}
