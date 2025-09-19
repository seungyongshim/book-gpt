import { describe, it, expect } from 'vitest';
import { accumulateToolCalls, finalizeToolCalls } from '../toolCallAccumulator';

describe('toolCallAccumulator', () => {
  it('accumulates fragments and assigns synthetic id then replaces', () => {
    let acc: any[] = [];
    // first delta without id
    acc = accumulateToolCalls(acc, [{ index: 0, function: { name: 'get_current_time', arguments: '{"' } } as any], 0);
    expect(acc[0].id).toMatch(/pending_0_0/);
    expect(acc[0].args).toBe('{"');
    // second fragment with id and remaining arguments
    acc = accumulateToolCalls(acc, [{ index: 0, id: 'call_abc', function: { arguments: '}' } } as any], 0);
    expect(acc[0].id).toBe('call_abc');
    expect(acc[0]._placeholder).toBeFalsy();
    expect(acc[0].args).toBe('{"}');
  });

  it('finalize fills missing ids', () => {
    let acc: any[] = [];
    acc = accumulateToolCalls(acc, [{ index: 1, function: { name: 'echo', arguments: '{"text":' } } as any], 1);
    acc = accumulateToolCalls(acc, [{ index: 1, function: { arguments: '"hi"}' } } as any], 1);
    // still placeholder
    expect(acc[0]._placeholder).toBeTruthy();
    acc = finalizeToolCalls(acc, 1);
    expect(acc[0].id).toMatch(/pending_/);
  });
});
