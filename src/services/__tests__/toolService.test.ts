import { describe, it, expect, beforeEach } from 'vitest';
import { executeTool, getRegisteredTools, formatToolResultForAssistant } from '../toolService';
import { StorageService } from '../storageService';
import { StoredTool } from '../types';

// Mock test tools for testing
const testTools: StoredTool[] = [
  {
    id: 'test-get-time',
    name: 'get_current_time',
    description: '현재 UTC 시간을 ISO 문자열로 반환합니다.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    executeCode: 'return new Date().toISOString();',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-echo',
    name: 'echo',
    description: 'text 필드를 그대로 반환합니다.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: '반환할 문자열' }
      },
      required: ['text']
    },
    executeCode: `
if (!args || typeof args.text !== 'string' || args.text.length === 0) {
  return 'Invalid: expected non-empty string field "text"';
}
return args.text;
    `.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'test-story',
    name: 'story',
    description: '줄거리를 작성합니다. 약 2000자 정도의 이야기 줄거리를 입력받습니다.',
    parameters: {
      type: 'object',
      properties: {
        storyline: { type: 'string', description: '이야기의 줄거리 (약 2000자)' }
      },
      required: ['storyline']
    },
    executeCode: 'return "ok";',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 간단한 단위 테스트: 등록된 도구, 실행 결과, 에러 처리

describe('toolService', () => {
  beforeEach(async () => {
    // Setup test tools for each test
    await StorageService.saveTools(testTools);
  });

  it('should expose at least two registered tools', async () => {
    const tools = await getRegisteredTools();
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
