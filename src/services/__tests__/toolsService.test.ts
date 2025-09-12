import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toolsService } from '../toolsService';
import { bookService } from '../bookService';

// Mock the bookService
vi.mock('../bookService', () => ({
  bookService: {
    getBookById: vi.fn(),
    updateBook: vi.fn(),
    createBook: vi.fn(),
    getAllBooks: vi.fn(),
  }
}));

describe('ToolsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveResponseAsBookPage', () => {
    it('should save response as a new page to existing book', async () => {
      // Mock book
      const mockBook = {
        id: 'test-book-id',
        title: 'Test Book',
        author: 'Test Author',
        content: '# Test Book\n\n## Chapter 1\nOriginal content',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockUpdatedBook = {
        ...mockBook,
        content: mockBook.content + '\n\n## Test Page\nTest response content'
      };

      vi.mocked(bookService.getBookById).mockResolvedValue(mockBook);
      vi.mocked(bookService.updateBook).mockResolvedValue(mockUpdatedBook);

      const result = await toolsService.saveResponseAsBookPage(
        'test-book-id',
        'Test Page',
        'Test response content'
      );

      expect(result).toContain('성공');
      expect(result).toContain('Test Page');
      expect(result).toContain('Test Book');
      expect(bookService.getBookById).toHaveBeenCalledWith('test-book-id');
      expect(bookService.updateBook).toHaveBeenCalledWith('test-book-id', {
        content: '# Test Book\n\n## Chapter 1\nOriginal content\n\n## Test Page\nTest response content'
      });
    });

    it('should return error when book not found', async () => {
      vi.mocked(bookService.getBookById).mockResolvedValue(null);

      const result = await toolsService.saveResponseAsBookPage(
        'nonexistent-book-id',
        'Test Page',
        'Test response content'
      );

      expect(result).toContain('오류');
      expect(result).toContain('찾을 수 없습니다');
    });
  });

  describe('createBookFromResponse', () => {
    it('should create a new book from response', async () => {
      const mockNewBook = {
        id: 'new-book-id',
        title: 'New Book',
        author: 'AI Assistant', 
        content: '# New Book\n\n## 1장: AI 응답\nTest response content',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(bookService.createBook).mockResolvedValue(mockNewBook);

      const result = await toolsService.createBookFromResponse(
        'New Book',
        'Test response content'
      );

      expect(result).toContain('성공');
      expect(result).toContain('New Book');
      expect(result).toContain('new-book-id');
      expect(bookService.createBook).toHaveBeenCalledWith(
        'New Book',
        'AI Assistant',
        '# New Book\n\n## 1장: AI 응답\nTest response content',
        undefined
      );
    });

    it('should create book with custom author and description', async () => {
      const mockNewBook = {
        id: 'new-book-id',
        title: 'Custom Book',
        author: 'Custom Author',
        content: '# Custom Book\n\n## 1장: AI 응답\nCustom content',
        description: 'Custom description',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(bookService.createBook).mockResolvedValue(mockNewBook);

      const result = await toolsService.createBookFromResponse(
        'Custom Book',
        'Custom content',
        'Custom Author',
        'Custom description'
      );

      expect(result).toContain('성공');
      expect(result).toContain('Custom Book');
      expect(bookService.createBook).toHaveBeenCalledWith(
        'Custom Book',
        'Custom Author',
        '# Custom Book\n\n## 1장: AI 응답\nCustom content',
        'Custom description'
      );
    });
  });

  describe('listAvailableBooks', () => {
    it('should return formatted list of books', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Book One',
          author: 'Author One',
          content: 'Content',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'book-2',
          title: 'Book Two',
          author: 'Author Two',
          content: 'Content',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      vi.mocked(bookService.getAllBooks).mockResolvedValue(mockBooks);

      const result = await toolsService.listAvailableBooks();

      expect(result).toContain('사용 가능한 책 목록');
      expect(result).toContain('Book One');
      expect(result).toContain('Book Two');
      expect(result).toContain('Author One');
      expect(result).toContain('Author Two');
      expect(result).toContain('book-1');
      expect(result).toContain('book-2');
    });

    it('should return message when no books available', async () => {
      vi.mocked(bookService.getAllBooks).mockResolvedValue([]);

      const result = await toolsService.listAvailableBooks();

      expect(result).toContain('현재 저장된 책이 없습니다');
    });
  });

  describe('executeToolCall', () => {
    it('should execute save_response_as_book_page tool call', async () => {
      const mockBook = {
        id: 'test-book-id',
        title: 'Test Book',
        author: 'Test Author',
        content: '# Test Book\n\n## Chapter 1\nOriginal content',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(bookService.getBookById).mockResolvedValue(mockBook);
      vi.mocked(bookService.updateBook).mockResolvedValue(mockBook);

      const toolCall = {
        id: 'test-tool-call',
        type: 'function' as const,
        function: {
          name: 'save_response_as_book_page',
          arguments: JSON.stringify({
            bookId: 'test-book-id',
            pageTitle: 'Test Page',
            responseContent: 'Test content'
          })
        }
      };

      const result = await toolsService.executeToolCall(toolCall);

      expect(result).toContain('성공');
    });

    it('should return error for unknown function', async () => {
      const toolCall = {
        id: 'test-tool-call',
        type: 'function' as const,
        function: {
          name: 'unknown_function',
          arguments: '{}'
        }
      };

      const result = await toolsService.executeToolCall(toolCall);

      expect(result).toContain('오류');
      expect(result).toContain('알 수 없는 함수');
    });

    it('should handle invalid JSON arguments', async () => {
      const toolCall = {
        id: 'test-tool-call',
        type: 'function' as const,
        function: {
          name: 'save_response_as_book_page',
          arguments: 'invalid json'
        }
      };

      const result = await toolsService.executeToolCall(toolCall);

      expect(result).toContain('오류');
    });
  });
});