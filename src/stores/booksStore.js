import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { put, getAll } from '../db/database';
export const useBooksStore = create((set, get) => ({
    books: [],
    loaded: false,
    load: async () => {
        const list = await getAll('books');
        set({ books: list.sort((a, b) => b.updatedAt - a.updatedAt), loaded: true });
    },
    createBook: async (title) => {
        const book = {
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
