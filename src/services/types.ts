// 타입 정의
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  text: string;
}

export interface Session {
  id: string;
  title: string;
  history: ChatMessage[];
  lastUpdated: Date;
  systemMessage?: string;
}

export interface SessionDto {
  id: string;
  title: string;
  history: { role: string; text: string }[];
  lastUpdated: string;
  systemMessage?: string;
}

export interface ModelSettings {
  temperature?: number;
  maxTokens?: number;
}

export interface UsageInfo {
  premiumRequestsLeft?: number;
  totalPremiumRequests?: number;
  premiumRequestsUsed?: number;
}

// Book-related types
export interface BookChapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  order: number;
  lastUpdated: Date;
}

export interface BookProject {
  id: string;
  title: string;
  description?: string;
  author?: string;
  genre?: string;
  targetWordCount?: number;
  chapters: BookChapter[];
  lastUpdated: Date;
  currentChapterId?: string | null; // 변경: null도 허용
}

export interface BookProjectDto {
  id: string;
  title: string;
  description?: string;
  author?: string;
  genre?: string;
  targetWordCount?: number;
  chapters: {
    id: string;
    title: string;
    content: string;
    wordCount: number;
    order: number;
    lastUpdated: string;
  }[];
  lastUpdated: string;
  currentChapterId?: string | null; // 변경: null도 허용
}

export type AppMode = 'chat' | 'book';