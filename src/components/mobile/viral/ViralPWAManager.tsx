'use client';

// =====================================================
// VIRAL PWA MANAGER COMPONENT
// WS-230 Enhanced Viral Coefficient Tracking System
// Team D - Progressive Web App Manager
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Download,
  Bell,
  Sync,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

// =====================================================
// PWA STATE INTERFACE
// =====================================================

interface PWAState {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  hasServiceWorker: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: Date | null;
  notificationPermission: NotificationPermission;
  installPrompt: any | null;
}

// =====================================================
// PWA HOOKS
// =====================================================

const usePWAState = () => {
  const [state, setState] = useState<PWAState>({
    isOnline: true,
    isInstallable: false,
    isInstalled: false,
    hasServiceWorker: false,
    syncStatus: 'idle',
    lastSyncTime: null,
    notificationPermission: 'default',
    installPrompt: null,
  });

  useEffect(() => {
    // Initialize PWA state
    const updateOnlineStatus = () => {
      setState((prev) => ({ ...prev, isOnline: navigator.onLine }));
    };

    // Check if app is already installed
    const checkInstallStatus = () => {
      const isInstalled =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setState((prev) => ({ ...prev, isInstalled }));
    };

    // Check notification permission
    const checkNotificationPermission = () => {
      if ('Notification' in window) {
        setState((prev) => ({
          ...prev,
          notificationPermission: Notification.permission,
        }));
      }
    };

    // Event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initialize states
    updateOnlineStatus();
    checkInstallStatus();
    checkNotificationPermission();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return [state, setState] as const;
};

// =====================================================
// SERVICE WORKER REGISTRATION HOOK
// =====================================================

const useServiceWorker = (
  setState: React.Dispatch<React.SetStateAction<PWAState>>,
) => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker(setState);
    }
  }, [setState]);

  const requestSync = useCallback(() => {
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      navigator.serviceWorker.ready
        .then((registration) => {
          return registration.sync.register('viral-data-sync');
        })
        .then(() => {
          setState((prev) => ({ ...prev, syncStatus: 'syncing' }));
        })
        .catch((error) => {
          console.error('Background sync registration failed:', error);
          setState((prev) => ({ ...prev, syncStatus: 'error' }));
        });
    } else {
      // Fallback: manual sync
      manualSync(setState);
    }
  }, [setState]);

  return { requestSync };
};

// =====================================================
// SERVICE WORKER REGISTRATION FUNCTION
// =====================================================

async function registerServiceWorker(
  setState: React.Dispatch<React.SetStateAction<PWAState>>,
) {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    console.log('Service worker registered successfully');
    setState((prev) => ({ ...prev, hasServiceWorker: true }));

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New update available
            showUpdateNotification(newWorker);
          }
        });
      }
    });

    // Handle messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      handleServiceWorkerMessage(event, setState);
    });
  } catch (error) {
    console.error('Service worker registration failed:', error);
    setState((prev) => ({ ...prev, hasServiceWorker: false }));
  }
}

// =====================================================
// SERVICE WORKER MESSAGE HANDLER
// =====================================================

function handleServiceWorkerMessage(
  event: MessageEvent,
  setState: React.Dispatch<React.SetStateAction<PWAState>>,
) {
  const { type, timestamp } = event.data;

  switch (type) {
    case 'VIRAL_DATA_SYNCED':
      setState((prev) => ({
        ...prev,
        syncStatus: 'success',
        lastSyncTime: new Date(timestamp),
      }));
      break;

    case 'SYNC_ERROR':
      setState((prev) => ({ ...prev, syncStatus: 'error' }));
      break;

    default:
      console.log('Unknown service worker message:', event.data);
  }
}

// =====================================================
// MANUAL SYNC FALLBACK
// =====================================================

async function manualSync(
  setState: React.Dispatch<React.SetStateAction<PWAState>>,
) {
  setState((prev) => ({ ...prev, syncStatus: 'syncing' }));

  try {
    // Manually fetch and cache viral data
    const response = await fetch('/api/viral/analytics?period=WEEKLY');

    if (response.ok) {
      setState((prev) => ({
        ...prev,
        syncStatus: 'success',
        lastSyncTime: new Date(),
      }));
    } else {
      throw new Error('Sync failed');
    }
  } catch (error) {
    setState((prev) => ({ ...prev, syncStatus: 'error' }));
  }
}

// =====================================================
// UPDATE NOTIFICATION
// =====================================================

function showUpdateNotification(newWorker: ServiceWorker) {
  // Create custom update notification
  const updateBanner = document.createElement('div');
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #3B82F6;
      color: white;
      padding: 12px;
      text-align: center;
      z-index: 9999;
      font-family: system-ui;
    ">
      <p style="margin: 0; margin-bottom: 8px;">New version available!</p>
      <button onclick="this.parentElement.parentElement.remove(); newWorker.postMessage({type: 'SKIP_WAITING'}); window.location.reload();" 
              style="background: white; color: #3B82F6; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
        Update Now
      </button>
      <button onclick="this.parentElement.parentElement.remove();" 
              style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        Later
      </button>
    </div>
  `;

  document.body.appendChild(updateBanner);
}

// =====================================================
// INSTALL PROMPT HANDLER
// =====================================================

const useInstallPrompt = (
  setState: React.Dispatch<React.SetStateAction<PWAState>>,
) => {
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState((prev) => ({
        ...prev,
        isInstallable: true,
        installPrompt: e,
      }));
    };

    const handleAppInstalled = () => {
      setState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setState]);

  const triggerInstall = useCallback(
    async (installPrompt: any) => {
      if (!installPrompt) return false;

      try {
        await installPrompt.prompt();
        const choiceResult = await installPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
          setState((prev) => ({
            ...prev,
            installPrompt: null,
            isInstallable: false,
          }));
          return true;
        }
      } catch (error) {
        console.error('Install prompt failed:', error);
      }

      return false;
    },
    [setState],
  );

  return { triggerInstall };
};

// =====================================================
// NOTIFICATION PERMISSION HANDLER
// =====================================================

const useNotifications = (
  setState: React.Dispatch<React.SetStateAction<PWAState>>,
) => {
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, notificationPermission: permission }));

      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }, [setState]);

  return { requestNotificationPermission };
};

// =====================================================
// STATUS BANNER COMPONENT
// =====================================================

interface StatusBannerProps {
  isOnline: boolean;
  syncStatus: PWAState['syncStatus'];
  lastSyncTime: Date | null;
  onSync: () => void;
}

const StatusBanner: React.FC<StatusBannerProps> = ({
  isOnline,
  syncStatus,
  lastSyncTime,
  onSync,
}) => {
  const [showBanner, setShowBanner] = useState(true);

  if (!showBanner) return null;

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'bg-red-500',
        text: 'You are offline. Some features may be limited.',
        action: null,
      };
    }

    if (syncStatus === 'syncing') {
      return {
        icon: Sync,
        color: 'bg-blue-500',
        text: 'Syncing viral data...',
        action: null,
      };
    }

    if (syncStatus === 'success' && lastSyncTime) {
      const timeDiff = Date.now() - lastSyncTime.getTime();
      const minutes = Math.floor(timeDiff / 60000);

      return {
        icon: CheckCircle,
        color: 'bg-green-500',
        text: `Data synced ${minutes < 1 ? 'just now' : `${minutes}m ago`}`,
        action: minutes > 5 ? { label: 'Refresh', onClick: onSync } : null,
      };
    }

    if (syncStatus === 'error') {
      return {
        icon: AlertCircle,
        color: 'bg-red-500',
        text: 'Sync failed. Tap to retry.',
        action: { label: 'Retry', onClick: onSync },
      };
    }

    return null;
  };

  const config = getStatusConfig();
  if (!config) return null;

  const { icon: Icon, color, text, action } = config;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className={`${color} text-white px-4 py-3 relative`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon
              className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
            />
            <span className="text-sm font-medium">{text}</span>
          </div>

          <div className="flex items-center space-x-2">
            {action && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={action.onClick}
                className="text-white bg-white bg-opacity-20 px-3 py-1 rounded text-sm font-medium"
              >
                {action.label}
              </motion.button>
            )}

            <button
              onClick={() => setShowBanner(false)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// =====================================================
// INSTALL BANNER COMPONENT
// =====================================================

interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({
  onInstall,
  onDismiss,
}) => {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t p-4 z-50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Download className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Install WedSync Viral
            </h3>
            <p className="text-xs text-gray-600">
              Get quick access and offline features
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onInstall}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
          >
            Install
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
          >
            Later
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// =====================================================
// MAIN PWA MANAGER COMPONENT
// =====================================================

const ViralPWAManager: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = usePWAState();
  const { requestSync } = useServiceWorker(setState);
  const { triggerInstall } = useInstallPrompt(setState);
  const { requestNotificationPermission } = useNotifications(setState);

  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Show install banner after 30 seconds if installable and not dismissed
  useEffect(() => {
    if (state.isInstallable && !state.isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [state.isInstallable, state.isInstalled]);

  const handleInstall = useCallback(async () => {
    const success = await triggerInstall(state.installPrompt);
    if (success) {
      setShowInstallBanner(false);
    }
  }, [triggerInstall, state.installPrompt]);

  const handleInstallDismiss = useCallback(() => {
    setShowInstallBanner(false);
    // Don't show again for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  // Request notification permission on first interaction
  useEffect(() => {
    if (state.notificationPermission === 'default') {
      const requestOnFirstInteraction = () => {
        requestNotificationPermission();
        document.removeEventListener('click', requestOnFirstInteraction);
        document.removeEventListener('touchstart', requestOnFirstInteraction);
      };

      document.addEventListener('click', requestOnFirstInteraction);
      document.addEventListener('touchstart', requestOnFirstInteraction);

      return () => {
        document.removeEventListener('click', requestOnFirstInteraction);
        document.removeEventListener('touchstart', requestOnFirstInteraction);
      };
    }
  }, [state.notificationPermission, requestNotificationPermission]);

  return (
    <div className="min-h-screen">
      {/* Status Banner */}
      <StatusBanner
        isOnline={state.isOnline}
        syncStatus={state.syncStatus}
        lastSyncTime={state.lastSyncTime}
        onSync={requestSync}
      />

      {/* Main Content */}
      {children}

      {/* Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <InstallBanner
            onInstall={handleInstall}
            onDismiss={handleInstallDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViralPWAManager;
