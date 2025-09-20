import React, { useState, useEffect } from 'react';
import { useToolStore } from '../../stores/toolStore';
import Icon from '../UI/Icon';
import { StoredTool } from '../../services/types';

interface ParameterField {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

const ToolForm: React.FC = () => {
  const {
    isCreating,
    isEditing,
    editingTool,
    saveTool,
    updateTool,
    cancelEditing
  } = useToolStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    executeCode: '',
    enabled: true
  });

  const [parameters, setParameters] = useState<ParameterField[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 편집 모드에서 기존 도구 데이터 로드
  useEffect(() => {
    if (isEditing && editingTool) {
      setFormData({
        name: editingTool.name,
        description: editingTool.description,
        executeCode: editingTool.executeCode,
        enabled: editingTool.enabled
      });

      // 매개변수 로드
      if (editingTool.parameters?.properties) {
        const paramFields: ParameterField[] = Object.entries(editingTool.parameters.properties).map(([name, param]) => ({
          name,
          type: param.type || 'string',
          description: param.description || '',
          required: editingTool.parameters?.required?.includes(name) || false
        }));
        setParameters(paramFields);
      }
    } else {
      // 새 도구 생성 모드
      setFormData({ name: '', description: '', executeCode: '', enabled: true });
      setParameters([]);
    }
    setErrors({});
  }, [isCreating, isEditing, editingTool]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '도구 이름은 필수입니다.';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = '도구 이름은 영문자, 숫자, 언더스코어만 사용할 수 있으며 숫자로 시작할 수 없습니다.';
    }

    if (!formData.description.trim()) {
      newErrors.description = '도구 설명은 필수입니다.';
    }

    if (!formData.executeCode.trim()) {
      newErrors.executeCode = '실행 코드는 필수입니다.';
    }

    // 매개변수 검증
    parameters.forEach((param, index) => {
      if (!param.name.trim()) {
        newErrors[`param_name_${index}`] = '매개변수 이름은 필수입니다.';
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param.name)) {
        newErrors[`param_name_${index}`] = '매개변수 이름은 영문자, 숫자, 언더스코어만 사용할 수 있습니다.';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 매개변수 스키마 구성
    const parameterSchema = parameters.length > 0 ? {
      type: 'object' as const,
      properties: parameters.reduce((acc, param) => {
        acc[param.name] = {
          type: param.type,
          description: param.description
        };
        return acc;
      }, {} as Record<string, any>),
      required: parameters.filter(p => p.required).map(p => p.name)
    } : undefined;

    try {
      if (isEditing && editingTool) {
        const updatedTool: StoredTool = {
          ...editingTool,
          ...formData,
          parameters: parameterSchema
        };
        await updateTool(updatedTool);
      } else {
        await saveTool({
          ...formData,
          parameters: parameterSchema
        });
      }
    } catch (error) {
      console.error('Failed to save tool:', error);
    }
  };

  const addParameter = () => {
    setParameters([...parameters, { name: '', type: 'string', description: '', required: false }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: keyof ParameterField, value: string | boolean) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-border/60 bg-surface-alt/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={cancelEditing}
            className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="text-xl font-semibold">
            {isEditing ? '도구 편집' : '새 도구 만들기'}
          </h1>
        </div>
      </div>

      {/* 폼 */}
      <div className="flex-1 overflow-auto p-4">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                도구 이름 *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border/60 rounded-md bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="예: calculate_sum"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                도구 설명 *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-border/60 rounded-md bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="이 도구가 무엇을 하는지 설명해주세요..."
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>
          </div>

          {/* 매개변수 설정 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">매개변수</h3>
              <button
                type="button"
                onClick={addParameter}
                className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
              >
                <Icon name="plus" size={14} />
                매개변수 추가
              </button>
            </div>

            {parameters.length === 0 ? (
              <p className="text-neutral-500 text-sm italic">매개변수가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {parameters.map((param, index) => (
                  <div key={index} className="border border-border/60 rounded-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">매개변수 {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeParameter(index)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">이름 *</label>
                        <input
                          type="text"
                          value={param.name}
                          onChange={(e) => updateParameter(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border/60 rounded bg-surface focus:ring-1 focus:ring-primary/50 focus:border-primary"
                          placeholder="예: text"
                        />
                        {errors[`param_name_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`param_name_${index}`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">타입</label>
                        <select
                          value={param.type}
                          onChange={(e) => updateParameter(index, 'type', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border/60 rounded bg-surface focus:ring-1 focus:ring-primary/50 focus:border-primary"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="array">array</option>
                          <option value="object">object</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-1">설명</label>
                      <input
                        type="text"
                        value={param.description}
                        onChange={(e) => updateParameter(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-border/60 rounded bg-surface focus:ring-1 focus:ring-primary/50 focus:border-primary"
                        placeholder="이 매개변수에 대한 설명..."
                      />
                    </div>

                    <div className="mt-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                          className="rounded border-border/60"
                        />
                        <span className="text-sm">필수 매개변수</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 실행 코드 */}
          <div>
            <label htmlFor="executeCode" className="block text-sm font-medium mb-2">
              실행 코드 *
            </label>
            <div className="text-xs text-neutral-500 mb-2">
              JavaScript 코드를 작성하세요. 매개변수는 <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">args</code> 객체로 접근할 수 있습니다.
            </div>
            <textarea
              id="executeCode"
              value={formData.executeCode}
              onChange={(e) => setFormData({ ...formData, executeCode: e.target.value })}
              rows={10}
              className="w-full px-3 py-2 border border-border/60 rounded-md bg-surface focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm"
              placeholder="return args.text;"
            />
            {errors.executeCode && <p className="text-red-500 text-sm mt-1">{errors.executeCode}</p>}
          </div>

          {/* 도구 활성화 상태 */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-border/60"
              />
              <span className="text-sm font-medium">도구 활성화</span>
            </label>
            <p className="text-xs text-neutral-500 mt-1">
              비활성화된 도구는 AI가 사용할 수 없습니다.
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={cancelEditing}
              className="px-4 py-2 text-neutral-600 border border-border/60 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors"
            >
              {isEditing ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ToolForm;