import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { streamChat, generateFromPromptLayer, classifyGPTError, estimateCompletionTokens } from './gptClient';
import type { PromptLayer } from '../types/domain';

// Helper to create a mock ReadableStream in node test env
function mockSSEChunks(chunks: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    }
  });
}

describe('gptClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('streams delta events and done', async () => {
    const pl: PromptLayer = { system: 'S', userInstruction: 'Hello' };
    const sse = [
      'data: {"choices":[{"delta":{"content":"안"}}]}\n',
      'data: {"choices":[{"delta":{"content":"녕"}}]}\n',
      'data: [DONE]\n'
    ];
    (global.fetch as any).mockResolvedValue({ ok: true, body: mockSSEChunks(sse) });
    const received: string[] = [];
    await streamChat(pl, ev => { if (ev.delta) received.push(ev.delta); if (ev.done) received.push('[DONE]'); });
    expect(received).toEqual(['안','녕','[DONE]']);
  });

  it('generateFromPromptLayer wraps stream events', async () => {
    const pl: PromptLayer = { userInstruction: 'Test' };
    const sse = [
      'data: {"choices":[{"delta":{"content":"A"}}]}\n',
      'data: [DONE]\n'
    ];
    (global.fetch as any).mockResolvedValue({ ok: true, body: mockSSEChunks(sse) });
    const out: string[] = [];
  await generateFromPromptLayer(pl, c => { out.push(c.text || ''); if (c.done) out.push('[END]'); });
  expect(out).toEqual(['A', '', '[END]']); // ensure done event captured
  });

  it('classifies HTTP error', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { type: 'rate_limit' } }) });
    const pl: PromptLayer = { userInstruction: 'X' };
    let error: string | null = null;
    await streamChat(pl, ev => { if (ev.error) error = ev.error; });
    expect(error).toBe('rate-limit');
  });

  it('estimateCompletionTokens matches simple factor', () => {
    expect(estimateCompletionTokens(1000)).toBe(900);
  });

  afterAll(() => { global.fetch = originalFetch; });
});
