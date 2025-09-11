'use client';

import React, { memo, useMemo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import type {
  PresenceIndicatorProps,
  PresenceStatus,
  PresenceState,
} from '@/types/presence';
import { usePresence } from '@/hooks/usePresence';

// Status dot variants with color coding and animations
const statusDotVariants = cva(
  'absolute rounded-full border-2 border-background transition-all duration-300 ease-in-out',
  {
    variants: {
      status: {
        online: 'bg-green-500 shadow-green-500/50',
        busy: 'bg-red-500 shadow-red-500/50',
        idle: 'bg-yellow-500 shadow-yellow-500/50',
        away: 'bg-gray-400 shadow-gray-400/50',
        offline: 'bg-gray-300 shadow-none',
      },
      size: {
        xs: 'w-2 h-2',
        sm: 'w-2.5 h-2.5',
        md: 'w-3 h-3',
        lg: 'w-3.5 h-3.5',
        xl: 'w-4 h-4',
      },
      position: {
        'top-right': 'top-0 right-0',
        'bottom-right': '-bottom-0.5 -right-0.5',
        'top-left': 'top-0 left-0',
        'bottom-left': '-bottom-0.5 -left-0.5',
      },
      isTyping: {
        true: 'animate-pulse shadow-lg',
        false: '',
      },
    },
    defaultVariants: {
      status: 'offline',
      size: 'md',
      position: 'bottom-right',
      isTyping: false,
    },
  },
);

// Status label variants for accessibility and display
const statusLabelVariants = cva('text-xs font-medium capitalize', {
  variants: {
    status: {
      online: 'text-green-600',
      busy: 'text-red-600',
      idle: 'text-yellow-600',
      away: 'text-gray-600',
      offline: 'text-gray-500',
    },
  },
});

// Wedding-specific status templates
const weddingStatusTemplates = {
  photographer: [
    { emoji: '📸', text: 'At venue - ceremony prep', status: 'busy' },
    { emoji: '🎯', text: 'Shooting portraits', status: 'busy' },
    { emoji: '✨', text: 'Available for coordination', status: 'online' },
    { emoji: '📱', text: 'Reviewing photos', status: 'idle' },
  ],
  venue_coordinator: [
    { emoji: '🏛️', text: 'On-site coordination', status: 'online' },
    { emoji: '📋', text: 'Timeline review', status: 'idle' },
    { emoji: '🚨', text: 'Handling emergency', status: 'busy' },
    { emoji: '💬', text: 'Available to chat', status: 'online' },
  ],
  vendor: [
    { emoji: '🌸', text: 'Flower delivery in progress', status: 'busy' },
    { emoji: '🍰', text: 'Kitchen prep', status: 'busy' },
    { emoji: '🎵', text: 'Sound check complete', status: 'online' },
    { emoji: '📞', text: 'Call me for updates', status: 'online' },
  ],
};

interface ExtendedPresenceIndicatorProps extends PresenceIndicatorProps {
  // User information for avatar display
  userName?: string;
  userAvatar?: string;
  userInitials?: string;
  // Real-time presence state
  presenceState?: PresenceState;
  // Wedding-specific context
  weddingRole?:
    | 'photographer'
    | 'venue_coordinator'
    | 'vendor'
    | 'supplier'
    | 'couple';
  // Accessibility enhancements
  ariaLabel?: string;
}

function PresenceIndicatorComponent({
  userId,
  size = 'md',
  showLabel = false,
  showActivity = true,
  showCustomStatus = true,
  position = 'bottom-right',
  onClick,
  className,
  context = 'global',
  contextId,
  userName = 'User',
  userAvatar,
  userInitials,
  presenceState,
  weddingRole = 'vendor',
  ariaLabel,
  ...props
}: ExtendedPresenceIndicatorProps) {
  // Format last activity time for display
  const formatLastSeen = (lastActivity?: string): string => {
    if (!lastActivity) return 'Unknown';

    const now = new Date();
    const lastSeen = new Date(lastActivity);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Get status display information
  const statusInfo = useMemo(() => {
    const status = presenceState?.status || 'offline';
    const isTyping = presenceState?.isTyping || false;
    const customStatus = showCustomStatus ? presenceState?.customStatus : null;
    const customEmoji = showCustomStatus ? presenceState?.customEmoji : null;

    // Determine status text
    let statusText = status;
    if (customStatus) {
      statusText = `${customEmoji || ''}${customStatus}`.trim();
    } else if (status === 'online') {
      statusText = 'Available';
    } else if (status === 'idle') {
      statusText = 'Idle';
    } else if (status === 'away') {
      statusText = 'Away';
    } else if (status === 'busy') {
      statusText = 'Busy';
    } else {
      statusText = 'Offline';
    }

    // Add typing indicator
    if (isTyping && status !== 'offline') {
      statusText = `${statusText} • typing...`;
    }

    return {
      status,
      statusText,
      isTyping,
      customStatus,
      customEmoji,
      lastSeen: formatLastSeen(presenceState?.lastActivity),
    };
  }, [presenceState, showCustomStatus]);

  // Wedding context tooltip content
  const tooltipContent = useMemo(() => {
    const baseInfo = (
      <div className="space-y-1">
        <div className="font-semibold text-sm">{userName}</div>
        <div className={cn(statusLabelVariants({ status: statusInfo.status }))}>
          {statusInfo.statusText}
        </div>
        {showActivity && statusInfo.lastSeen && (
          <div className="text-xs text-muted-foreground">
            Last seen: {statusInfo.lastSeen}
          </div>
        )}
      </div>
    );

    // Add wedding context if available
    if (context === 'wedding' && weddingRole) {
      return (
        <div className="space-y-2">
          {baseInfo}
          <div className="text-xs text-muted-foreground border-t pt-1">
            Role: {weddingRole.replace('_', ' ')}
          </div>
        </div>
      );
    }

    return baseInfo;
  }, [userName, statusInfo, showActivity, context, weddingRole]);

  // Accessibility attributes
  const accessibilityProps = useMemo(() => {
    const statusDescription = statusInfo.isTyping
      ? `${statusInfo.status} and currently typing`
      : statusInfo.status;

    return {
      'aria-label': ariaLabel || `${userName} is ${statusDescription}`,
      'aria-live': 'polite' as const,
      role: onClick ? 'button' : 'status',
      tabIndex: onClick ? 0 : -1,
    };
  }, [statusInfo, userName, ariaLabel, onClick]);

  // Click handler with keyboard support
  const handleInteraction = (event: React.KeyboardEvent | React.MouseEvent) => {
    if (!onClick) return;

    if (event.type === 'click') {
      onClick();
    } else if (event.type === 'keydown') {
      const keyEvent = event as React.KeyboardEvent;
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        event.preventDefault();
        onClick();
      }
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full',
              onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
              className,
            )}
            onClick={handleInteraction}
            onKeyDown={handleInteraction}
            {...accessibilityProps}
            {...props}
          >
            {/* Avatar with presence indicator */}
            <div className="relative">
              <Avatar
                src={userAvatar}
                initials={userInitials}
                alt={`${userName} avatar`}
                size={size}
              />

              {/* Status dot with accessibility shape coding for color-blind users */}
              <div
                className={cn(
                  statusDotVariants({
                    status: statusInfo.status,
                    size,
                    position,
                    isTyping: statusInfo.isTyping,
                  }),
                )}
                aria-hidden="true"
              >
                {/* Shape coding for color-blind accessibility */}
                {statusInfo.status === 'busy' && (
                  <div className="absolute inset-0 rounded-full border border-white">
                    <div className="w-full h-0.5 bg-white absolute top-1/2 left-0 transform -translate-y-1/2 rotate-45" />
                  </div>
                )}
                {statusInfo.status === 'idle' && (
                  <div className="absolute inset-0 rounded-full border border-white">
                    <div className="w-0.5 h-0.5 bg-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Status label (optional) */}
            {showLabel && (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    statusLabelVariants({ status: statusInfo.status }),
                  )}
                >
                  {statusInfo.customEmoji && (
                    <span className="mr-1">{statusInfo.customEmoji}</span>
                  )}
                  {statusInfo.statusText}
                </span>
                {statusInfo.isTyping && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    typing
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Memoized component for performance optimization
export const PresenceIndicator = memo(PresenceIndicatorComponent);

// Higher-order component with integrated presence hook
interface ConnectedPresenceIndicatorProps
  extends Omit<ExtendedPresenceIndicatorProps, 'presenceState'> {
  channelName?: string;
}

export function ConnectedPresenceIndicator({
  userId,
  channelName,
  context = 'global',
  contextId,
  ...props
}: ConnectedPresenceIndicatorProps) {
  const { presenceState } = usePresence({
    channelName: channelName || `${context}:${contextId || 'default'}:presence`,
    userId: userId,
    context,
    contextId,
  });

  // Find user's presence state
  const userPresence = useMemo(() => {
    return Object.values(presenceState)
      .flat()
      .find((presence) => presence.userId === userId);
  }, [presenceState, userId]);

  return (
    <PresenceIndicator
      userId={userId}
      presenceState={userPresence}
      context={context}
      contextId={contextId}
      {...props}
    />
  );
}

export default PresenceIndicator;
