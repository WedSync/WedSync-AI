// Untitled UI Input Component
// Following WS-077 requirements and Untitled UI Style Guide

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles following Untitled UI design system
          'w-full px-3.5 py-2.5',
          'bg-white',
          'border border-gray-300',
          'rounded-lg',
          'text-gray-900 placeholder-gray-500',
          'shadow-xs',
          'focus:outline-none focus:ring-4 focus:ring-primary-100',
          'focus:border-primary-300',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',

          // Error state
          'aria-[invalid=true]:border-error-300 aria-[invalid=true]:focus:ring-error-100',

          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };
