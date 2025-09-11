'use client';

import { useEffect, useState } from 'react';
import { pwaManager } from '@/lib/pwa/sw-registration';
import { pwaAnalytics } from '@/lib/pwa/analytics';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, Download, Wifi, WifiOff, X } from 'lucide-react';

export function PWARegistration() {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showOfflineNotification, setShowOfflineNotification] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installPromptShown, setInstallPromptShown] = useState(false);
  const [dismissalCount, setDismissalCount] = useState(0);

  useEffect(() => {
    // Initialize analytics with user context
    const initializeAnalytics = () => {
      // Set user ID if available
      const userId = localStorage.getItem('user_id');
      if (userId) {
        pwaAnalytics.setUserId(userId);
      }

      // Set wedding context if available
      const weddingContext = localStorage.getItem('wedding_context');
      if (weddingContext) {
        try {
          pwaAnalytics.setWeddingContext(JSON.parse(weddingContext));
        } catch (error) {
          logger.warn('Failed to parse wedding context', { error });
        }
      }

      // Track session start
      pwaAnalytics.trackUsageMetric('session_start', {
        metricData: {
          is_standalone: window.matchMedia('(display-mode: standalone)')
            .matches,
          referrer: document.referrer,
        },
      });
    };

    // Register service worker
    const registerSW = async () => {
      try {
        const startTime = performance.now();
        const { registration } = await pwaManager.registerServiceWorker();
        const registrationTime = performance.now() - startTime;

        setRegistration(registration);

        // Track service worker registration
        pwaAnalytics.trackServiceWorkerEvent('registration_complete', {
          registration_time_ms: registrationTime,
          scope: registration?.scope,
        });
      } catch (error) {
        logger.error('PWA registration failed:', error);
        pwaAnalytics.trackError('service_worker_registration', error.message);
      }
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      initializeAnalytics();
      registerSW();
    }

    // Load dismissal count from localStorage
    const savedDismissals = localStorage.getItem('pwa_install_dismissals');
    if (savedDismissals) {
      setDismissalCount(parseInt(savedDismissals, 10));
    }

    // Listen for PWA events
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      pwaAnalytics.trackServiceWorkerEvent('update_available');
    };

    const handleConnectionChange = (event: CustomEvent) => {
      const wasOffline = isOffline;
      const nowOffline = event.detail.isOffline;

      setIsOffline(nowOffline);

      if (wasOffline && !nowOffline) {
        // Coming back online - show notification briefly
        setShowOfflineNotification(true);
        setTimeout(() => setShowOfflineNotification(false), 3000);

        // Track connection restored
        pwaAnalytics.trackUsageMetric('connection_restored');
      } else if (!wasOffline && nowOffline) {
        // Going offline
        pwaAnalytics.trackUsageMetric('connection_lost');
      }
    };

    const handleSyncComplete = (event: CustomEvent) => {
      // Track successful background sync
      pwaAnalytics.trackUsageMetric('background_sync_complete', {
        metricData: {
          sync_data: event.detail,
        },
      });
    };

    window.addEventListener('pwa:update-available', handleUpdateAvailable);
    window.addEventListener(
      'pwa:connection-change',
      handleConnectionChange as EventListener,
    );
    window.addEventListener(
      'pwa:sync-complete',
      handleSyncComplete as EventListener,
    );

    // Handle install prompt with analytics
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if we should show the install prompt based on dismissal history
      const daysSinceLastPrompt = getDaysSinceLastPrompt();
      const shouldShowPrompt = dismissalCount < 3 && daysSinceLastPrompt >= 7;

      if (shouldShowPrompt) {
        setShowInstallPrompt(true);
        setInstallPromptShown(true);

        // Track install prompt shown
        pwaAnalytics.trackInstallPrompt('prompt_shown', {
          userGesture: e.isTrusted,
          daysSinceLastPrompt,
          previousDismissals: dismissalCount,
        });

        // Save the prompt show time
        localStorage.setItem('pwa_last_prompt', new Date().toISOString());
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track app install completion
    const handleAppInstalled = () => {
      logger.info('PWA installed successfully');
      setShowInstallPrompt(false);

      pwaAnalytics.trackInstallComplete('installation_completed', {
        installationMethod: 'browser_prompt',
        timeOnPageSeconds: Math.floor(performance.now() / 1000),
        fromOfflineBanner: isOffline,
      });

      // Clear dismissal count on successful install
      localStorage.removeItem('pwa_install_dismissals');
      localStorage.removeItem('pwa_last_prompt');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pwaAnalytics.trackUsageMetric('session_pause');
      } else {
        pwaAnalytics.trackUsageMetric('session_resume');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pwa:update-available', handleUpdateAvailable);
      window.removeEventListener(
        'pwa:connection-change',
        handleConnectionChange as EventListener,
      );
      window.removeEventListener(
        'pwa:sync-complete',
        handleSyncComplete as EventListener,
      );
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOffline, dismissalCount]);

  const getDaysSinceLastPrompt = (): number => {
    const lastPrompt = localStorage.getItem('pwa_last_prompt');
    if (!lastPrompt) return 0;

    const lastPromptDate = new Date(lastPrompt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastPromptDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    try {
      // Track installation attempt
      pwaAnalytics.trackInstallComplete('installation_started', {
        installationMethod: 'browser_prompt',
        timeOnPageSeconds: Math.floor(performance.now() / 1000),
      });

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        logger.info('User accepted PWA install prompt');
        pwaAnalytics.trackInstallPrompt('prompt_accepted');
        setShowInstallPrompt(false);
      } else {
        logger.info('User dismissed PWA install prompt');
        pwaAnalytics.trackInstallPrompt('prompt_dismissed');
        handleInstallDismissal();
      }

      setDeferredPrompt(null);
    } catch (error) {
      logger.error('PWA installation failed:', error);
      pwaAnalytics.trackInstallComplete('installation_failed', {
        installationMethod: 'browser_prompt',
        error: error.message,
      });
    }
  };

  const handleInstallDismissal = () => {
    const newDismissalCount = dismissalCount + 1;
    setDismissalCount(newDismissalCount);
    setShowInstallPrompt(false);

    // Save dismissal count and timestamp
    localStorage.setItem(
      'pwa_install_dismissals',
      newDismissalCount.toString(),
    );
    localStorage.setItem('pwa_last_prompt', new Date().toISOString());

    // Track dismissal
    pwaAnalytics.trackInstallPrompt('prompt_dismissed', {
      previousDismissals: newDismissalCount,
    });
  };

  const handleUpdateApp = async () => {
    if (!registration) return;

    try {
      await pwaManager.activateUpdate();

      // Track app update
      pwaAnalytics.trackServiceWorkerEvent('update_activated');

      window.location.reload();
    } catch (error) {
      logger.error('Failed to update app:', error);
      pwaAnalytics.trackError('app_update_failed', error.message);
    }
  };

  const handleDismissUpdate = () => {
    setUpdateAvailable(false);
    pwaAnalytics.trackServiceWorkerEvent('update_dismissed');
  };

  const handleDismissOffline = () => {
    setShowOfflineNotification(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {/* Connection Status - Offline */}
      {isOffline && (
        <Card className="bg-amber-50 border-amber-200 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <WifiOff size={16} />
                <span className="text-sm font-medium">You're offline</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissOffline}
                className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800"
              >
                <X size={14} />
              </Button>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Your changes will sync when you're back online
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connection Status - Back Online */}
      {showOfflineNotification && !isOffline && (
        <Card className="bg-green-50 border-green-200 shadow-lg animate-fade-in">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-800">
                <Wifi size={16} />
                <span className="text-sm font-medium">Back online</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissOffline}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
              >
                <X size={14} />
              </Button>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Syncing your latest changes...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Update Available */}
      {updateAvailable && (
        <Card className="bg-blue-50 border-blue-200 shadow-lg">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-blue-800">
                Update Available
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissUpdate}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                <X size={14} />
              </Button>
            </div>
            <CardDescription className="text-xs text-blue-600">
              A new version of WedSync is ready with improvements and bug fixes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <Button
              size="sm"
              onClick={handleUpdateApp}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle size={14} className="mr-1" />
              Update Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <Card className="bg-purple-50 border-purple-200 shadow-lg">
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-purple-800">
                Install WedSync
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInstallDismissal}
                className="h-6 w-6 p-0 text-purple-600 hover:text-purple-800"
              >
                <X size={14} />
              </Button>
            </div>
            <CardDescription className="text-xs text-purple-600">
              Install the app for faster loading, offline access, and a better
              experience
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <Button
              size="sm"
              onClick={handleInstallApp}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Download size={14} className="mr-1" />
              Install App
            </Button>
            <div className="flex gap-1 text-xs text-purple-600">
              <span>✓ Works offline</span>
              <span>•</span>
              <span>✓ Faster loading</span>
              <span>•</span>
              <span>✓ Push notifications</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Hook for other components to use PWA analytics
export function usePWAAnalytics() {
  return {
    trackWeddingActivity: pwaAnalytics.trackWeddingActivity.bind(pwaAnalytics),
    trackError: pwaAnalytics.trackError.bind(pwaAnalytics),
    trackUsageMetric: pwaAnalytics.trackUsageMetric.bind(pwaAnalytics),
    flush: pwaAnalytics.flush.bind(pwaAnalytics),
  };
}
