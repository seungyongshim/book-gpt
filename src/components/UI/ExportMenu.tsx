/**
 * 내보내기 메뉴 컴포넌트
 * 대화 내용을 다양한 형식으로 내보내기
 */

import React, { useState } from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
import { useChatStore } from '../../stores/chatStore';
import { exportConversation, ExportOptions } from '../../services/exportService';
import { toast } from './Toast';

interface ExportMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ isOpen, onClose }) => {
  const messages = useChatStore(state => state.messages);
  const currentSession = useChatStore(state => state.currentSession);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'markdown',
    includeTimestamps: true,
    includeMetadata: true,
  });

  if (!isOpen) return null;

  const handleExport = async (format: ExportOptions['format']) => {
    if (messages.length === 0) {
      toast.warning('내보낼 메시지가 없습니다.');
      return;
    }

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        ...exportOptions,
        format,
      };

      const success = await exportConversation(messages, currentSession, options);
      
      if (success) {
        toast.success(`${format.toUpperCase()} 파일로 성공적으로 내보냈습니다.`);
        onClose();
      } else {
        toast.error('내보내기에 실패했습니다.');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      format: 'markdown' as const,
      label: 'Markdown',
      description: '마크다운 형식 (.md)',
      icon: 'document-text'
    },
    {
      format: 'text' as const,
      label: '텍스트',
      description: '평문 텍스트 (.txt)',
      icon: 'document'
    },
    {
      format: 'json' as const,
      label: 'JSON',
      description: 'JSON 형식 (.json)',
      icon: 'code'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 메뉴 */}
      <div className="relative bg-surface border border-border rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">대화 내보내기</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="닫기"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* 옵션 설정 */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="include-timestamps"
              checked={exportOptions.includeTimestamps}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                includeTimestamps: e.target.checked
              }))}
              className="rounded border-border focus:ring-primary focus:ring-2 focus:ring-offset-0"
            />
            <label htmlFor="include-timestamps" className="text-sm">
              타임스탬프 포함
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="include-metadata"
              checked={exportOptions.includeMetadata}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                includeMetadata: e.target.checked
              }))}
              className="rounded border-border focus:ring-primary focus:ring-2 focus:ring-offset-0"
            />
            <label htmlFor="include-metadata" className="text-sm">
              메타데이터 포함
            </label>
          </div>
        </div>

        {/* 형식 선택 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium mb-3">내보내기 형식</h4>
          
          {formatOptions.map(({ format, label, description, icon }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting}
              className="w-full flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name={icon as any} className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  {description}
                </div>
              </div>
              {isExporting && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>

        {/* 메시지 정보 */}
        <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            내보낼 메시지: <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {messages.length}개
            </span>
          </div>
          {currentSession && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              대화 제목: <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {currentSession.title}
              </span>
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="flex justify-end mt-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};