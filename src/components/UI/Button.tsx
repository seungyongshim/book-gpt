import React from 'react';
import Icon, { IconName } from './Icon';
import { getButtonClasses, getIconSize, type ButtonVariant, type ButtonSize } from './buttonUtils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Extract<ButtonVariant, 'primary' | 'secondary' | 'danger'>;
  size?: Exclude<ButtonSize, 'lg'>; // Button doesn't support 'lg' size currently
  loading?: boolean;
  leftIcon?: IconName | string;
  rightIcon?: IconName | string;
}

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
  const iconSize = getIconSize(size);
  
  return (
    <button
      className={getButtonClasses(variant, size, className)}
      disabled={isDisabled}
      {...rest}
    >
      {leftIcon && <Icon name={leftIcon} size={iconSize} />}
      {children}
      {rightIcon && <Icon name={rightIcon} size={iconSize} />}
    </button>
  );
};

export default Button;
