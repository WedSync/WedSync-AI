'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  RefreshCw,
  User,
  Bot,
  Clock,
  AlertTriangle,
  Paperclip,
} from 'lucide-react';
import {
  MessageBubbleProps,
  MessageBubbleState,
  MessageAttachment,
} from '@/types/chatbot';
import { cn } from '@/lib/utils';

export function MessageBubble({
  message,
  isBot,
  showAvatar = true,
  showTimestamp = true,
  isLatest = false,
  onResend,
  onCopy,
}: MessageBubbleProps) {
  const [state, setState] = useState<MessageBubbleState>({
    isHovered: false,
    showActions: false,
    isCopied: false,
  });

  // Format timestamp for display
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Handle copy message to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setState((prev) => ({ ...prev, isCopied: true }));
      onCopy?.();

      // Reset copy state after 2 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, isCopied: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, [message.content, onCopy]);

  // Handle message hover
  const handleMouseEnter = useCallback(() => {
    setState((prev) => ({ ...prev, isHovered: true, showActions: true }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setState((prev) => ({ ...prev, isHovered: false, showActions: false }));
  }, []);

  // Render attachment previews
  const renderAttachments = (attachments: MessageAttachment[]) => {
    if (!attachments?.length) return null;

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className={cn(
              'flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm',
              attachment.securityValidated
                ? 'border-l-4 border-success-500'
                : 'border-l-4 border-warning-500',
            )}
          >
            <Paperclip className="w-4 h-4 text-gray-400" />
            <span className="flex-1 truncate">{attachment.name}</span>
            <span className="text-xs text-gray-500">
              {Math.round(attachment.size / 1024)}KB
            </span>
            {!attachment.securityValidated && (
              <AlertTriangle className="w-4 h-4 text-warning-500" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Determine message status styling
  const getMessageStatusStyling = () => {
    if (message.is_flagged) {
      return 'border-l-4 border-error-500 bg-error-50';
    }
    if (isBot && message.tokens_used > 0) {
      return 'border-l-4 border-success-500 bg-success-50';
    }
    return '';
  };

  // Animation variants for message appearance
  const messageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    },
    exit: { opacity: 0, y: -10, scale: 0.95 },
  };

  const actionsVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative group',
        isBot ? 'flex justify-start' : 'flex justify-end',
      )}
    >
      <div
        className={cn(
          'flex gap-3 max-w-[80%]',
          isBot ? 'flex-row' : 'flex-row-reverse',
        )}
      >
        {/* Avatar */}
        {showAvatar && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-shrink-0 mt-1"
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                isBot
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-blue-100 text-blue-600',
              )}
            >
              {isBot ? (
                <Bot className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          </motion.div>
        )}

        {/* Message content */}
        <div
          className={cn('flex flex-col', isBot ? 'items-start' : 'items-end')}
        >
          {/* Message bubble */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={cn(
              'relative rounded-2xl px-4 py-3 shadow-sm',
              'max-w-full break-words',
              getMessageStatusStyling(),
              isBot
                ? 'bg-gray-100 text-gray-900 rounded-bl-sm'
                : 'bg-primary-600 text-white rounded-br-sm',
            )}
          >
            {/* Flagged message indicator */}
            {message.is_flagged && (
              <div className="mb-2 flex items-center gap-2 text-xs text-error-600">
                <AlertTriangle className="w-3 h-3" />
                <span>Flagged: {message.flag_reason}</span>
              </div>
            )}
            {/* Message content */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
            {/* Attachments */}
            {renderAttachments([])}{' '}
            {/* TODO: Add attachments from message metadata */}
            {/* AI metadata for bot messages */}
            {isBot && message.tokens_used > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span>AI Response</span>
                  <span>•</span>
                  <span>{message.tokens_used} tokens</span>
                  <span>•</span>
                  <span>{message.response_time_ms}ms</span>
                </div>
              </div>
            )}
            {/* Edited indicator */}
            {message.is_edited && (
              <div className="mt-1 text-xs opacity-60">(edited)</div>
            )}
          </motion.div>

          {/* Timestamp and status */}
          {showTimestamp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn(
                'mt-1 flex items-center gap-2 text-xs text-gray-500',
                isBot ? 'justify-start' : 'justify-end',
              )}
            >
              <Clock className="w-3 h-3" />
              <span>{formatTime(message.created_at)}</span>

              {/* Message status for user messages */}
              {!isBot && (
                <span className="flex items-center gap-1">
                  <span>•</span>
                  {message.is_flagged ? (
                    <span className="text-error-500">Flagged</span>
                  ) : (
                    <span className="text-success-500">Delivered</span>
                  )}
                </span>
              )}
            </motion.div>
          )}

          {/* Action buttons (visible on hover) */}
          <AnimatePresence>
            {state.showActions && (
              <motion.div
                variants={actionsVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  'absolute top-0 flex items-center gap-1 z-10',
                  isBot ? '-right-20' : '-left-20',
                )}
              >
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center gap-1">
                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'p-1.5 rounded hover:bg-gray-100 transition-colors',
                      'text-gray-600 hover:text-gray-800',
                    )}
                    title="Copy message"
                    aria-label="Copy message"
                  >
                    {state.isCopied ? (
                      <Check className="w-3 h-3 text-success-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  {/* Resend button for failed messages */}
                  {!isBot && onResend && (
                    <button
                      onClick={onResend}
                      className={cn(
                        'p-1.5 rounded hover:bg-gray-100 transition-colors',
                        'text-gray-600 hover:text-gray-800',
                      )}
                      title="Resend message"
                      aria-label="Resend message"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Message threading indicator for latest message */}
      {isLatest && isBot && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-2 left-11 w-2 h-2 bg-primary-500 rounded-full"
        />
      )}
    </motion.div>
  );
}

export default MessageBubble;
