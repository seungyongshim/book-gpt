import { useState } from 'react';
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
      setConnectionOk(models.length >= 0);
      setConnectionStatus(connectionOk ? 'copilot-api 연결 성공' : '모델 목록이 비어있습니다');
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
        // 페이지 새로고침으로 앱 재초기화
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      setConnectionStatus(`IndexedDB 초기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setConnectionOk(false);
    }
  };

  return (
    <div className="settings__overlay" aria-modal="true" role="dialog">
      <div className="settings__panel">
        <div className="settings__header">
          <h5>설정</h5>
          <button
            className="settings__close-btn"
            onClick={closeSettingsOverlay}
            title="닫기"
            aria-label="설정 닫기"
          >
            <i className="oi oi-x"></i>
          </button>
        </div>

        <div className="settings__body">
          {/* 시스템 메시지 설정 */}
          <section className="settings__section">
            <div className="settings__section-header">
              <h6 className="settings__section-title">시스템 메시지</h6>
            </div>
            <div className="settings__section-content">
              <label className="form-label" htmlFor="system-message">시스템 메시지</label>
              <textarea
                id="system-message"
                className="form-control"
                value={localSystemMessage}
                onChange={(e) => setLocalSystemMessage(e.target.value)}
                placeholder="시스템 메시지를 입력하세요..."
                rows={4}
              />
              <div className="btn-group">
                <button onClick={handleSystemMessageChange} className="btn btn--primary">
                  시스템 메시지 저장
                </button>
              </div>
            </div>
          </section>

          {/* 모델 설정 */}
          <section className="settings__section">
            <div className="settings__section-header">
              <h6 className="settings__section-title">현재 모델 설정 ({selectedModel})</h6>
            </div>
            <div className="settings__section-content">
              <div className="form-group">
                <label className="form-label" htmlFor="max-tokens">최대 토큰 수</label>
                <input
                  id="max-tokens"
                  type="number"
                  className="form-control"
                  value={localMaxTokens}
                  onChange={(e) => setLocalMaxTokens(e.target.value)}
                  placeholder="비워두면 제한 없음"
                  min={1}
                  max={100000}
                />
              </div>
              <div className="btn-group">
                <button onClick={handleModelSettingsChange} className="btn btn--primary">
                  모델 설정 저장
                </button>
              </div>
            </div>
          </section>

          {/* 기본 설정 */}
          <section className="settings__section">
            <div className="settings__section-header">
              <h6 className="settings__section-title">기본 설정</h6>
            </div>
            <div className="settings__section-content">
              <div className="form-group">
                <label className="form-label" htmlFor="default-model">기본 모델</label>
                <input
                  id="default-model"
                  type="text"
                  className="form-control"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  placeholder="기본 모델명을 입력하세요"
                />
              </div>
              <div className="btn-group">
                <button onClick={handleSaveDefaults} className="btn btn--secondary">
                  기본 설정 저장
                </button>
              </div>
            </div>
          </section>

          {/* 연결 테스트 */}
          <section className="settings__section">
            <div className="settings__section-header">
              <h6 className="settings__section-title">연결 테스트</h6>
            </div>
            <div className="settings__section-content">
              <div className="btn-group">
                <button onClick={handleTestConnection} className="btn btn--secondary">
                  API 연결 테스트
                </button>
                <button onClick={handleTestIndexedDB} className="btn btn--secondary">
                  IndexedDB 테스트
                </button>
                <button onClick={handleClearIndexedDB} className="btn btn--danger">
                  데이터 초기화
                </button>
              </div>
              {connectionStatus && (
                <div className={`connection-status ${connectionOk ? 'success' : 'error'}`}>
                  <i className={`oi ${connectionOk ? 'oi-check' : 'oi-warning'}`}></i>
                  {connectionStatus}
                </div>
              )}
            </div>
          </section>

          {/* 저장 상태 */}
          {saveStatus && (
            <div className="save-status success">
              <i className="oi oi-check"></i>
              {saveStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;