'use client';

import { Card } from '@/components/ui/card-untitled';
import { Loader2 } from 'lucide-react';

// Skeleton base component for consistent loading animations
function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      {...props}
    />
  );
}

export function ClientListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-16" />
      </div>

      {/* View toggles skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 mx-0.5" />
          ))}
        </div>
        <Skeleton className="h-4 w-20" />
      </div>

      {/* List view skeleton */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[
                  'Client',
                  'Wedding Date',
                  'Venue',
                  'Status',
                  'Package',
                  'WedMe',
                  '',
                ].map((header) => (
                  <th key={header} className="px-6 py-3 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-8 w-8 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ClientGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton (reused) */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>

            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ClientCalendarSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, monthIndex) => (
        <Card key={monthIndex} className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, clientIndex) => (
              <div
                key={clientIndex}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <Skeleton className="h-8 w-8 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ClientKanbanSkeleton() {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {Array.from({ length: 4 }).map((_, columnIndex) => (
        <div key={columnIndex} className="flex-shrink-0 w-80">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-8" />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <Card key={cardIndex} className="p-4 bg-white">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-6 w-12 rounded" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientNotificationSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded" />
      </div>

      {/* Notifications skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-64 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>

                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <div className="flex gap-1">
                    <Skeleton className="h-6 w-16 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-12 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Loading spinner for inline actions
export function ClientActionLoading({
  size = 'sm',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-gray-500`} />
    </div>
  );
}

// Loading overlay for view transitions
export function ClientViewTransitionLoading() {
  return (
    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
      <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-lg shadow-md">
        <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
        <span className="text-sm font-medium text-gray-700">
          Loading view...
        </span>
      </div>
    </div>
  );
}

// Progressive loading states
export function ClientListProgressiveLoading({
  loaded,
  total,
}: {
  loaded: number;
  total: number;
}) {
  const percentage = Math.round((loaded / total) * 100);

  return (
    <Card className="p-8 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Loading clients...
      </h3>
      <p className="text-gray-600 mb-4">
        {loaded} of {total} clients loaded
      </p>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-sm text-gray-500 mt-2">{percentage}% complete</p>
    </Card>
  );
}

// Network status aware loading
export function ClientListOfflineLoading() {
  return (
    <Card className="p-8 text-center border border-amber-200 bg-amber-50">
      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Working Offline
      </h3>
      <p className="text-gray-600 mb-4">
        Loading cached client data. Some information may be outdated.
      </p>
      <div className="flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
      </div>
    </Card>
  );
}
