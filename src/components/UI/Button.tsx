import clsx from 'clsx';
import React from 'react';
import Icon from './Icon';
import { IconName } from './Icon.types';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-primary/90 hover:bg-primary text-white focus:ring-primary/40',
  secondary: 'bg-neutral-700/90 hover:bg-neutral-700 text-white dark:bg-neutral-600 dark:hover:bg-neutral-500 focus:ring-neutral-400/40',
  danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500/40'
};

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  className,
  leftIcon,
  rightIcon,
  children,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded-md shadow transition-colors border border-transparent focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={isDisabled}
      {...rest}
    >
      {leftIcon && <Icon name={leftIcon} size={16} />}
      {children}
      {rightIcon && <Icon name={rightIcon} size={16} />}
    </button>
  );
};

export default Button;
