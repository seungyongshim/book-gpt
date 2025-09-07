import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { BookMeta } from '../types/domain';
import { put, getAll } from '../db/database';

interface BooksState {
  books: BookMeta[];
  loaded: boolean;
  load: () => Promise<void>;
  createBook: (title: string) => Promise<BookMeta>;
  updateBook: (id: string, patch: Partial<BookMeta>) => Promise<void>;
}

export const useBooksStore = create<BooksState>((set: (partial: any, replace?: boolean)=>void, get: ()=>BooksState) => ({
  books: [],
  loaded: false,
  load: async () => {
    const list = await getAll<BookMeta>('books');
    set({ books: list.sort((a,b)=>b.updatedAt - a.updatedAt), loaded: true });
  },
  createBook: async (title: string) => {
    const book: BookMeta = {
      id: nanoid(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await put('books', book);
    set({ books: [book, ...get().books] });
    return book;
  },
  updateBook: async (id: string, patch: Partial<BookMeta>) => {
    const existing = get().books.find(b=>b.id===id);
    if (!existing) return;
    const updated: BookMeta = { ...existing, ...patch, updatedAt: Date.now() };
    await put('books', updated);
    set({ books: get().books.map(b=>b.id===id?updated:b) });
  }
}));
