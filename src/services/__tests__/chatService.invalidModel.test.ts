import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../chatService';
import OpenAI from 'openai';

// Mock OpenAI module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      },
      models: {
        list: vi.fn().mockResolvedValue({ 
          data: [
            { id: 'gpt-4o' },
            { id: 'gpt-4' },
            { id: 'gpt-3.5-turbo' }
          ] 
        })
      }
    }))
  };
});

describe('ChatService - Invalid Model Error Handling', () => {
  let chatService: ChatService;
  let mockCreate: any;
  let mockModelsList: any;

  beforeEach(() => {
    // Create a new ChatService instance
    chatService = new ChatService({ baseUrl: 'http://test-api.local' });
    
    // Get reference to the mocked functions
    const OpenAIMock = OpenAI as any;
    const mockInstance = OpenAIMock.mock.results[OpenAIMock.mock.results.length - 1].value;
    mockCreate = mockInstance.chat.completions.create;
    mockModelsList = mockInstance.models.list;
  });

  it('should provide helpful error message for 500 status code', async () => {
    // Mock a 500 error response
    const error = new Error('Internal Server Error');
    (error as any).status = 500;
    mockCreate.mockRejectedValue(error);

    const messages = [
      { role: 'user' as const, text: 'Hello' }
    ];

    try {
      const stream = chatService.getResponseStreaming(
        messages,
        'claude-sonnet-4.5',
        1.0,
        undefined,
        undefined,
        undefined,
        false
      );
      
      // Try to consume the stream
      for await (const _chunk of stream) {
        // Should not reach here
      }
      
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('API returned 500 error');
      expect(error.message).toContain('claude-sonnet-4.5');
      expect(error.message).toContain('not supported');
      // Should now include dynamically fetched available models
      expect(error.message).toContain('Available models');
    }
  });

  it('should provide helpful error message for 404 status code', async () => {
    // Mock a 404 error response
    const error = new Error('Not Found');
    (error as any).status = 404;
    mockCreate.mockRejectedValue(error);

    const messages = [
      { role: 'user' as const, text: 'Hello' }
    ];

    try {
      const stream = chatService.getResponseStreaming(
        messages,
        'invalid-model-name',
        1.0,
        undefined,
        undefined,
        undefined,
        false
      );
      
      for await (const _chunk of stream) {
        // Should not reach here
      }
      
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('invalid-model-name');
      expect(error.message).toContain('not found');
      // Should now include dynamically fetched available models
      expect(error.message).toContain('Available models');
    }
  });

  it('should provide helpful error message for 400 status code', async () => {
    // Mock a 400 error response
    const error = new Error('Bad Request');
    (error as any).status = 400;
    mockCreate.mockRejectedValue(error);

    const messages = [
      { role: 'user' as const, text: 'Hello' }
    ];

    try {
      const stream = chatService.getResponseStreaming(
        messages,
        'gpt-4o',
        1.0,
        undefined,
        undefined,
        undefined,
        false
      );
      
      for await (const _chunk of stream) {
        // Should not reach here
      }
      
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Invalid request');
      expect(error.message).toContain('gpt-4o');
    }
  });

  it('should provide context for generic errors', async () => {
    // Mock a generic error
    const error = new Error('Network error');
    mockCreate.mockRejectedValue(error);

    const messages = [
      { role: 'user' as const, text: 'Hello' }
    ];

    try {
      const stream = chatService.getResponseStreaming(
        messages,
        'gpt-4o',
        1.0,
        undefined,
        undefined,
        undefined,
        false
      );
      
      for await (const _chunk of stream) {
        // Should not reach here
      }
      
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Failed to create chat completion');
      expect(error.message).toContain('gpt-4o');
      expect(error.message).toContain('Network error');
    }
  });

  it('should handle errors with response.status property', async () => {
    // Mock an error with response.status (axios-style error)
    const error = new Error('API Error');
    (error as any).response = { status: 500 };
    mockCreate.mockRejectedValue(error);

    const messages = [
      { role: 'user' as const, text: 'Hello' }
    ];

    try {
      const stream = chatService.getResponseStreaming(
        messages,
        'claude-3-opus',
        1.0,
        undefined,
        undefined,
        undefined,
        false
      );
      
      for await (const _chunk of stream) {
        // Should not reach here
      }
      
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('API returned 500 error');
      expect(error.message).toContain('claude-3-opus');
    }
  });

  it('should handle model list API failure gracefully', async () => {
    // Mock model list API to fail
    mockModelsList.mockRejectedValue(new Error('Failed to fetch models'));
    
    // Mock a 500 error response
    const error = new Error('Internal Server Error');
    (error as any).status = 500;
    mockCreate.mockRejectedValue(error);

    const messages = [
      { role: 'user' as const, text: 'Hello' }
    ];

    try {
      const stream = chatService.getResponseStreaming(
        messages,
        'invalid-model',
        1.0,
        undefined,
        undefined,
        undefined,
        false
      );
      
      for await (const _chunk of stream) {
        // Should not reach here
      }
      
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      // Should still provide a useful error even when model list fetch fails
      expect(error.message).toContain('API returned 500 error');
      expect(error.message).toContain('invalid-model');
      expect(error.message).toContain('not supported');
    }
  });
});
