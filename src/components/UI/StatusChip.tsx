import React from 'react';
import Icon from './Icon';

export interface StatusChipProps extends React.HTMLAttributes<HTMLDivElement> {
  state?: 'neutral' | 'success' | 'error' | 'warning';
  icon?: string;
  small?: boolean;
}

const styleMap: Record<NonNullable<StatusChipProps['state']>, string> = {
  neutral: 'bg-neutral-200/70 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-200',
  success: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  error: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

export const StatusChip: React.FC<StatusChipProps> = ({
  state = 'neutral',
  icon,
  small,
  className,
  children,
  ...rest
}) => {
  const sizeCls = small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <div className={`inline-flex items-center gap-1 rounded font-medium ${sizeCls} ${styleMap[state]} ${className || ''}`} {...rest}>
      {icon && <Icon name={icon} size={small ? 12 : 14} />}
      <span className="truncate max-w-[160px]">{children}</span>
    </div>
  );
};

export default StatusChip;
