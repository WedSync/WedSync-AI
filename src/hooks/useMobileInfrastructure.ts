'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * WS-257 Team D: Mobile Infrastructure Management Hook
 * Comprehensive mobile utilities for infrastructure monitoring
 */

interface NetworkInfo {
  online: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface BatteryInfo {
  charging: boolean;
  level: number;
  chargingTime?: number;
  dischargingTime?: number;
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsVibration: boolean;
  supportsPWA: boolean;
  hasCamera: boolean;
}

interface TouchGesture {
  type: 'tap' | 'doubletap' | 'longtap' | 'swipe' | 'pinch';
  direction?: 'up' | 'down' | 'left' | 'right';
  deltaX?: number;
  deltaY?: number;
  scale?: number;
  duration?: number;
}

interface InfrastructureData {
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    cpu: number;
    memory: number;
    latency: number;
    uptime: number;
  };
  lastUpdate: number;
  isOffline: boolean;
}

export const useMobileInfrastructure = () => {
  const { toast } = useToast();

  // Network monitoring
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    online: typeof window !== 'undefined' ? navigator.onLine : true,
  });

  // Battery monitoring
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({
    charging: true,
    level: 1,
  });

  // Device detection
  const [deviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isIOS: false,
        isAndroid: false,
        supportsVibration: false,
        supportsPWA: false,
        hasCamera: false,
      };
    }

    const userAgent = navigator.userAgent;
    const isMobile =
      /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(
        userAgent,
      );
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);

    return {
      isMobile,
      isTablet,
      isIOS,
      isAndroid,
      supportsVibration: 'vibrate' in navigator,
      supportsPWA: 'serviceWorker' in navigator && 'PushManager' in window,
      hasCamera:
        'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    };
  });

  // Infrastructure data
  const [infrastructureData, setInfrastructureData] =
    useState<InfrastructureData>({
      status: 'healthy',
      metrics: { cpu: 0, memory: 0, latency: 0, uptime: 100 },
      lastUpdate: Date.now(),
      isOffline: false,
    });

  // Emergency mode
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [weddingDayMode, setWeddingDayMode] = useState(false);

  // Touch gesture handling
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const lastTapRef = useRef<number>(0);

  // Battery monitoring
  useEffect(() => {
    const updateBatteryInfo = (battery: any) => {
      setBatteryInfo({
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      });
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        updateBatteryInfo(battery);

        battery.addEventListener('chargingchange', () =>
          updateBatteryInfo(battery),
        );
        battery.addEventListener('levelchange', () =>
          updateBatteryInfo(battery),
        );
        battery.addEventListener('chargingtimechange', () =>
          updateBatteryInfo(battery),
        );
        battery.addEventListener('dischargingtimechange', () =>
          updateBatteryInfo(battery),
        );
      });
    }
  }, []);

  // Network monitoring
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setNetworkInfo({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      });
    };

    const handleOnline = () => {
      updateNetworkInfo();
      toast({
        title: '🌐 Back Online',
        description: 'Infrastructure monitoring resumed',
      });
    };

    const handleOffline = () => {
      updateNetworkInfo();
      toast({
        title: '⚠️ Connection Lost',
        description:
          'Switched to offline mode. Emergency controls remain available.',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    updateNetworkInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [toast]);

  // Infrastructure data polling
  useEffect(() => {
    const pollInfrastructureData = async () => {
      try {
        const response = await fetch('/api/infrastructure/status');
        const data = await response.json();

        setInfrastructureData({
          status: data.status,
          metrics: data.metrics,
          lastUpdate: Date.now(),
          isOffline: false,
        });

        // Check for critical alerts
        if (data.status === 'critical') {
          vibrate([200, 100, 200, 100, 200]);
          toast({
            title: '🚨 Critical Infrastructure Alert',
            description: data.message || 'System requires immediate attention',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Infrastructure polling failed:', error);
        setInfrastructureData((prev) => ({
          ...prev,
          isOffline: true,
          lastUpdate: Date.now(),
        }));
      }
    };

    // Poll every 30 seconds in normal mode, 10 seconds in emergency mode
    const interval = setInterval(
      pollInfrastructureData,
      isEmergencyMode ? 10000 : 30000,
    );

    pollInfrastructureData(); // Initial poll

    return () => clearInterval(interval);
  }, [isEmergencyMode, toast]);

  // Emergency mode detection
  useEffect(() => {
    const checkEmergencyMode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const emergency = urlParams.get('emergency') === 'true';
      const weddingMode = urlParams.get('wedding_mode') === 'true';

      setIsEmergencyMode(emergency);
      setWeddingDayMode(weddingMode);

      if (emergency || weddingMode) {
        // Activate high-priority monitoring
        vibrate([100, 50, 100]);
      }
    };

    checkEmergencyMode();
    window.addEventListener('popstate', checkEmergencyMode);

    return () => window.removeEventListener('popstate', checkEmergencyMode);
  }, []);

  // Service Worker messaging
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        const { type, data } = event.data;

        switch (type) {
          case 'INFRASTRUCTURE_STATUS_SYNCED':
            toast({
              title: '✅ Data Synced',
              description: 'Infrastructure status updated',
            });
            break;

          case 'PERFORMANCE_METRICS_SYNCED':
            toast({
              title: '📊 Metrics Updated',
              description: 'Performance data refreshed',
            });
            break;

          case 'WEDDING_DAY_OPS_SYNCED':
            vibrate([200, 100, 200]);
            toast({
              title: '💒 Wedding Day Ready',
              description: 'All protocols synced and ready',
            });
            break;
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, [toast]);

  // Utility functions
  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (deviceInfo.supportsVibration) {
        navigator.vibrate(pattern);
      }
    },
    [deviceInfo.supportsVibration],
  );

  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            ...options,
          });
        }
      }
    },
    [],
  );

  const handleTouchGesture = useCallback(
    (event: TouchEvent, onGesture: (gesture: TouchGesture) => void) => {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return;

      switch (event.type) {
        case 'touchstart':
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
          };
          break;

        case 'touchend':
          if (!touchStartRef.current) return;

          const duration = Date.now() - touchStartRef.current.time;
          const deltaX = touch.clientX - touchStartRef.current.x;
          const deltaY = touch.clientY - touchStartRef.current.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          // Long tap detection
          if (duration > 500 && distance < 10) {
            onGesture({ type: 'longtap', duration });
            vibrate(50); // Haptic feedback
          }
          // Double tap detection
          else if (duration < 300 && distance < 10) {
            const timeSinceLastTap = Date.now() - lastTapRef.current;
            if (timeSinceLastTap < 300) {
              onGesture({ type: 'doubletap' });
              vibrate([30, 30, 30]); // Double tap feedback
            } else {
              onGesture({ type: 'tap' });
              vibrate(30); // Single tap feedback
            }
            lastTapRef.current = Date.now();
          }
          // Swipe detection
          else if (distance > 30) {
            const direction =
              Math.abs(deltaX) > Math.abs(deltaY)
                ? deltaX > 0
                  ? 'right'
                  : 'left'
                : deltaY > 0
                  ? 'down'
                  : 'up';

            onGesture({
              type: 'swipe',
              direction,
              deltaX,
              deltaY,
            });
            vibrate(40); // Swipe feedback
          }

          touchStartRef.current = null;
          break;
      }
    },
    [vibrate],
  );

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        return wakeLock;
      } catch (error) {
        console.error('Wake lock failed:', error);
      }
    }
  }, []);

  const capturePhoto = useCallback(async (): Promise<string | null> => {
    if (!deviceInfo.hasCamera) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      return new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', 0.8);

            stream.getTracks().forEach((track) => track.stop());
            resolve(dataURL);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Photo capture failed:', error);
      return null;
    }
  }, [deviceInfo.hasCamera]);

  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'medium') => {
      const patterns = {
        light: 30,
        medium: 50,
        heavy: 100,
      };

      vibrate(patterns[type]);
    },
    [vibrate],
  );

  const installPWA = useCallback(async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        toast({
          title: '📱 App Installed',
          description:
            'WedSync Infrastructure is now available on your home screen',
        });
      }

      (window as any).deferredPrompt = null;
    }
  }, [toast]);

  return {
    // State
    networkInfo,
    batteryInfo,
    deviceInfo,
    infrastructureData,
    isEmergencyMode,
    weddingDayMode,

    // Actions
    vibrate,
    showNotification,
    handleTouchGesture,
    requestWakeLock,
    capturePhoto,
    triggerHapticFeedback,
    installPWA,

    // Utilities
    isLowBattery: batteryInfo.level < 0.2,
    isSlowConnection:
      networkInfo.effectiveType === '2g' ||
      networkInfo.effectiveType === 'slow-2g',
    isCriticalInfrastructure: infrastructureData.status === 'critical',
    isOfflineMode: !networkInfo.online || infrastructureData.isOffline,

    // Emergency helpers
    activateEmergencyMode: () => {
      setIsEmergencyMode(true);
      vibrate([200, 100, 200, 100, 200]);
    },
    deactivateEmergencyMode: () => {
      setIsEmergencyMode(false);
    },
  };
};
