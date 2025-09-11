'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Platform detection types
export type Platform = 'ios' | 'android' | 'desktop' | 'unsupported';
export type InstallState =
  | 'available'
  | 'installed'
  | 'unsupported'
  | 'dismissed';
export type InstallSource = 'banner' | 'button' | 'menu' | 'onboarding';

// BeforeInstallPrompt event interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// Analytics event interface for Team B integration
export interface InstallEventData {
  platform: Platform;
  source: InstallSource;
  timestamp: string;
  user_id?: string;
}

export interface PWAInstallHookReturn {
  // State
  platform: Platform;
  installState: InstallState;
  isInstallable: boolean;
  isInstalled: boolean;
  canShowPrompt: boolean;

  // Actions
  showInstallPrompt: (source?: InstallSource) => Promise<boolean>;
  dismissPrompt: () => void;
  checkInstallability: () => void;

  // Analytics
  trackInstallEvent: (
    eventType: string,
    data?: Partial<InstallEventData>,
  ) => void;
}

// Platform detection utilities
const detectPlatform = (): Platform => {
  if (typeof window === 'undefined') return 'unsupported';

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /android/.test(userAgent);
  const isDesktop = !isIOS && !isAndroid;

  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  if (isDesktop) return 'desktop';
  return 'unsupported';
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check various ways PWA can be detected as installed
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

const canPlatformInstall = (platform: Platform): boolean => {
  switch (platform) {
    case 'ios':
      // iOS Safari 11.3+ supports PWA installation
      const iosVersion = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
      if (iosVersion) {
        const major = parseInt(iosVersion[1], 10);
        const minor = parseInt(iosVersion[2], 10);
        return major > 11 || (major === 11 && minor >= 3);
      }
      return true; // Assume compatible if version can't be detected

    case 'android':
      // Android Chrome 40+ supports PWA installation
      return true;

    case 'desktop':
      // Desktop Chrome 73+, Edge 79+ support PWA installation
      const isChrome = /chrome/.test(navigator.userAgent.toLowerCase());
      const isEdge = /edg/.test(navigator.userAgent.toLowerCase());
      return isChrome || isEdge;

    default:
      return false;
  }
};

// Main hook implementation
export function usePWAInstall(): PWAInstallHookReturn {
  const [platform] = useState<Platform>(() => detectPlatform());
  const [installState, setInstallState] = useState<InstallState>('unsupported');
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canShowPrompt, setCanShowPrompt] = useState(false);

  // Refs to prevent stale closure issues
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check if user previously dismissed the prompt
  const isDismissed = useCallback((): boolean => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (!dismissed) return false;

    const dismissedTime = parseInt(dismissed, 10);
    const daysSinceDismissed =
      (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Re-show after 7 days
    return daysSinceDismissed < 7;
  }, []);

  // Analytics tracking function for Team B integration
  const trackInstallEvent = useCallback(
    (eventType: string, data: Partial<InstallEventData> = {}) => {
      const eventData: InstallEventData = {
        platform,
        source: 'button',
        timestamp: new Date().toISOString(),
        ...data,
      };

      // Send to analytics service (Team B will implement the actual tracking)
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track(`pwa_${eventType}`, eventData);
      } else {
        // Fallback: log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`PWA Event: pwa_${eventType}`, eventData);
        }
      }
    },
    [platform],
  );

  // Check installability
  const checkInstallability = useCallback(() => {
    if (typeof window === 'undefined') {
      setInstallState('unsupported');
      return;
    }

    // Check if already installed
    if (isStandalone()) {
      setInstallState('installed');
      setCanShowPrompt(false);
      return;
    }

    // Check if platform can install PWAs
    if (!canPlatformInstall(platform)) {
      setInstallState('unsupported');
      setCanShowPrompt(false);
      return;
    }

    // Check if user dismissed recently
    if (isDismissed()) {
      setInstallState('dismissed');
      setCanShowPrompt(false);
      return;
    }

    // For iOS, always show as available (manual process)
    if (platform === 'ios') {
      setInstallState('available');
      setCanShowPrompt(true);
      return;
    }

    // For other platforms, check if we have the deferred prompt
    if (promptRef.current) {
      setInstallState('available');
      setCanShowPrompt(true);
    } else {
      // Might be installable but prompt not yet received
      setInstallState('available');
      setCanShowPrompt(false);
    }
  }, [platform, isDismissed]);

  // Show install prompt
  const showInstallPrompt = useCallback(
    async (source: InstallSource = 'button'): Promise<boolean> => {
      trackInstallEvent('install_prompt_shown', { source });

      try {
        if (platform === 'ios') {
          // iOS requires manual installation - return true to show instructions
          trackInstallEvent('install_instructions_shown', { source });
          return true;
        }

        if (!promptRef.current) {
          trackInstallEvent('install_prompt_unavailable', { source });
          return false;
        }

        await promptRef.current.prompt();
        const { outcome } = await promptRef.current.userChoice;

        if (outcome === 'accepted') {
          trackInstallEvent('install_accepted', { source });
          setInstallState('installed');
          setCanShowPrompt(false);
          return true;
        } else {
          trackInstallEvent('install_dismissed', { source });
          dismissPrompt();
          return false;
        }
      } catch (error) {
        console.error('Error showing PWA install prompt:', error);
        trackInstallEvent('install_error', { source });
        return false;
      }
    },
    [platform, trackInstallEvent],
  );

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setInstallState('dismissed');
    setCanShowPrompt(false);
    trackInstallEvent('install_prompt_dismissed');
  }, [trackInstallEvent]);

  // Setup event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      promptRef.current = e;
      setDeferredPrompt(e);

      // Delay showing prompt to avoid interrupting user flow
      setTimeout(() => {
        checkInstallability();
      }, 2000);

      trackInstallEvent('install_prompt_available');
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setInstallState('installed');
      setCanShowPrompt(false);
      promptRef.current = null;
      setDeferredPrompt(null);

      // Clear dismissed state
      localStorage.removeItem('pwa-prompt-dismissed');

      trackInstallEvent('install_completed');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check
    checkInstallability();

    // Cleanup
    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkInstallability, trackInstallEvent]);

  // Computed values
  const isInstallable = installState === 'available';
  const isInstalled = installState === 'installed';

  return {
    // State
    platform,
    installState,
    isInstallable,
    isInstalled,
    canShowPrompt,

    // Actions
    showInstallPrompt,
    dismissPrompt,
    checkInstallability,

    // Analytics
    trackInstallEvent,
  };
}
