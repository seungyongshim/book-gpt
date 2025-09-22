import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeTool, setChatServiceInstance } from '../toolService';
import { StorageService } from '../storageService';
import { StoredTool } from '../types';

// Setup fake IndexedDB for testing
import 'fake-indexeddb/auto';

// Mock chat service for testing translation functionality
const mockChatService = {
  getResponseStreaming: vi.fn()
};

// Test the translation tool specifically
const translationTool: StoredTool = {
  id: 'test-translator',
  name: 'translate_text',
  description: '텍스트를 다른 언어로 번역합니다. GPT를 사용하여 정확한 번역을 제공합니다.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '번역할 텍스트' },
      target_language: { type: 'string', description: '대상 언어 (예: English, 한국어, 日本語, Français)' }
    },
    required: ['text', 'target_language']
  },
  executeCode: `
const messages = [
  { role: 'system', text: 'You are a professional translator. Provide accurate and natural translations.' },
  { role: 'user', text: \`Translate the following text to \${args.target_language}: "\${args.text}"\` }
];

const result = await callGPT({
  messages: messages,
  model: 'gpt-4o',
  temperature: 0.3
});

return result.content;
  `.trim(),
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('Translation tool using GPT calling', () => {
  beforeEach(async () => {
    // Setup mock chat service
    mockChatService.getResponseStreaming.mockClear();
    
    // Set the mock chat service
    setChatServiceInstance(mockChatService);
    
    // Setup test tool
    await StorageService.saveTools([translationTool]);
  });

  it('should translate Korean to English', async () => {
    // Mock the streaming response
    const mockStream = (async function* () {
      yield 'Hello, world!';
    })();
    
    mockChatService.getResponseStreaming.mockReturnValue(mockStream);
    
    const args = JSON.stringify({ 
      text: '안녕하세요, 세계!', 
      target_language: 'English' 
    });
    
    const result = await executeTool('translate_text', args);
    
    expect(result.error).toBeUndefined();
    expect(result.result).toBe('Hello, world!');
    
    // Verify that the chat service was called with correct parameters
    expect(mockChatService.getResponseStreaming).toHaveBeenCalledTimes(1);
    
    const [messages, model, temperature] = mockChatService.getResponseStreaming.mock.calls[0];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].text).toContain('professional translator');
    expect(messages[1].role).toBe('user');
    expect(messages[1].text).toContain('안녕하세요, 세계!');
    expect(messages[1].text).toContain('English');
    expect(model).toBe('gpt-4o');
    expect(temperature).toBe(0.3);
  });

  it('should translate English to Japanese', async () => {
    // Mock the streaming response
    const mockStream = (async function* () {
      yield 'こんにちは、世界！';
    })();
    
    mockChatService.getResponseStreaming.mockReturnValue(mockStream);
    
    const args = JSON.stringify({ 
      text: 'Hello, world!', 
      target_language: '日本語' 
    });
    
    const result = await executeTool('translate_text', args);
    
    expect(result.error).toBeUndefined();
    expect(result.result).toBe('こんにちは、世界！');
  });

  it('should handle missing required parameters', async () => {
    // Mock the streaming response for when target_language is undefined
    const mockStream = (async function* () {
      yield 'Translation failed due to missing target language.';
    })();
    
    mockChatService.getResponseStreaming.mockReturnValue(mockStream);
    
    const args = JSON.stringify({ text: 'Hello' }); // missing target_language
    
    const result = await executeTool('translate_text', args);
    
    // Should still work, the GPT will handle the undefined parameter
    expect(result.error).toBeUndefined();
    expect(result.result).toContain('Translation failed');
    
    // Verify the GPT call was made with undefined in the template
    const [messages] = mockChatService.getResponseStreaming.mock.calls[0];
    expect(messages[1].text).toContain('undefined');
  });

  it('should handle GPT service errors gracefully', async () => {
    // Mock an error in the chat service
    mockChatService.getResponseStreaming.mockImplementation(() => {
      throw new Error('Translation service temporarily unavailable');
    });

    const args = JSON.stringify({ 
      text: 'Hello, world!', 
      target_language: 'Spanish' 
    });
    
    const result = await executeTool('translate_text', args);
    
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Translation service temporarily unavailable');
    expect(result.result).toBeNull();
  });
});