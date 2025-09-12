import { create } from 'zustand';
import { BookProject, BookChapter, AppMode } from '../services/types';
import { StorageService } from '../services/storageService';
import { chatService } from '../services/chatService';

// 간단한 UUID 생성 함수
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Word count 계산 유틸리티
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export interface BookState {
  // App mode
  currentMode: AppMode;
  
  // Book projects
  bookProjects: BookProject[];
  currentBookId: string | null;
  currentBook: BookProject | null;
  currentChapterId: string | null;
  currentChapter: BookChapter | null;
  
  // Writing state
  chapterContent: string;
  isGenerating: boolean;
  error: string | null;
  streamingController: AbortController | null;

  // Actions
  initializeBookStore: () => Promise<void>;
  
  // Mode management
  setMode: (mode: AppMode) => void;
  
  // Book project management
  createBookProject: (title: string, description?: string) => void;
  switchBook: (id: string) => void;
  deleteBook: (id: string) => Promise<void>;
  updateBookMetadata: (id: string, updates: Partial<BookProject>) => Promise<void>;
  saveBooks: () => Promise<void>;
  
  // Chapter management
  createChapter: (title: string) => void;
  switchChapter: (id: string) => void;
  deleteChapter: (id: string) => Promise<void>;
  updateChapterTitle: (id: string, title: string) => Promise<void>;
  reorderChapters: (bookId: string, chapterIds: string[]) => Promise<void>;
  
  // Content management
  setChapterContent: (content: string) => void;
  saveChapterContent: () => Promise<void>;
  
  // AI assistance
  generateContent: (prompt: string, mode: 'continue' | 'rewrite' | 'new') => Promise<void>;
  cancelGeneration: () => void;
  
  // Statistics
  getTotalWordCount: (bookId?: string) => number;
  getBookProgress: (bookId?: string) => number;
}

export const useBookStore = create<BookState>((set, get) => ({
  // 초기 상태
  currentMode: 'chat',
  bookProjects: [],
  currentBookId: null,
  currentBook: null,
  currentChapterId: null,
  currentChapter: null,
  chapterContent: '',
  isGenerating: false,
  error: null,
  streamingController: null,

  // 북 스토어 초기화
  initializeBookStore: async () => {
    try {
      // Mode 복원
      const savedMode = localStorage.getItem('APP_MODE') as AppMode;
      if (savedMode && ['chat', 'book'].includes(savedMode)) {
        set({ currentMode: savedMode });
      }

      // 책 프로젝트 로드
      const loadedBooks = await StorageService.loadBookProjects();
      if (loadedBooks.length > 0) {
        const firstBook = loadedBooks[0];
        const firstChapter = firstBook.chapters[0] || null;
        
        set({
          bookProjects: loadedBooks,
          currentBookId: firstBook.id,
          currentBook: firstBook,
          currentChapterId: firstChapter?.id || null,
          currentChapter: firstChapter,
          chapterContent: firstChapter?.content || ''
        });
      }
    } catch (error) {
      console.error('Failed to initialize book store:', error);
    }
  },

  // 모드 설정
  setMode: (mode: AppMode) => {
    set({ currentMode: mode });
    localStorage.setItem('APP_MODE', mode);
  },

  // 새 책 프로젝트 생성
  createBookProject: (title: string, description?: string) => {
    const state = get();
    const projectId = generateId();
    const chapterId = generateId();
    
    const newChapter: BookChapter = {
      id: chapterId,
      title: '1장',
      content: '',
      wordCount: 0,
      order: 0,
      lastUpdated: new Date()
    };
    
    const newProject: BookProject = {
      id: projectId,
      title,
      description,
      chapters: [newChapter],
      lastUpdated: new Date(),
      currentChapterId: chapterId
    };

    const newProjects = [newProject, ...state.bookProjects];
    set({
      bookProjects: newProjects,
      currentBookId: projectId,
      currentBook: newProject,
      currentChapterId: chapterId,
      currentChapter: newChapter,
      chapterContent: ''
    });

    get().saveBooks();
  },

  // 책 전환
  switchBook: (id: string) => {
    const state = get();
    const book = state.bookProjects.find(b => b.id === id);
    if (book) {
      const currentChapter = book.chapters.find(c => c.id === book.currentChapterId) || book.chapters[0] || null;
      
      set({
        currentBookId: id,
        currentBook: book,
        currentChapterId: currentChapter?.id || null,
        currentChapter: currentChapter,
        chapterContent: currentChapter?.content || ''
      });
    }
  },

  // 책 삭제
  deleteBook: async (id: string) => {
    const state = get();
    if (state.bookProjects.length <= 1) return;

    const newProjects = state.bookProjects.filter(b => b.id !== id);
    let newCurrentBook = state.currentBook;
    let newCurrentBookId = state.currentBookId;
    let newCurrentChapter = state.currentChapter;
    let newCurrentChapterId = state.currentChapterId;
    let newContent = state.chapterContent;

    if (state.currentBookId === id) {
      newCurrentBook = newProjects[0];
      newCurrentBookId = newCurrentBook.id;
      newCurrentChapter = newCurrentBook.chapters[0] || null;
      newCurrentChapterId = newCurrentChapter?.id || null;
      newContent = newCurrentChapter?.content || '';
    }

    set({
      bookProjects: newProjects,
      currentBookId: newCurrentBookId,
      currentBook: newCurrentBook,
      currentChapterId: newCurrentChapterId,
      currentChapter: newCurrentChapter,
      chapterContent: newContent
    });

    await get().saveBooks();
  },

  // 책 메타데이터 업데이트
  updateBookMetadata: async (id: string, updates: Partial<BookProject>) => {
    const state = get();
    const updatedProjects = state.bookProjects.map(book => 
      book.id === id 
        ? { ...book, ...updates, lastUpdated: new Date() }
        : book
    );

    const updatedCurrentBook = state.currentBookId === id 
      ? updatedProjects.find(b => b.id === id) || state.currentBook
      : state.currentBook;

    set({
      bookProjects: updatedProjects,
      currentBook: updatedCurrentBook
    });

    await get().saveBooks();
  },

  // 새 챕터 생성
  createChapter: (title: string) => {
    const state = get();
    if (!state.currentBook) return;

    const chapterId = generateId();
    const newChapter: BookChapter = {
      id: chapterId,
      title,
      content: '',
      wordCount: 0,
      order: state.currentBook.chapters.length,
      lastUpdated: new Date()
    };

    const updatedBook = {
      ...state.currentBook,
      chapters: [...state.currentBook.chapters, newChapter],
      currentChapterId: chapterId,
      lastUpdated: new Date()
    };

    const updatedProjects = state.bookProjects.map(book =>
      book.id === state.currentBookId ? updatedBook : book
    );

    set({
      bookProjects: updatedProjects,
      currentBook: updatedBook,
      currentChapterId: chapterId,
      currentChapter: newChapter,
      chapterContent: ''
    });

    get().saveBooks();
  },

  // 챕터 전환
  switchChapter: (id: string) => {
    const state = get();
    if (!state.currentBook) return;

    const chapter = state.currentBook.chapters.find(c => c.id === id);
    if (chapter) {
      set({
        currentChapterId: id,
        currentChapter: chapter,
        chapterContent: chapter.content
      });

      // 현재 챕터 ID 저장
      const updatedBook = {
        ...state.currentBook,
        currentChapterId: id
      };
      const updatedProjects = state.bookProjects.map(book =>
        book.id === state.currentBookId ? updatedBook : book
      );
      set({ bookProjects: updatedProjects, currentBook: updatedBook });
    }
  },

  // 챕터 삭제
  deleteChapter: async (id: string) => {
    const state = get();
    if (!state.currentBook || state.currentBook.chapters.length <= 1) return;

    const updatedChapters = state.currentBook.chapters.filter(c => c.id !== id);
    
    // 순서 재정렬
    const reorderedChapters = updatedChapters.map((chapter, index) => ({
      ...chapter,
      order: index
    }));

    let newCurrentChapterId = state.currentChapterId;
    let newCurrentChapter = state.currentChapter;
    let newContent = state.chapterContent;

    if (state.currentChapterId === id) {
      newCurrentChapter = reorderedChapters[0] || null;
      newCurrentChapterId = newCurrentChapter?.id || null;
      newContent = newCurrentChapter?.content || '';
    }

    const updatedBook = {
      ...state.currentBook,
      chapters: reorderedChapters,
      currentChapterId: newCurrentChapterId,
      lastUpdated: new Date()
    };

    const updatedProjects = state.bookProjects.map(book =>
      book.id === state.currentBookId ? updatedBook : book
    );

    set({
      bookProjects: updatedProjects,
      currentBook: updatedBook,
      currentChapterId: newCurrentChapterId,
      currentChapter: newCurrentChapter,
      chapterContent: newContent
    });

    await get().saveBooks();
  },

  // 챕터 제목 업데이트
  updateChapterTitle: async (id: string, title: string) => {
    const state = get();
    if (!state.currentBook) return;

    const updatedChapters = state.currentBook.chapters.map(chapter =>
      chapter.id === id 
        ? { ...chapter, title, lastUpdated: new Date() }
        : chapter
    );

    const updatedBook = {
      ...state.currentBook,
      chapters: updatedChapters,
      lastUpdated: new Date()
    };

    const updatedCurrentChapter = state.currentChapterId === id
      ? updatedChapters.find(c => c.id === id) || state.currentChapter
      : state.currentChapter;

    const updatedProjects = state.bookProjects.map(book =>
      book.id === state.currentBookId ? updatedBook : book
    );

    set({
      bookProjects: updatedProjects,
      currentBook: updatedBook,
      currentChapter: updatedCurrentChapter
    });

    await get().saveBooks();
  },

  // 챕터 순서 변경
  reorderChapters: async (bookId: string, chapterIds: string[]) => {
    const state = get();
    const book = state.bookProjects.find(b => b.id === bookId);
    if (!book) return;

    const reorderedChapters = chapterIds.map((id, index) => {
      const chapter = book.chapters.find(c => c.id === id);
      return chapter ? { ...chapter, order: index } : null;
    }).filter(Boolean) as BookChapter[];

    const updatedBook = {
      ...book,
      chapters: reorderedChapters,
      lastUpdated: new Date()
    };

    const updatedProjects = state.bookProjects.map(b =>
      b.id === bookId ? updatedBook : b
    );

    const updatedCurrentBook = state.currentBookId === bookId ? updatedBook : state.currentBook;

    set({
      bookProjects: updatedProjects,
      currentBook: updatedCurrentBook
    });

    await get().saveBooks();
  },

  // 챕터 내용 설정
  setChapterContent: (content: string) => {
    set({ chapterContent: content });
  },

  // 챕터 내용 저장
  saveChapterContent: async () => {
    const state = get();
    if (!state.currentBook || !state.currentChapter) return;

    const wordCount = countWords(state.chapterContent);
    const updatedChapter = {
      ...state.currentChapter,
      content: state.chapterContent,
      wordCount,
      lastUpdated: new Date()
    };

    const updatedChapters = state.currentBook.chapters.map(chapter =>
      chapter.id === state.currentChapterId ? updatedChapter : chapter
    );

    const updatedBook = {
      ...state.currentBook,
      chapters: updatedChapters,
      lastUpdated: new Date()
    };

    const updatedProjects = state.bookProjects.map(book =>
      book.id === state.currentBookId ? updatedBook : book
    );

    set({
      bookProjects: updatedProjects,
      currentBook: updatedBook,
      currentChapter: updatedChapter
    });

    await get().saveBooks();
  },

  // AI 콘텐츠 생성
  generateContent: async (prompt: string, mode: 'continue' | 'rewrite' | 'new') => {
    const state = get();
    if (state.isGenerating || !state.currentChapter) return;

    set({ isGenerating: true, error: null });

    const controller = new AbortController();
    set({ streamingController: controller });

    try {
      let systemPrompt = '';
      let userPrompt = '';
      
      switch (mode) {
        case 'continue':
          systemPrompt = 'You are a creative writing assistant. Continue the story naturally based on the existing content.';
          userPrompt = `Current content:\n\n${state.chapterContent}\n\nPlease continue writing from where it left off. User request: ${prompt}`;
          break;
        case 'rewrite':
          systemPrompt = 'You are a creative writing assistant. Rewrite and improve the given content while maintaining the core story.';
          userPrompt = `Current content:\n\n${state.chapterContent}\n\nPlease rewrite and improve this content. User request: ${prompt}`;
          break;
        case 'new':
          systemPrompt = 'You are a creative writing assistant. Write new content based on the user\'s request.';
          userPrompt = prompt;
          break;
      }

      const messages = [
        { role: 'system' as const, text: systemPrompt },
        { role: 'user' as const, text: userPrompt }
      ];

      let responseText = '';
      if (mode === 'continue') {
        responseText = state.chapterContent + '\n\n';
      }

      const stream = chatService.getResponseStreaming(
        messages,
        'gpt-4o',
        0.7,
        undefined,
        controller.signal
      );

      for await (const chunk of stream) {
        responseText += chunk;
        set({ chapterContent: responseText });
      }

      // 자동 저장
      await get().saveChapterContent();

    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // 취소는 오류로 간주하지 않음
      } else {
        set({ error: error instanceof Error ? error.message : 'Generation failed' });
      }
    } finally {
      set({ isGenerating: false, streamingController: null });
    }
  },

  // 생성 취소
  cancelGeneration: () => {
    const state = get();
    if (state.streamingController && !state.streamingController.signal.aborted) {
      try {
        state.streamingController.abort();
      } catch (e) {
        console.warn('Abort failed', e);
      }
    }
    set({ isGenerating: false, streamingController: null });
  },

  // 책 저장
  saveBooks: async () => {
    const state = get();
    await StorageService.saveBookProjects(state.bookProjects);
  },

  // 총 단어 수 계산
  getTotalWordCount: (bookId?: string) => {
    const state = get();
    const targetBook = bookId 
      ? state.bookProjects.find(b => b.id === bookId)
      : state.currentBook;
    
    if (!targetBook) return 0;
    
    return targetBook.chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
  },

  // 책 진행률 계산 (목표 단어 수 대비)
  getBookProgress: (bookId?: string) => {
    const state = get();
    const targetBook = bookId 
      ? state.bookProjects.find(b => b.id === bookId)
      : state.currentBook;
    
    if (!targetBook || !targetBook.targetWordCount) return 0;
    
    const currentWords = get().getTotalWordCount(bookId);
    return Math.min(100, (currentWords / targetBook.targetWordCount) * 100);
  }
}));