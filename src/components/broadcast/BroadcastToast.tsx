'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Clock,
  Heart,
  Calendar,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BroadcastMessage } from '@/lib/broadcast/priority-queue';

interface BroadcastToastProps {
  broadcast: BroadcastMessage;
  onDismiss: () => void;
  onAction?: (url: string) => void;
  onAcknowledge?: (id: string) => void;
  autoHideDuration?: number;
  position?: 'top-right' | 'bottom-right' | 'top-center';
}

export function BroadcastToast({
  broadcast,
  onDismiss,
  onAction,
  onAcknowledge,
  autoHideDuration,
  position = 'top-right',
}: BroadcastToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(autoHideDuration || 0);
  const [isHovered, setIsHovered] = useState(false);

  // Priority-based styling with wedding industry colors
  const priorityConfig = {
    critical: {
      bg: 'bg-gradient-to-r from-red-600 to-red-700',
      border: 'border-red-500',
      icon: AlertCircle,
      iconColor: 'text-red-100',
      textColor: 'text-red-50',
      requiresAck: true,
      sound: true,
      animation: 'animate-pulse',
    },
    high: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
      border: 'border-amber-400',
      icon: AlertTriangle,
      iconColor: 'text-amber-100',
      textColor: 'text-amber-50',
      requiresAck: false,
      sound: false,
      animation: '',
    },
    normal: {
      bg: 'bg-gradient-to-r from-blue-600 to-blue-700',
      border: 'border-blue-500',
      icon: Info,
      iconColor: 'text-blue-100',
      textColor: 'text-blue-50',
      requiresAck: false,
      sound: false,
      animation: '',
    },
    low: {
      bg: 'bg-gradient-to-r from-slate-600 to-slate-700',
      border: 'border-slate-500',
      icon: CheckCircle,
      iconColor: 'text-slate-100',
      textColor: 'text-slate-50',
      requiresAck: false,
      sound: false,
      animation: '',
    },
  };

  const config = priorityConfig[broadcast.priority];
  const Icon = config.icon;

  // Wedding-specific type icons
  const getWeddingTypeIcon = (type: string) => {
    if (type.includes('wedding') || type.includes('ceremony')) return Heart;
    if (type.includes('timeline') || type.includes('schedule')) return Calendar;
    if (type.includes('supplier') || type.includes('vendor')) return Users;
    if (type.includes('maintenance')) return Clock;
    return Icon;
  };

  const WeddingIcon = getWeddingTypeIcon(broadcast.type);

  // Auto-hide timer with pause on hover
  useEffect(() => {
    if (!autoHideDuration || config.requiresAck || isHovered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          handleAutoHide();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [autoHideDuration, config.requiresAck, isHovered]);

  // Handle auto-hide
  const handleAutoHide = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  // Handle manual dismiss
  const handleDismiss = async () => {
    if (config.requiresAck) {
      // Critical broadcasts require explicit acknowledgment
      const confirmed = confirm(
        `This is a critical wedding alert. Are you sure you want to dismiss "${broadcast.title}"?`,
      );
      if (!confirmed) return;
    }

    setIsVisible(false);
    setTimeout(onDismiss, 300);

    // Track dismissal analytics
    try {
      await fetch('/api/broadcast/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcastId: broadcast.id,
          action: 'dismissed',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn('Failed to track broadcast dismissal:', error);
    }
  };

  // Handle action button click
  const handleAction = async () => {
    if (broadcast.action && onAction) {
      onAction(broadcast.action.url);

      // Track action click
      try {
        await fetch('/api/broadcast/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broadcastId: broadcast.id,
            action: 'action_clicked',
            timestamp: new Date().toISOString(),
            actionUrl: broadcast.action.url,
          }),
        });
      } catch (error) {
        console.warn('Failed to track broadcast action:', error);
      }
    }
  };

  // Handle acknowledge button
  const handleAcknowledge = async () => {
    if (onAcknowledge) {
      onAcknowledge(broadcast.id);
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.8,
            x: position.includes('right') ? 100 : 0,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            x: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.8,
            x: position.includes('right') ? 100 : 0,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'fixed z-50 w-full max-w-sm pointer-events-auto',
            positionClasses[position],
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="alert"
          aria-live={broadcast.priority === 'critical' ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-xl shadow-2xl backdrop-blur-sm',
              'border border-opacity-20',
              config.bg,
              config.border,
              config.animation,
            )}
          >
            {/* Priority indicator stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />

            {/* Main content */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon with wedding context */}
                <div className="flex-shrink-0 relative">
                  <Icon
                    className={cn('w-5 h-5', config.iconColor)}
                    aria-hidden="true"
                  />
                  {broadcast.weddingContext && (
                    <WeddingIcon
                      className="w-3 h-3 absolute -bottom-1 -right-1 text-white bg-black/20 rounded-full p-0.5"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title with priority badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <h4
                      className={cn('font-semibold text-sm', config.textColor)}
                      id={`broadcast-title-${broadcast.id}`}
                    >
                      {broadcast.title}
                    </h4>
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5 bg-white/20 text-white border-none"
                      aria-label={`Priority: ${broadcast.priority}`}
                    >
                      {broadcast.priority.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Wedding context info */}
                  {broadcast.weddingContext && (
                    <div
                      className={cn(
                        'text-xs opacity-80 mb-2',
                        config.textColor,
                      )}
                    >
                      <Heart
                        className="w-3 h-3 inline mr-1"
                        aria-hidden="true"
                      />
                      {broadcast.weddingContext.coupleName} •{' '}
                      {new Date(
                        broadcast.weddingContext.weddingDate,
                      ).toLocaleDateString()}
                    </div>
                  )}

                  {/* Message */}
                  <p
                    className={cn(
                      'text-sm opacity-90 leading-relaxed',
                      config.textColor,
                    )}
                    aria-describedby={`broadcast-title-${broadcast.id}`}
                  >
                    {broadcast.message}
                  </p>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    {broadcast.action && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleAction}
                        className="text-xs bg-white/20 hover:bg-white/30 text-white border-white/30 focus:ring-2 focus:ring-white/50"
                        aria-label={`${broadcast.action.label} - opens in new window`}
                      >
                        {broadcast.action.label} →
                      </Button>
                    )}

                    {config.requiresAck && (
                      <Button
                        size="sm"
                        onClick={handleAcknowledge}
                        className="text-xs bg-white text-red-600 hover:bg-gray-100 font-medium focus:ring-2 focus:ring-white"
                        aria-label="Acknowledge this critical alert"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>

                  {/* Expiry info */}
                  {broadcast.expiresAt && (
                    <div
                      className={cn(
                        'text-xs mt-2 opacity-70',
                        config.textColor,
                      )}
                    >
                      <Clock
                        className="w-3 h-3 inline mr-1"
                        aria-hidden="true"
                      />
                      Expires {new Date(broadcast.expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Close button */}
                {!config.requiresAck && (
                  <button
                    onClick={handleDismiss}
                    className={cn(
                      'flex-shrink-0 hover:opacity-70 transition-opacity focus:ring-2 focus:ring-white/50 rounded p-1',
                      config.iconColor,
                    )}
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar for auto-hide */}
            {autoHideDuration && !config.requiresAck && !isHovered && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1 bg-black/20"
                role="progressbar"
                aria-label="Time remaining before auto-dismiss"
                aria-valuenow={timeLeft}
                aria-valuemin={0}
                aria-valuemax={autoHideDuration}
              >
                <motion.div
                  className="h-full bg-white/50"
                  initial={{ width: '100%' }}
                  animate={{
                    width: `${(timeLeft / autoHideDuration) * 100}%`,
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
