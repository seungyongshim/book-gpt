import { useState } from 'react';
import Button from '../UI/Button';
import Icon from '../UI/Icon';
import SettingsSection from '../UI/SettingsSection';
import StatusChip from '../UI/StatusChip';
import { ShortcutHelp } from '../UI/KeyboardShortcuts';
import { useChatStore } from '../../stores/chatStore';
import { StorageService } from '../../services/storageService';
import { chatService } from '../../services/chatService';

const SettingsPanel = () => {
  const showSettingsOverlay = useChatStore(state => state.showSettingsOverlay);
  const systemMessage = useChatStore(state => state.systemMessage);
  const maxTokens = useChatStore(state => state.maxTokens);
  const selectedModel = useChatStore(state => state.selectedModel);

  const setSystemMessage = useChatStore(state => state.setSystemMessage);
  const setMaxTokens = useChatStore(state => state.setMaxTokens);
  const saveModelSettings = useChatStore(state => state.saveModelSettings);
  const closeSettingsOverlay = useChatStore(state => state.closeSettingsOverlay);

  const [localSystemMessage, setLocalSystemMessage] = useState(systemMessage);
  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens?.toString() || '');
  const [defaultModel, setDefaultModel] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionOk, setConnectionOk] = useState(false);

  if (!showSettingsOverlay) return null;

  const handleSystemMessageChange = async () => {
    await setSystemMessage(localSystemMessage);
    setSaveStatus('시스템 메시지가 저장되었습니다.');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleModelSettingsChange = async () => {
    const tokens = localMaxTokens ? parseInt(localMaxTokens) : null;
    setMaxTokens(tokens);
    await saveModelSettings();
    setSaveStatus('모델 설정이 저장되었습니다.');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleSaveDefaults = async () => {
    localStorage.setItem('DEFAULT_MODEL', defaultModel);
    setSaveStatus('기본 설정이 저장되었습니다.');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleTestConnection = async () => {
    try {
      const models = await chatService.getModels();
      const ok = models.length >= 0; // 단순 호출 성공 여부
      setConnectionOk(ok);
      setConnectionStatus(ok ? 'copilot-api 연결 성공' : '모델 목록이 비어있습니다');
    } catch (error) {
      setConnectionOk(false);
      setConnectionStatus(`연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestIndexedDB = async () => {
    try {
      const result = await StorageService.testStorage();
      setConnectionStatus(result ? 'IndexedDB 테스트 성공' : 'IndexedDB 테스트 실패');
      setConnectionOk(result);
    } catch (error) {
      setConnectionStatus(`IndexedDB 테스트 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setConnectionOk(false);
    }
  };

  const handleClearIndexedDB = async () => {
    try {
      const result = await StorageService.clearStorage();
      setConnectionStatus(result ? 'IndexedDB 초기화 완료' : 'IndexedDB 초기화 실패');
      setConnectionOk(result);
      if (result) {
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (error) {
      setConnectionStatus(`IndexedDB 초기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setConnectionOk(false);
    }
  };

  return (
    <div className="settings-overlay" aria-modal="true" role="dialog">
      <div className="settings-panel">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-semibold">설정</h5>
          <button
            className="icon-btn"
            onClick={closeSettingsOverlay}
            title="닫기"
            aria-label="설정 닫기"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="space-y-10">
          <SettingsSection title="시스템 메시지">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400" htmlFor="system-message">시스템 메시지</label>
            <textarea
              id="system-message"
              className="settings-textarea"
              value={localSystemMessage}
              onChange={(e) => setLocalSystemMessage(e.target.value)}
              placeholder="시스템 메시지를 입력하세요..."
              rows={4}
            />
            <Button onClick={handleSystemMessageChange} variant="primary" leftIcon="check">시스템 메시지 저장</Button>
          </SettingsSection>

          <SettingsSection title={`현재 모델 설정 (${selectedModel})`}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400" htmlFor="max-tokens">최대 토큰 수</label>
              <input
                id="max-tokens"
                type="number"
                className="settings-input"
                value={localMaxTokens}
                onChange={(e) => setLocalMaxTokens(e.target.value)}
                placeholder="비워두면 제한 없음"
                min={1}
                max={100000}
              />
            </div>
            <Button onClick={handleModelSettingsChange} variant="primary" leftIcon="check">모델 설정 저장</Button>
          </SettingsSection>

          <SettingsSection title="기본 설정">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400" htmlFor="default-model">기본 모델</label>
              <input
                id="default-model"
                type="text"
                className="settings-input"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="기본 모델명을 입력하세요"
              />
            </div>
            <Button onClick={handleSaveDefaults} variant="secondary" leftIcon="check">기본 설정 저장</Button>
          </SettingsSection>

          <SettingsSection title="연결 테스트">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleTestConnection} variant="secondary" leftIcon="loop">API 연결 테스트</Button>
              <Button onClick={handleTestIndexedDB} variant="secondary" leftIcon="data-transfer-download">IndexedDB 테스트</Button>
              <Button onClick={handleClearIndexedDB} variant="danger" leftIcon="trash">데이터 초기화</Button>
            </div>
            {connectionStatus && (
              <StatusChip state={connectionOk ? 'success' : 'error'} icon={connectionOk ? 'check' : 'warning'}>
                {connectionStatus}
              </StatusChip>
            )}
          </SettingsSection>

          <SettingsSection title="키보드 단축키">
            <ShortcutHelp />
          </SettingsSection>

          {saveStatus && (
            <StatusChip state="success" icon="check">
              {saveStatus}
            </StatusChip>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;