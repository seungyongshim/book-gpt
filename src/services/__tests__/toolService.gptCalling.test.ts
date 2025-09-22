import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeTool, setChatServiceInstance } from '../toolService';
import { StorageService } from '../storageService';
import { StoredTool } from '../types';

// Setup fake IndexedDB for testing
import 'fake-indexeddb/auto';

// Mock chat service for testing
const mockChatService = {
  getResponseStreaming: vi.fn()
};

// Mock test tool that uses GPT calling
const gptCallingTool: StoredTool = {
  id: 'test-gpt-caller',
  name: 'gpt_summarizer',
  description: 'Summarizes text using GPT',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to summarize' }
    },
    required: ['text']
  },
  executeCode: `
const messages = [
  { role: 'system', text: 'You are a helpful assistant that summarizes text concisely.' },
  { role: 'user', text: 'Please summarize this text: ' + args.text }
];

const result = await callGPT({
  messages: messages,
  model: 'gpt-4o',
  temperature: 0.3
});

return 'Summary: ' + result.content;
  `.trim(),
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('GPT calling from tools', () => {
  beforeEach(async () => {
    // Setup mock chat service
    mockChatService.getResponseStreaming.mockClear();
    
    // Mock the streaming response
    const mockStream = (async function* () {
      yield 'This is a concise summary of the provided text.';
    })();
    
    mockChatService.getResponseStreaming.mockReturnValue(mockStream);
    
    // Set the mock chat service
    setChatServiceInstance(mockChatService);
    
    // Setup test tool
    await StorageService.saveTools([gptCallingTool]);
  });

  it('should allow tools to call GPT', async () => {
    const args = JSON.stringify({ text: 'This is a very long text that needs to be summarized by GPT. It contains multiple sentences and ideas that should be condensed into a shorter format.' });
    
    const result = await executeTool('gpt_summarizer', args);
    
    expect(result.error).toBeUndefined();
    expect(result.result).toContain('Summary:');
    expect(result.result).toContain('This is a concise summary');
    
    // Verify that the chat service was called with correct parameters
    expect(mockChatService.getResponseStreaming).toHaveBeenCalledTimes(1);
    
    const [messages, model, temperature] = mockChatService.getResponseStreaming.mock.calls[0];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].text).toContain('Please summarize this text:');
    expect(model).toBe('gpt-4o');
    expect(temperature).toBe(0.3);
  });

  it('should handle GPT call errors gracefully', async () => {
    // Mock an error in the chat service
    mockChatService.getResponseStreaming.mockImplementation(() => {
      throw new Error('API rate limit exceeded');
    });

    const args = JSON.stringify({ text: 'Some text to summarize' });
    
    const result = await executeTool('gpt_summarizer', args);
    
    expect(result.error).toBeDefined();
    expect(result.error).toContain('GPT call failed');
    expect(result.error).toContain('API rate limit exceeded');
    expect(result.result).toBeNull();
  });

  it('should handle tools that use callGPT without ChatService initialized', async () => {
    // Reset chat service to null
    setChatServiceInstance(null);
    
    const args = JSON.stringify({ text: 'Some text' });
    
    const result = await executeTool('gpt_summarizer', args);
    
    expect(result.error).toBeDefined();
    expect(result.error).toContain('ChatService not available');
    expect(result.result).toBeNull();
  });
});