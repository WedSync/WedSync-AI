/**
 * WS-243 Mobile Chat Interface Component
 * Team D - Mobile-First AI Chatbot Integration System
 *
 * CORE FEATURES:
 * - Bottom sheet pattern for mobile-first chat experience
 * - Touch-optimized interface with 48px minimum touch targets
 * - Keyboard avoidance and input handling
 * - Offline message queuing for poor connections
 * - WedMe platform integration with wedding context
 * - Performance optimized for mobile devices (<200ms interactions)
 *
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MessageCircle, X, Minimize2, Maximize2, Send } from 'lucide-react';
import { useMobileChat } from '@/hooks/useMobileChat';
import { BottomSheetChat } from './BottomSheetChat';
import { MobileMessageBubble } from './MobileMessageBubble';
import { TouchInputHandler } from './TouchInputHandler';
import {
  ChatMessage,
  WeddingContext,
  ChatState,
  MobileChatInterfaceProps,
} from './types';

// Types imported from types.ts to avoid circular dependencies

/**
 * Mobile Chat Interface Component
 */
export function MobileChatInterface({
  isVisible,
  onToggle,
  conversationId,
  weddingContext,
  userRole = 'couple',
  className,
  enableHaptics = true,
  offlineMode = false,
  keyboardAdjustment = true,
  virtualScrolling = true,
  messageLimit = 100,
  onMessageSend,
  onFileUpload,
  onVoiceInput,
}: MobileChatInterfaceProps) {
  // State management
  const [chatState, setChatState] = useState<ChatState>('hidden');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refs
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const {
    sendMessage,
    isOnline,
    queuedMessages,
    syncPendingMessages,
    hapticFeedback,
    screenReaderAnnounce,
  } = useMobileChat({
    conversationId,
    weddingContext,
    userRole,
    enableHaptics,
    offlineMode,
  });

  // Handle chat state changes
  const handleStateChange = useCallback(
    (newState: ChatState) => {
      setChatState(newState);

      if (enableHaptics) {
        hapticFeedback('selection');
      }

      // Announce state changes to screen readers
      screenReaderAnnounce(`Chat ${newState}`);

      // Auto-focus input when expanding
      if (newState !== 'hidden' && newState !== 'minimized') {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      }
    },
    [enableHaptics, hapticFeedback, screenReaderAnnounce],
  );

  // Handle message sending
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      timestamp: new Date(),
      isBot: false,
      type: 'text',
      status: 'sending',
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Send message via custom hook
      await sendMessage(inputValue, weddingContext);

      // Update message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: 'sent' as const } : msg,
        ),
      );

      // Handle custom send callback
      if (onMessageSend) {
        await onMessageSend(inputValue);
      }

      // Simulate AI response (replace with actual AI integration)
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: generateContextualResponse(
            inputValue,
            weddingContext,
            userRole,
          ),
          timestamp: new Date(),
          isBot: true,
          type: 'text',
          status: 'delivered',
        };

        setMessages((prev) => [...prev, aiResponse]);
        setIsTyping(false);

        if (enableHaptics) {
          hapticFeedback('notification');
        }
      }, 1500);
    } catch (error) {
      // Handle send failure
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? { ...msg, status: 'failed' as const }
            : msg,
        ),
      );
      setIsTyping(false);
    }
  }, [
    inputValue,
    sendMessage,
    weddingContext,
    onMessageSend,
    enableHaptics,
    hapticFeedback,
    userRole,
  ]);

  // Handle keyboard events
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  // Handle drag events for bottom sheet
  const handleDrag = useCallback(
    (_: any, info: PanInfo) => {
      const { offset, velocity } = info;

      if (velocity.y > 500 || offset.y > 100) {
        // Swipe down to minimize
        if (chatState === 'full') {
          handleStateChange('half');
        } else if (chatState === 'half') {
          handleStateChange('minimized');
        }
      } else if (velocity.y < -500 || offset.y < -100) {
        // Swipe up to expand
        if (chatState === 'minimized') {
          handleStateChange('half');
        } else if (chatState === 'half') {
          handleStateChange('full');
        }
      }
    },
    [chatState, handleStateChange],
  );

  // Auto-sync pending messages when coming online
  useEffect(() => {
    if (isOnline && queuedMessages.length > 0) {
      syncPendingMessages();
    }
  }, [isOnline, queuedMessages, syncPendingMessages]);

  // Handle visibility prop changes
  useEffect(() => {
    if (isVisible) {
      handleStateChange('half');
    } else {
      handleStateChange('hidden');
    }
  }, [isVisible, handleStateChange]);

  // Keyboard height detection for mobile
  useEffect(() => {
    if (!keyboardAdjustment) return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const newKeyboardHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(Math.max(0, newKeyboardHeight));
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () =>
        window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, [keyboardAdjustment]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  if (chatState === 'hidden') return null;

  return (
    <div
      ref={containerRef}
      className={cn('fixed inset-0 z-50 pointer-events-none', className)}
      style={{
        paddingBottom: keyboardHeight,
      }}
    >
      {/* Floating Chat Button (when minimized) */}
      <AnimatePresence>
        {chatState === 'minimized' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleStateChange('half')}
            className={cn(
              'fixed bottom-6 right-6 pointer-events-auto',
              'w-14 h-14 rounded-full shadow-lg',
              'bg-gradient-to-r from-blue-500 to-blue-600',
              'text-white flex items-center justify-center',
              'border-2 border-white/20',
              'active:shadow-xl transition-all duration-200',
              // Accessibility
              'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2',
            )}
            aria-label={`Open chat${unreadCount > 0 ? ` (${unreadCount} unread messages)` : ''}`}
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Sheet Chat Interface */}
      <BottomSheetChat
        isVisible={chatState !== 'hidden' && chatState !== 'minimized'}
        state={chatState}
        onStateChange={handleStateChange}
        onClose={() => {
          handleStateChange('hidden');
          onToggle();
        }}
        keyboardHeight={keyboardHeight}
        onDrag={handleDrag}
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Wedding Assistant</h3>
              <div className="flex items-center space-x-2">
                {!isOnline && (
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                )}
                <p className="text-sm text-gray-500">
                  {isOnline ? 'Online' : 'Offline'}
                  {weddingContext &&
                    ` • ${weddingContext.coupleNames.join(' & ')}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                handleStateChange(chatState === 'full' ? 'half' : 'full')
              }
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={
                chatState === 'full' ? 'Minimize chat' : 'Expand chat'
              }
            >
              {chatState === 'full' ? (
                <Minimize2 className="w-5 h-5 text-gray-600" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600" />
              )}
            </button>

            <button
              onClick={() => {
                handleStateChange('hidden');
                onToggle();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={messagesRef}
          className={cn(
            'flex-1 overflow-y-auto p-4 space-y-4',
            'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
          )}
          style={{
            maxHeight:
              chatState === 'full'
                ? `calc(100vh - 200px - ${keyboardHeight}px)`
                : '300px',
          }}
        >
          {messages.map((message, index) => (
            <MobileMessageBubble
              key={message.id}
              message={message}
              isBot={message.isBot}
              showTimestamp={
                index === 0 ||
                messages[index - 1].timestamp.getTime() -
                  message.timestamp.getTime() >
                  300000
              }
              touchFeedback={enableHaptics}
              weddingContext={weddingContext}
            />
          ))}

          {isTyping && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
              <span className="text-sm">AI is typing...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <TouchInputHandler
          ref={inputRef}
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          onFileUpload={onFileUpload}
          onVoiceInput={onVoiceInput}
          disabled={!isOnline && !offlineMode}
          enableHaptics={enableHaptics}
          weddingContext={weddingContext}
          className="border-t border-gray-200 bg-white/80 backdrop-blur-sm"
        />

        {/* Offline Indicator */}
        {!isOnline && queuedMessages.length > 0 && (
          <div className="px-4 py-2 bg-orange-50 border-t border-orange-200">
            <p className="text-sm text-orange-700">
              {queuedMessages.length} message
              {queuedMessages.length !== 1 ? 's' : ''} queued for when you're
              back online
            </p>
          </div>
        )}
      </BottomSheetChat>
    </div>
  );
}

/**
 * Generate contextual AI responses based on wedding context and user role
 */
function generateContextualResponse(
  input: string,
  weddingContext?: WeddingContext,
  userRole?: string,
): string {
  const lowerInput = input.toLowerCase();

  // Wedding planning responses
  if (lowerInput.includes('timeline') && weddingContext) {
    return `Your wedding timeline has ${weddingContext.timeline.length} events scheduled. Would you like me to review any specific timing or add new events?`;
  }

  if (lowerInput.includes('budget') && weddingContext) {
    const remaining = weddingContext.budget.remaining;
    return `You have ${remaining > 0 ? `$${remaining} remaining` : `exceeded budget by $${Math.abs(remaining)}`} in your wedding budget. Would you like to see a breakdown by category?`;
  }

  if (lowerInput.includes('vendor') && weddingContext) {
    const pending = weddingContext.vendorList.filter(
      (v) => v.status === 'pending',
    ).length;
    return `You have ${pending} vendor${pending !== 1 ? 's' : ''} with pending confirmations. Would you like me to help you follow up?`;
  }

  // Guest-specific responses
  if (userRole === 'guest') {
    if (lowerInput.includes('dress') || lowerInput.includes('attire')) {
      return "For the wedding attire, I'd recommend checking with the couple about the dress code. It's typically mentioned in the invitation or wedding website!";
    }

    if (lowerInput.includes('parking') || lowerInput.includes('location')) {
      return 'Let me help you with venue details! The couple should have parking and location information on their wedding website. Would you like me to help you find it?';
    }
  }

  // Default responses
  const responses = [
    "I'm here to help with your wedding planning! What would you like to know?",
    "That's a great question! Let me help you with that.",
    "I'd be happy to assist you with your wedding needs. Can you tell me more about what you're looking for?",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

export default MobileChatInterface;
