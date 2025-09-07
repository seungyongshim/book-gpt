import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { generateUniqueSlug } from '../utils/slug';
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
            slug: generateUniqueSlug(title, get().books.map(b => b.slug || '')),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        await put('books', book);
        set({ books: [book, ...get().books] });
        return book;
    },
    updateBook: async (id, patch) => {
        const existing = get().books.find(b => b.id === id);
        if (!existing)
            return;
        const updated = { ...existing, ...patch, updatedAt: Date.now() };
        await put('books', updated);
        set({ books: get().books.map(b => b.id === id ? updated : b) });
    }
}));
