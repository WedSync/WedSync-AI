'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  X,
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  Zap,
  Shield,
} from 'lucide-react';
import {
  ChatInputProps,
  ChatInputState,
  CHAT_CONSTANTS,
} from '@/types/chatbot';
import { validateFileUpload } from '@/lib/security/file-validation';
import { cn } from '@/lib/utils';

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = CHAT_CONSTANTS.MAX_MESSAGE_LENGTH,
  allowAttachments = true,
  suggestedQuestions = [],
  isLoading = false,
  remainingRequests = 0,
  onFileUpload,
}: ChatInputProps) {
  const [state, setState] = useState<ChatInputState>({
    message: '',
    attachments: [],
    showSuggestions: false,
    isComposing: false,
    charactersRemaining: maxLength,
    dragover: false,
  });

  // Refs for DOM elements
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 120; // 6 lines approximately
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Handle message input
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;

      if (value.length <= maxLength) {
        setState((prev) => ({
          ...prev,
          message: value,
          charactersRemaining: maxLength - value.length,
          showSuggestions: value.length === 0 && suggestedQuestions.length > 0,
        }));
        adjustTextareaHeight();
      }
    },
    [maxLength, suggestedQuestions.length, adjustTextareaHeight],
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || !allowAttachments) return;

      const newAttachments: File[] = [];
      const validationErrors: string[] = [];

      for (const file of Array.from(files)) {
        try {
          const validation = await validateFileUpload(file, {
            allowedTypes: CHAT_CONSTANTS.ALLOWED_FILE_TYPES,
            maxSize: CHAT_CONSTANTS.MAX_FILE_SIZE,
          });

          if (validation.isValid) {
            newAttachments.push(file);
          } else {
            validationErrors.push(`${file.name}: ${validation.error}`);
          }
        } catch (error) {
          validationErrors.push(`${file.name}: Validation failed`);
        }
      }

      if (validationErrors.length > 0) {
        console.error('File validation errors:', validationErrors);
        // TODO: Show error toast to user
      }

      setState((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments].slice(0, 5), // Max 5 files
      }));

      onFileUpload?.(newAttachments);
    },
    [allowAttachments, onFileUpload],
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, dragover: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, dragover: false }));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState((prev) => ({ ...prev, dragover: false }));
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  }, []);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!state.message.trim() && state.attachments.length === 0) return;
    if (disabled || isLoading) return;

    try {
      await onSendMessage(state.message.trim(), state.attachments);

      // Clear input after successful send
      setState((prev) => ({
        ...prev,
        message: '',
        attachments: [],
        charactersRemaining: maxLength,
        showSuggestions: false,
      }));

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Error handling is managed by the chat hook
    }
  }, [
    state.message,
    state.attachments,
    disabled,
    isLoading,
    onSendMessage,
    maxLength,
  ]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }

      if (e.key === 'Escape') {
        setState((prev) => ({ ...prev, showSuggestions: false }));
      }
    },
    [handleSend],
  );

  // Handle suggested question click
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setState((prev) => ({
        ...prev,
        message: suggestion,
        showSuggestions: false,
        charactersRemaining: maxLength - suggestion.length,
      }));
      textareaRef.current?.focus();
      adjustTextareaHeight();
    },
    [maxLength, adjustTextareaHeight],
  );

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Show suggestions when textarea is empty
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      showSuggestions:
        prev.message.length === 0 && suggestedQuestions.length > 0,
    }));
  }, [suggestedQuestions.length]);

  const canSend =
    state.message.trim().length > 0 || state.attachments.length > 0;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Suggested Questions */}
      <AnimatePresence>
        {state.showSuggestions && suggestedQuestions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3 border-b border-gray-100 overflow-hidden"
          >
            <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.slice(0, 3).map((question, index) => (
                <motion.button
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSuggestionClick(question)}
                  className={cn(
                    'px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200',
                    'rounded-full transition-colors duration-200',
                    'text-gray-700 hover:text-gray-900',
                  )}
                >
                  <Zap className="w-3 h-3 inline mr-1" />
                  {question}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Attachments Preview */}
      <AnimatePresence>
        {state.attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 bg-gray-50 border-b border-gray-200 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {state.attachments.length} file
                {state.attachments.length > 1 ? 's' : ''} attached
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.attachments.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200 text-sm"
                >
                  <span className="truncate max-w-32">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round(file.size / 1024)}KB)
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-error-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative p-4',
          state.dragover && 'bg-primary-50 border-primary-200',
        )}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {state.dragover && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary-50 border-2 border-dashed border-primary-300 rounded-lg flex items-center justify-center z-10"
            >
              <div className="text-center">
                <Paperclip className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="text-sm text-primary-700 font-medium">
                  Drop files here to attach
                </p>
                <p className="text-xs text-primary-600">
                  Max {Math.round(CHAT_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024)}MB
                  per file
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          {/* File attachment button */}
          {allowAttachments && (
            <div className="flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={CHAT_CONSTANTS.ALLOWED_FILE_TYPES.join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className={cn(
                  'p-2 rounded-lg transition-colors duration-200',
                  'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={state.message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? 'Chat disabled...' : placeholder}
              disabled={disabled}
              maxLength={maxLength}
              rows={1}
              className={cn(
                'w-full resize-none rounded-lg border border-gray-300',
                'px-4 py-3 pr-12 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'transition-all duration-200',
                'placeholder-gray-500',
                disabled && 'bg-gray-50 cursor-not-allowed',
              )}
              style={{ minHeight: '44px' }}
            />

            {/* Character counter */}
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {state.charactersRemaining}
            </div>
          </div>

          {/* Send button */}
          <div className="flex-shrink-0">
            <motion.button
              type="button"
              onClick={handleSend}
              disabled={disabled || !canSend || isLoading}
              whileHover={canSend && !disabled ? { scale: 1.05 } : {}}
              whileTap={canSend && !disabled ? { scale: 0.95 } : {}}
              className={cn(
                'p-2.5 rounded-lg transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                canSend && !disabled
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed',
              )}
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span>Messages encrypted & secured</span>
          </div>

          <div className="flex items-center gap-2">
            {remainingRequests > 0 ? (
              <span>{remainingRequests} requests remaining</span>
            ) : (
              <span className="text-warning-600">Rate limit reached</span>
            )}
            <span>•</span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd>
            <span>to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
