'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBroadcastSubscription } from '@/hooks/useBroadcastSubscription';

interface BroadcastBadgeProps {
  userId: string;
  showLabel?: boolean;
  variant?: 'icon' | 'button';
  onClick?: () => void;
  className?: string;
  weddingId?: string;
  userRole?: 'couple' | 'coordinator' | 'supplier' | 'photographer';
}

export function BroadcastBadge({
  userId,
  showLabel = false,
  variant = 'icon',
  onClick,
  className,
  weddingId,
  userRole,
}: BroadcastBadgeProps) {
  const { unreadCount, connectionStatus } = useBroadcastSubscription(
    userId,
    weddingId,
    { userRole },
  );
  const [animateCount, setAnimateCount] = useState(false);

  // Animate badge when count changes
  useEffect(() => {
    if (unreadCount > 0) {
      setAnimateCount(true);
      const timer = setTimeout(() => setAnimateCount(false), 500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn('relative flex items-center gap-2', className)}
        aria-label={`Notifications${unreadCount > 0 ? ` - ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {showLabel && <span>Notifications</span>}

        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={cn(
              'absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-xs font-bold',
              'flex items-center justify-center px-1.5',
              animateCount && 'animate-bounce',
            )}
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}

        {/* Connection indicator */}
        {connectionStatus !== 'connected' && (
          <div
            className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"
            aria-label="Connection issue"
            title={`Broadcast connection: ${connectionStatus}`}
          />
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn('relative inline-flex cursor-pointer', className)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Notifications${unreadCount > 0 ? ` - ${unreadCount} unread` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <Bell
        className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors"
        aria-hidden="true"
      />

      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className={cn(
            'absolute -top-2 -right-2 min-w-[18px] h-4 rounded-full text-xs font-bold',
            'flex items-center justify-center px-1',
            animateCount && 'animate-bounce',
          )}
          aria-label={`${unreadCount} unread notifications`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}

      {/* Connection status */}
      {connectionStatus !== 'connected' && (
        <div
          className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"
          aria-label="Connection issue"
          title={`Broadcast connection: ${connectionStatus}`}
        />
      )}
    </div>
  );
}
