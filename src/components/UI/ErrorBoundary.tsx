import React from 'react';
import Button from './Button';
import Icon from './Icon';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 개발 환경에서 에러 로깅
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleReportError = () => {
    // 향후 에러 리포팅 서비스 연동 가능
    if (error) {
      console.error('User reported error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="max-w-md w-full bg-surface-alt rounded-lg border border-border p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
            <Icon name="warning" className="text-red-600 dark:text-red-400" size={24} />
          </div>
        </div>
        
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
          문제가 발생했습니다
        </h2>
        
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해 주세요.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded text-left text-sm">
            <summary className="cursor-pointer font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              개발자 정보
            </summary>
            <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={resetError}>
            다시 시도
          </Button>
          <Button variant="primary" onClick={handleReload}>
            페이지 새로고침
          </Button>
          {process.env.NODE_ENV === 'development' && (
            <Button variant="secondary" size="sm" onClick={handleReportError}>
              에러 신고
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;