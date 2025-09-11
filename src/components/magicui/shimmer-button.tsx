// Magic UI Shimmer Button Component
// Following WS-077 requirements and Magic UI animations

import React from 'react';
import { cn } from '@/lib/utils';

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base button styles following Untitled UI
          'inline-flex items-center justify-center',
          'px-4 py-2.5',
          'font-semibold text-sm',
          'rounded-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-primary-100',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Shimmer gradient background
          'bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400',
          'bg-[length:200%_100%]',
          'text-white',
          'shadow-lg hover:shadow-xl',

          // Shimmer animation
          'animate-shimmer',
          'hover:animate-none hover:bg-primary-700',

          // Wedding-first styling
          'relative overflow-hidden',

          className,
        )}
        ref={ref}
        {...props}
      >
        {/* Shimmer overlay effect */}
        <div className="absolute inset-0 -top-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-overlay" />

        {/* Content */}
        <span className="relative z-10">{children}</span>
      </button>
    );
  },
);

ShimmerButton.displayName = 'ShimmerButton';

export { ShimmerButton };
