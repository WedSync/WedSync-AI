'use client';

import React from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Share,
  Plus,
  CheckCircle,
  Download,
} from 'lucide-react';
import { usePWAInstall, type Platform } from '@/hooks/usePWAInstall';
import { motion, AnimatePresence } from 'framer-motion';

export interface InstallInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  platform?: Platform;
}

export function InstallInstructionsModal({
  isOpen,
  onClose,
  onDismiss,
  platform: platformProp,
}: InstallInstructionsModalProps) {
  const { platform: detectedPlatform, trackInstallEvent } = usePWAInstall();
  const platform = platformProp || detectedPlatform;

  React.useEffect(() => {
    if (isOpen) {
      trackInstallEvent('install_instructions_modal_opened', { platform });
    }
  }, [isOpen, platform, trackInstallEvent]);

  const handleClose = () => {
    trackInstallEvent('install_instructions_completed', { platform });
    onClose();
  };

  const handleDismiss = () => {
    trackInstallEvent('install_instructions_dismissed', { platform });
    onDismiss ? onDismiss() : onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {platform === 'ios' && (
              <IOSInstructions
                onClose={handleClose}
                onDismiss={handleDismiss}
              />
            )}
            {platform === 'android' && (
              <AndroidInstructions
                onClose={handleClose}
                onDismiss={handleDismiss}
              />
            )}
            {platform === 'desktop' && (
              <DesktopInstructions
                onClose={handleClose}
                onDismiss={handleDismiss}
              />
            )}
            {platform === 'unsupported' && (
              <UnsupportedInstructions
                onClose={handleClose}
                onDismiss={handleDismiss}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// iOS Safari Instructions
function IOSInstructions({
  onClose,
  onDismiss,
}: {
  onClose: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Add to Home Screen
            </h3>
            <p className="text-sm text-gray-500">
              Install WedSync on your iPhone
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          aria-label="Close instructions"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-gray-900 font-medium">
                  Tap the Share button
                </p>
                <Share className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">
                Look for the share icon at the bottom of your Safari browser
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-gray-900 font-medium">
                  Find "Add to Home Screen"
                </p>
                <Plus className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">
                Scroll down in the share menu to find this option
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              3
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium mb-1">Tap "Add"</p>
              <p className="text-sm text-gray-600">
                Confirm to add WedSync to your home screen with the WedSync icon
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-primary-50 rounded-lg p-4">
          <h4 className="font-medium text-primary-900 mb-3">
            Perfect for wedding venues
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-primary-700">
              <CheckCircle className="w-4 h-4 text-primary-600" />
              <span>Access timelines offline</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-700">
              <CheckCircle className="w-4 h-4 text-primary-600" />
              <span>Quick vendor status checks</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-700">
              <CheckCircle className="w-4 h-4 text-primary-600" />
              <span>Emergency contact access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
        >
          Got it!
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-300 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
        >
          Maybe later
        </button>
      </div>
    </>
  );
}

// Android Chrome Instructions
function AndroidInstructions({
  onClose,
  onDismiss,
}: {
  onClose: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Smartphone className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Install WedSync App
            </h3>
            <p className="text-sm text-gray-500">Add to your Android device</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          aria-label="Close instructions"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-gray-900 font-medium">
                  Tap "Install" or "Add to Home screen"
                </p>
                <Download className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">
                Chrome will show a banner or you'll see an install icon in the
                address bar
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              2
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium mb-1">
                Confirm installation
              </p>
              <p className="text-sm text-gray-600">
                Tap "Install" in the popup dialog to add WedSync to your home
                screen
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              3
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium mb-1">
                Launch from home screen
              </p>
              <p className="text-sm text-gray-600">
                Find the WedSync app icon on your home screen and tap to open
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">
            Enhanced wedding coordination
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Full-screen app experience</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Push notifications for updates</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Works without internet connection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-green-100"
        >
          Understood
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-300 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
        >
          Not now
        </button>
      </div>
    </>
  );
}

// Desktop Instructions
function DesktopInstructions({
  onClose,
  onDismiss,
}: {
  onClose: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Monitor className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Install Desktop App
            </h3>
            <p className="text-sm text-gray-500">
              Add WedSync to your computer
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          aria-label="Close instructions"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-gray-900 font-medium">
                  Look for the install icon
                </p>
                <Download className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-sm text-gray-600">
                Find the install icon in your browser's address bar (usually on
                the right side)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              2
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium mb-1">
                Click "Install WedSync"
              </p>
              <p className="text-sm text-gray-600">
                Click the install icon and select "Install" from the dropdown
                menu
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
              3
            </div>
            <div className="flex-1">
              <p className="text-gray-900 font-medium mb-1">
                Confirm installation
              </p>
              <p className="text-sm text-gray-600">
                Click "Install" in the confirmation dialog to add WedSync as a
                desktop app
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-3">
            Professional wedding management
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span>Dedicated desktop app</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span>Easy access from taskbar/dock</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span>Native desktop experience</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-purple-100"
        >
          Got it!
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-300 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
        >
          Skip for now
        </button>
      </div>
    </>
  );
}

// Unsupported Browser Instructions
function UnsupportedInstructions({
  onClose,
  onDismiss,
}: {
  onClose: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Smartphone className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Browser Not Supported
            </h3>
            <p className="text-sm text-gray-500">
              Try a different browser for installation
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
          aria-label="Close instructions"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="p-6 space-y-4">
        <p className="text-gray-600">
          Your current browser doesn't support app installation. For the best
          WedSync experience, try using:
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Chrome (Recommended)</p>
              <p className="text-sm text-gray-600">
                Best PWA support on all devices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Monitor className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Microsoft Edge</p>
              <p className="text-sm text-gray-600">
                Great desktop app experience
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Safari (iOS)</p>
              <p className="text-sm text-gray-600">
                Add to Home Screen support
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 mt-4">
          <p className="text-sm text-amber-800">
            <strong>Tip:</strong> You can still use WedSync in your current
            browser, but you won't get the full app experience with offline
            support.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-amber-100"
        >
          Continue in browser
        </button>
      </div>
    </>
  );
}
