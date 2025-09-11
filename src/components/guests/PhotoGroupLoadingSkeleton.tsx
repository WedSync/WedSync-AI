'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PhotoGroupLoadingSkeletonProps {
  count?: number;
  showStats?: boolean;
  className?: string;
}

export function PhotoGroupLoadingSkeleton({
  count = 3,
  showStats = true,
  className = '',
}: PhotoGroupLoadingSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200"></div>
          <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-100"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200"></div>
          <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200"></div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      {showStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-200"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Photo groups skeleton */}
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <PhotoGroupItemSkeleton key={i} delay={i * 100} />
        ))}
      </div>
    </div>
  );
}

function PhotoGroupItemSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-lg border bg-white p-4"
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Drag handle */}
          <div className="mt-1 h-5 w-5 animate-pulse rounded bg-gray-200"></div>

          <div className="flex-1">
            {/* Header with icon and title */}
            <div className="mb-2 flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200"></div>
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
              <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-gray-100"></div>
            </div>

            {/* Description */}
            <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-100"></div>

            {/* Meta information */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100"></div>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 w-12 animate-pulse rounded bg-gray-100"></div>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100"></div>
              </div>
            </div>

            {/* Guest list preview skeleton */}
            <div className="mt-3 border-t pt-3">
              <div className="mb-1 h-3 w-20 animate-pulse rounded bg-gray-200"></div>
              <div className="flex flex-wrap gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-5 w-20 animate-pulse rounded-full bg-gray-100"
                    style={{ animationDelay: `${i * 50}ms` }}
                  ></div>
                ))}
                <div className="h-5 w-12 animate-pulse rounded-full bg-gray-100"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="ml-4 flex gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-gray-100"></div>
          <div className="h-8 w-12 animate-pulse rounded bg-gray-100"></div>
          <div className="h-8 w-8 animate-pulse rounded bg-gray-100"></div>
        </div>
      </div>
    </div>
  );
}

export function PhotoGroupGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200"></div>
              <div className="h-5 w-10 animate-pulse rounded-full bg-gray-100"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-3 w-full animate-pulse rounded bg-gray-100"></div>
            <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100"></div>
            <div className="flex gap-2 pt-2">
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PhotoGroupFormSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Form fields skeleton */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100"></div>
            </div>
          ))}

          {/* Textarea fields */}
          <div className="space-y-2 md:col-span-2">
            <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
            <div className="h-20 w-full animate-pulse rounded-lg bg-gray-100"></div>
          </div>

          {/* Guest selection */}
          <div className="space-y-2 md:col-span-2">
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200"></div>
            <div className="h-48 w-full animate-pulse rounded-lg border bg-gray-50"></div>
          </div>
        </div>

        {/* Form actions */}
        <div className="flex justify-end gap-2 pt-4">
          <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-100"></div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility component for inline loading states
export function InlineLoadingIndicator({
  text = 'Loading...',
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <svg
        className="h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span>{text}</span>
    </div>
  );
}
