import { Session, SessionDto } from './types';
import { StorageHandler } from './storageUtils';
import { sessionsToDto, dtosToSessions, validateSessionDto } from './dataTransformers';

// IndexedDB를 사용한 채팅 데이터 저장소
class ChatStorage {
  private dbName = 'ChatAppDB';
  private version = 1;
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
    const sessionDtos = sessionsToDto(sessions);
    
    console.log(`Attempting to save ${sessionDtos.length} sessions to IndexedDB...`);
    
    return StorageHandler.saveWithFallback(
      'CHAT_SESSIONS',
      sessionDtos,
      async (data) => await chatStorage.saveSessions(data)
    );
  }

  // 세션 로드 (IndexedDB 우선, localStorage 폴백)
  static async loadSessions(): Promise<Session[]> {
    const sessionDtos = await StorageHandler.loadWithFallback<SessionDto[]>(
      'CHAT_SESSIONS',
      async () => await chatStorage.loadSessions(),
      (data: SessionDto[]) => {
        // Validate and filter valid sessions
        return data.filter(validateSessionDto);
      }
    );

    if (sessionDtos && sessionDtos.length > 0) {
      return dtosToSessions(sessionDtos);
    }

    return [];
  }

  // 설정 저장
  static async saveSetting(key: string, value: any): Promise<void> {
    return StorageHandler.saveSetting(key, value);
  }

  // 설정 로드
  static async loadSetting(key: string): Promise<any> {
    return StorageHandler.loadSetting(key);
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
}