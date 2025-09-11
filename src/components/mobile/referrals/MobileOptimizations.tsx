'use client';

import React, {
  lazy,
  Suspense,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Loader2, Wifi, WifiOff, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy-loaded components for better performance
const LazyLeaderboard = lazy(() =>
  import('./MobileLeaderboard')
    .then((module) => ({
      default: module.MobileLeaderboard,
    }))
    .catch(() => ({
      default: () => <div>Failed to load leaderboard</div>,
    })),
);

const LazyQRGenerator = lazy(() =>
  import('./MobileQRGenerator')
    .then((module) => ({
      default: module.MobileQRGenerator,
    }))
    .catch(() => ({
      default: () => <div>Failed to load QR generator</div>,
    })),
);

const LazyAnalytics = lazy(() =>
  import('./MobileAnalytics')
    .then((module) => ({
      default: module.MobileAnalytics,
    }))
    .catch(() => ({
      default: () => <div>Failed to load analytics</div>,
    })),
);

// Network information hook
interface NetworkInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

const useNetworkInfo = (): NetworkInfo => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
  });

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
          saveData: connection.saveData || false,
        });
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  return networkInfo;
};

// Performance monitoring hook
const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    fcp: 0,
    lcp: 0,
    cls: 0,
    fid: 0,
  });

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics((prev) => ({ ...prev, fcp: entry.startTime }));
            }
            break;
          case 'largest-contentful-paint':
            setMetrics((prev) => ({ ...prev, lcp: entry.startTime }));
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics((prev) => ({
                ...prev,
                cls: prev.cls + (entry as any).value,
              }));
            }
            break;
          case 'first-input':
            setMetrics((prev) => ({
              ...prev,
              fid: (entry as any).processingStart - entry.startTime,
            }));
            break;
        }
      }
    });

    try {
      observer.observe({
        entryTypes: [
          'paint',
          'largest-contentful-paint',
          'layout-shift',
          'first-input',
        ],
      });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }

    return () => observer.disconnect();
  }, []);

  return metrics;
};

// Image optimization hook
const useImageOptimization = () => {
  const { effectiveType, saveData } = useNetworkInfo();

  const getOptimizedImageUrl = useCallback(
    (baseUrl: string, width: number, height: number): string => {
      if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
        // Return lower quality for slow connections
        return `${baseUrl}?w=${Math.floor(width * 0.5)}&h=${Math.floor(height * 0.5)}&q=60`;
      } else if (effectiveType === '3g') {
        // Medium quality for 3G
        return `${baseUrl}?w=${Math.floor(width * 0.75)}&h=${Math.floor(height * 0.75)}&q=75`;
      } else {
        // Full quality for 4G+
        return `${baseUrl}?w=${width}&h=${height}&q=90`;
      }
    },
    [effectiveType, saveData],
  );

  return { getOptimizedImageUrl };
};

// QR code optimization hook
const useQROptimization = () => {
  const optimizeQRCode = useCallback(
    async (qrCodeUrl: string): Promise<void> => {
      if (!('serviceWorker' in navigator) || !('caches' in window)) return;

      try {
        // Cache QR code for offline access
        const cache = await caches.open('referral-qr-codes-v1');

        // Check if already cached
        const cachedResponse = await cache.match(qrCodeUrl);
        if (!cachedResponse) {
          await cache.add(qrCodeUrl);
          console.log('✅ QR code cached for offline access');
        }
      } catch (error) {
        console.warn('Failed to cache QR code:', error);
      }
    },
    [],
  );

  return { optimizeQRCode };
};

// Touch optimization utilities
const useTouchOptimizations = () => {
  const touchOptimizations = useMemo(
    () => ({
      // Minimum 48px touch targets for accessibility
      touchTarget: 'min-h-[48px] min-w-[48px]',

      // Prevent accidental touches during scrolling
      touchAction: 'touch-action-manipulation',

      // Remove tap highlight for better UX
      tapHighlight: 'tap-highlight-color: transparent',

      // Optimize for thumb zone (bottom 1/3 of screen)
      thumbZone: 'mb-safe-area-inset-bottom pb-4',

      // Venue-optimized sizing (larger for wedding gloves)
      venueOptimized: 'min-h-[56px] min-w-[56px] p-3',

      // High contrast for outdoor lighting
      venueContrast: 'shadow-lg border-2 border-white',
    }),
    [],
  );

  // Haptic feedback wrapper
  const withHaptic = useCallback(
    (
      callback: () => void,
      strength: 'light' | 'medium' | 'heavy' = 'light',
    ) => {
      return () => {
        // Trigger haptic feedback on supported devices
        if ('vibrate' in navigator) {
          const vibrationPatterns = {
            light: 50,
            medium: [50, 10, 50],
            heavy: [100, 30, 100],
          };

          navigator.vibrate(vibrationPatterns[strength]);
        }

        callback();
      };
    },
    [],
  );

  return {
    touchOptimizations,
    withHaptic,
  };
};

// Main mobile optimizations component
export const MobileOptimizations: React.FC = () => {
  const { effectiveType, saveData, downlink } = useNetworkInfo();
  const performanceMetrics = usePerformanceMonitoring();
  const { getOptimizedImageUrl } = useImageOptimization();
  const { optimizeQRCode } = useQROptimization();
  const { touchOptimizations, withHaptic } = useTouchOptimizations();

  // Determine if we should load images based on connection
  const shouldLoadImages = useMemo(() => {
    return !saveData && effectiveType !== 'slow-2g';
  }, [saveData, effectiveType]);

  // Network status indicator
  const NetworkStatus = () => {
    const getNetworkIcon = () => {
      if (!navigator.onLine) return WifiOff;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') return Signal;
      return Wifi;
    };

    const NetworkIcon = getNetworkIcon();
    const networkColor = navigator.onLine
      ? effectiveType === 'slow-2g' || effectiveType === '2g'
        ? 'text-yellow-500'
        : 'text-green-500'
      : 'text-red-500';

    return (
      <div className={cn('flex items-center gap-2 text-sm', networkColor)}>
        <NetworkIcon className="w-4 h-4" />
        <span className="capitalize">
          {navigator.onLine ? effectiveType : 'Offline'}
        </span>
        {downlink && (
          <span className="text-xs opacity-75">{downlink.toFixed(1)} Mbps</span>
        )}
      </div>
    );
  };

  // Performance indicator
  const PerformanceIndicator = () => {
    const getPerformanceScore = () => {
      // Simple scoring based on Core Web Vitals
      const fcpScore =
        performanceMetrics.fcp < 1800
          ? 100
          : Math.max(0, 100 - (performanceMetrics.fcp - 1800) / 10);
      const lcpScore =
        performanceMetrics.lcp < 2500
          ? 100
          : Math.max(0, 100 - (performanceMetrics.lcp - 2500) / 10);
      const clsScore =
        performanceMetrics.cls < 0.1
          ? 100
          : Math.max(0, 100 - performanceMetrics.cls * 1000);

      return Math.round((fcpScore + lcpScore + clsScore) / 3);
    };

    const score = getPerformanceScore();
    const scoreColor =
      score >= 90
        ? 'text-green-500'
        : score >= 50
          ? 'text-yellow-500'
          : 'text-red-500';

    return (
      <div className={cn('text-xs', scoreColor)}>Performance: {score}/100</div>
    );
  };

  // Optimized loading spinner
  const OptimizedSpinner = ({
    size = 'default',
  }: {
    size?: 'small' | 'default' | 'large';
  }) => {
    const sizeClasses = {
      small: 'w-4 h-4',
      default: 'w-6 h-6',
      large: 'w-8 h-8',
    };

    return (
      <div className="flex items-center justify-center p-4">
        <Loader2
          className={cn('animate-spin text-blue-600', sizeClasses[size])}
        />
        <span className="ml-2 text-sm text-gray-600">
          {saveData ? 'Loading (lite mode)...' : 'Loading...'}
        </span>
      </div>
    );
  };

  return (
    <div className="mobile-optimizations space-y-4">
      {/* Network and Performance Status */}
      <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
        <NetworkStatus />
        <PerformanceIndicator />
      </div>

      {/* Data Saver Mode Notice */}
      {saveData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            📊 Data saver mode is on. Some features may be limited to save
            bandwidth.
          </p>
        </div>
      )}

      {/* Optimized Components with Lazy Loading */}
      <div className="space-y-6">
        {/* QR Generator - Always available offline */}
        <Suspense fallback={<OptimizedSpinner />}>
          <LazyQRGenerator
            shouldOptimize={effectiveType === 'slow-2g' || saveData}
            onGenerated={optimizeQRCode}
            touchOptimizations={touchOptimizations}
          />
        </Suspense>

        {/* Leaderboard - Only on good connections */}
        {!saveData && effectiveType !== 'slow-2g' && (
          <Suspense fallback={<OptimizedSpinner />}>
            <LazyLeaderboard
              loadImages={shouldLoadImages}
              getOptimizedImageUrl={getOptimizedImageUrl}
              touchOptimizations={touchOptimizations}
            />
          </Suspense>
        )}

        {/* Analytics - Only on fast connections */}
        {!saveData && (effectiveType === '4g' || downlink > 5) && (
          <Suspense fallback={<OptimizedSpinner />}>
            <LazyAnalytics
              realTime={downlink > 10}
              touchOptimizations={touchOptimizations}
            />
          </Suspense>
        )}
      </div>

      {/* Touch Optimization Demo */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-blue-900">Touch-Optimized Controls</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={cn(
              'bg-blue-600 text-white rounded-lg font-medium transition-transform active:scale-95',
              touchOptimizations.touchTarget,
              touchOptimizations.venueOptimized,
              touchOptimizations.venueContrast,
            )}
            style={{ touchAction: 'manipulation' }}
            onClick={withHaptic(() => console.log('Standard touch'), 'light')}
          >
            Standard
          </button>
          <button
            className={cn(
              'bg-green-600 text-white rounded-lg font-medium transition-transform active:scale-95',
              touchOptimizations.touchTarget,
              touchOptimizations.venueOptimized,
              touchOptimizations.venueContrast,
            )}
            style={{ touchAction: 'manipulation' }}
            onClick={withHaptic(() => console.log('Venue optimized'), 'heavy')}
          >
            Venue Size
          </button>
        </div>
        <p className="text-xs text-blue-700">
          ✨ Optimized for wedding venues: Large targets, haptic feedback, high
          contrast
        </p>
      </div>

      {/* Performance Tips */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Performance Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • Images are automatically optimized for your connection speed
          </li>
          <li>• QR codes are cached for offline use at venues</li>
          <li>• Touch targets are sized for wedding glove compatibility</li>
          <li>• Haptic feedback helps in noisy wedding environments</li>
          {saveData && <li>• Data saver mode is reducing bandwidth usage</li>}
        </ul>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-100 rounded-lg p-3">
          <summary className="cursor-pointer font-medium text-sm">
            Debug Info
          </summary>
          <pre className="text-xs mt-2 overflow-auto">
            {JSON.stringify(
              {
                network: { effectiveType, downlink, saveData },
                performance: performanceMetrics,
                online: navigator.onLine,
                viewport: {
                  width: window.innerWidth,
                  height: window.innerHeight,
                },
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </div>
  );
};

// Export hooks for use in other components
export {
  useNetworkInfo,
  usePerformanceMonitoring,
  useImageOptimization,
  useQROptimization,
  useTouchOptimizations,
};

export default MobileOptimizations;
