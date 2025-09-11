'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  X,
  Sparkles,
  Smartphone,
  Heart,
  Clock,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type SuccessMessageVariant = 'toast' | 'modal' | 'banner';

export interface InstallSuccessMessageProps {
  variant?: SuccessMessageVariant;
  autoHide?: boolean;
  autoHideDelay?: number;
  showTips?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export function InstallSuccessMessage({
  variant = 'toast',
  autoHide = true,
  autoHideDelay = 8000,
  showTips = true,
  className,
  onDismiss,
}: InstallSuccessMessageProps) {
  const { isInstalled, platform, trackInstallEvent } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Check if we've already shown the success message
  useEffect(() => {
    const hasShownKey = 'pwa-success-shown';
    const hasShownBefore = localStorage.getItem(hasShownKey) === 'true';

    if (isInstalled && !hasShownBefore && !hasShown) {
      setIsVisible(true);
      setHasShown(true);
      localStorage.setItem(hasShownKey, 'true');
      trackInstallEvent('success_message_shown');
    }
  }, [isInstalled, hasShown, trackInstallEvent]);

  // Auto-hide functionality
  useEffect(() => {
    if (isVisible && autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, autoHideDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    trackInstallEvent('success_message_dismissed');
    onDismiss?.();
  };

  if (!isVisible || !isInstalled) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {variant === 'toast' && (
            <ToastVariant
              onDismiss={handleDismiss}
              showTips={showTips}
              className={className}
            />
          )}
          {variant === 'modal' && (
            <ModalVariant
              onDismiss={handleDismiss}
              showTips={showTips}
              className={className}
            />
          )}
          {variant === 'banner' && (
            <BannerVariant
              onDismiss={handleDismiss}
              showTips={showTips}
              className={className}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// Toast variant (default)
function ToastVariant({
  onDismiss,
  showTips,
  className,
}: {
  onDismiss: () => void;
  showTips: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50',
        className,
      )}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Celebration header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  WedSync Installed! 🎉
                </h3>
                <p className="text-sm text-primary-100">
                  You're all set for your wedding day
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-white/80 hover:text-white p-1 transition-colors"
              aria-label="Dismiss success message"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {showTips && (
            <div className="space-y-3 mb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                Quick tips for wedding day
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    Access your timeline even without internet at venues
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    Tap the WedSync icon on your home screen for instant access
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    Get real-time notifications for vendor updates
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary-700">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-medium">
                Find WedSync on your home screen
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4">
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            Perfect! Let's plan this wedding
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Modal variant
function ModalVariant({
  onDismiss,
  showTips,
  className,
}: {
  onDismiss: () => void;
  showTips: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className={cn(
          'bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated celebration header */}
        <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-6 py-8 text-center overflow-hidden">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'loop',
            }}
            className="absolute top-2 left-6"
          >
            <Sparkles className="w-6 h-6 text-white/60" />
          </motion.div>
          <motion.div
            animate={{
              rotate: [360, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: 'loop',
              delay: 0.5,
            }}
            className="absolute top-4 right-8"
          >
            <Heart className="w-5 h-5 text-white/60" />
          </motion.div>

          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, duration: 0.6 }}
              className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center"
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              WedSync Installed Successfully! 🎉
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-primary-100"
            >
              You're ready for the perfect wedding day
            </motion.p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {showTips && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-600" />
                  Your wedding coordination just got easier
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-900">
                        Offline Access
                      </p>
                      <p className="text-sm text-green-700">
                        View timelines and vendor info even without internet
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900">
                        Instant Notifications
                      </p>
                      <p className="text-sm text-blue-700">
                        Get real-time updates from your wedding team
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-purple-900">
                        Quick Access
                      </p>
                      <p className="text-sm text-purple-700">
                        Tap the WedSync icon on your home screen anytime
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="font-medium text-primary-900">
                      Find WedSync on your home screen
                    </p>
                    <p className="text-sm text-primary-700">
                      Look for the WedSync icon among your other apps
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4">
          <button
            onClick={onDismiss}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold text-sm rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            Amazing! Let's start planning
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Banner variant
function BannerVariant({
  onDismiss,
  showTips,
  className,
}: {
  onDismiss: () => void;
  showTips: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ type: 'spring', duration: 0.6 }}
      className={cn('fixed top-0 left-0 right-0 z-50', className)}
    >
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  WedSync App Installed Successfully! 🎉
                </h3>
                <p className="text-sm text-primary-100">
                  {showTips
                    ? 'You can now access your wedding timeline offline at venues'
                    : 'Ready for your perfect wedding day'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Got it!
              </button>
              <button
                onClick={onDismiss}
                className="text-white/80 hover:text-white p-1 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
