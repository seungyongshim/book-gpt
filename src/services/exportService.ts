/**
 * 파일 내보내기 서비스
 * 대화 내용을 다양한 형식으로 내보내기 기능 제공
 */

import { ChatMessage, Session } from './types';
import { formatDate } from '../utils';

export interface ExportOptions {
  format: 'markdown' | 'text' | 'json';
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
  fileName?: string;
}

/**
 * 대화 내용을 Markdown 형식으로 변환
 */
const convertToMarkdown = (
  messages: ChatMessage[],
  session: Session | null,
  options: ExportOptions
): string => {
  let content = '';

  // 메타데이터 추가
  if (options.includeMetadata && session) {
    content += `# ${session.title}\n\n`;
    content += `**생성일**: ${formatDate(session.lastUpdated)}\n`;
    content += `**마지막 수정**: ${formatDate(session.lastUpdated)}\n`;
    content += `**메시지 수**: ${messages.length}\n\n`;
    content += '---\n\n';
  }

  // 메시지 변환
  messages.forEach((message, index) => {
    const role = message.role === 'user' ? '사용자' : 'AI 어시스턴트';
    
    content += `## ${role}\n\n`;
    content += `${message.text}\n\n`;
    
    // 마지막 메시지가 아니면 구분선 추가
    if (index < messages.length - 1) {
      content += '---\n\n';
    }
  });

  return content;
};

/**
 * 대화 내용을 플레인 텍스트로 변환
 */
const convertToText = (
  messages: ChatMessage[],
  session: Session | null,
  options: ExportOptions
): string => {
  let content = '';

  // 메타데이터 추가
  if (options.includeMetadata && session) {
    content += `${session.title}\n`;
    content += `=${'='.repeat(session.title.length)}\n\n`;
    content += `생성일: ${formatDate(session.lastUpdated)}\n`;
    content += `마지막 수정: ${formatDate(session.lastUpdated)}\n`;
    content += `메시지 수: ${messages.length}\n\n`;
    content += '-'.repeat(50) + '\n\n';
  }

  // 메시지 변환
  messages.forEach((message, index) => {
    const role = message.role === 'user' ? '[사용자]' : '[AI 어시스턴트]';
    
    content += `${role}:\n`;
    content += `${message.text}\n\n`;
    
    // 마지막 메시지가 아니면 구분선 추가
    if (index < messages.length - 1) {
      content += '-'.repeat(30) + '\n\n';
    }
  });

  return content;
};

/**
 * 대화 내용을 JSON 형식으로 변환
 */
const convertToJSON = (
  messages: ChatMessage[],
  session: Session | null,
  options: ExportOptions
): string => {
  const exportData = {
    metadata: options.includeMetadata && session ? {
      title: session.title,
      lastUpdated: session.lastUpdated,
      messageCount: messages.length,
      exportedAt: new Date().toISOString(),
    } : undefined,
    messages: messages
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * 파일 다운로드 트리거
 */
const downloadFile = (content: string, fileName: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  
  // 정리
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 대화 내용 내보내기
 */
export const exportConversation = (
  messages: ChatMessage[],
  session: Session | null,
  options: ExportOptions
): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (messages.length === 0) {
        console.warn('내보낼 메시지가 없습니다.');
        resolve(false);
        return;
      }

      let content: string;
      let fileName: string;
      let mimeType: string;

      // 파일명 생성
      const baseFileName = options.fileName || 
        (session?.title ? session.title.replace(/[^a-zA-Z0-9가-힣]/g, '_') : 'conversation');
      const timestamp = new Date().toISOString().slice(0, 10);

      switch (options.format) {
        case 'markdown':
          content = convertToMarkdown(messages, session, options);
          fileName = `${baseFileName}_${timestamp}.md`;
          mimeType = 'text/markdown';
          break;
        
        case 'text':
          content = convertToText(messages, session, options);
          fileName = `${baseFileName}_${timestamp}.txt`;
          mimeType = 'text/plain';
          break;
        
        case 'json':
          content = convertToJSON(messages, session, options);
          fileName = `${baseFileName}_${timestamp}.json`;
          mimeType = 'application/json';
          break;
        
        default:
          console.error('지원하지 않는 내보내기 형식:', options.format);
          resolve(false);
          return;
      }

      downloadFile(content, fileName, mimeType);
      resolve(true);
    } catch (error) {
      console.error('내보내기 중 오류 발생:', error);
      resolve(false);
    }
  });
};

/**
 * 모든 세션 내보내기 (일괄 다운로드)
 */
export const exportAllSessions = async (
  sessions: Session[],
  options: Omit<ExportOptions, 'fileName'>
): Promise<boolean> => {
  try {
    if (sessions.length === 0) {
      console.warn('내보낼 세션이 없습니다.');
      return false;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    let allContent = '';
    
    if (options.format === 'json') {
      // JSON 형식은 전체를 하나의 배열로
      const allData = sessions.map(session => ({
        metadata: options.includeMetadata ? {
          title: session.title,
          lastUpdated: session.lastUpdated,
          messageCount: session.history.length,
        } : undefined,
        messages: session.history
      }));
      
      allContent = JSON.stringify({
        exportedAt: new Date().toISOString(),
        sessionCount: sessions.length,
        sessions: allData
      }, null, 2);
      
      downloadFile(allContent, `all_conversations_${timestamp}.json`, 'application/json');
    } else {
      // Markdown/Text 형식은 각 세션을 구분
      sessions.forEach((session, index) => {
        if (options.format === 'markdown') {
          allContent += convertToMarkdown(session.history, session, options);
        } else {
          allContent += convertToText(session.history, session, options);
        }
        
        // 마지막 세션이 아니면 페이지 구분 추가
        if (index < sessions.length - 1) {
          allContent += options.format === 'markdown' 
            ? '\n\n\\pagebreak\n\n' 
            : '\n\n' + '='.repeat(80) + '\n\n';
        }
      });
      
      const extension = options.format === 'markdown' ? 'md' : 'txt';
      const mimeType = options.format === 'markdown' ? 'text/markdown' : 'text/plain';
      
      downloadFile(allContent, `all_conversations_${timestamp}.${extension}`, mimeType);
    }

    return true;
  } catch (error) {
    console.error('일괄 내보내기 중 오류 발생:', error);
    return false;
  }
};

/**
 * 대화 기록 가져오기 (JSON 파일 읽기)
 */
export const importConversations = (file: File): Promise<Session[]> => {
  return new Promise((resolve, reject) => {
    if (!file.type.includes('json')) {
      reject(new Error('JSON 파일만 가져올 수 있습니다.'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        // 단일 세션 형식인지 다중 세션 형식인지 확인
        if (Array.isArray(data.sessions)) {
          // 다중 세션 형식
          resolve(data.sessions);
        } else if (data.messages) {
          // 단일 세션 형식
          resolve([data]);
        } else {
          reject(new Error('올바르지 않은 파일 형식입니다.'));
        }
      } catch (error) {
        reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };
    
    reader.readAsText(file);
  });
};