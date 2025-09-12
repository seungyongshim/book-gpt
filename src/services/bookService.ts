import { Book, BookPage } from './types';
import { StorageService } from './storageService';

// 간단한 UUID 생성 함수
const generateBookId = (): string => {
  return 'book-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 기본 책 데이터 
const DEFAULT_BOOKS: Book[] = [
  {
    id: 'book-001',
    title: '코딩의 기초',
    author: '개발자',
    description: '프로그래밍 입문자를 위한 기초 가이드',
    content: `# 코딩의 기초

## 1장: 프로그래밍 언어란?
프로그래밍 언어는 컴퓨터와 소통하기 위한 언어입니다. 

## 2장: 변수와 데이터 타입
변수는 데이터를 저장하는 공간입니다.
- 문자열 (String)
- 숫자 (Number) 
- 불린 (Boolean)

## 3장: 조건문과 반복문
프로그램의 흐름을 제어하는 방법을 배웁니다.`,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'book-002', 
    title: 'React 완전 정복',
    author: '프론트엔드 마스터',
    description: 'React 프레임워크 완벽 가이드',
    content: `# React 완전 정복

## 1장: React 소개
React는 사용자 인터페이스를 만들기 위한 JavaScript 라이브러리입니다.

## 2장: 컴포넌트
React에서 모든 것은 컴포넌트로 구성됩니다.

## 3장: State와 Props
컴포넌트 간 데이터 전달 방법을 학습합니다.

## 4장: Hook
useState, useEffect 등 React Hook을 마스터합니다.`,
    createdAt: new Date('2024-01-15'), 
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'book-003',
    title: 'TypeScript 실전 가이드', 
    author: 'JS 개발자',
    description: 'TypeScript로 안전한 코드 작성하기',
    content: `# TypeScript 실전 가이드

## 1장: TypeScript란?
TypeScript는 JavaScript에 타입을 추가한 언어입니다.

## 2장: 타입 시스템
- 기본 타입들
- 인터페이스 
- 제네릭

## 3장: 실전 활용
실제 프로젝트에서 TypeScript를 활용하는 방법을 배웁니다.`,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
];

class BookService {
  private books: Book[] = [];

  async initializeBooks(): Promise<void> {
    try {
      // 저장된 책들 로드 시도
      const savedBooks = await StorageService.loadBooks();
      
      if (savedBooks.length === 0) {
        // 저장된 책이 없으면 기본 책들 사용
        this.books = [...DEFAULT_BOOKS];
        await this.saveBooks();
      } else {
        this.books = savedBooks;
      }
    } catch (error) {
      console.error('Failed to initialize books:', error);
      // 에러 발생시 기본 책들 사용
      this.books = [...DEFAULT_BOOKS];
    }
  }

  async getAllBooks(): Promise<Book[]> {
    if (this.books.length === 0) {
      await this.initializeBooks();
    }
    return [...this.books];
  }

  async getBookById(id: string): Promise<Book | null> {
    if (this.books.length === 0) {
      await this.initializeBooks();
    }
    return this.books.find(book => book.id === id) || null;
  }

  async createBook(title: string, author: string, content: string, description?: string): Promise<Book> {
    const newBook: Book = {
      id: generateBookId(),
      title,
      author,
      content,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.books.push(newBook);
    await this.saveBooks();
    return newBook;
  }

  async updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'createdAt'>>): Promise<Book | null> {
    const bookIndex = this.books.findIndex(book => book.id === id);
    if (bookIndex === -1) return null;

    const updatedBook = {
      ...this.books[bookIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.books[bookIndex] = updatedBook;
    await this.saveBooks();
    return updatedBook;
  }

  async deleteBook(id: string): Promise<boolean> {
    const initialLength = this.books.length;
    this.books = this.books.filter(book => book.id !== id);
    
    if (this.books.length < initialLength) {
      await this.saveBooks();
      return true;
    }
    return false;
  }

  private async saveBooks(): Promise<void> {
    try {
      await StorageService.saveBooks(this.books);
    } catch (error) {
      console.error('Failed to save books:', error);
    }
  }

  // 검색 기능
  async searchBooks(query: string): Promise<Book[]> {
    if (this.books.length === 0) {
      await this.initializeBooks();
    }

    const lowerQuery = query.toLowerCase();
    return this.books.filter(book => 
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery) ||
      (book.description && book.description.toLowerCase().includes(lowerQuery)) ||
      book.content.toLowerCase().includes(lowerQuery)
    );
  }

  // 책 내용을 페이지로 분할
  parseBookPages(book: Book): BookPage[] {
    const pages: BookPage[] = [];
    
    // ## 으로 시작하는 장 제목을 기준으로 페이지 분할
    const chapterRegex = /^## (.+)$/gm;
    const content = book.content;
    
    let match;
    let lastIndex = 0;
    let pageNumber = 1;
    
    // 책 제목 부분 처리 (첫 번째 # 제목)
    const titleMatch = content.match(/^# (.+)$/m);
    if (titleMatch) {
      const titleEnd = content.indexOf('\n', titleMatch.index! + titleMatch[0].length);
      lastIndex = titleEnd + 1;
    }
    
    while ((match = chapterRegex.exec(content)) !== null) {
      // 이전 페이지의 내용 추가 (첫 번째 장이 아닌 경우)
      if (pageNumber > 1) {
        const pageContent = content.substring(lastIndex, match.index).trim();
        if (pageContent) {
          pages[pages.length - 1].content += '\n\n' + pageContent;
        }
      }
      
      // 새 페이지 생성
      pages.push({
        pageNumber,
        title: match[1],
        content: match[0] // 장 제목으로 시작
      });
      
      lastIndex = match.index + match[0].length;
      pageNumber++;
    }
    
    // 마지막 페이지의 나머지 내용 추가
    if (pages.length > 0 && lastIndex < content.length) {
      const remainingContent = content.substring(lastIndex).trim();
      if (remainingContent) {
        pages[pages.length - 1].content += '\n\n' + remainingContent;
      }
    }
    
    // 페이지가 없는 경우 전체 내용을 하나의 페이지로 처리
    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        title: book.title,
        content: book.content
      });
    }
    
    return pages;
  }

  // 특정 페이지 내용 가져오기
  async getBookPage(bookId: string, pageNumber: number): Promise<BookPage | null> {
    const book = await this.getBookById(bookId);
    if (!book) return null;
    
    const pages = this.parseBookPages(book);
    return pages.find(page => page.pageNumber === pageNumber) || null;
  }

  // 책의 총 페이지 수 가져오기
  async getBookPageCount(bookId: string): Promise<number> {
    const book = await this.getBookById(bookId);
    if (!book) return 0;
    
    const pages = this.parseBookPages(book);
    return pages.length;
  }
}

// 싱글톤 인스턴스
export const bookService = new BookService();