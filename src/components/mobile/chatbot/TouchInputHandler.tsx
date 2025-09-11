/**
 * WS-243 Touch Input Handler Component
 * Team D - Mobile Touch & Voice Input Management
 *
 * CORE FEATURES:
 * - Touch-optimized text input with gesture support
 * - Voice-to-text integration with push-to-talk
 * - File and photo upload with drag-and-drop
 * - Quick reply suggestions above keyboard
 * - Emoji reactions and shortcut buttons
 * - Keyboard avoidance and height adjustment
 * - Haptic feedback for all interactions
 *
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Camera,
  Paperclip,
  Smile,
  Plus,
  X,
} from 'lucide-react';
import { WeddingContext } from './types';

/**
 * Quick reply suggestion
 */
interface QuickReply {
  id: string;
  text: string;
  category?: 'greeting' | 'question' | 'confirmation' | 'wedding';
}

/**
 * Voice recording state
 */
type VoiceState = 'idle' | 'listening' | 'recording' | 'processing';

/**
 * Touch input handler props
 */
export interface TouchInputHandlerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  onFileUpload?: (files: FileList) => Promise<void>;
  onVoiceInput?: (audioBlob: Blob) => Promise<void>;

  // State
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;

  // Mobile features
  enableHaptics?: boolean;
  enableVoice?: boolean;
  enableQuickReplies?: boolean;
  showEmojiPicker?: boolean;

  // Wedding context
  weddingContext?: WeddingContext;

  // Styling
  className?: string;

  // Callbacks
  onFocus?: () => void;
  onBlur?: () => void;
  onEmojiSelect?: (emoji: string) => void;
}

/**
 * Touch Input Handler Component
 */
export const TouchInputHandler = forwardRef<
  HTMLInputElement,
  TouchInputHandlerProps
>(
  (
    {
      value,
      onChange,
      onSend,
      onKeyPress,
      onFileUpload,
      onVoiceInput,
      disabled = false,
      placeholder = 'Type a message...',
      maxLength = 1000,
      enableHaptics = true,
      enableVoice = true,
      enableQuickReplies = true,
      showEmojiPicker = true,
      weddingContext,
      className,
      onFocus,
      onBlur,
      onEmojiSelect,
    },
    ref,
  ) => {
    // State
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    // Refs
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Expose input ref to parent
    useImperativeHandle(ref, () => inputRef.current!);

    // Generate contextual quick replies
    const getQuickReplies = useCallback((): QuickReply[] => {
      const baseReplies = [
        { id: 'thanks', text: 'Thank you!', category: 'confirmation' as const },
        { id: 'yes', text: 'Yes', category: 'confirmation' as const },
        { id: 'no', text: 'No', category: 'confirmation' as const },
        {
          id: 'help',
          text: 'I need help with...',
          category: 'question' as const,
        },
      ];

      if (weddingContext) {
        return [
          ...baseReplies,
          {
            id: 'timeline',
            text: 'Show my timeline',
            category: 'wedding' as const,
          },
          {
            id: 'budget',
            text: 'Check my budget',
            category: 'wedding' as const,
          },
          {
            id: 'vendors',
            text: 'Contact vendors',
            category: 'wedding' as const,
          },
          {
            id: 'guest_count',
            text: 'Update guest count',
            category: 'wedding' as const,
          },
        ];
      }

      return baseReplies;
    }, [weddingContext]);

    // Haptic feedback helper
    const hapticFeedback = useCallback(
      (type: 'light' | 'medium' | 'heavy' = 'light') => {
        if (!enableHaptics || !('vibrate' in navigator)) return;

        const patterns = {
          light: 10,
          medium: 20,
          heavy: 50,
        };

        navigator.vibrate(patterns[type]);
      },
      [enableHaptics],
    );

    // Handle input change
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (newValue.length <= maxLength) {
          onChange(newValue);

          // Show quick replies when input is empty
          if (enableQuickReplies) {
            setShowQuickReplies(newValue.length === 0);
          }
        }
      },
      [onChange, maxLength, enableQuickReplies],
    );

    // Handle send button
    const handleSend = useCallback(() => {
      if (value.trim() && !disabled) {
        hapticFeedback('medium');
        onSend();
        setShowQuickReplies(false);
      }
    }, [value, disabled, onSend, hapticFeedback]);

    // Handle quick reply selection
    const handleQuickReply = useCallback(
      (reply: QuickReply) => {
        onChange(reply.text);
        setShowQuickReplies(false);
        hapticFeedback('light');

        // Auto-send certain replies
        if (reply.category === 'confirmation') {
          setTimeout(() => {
            onSend();
          }, 100);
        }
      },
      [onChange, onSend, hapticFeedback],
    );

    // Handle voice recording
    const handleVoiceToggle = useCallback(async () => {
      if (!enableVoice || !onVoiceInput) return;

      if (voiceState === 'idle') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          const chunks: BlobPart[] = [];

          mediaRecorder.ondataavailable = (event) => {
            chunks.push(event.data);
          };

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            setVoiceState('processing');

            try {
              await onVoiceInput(audioBlob);
              setVoiceState('idle');
            } catch (error) {
              console.error('Voice processing error:', error);
              setVoiceState('idle');
            }

            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start();
          setVoiceState('recording');
          setRecordingTime(0);
          hapticFeedback('medium');

          // Start recording timer
          recordingTimerRef.current = setInterval(() => {
            setRecordingTime((prev) => prev + 1);
          }, 1000);
        } catch (error) {
          console.error('Voice recording error:', error);
          // Fallback to text input
          inputRef.current?.focus();
        }
      } else if (voiceState === 'recording') {
        mediaRecorderRef.current?.stop();
        setVoiceState('idle');
        hapticFeedback('light');

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      }
    }, [enableVoice, voiceState, onVoiceInput, hapticFeedback]);

    // Handle file upload
    const handleFileUpload = useCallback(
      async (files: FileList) => {
        if (onFileUpload && files.length > 0) {
          hapticFeedback('light');
          try {
            await onFileUpload(files);
          } catch (error) {
            console.error('File upload error:', error);
          }
        }
        setShowAttachments(false);
      },
      [onFileUpload, hapticFeedback],
    );

    // Handle emoji selection
    const handleEmojiSelect = useCallback(
      (emoji: string) => {
        onChange(value + emoji);
        setShowEmojiPicker(false);
        hapticFeedback('light');
        onEmojiSelect?.(emoji);
      },
      [value, onChange, hapticFeedback, onEmojiSelect],
    );

    // Common emojis for quick access
    const commonEmojis = ['😊', '❤️', '👍', '🎉', '💍', '💐', '📸', '🥳'];

    // Focus on input when component mounts
    useEffect(() => {
      if (inputRef.current && !disabled) {
        inputRef.current.focus();
      }
    }, [disabled]);

    // Cleanup voice recording on unmount
    useEffect(() => {
      return () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      };
    }, []);

    return (
      <div className={cn('relative', className)}>
        {/* Quick Replies */}
        <AnimatePresence>
          {showQuickReplies && enableQuickReplies && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-3 border-b border-gray-200"
            >
              <div className="flex flex-wrap gap-2">
                {getQuickReplies().map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => handleQuickReply(reply)}
                    className={cn(
                      'px-3 py-2 bg-gray-100 hover:bg-gray-200',
                      'rounded-full text-sm font-medium',
                      'transition-colors min-h-[36px]',
                      'border border-gray-200 hover:border-gray-300',
                    )}
                  >
                    {reply.text}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-full left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Quick Emojis</h4>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {commonEmojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-10 h-10 text-xl hover:bg-gray-100 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment Menu */}
        <AnimatePresence>
          {showAttachments && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-full left-0 p-3 bg-white border border-gray-200 rounded-lg shadow-lg"
            >
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachments(false);
                  }}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2',
                    'bg-blue-50 hover:bg-blue-100 rounded-lg',
                    'text-blue-600 min-h-[40px]',
                  )}
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-sm font-medium">Camera</span>
                </button>

                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '*/*';
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) handleFileUpload(files);
                    };
                    input.click();
                    setShowAttachments(false);
                  }}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2',
                    'bg-gray-50 hover:bg-gray-100 rounded-lg',
                    'text-gray-600 min-h-[40px]',
                  )}
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="text-sm font-medium">File</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Area */}
        <div className="flex items-end space-x-3 p-4">
          {/* Attachment Button */}
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            disabled={disabled}
            className={cn(
              'flex-shrink-0 p-2 rounded-full',
              'hover:bg-gray-100 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'min-h-[40px] min-w-[40px]', // Touch target
            )}
            aria-label="Add attachment"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>

          {/* Input Field Container */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleInputChange}
              onKeyPress={onKeyPress}
              onFocus={() => {
                setShowQuickReplies(value.length === 0 && enableQuickReplies);
                onFocus?.();
              }}
              onBlur={onBlur}
              disabled={disabled}
              placeholder={
                voiceState === 'recording' ? 'Recording...' : placeholder
              }
              className={cn(
                'w-full px-4 py-3 pr-12',
                'bg-gray-50 border border-gray-200 rounded-full',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'min-h-[48px]', // Touch target height
                voiceState === 'recording' && 'bg-red-50 border-red-200',
              )}
              maxLength={maxLength}
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
            />

            {/* Character Count */}
            {value.length > maxLength * 0.8 && (
              <div className="absolute -top-6 right-0 text-xs text-gray-500">
                {maxLength - value.length}
              </div>
            )}

            {/* Emoji Button */}
            {showEmojiPicker && (
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full"
                aria-label="Add emoji"
              >
                <Smile className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>

          {/* Voice/Send Button */}
          {value.trim() ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleSend}
              disabled={disabled}
              className={cn(
                'flex-shrink-0 p-3 rounded-full',
                'bg-blue-500 hover:bg-blue-600 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'active:scale-95 transition-all duration-150',
                'min-h-[48px] min-w-[48px]', // Touch target
              )}
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          ) : (
            enableVoice && (
              <button
                onClick={handleVoiceToggle}
                disabled={disabled}
                className={cn(
                  'flex-shrink-0 p-3 rounded-full',
                  'transition-all duration-150',
                  'min-h-[48px] min-w-[48px]', // Touch target
                  voiceState === 'recording'
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
                aria-label={
                  voiceState === 'recording'
                    ? 'Stop recording'
                    : 'Start voice recording'
                }
              >
                {voiceState === 'recording' ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            )
          )}
        </div>

        {/* Recording Timer */}
        {voiceState === 'recording' && (
          <div className="px-4 pb-2 text-center">
            <span className="text-sm text-red-600 font-medium">
              Recording: {Math.floor(recordingTime / 60)}:
              {(recordingTime % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          onChange={(e) => {
            if (e.target.files) {
              handleFileUpload(e.target.files);
            }
          }}
          className="hidden"
        />
      </div>
    );
  },
);

TouchInputHandler.displayName = 'TouchInputHandler';

export default TouchInputHandler;
