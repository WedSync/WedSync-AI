'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const InputGroup = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative rounded-md shadow-sm', className)}
    {...props}
  />
));
InputGroup.displayName = 'InputGroup';
