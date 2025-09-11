// Untitled UI Badge Component
// Following WS-077 requirements and Untitled UI Style Guide

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    { className, variant = 'default', size = 'md', children, ...props },
    ref,
  ) => {
    return (
      <span
        className={cn(
          // Base styles
          'inline-flex items-center',
          'rounded-full',
          'font-medium',
          'transition-all duration-200',

          // Size variants
          {
            'px-2 py-0.5 text-xs': size === 'sm',
            'px-2.5 py-0.5 text-xs': size === 'md',
            'px-3 py-1 text-sm': size === 'lg',
          },

          // Color variants following Untitled UI color system
          {
            // Default - Primary
            'bg-primary-50 text-primary-700 border border-primary-200':
              variant === 'default',

            // Secondary - Gray
            'bg-gray-50 text-gray-700 border border-gray-200':
              variant === 'secondary',

            // Success - Green
            'bg-success-50 text-success-700 border border-success-200':
              variant === 'success',

            // Error - Red
            'bg-error-50 text-error-700 border border-error-200':
              variant === 'error',

            // Warning - Amber
            'bg-warning-50 text-warning-700 border border-warning-200':
              variant === 'warning',

            // Info - Blue
            'bg-blue-50 text-blue-700 border border-blue-200':
              variant === 'info',
          },

          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export { Badge };
