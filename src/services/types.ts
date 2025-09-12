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

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookPage {
  pageNumber: number;
  title: string;
  content: string;
}

export interface BookDto {
  id: string;
  title: string;
  author: string;
  description?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}