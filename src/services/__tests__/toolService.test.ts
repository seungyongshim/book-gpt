import { describe, it, expect } from 'vitest';
import { executeTool, getRegisteredTools, formatToolResultForAssistant } from '../toolService';

// 간단한 단위 테스트: 등록된 도구, 실행 결과, 에러 처리

describe('toolService', () => {
  it('should expose at least two registered tools', () => {
    const tools = getRegisteredTools();
    expect(tools.length).toBeGreaterThanOrEqual(2);
  const names = tools.map(t => (t as any).function?.name);
    expect(names).toContain('get_current_time');
    expect(names).toContain('echo');
  });

  it('should execute echo tool', async () => {
    const args = JSON.stringify({ text: 'hello' });
    const result = await executeTool('echo', args);
    expect(result.result).toBe('hello');
    const formatted = formatToolResultForAssistant('echo', 'call_1', result);
    expect(formatted).toBe('hello');
  });

  it('should handle invalid args for echo', async () => {
    const result = await executeTool('echo', JSON.stringify({ wrong: 1 }));
    expect(result.result).toMatch(/Invalid/);
  });

  it('should return error for unknown tool', async () => {
    const result = await executeTool('unknown_tool', '{}');
    expect(result.error).toMatch(/Unknown tool/);
  });
});
