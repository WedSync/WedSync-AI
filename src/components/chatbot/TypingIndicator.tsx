'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Clock } from 'lucide-react';
import { TypingIndicatorProps } from '@/types/chatbot';
import { cn } from '@/lib/utils';

export function TypingIndicator({
  isVisible,
  aiName = 'WedSync Assistant',
  showProgress = false,
  estimatedTime,
  customMessage,
}: TypingIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');

  // Simulate progress for estimated time
  useEffect(() => {
    if (!isVisible || !estimatedTime || !showProgress) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Don't reach 100% until response arrives
        return prev + 100 / (estimatedTime / 100); // Increment based on estimated time
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, estimatedTime, showProgress]);

  // Cycle through thinking messages
  useEffect(() => {
    if (!isVisible) {
      setCurrentMessage('');
      return;
    }

    const messages = [
      `${aiName} is thinking...`,
      'Analyzing your wedding context...',
      'Preparing personalized response...',
      'Almost ready...',
    ];

    let messageIndex = 0;
    setCurrentMessage(messages[0]);

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCurrentMessage(messages[messageIndex]);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, [isVisible, aiName]);

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0, y: 20, scale: 0.9 },
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
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.9,
      transition: { duration: 0.2 },
    },
  };

  const dotVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const progressVariants = {
    initial: { width: '0%' },
    animate: {
      width: `${progress}%`,
      transition: { duration: 0.3 },
    },
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="typing-indicator"
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex justify-start"
      >
        <div className="flex gap-3 max-w-[80%]">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-shrink-0 mt-1"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Typing bubble */}
          <div className="flex flex-col items-start">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm"
            >
              {/* Custom message or default typing */}
              {customMessage ? (
                <div className="text-sm text-gray-700">{customMessage}</div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Animated typing dots */}
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((index) => (
                      <motion.div
                        key={index}
                        variants={dotVariants}
                        animate="animate"
                        className="w-2 h-2 bg-primary-400 rounded-full"
                        style={{
                          animationDelay: `${index * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Dynamic message */}
                  <motion.span
                    key={currentMessage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-gray-600 ml-2"
                  >
                    {currentMessage}
                  </motion.span>
                </div>
              )}

              {/* Progress bar */}
              {showProgress && estimatedTime && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Processing...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <motion.div
                      variants={progressVariants}
                      animate="animate"
                      className="bg-primary-500 h-1 rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Estimated time display */}
              {estimatedTime && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>~{estimatedTime}s</span>
                </div>
              )}
            </motion.div>

            {/* Thinking indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-1 flex items-center gap-2 text-xs text-gray-500"
            >
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3"
                >
                  <div className="w-full h-full border border-primary-300 border-t-primary-600 rounded-full" />
                </motion.div>
                <span>AI is generating response</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Pulsing indicator for latest activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-2 left-11"
        >
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-2 h-2 bg-primary-400 rounded-full"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Enhanced typing indicator with wedding context
export function WeddingTypingIndicator({
  isVisible,
  weddingContext,
  ...props
}: TypingIndicatorProps & {
  weddingContext?: {
    taskType?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
}) {
  const getContextualMessage = () => {
    if (!weddingContext?.taskType) return undefined;

    const messages: Record<string, string> = {
      timeline: 'Analyzing your wedding timeline...',
      vendor: 'Checking vendor recommendations...',
      budget: 'Calculating budget insights...',
      guest: 'Processing guest management data...',
      planning: 'Creating your planning recommendations...',
      emergency: 'Prioritizing your urgent request...',
    };

    return messages[weddingContext.taskType];
  };

  const getEstimatedTime = () => {
    if (!weddingContext?.urgency) return props.estimatedTime;

    const timeMap = {
      critical: 2,
      high: 5,
      medium: 8,
      low: 12,
    };

    return timeMap[weddingContext.urgency];
  };

  return (
    <TypingIndicator
      {...props}
      isVisible={isVisible}
      customMessage={getContextualMessage()}
      estimatedTime={getEstimatedTime()}
    />
  );
}

export default TypingIndicator;
