import { describe, it, expect, beforeEach } from 'vitest';
import { executeTool, getRegisteredTools, formatToolResultForAssistant, initializeMcpSamplingTools } from '../toolService';
// fake-indexeddb 제공
import 'fake-indexeddb/auto';

describe('MCP Sampling Tools', () => {
  beforeEach(async () => {
    // Initialize with MCP sampling tools
    await initializeMcpSamplingTools();
  });

  it('should register MCP sampling tools', async () => {
    const tools = await getRegisteredTools();
    const toolNames = tools.map(t => (t as any).function?.name);
    
    expect(toolNames).toContain('mcp_text_sampling');
    expect(toolNames).toContain('mcp_token_analysis');
    expect(toolNames).toContain('mcp_sampling_strategies');
    expect(toolNames).toContain('mcp_context_sampling');
    
    // Check that we have at least the 4 MCP tools
    const mcpTools = tools.filter(t => (t as any).function?.name?.startsWith('mcp_'));
    expect(mcpTools.length).toBeGreaterThanOrEqual(4);
  });

  describe('mcp_text_sampling', () => {
    it('should perform basic text sampling', async () => {
      const args = JSON.stringify({
        prompt: '안녕하세요. 오늘 날씨는 어때요?',
        temperature: 0.7,
        max_tokens: 50
      });
      
      const result = await executeTool('mcp_text_sampling', args);
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result.sampled_text).toBeDefined();
      expect(result.result.sampling_info).toBeDefined();
      expect(result.result.sampling_info.parameters.temperature).toBe(0.7);
      expect(result.result.sampling_info.parameters.max_tokens).toBe(50);
      expect(result.result.input_prompt).toBe('안녕하세요. 오늘 날씨는 어때요?');
    });

    it('should validate temperature parameter', async () => {
      const args = JSON.stringify({
        prompt: '테스트',
        temperature: 3.0 // Invalid temperature
      });
      
      const result = await executeTool('mcp_text_sampling', args);
      
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/temperature/);
    });

    it('should validate top_p parameter', async () => {
      const args = JSON.stringify({
        prompt: '테스트',
        top_p: 1.5 // Invalid top_p
      });
      
      const result = await executeTool('mcp_text_sampling', args);
      
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/top_p/);
    });

    it('should require prompt parameter', async () => {
      const args = JSON.stringify({
        temperature: 0.7
        // Missing prompt
      });
      
      const result = await executeTool('mcp_text_sampling', args);
      
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/prompt/);
    });
  });

  describe('mcp_token_analysis', () => {
    it('should analyze text tokens', async () => {
      const args = JSON.stringify({
        text: '안녕하세요. 이것은 토큰 분석 테스트입니다.',
        include_probabilities: true,
        tokenizer: 'gpt-4'
      });
      
      const result = await executeTool('mcp_token_analysis', args);
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result.tokens).toBeDefined();
      expect(Array.isArray(result.result.tokens)).toBe(true);
      expect(result.result.token_count).toBeGreaterThan(0);
      expect(result.result.character_count).toBeGreaterThan(0);
      expect(result.result.tokenizer_used).toBe('gpt-4');
      expect(result.result.token_probabilities).toBeDefined();
    });

    it('should work without probabilities', async () => {
      const args = JSON.stringify({
        text: '간단한 텍스트',
        include_probabilities: false
      });
      
      const result = await executeTool('mcp_token_analysis', args);
      
      expect(result.error).toBeUndefined();
      expect(result.result.tokens).toBeDefined();
      expect(result.result.token_probabilities).toBeUndefined();
    });

    it('should require text parameter', async () => {
      const args = JSON.stringify({
        include_probabilities: true
        // Missing text
      });
      
      const result = await executeTool('mcp_token_analysis', args);
      
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/text/);
    });
  });

  describe('mcp_sampling_strategies', () => {
    it('should compare sampling strategies', async () => {
      const args = JSON.stringify({
        prompt: '오늘 점심 메뉴 추천해주세요.',
        strategies: ['greedy', 'nucleus', 'temperature'],
        num_samples: 2
      });
      
      const result = await executeTool('mcp_sampling_strategies', args);
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result.strategies_compared).toEqual(['greedy', 'nucleus', 'temperature']);
      expect(result.result.results).toBeDefined();
      expect(result.result.results.greedy).toBeDefined();
      expect(result.result.results.nucleus).toBeDefined();
      expect(result.result.results.temperature).toBeDefined();
      expect(result.result.comparison_summary).toBeDefined();
      expect(result.result.recommendation).toBeDefined();
      
      // Check each strategy has correct number of samples
      expect(result.result.results.greedy.samples).toHaveLength(2);
      expect(result.result.results.nucleus.samples).toHaveLength(2);
      expect(result.result.results.temperature.samples).toHaveLength(2);
    });

    it('should use default parameters', async () => {
      const args = JSON.stringify({
        prompt: '기본 설정 테스트'
      });
      
      const result = await executeTool('mcp_sampling_strategies', args);
      
      expect(result.error).toBeUndefined();
      expect(result.result.strategies_compared).toEqual(['greedy', 'nucleus', 'temperature']);
      expect(Object.keys(result.result.results)).toHaveLength(3);
    });

    it('should require prompt parameter', async () => {
      const args = JSON.stringify({
        strategies: ['greedy']
        // Missing prompt
      });
      
      const result = await executeTool('mcp_sampling_strategies', args);
      
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/prompt/);
    });
  });

  describe('mcp_context_sampling', () => {
    it('should perform context-based sampling', async () => {
      const args = JSON.stringify({
        context: '오늘은 비가 오고 있습니다. 기온은 18도이고 습도가 높습니다. 우산을 챙기는 것이 좋겠습니다.',
        query: '오늘 날씨는 어때요?',
        context_window: 1000,
        focus_mode: 'balanced'
      });
      
      const result = await executeTool('mcp_context_sampling', args);
      
      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result.response).toBeDefined();
      expect(result.result.context_analysis).toBeDefined();
      expect(result.result.relevance_analysis).toBeDefined();
      expect(result.result.sampling_config).toBeDefined();
      expect(result.result.sampling_config.focus_mode).toBe('balanced');
      
      // Check relevance analysis
      expect(result.result.relevance_analysis.relevance_score).toBeDefined();
      expect(result.result.relevance_analysis.common_terms).toBeDefined();
    });

    it('should handle different focus modes', async () => {
      const baseArgs = {
        context: '테스트 컨텍스트입니다.',
        query: '테스트 질문입니다.'
      };
      
      const focusModes = ['precise', 'creative', 'balanced'];
      
      for (const mode of focusModes) {
        const args = JSON.stringify({ ...baseArgs, focus_mode: mode });
        const result = await executeTool('mcp_context_sampling', args);
        
        expect(result.error).toBeUndefined();
        expect(result.result.sampling_config.focus_mode).toBe(mode);
        expect(result.result.sampling_config.parameters).toBeDefined();
      }
    });

    it('should require context and query parameters', async () => {
      const args = JSON.stringify({
        context: '컨텍스트만 있음'
        // Missing query
      });
      
      const result = await executeTool('mcp_context_sampling', args);
      
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/query/);
    });

    it('should handle long context with truncation', async () => {
      const longContext = '긴 컨텍스트입니다. '.repeat(1000); // Very long context
      const args = JSON.stringify({
        context: longContext,
        query: '요약해주세요.',
        context_window: 100 // Small window
      });
      
      const result = await executeTool('mcp_context_sampling', args);
      
      expect(result.error).toBeUndefined();
      expect(result.result.context_analysis.original_length).toBeGreaterThan(result.result.context_analysis.truncated_length);
      expect(result.result.context_analysis.window_utilization).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Tool result formatting', () => {
    it('should format MCP tool results correctly', async () => {
      const args = JSON.stringify({
        prompt: '테스트 프롬프트'
      });
      
      const result = await executeTool('mcp_text_sampling', args);
      const formatted = formatToolResultForAssistant('mcp_text_sampling', 'call_1', result);
      
      expect(typeof formatted).toBe('string');
      // Should be JSON string since result is an object
      expect(() => JSON.parse(formatted)).not.toThrow();
    });
  });
});