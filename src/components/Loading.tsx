import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/useA11y';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  ariaLabel?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  text = 'Carregando...', 
  fullScreen = false,
  ariaLabel
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const containerClasses = fullScreen 
    ? 'min-h-screen flex flex-col items-center justify-center p-8'
    : 'flex flex-col items-center justify-center p-8';

  const spinnerClasses = [
    sizeClasses[size],
    'border-4 border-gray-200 border-t-blue-600 rounded-full',
    !prefersReducedMotion && 'animate-spin'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      role="status" 
      aria-live="polite"
      aria-label={ariaLabel || text}
    >
      <div
        className={spinnerClasses}
        aria-hidden="true"
      />
      {text && (
        <p className="mt-4 text-gray-600 text-center" id="loading-text">
          {text}
        </p>
      )}
      <span className="sr-only">{text}</span>
    </div>
  );
};

