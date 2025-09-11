// Untitled UI Button Component
// Following WS-077 requirements and Untitled UI Style Guide

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-semibold rounded-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-4',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Size variants
          {
            'px-3 py-2 text-xs': size === 'xs',
            'px-3.5 py-2 text-sm': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-4.5 py-2.5 text-base': size === 'lg',
            'px-5 py-3 text-base': size === 'xl',
          },

          // Variant styles - following Untitled UI color system
          {
            // Primary - Wedding Purple
            'bg-primary-600 hover:bg-primary-700 text-white shadow-xs hover:shadow-sm focus:ring-primary-100':
              variant === 'primary',

            // Secondary - Gray
            'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-xs hover:shadow-sm focus:ring-gray-100':
              variant === 'secondary',

            // Outline
            'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-xs hover:shadow-sm focus:ring-gray-100':
              variant === 'outline',

            // Ghost
            'bg-transparent hover:bg-gray-50 text-gray-700 focus:ring-gray-100':
              variant === 'ghost',

            // Destructive
            'bg-error-600 hover:bg-error-700 text-white shadow-xs hover:shadow-sm focus:ring-error-100':
              variant === 'destructive',
          },

          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button };
