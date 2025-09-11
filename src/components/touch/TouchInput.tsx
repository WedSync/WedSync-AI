'use client';

import React, { forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useTouch';

interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  haptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  preventZoom?: boolean;
  touchOptimized?: boolean;
}

export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      icon,
      iconPosition = 'left',
      haptic = true,
      hapticType = 'light',
      preventZoom = true,
      touchOptimized = true,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const haptics = useHaptic();

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (haptic) {
          haptics[hapticType]();
        }
        onFocus?.(e);
      },
      [haptic, haptics, hapticType, onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (haptic) {
          haptics.light();
        }
        onBlur?.(e);
      },
      [haptic, haptics, onBlur],
    );

    // Base styles following Untitled UI design system with touch optimization
    const baseStyles = cn(
      'w-full transition-all duration-200 rounded-lg border shadow-xs',
      'focus:outline-none focus:ring-4',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
      // Touch optimization styles
      touchOptimized && 'touch-manipulation',
      // iOS zoom prevention - CRITICAL: 16px+ font size prevents zoom
      preventZoom ? 'text-base' : 'text-sm', // text-base = 16px, text-sm = 14px
    );

    const sizeStyles = {
      sm: cn(
        'min-h-[44px] px-3 py-2', // WCAG minimum 44px height
        preventZoom ? 'text-sm' : 'text-xs', // Still prevent zoom with 14px min
      ),
      md: cn(
        'min-h-[48px] px-3.5 py-2.5', // Optimal 48px height
        preventZoom ? 'text-base' : 'text-sm', // 16px prevents iOS zoom
      ),
      lg: cn(
        'min-h-[52px] px-4 py-3', // Large touch target
        preventZoom ? 'text-lg' : 'text-base', // 18px for better accessibility
      ),
    };

    const variantStyles = {
      default: cn(
        'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
        'focus:border-primary-300 focus:ring-primary-100',
        'hover:border-gray-400',
      ),
      error: cn(
        'bg-white border-error-300 text-gray-900 placeholder-error-400',
        'focus:border-error-400 focus:ring-error-100',
        'hover:border-error-400',
      ),
      success: cn(
        'bg-white border-success-300 text-gray-900 placeholder-success-400',
        'focus:border-success-400 focus:ring-success-100',
        'hover:border-success-400',
      ),
    };

    if (icon) {
      return (
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              baseStyles,
              sizeStyles[size],
              variantStyles[variant],
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              className,
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {icon && (
            <div
              className={cn(
                'absolute inset-y-0 flex items-center pointer-events-none',
                iconPosition === 'left' ? 'left-3' : 'right-3',
              )}
            >
              <div className="w-5 h-5 text-gray-400">{icon}</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          className,
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  },
);

TouchInput.displayName = 'TouchInput';

// Touch-optimized textarea component
interface TouchTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success';
  haptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  preventZoom?: boolean;
  touchOptimized?: boolean;
}

export const TouchTextarea = forwardRef<
  HTMLTextAreaElement,
  TouchTextareaProps
>(
  (
    {
      className,
      variant = 'default',
      haptic = true,
      hapticType = 'light',
      preventZoom = true,
      touchOptimized = true,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const haptics = useHaptic();

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (haptic) {
          haptics[hapticType]();
        }
        onFocus?.(e);
      },
      [haptic, haptics, hapticType, onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (haptic) {
          haptics.light();
        }
        onBlur?.(e);
      },
      [haptic, haptics, onBlur],
    );

    const baseStyles = cn(
      'w-full min-h-[80px] px-3.5 py-2.5 rounded-lg border shadow-xs',
      'transition-all duration-200 resize-y',
      'focus:outline-none focus:ring-4',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
      // Touch optimization
      touchOptimized && 'touch-manipulation',
      // iOS zoom prevention
      preventZoom ? 'text-base' : 'text-sm',
    );

    const variantStyles = {
      default: cn(
        'bg-white border-gray-300 text-gray-900 placeholder-gray-500',
        'focus:border-primary-300 focus:ring-primary-100',
        'hover:border-gray-400',
      ),
      error: cn(
        'bg-white border-error-300 text-gray-900 placeholder-error-400',
        'focus:border-error-400 focus:ring-error-100',
        'hover:border-error-400',
      ),
      success: cn(
        'bg-white border-success-300 text-gray-900 placeholder-success-400',
        'focus:border-success-400 focus:ring-success-100',
        'hover:border-success-400',
      ),
    };

    return (
      <textarea
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  },
);

TouchTextarea.displayName = 'TouchTextarea';

// Touch-optimized select component
interface TouchSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: 'default' | 'error' | 'success';
  haptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  preventZoom?: boolean;
  touchOptimized?: boolean;
}

export const TouchSelect = forwardRef<HTMLSelectElement, TouchSelectProps>(
  (
    {
      className,
      variant = 'default',
      haptic = true,
      hapticType = 'light',
      preventZoom = true,
      touchOptimized = true,
      onFocus,
      onBlur,
      children,
      ...props
    },
    ref,
  ) => {
    const haptics = useHaptic();

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLSelectElement>) => {
        if (haptic) {
          haptics[hapticType]();
        }
        onFocus?.(e);
      },
      [haptic, haptics, hapticType, onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLSelectElement>) => {
        if (haptic) {
          haptics.light();
        }
        onBlur?.(e);
      },
      [haptic, haptics, onBlur],
    );

    const baseStyles = cn(
      'w-full min-h-[48px] px-3.5 py-2.5 rounded-lg border shadow-xs',
      'bg-white cursor-pointer transition-all duration-200',
      'focus:outline-none focus:ring-4',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
      // Touch optimization
      touchOptimized && 'touch-manipulation',
      // iOS zoom prevention
      preventZoom ? 'text-base' : 'text-sm',
    );

    const variantStyles = {
      default: cn(
        'border-gray-300 text-gray-900',
        'focus:border-primary-300 focus:ring-primary-100',
        'hover:border-gray-400',
      ),
      error: cn(
        'border-error-300 text-gray-900',
        'focus:border-error-400 focus:ring-error-100',
        'hover:border-error-400',
      ),
      success: cn(
        'border-success-300 text-gray-900',
        'focus:border-success-400 focus:ring-success-100',
        'hover:border-success-400',
      ),
    };

    return (
      <select
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {children}
      </select>
    );
  },
);

TouchSelect.displayName = 'TouchSelect';
