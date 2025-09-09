import clsx from 'clsx';
import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string; // open-iconic class suffix e.g. "pencil"
  variant?: 'default' | 'danger' | 'success' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

const variantClasses: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700',
  primary: 'text-primary hover:bg-primary/10',
  danger: 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10',
  success: 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-500/10'
};

const sizeClasses: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base'
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  className,
  ariaLabel,
  title,
  ...rest
}) => {
  return (
    <button
      className={clsx(
        'icon-btn rounded-md inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/40',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      aria-label={ariaLabel || title}
      title={title}
      {...rest}
    >
      <i className={`oi oi-${icon}`}></i>
    </button>
  );
};

export default IconButton;
