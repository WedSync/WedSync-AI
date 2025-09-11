'use client';

import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, X } from 'lucide-react';
import {
  usePWAInstall,
  type Platform,
  type InstallSource,
} from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

// Button variant types following Untitled UI patterns
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon-only';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface InstallButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  source?: InstallSource;
  showLabel?: boolean;
  className?: string;
  onInstallStart?: () => void;
  onInstallComplete?: () => void;
  onInstallDismiss?: () => void;
}

// Platform-specific button text and icons
const getPlatformContent = (platform: Platform, showLabel: boolean) => {
  switch (platform) {
    case 'ios':
      return {
        icon: Smartphone,
        label: showLabel ? 'Add to Home Screen' : '',
        ariaLabel: 'Add WedSync to your home screen',
      };
    case 'android':
      return {
        icon: Download,
        label: showLabel ? 'Install App' : '',
        ariaLabel: 'Install WedSync app',
      };
    case 'desktop':
      return {
        icon: Download,
        label: showLabel ? 'Install WedSync' : '',
        ariaLabel: 'Install WedSync as desktop app',
      };
    default:
      return {
        icon: Smartphone,
        label: showLabel ? 'Get App' : '',
        ariaLabel: 'Get WedSync app',
      };
  }
};

// Untitled UI button size classes
const sizeClasses = {
  xs: 'px-3 py-2 text-xs',
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4.5 py-2.5 text-base',
  xl: 'px-5 py-3 text-base',
};

// Untitled UI button variant classes
const variantClasses = {
  primary:
    'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-xs hover:shadow-sm focus:ring-4 focus:ring-primary-100',
  secondary:
    'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-900 border border-gray-300 shadow-xs hover:shadow-sm focus:ring-4 focus:ring-gray-100',
  ghost:
    'bg-transparent hover:bg-gray-50 active:bg-gray-100 text-gray-700 hover:text-gray-900 focus:ring-4 focus:ring-gray-100',
  'icon-only':
    'bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-xs hover:shadow-sm focus:ring-4 focus:ring-primary-100 p-2',
};

export function InstallButton({
  variant = 'primary',
  size = 'md',
  source = 'button',
  showLabel = true,
  className,
  onInstallStart,
  onInstallComplete,
  onInstallDismiss,
  ...props
}: InstallButtonProps) {
  const {
    platform,
    isInstallable,
    isInstalled,
    canShowPrompt,
    showInstallPrompt,
    trackInstallEvent,
  } = usePWAInstall();

  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Don't render if not installable or already installed
  if (!isInstallable || isInstalled) {
    return null;
  }

  const {
    icon: Icon,
    label,
    ariaLabel,
  } = getPlatformContent(platform, showLabel);

  const handleClick = async () => {
    if (isLoading) return;

    setIsLoading(true);
    onInstallStart?.();
    trackInstallEvent('install_button_clicked', { source });

    try {
      const success = await showInstallPrompt(source);

      if (success) {
        if (platform === 'ios') {
          // For iOS, show instructions modal
          setShowInstructions(true);
        } else {
          // For other platforms, installation was successful
          onInstallComplete?.();
        }
      } else {
        onInstallDismiss?.();
      }
    } catch (error) {
      console.error('Install button error:', error);
      onInstallDismiss?.();
    } finally {
      setIsLoading(false);
    }
  };

  const buttonClasses = cn(
    // Base button styles (Untitled UI)
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-lg',
    'transition-all duration-200',
    'focus:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    // Size classes
    variant === 'icon-only' ? 'p-2' : sizeClasses[size],
    // Variant classes
    variantClasses[variant],
    // Custom classes
    className,
  );

  return (
    <>
      <button
        type="button"
        className={buttonClasses}
        onClick={handleClick}
        disabled={isLoading || !canShowPrompt}
        aria-label={ariaLabel}
        data-testid="pwa-install-button"
        {...props}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        ) : (
          <Icon
            className={cn(
              'flex-shrink-0',
              variant === 'icon-only' ? 'w-5 h-5' : 'w-4 h-4',
            )}
          />
        )}
        {showLabel && variant !== 'icon-only' && !isLoading && (
          <span className="whitespace-nowrap">{label}</span>
        )}
      </button>

      {/* iOS Install Instructions Modal */}
      {showInstructions && platform === 'ios' && (
        <IOSInstallModal
          onClose={() => {
            setShowInstructions(false);
            onInstallComplete?.();
          }}
          onDismiss={() => {
            setShowInstructions(false);
            onInstallDismiss?.();
          }}
        />
      )}
    </>
  );
}

// iOS-specific install instructions modal
interface IOSInstallModalProps {
  onClose: () => void;
  onDismiss: () => void;
}

function IOSInstallModal({ onClose, onDismiss }: IOSInstallModalProps) {
  const { trackInstallEvent } = usePWAInstall();

  React.useEffect(() => {
    trackInstallEvent('ios_instructions_shown');
  }, [trackInstallEvent]);

  const handleClose = () => {
    trackInstallEvent('ios_instructions_completed');
    onClose();
  };

  const handleDismiss = () => {
    trackInstallEvent('ios_instructions_dismissed');
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Install WedSync
              </h3>
              <p className="text-sm text-gray-500">
                Add to your iPhone home screen
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                1
              </div>
              <div>
                <p className="text-gray-900 font-medium">
                  Tap the Share button
                </p>
                <p className="text-sm text-gray-600">
                  Look for the share icon in your browser's toolbar
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                2
              </div>
              <div>
                <p className="text-gray-900 font-medium">
                  Find "Add to Home Screen"
                </p>
                <p className="text-sm text-gray-600">
                  Scroll down in the share menu to find this option
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                3
              </div>
              <div>
                <p className="text-gray-900 font-medium">Tap "Add"</p>
                <p className="text-sm text-gray-600">
                  Confirm to add WedSync to your home screen
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <h4 className="font-medium text-gray-900 mb-2">Why install?</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Work offline at wedding venues</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Quick access from home screen</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Receive timeline notifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors duration-200"
          >
            Got it!
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm border border-gray-300 rounded-lg transition-colors duration-200"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
