'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  X,
  Smartphone,
  Zap,
  Shield,
  Wifi,
  Battery,
} from 'lucide-react';
import { useMobileInfrastructure } from '@/hooks/useMobileInfrastructure';

/**
 * WS-257 Team D: PWA Installation Prompt
 * Mobile-optimized installation prompt for infrastructure management app
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const { deviceInfo, vibrate, showNotification } = useMobileInfrastructure();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);

      // Show prompt after 30 seconds on mobile devices
      if (deviceInfo.isMobile) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 30000);
      }
    };

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      showNotification('📱 App Installed Successfully', {
        body: 'WedSync Infrastructure is now available on your home screen',
        tag: 'app-installed',
      });
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalledHandler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, [deviceInfo.isMobile, showNotification]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    vibrate(50);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    vibrate(30);

    // Don't show again for 24 hours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const hoursSinceDismissed =
        (Date.now() - dismissedTime) / (1000 * 60 * 60);

      if (hoursSinceDismissed < 24) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (isInstalled || !deviceInfo.isMobile || !deviceInfo.supportsPWA) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:w-96"
        >
          <Card className="border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Install Infrastructure App
                    </h3>
                    <Badge variant="secondary" className="mt-1">
                      Enhanced Mobile Experience
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span>Lightning-fast emergency access</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Wifi className="w-4 h-4 text-indigo-500" />
                  <span>Works offline during emergencies</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span>Wedding day security protocols</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Battery className="w-4 h-4 text-indigo-500" />
                  <span>Optimized for mobile battery life</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isInstalling ? 'Installing...' : 'Install App'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="px-4"
                >
                  Later
                </Button>
              </div>

              {deviceInfo.isIOS && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>iOS Users:</strong> Tap the share button in Safari,
                    then "Add to Home Screen" to install.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Installation status component for settings/about page
export function PWAInstallStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  const { deviceInfo } = useMobileInfrastructure();

  useEffect(() => {
    // Check installation status
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia(
        '(display-mode: standalone)',
      ).matches;
      const isInWebApp = (window.navigator as any).standalone === true;

      setIsInstalled(isStandalone || isInWebApp);
    };

    // Check if can install
    const checkCanInstall = () => {
      setCanInstall(deviceInfo.supportsPWA && !isInstalled);
    };

    checkInstallStatus();
    checkCanInstall();

    const handler = () => {
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [deviceInfo.supportsPWA, isInstalled]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isInstalled ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <Smartphone
              className={`w-5 h-5 ${
                isInstalled ? 'text-green-600' : 'text-gray-600'
              }`}
            />
          </div>
          <div>
            <h3 className="font-medium">
              {isInstalled ? 'App Installed' : 'Web App'}
            </h3>
            <p className="text-sm text-gray-600">
              {isInstalled
                ? 'Running as installed app'
                : canInstall
                  ? 'Install for better performance'
                  : 'Running in browser'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant={isInstalled ? 'default' : 'secondary'}>
            {isInstalled ? 'Installed' : 'Browser'}
          </Badge>
        </div>
      </div>

      {isInstalled && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-green-600">
            <Zap className="w-4 h-4" />
            <span>Fast Launch</span>
          </div>
          <div className="flex items-center space-x-2 text-green-600">
            <Wifi className="w-4 h-4" />
            <span>Offline Ready</span>
          </div>
          <div className="flex items-center space-x-2 text-green-600">
            <Shield className="w-4 h-4" />
            <span>Secure</span>
          </div>
          <div className="flex items-center space-x-2 text-green-600">
            <Battery className="w-4 h-4" />
            <span>Battery Optimized</span>
          </div>
        </div>
      )}
    </Card>
  );
}
