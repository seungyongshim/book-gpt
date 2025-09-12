import React from 'react';
import clsx from 'clsx';

export interface SpinnerProps {
  size?: number;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 16, className }) => {
  const s = `${size}px`;
  return (
    <span
      className={clsx(
        'inline-block animate-spinSlow rounded-full border-2 border-neutral-400/40 border-t-neutral-500 dark:border-neutral-600/30 dark:border-t-neutral-400',
        className
      )}
      style={{ width: s, height: s }}
      aria-label="로딩"
    />
  );
};

export default Spinner;
