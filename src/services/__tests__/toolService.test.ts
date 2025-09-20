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
    expect(names).toContain('story');
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

  it('should execute story tool', async () => {
    const storyline = '이것은 테스트용 줄거리입니다. ' + '가'.repeat(1950); // ~2000 characters
    const args = JSON.stringify({ storyline });
    const result = await executeTool('story', args);
    expect(result.result).toBe('ok');
    const formatted = formatToolResultForAssistant('story', 'call_1', result);
    expect(formatted).toBe('ok');
  });
});
