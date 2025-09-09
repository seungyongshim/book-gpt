import React from 'react';
import Icon, { IconName } from './Icon';
import { getIconButtonClasses, getIconSize, type ButtonVariant, type ButtonSize } from './buttonUtils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName | string; // 기존 string 유지 (점진적 치환)
  variant?: ButtonVariant;
  size?: ButtonSize;
  ariaLabel?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  className,
  ariaLabel,
  title,
  ...rest
}) => {
  const iconSize = getIconSize(size);
  
  return (
    <button
      className={getIconButtonClasses(variant, size, className)}
      aria-label={ariaLabel || title}
      title={title}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
};

export default IconButton;
