import React from 'react';
import { useToolStore } from '../../stores/toolStore';
import Icon from '../UI/Icon';
import ToolForm from './ToolForm';

const ToolsPanel: React.FC = () => {
  const {
    tools,
    isLoading,
    error,
    isCreating,
    isEditing,
    startCreating,
    startEditing,
    deleteTool
  } = useToolStore();

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`도구 "${name}"을 삭제하시겠습니까?`)) {
      await deleteTool(id);
    }
  };

  if (isCreating || isEditing) {
    return <ToolForm />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-border/60 bg-surface-alt/60 backdrop-blur">
        <h1 className="text-xl font-semibold">도구 관리</h1>
        <button
          onClick={startCreating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-medium transition-colors"
        >
          <Icon name="plus" size={16} />
          새 도구 만들기
        </button>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {tools.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <Icon name="wrench" size={48} className="mx-auto mb-4 opacity-50" />
                <p>등록된 도구가 없습니다.</p>
                <p className="text-sm mt-1">새 도구를 만들어보세요.</p>
              </div>
            ) : (
              tools.map((tool) => (
                <div
                  key={tool.id}
                  className="border border-border/60 rounded-lg p-4 bg-surface hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg mb-1">{tool.name}</h3>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => startEditing(tool)}
                        className="p-2 text-neutral-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="편집"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(tool.id, tool.name)}
                        className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="삭제"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 매개변수 정보 */}
                  {tool.parameters?.properties && Object.keys(tool.parameters.properties).length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">매개변수:</h4>
                      <div className="space-y-1">
                        {Object.entries(tool.parameters.properties).map(([key, param]) => (
                          <div key={key} className="text-xs">
                            <span className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                              {key}
                            </span>
                            {tool.parameters?.required?.includes(key) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            {param.description && (
                              <span className="text-neutral-500 ml-2">- {param.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 메타데이터 */}
                  <div className="text-xs text-neutral-500 space-y-1">
                    <div>생성: {new Date(tool.createdAt).toLocaleString('ko-KR')}</div>
                    {tool.updatedAt !== tool.createdAt && (
                      <div>수정: {new Date(tool.updatedAt).toLocaleString('ko-KR')}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPanel;