// 도메인 모델 인터페이스 정의
export interface BookMeta {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  worldSettingId?: string;
  systemPrompt?: string;
  meta?: {
    genre?: string;
    targetAudience?: string;
    tone?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface WorldSetting {
  bookId: string; // PK 동일
  premise?: string;
  timeline?: string;
  geography?: string;
  factions?: string;
  characters?: string; // 간단 JSON 문자열 or Markdown (MVP)
  magicOrTech?: string;
  constraints?: string;
  styleGuide?: string;
  version: number;
  updatedAt: number;
}

export type PageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface PageMeta {
  id: string;
  bookId: string;
  index: number; // 1-based
  slug?: string;
  title?: string;
  status: PageStatus;
  systemPrompt?: string;
  rawContent?: string;
  refinedContent?: string;
  summary?: string;
  /**
   * 총 사용 토큰(레거시) - 신규 필드 계산 후에도 역호환 위해 유지
   */
  tokensUsed?: number;
  /** 추정/실제 프롬프트 토큰 (실제 usage 노출 시 대체) */
  tokensPrompt?: number;
  /** 추정/실제 생성(completion) 토큰 */
  tokensCompletion?: number;
  modelMeta?: Record<string, any>;
  references?: ParsedReference[];
  createdAt: number;
  updatedAt: number;
}

export interface PageVersion {
  id: string;
  pageId: string;
  timestamp: number;
  diff?: string; // JSON.stringify([{t:'+'|'-'|'=', v:string}])
  contentSnapshot: string; // refinedContent 기준 (또는 raw)
  author: 'system' | 'user';
}

export interface ReferenceSummaryCache {
  pageId: string; // PK
  summary: string;
  updatedAt: number;
}

export interface WorldDerivedCache {
  id: string; // bookId + ':' + version
  bookId: string;
  worldVersion: number;
  summary: string;
  createdAt: number;
}

// 참조 파서 결과
export interface ParsedReference {
  type: 'page';
  refRaw: string; // @3, @3-5, @p:slug
  pageIds: string[]; // 해석된 page id들 (MVP에서는 index 문자열로 대체 가능)
  weight: number; // 기본 1, 중복시 증가
}

export interface PromptLayer {
  system?: string;
  bookSystem?: string;
  worldDerived?: string;
  pageSystem?: string;
  dynamicContext?: { ref: string; summary: string }[];
  userInstruction?: string;
}

export interface GenerationConfig {
  model: string;
  temperature: number;
  targetChars: number; // 목표 길이 (문자수)
}

export interface StreamChunk {
  text: string;
  done?: boolean;
}

// Model metadata (optional usage across UI)
export interface ModelInfo {
  id: string;
  label?: string;
  contextWindow?: number;
  recTemp?: number; // recommended temperature
  caps?: string[];  // capabilities
  meta?: Record<string, any>;
}
