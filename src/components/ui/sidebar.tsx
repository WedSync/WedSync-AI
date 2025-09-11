'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const SidebarSection = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-1', className)} {...props} />
));
SidebarSection.displayName = 'SidebarSection';

export const SidebarLabel = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-3 text-xs font-semibold leading-6 text-gray-400',
      className,
    )}
    {...props}
  />
));
SidebarLabel.displayName = 'SidebarLabel';

export const SidebarItem = forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { active?: boolean }
>(({ className, active, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      active
        ? 'bg-gray-50 text-indigo-600'
        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
      className,
    )}
    {...props}
  />
));
SidebarItem.displayName = 'SidebarItem';
