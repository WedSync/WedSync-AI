'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Building2,
  Heart,
  Users,
  FileText,
  MapPin,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChannelIndicatorProps {
  channelName: string;
  displayName: string;
  isActive: boolean;
  unreadCount: number;
  lastMessage?: Date;
  isTyping?: boolean;
  onClick: () => void;
}

export function ChannelIndicator({
  channelName,
  displayName,
  isActive,
  unreadCount,
  lastMessage,
  isTyping = false,
  onClick,
}: ChannelIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Channel type detection for styling
  const channelType = channelName.split(':')[0];
  const getChannelIcon = () => {
    switch (channelType) {
      case 'supplier':
        return Building2;
      case 'couple':
        return Heart;
      case 'collaboration':
        return Users;
      case 'form':
        return FileText;
      case 'journey':
        return MapPin;
      default:
        return MessageSquare;
    }
  };

  const Icon = getChannelIcon();

  return (
    <div
      className={cn(
        'relative flex items-center space-x-3 rounded-lg p-3 transition-all duration-200 cursor-pointer',
        'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'hover:bg-accent hover:text-accent-foreground',
        unreadCount > 0 &&
          !isActive &&
          'bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-950/50',
        'min-h-[3.5rem]', // Ensure touch-friendly height (56px)
      )}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="button"
      tabIndex={0}
      aria-label={`Switch to ${displayName} channel${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Channel Icon */}
      <div className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-5 w-5 transition-colors',
            isActive ? 'text-primary-foreground' : 'text-muted-foreground',
          )}
        />

        {/* Connection Status Dot */}
        <div
          className={cn(
            'absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-background',
            isActive ? 'bg-green-400' : 'bg-gray-400',
          )}
        />

        {/* Urgent Priority Indicator */}
        {unreadCount > 0 && channelName.includes('emergency') && (
          <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-red-500">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Channel Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              'text-sm font-medium truncate',
              isActive ? 'text-primary-foreground' : 'text-foreground',
            )}
          >
            {displayName}
          </p>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <Badge
              variant={isActive ? 'secondary' : 'default'}
              className={cn(
                'ml-2 text-xs min-w-[1.5rem] h-5 flex items-center justify-center px-1.5',
                channelName.includes('emergency') &&
                  'bg-red-500 text-white hover:bg-red-600',
                'transition-colors',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>

        {/* Last Activity */}
        {lastMessage && !isTyping && (
          <p
            className={cn(
              'text-xs truncate mt-0.5',
              isActive ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {formatDistanceToNow(lastMessage, { addSuffix: true })}
          </p>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-1 mt-1">
            <div className="flex space-x-1">
              <div
                className={cn(
                  'w-1 h-1 rounded-full animate-bounce',
                  isActive ? 'bg-primary-foreground/70' : 'bg-muted-foreground',
                )}
              />
              <div
                className={cn(
                  'w-1 h-1 rounded-full animate-bounce',
                  isActive ? 'bg-primary-foreground/70' : 'bg-muted-foreground',
                )}
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className={cn(
                  'w-1 h-1 rounded-full animate-bounce',
                  isActive ? 'bg-primary-foreground/70' : 'bg-muted-foreground',
                )}
                style={{ animationDelay: '0.2s' }}
              />
            </div>
            <span
              className={cn(
                'text-xs italic',
                isActive
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground',
              )}
            >
              typing...
            </span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full ml-3 z-50 px-2 py-1 text-xs bg-popover text-popover-foreground rounded-md shadow-md border whitespace-nowrap pointer-events-none">
          <div className="font-medium">{channelName}</div>
          <div className="text-xs opacity-70">
            {channelType === 'supplier' && 'Supplier Channel'}
            {channelType === 'couple' && 'Couple Channel'}
            {channelType === 'collaboration' && 'Team Channel'}
            {channelType === 'form' && 'Form Channel'}
            {channelType === 'journey' && 'Journey Channel'}
          </div>
          {lastMessage && (
            <div className="text-xs opacity-60 mt-1">
              Last active:{' '}
              {formatDistanceToNow(lastMessage, { addSuffix: true })}
            </div>
          )}
        </div>
      )}

      {/* Focus ring for keyboard navigation */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg ring-2 ring-transparent',
          'focus-within:ring-ring transition-all',
        )}
      />
    </div>
  );
}
