import clsx from 'clsx';

// Shared button variant and size configuration
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'default' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Shared variant styles - unified across Button and IconButton
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-primary/90 hover:bg-primary text-white focus:ring-primary/40',
  secondary: 'bg-neutral-700/90 hover:bg-neutral-700 text-white dark:bg-neutral-600 dark:hover:bg-neutral-500 focus:ring-neutral-400/40',
  danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500/40',
  default: 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700',
  success: 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-500/10'
};

// Size styles for regular buttons (with padding)
const BUTTON_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-base'
};

// Size styles for icon buttons (square dimensions)
const ICON_BUTTON_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base'
};

// Base button classes shared by all button types
const BASE_BUTTON_CLASSES = 'inline-flex items-center justify-center font-medium rounded-md transition-colors border border-transparent focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Generate button classes for regular buttons
 */
export function getButtonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  additionalClasses?: string
): string {
  return clsx(
    BASE_BUTTON_CLASSES,
    'gap-2 shadow', // Additional classes specific to regular buttons
    VARIANT_STYLES[variant],
    BUTTON_SIZE_STYLES[size],
    additionalClasses
  );
}

/**
 * Generate button classes for icon buttons
 */
export function getIconButtonClasses(
  variant: ButtonVariant = 'default',
  size: ButtonSize = 'md',
  additionalClasses?: string
): string {
  return clsx(
    BASE_BUTTON_CLASSES,
    'icon-btn', // Additional class specific to icon buttons
    VARIANT_STYLES[variant],
    ICON_BUTTON_SIZE_STYLES[size],
    additionalClasses
  );
}

/**
 * Get icon size based on button size
 */
export function getIconSize(size: ButtonSize = 'md'): number {
  switch (size) {
    case 'sm': return 14;
    case 'md': return 16;
    case 'lg': return 18;
    default: return 16;
  }
}