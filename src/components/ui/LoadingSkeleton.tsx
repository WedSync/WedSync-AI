'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'input';
  lines?: number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'text',
  lines = 1,
  animate = true,
}: SkeletonProps) {
  const baseClass = cn(
    'bg-gray-200 rounded',
    animate && 'animate-pulse',
    className,
  );

  const variants = {
    text: 'h-4 w-full',
    card: 'h-32 w-full rounded-lg',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-md',
    input: 'h-10 w-full rounded-md',
  };

  if (lines > 1 && variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClass,
              variants[variant],
              i === lines - 1 && 'w-3/4',
            )}
          />
        ))}
      </div>
    );
  }

  return <div className={cn(baseClass, variants[variant])} />;
}

export function FormSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
      <div>
        <Skeleton variant="text" className="h-8 w-1/3 mb-2" />
        <Skeleton variant="text" className="h-4 w-2/3" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton variant="text" className="h-4 w-24 mb-2" />
            <Skeleton variant="input" />
          </div>
        ))}
      </div>

      <Skeleton variant="button" className="w-full h-12" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-6 w-32" />
          <Skeleton variant="button" />
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-5 w-48" />
              <Skeleton variant="text" className="h-4 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton variant="button" className="w-20" />
              <Skeleton variant="button" className="w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <Skeleton variant="avatar" />
        <Skeleton variant="button" className="w-16 h-8" />
      </div>
      <Skeleton variant="text" className="h-6 w-3/4 mb-2" />
      <Skeleton variant="text" lines={3} />
      <div className="flex gap-2 mt-4">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <Skeleton variant="text" className="h-4 w-20 mb-2" />
            <Skeleton variant="text" className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Chart and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton variant="card" className="h-64" />
        <TableSkeleton rows={3} />
      </div>
    </div>
  );
}
