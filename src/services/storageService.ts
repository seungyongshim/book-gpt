import { Session, SessionDto, StoredTool } from './types';

// IndexedDB를 사용한 채팅 데이터 저장소
class ChatStorage {
  private dbName = 'ChatAppDB';
  private version = 2; // Increment version for tools support
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<IDBDatabase> {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      console.log('Initializing IndexedDB...');
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('IndexedDB opened successfully');
        this.db = request.result;
        this.isInitialized = true;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('IndexedDB upgrade needed, creating object stores...');
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 세션 스토어 생성
        if (!db.objectStoreNames.contains('sessions')) {
          console.log('Creating sessions object store...');
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('title', 'title', { unique: false });
          sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
          sessionStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
        
        // 설정 스토어 생성
        if (!db.objectStoreNames.contains('settings')) {
          console.log('Creating settings object store...');
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // 도구 스토어 생성
        if (!db.objectStoreNames.contains('tools')) {
          console.log('Creating tools object store...');
          const toolStore = db.createObjectStore('tools', { keyPath: 'id' });
          toolStore.createIndex('name', 'name', { unique: true });
          toolStore.createIndex('createdAt', 'createdAt', { unique: false });
          toolStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        console.log('IndexedDB upgrade completed');
      };
    });
  }

  async saveSessions(sessions: SessionDto[]): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    
    // 기존 세션들 삭제
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // 새 세션들 저장
    for (const session of sessions) {
      const sessionData = {
        id: session.id,
        title: session.title,
        history: session.history,
        lastUpdated: session.lastUpdated,
        systemMessage: session.systemMessage,
        createdAt: new Date().toISOString()
      };
      console.log('Saving session to IndexedDB:', sessionData);
      
      // 유효성 검사
      if (!sessionData.id) {
        console.error('Invalid session data: missing id', session);
        throw new Error('Session must have a valid id');
      }
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(sessionData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('Sessions saved to IndexedDB successfully');
        resolve();
      };
      transaction.onerror = () => {
        console.error('Error saving sessions to IndexedDB:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  async loadSessions(): Promise<SessionDto[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const sessions = request.result.map((session: any) => ({
          id: session.id,
          title: session.title,
          history: session.history,
          lastUpdated: session.lastUpdated ? session.lastUpdated : new Date().toISOString(),
          systemMessage: session.systemMessage
        }));
        console.log('Loaded sessions from IndexedDB:', sessions);
        resolve(sessions);
      };
      request.onerror = () => {
        console.error('Error loading sessions from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadSetting(key: string): Promise<any> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('IndexedDB cleared successfully');
        resolve();
      };
      request.onerror = () => {
        console.error('Error clearing IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async test(): Promise<boolean> {
    try {
      console.log('Testing IndexedDB...');
      
      // 먼저 초기화 확인
      if (!this.isInitialized) {
        console.log('IndexedDB not initialized, initializing now...');
        await this.init();
      }
      
      // 테스트 세션 생성
      const testSessions: SessionDto[] = [{
        id: '12345678-1234-1234-1234-123456789abc',
        title: 'Test Session',
        history: [
          { role: 'system', text: 'You are a helpful assistant.' },
          { role: 'user', text: 'Hello' },
          { role: 'assistant', text: 'Hi there!' }
        ],
        lastUpdated: new Date().toISOString()
      }];
      
      console.log('Saving test sessions...');
      await this.saveSessions(testSessions);
      
      console.log('Loading test sessions...');
      const loaded = await this.loadSessions();
      
      console.log('Test completed. Loaded sessions:', loaded);
      return loaded.length > 0;
    } catch (error) {
      console.error('IndexedDB test failed:', error);
      return false;
    }
  }

  // Tools storage methods
  async saveTools(tools: StoredTool[]): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['tools'], 'readwrite');
    const store = transaction.objectStore('tools');
    
    // Clear existing tools
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Save new tools
    for (const tool of tools) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(tool);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async loadTools(): Promise<StoredTool[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['tools'], 'readonly');
    const store = transaction.objectStore('tools');
    
    return new Promise<StoredTool[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveTool(tool: StoredTool): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['tools'], 'readwrite');
    const store = transaction.objectStore('tools');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(tool);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTool(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['tools'], 'readwrite');
    const store = transaction.objectStore('tools');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// 전역 인스턴스 생성
export const chatStorage = new ChatStorage();

// 스토리지 서비스 클래스
export class StorageService {
  
  // IndexedDB 초기화
  static async initializeStorage(): Promise<boolean> {
    try {
      await chatStorage.init();
      console.log('Storage initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      return false;
    }
  }

  // 세션 저장 (IndexedDB 우선, localStorage 폴백)
  static async saveSessions(sessions: Session[]): Promise<void> {
    const sessionDtos: SessionDto[] = sessions.map(s => ({
      id: s.id,
      title: s.title,
      history: s.history.map(m => ({ role: m.role, text: m.text })),
      lastUpdated: s.lastUpdated.toISOString(),
      systemMessage: s.systemMessage
    }));
    
    console.log(`Attempting to save ${sessionDtos.length} sessions to IndexedDB...`);
    
    try {
      await chatStorage.saveSessions(sessionDtos);
      console.log('Sessions saved to IndexedDB successfully');
    } catch (error) {
      console.log(`Error saving to IndexedDB: ${error}. Falling back to localStorage`);
      // localStorage 폴백
      const json = JSON.stringify(sessionDtos);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('CHAT_SESSIONS', json);
          console.log('Sessions saved to localStorage as fallback');
        } catch (e) {
          console.warn('Failed to write sessions to localStorage fallback:', e);
        }
      }
    }
  }

  // 세션 로드 (IndexedDB 우선, localStorage 폴백)
  static async loadSessions(): Promise<Session[]> {
    try {
      console.log('Attempting to load sessions from IndexedDB...');
      const sessionDtos = await chatStorage.loadSessions();
      console.log(`Loaded ${sessionDtos?.length ?? 0} sessions from IndexedDB`);
      
      if (sessionDtos && sessionDtos.length > 0) {
        return sessionDtos.map(d => ({
          id: d.id,
          title: d.title,
          history: d.history.map(x => ({ 
            role: x.role as 'user' | 'assistant' | 'system', 
            text: x.text 
          })),
          lastUpdated: new Date(d.lastUpdated),
          systemMessage: d.systemMessage
        }));
      }
    } catch (error) {
      console.error(`Error loading from IndexedDB: ${error}`);
    }

    // localStorage 폴백
    console.log('Falling back to localStorage...');
  const json = typeof localStorage !== 'undefined' ? localStorage.getItem('CHAT_SESSIONS') : null;
    if (json) {
      try {
        const parsed: SessionDto[] = JSON.parse(json);
        if (parsed) {
          console.log(`Loaded ${parsed.length} sessions from localStorage fallback`);
          return parsed.map(d => ({
            id: d.id,
            title: d.title,
            history: d.history.map(x => ({ 
              role: x.role as 'user' | 'assistant' | 'system', 
              text: x.text 
            })),
            lastUpdated: new Date(d.lastUpdated),
            systemMessage: d.systemMessage
          }));
        }
      } catch (parseError) {
        console.error('Error parsing localStorage sessions:', parseError);
      }
    }

    return [];
  }

  // 설정 저장
  static async saveSetting(key: string, value: any): Promise<void> {
    try {
      await chatStorage.saveSetting(key, value);
    } catch (error) {
      // localStorage 폴백
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {
          // ignore write error (quota exceeded or unavailable)
        }
      }
    }
  }

  // 설정 로드
  static async loadSetting(key: string): Promise<any> {
    try {
      return await chatStorage.loadSetting(key);
    } catch (error) {
      // localStorage 폴백
  const item = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : null;
    }
  }

  // 스토리지 테스트
  static async testStorage(): Promise<boolean> {
    return await chatStorage.test();
  }

  // 스토리지 초기화
  static async clearStorage(): Promise<boolean> {
    try {
      await chatStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }

  // 도구 저장
  static async saveTools(tools: StoredTool[]): Promise<void> {
    try {
      await chatStorage.saveTools(tools);
    } catch (error) {
      console.error('Error saving tools to IndexedDB:', error);
      // localStorage 폴백
      if (typeof localStorage !== 'undefined') {
        try { 
          localStorage.setItem('CHAT_TOOLS', JSON.stringify(tools)); 
        } catch {
          // ignore write error (quota exceeded or unavailable)
        }
      }
    }
  }

  // 도구 로드
  static async loadTools(): Promise<StoredTool[]> {
    try {
      return await chatStorage.loadTools();
    } catch (error) {
      console.error('Error loading tools from IndexedDB:', error);
      // localStorage 폴백
      const item = typeof localStorage !== 'undefined' ? localStorage.getItem('CHAT_TOOLS') : null;
      return item ? JSON.parse(item) : [];
    }
  }

  // 단일 도구 저장
  static async saveTool(tool: StoredTool): Promise<void> {
    try {
      await chatStorage.saveTool(tool);
    } catch (error) {
      console.error('Error saving tool to IndexedDB:', error);
      // 폴백: 전체 도구 목록을 다시 로드해서 업데이트
      const tools = await this.loadTools();
      const existingIndex = tools.findIndex(t => t.id === tool.id);
      if (existingIndex >= 0) {
        tools[existingIndex] = tool;
      } else {
        tools.push(tool);
      }
      await this.saveTools(tools);
    }
  }

  // 도구 삭제
  static async deleteTool(id: string): Promise<void> {
    try {
      await chatStorage.deleteTool(id);
    } catch (error) {
      console.error('Error deleting tool from IndexedDB:', error);
      // 폴백: 전체 도구 목록을 다시 로드해서 업데이트
      const tools = await this.loadTools();
      const filtered = tools.filter(t => t.id !== id);
      await this.saveTools(filtered);
    }
  }
}