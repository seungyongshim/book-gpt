import React from 'react';

export interface SettingsSectionProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  dense?: boolean;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  actions,
  dense,
  className,
  children,
  ...rest
}) => {
  return (
    <section className={`settings-section ${dense ? 'space-y-4' : ''} ${className || ''}`} {...rest}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h6 className="settings-section-title">{title}</h6>
          {description && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
};

export default SettingsSection;
