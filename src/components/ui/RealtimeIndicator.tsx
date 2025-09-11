'use client';

/**
 * WS-202: Supabase Realtime Integration - Connection Indicator Component
 * Visual feedback component for realtime connection status
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UIRealtimeIndicatorProps, UIConnectionStatus } from '@/types/realtime';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Heart,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RealtimeIndicator({
  connected,
  lastUpdate,
  messageCount = 0,
  size = 'md',
  showDetails = false,
  weddingDayMode = false,
  onRetry,
  reconnectAttempt,
  maxReconnectAttempts,
  connectionQuality = 'good',
  compact = false,
  showTooltip = true,
}: UIRealtimeIndicatorProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  // Determine connection status
  const connectionStatus: UIConnectionStatus = connected
    ? 'connected'
    : reconnectAttempt && reconnectAttempt > 0
      ? 'reconnecting'
      : 'disconnected';

  // Trigger animation on status change
  useEffect(() => {
    if (connected) {
      setIsAnimating(true);
      setShowPulse(true);
      setTimeout(() => setIsAnimating(false), 600);
      setTimeout(() => setShowPulse(false), 2000);
    }
  }, [connected]);

  // Get connection color and icon
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color:
            connectionQuality === 'excellent'
              ? 'bg-green-500'
              : connectionQuality === 'good'
                ? 'bg-green-400'
                : 'bg-yellow-500',
          pulseColor:
            connectionQuality === 'excellent'
              ? 'bg-green-400'
              : 'bg-yellow-400',
          icon: Wifi,
          text: 'Connected',
          textColor:
            connectionQuality === 'excellent'
              ? 'text-green-700'
              : 'text-yellow-700',
          bgColor:
            connectionQuality === 'excellent' ? 'bg-green-50' : 'bg-yellow-50',
          borderColor:
            connectionQuality === 'excellent'
              ? 'border-green-200'
              : 'border-yellow-200',
        };
      case 'reconnecting':
        return {
          color: 'bg-yellow-500',
          pulseColor: 'bg-yellow-400',
          icon: RefreshCw,
          text: `Reconnecting${reconnectAttempt ? ` (${reconnectAttempt}/${maxReconnectAttempts})` : '...'}`,
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          pulseColor: 'bg-red-400',
          icon: WifiOff,
          text: 'Disconnected',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return {
          color: 'bg-gray-500',
          pulseColor: 'bg-gray-400',
          icon: Clock,
          text: 'Connecting...',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const display = getConnectionDisplay();
  const Icon = display.icon;

  // Size classes
  const sizeClasses = {
    sm: {
      dot: 'h-2 w-2',
      icon: 'h-3 w-3',
      text: 'text-xs',
      padding: 'px-2 py-1',
      gap: 'gap-1',
    },
    md: {
      dot: 'h-3 w-3',
      icon: 'h-4 w-4',
      text: 'text-sm',
      padding: 'px-3 py-2',
      gap: 'gap-2',
    },
    lg: {
      dot: 'h-4 w-4',
      icon: 'h-5 w-5',
      text: 'text-base',
      padding: 'px-4 py-2',
      gap: 'gap-3',
    },
  };

  const classes = sizeClasses[size];

  // Render compact version for mobile
  if (compact) {
    const CompactIndicator = (
      <div
        className={cn(
          'relative flex items-center justify-center',
          'min-w-[48px] min-h-[48px]', // Accessibility touch target
          'rounded-full transition-all duration-300',
          display.bgColor,
          display.borderColor,
          'border-2',
          weddingDayMode && !connected && 'ring-4 ring-red-200 animate-pulse',
        )}
        role="status"
        aria-live="polite"
        aria-label={`Connection status: ${display.text}`}
        data-testid="connection-indicator"
      >
        {/* Connection dot with pulse animation */}
        <div className="relative">
          <div
            className={cn(
              'rounded-full transition-all duration-300',
              classes.dot,
              display.color,
              isAnimating && 'animate-bounce',
            )}
          />
          {showPulse && connected && (
            <div
              className={cn(
                'absolute inset-0 rounded-full animate-ping',
                display.pulseColor,
              )}
            />
          )}
        </div>

        {/* Message count badge */}
        {messageCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs font-bold"
          >
            {messageCount > 99 ? '99+' : messageCount}
          </Badge>
        )}

        {/* Wedding day critical indicator */}
        {weddingDayMode && !connected && (
          <div className="absolute -bottom-1 -right-1">
            <AlertTriangle className="h-3 w-3 text-red-600 animate-pulse" />
          </div>
        )}
      </div>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{CompactIndicator}</TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-medium">{display.text}</p>
                {lastUpdate && (
                  <p className="text-xs text-gray-500">
                    Last update: {formatDistanceToNow(lastUpdate)} ago
                  </p>
                )}
                {messageCount > 0 && (
                  <p className="text-xs text-gray-500">
                    {messageCount} updates today
                  </p>
                )}
                {weddingDayMode && (
                  <p className="text-xs font-semibold text-purple-600">
                    WEDDING DAY MODE
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return CompactIndicator;
  }

  // Full indicator with text and details
  return (
    <div
      className={cn(
        'flex items-center transition-all duration-300 rounded-lg',
        classes.padding,
        classes.gap,
        display.bgColor,
        display.borderColor,
        'border',
        weddingDayMode && 'ring-2 ring-purple-200',
      )}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${display.text}`}
      data-testid="connection-indicator"
    >
      {/* Connection icon or dot */}
      <div className="relative flex items-center">
        {size === 'sm' ? (
          <div
            className={cn(
              'rounded-full transition-all duration-300',
              classes.dot,
              display.color,
              isAnimating && 'animate-bounce',
            )}
          />
        ) : (
          <Icon
            className={cn(
              'transition-all duration-300',
              classes.icon,
              display.textColor,
              connectionStatus === 'reconnecting' && 'animate-spin',
              isAnimating && 'animate-bounce',
            )}
          />
        )}

        {/* Pulse animation for connected state */}
        {showPulse && connected && (
          <div
            className={cn(
              'absolute inset-0 rounded-full animate-ping',
              display.pulseColor,
              size === 'sm' ? classes.dot : 'h-4 w-4',
            )}
          />
        )}
      </div>

      {/* Connection status text */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'font-medium whitespace-nowrap',
            classes.text,
            display.textColor,
          )}
        >
          {display.text}
        </span>

        {/* Additional details */}
        {showDetails && (
          <div className="space-y-1 mt-1">
            {lastUpdate && (
              <p
                className={cn(
                  'text-gray-500',
                  size === 'lg' ? 'text-sm' : 'text-xs',
                )}
              >
                <Clock className="inline h-3 w-3 mr-1" />
                Last: {formatDistanceToNow(lastUpdate)} ago
              </p>
            )}
            {messageCount > 0 && (
              <p
                className={cn(
                  'text-gray-500',
                  size === 'lg' ? 'text-sm' : 'text-xs',
                )}
              >
                <Heart className="inline h-3 w-3 mr-1" />
                {messageCount} updates
              </p>
            )}
            {connectionQuality !== 'excellent' && connected && (
              <p
                className={cn(
                  'text-yellow-600',
                  size === 'lg' ? 'text-sm' : 'text-xs',
                )}
              >
                Connection: {connectionQuality}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Message count badge */}
      {messageCount > 0 && !showDetails && (
        <Badge variant="secondary" className="text-xs">
          {messageCount > 99 ? '99+' : messageCount}
        </Badge>
      )}

      {/* Wedding day indicator */}
      {weddingDayMode && (
        <Badge
          variant="outline"
          className="text-xs font-semibold text-purple-600 border-purple-300"
        >
          WEDDING DAY
        </Badge>
      )}

      {/* Retry button for errors */}
      {!connected && onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-auto p-1 text-xs"
          aria-label="Retry connection"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}

      {/* Wedding day critical alert */}
      {weddingDayMode && !connected && (
        <div
          className="flex items-center gap-1"
          data-testid="wedding-day-alert"
        >
          <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
          <span className="text-xs text-red-700 font-medium hidden sm:inline">
            Critical connection issue
          </span>
        </div>
      )}
    </div>
  );
}

// Wedding-specific indicator with preset configurations
export function WeddingRealtimeIndicator({
  weddingId,
  connected,
  ...props
}: {
  weddingId: string;
  connected: boolean;
} & Partial<UIRealtimeIndicatorProps>) {
  // Check if it's wedding day
  const today = new Date();
  const isWeddingDay = today.getDay() === 6; // Saturday

  return (
    <RealtimeIndicator
      connected={connected}
      weddingDayMode={isWeddingDay}
      showDetails={!window?.innerWidth || window.innerWidth > 768}
      compact={window?.innerWidth ? window.innerWidth <= 640 : false}
      {...props}
    />
  );
}
