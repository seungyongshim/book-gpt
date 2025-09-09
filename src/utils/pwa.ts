/**
 * PWA (Progressive Web App) 유틸리티
 * 서비스 워커 등록 및 PWA 기능 관리
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallManager {
  isInstallable: boolean;
  isInstalled: boolean;
  showInstallPrompt: () => Promise<boolean>;
  hideInstallPrompt: () => void;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installButton: HTMLElement | null = null;
  private isServiceWorkerSupported = 'serviceWorker' in navigator;
  private isInstallSupported = 'beforeinstallprompt' in window;
  
  constructor() {
    this.init();
  }

  /**
   * PWA 매니저 초기화
   */
  private async init(): Promise<void> {
    if (this.isServiceWorkerSupported) {
      await this.registerServiceWorker();
    }
    
    if (this.isInstallSupported) {
      this.setupInstallPrompt();
    }
    
    this.detectInstallation();
    this.setupAppUpdateCheck();
  }

  /**
   * 서비스 워커 등록
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker registered successfully:', registration.scope);
      
      // 업데이트 확인
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 새 버전 사용 가능 알림
              this.showUpdateAvailable();
            }
          });
        }
      });
      
      // 페이지 새로고침 시 서비스 워커 업데이트 확인
      if (registration.waiting) {
        this.showUpdateAvailable();
      }
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  /**
   * 앱 설치 프롬프트 설정
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      
      // 설치 버튼 표시
      this.showInstallButton();
      
      console.log('📱 App install prompt is available');
    });
    
    window.addEventListener('appinstalled', () => {
      console.log('✅ App was installed successfully');
      this.hideInstallButton();
      this.deferredPrompt = null;
      
      // 설치 완료 알림
      this.notifyInstallSuccess();
    });
  }

  /**
   * 설치 감지
   */
  private detectInstallation(): void {
    // PWA가 standalone 모드로 실행 중인지 확인
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      console.log('📱 App is running in standalone mode');
      document.body.classList.add('pwa-installed');
    }
  }

  /**
   * 앱 업데이트 확인 설정
   */
  private setupAppUpdateCheck(): void {
    // 페이지 가시성 변경 시 업데이트 확인
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_UPDATE'
        });
      }
    });
    
    // 정기적 업데이트 확인 (30분마다)
    setInterval(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            registration.update();
          }
        });
      }
    }, 30 * 60 * 1000);
  }

  /**
   * 설치 버튼 표시
   */
  private showInstallButton(): void {
    // 설치 버튼이 없으면 생성
    if (!this.installButton) {
      this.installButton = this.createInstallButton();
      document.body.appendChild(this.installButton);
    }
    
    this.installButton.style.display = 'block';
    
    // 5초 후 자동 숨김
    setTimeout(() => {
      if (this.installButton && this.installButton.style.display !== 'none') {
        this.hideInstallButton();
      }
    }, 10000);
  }

  /**
   * 설치 버튼 생성
   */
  private createInstallButton(): HTMLElement {
    const button = document.createElement('div');
    button.className = 'pwa-install-button';
    button.innerHTML = `
      <div class="pwa-install-content">
        <div class="pwa-install-icon">📱</div>
        <div class="pwa-install-text">
          <div class="pwa-install-title">Book-GPT 설치</div>
          <div class="pwa-install-subtitle">앱으로 설치하여 더 편리하게 사용하세요</div>
        </div>
        <button class="pwa-install-btn" id="pwa-install-btn">설치</button>
        <button class="pwa-install-close" id="pwa-install-close">×</button>
      </div>
    `;
    
    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
      .pwa-install-button {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        max-width: 400px;
        margin: 0 auto;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        z-index: 9999;
        animation: slideUp 0.3s ease-out;
      }
      
      .pwa-install-content {
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
      }
      
      .pwa-install-icon {
        font-size: 32px;
        flex-shrink: 0;
      }
      
      .pwa-install-text {
        flex: 1;
        min-width: 0;
      }
      
      .pwa-install-title {
        font-weight: 600;
        font-size: 14px;
        color: #111827;
        margin-bottom: 2px;
      }
      
      .pwa-install-subtitle {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
      }
      
      .pwa-install-btn {
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        flex-shrink: 0;
      }
      
      .pwa-install-btn:hover {
        background: #2563eb;
      }
      
      .pwa-install-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        margin-left: 8px;
        flex-shrink: 0;
      }
      
      .pwa-install-close:hover {
        color: #6b7280;
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @media (prefers-color-scheme: dark) {
        .pwa-install-button {
          background: #1f2937;
          border-color: #374151;
        }
        
        .pwa-install-title {
          color: #f9fafb;
        }
        
        .pwa-install-subtitle {
          color: #9ca3af;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // 이벤트 리스너 추가
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      
      if (target.id === 'pwa-install-btn') {
        this.promptInstall();
      } else if (target.id === 'pwa-install-close') {
        this.hideInstallButton();
      }
    });
    
    return button;
  }

  /**
   * 설치 프롬프트 표시
   */
  private async promptInstall(): Promise<void> {
    if (!this.deferredPrompt) {
      console.warn('Install prompt not available');
      return;
    }
    
    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`Install prompt result: ${outcome}`);
      
      this.deferredPrompt = null;
      this.hideInstallButton();
      
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  }

  /**
   * 설치 버튼 숨김
   */
  private hideInstallButton(): void {
    if (this.installButton) {
      this.installButton.style.display = 'none';
    }
  }

  /**
   * 업데이트 사용 가능 알림
   */
  private showUpdateAvailable(): void {
    // 토스트 알림 또는 배너 표시
    console.log('🔄 App update available');
    
    // 간단한 알림 생성
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
      ">
        새 버전이 사용 가능합니다. 
        <button onclick="window.location.reload()" style="
          background: white;
          color: #3b82f6;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          margin-left: 8px;
          cursor: pointer;
          font-size: 12px;
        ">새로고침</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 10초 후 자동 제거
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  /**
   * 설치 완료 알림
   */
  private notifyInstallSuccess(): void {
    console.log('🎉 App installed successfully');
    
    // 사용자에게 성공 메시지 표시 (토스트 알림 등)
    if ('showToast' in window) {
      (window as any).showToast?.('앱이 성공적으로 설치되었습니다!', 'success');
    }
  }

  /**
   * PWA 매니저 인스턴스 반환
   */
  public getInstallManager(): PWAInstallManager {
    return {
      isInstallable: !!this.deferredPrompt,
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      showInstallPrompt: () => {
        this.showInstallButton();
        return Promise.resolve(true);
      },
      hideInstallPrompt: () => {
        this.hideInstallButton();
      }
    };
  }
}

// PWA 매니저 인스턴스 생성 및 전역 노출
const pwaManager = new PWAManager();

// 전역 접근 가능
declare global {
  interface Window {
    pwaManager: PWAManager;
  }
}

window.pwaManager = pwaManager;

export default pwaManager;
export { PWAManager, type PWAInstallManager };