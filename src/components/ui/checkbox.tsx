'use client';

import * as React from 'react';
import { CheckIcon, MinusIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onCheckedChange,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded border border-gray-300',
          'focus:outline-none focus:ring-4 focus:ring-primary-100',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked || indeterminate
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'bg-white hover:bg-gray-50',
          'transition-colors duration-150',
          className,
        )}
        {...props}
      >
        {indeterminate ? (
          <MinusIcon className="h-3 w-3" />
        ) : checked ? (
          <CheckIcon className="h-3 w-3" />
        ) : null}
      </button>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
