/**
 * WS-243 Mobile Message Bubble Component
 * Team D - Touch-Optimized Chat Messages
 *
 * CORE FEATURES:
 * - Touch-friendly message bubbles with haptic feedback
 * - Long press for message actions (copy, delete, forward)
 * - Wedding context-aware quick actions
 * - Accessibility support with screen reader announcements
 * - Status indicators (sending, sent, delivered, failed)
 * - Media attachments with optimized loading
 *
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Copy,
  Trash2,
  Forward,
  Calendar,
  DollarSign,
  Users,
  MapPin,
} from 'lucide-react';
import { ChatMessage, WeddingContext, MobileMessageBubbleProps } from './types';

// Props imported from types.ts to avoid circular dependencies

/**
 * Message action menu item
 */
interface MessageAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color?: string;
  dangerous?: boolean;
}

/**
 * Mobile Message Bubble Component
 */
export function MobileMessageBubble({
  message,
  isBot,
  showTimestamp = false,
  touchFeedback = true,
  weddingContext,
  className,
  onCopy,
  onDelete,
  onForward,
  onQuickAction,
}: MobileMessageBubbleProps) {
  // State
  const [showActions, setShowActions] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Refs
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Generate message actions based on context
  const getMessageActions = useCallback((): MessageAction[] => {
    const baseActions: MessageAction[] = [
      { id: 'copy', label: 'Copy', icon: Copy },
    ];

    if (!isBot) {
      baseActions.push(
        { id: 'forward', label: 'Forward', icon: Forward },
        { id: 'delete', label: 'Delete', icon: Trash2, dangerous: true },
      );
    }

    // Add wedding-specific actions for bot messages
    if (isBot && message.metadata?.quickActions) {
      message.metadata.quickActions.forEach((action) => {
        baseActions.unshift({
          id: action.action,
          label: action.label,
          icon: getActionIcon(action.action),
          color: 'blue',
        });
      });
    }

    return baseActions;
  }, [isBot, message.metadata?.quickActions]);

  // Handle long press start
  const handlePressStart = useCallback(() => {
    if (!touchFeedback) return;

    const timer = setTimeout(() => {
      // Haptic feedback for long press
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      setShowActions(true);
    }, 500); // 500ms for long press

    setPressTimer(timer);
  }, [touchFeedback]);

  // Handle press end
  const handlePressEnd = useCallback(() => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  // Handle action selection
  const handleActionSelect = useCallback(
    (action: MessageAction) => {
      setShowActions(false);

      // Haptic feedback for action selection
      if (touchFeedback && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }

      // Handle built-in actions
      switch (action.id) {
        case 'copy':
          navigator.clipboard?.writeText(message.content);
          onCopy?.(message);
          break;
        case 'delete':
          onDelete?.(message.id);
          break;
        case 'forward':
          onForward?.(message);
          break;
        default:
          // Handle custom wedding actions
          onQuickAction?.(action.id, message);
          break;
      }
    },
    [touchFeedback, message, onCopy, onDelete, onForward, onQuickAction],
  );

  // Get status icon
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'flex flex-col space-y-1',
        isBot ? 'items-start' : 'items-end',
        className,
      )}
    >
      {/* Timestamp */}
      {showTimestamp && (
        <span className="text-xs text-gray-500 px-2">
          {formatTimestamp(message.timestamp)}
        </span>
      )}

      {/* Message Bubble */}
      <motion.div
        ref={bubbleRef}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        className={cn(
          'relative max-w-[280px] px-4 py-3 rounded-2xl',
          'select-none cursor-pointer',
          // Message bubble styling
          isBot
            ? 'bg-gray-100 text-gray-900 mr-12'
            : 'bg-blue-500 text-white ml-12',
          // Touch feedback
          'active:scale-95 transition-transform duration-100',
          // Accessibility
          'focus:outline-none focus:ring-2 focus:ring-blue-400',
        )}
        role="button"
        tabIndex={0}
        aria-label={`Message: ${message.content}${isBot ? ' from assistant' : ' from you'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowActions(true);
          }
        }}
      >
        {/* Message Content */}
        <div className="break-words whitespace-pre-wrap">{message.content}</div>

        {/* Attachments */}
        {message.metadata?.attachments && (
          <div className="mt-2 space-y-2">
            {message.metadata.attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg"
              >
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-12 h-12 object-cover rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {attachment.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm truncate">{attachment.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions (for bot messages) */}
        {isBot && message.metadata?.quickActions && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.metadata.quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => onQuickAction?.(action.action, message)}
                className={cn(
                  'inline-flex items-center space-x-1 px-3 py-1',
                  'bg-white/20 hover:bg-white/30 rounded-full',
                  'text-sm font-medium transition-colors',
                  'min-h-[32px]', // Touch target
                )}
              >
                {action.icon && (
                  <span className="w-4 h-4">
                    {getActionIcon(action.action)}
                  </span>
                )}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Status and Timestamp */}
        <div
          className={cn(
            'flex items-center justify-end space-x-1 mt-1',
            isBot ? 'text-gray-500' : 'text-white/70',
          )}
        >
          <span className="text-xs">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isBot && getStatusIcon()}
        </div>
      </motion.div>

      {/* Action Menu */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={cn(
              'absolute z-10 p-2 bg-white rounded-xl shadow-2xl border',
              'flex flex-wrap gap-2 min-w-[200px]',
              isBot ? 'left-0' : 'right-0',
            )}
            style={{
              top: bubbleRef.current ? bubbleRef.current.offsetHeight + 10 : 0,
            }}
          >
            {getMessageActions().map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionSelect(action)}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg',
                  'hover:bg-gray-100 transition-colors',
                  'min-h-[44px] min-w-[44px]', // Touch target
                  action.dangerous && 'text-red-600 hover:bg-red-50',
                  action.color === 'blue' && 'text-blue-600 hover:bg-blue-50',
                )}
              >
                <action.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close actions */}
      {showActions && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowActions(false)}
          onTouchStart={() => setShowActions(false)}
        />
      )}
    </div>
  );
}

/**
 * Get icon for quick actions
 */
function getActionIcon(action: string) {
  switch (action) {
    case 'add_to_timeline':
      return <Calendar className="w-4 h-4" />;
    case 'add_to_budget':
      return <DollarSign className="w-4 h-4" />;
    case 'add_guest':
      return <Users className="w-4 h-4" />;
    case 'add_location':
      return <MapPin className="w-4 h-4" />;
    default:
      return <Check className="w-4 h-4" />;
  }
}

/**
 * Generate wedding context quick actions
 */
export function generateQuickActions(
  messageContent: string,
  weddingContext?: WeddingContext,
): Array<{ label: string; action: string; icon?: string }> {
  const actions = [];

  if (!weddingContext) return actions;

  const lowerContent = messageContent.toLowerCase();

  // Timeline actions
  if (lowerContent.includes('time') || lowerContent.includes('schedule')) {
    actions.push({
      label: 'Add to Timeline',
      action: 'add_to_timeline',
      icon: 'calendar',
    });
  }

  // Budget actions
  if (
    lowerContent.includes('cost') ||
    lowerContent.includes('budget') ||
    lowerContent.includes('price')
  ) {
    actions.push({
      label: 'Add to Budget',
      action: 'add_to_budget',
      icon: 'dollar-sign',
    });
  }

  // Guest actions
  if (lowerContent.includes('guest') || lowerContent.includes('invite')) {
    actions.push({
      label: 'Add Guest',
      action: 'add_guest',
      icon: 'users',
    });
  }

  // Location actions
  if (lowerContent.includes('venue') || lowerContent.includes('location')) {
    actions.push({
      label: 'Save Location',
      action: 'add_location',
      icon: 'map-pin',
    });
  }

  return actions;
}

export default MobileMessageBubble;
