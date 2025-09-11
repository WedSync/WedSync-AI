'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useBatteryOptimization,
  usePerformanceMonitoring,
} from '@/hooks/useBatteryOptimization';
import {
  Battery,
  BatteryLow,
  Zap,
  Settings,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
} from 'lucide-react';

interface MobilePerformanceOptimizerProps {
  children: React.ReactNode;
  className?: string;
}

export const MobilePerformanceOptimizer: React.FC<
  MobilePerformanceOptimizerProps
> = ({ children, className = '' }) => {
  const {
    batteryInfo,
    settings,
    isLowPower,
    batteryLevel,
    enableBatterySaver,
    disableBatterySaver,
    updateSettings,
    optimizeForBattery,
    shouldReduceAnimations,
    getBackgroundSyncInterval,
  } = useBatteryOptimization();

  const {
    metrics,
    measureRenderTime,
    measureMemoryUsage,
    measureNetworkLatency,
  } = usePerformanceMonitoring();

  const [showSettings, setShowSettings] = useState(false);
  const [performanceAlerts, setPerformanceAlerts] = useState<string[]>([]);

  // Monitor performance and generate alerts
  useEffect(() => {
    const alerts: string[] = [];

    if (metrics.renderTime > 32) {
      alerts.push(
        'Slow rendering detected - consider enabling performance mode',
      );
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 80) {
      alerts.push('High memory usage - battery saver recommended');
    }

    if (batteryLevel && batteryLevel < 20 && !optimizeForBattery) {
      alerts.push('Low battery - enable power saving mode');
    }

    if (metrics.networkLatency && metrics.networkLatency > 2000) {
      alerts.push('Slow network detected - reducing sync frequency');
    }

    setPerformanceAlerts(alerts);
  }, [metrics, batteryLevel, optimizeForBattery]);

  // Auto-optimize based on device capabilities
  useEffect(() => {
    const connection = (navigator as any).connection;
    if (
      connection &&
      connection.effectiveType === '2g' &&
      !settings.networkOptimization
    ) {
      updateSettings({
        networkOptimization: true,
        imageQuality: 'low',
        backgroundSyncInterval: 120000, // 2 minutes
      });
    }
  }, [settings.networkOptimization, updateSettings]);

  // Apply performance optimizations
  const optimizedStyles = useMemo(() => {
    const baseStyles: React.CSSProperties = {};

    if (shouldReduceAnimations()) {
      baseStyles.animationDuration = '0ms';
      baseStyles.transitionDuration = '0ms';
    }

    if (optimizeForBattery) {
      baseStyles.willChange = 'auto'; // Reduce GPU usage
      baseStyles.transform = 'translateZ(0)'; // Force hardware acceleration only when needed
    }

    return baseStyles;
  }, [shouldReduceAnimations, optimizeForBattery]);

  const handleToggleBatterySaver = useCallback(() => {
    if (optimizeForBattery) {
      disableBatterySaver();
    } else {
      enableBatterySaver();
    }
  }, [optimizeForBattery, enableBatterySaver, disableBatterySaver]);

  return (
    <div
      className={`mobile-performance-optimizer ${className}`}
      style={optimizedStyles}
    >
      {/* Performance Status Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          optimizeForBattery
            ? 'bg-gray-900 text-white'
            : 'bg-white border-b border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 text-sm">
          <div className="flex items-center gap-3">
            {/* Battery indicator */}
            <div
              className={`flex items-center gap-1 ${
                isLowPower
                  ? 'text-red-500'
                  : batteryLevel && batteryLevel < 50
                    ? 'text-yellow-500'
                    : 'text-green-500'
              }`}
            >
              {isLowPower ? (
                <BatteryLow className="w-4 h-4" />
              ) : (
                <Battery className="w-4 h-4" />
              )}
              <span className="font-medium">{batteryLevel || '--'}%</span>
            </div>

            {/* Performance mode indicator */}
            {optimizeForBattery && (
              <div className="flex items-center gap-1 text-blue-400">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">Power Saving</span>
              </div>
            )}

            {/* Memory usage */}
            {metrics.memoryUsage && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  metrics.memoryUsage > 80 ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                <span>{metrics.memoryUsage}%</span>
              </div>
            )}
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Performance alerts */}
        <AnimatePresence>
          {performanceAlerts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 dark:border-gray-700"
            >
              <div className="px-4 py-2 space-y-1">
                {performanceAlerts.slice(0, 2).map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-4 right-4 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          >
            <div className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Performance Settings
              </h3>

              <div className="space-y-4">
                {/* Battery saver toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium">Battery Saver Mode</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Reduces animations and background activity
                    </p>
                  </div>
                  <button
                    onClick={handleToggleBatterySaver}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      optimizeForBattery
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        optimizeForBattery ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Image quality setting */}
                <div>
                  <label className="font-medium block mb-2">
                    Image Quality
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as const).map((quality) => (
                      <button
                        key={quality}
                        onClick={() =>
                          updateSettings({ imageQuality: quality })
                        }
                        className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
                          settings.imageQuality === quality
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sync interval setting */}
                <div>
                  <label className="font-medium block mb-2">
                    Background Sync Interval
                  </label>
                  <select
                    value={settings.backgroundSyncInterval}
                    onChange={(e) =>
                      updateSettings({
                        backgroundSyncInterval: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  >
                    <option value={15000}>15 seconds</option>
                    <option value={30000}>30 seconds</option>
                    <option value={60000}>1 minute</option>
                    <option value={120000}>2 minutes</option>
                    <option value={300000}>5 minutes</option>
                  </select>
                </div>

                {/* Performance metrics */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Render Time:</span>
                      <span
                        className={`font-medium ${
                          metrics.renderTime > 16
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {metrics.renderTime.toFixed(1)}ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Memory:</span>
                      <span
                        className={`font-medium ${
                          metrics.memoryUsage && metrics.memoryUsage > 80
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {metrics.memoryUsage
                          ? `${metrics.memoryUsage}%`
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Network:</span>
                      <span
                        className={`font-medium ${
                          metrics.networkLatency &&
                          metrics.networkLatency > 1000
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {metrics.networkLatency
                          ? `${metrics.networkLatency.toFixed(0)}ms`
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Battery:</span>
                      <span
                        className={`font-medium ${
                          batteryInfo?.charging
                            ? 'text-green-500'
                            : isLowPower
                              ? 'text-red-500'
                              : 'text-gray-500'
                        }`}
                      >
                        {batteryInfo?.charging
                          ? 'Charging'
                          : isLowPower
                            ? 'Low'
                            : 'OK'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-4 py-2 bg-gray-100 dark:bg-gray-800 rounded font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content with performance optimizations */}
      <div
        className={`pt-16 ${optimizeForBattery ? 'performance-optimized' : ''}`}
        style={{
          ...(shouldReduceAnimations() &&
            ({
              '--animation-duration': '0s',
              '--transition-duration': '0s',
            } as React.CSSProperties)),
        }}
      >
        {children}
      </div>

      {/* Global performance optimization styles */}
      <style jsx global>{`
        .performance-optimized * {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }

        .performance-optimized img {
          image-rendering: ${optimizeForBattery ? 'pixelated' : 'auto'};
        }

        .performance-optimized video {
          ${optimizeForBattery ? 'filter: contrast(0.8) brightness(0.9);' : ''}
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};
