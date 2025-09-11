'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MicrophoneIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileFAQExtractorProps {
  onURLSubmit: (url: string) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  initialURL?: string;
  isLoading?: boolean;
  error?: string | null;
  supportedDomains?: string[];
}

interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

export default function MobileFAQExtractor({
  onURLSubmit,
  onCancel,
  className,
  initialURL = '',
  isLoading = false,
  error = null,
  supportedDomains = ['help.', 'support.', 'faq.', 'docs.'],
}: MobileFAQExtractorProps) {
  const [url, setUrl] = useState(initialURL);
  const [isValid, setIsValid] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait',
  );
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>({
    isListening: false,
    transcript: '',
    confidence: 0,
    error: null,
  });
  const [hapticSupported, setHapticSupported] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);

  // Check device capabilities
  useEffect(() => {
    // Check for haptic feedback support
    setHapticSupported('vibrate' in navigator);

    // Check initial orientation
    const checkOrientation = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation('portrait');
      } else {
        setOrientation('landscape');
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);

    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');

          const confidence =
            event.results[event.results.length - 1][0].confidence;

          setVoiceState((prev) => ({
            ...prev,
            transcript,
            confidence,
          }));

          if (event.results[event.results.length - 1].isFinal) {
            setUrl(transcript);
            setVoiceState((prev) => ({ ...prev, isListening: false }));
          }
        };

        recognitionRef.current.onerror = (
          event: SpeechRecognitionErrorEvent,
        ) => {
          setVoiceState((prev) => ({
            ...prev,
            isListening: false,
            error: `Voice recognition error: ${event.error}`,
          }));
          triggerHaptic('error');
        };

        recognitionRef.current.onend = () => {
          setVoiceState((prev) => ({ ...prev, isListening: false }));
        };
      }
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // URL validation
  useEffect(() => {
    const validateURL = (inputUrl: string) => {
      try {
        const urlObj = new URL(
          inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`,
        );
        const isSupported = supportedDomains.some((domain) =>
          urlObj.hostname.includes(domain),
        );
        return urlObj.protocol === 'https:' && isSupported;
      } catch {
        return false;
      }
    };

    setIsValid(url.length > 0 && validateURL(url));
  }, [url, supportedDomains]);

  // Haptic feedback
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'error' | 'success' = 'light') => {
      if (!hapticSupported) return;

      const patterns = {
        light: [10],
        medium: [20],
        heavy: [40],
        error: [100, 50, 100],
        success: [20, 50, 20],
      };

      navigator.vibrate(patterns[type]);
    },
    [hapticSupported],
  );

  // Voice input handlers
  const startVoiceInput = useCallback(() => {
    if (!recognitionRef.current) {
      setVoiceState((prev) => ({
        ...prev,
        error: 'Voice input not supported on this device',
      }));
      return;
    }

    triggerHaptic('light');
    setVoiceState({
      isListening: true,
      transcript: '',
      confidence: 0,
      error: null,
    });

    try {
      recognitionRef.current.start();
    } catch (error) {
      setVoiceState((prev) => ({
        ...prev,
        isListening: false,
        error: 'Failed to start voice recognition',
      }));
    }
  }, [triggerHaptic]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    triggerHaptic('light');
  }, [triggerHaptic]);

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    pullDistance.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0 && window.scrollY === 0) {
      e.preventDefault();
      pullDistance.current = Math.min(diff * 0.5, 100);

      if (pullToRefreshRef.current) {
        pullToRefreshRef.current.style.transform = `translateY(${pullDistance.current}px)`;
        pullToRefreshRef.current.style.opacity = String(
          Math.min(pullDistance.current / 60, 1),
        );
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance.current > 60 && !refreshing && !isLoading) {
      setRefreshing(true);
      triggerHaptic('medium');

      // Simulate refresh action
      setTimeout(() => {
        setRefreshing(false);
        setUrl('');
        setVoiceState({
          isListening: false,
          transcript: '',
          confidence: 0,
          error: null,
        });
        if (pullToRefreshRef.current) {
          pullToRefreshRef.current.style.transform = 'translateY(0px)';
          pullToRefreshRef.current.style.opacity = '0';
        }
      }, 1000);
    } else if (pullToRefreshRef.current) {
      pullToRefreshRef.current.style.transform = 'translateY(0px)';
      pullToRefreshRef.current.style.opacity = '0';
    }

    pullDistance.current = 0;
  }, [refreshing, isLoading, triggerHaptic]);

  // Touch event listeners for pull to refresh
  useEffect(() => {
    const element = document.body;
    element.addEventListener('touchstart', handleTouchStart as any, {
      passive: false,
    });
    element.addEventListener('touchmove', handleTouchMove as any, {
      passive: false,
    });
    element.addEventListener('touchend', handleTouchEnd as any);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as any);
      element.removeEventListener('touchmove', handleTouchMove as any);
      element.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Form submission
  const handleSubmit = useCallback(async () => {
    if (!isValid || isLoading) return;

    triggerHaptic('success');

    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      await onURLSubmit(normalizedUrl);
    } catch (error) {
      triggerHaptic('error');
    }
  }, [url, isValid, isLoading, onURLSubmit, triggerHaptic]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );

  return (
    <>
      {/* Pull to Refresh Indicator */}
      <div
        ref={pullToRefreshRef}
        className="fixed top-0 left-1/2 transform -translate-x-1/2 -translate-y-full
                   bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg z-50
                   transition-all duration-300 opacity-0"
      >
        <ArrowPathIcon
          className={cn('w-6 h-6', refreshing && 'animate-spin')}
        />
      </div>

      <Card
        className={cn(
          'w-full max-w-lg mx-auto p-4 sm:p-6 space-y-6',
          'safe-area-inset-top safe-area-inset-bottom', // iOS safe area support
          orientation === 'landscape' && 'max-w-full',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GlobeAltIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Extract FAQs
            </h2>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="min-w-[44px] min-h-[44px] p-2"
            >
              <XMarkIcon className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Voice Recognition Status */}
        <AnimatePresence>
          {voiceState.isListening && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Listening...{' '}
                  {voiceState.confidence > 0 &&
                    `(${Math.round(voiceState.confidence * 100)}% confident)`}
                </span>
                <SpeakerWaveIcon className="w-4 h-4 text-blue-600 animate-pulse ml-auto" />
              </div>
              {voiceState.transcript && (
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  "{voiceState.transcript}"
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* URL Input Section */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-4">
            {/* URL Input with Voice Button */}
            <div className="relative">
              <Input
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter support or FAQ page URL..."
                className={cn(
                  'pr-12 text-base min-h-[44px]', // iOS minimum touch target
                  'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  isValid && 'border-green-500 focus:ring-green-500',
                  error && 'border-red-500 focus:ring-red-500',
                )}
                aria-label="FAQ page URL"
                autoComplete="url"
                inputMode="url"
              />

              {/* Voice Input Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={
                  voiceState.isListening ? stopVoiceInput : startVoiceInput
                }
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] p-2"
                aria-label={
                  voiceState.isListening
                    ? 'Stop voice input'
                    : 'Start voice input'
                }
              >
                <MicrophoneIcon
                  className={cn(
                    'w-5 h-5',
                    voiceState.isListening
                      ? 'text-red-500 animate-pulse'
                      : 'text-gray-400',
                  )}
                />
              </Button>
            </div>

            {/* URL Validation Feedback */}
            <AnimatePresence>
              {url && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2"
                >
                  {isValid ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Valid FAQ page URL
                      </span>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-orange-700 dark:text-orange-300">
                        Please enter a valid support or FAQ page URL
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
              {(error || voiceState.error) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        Error
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {error || voiceState.error}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Supported Domains */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Supported domains:
              </p>
              <div className="flex flex-wrap gap-2">
                {supportedDomains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="text-xs">
                    {domain}*
                  </Badge>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className={cn(
                'w-full min-h-[48px] text-base font-medium', // Android minimum touch target
                'transition-all duration-200',
                'active:scale-95', // Touch feedback
                isValid && 'bg-blue-600 hover:bg-blue-700 text-white',
              )}
              aria-label="Extract FAQs from URL"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span>Extracting FAQs...</span>
                </div>
              ) : (
                'Extract FAQs'
              )}
            </Button>
          </div>
        )}

        {/* Mobile Usage Tips */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>💡 Tip: Pull down to refresh</p>
          <p>🎤 Use voice input for hands-free URL entry</p>
          <p>📱 Rotate device for better viewing</p>
        </div>
      </Card>
    </>
  );
}
