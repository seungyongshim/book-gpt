import { OpenAIFunction, ToolCall } from './types';
import { bookService } from './bookService';

// 사용 가능한 OpenAI Functions 정의
export const AVAILABLE_FUNCTIONS: OpenAIFunction[] = [
  {
    name: 'save_response_as_book_page',
    description: '현재 AI 응답을 기존 책의 새 페이지로 저장합니다.',
    parameters: {
      type: 'object',
      properties: {
        bookId: {
          type: 'string',
          description: '페이지를 추가할 책의 ID'
        },
        pageTitle: {
          type: 'string',
          description: '새 페이지의 제목'
        },
        responseContent: {
          type: 'string',
          description: '저장할 응답 내용'
        }
      },
      required: ['bookId', 'pageTitle', 'responseContent']
    }
  },
  {
    name: 'create_book_from_response',
    description: '현재 AI 응답을 새로운 책으로 생성합니다.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '새 책의 제목'
        },
        author: {
          type: 'string',
          description: '새 책의 저자 (기본값: "AI Assistant")'
        },
        description: {
          type: 'string',
          description: '새 책의 설명 (선택사항)'
        },
        responseContent: {
          type: 'string',
          description: '책의 첫 번째 내용으로 사용할 응답'
        }
      },
      required: ['title', 'responseContent']
    }
  },
  {
    name: 'list_available_books',
    description: '저장 가능한 책들의 목록을 조회합니다.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Function calling 핸들러들
class ToolsService {
  // 응답을 기존 책의 페이지로 저장
  async saveResponseAsBookPage(bookId: string, pageTitle: string, responseContent: string): Promise<string> {
    try {
      const book = await bookService.getBookById(bookId);
      if (!book) {
        return `오류: ID "${bookId}"인 책을 찾을 수 없습니다.`;
      }

      // 새 페이지 형식으로 내용 구성
      const newPageContent = `\n\n## ${pageTitle}\n${responseContent}`;
      
      // 책 내용에 새 페이지 추가
      const updatedContent = book.content + newPageContent;
      
      const updatedBook = await bookService.updateBook(bookId, {
        content: updatedContent
      });

      if (updatedBook) {
        return `성공: "${pageTitle}" 페이지가 책 "${book.title}"에 추가되었습니다.`;
      } else {
        return `오류: 책 업데이트 중 문제가 발생했습니다.`;
      }
    } catch (error) {
      console.error('Error saving response as book page:', error);
      return `오류: 페이지 저장 중 오류가 발생했습니다. ${error instanceof Error ? error.message : ''}`;
    }
  }

  // 응답으로부터 새 책 생성
  async createBookFromResponse(title: string, responseContent: string, author?: string, description?: string): Promise<string> {
    try {
      const bookContent = `# ${title}\n\n## 1장: AI 응답\n${responseContent}`;
      
      const newBook = await bookService.createBook(
        title,
        author || 'AI Assistant',
        bookContent,
        description
      );

      return `성공: 새 책 "${newBook.title}"이(가) 생성되었습니다. (ID: ${newBook.id})`;
    } catch (error) {
      console.error('Error creating book from response:', error);
      return `오류: 책 생성 중 오류가 발생했습니다. ${error instanceof Error ? error.message : ''}`;
    }
  }

  // 사용 가능한 책 목록 조회
  async listAvailableBooks(): Promise<string> {
    try {
      const books = await bookService.getAllBooks();
      
      if (books.length === 0) {
        return '현재 저장된 책이 없습니다.';
      }

      const bookList = books.map(book => `- ID: ${book.id}, 제목: "${book.title}", 저자: ${book.author}`).join('\n');
      return `사용 가능한 책 목록:\n${bookList}`;
    } catch (error) {
      console.error('Error listing books:', error);
      return `오류: 책 목록 조회 중 오류가 발생했습니다. ${error instanceof Error ? error.message : ''}`;
    }
  }

  // Tool call 실행
  async executeToolCall(toolCall: ToolCall): Promise<string> {
    const { name, arguments: args } = toolCall.function;
    
    try {
      const parsedArgs = JSON.parse(args);
      
      switch (name) {
        case 'save_response_as_book_page':
          return await this.saveResponseAsBookPage(
            parsedArgs.bookId,
            parsedArgs.pageTitle,
            parsedArgs.responseContent
          );
          
        case 'create_book_from_response':
          return await this.createBookFromResponse(
            parsedArgs.title,
            parsedArgs.responseContent,
            parsedArgs.author,
            parsedArgs.description
          );
          
        case 'list_available_books':
          return await this.listAvailableBooks();
          
        default:
          return `오류: 알 수 없는 함수 "${name}"입니다.`;
      }
    } catch (error) {
      console.error('Error executing tool call:', error);
      return `오류: 함수 실행 중 오류가 발생했습니다. ${error instanceof Error ? error.message : ''}`;
    }
  }
}

// 싱글톤 인스턴스
export const toolsService = new ToolsService();