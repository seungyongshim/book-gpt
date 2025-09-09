/**
 * Utility for handling IndexedDB-first, localStorage-fallback storage patterns
 * Eliminates code duplication in storage operations
 */

import { chatStorage } from './storageService';

/**
 * Generic storage handler that tries IndexedDB first, falls back to localStorage
 */
export class StorageHandler {
  /**
   * Save data with IndexedDB-first, localStorage-fallback pattern
   */
  static async saveWithFallback<T>(
    key: string,
    data: T,
    indexedDBSaver?: (data: T) => Promise<void>
  ): Promise<void> {
    if (indexedDBSaver) {
      try {
        await indexedDBSaver(data);
        console.log(`Data saved to IndexedDB successfully for key: ${key}`);
        return;
      } catch (error) {
        console.log(`Error saving to IndexedDB for key ${key}: ${error}. Falling back to localStorage`);
      }
    }

    // localStorage fallback
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      console.log(`Data saved to localStorage as fallback for key: ${key}`);
    } catch (error) {
      console.error(`Error saving to localStorage for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Load data with IndexedDB-first, localStorage-fallback pattern
   */
  static async loadWithFallback<T>(
    key: string,
    indexedDBLoader?: () => Promise<T | null>,
    transformer?: (data: any) => T
  ): Promise<T | null> {
    if (indexedDBLoader) {
      try {
        console.log(`Attempting to load data from IndexedDB for key: ${key}`);
        const data = await indexedDBLoader();
        if (data !== null && data !== undefined) {
          console.log(`Loaded data from IndexedDB successfully for key: ${key}`);
          return data;
        }
      } catch (error) {
        console.error(`Error loading from IndexedDB for key ${key}: ${error}`);
      }
    }

    // localStorage fallback
    console.log(`Falling back to localStorage for key: ${key}`);
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        const result = transformer ? transformer(parsed) : parsed;
        console.log(`Loaded data from localStorage fallback for key: ${key}`);
        return result;
      }
    } catch (error) {
      console.error(`Error loading from localStorage for key ${key}:`, error);
    }

    return null;
  }

  /**
   * Save a setting with the standard pattern
   */
  static async saveSetting(key: string, value: any): Promise<void> {
    return this.saveWithFallback(
      key,
      value,
      async (data) => await chatStorage.saveSetting(key, data)
    );
  }

  /**
   * Load a setting with the standard pattern
   */
  static async loadSetting(key: string): Promise<any> {
    return this.loadWithFallback(
      key,
      async () => await chatStorage.loadSetting(key)
    );
  }
}