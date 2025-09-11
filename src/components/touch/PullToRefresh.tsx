'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/useTouch';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing || disabled) return;

    setIsRefreshing(true);
    setRefreshComplete(false);

    try {
      await onRefresh();
      setRefreshComplete(true);

      // Show success state briefly
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshComplete(false);
      }, 500);
    } catch (error) {
      console.error('Refresh failed:', error);
      setIsRefreshing(false);
      setRefreshComplete(false);
    }
  };

  const { isPulling, pullDistance, handlers } = usePullToRefresh(handleRefresh);

  // Calculate pull progress
  const pullProgress = Math.min(pullDistance / threshold, 1);
  const pullOpacity = Math.min(pullDistance / threshold, 1);
  const pullScale = 0.5 + pullProgress * 0.5;

  return (
    <div className={cn('relative', className)} {...(!disabled ? handlers : {})}>
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex justify-center transition-all duration-200 pointer-events-none',
          pullDistance > 0 ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          transform: `translateY(${Math.min(pullDistance - 40, threshold)}px)`,
          height: '40px',
        }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full',
            isPulling ? 'bg-primary-100' : 'bg-gray-100',
            isRefreshing && 'animate-pulse',
            refreshComplete && 'bg-success-100',
          )}
          style={{
            opacity: pullOpacity,
            transform: `scale(${pullScale})`,
          }}
        >
          <RefreshCw
            className={cn(
              'w-5 h-5 transition-colors',
              isPulling ? 'text-primary-600' : 'text-gray-600',
              isRefreshing && 'animate-spin',
              refreshComplete && 'text-success-600',
            )}
            style={{
              transform: `rotate(${pullDistance * 2}deg)`,
            }}
          />
        </div>
      </div>

      {/* Status text */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-12 left-0 right-0 text-center text-xs text-gray-500 pointer-events-none"
          style={{
            transform: `translateY(${Math.min(pullDistance - 40, threshold)}px)`,
            opacity: pullOpacity,
          }}
        >
          {refreshComplete
            ? 'Updated!'
            : isRefreshing
              ? 'Refreshing...'
              : isPulling
                ? 'Release to refresh'
                : 'Pull to refresh'}
        </div>
      )}

      {/* Content wrapper */}
      <div
        className="relative"
        style={{
          transform: isRefreshing
            ? 'translateY(60px)'
            : pullDistance > 0
              ? `translateY(${Math.min(pullDistance, threshold * 1.5)}px)`
              : 'translateY(0)',
          transition:
            isRefreshing || pullDistance === 0
              ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
              : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
