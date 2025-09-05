import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { BookMeta } from '../types/domain';
import { put, getAll } from '../db/database';

interface BooksState {
  books: BookMeta[];
  loaded: boolean;
  load: () => Promise<void>;
  createBook: (title: string) => Promise<BookMeta>;
}

export const useBooksStore = create<BooksState>((set, get) => ({
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
  }
}));
