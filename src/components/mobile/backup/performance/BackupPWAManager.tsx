'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBackupPerformanceMonitoring } from '@/hooks/useBackupPerformanceMonitoring';
import { useWeddingHaptics } from '@/hooks/mobile/useHapticFeedback';

// WS-258 Progressive Web App Optimization for Backup Management
// Wedding industry PWA features: installation, offline capability, push notifications

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface BackupPWAManagerProps {
  isWeddingDay?: boolean;
  clientName?: string;
  weddingDate?: Date;
  isEmergencyMode?: boolean;
  className?: string;
}

interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  installing: boolean;
  activated: boolean;
  error: string | null;
}

interface InstallationState {
  canInstall: boolean;
  isInstalled: boolean;
  installPrompt: PWAInstallPrompt | null;
  installSource: 'browser' | 'add-to-homescreen' | 'manifest' | null;
}

interface CacheStatus {
  static: number;
  dynamic: number;
  backup: number;
  emergency: number;
  total: number;
  lastUpdate: Date | null;
  version: string;
}

interface BackgroundSync {
  enabled: boolean;
  tags: string[];
  lastSync: Date | null;
  pendingOperations: number;
}

export default function BackupPWAManager({
  isWeddingDay = false,
  clientName,
  weddingDate,
  isEmergencyMode = false,
  className = '',
}: BackupPWAManagerProps) {
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerState>({
    registration: null,
    updateAvailable: false,
    installing: false,
    activated: false,
    error: null,
  });

  const [installation, setInstallation] = useState<InstallationState>({
    canInstall: false,
    isInstalled: false,
    installPrompt: null,
    installSource: null,
  });

  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    static: 0,
    dynamic: 0,
    backup: 0,
    emergency: 0,
    total: 0,
    lastUpdate: null,
    version: '1.3.0',
  });

  const [backgroundSync, setBackgroundSync] = useState<BackgroundSync>({
    enabled: false,
    tags: [],
    lastSync: null,
    pendingOperations: 0,
  });

  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [notifications, setNotifications] = useState<{
    permission: NotificationPermission;
    supported: boolean;
    subscription: PushSubscription | null;
  }>({
    permission: 'default',
    supported: false,
    subscription: null,
  });

  const { measurePerformance } =
    useBackupPerformanceMonitoring('BackupPWAManager');
  const haptics = useWeddingHaptics();

  // PWA Installation Detection and Management
  useEffect(() => {
    let deferredPrompt: any = null;

    // Check if already installed
    const checkInstallation = () => {
      const isInstalled =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setInstallation((prev) => ({ ...prev, isInstalled }));
    };

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;

      setInstallation((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: deferredPrompt,
        installSource: 'browser',
      }));

      // Show PWA installation prompt for wedding day users
      if (isWeddingDay || isEmergencyMode) {
        setShowPWAPrompt(true);
        haptics.weddingDayAlert();
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setInstallation((prev) => ({
        ...prev,
        canInstall: false,
        isInstalled: true,
        installPrompt: null,
      }));

      haptics.backupComplete();
      setShowPWAPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    checkInstallation();

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isWeddingDay, isEmergencyMode, haptics]);

  // Service Worker Management
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        setServiceWorker((prev) => ({
          ...prev,
          registration,
          activated: true,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            setServiceWorker((prev) => ({ ...prev, installing: true }));

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setServiceWorker((prev) => ({
                  ...prev,
                  updateAvailable: true,
                  installing: false,
                }));
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener(
          'message',
          handleServiceWorkerMessage,
        );
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setServiceWorker((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Registration failed',
        }));
      }
    };

    registerServiceWorker();

    return () => {
      navigator.serviceWorker.removeEventListener(
        'message',
        handleServiceWorkerMessage,
      );
    };
  }, []);

  // Service Worker Message Handler
  const handleServiceWorkerMessage = useCallback(
    (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'SERVICE_WORKER_ACTIVATED':
          setServiceWorker((prev) => ({
            ...prev,
            activated: true,
            error: null,
          }));
          break;

        case 'CACHE_STATUS_UPDATE':
          setCacheStatus(data);
          break;

        case 'BACKGROUND_SYNC_STATUS':
          setBackgroundSync(data);
          break;

        case 'BACKUP_OPERATIONS_SYNCED':
          haptics.backupComplete();
          break;

        case 'EMERGENCY_RECOVERY_SYNCED':
          haptics.emergencyMode();
          break;

        case 'NETWORK_QUALITY_CHANGED':
          if (data.quality === 'poor') {
            haptics.networkIssue();
          }
          break;

        default:
          console.log('Unknown service worker message:', type, data);
      }
    },
    [haptics],
  );

  // Push Notifications Setup
  useEffect(() => {
    const setupNotifications = async () => {
      const supported =
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;

      setNotifications((prev) => ({
        ...prev,
        supported,
        permission: supported ? Notification.permission : 'denied',
      }));

      if (supported && serviceWorker.registration) {
        try {
          const subscription =
            await serviceWorker.registration.pushManager.getSubscription();
          setNotifications((prev) => ({ ...prev, subscription }));
        } catch (error) {
          console.warn('Push subscription check failed:', error);
        }
      }
    };

    setupNotifications();
  }, [serviceWorker.registration]);

  // PWA Installation Handler
  const handleInstallPWA = useCallback(async () => {
    const startTime = performance.now();

    if (!installation.installPrompt) return false;

    try {
      await installation.installPrompt.prompt();
      const choiceResult = await installation.installPrompt.userChoice;

      const installTime = performance.now() - startTime;
      measurePerformance('pwa-install', installTime);

      if (choiceResult.outcome === 'accepted') {
        haptics.backupComplete();
        setShowPWAPrompt(false);
        return true;
      } else {
        haptics.trigger('ERROR_MINOR');
        return false;
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
      haptics.backupError();
      return false;
    }
  }, [installation.installPrompt, measurePerformance, haptics]);

  // Request Push Notifications Permission
  const enableNotifications = useCallback(async () => {
    if (!notifications.supported || !serviceWorker.registration) return false;

    try {
      const permission = await Notification.requestPermission();
      setNotifications((prev) => ({ ...prev, permission }));

      if (permission === 'granted') {
        // Subscribe to push notifications
        const subscription =
          await serviceWorker.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY,
          });

        setNotifications((prev) => ({ ...prev, subscription }));
        haptics.backupComplete();

        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Notification permission failed:', error);
      haptics.backupError();
      return false;
    }
  }, [notifications.supported, serviceWorker.registration, haptics]);

  // Update Service Worker
  const updateServiceWorker = useCallback(async () => {
    if (!serviceWorker.registration) return;

    try {
      await serviceWorker.registration.update();

      if (serviceWorker.registration.waiting) {
        serviceWorker.registration.waiting.postMessage({
          type: 'SKIP_WAITING',
        });
        window.location.reload();
      }
    } catch (error) {
      console.error('Service worker update failed:', error);
    }
  }, [serviceWorker.registration]);

  // Clear All Caches
  const clearCaches = useCallback(async () => {
    if (!serviceWorker.registration) return;

    try {
      serviceWorker.registration.active?.postMessage({ type: 'CLEAR_CACHE' });
      haptics.trigger('BACKUP_START');

      // Refresh cache status
      setTimeout(() => {
        serviceWorker.registration?.active?.postMessage({
          type: 'GET_CACHE_STATUS',
        });
      }, 1000);
    } catch (error) {
      console.error('Cache clearing failed:', error);
      haptics.backupError();
    }
  }, [serviceWorker.registration, haptics]);

  // Force Background Sync
  const forceSync = useCallback(async () => {
    if (!serviceWorker.registration) return;

    try {
      await serviceWorker.registration.sync.register('sync-backup-operations');
      await serviceWorker.registration.sync.register('sync-emergency-recovery');
      haptics.trigger('SYNC_COMPLETE');
    } catch (error) {
      console.error('Background sync failed:', error);
      haptics.backupError();
    }
  }, [serviceWorker.registration, haptics]);

  const weddingDayMessage = useMemo(() => {
    if (!isWeddingDay) return null;

    return {
      title: '💒 Wedding Day PWA Mode',
      message: `Install WedSync as an app for reliable offline access during ${clientName ? `${clientName}'s` : 'your'} wedding day.`,
      urgency: 'high',
    };
  }, [isWeddingDay, clientName]);

  const emergencyMessage = useMemo(() => {
    if (!isEmergencyMode) return null;

    return {
      title: '🚨 Emergency Recovery Mode',
      message:
        'Install the WedSync app for maximum reliability during this emergency situation.',
      urgency: 'critical',
    };
  }, [isEmergencyMode]);

  return (
    <div className={`backup-pwa-manager ${className}`}>
      {/* Wedding Day / Emergency PWA Installation Prompt */}
      {showPWAPrompt && (weddingDayMessage || emergencyMessage) && (
        <div
          className={`
          fixed inset-x-4 top-4 z-50 p-4 rounded-2xl shadow-lg
          ${emergencyMessage ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'}
        `}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg">
                {emergencyMessage?.title || weddingDayMessage?.title}
              </h3>
              <p className="text-sm mt-1 opacity-90">
                {emergencyMessage?.message || weddingDayMessage?.message}
              </p>
              <div className="flex items-center space-x-3 mt-3">
                <button
                  onClick={handleInstallPWA}
                  className="bg-white bg-opacity-20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-30"
                >
                  📱 Install App
                </button>
                <button
                  onClick={() => setShowPWAPrompt(false)}
                  className="text-white text-opacity-70 text-sm"
                >
                  Maybe later
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPWAPrompt(false)}
              className="ml-4 text-white text-opacity-70 hover:text-opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* PWA Status Dashboard */}
      <div className="pwa-status bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          📱 Progressive Web App Status
          {installation.isInstalled && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Installed
            </span>
          )}
        </h2>

        {/* Installation Status */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Installation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-3 rounded-lg ${
                installation.isInstalled
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}
            >
              <div className="text-sm font-medium">
                {installation.isInstalled ? '✅ Installed' : '📱 Not Installed'}
              </div>
              <div className="text-xs mt-1">
                {installation.isInstalled
                  ? 'Running as PWA'
                  : installation.canInstall
                    ? 'Ready to install'
                    : 'Installation not available'}
              </div>
            </div>

            <div
              className={`p-3 rounded-lg ${
                notifications.permission === 'granted'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              }`}
            >
              <div className="text-sm font-medium">
                {notifications.permission === 'granted'
                  ? '🔔 Notifications On'
                  : '🔕 Notifications Off'}
              </div>
              <div className="text-xs mt-1">
                {notifications.supported
                  ? notifications.permission
                  : 'Not supported'}
              </div>
            </div>

            <div
              className={`p-3 rounded-lg ${
                serviceWorker.activated
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="text-sm font-medium">
                {serviceWorker.activated
                  ? '⚙️ Service Worker Active'
                  : '❌ Service Worker Failed'}
              </div>
              <div className="text-xs mt-1">
                {serviceWorker.error ||
                  (serviceWorker.activated
                    ? 'Background sync ready'
                    : 'Offline mode unavailable')}
              </div>
            </div>
          </div>
        </div>

        {/* Cache Status */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Offline Cache Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {cacheStatus.backup}
              </div>
              <div className="text-xs text-blue-800">Backup APIs</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {cacheStatus.emergency}
              </div>
              <div className="text-xs text-red-800">Emergency Data</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {cacheStatus.static}
              </div>
              <div className="text-xs text-gray-800">Static Assets</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {cacheStatus.total}
              </div>
              <div className="text-xs text-purple-800">Total Cached</div>
            </div>
          </div>
          {cacheStatus.lastUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {cacheStatus.lastUpdate.toLocaleString()}
            </p>
          )}
        </div>

        {/* Background Sync Status */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Background Sync</h3>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium">
                {backgroundSync.enabled ? '🔄 Active' : '⏸️ Inactive'}
              </div>
              <div className="text-xs text-gray-600">
                {backgroundSync.pendingOperations} pending operations
              </div>
            </div>
            {backgroundSync.lastSync && (
              <div className="text-xs text-gray-500">
                Last sync: {backgroundSync.lastSync.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* PWA Actions */}
        <div className="flex flex-wrap gap-3">
          {installation.canInstall && !installation.isInstalled && (
            <button
              onClick={handleInstallPWA}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              📱 Install as App
            </button>
          )}

          {notifications.supported &&
            notifications.permission !== 'granted' && (
              <button
                onClick={enableNotifications}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                🔔 Enable Notifications
              </button>
            )}

          {serviceWorker.updateAvailable && (
            <button
              onClick={updateServiceWorker}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              🔄 Update App
            </button>
          )}

          <button
            onClick={forceSync}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
          >
            ⚡ Force Sync
          </button>

          <button
            onClick={clearCaches}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            🗑️ Clear Cache
          </button>
        </div>
      </div>

      {/* Wedding Day Specific Features */}
      {isWeddingDay && (
        <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border border-pink-200">
          <h3 className="font-semibold text-pink-800 mb-2">
            💒 Wedding Day PWA Features
          </h3>
          <ul className="space-y-1 text-sm text-pink-700">
            <li>✅ 72-hour offline backup cache active</li>
            <li>✅ Emergency recovery data preloaded</li>
            <li>✅ Critical vendor data prioritized</li>
            <li>✅ Enhanced haptic feedback patterns</li>
            {installation.isInstalled && (
              <li>✅ Fullscreen wedding day interface</li>
            )}
            {notifications.permission === 'granted' && (
              <li>✅ Critical alerts enabled</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
