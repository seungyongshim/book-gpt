// Vitest global setup
// Provide indexedDB mock for idb usage in tests
import 'fake-indexeddb/auto';

// Silence debug console noise in tests (optional)
const origLog = console.log;
console.log = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('DEBUG_')) return;
  origLog(...args);
};

// Polyfill crypto.randomUUID if absent (jsdom older)
if (!(globalThis as any).crypto?.randomUUID) {
  (globalThis as any).crypto = {
    ...(globalThis as any).crypto,
    randomUUID: () => 'uuid-' + Math.random().toString(16).slice(2)
  };
}
