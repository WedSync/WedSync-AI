'use client';

// WS-157 WedMe Mobile App Integration Components
// Provides native app integration for helper assignments

import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Download,
  ExternalLink,
  Bell,
  Sync,
  Check,
  AlertCircle,
  QrCode,
  Share2,
  ArrowRight,
} from 'lucide-react';

interface WedMeAppStatus {
  isInstalled: boolean;
  version?: string;
  canDeepLink: boolean;
  supportsNotifications: boolean;
}

interface DeepLinkData {
  action: 'view_task' | 'start_task' | 'complete_task' | 'view_dashboard';
  taskId?: string;
  weddingId?: string;
  params?: Record<string, string>;
}

export default function WedMeIntegration() {
  const [appStatus, setAppStatus] = useState<WedMeAppStatus>({
    isInstalled: false,
    canDeepLink: false,
    supportsNotifications: false,
  });
  const [showQRCode, setShowQRCode] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    detectWedMeApp();
    setupInstallPrompt();
  }, []);

  // Detect WedMe app installation and capabilities
  const detectWedMeApp = useCallback(async () => {
    try {
      // Check if running in WedMe app via user agent
      const isWedMeApp = /WedMe/i.test(navigator.userAgent);

      // Check for deep link support
      const canDeepLink = 'navigator' in window && 'canShare' in navigator;

      // Check for notification support
      const supportsNotifications =
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;

      setAppStatus({
        isInstalled: isWedMeApp,
        version: isWedMeApp ? extractAppVersion() : undefined,
        canDeepLink,
        supportsNotifications,
      });
    } catch (error) {
      console.error('Error detecting WedMe app:', error);
    }
  }, []);

  const extractAppVersion = (): string => {
    const match = navigator.userAgent.match(/WedMe\/(\d+\.\d+\.\d+)/);
    return match ? match[1] : '1.0.0';
  };

  // Setup PWA install prompt
  const setupInstallPrompt = () => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
    };
  };

  // Deep linking functions
  const openInWedMeApp = async (
    deepLinkData: DeepLinkData,
  ): Promise<boolean> => {
    if (!appStatus.canDeepLink) {
      return false;
    }

    try {
      const baseUrl = 'wedme://helper-tasks';
      const params = new URLSearchParams({
        action: deepLinkData.action,
        ...(deepLinkData.taskId && { taskId: deepLinkData.taskId }),
        ...(deepLinkData.weddingId && { weddingId: deepLinkData.weddingId }),
        ...deepLinkData.params,
      });

      const deepLink = `${baseUrl}?${params.toString()}`;

      if (appStatus.isInstalled) {
        // Direct deep link for installed app
        window.location.href = deepLink;
        return true;
      } else {
        // Fallback to app store or web version
        const fallbackUrl = `https://wedme.app/tasks?${params.toString()}`;

        // Try deep link first, fallback to web after timeout
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = deepLink;
        document.body.appendChild(iframe);

        setTimeout(() => {
          document.body.removeChild(iframe);
          window.open(fallbackUrl, '_blank');
        }, 2000);

        return true;
      }
    } catch (error) {
      console.error('Error opening WedMe app:', error);
      return false;
    }
  };

  // Install PWA/App
  const installWedMeApp = async (): Promise<void> => {
    try {
      if (installPrompt) {
        // PWA installation
        const result = await installPrompt.prompt();
        console.log('PWA install result:', result);
        setInstallPrompt(null);
      } else {
        // Redirect to app store
        const userAgent = navigator.userAgent.toLowerCase();
        let storeUrl = 'https://wedme.app/download';

        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          storeUrl =
            'https://apps.apple.com/app/wedme-wedding-assistant/id1234567890';
        } else if (userAgent.includes('android')) {
          storeUrl =
            'https://play.google.com/store/apps/details?id=com.wedme.app';
        }

        window.open(storeUrl, '_blank');
      }
    } catch (error) {
      console.error('Error installing WedMe app:', error);
    }
  };

  // Share functionality
  const shareToWedMeApp = async (
    taskId: string,
    taskTitle: string,
  ): Promise<void> => {
    try {
      const shareData = {
        title: `WedSync Task: ${taskTitle}`,
        text: 'Check out this wedding task assignment',
        url: `https://wedsync.com/tasks/${taskId}`,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        const shareUrl = `https://wedsync.com/tasks/${taskId}`;
        await navigator.clipboard.writeText(shareUrl);

        // Show feedback
        alert('Task link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing task:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* App Status Banner */}
      <div
        className={`rounded-xl p-4 border-2 ${
          appStatus.isInstalled
            ? 'bg-success-50 border-success-200'
            : 'bg-blue-50 border-blue-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              appStatus.isInstalled ? 'bg-success-100' : 'bg-blue-100'
            }`}
          >
            <Smartphone
              className={`w-6 h-6 ${
                appStatus.isInstalled ? 'text-success-600' : 'text-blue-600'
              }`}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {appStatus.isInstalled
                ? 'WedMe App Connected'
                : 'WedMe Mobile App'}
            </h3>
            <p className="text-sm text-gray-600">
              {appStatus.isInstalled
                ? `Version ${appStatus.version} - Enhanced mobile experience active`
                : 'Get the native app for better task management'}
            </p>
          </div>
          {appStatus.isInstalled ? (
            <Check className="w-6 h-6 text-success-600" />
          ) : (
            <Download className="w-6 h-6 text-blue-600" />
          )}
        </div>
      </div>

      {/* Installation Section */}
      {!appStatus.isInstalled && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-8 h-8 text-primary-600" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Install WedMe Mobile App
              </h3>
              <p className="text-gray-600">
                Get instant notifications, offline access, and a better mobile
                experience for managing your wedding tasks.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={installWedMeApp}
                className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Install WedMe App
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="text-sm text-gray-500">or</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                Show QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Section */}
      {showQRCode && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Scan to Install</h4>
            <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
              {/* QR Code would be generated here */}
              <div className="text-center">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">QR Code</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Scan with your phone camera to install the WedMe app
            </p>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Mobile App Features
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                Push Notifications
              </h4>
              <p className="text-sm text-gray-600">
                Get instant alerts for new tasks, due dates, and updates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-success-100 rounded-lg flex-shrink-0">
              <Sync className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                Offline Access
              </h4>
              <p className="text-sm text-gray-600">
                View and update tasks even without internet connection
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
              <Smartphone className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                Native Experience
              </h4>
              <p className="text-sm text-gray-600">
                Optimized touch controls and mobile-first design
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-warning-100 rounded-lg flex-shrink-0">
              <Share2 className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Easy Sharing</h4>
              <p className="text-sm text-gray-600">
                Share tasks and updates with other wedding helpers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions for App Users */}
      {appStatus.isInstalled && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Quick Actions
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => openInWedMeApp({ action: 'view_dashboard' })}
              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Smartphone className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Open in App</h4>
                  <p className="text-sm text-gray-600">
                    Switch to native app experience
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() =>
                pushNotificationService.subscribeToPushNotifications()
              }
              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              disabled={!appStatus.supportsNotifications}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">
                    Enable Notifications
                  </h4>
                  <p className="text-sm text-gray-600">
                    Get alerts for task updates
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Compatibility Notice */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-1">
              Browser Compatibility
            </p>
            <p>
              For the best experience, use WedMe on iOS Safari 14+, Android
              Chrome 88+, or install the native app. Some features may be
              limited on older browsers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for WedMe integration
export function useWedMeIntegration() {
  const [isWedMeApp, setIsWedMeApp] = useState(false);
  const [appVersion, setAppVersion] = useState<string>();

  useEffect(() => {
    const checkWedMeApp = () => {
      const isApp = /WedMe/i.test(navigator.userAgent);
      setIsWedMeApp(isApp);

      if (isApp) {
        const match = navigator.userAgent.match(/WedMe\/(\d+\.\d+\.\d+)/);
        setAppVersion(match ? match[1] : '1.0.0');
      }
    };

    checkWedMeApp();
  }, []);

  const openTaskInApp = useCallback(
    async (taskId: string): Promise<void> => {
      if (isWedMeApp) {
        const deepLink = `wedme://helper-tasks?action=view_task&taskId=${taskId}`;
        window.location.href = deepLink;
      } else {
        // Fallback to web view
        window.location.href = `/tasks/${taskId}`;
      }
    },
    [isWedMeApp],
  );

  const startTaskInApp = useCallback(
    async (taskId: string): Promise<void> => {
      if (isWedMeApp) {
        const deepLink = `wedme://helper-tasks?action=start_task&taskId=${taskId}`;
        window.location.href = deepLink;
      }
    },
    [isWedMeApp],
  );

  const shareTask = useCallback(
    async (taskId: string, taskTitle: string): Promise<void> => {
      const shareData = {
        title: `WedSync Task: ${taskTitle}`,
        text: 'Check out this wedding task assignment',
        url: `https://wedsync.com/tasks/${taskId}`,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Task link copied to clipboard!');
      }
    },
    [],
  );

  return {
    isWedMeApp,
    appVersion,
    openTaskInApp,
    startTaskInApp,
    shareTask,
  };
}
