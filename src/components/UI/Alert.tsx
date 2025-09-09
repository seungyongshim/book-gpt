import React from 'react';
import Icon from './Icon';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  title?: string;
  compact?: boolean; // smaller padding
}

const variantMap: Record<NonNullable<AlertProps['variant']>, { container: string; icon: string; defaultIcon: string; }>= {
  info: { container: 'text-neutral-700 dark:text-neutral-200 bg-neutral-100/80 dark:bg-neutral-800/60 border-neutral-300/60 dark:border-neutral-600/40', icon: 'text-neutral-500 dark:text-neutral-400', defaultIcon: 'loop' },
  success: { container: 'text-green-700 dark:text-green-200 bg-green-50 dark:bg-green-900/30 border-green-400/50', icon: 'text-green-600 dark:text-green-400', defaultIcon: 'check' },
  warning: { container: 'text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border-amber-400/50', icon: 'text-amber-600 dark:text-amber-400', defaultIcon: 'warning' },
  error: { container: 'text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/30 border-red-400/50', icon: 'text-red-600 dark:text-red-400', defaultIcon: 'warning' },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  icon,
  title,
  compact,
  className,
  children,
  ...rest
}) => {
  const v = variantMap[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-md border px-3 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} ${v.container} ${className || ''}`}
      {...rest}
    >
      <div className={`shrink-0 mt-0.5 ${v.icon}`}>
        <Icon name={icon || v.defaultIcon} size={16} />
      </div>
      <div className="flex-1 min-w-0 leading-relaxed">
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  );
};

export default Alert;
