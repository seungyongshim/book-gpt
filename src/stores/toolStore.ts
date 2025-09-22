import { create } from 'zustand';
import { StoredTool } from '../services/types';
import { StorageService } from '../services/storageService';
import { invalidateToolsCache } from '../services/toolService';

// 간단한 UUID 생성 함수
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 기본 도구들 (기존 하드코딩된 도구들을 마이그레이션)
const getDefaultTools = (): StoredTool[] => {
  const now = new Date().toISOString();
  return [
    {
      id: generateId(),
      name: 'get_current_time',
      description: '현재 UTC 시간을 ISO 문자열로 반환합니다.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      executeCode: 'return new Date().toISOString();',
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      name: 'echo',
      description: 'text 필드를 그대로 반환합니다.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '반환할 문자열' }
        },
        required: ['text']
      },
      executeCode: `
if (!args || typeof args.text !== 'string' || args.text.length === 0) {
  return 'Invalid: expected non-empty string field "text"';
}
return args.text;
      `.trim(),
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      name: 'directing',
      description: '소설/영화 장면을 연출합니다. 장소, 등장인물, 상황, 소품 등을 설명합니다.',
      parameters: {
        type: 'object',
        properties: {
          stage: { type: 'string', description: '연출할 장면 설명' }
        },
        required: ['stage']
      },
      executeCode: 'return "directinged";',
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      name: 'think',
      description: 'Use the tool to think about something. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.',
      parameters: {
        type: 'object',
        properties: {
          thought: { type: 'string', description: 'A thought to think about.' }
        },
        required: ['thought']
      },
      executeCode: 'return "thought";',
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      name: 'story',
      description: '줄거리를 작성합니다. 약 2000자 정도의 이야기 줄거리를 입력받습니다.',
      parameters: {
        type: 'object',
        properties: {
          storyline: { type: 'string', description: '이야기의 줄거리 (약 2000자)' }
        },
        required: ['storyline']
      },
      executeCode: 'return "ok";',
      enabled: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: generateId(),
      name: 'translate_text',
      description: '텍스트를 다른 언어로 번역합니다. GPT를 사용하여 정확한 번역을 제공합니다.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '번역할 텍스트' },
          target_language: { type: 'string', description: '대상 언어 (예: English, 한국어, 日本語, Français)' }
        },
        required: ['text', 'target_language']
      },
      executeCode: `
const messages = [
  { role: 'system', text: 'You are a professional translator. Provide accurate and natural translations.' },
  { role: 'user', text: \`Translate the following text to \${args.target_language}: "\${args.text}"\` }
];

const result = await callGPT({
  messages: messages,
  model: 'gpt-4o',
  temperature: 0.3
});

return result.content;
      `.trim(),
      enabled: true,
      createdAt: now,
      updatedAt: now
    }
  ];
};

export interface ToolState {
  // 도구 데이터
  tools: StoredTool[];
  isLoading: boolean;
  error: string | null;

  // UI 상태
  isEditing: boolean;
  editingTool: StoredTool | null;
  isCreating: boolean;

  // 액션
  loadTools: () => Promise<void>;
  saveTool: (tool: Omit<StoredTool, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTool: (tool: StoredTool) => Promise<void>;
  deleteTool: (id: string) => Promise<void>;
  toggleTool: (id: string) => Promise<void>;
  
  // UI 액션
  startCreating: () => void;
  startEditing: (tool: StoredTool) => void;
  cancelEditing: () => void;
  
  // 초기화
  initializeTools: () => Promise<void>;
}

export const useToolStore = create<ToolState>((set, get) => ({
  // 초기 상태
  tools: [],
  isLoading: false,
  error: null,
  isEditing: false,
  editingTool: null,
  isCreating: false,

  // 도구 로드
  loadTools: async () => {
    set({ isLoading: true, error: null });
    try {
      const tools = await StorageService.loadTools();
      set({ tools, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load tools', isLoading: false });
    }
  },

  // 새 도구 저장
  saveTool: async (toolData) => {
    set({ isLoading: true, error: null });
    try {
      const now = new Date().toISOString();
      const tool: StoredTool = {
        ...toolData,
        id: generateId(),
        enabled: toolData.enabled ?? true, // Default to enabled
        createdAt: now,
        updatedAt: now
      };
      
      await StorageService.saveTool(tool);
      const currentTools = get().tools;
      set({ 
        tools: [...currentTools, tool], 
        isLoading: false,
        isCreating: false,
        editingTool: null 
      });
      
      // 도구 캐시 무효화
      invalidateToolsCache();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save tool', isLoading: false });
    }
  },

  // 도구 업데이트
  updateTool: async (tool) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTool = {
        ...tool,
        updatedAt: new Date().toISOString()
      };
      
      await StorageService.saveTool(updatedTool);
      const currentTools = get().tools;
      const updatedTools = currentTools.map(t => t.id === updatedTool.id ? updatedTool : t);
      set({ 
        tools: updatedTools, 
        isLoading: false,
        isEditing: false,
        editingTool: null 
      });
      
      // 도구 캐시 무효화
      invalidateToolsCache();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update tool', isLoading: false });
    }
  },

  // 도구 삭제
  deleteTool: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await StorageService.deleteTool(id);
      const currentTools = get().tools;
      const filteredTools = currentTools.filter(t => t.id !== id);
      set({ tools: filteredTools, isLoading: false });
      
      // 도구 캐시 무효화
      invalidateToolsCache();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete tool', isLoading: false });
    }
  },

  // 도구 활성화/비활성화 토글
  toggleTool: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const currentTools = get().tools;
      const tool = currentTools.find(t => t.id === id);
      if (!tool) {
        throw new Error('Tool not found');
      }

      const updatedTool = {
        ...tool,
        enabled: !tool.enabled,
        updatedAt: new Date().toISOString()
      };
      
      await StorageService.saveTool(updatedTool);
      const updatedTools = currentTools.map(t => t.id === id ? updatedTool : t);
      set({ tools: updatedTools, isLoading: false });
      
      // 도구 캐시 무효화
      invalidateToolsCache();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to toggle tool', isLoading: false });
    }
  },

  // UI 액션들
  startCreating: () => {
    set({ isCreating: true, isEditing: false, editingTool: null });
  },

  startEditing: (tool) => {
    set({ isEditing: true, isCreating: false, editingTool: tool });
  },

  cancelEditing: () => {
    set({ isEditing: false, isCreating: false, editingTool: null });
  },

  // 초기화 (첫 실행시 기본 도구들 마이그레이션)
  initializeTools: async () => {
    set({ isLoading: true, error: null });
    try {
      let tools = await StorageService.loadTools();
      
      // 도구가 없으면 기본 도구들을 추가
      if (tools.length === 0) {
        const defaultTools = getDefaultTools();
        await StorageService.saveTools(defaultTools);
        tools = defaultTools;
      }
      
      set({ tools, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to initialize tools', isLoading: false });
    }
  }
}));