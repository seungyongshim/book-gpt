/**
 * 로딩 스켈레톤 컴포넌트
 * 콘텐츠 로딩 중 더 나은 사용자 경험을 제공
 */

import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * 기본 스켈레톤 컴포넌트
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-neutral-200 dark:bg-neutral-700';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  };
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-skeleton-wave',
    none: ''
  };
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  
  // 텍스트 스켈레톤의 기본 높이
  if (variant === 'text' && !height) {
    style.height = '1em';
  }
  
  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * 메시지 스켈레톤 (채팅 메시지 로딩용)
 */
export const MessageSkeleton: React.FC<{
  variant?: 'user' | 'assistant';
  showAvatar?: boolean;
}> = ({ variant = 'assistant', showAvatar = true }) => {
  const isUser = variant === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} space-x-3 p-4`}>
      {!isUser && showAvatar && (
        <Skeleton variant="circular" width={32} height={32} className="flex-shrink-0" />
      )}
      
      <div className={`flex flex-col space-y-2 ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div className={`p-3 rounded-lg ${isUser ? 'bg-primary/10' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
          <Skeleton width="100%" height="1.2em" className="mb-2" />
          <Skeleton width="80%" height="1.2em" className="mb-2" />
          <Skeleton width="60%" height="1.2em" />
        </div>
        
        {/* 타임스탬프 */}
        <Skeleton width="80px" height="0.75em" className="opacity-60" />
      </div>
      
      {isUser && showAvatar && (
        <Skeleton variant="circular" width={32} height={32} className="flex-shrink-0" />
      )}
    </div>
  );
};

/**
 * 사이드바 세션 아이템 스켈레톤
 */
export const SessionItemSkeleton: React.FC = () => {
  return (
    <div className="p-3 space-y-2">
      <Skeleton width="100%" height="1.2em" />
      <Skeleton width="70%" height="0.9em" className="opacity-60" />
    </div>
  );
};

/**
 * 설정 패널 스켈레톤
 */
export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* 섹션 제목 */}
      <Skeleton width="150px" height="1.5em" />
      
      {/* 설정 아이템들 */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="120px" height="1em" />
          <Skeleton width="100%" height="40px" variant="rectangular" />
        </div>
      ))}
      
      {/* 버튼 영역 */}
      <div className="flex space-x-3 pt-4">
        <Skeleton width="80px" height="36px" variant="rectangular" />
        <Skeleton width="80px" height="36px" variant="rectangular" />
      </div>
    </div>
  );
};

/**
 * 모델 선택 드롭다운 스켈레톤
 */
export const ModelSelectSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      <Skeleton width="60px" height="1em" />
      <Skeleton width="100%" height="40px" variant="rectangular" />
    </div>
  );
};

/**
 * 사용량 정보 스켈레톤
 */
export const UsageSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <Skeleton width="100px" height="1.2em" />
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton width="80%" height="0.9em" />
          <Skeleton width="60px" height="1.5em" />
        </div>
        <div className="space-y-2">
          <Skeleton width="80%" height="0.9em" />
          <Skeleton width="60px" height="1.5em" />
        </div>
      </div>
      
      {/* 프로그레스 바 */}
      <div className="space-y-1">
        <Skeleton width="100%" height="0.8em" />
        <Skeleton width="100%" height="8px" variant="rectangular" />
      </div>
    </div>
  );
};

/**
 * 카드 레이아웃 스켈레톤
 */
export const CardSkeleton: React.FC<{
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
}> = ({ 
  showHeader = true, 
  showFooter = false, 
  lines = 3 
}) => {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {showHeader && (
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-1 flex-1">
            <Skeleton width="40%" height="1.2em" />
            <Skeleton width="25%" height="0.9em" className="opacity-60" />
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {[...Array(lines)].map((_, i) => (
          <Skeleton 
            key={i} 
            width={i === lines - 1 ? '70%' : '100%'} 
            height="1em" 
          />
        ))}
      </div>
      
      {showFooter && (
        <div className="flex justify-between items-center pt-2">
          <Skeleton width="60px" height="0.8em" />
          <div className="flex space-x-2">
            <Skeleton width="32px" height="32px" variant="rectangular" />
            <Skeleton width="32px" height="32px" variant="rectangular" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 리스트 스켈레톤
 */
export const ListSkeleton: React.FC<{
  items?: number;
  itemHeight?: number;
  showDivider?: boolean;
}> = ({ 
  items = 5, 
  itemHeight = 60,
  showDivider = true 
}) => {
  return (
    <div className="space-y-0">
      {[...Array(items)].map((_, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center space-x-3 p-3" style={{ minHeight: itemHeight }}>
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex-1 space-y-1">
              <Skeleton width="60%" height="1em" />
              <Skeleton width="40%" height="0.8em" className="opacity-60" />
            </div>
            <Skeleton width="20px" height="20px" variant="rectangular" />
          </div>
          {showDivider && i < items - 1 && (
            <div className="border-b border-neutral-200 dark:border-neutral-700" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * 텍스트 블록 스켈레톤
 */
export const TextBlockSkeleton: React.FC<{
  lines?: number;
  paragraph?: boolean;
}> = ({ lines = 3, paragraph = false }) => {
  return (
    <div className={paragraph ? 'space-y-4' : 'space-y-2'}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton 
          key={i}
          width={
            i === lines - 1 ? `${60 + Math.random() * 30}%` : 
            i === 0 ? '95%' : 
            `${80 + Math.random() * 20}%`
          }
          height="1em"
        />
      ))}
    </div>
  );
};

/**
 * 스켈레톤 애니메이션을 위한 CSS 클래스 추가
 * Tailwind config에 추가할 애니메이션 정의
 */
export const skeletonAnimations = {
  'skeleton-wave': {
    '0%': {
      transform: 'translateX(-100%)',
    },
    '50%': {
      transform: 'translateX(100%)',
    },
    '100%': {
      transform: 'translateX(100%)',
    },
  },
};