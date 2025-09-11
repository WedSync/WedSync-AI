/**
 * WS-166 Progressive Export Loader Component
 * Team D - Round 1 Implementation
 *
 * Mobile-optimized progressive loading with smooth animations and performance monitoring
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// useAnimation // useAnimation removed - use motion controls
import {
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Pause,
  Play,
  RotateCcw,
  Clock,
  HardDrive,
  Cpu,
  Wifi,
  Battery,
} from 'lucide-react';

import { PerformanceMetrics } from '@/lib/performance/budget-export/export-optimizer';
import { ExportStatus } from '@/lib/performance/budget-export/mobile-export-queue';

interface ProgressiveExportLoaderProps {
  exportId: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onComplete?: (result: ExportResult) => void;
  className?: string;
}

interface ExportPhase {
  id: string;
  name: string;
  description: string;
  duration: number;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon: React.ElementType;
  estimatedSize?: number;
}

interface ExportResult {
  exportId: string;
  downloadUrl: string;
  fileSize: number;
  format: string;
  completedAt: Date;
  metrics: PerformanceMetrics;
}

interface LoadingState {
  phase: ExportPhase;
  overallProgress: number;
  estimatedTimeRemaining: number;
  canCancel: boolean;
  canPause: boolean;
  isPaused: boolean;
  error?: string;
  metrics?: Partial<PerformanceMetrics>;
}

interface DevicePerformance {
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number;
  networkSpeed: number;
  thermalState: 'normal' | 'fair' | 'serious' | 'critical';
}

const EXPORT_PHASES: ExportPhase[] = [
  {
    id: 'initialization',
    name: 'Initializing',
    description: 'Setting up export parameters',
    duration: 2,
    progress: 0,
    status: 'pending',
    icon: FileText,
  },
  {
    id: 'data_collection',
    name: 'Collecting Data',
    description: 'Gathering budget information',
    duration: 8,
    progress: 0,
    status: 'pending',
    icon: Download,
    estimatedSize: 1024 * 50, // 50KB estimate
  },
  {
    id: 'processing',
    name: 'Processing',
    description: 'Formatting and organizing data',
    duration: 15,
    progress: 0,
    status: 'pending',
    icon: Cpu,
  },
  {
    id: 'generation',
    name: 'Generating File',
    description: 'Creating export file',
    duration: 10,
    progress: 0,
    status: 'pending',
    icon: HardDrive,
  },
  {
    id: 'finalization',
    name: 'Finalizing',
    description: 'Preparing download',
    duration: 3,
    progress: 0,
    status: 'pending',
    icon: CheckCircle2,
  },
];

export const ProgressiveExportLoader: React.FC<
  ProgressiveExportLoaderProps
> = ({ exportId, onCancel, onRetry, onComplete, className = '' }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: EXPORT_PHASES[0],
    overallProgress: 0,
    estimatedTimeRemaining: 38, // Sum of all phase durations
    canCancel: true,
    canPause: false,
    isPaused: false,
  });

  const [phases, setPhases] = useState<ExportPhase[]>(EXPORT_PHASES);
  const [devicePerformance, setDevicePerformance] = useState<DevicePerformance>(
    {
      cpuUsage: 0,
      memoryUsage: 0,
      batteryLevel: 100,
      networkSpeed: 0,
      thermalState: 'normal',
    },
  );

  const [showMetrics, setShowMetrics] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // Animation controls
  const progressAnimation = useAnimation();
  const pulseAnimation = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance monitoring
  const performanceInterval = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize performance monitoring
  useEffect(() => {
    const startPerformanceMonitoring = () => {
      performanceInterval.current = setInterval(async () => {
        try {
          // Monitor device performance
          const memoryInfo = (performance as any).memory;
          const battery = await (navigator as any).getBattery?.();
          const connection = (navigator as any).connection;

          setDevicePerformance((prev) => ({
            ...prev,
            cpuUsage: Math.random() * 30 + 10, // Simulated CPU usage
            memoryUsage: memoryInfo?.usedJSHeapSize || 0,
            batteryLevel: battery?.level * 100 || 100,
            networkSpeed: connection?.downlink || 0,
            thermalState: prev.cpuUsage > 80 ? 'serious' : 'normal',
          }));

          // Check for thermal throttling
          if (devicePerformance.thermalState === 'serious') {
            // Slow down progress simulation for thermal management
            clearInterval(progressInterval.current!);
            progressInterval.current = setInterval(updateProgress, 2000); // Slower updates
          }
        } catch (error) {
          console.error('Error monitoring device performance:', error);
        }
      }, 1000);
    };

    startPerformanceMonitoring();

    return () => {
      if (performanceInterval.current) {
        clearInterval(performanceInterval.current);
      }
    };
  }, []);

  // Simulate export progress
  useEffect(() => {
    if (!loadingState.isPaused && !isCompleted) {
      const updateProgress = () => {
        setPhases((currentPhases) => {
          const newPhases = [...currentPhases];
          const activePhaseIndex = newPhases.findIndex(
            (phase) => phase.status === 'active',
          );

          if (activePhaseIndex === -1) {
            // Start first phase
            newPhases[0].status = 'active';
            return newPhases;
          }

          const activePhase = newPhases[activePhaseIndex];

          // Increment progress based on device performance
          const progressIncrement =
            devicePerformance.thermalState === 'serious' ? 1 : 2;
          activePhase.progress = Math.min(
            100,
            activePhase.progress + progressIncrement,
          );

          if (activePhase.progress >= 100) {
            // Complete current phase
            activePhase.status = 'completed';
            activePhase.progress = 100;

            // Start next phase or complete
            if (activePhaseIndex < newPhases.length - 1) {
              newPhases[activePhaseIndex + 1].status = 'active';
            } else {
              // All phases completed
              handleExportComplete();
            }
          }

          // Update overall progress and time remaining
          const completedProgress = newPhases.reduce((total, phase, index) => {
            if (index < activePhaseIndex) return total + phase.duration;
            if (index === activePhaseIndex)
              return total + (phase.progress / 100) * phase.duration;
            return total;
          }, 0);

          const totalDuration = newPhases.reduce(
            (total, phase) => total + phase.duration,
            0,
          );
          const overallProgress = (completedProgress / totalDuration) * 100;
          const remainingTime = totalDuration - completedProgress;

          setLoadingState((prev) => ({
            ...prev,
            phase: activePhase,
            overallProgress,
            estimatedTimeRemaining: Math.max(0, remainingTime),
            canPause:
              activePhase.id === 'processing' ||
              activePhase.id === 'generation',
          }));

          return newPhases;
        });
      };

      progressInterval.current = setInterval(updateProgress, 1000);

      return () => {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [loadingState.isPaused, isCompleted, devicePerformance.thermalState]);

  // Handle export completion
  const handleExportComplete = useCallback(() => {
    setIsCompleted(true);

    const result: ExportResult = {
      exportId,
      downloadUrl: `/api/budget/export/${exportId}/download`,
      fileSize: 1024 * 150, // 150KB example
      format: 'csv',
      completedAt: new Date(),
      metrics: {
        renderTime: 200,
        exportGenerationTime: 38000,
        fileDownloadTime: 500,
        memoryUsage: devicePerformance.memoryUsage,
        batteryImpact: 2,
        networkUsage: 1024 * 150,
        chunksProcessed: 5,
        errorRate: 0,
      },
    };

    setExportResult(result);

    // Trigger completion animation
    progressAnimation.start({
      scale: [1, 1.1, 1],
      transition: { duration: 0.6 },
    });

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    setTimeout(() => {
      onComplete?.(result);
    }, 1000);
  }, [exportId, devicePerformance.memoryUsage, progressAnimation, onComplete]);

  // Handle pause/resume
  const handlePauseResume = useCallback(() => {
    setLoadingState((prev) => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    if (performanceInterval.current) {
      clearInterval(performanceInterval.current);
    }

    onCancel?.();

    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  }, [onCancel]);

  // Render phase indicator
  const renderPhaseIndicator = (phase: ExportPhase, index: number) => (
    <motion.div
      key={phase.id}
      className="flex items-center space-x-3 py-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: phase.status === 'pending' ? 0.5 : 1,
        x: 0,
        scale: phase.status === 'active' ? 1.02 : 1,
      }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          phase.status === 'completed'
            ? 'bg-green-100 text-green-600'
            : phase.status === 'active'
              ? 'bg-blue-100 text-blue-600'
              : phase.status === 'error'
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-400'
        }`}
      >
        {phase.status === 'completed' ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : phase.status === 'active' ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <phase.icon className="w-4 h-4" />
          </motion.div>
        ) : phase.status === 'error' ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <phase.icon className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4
            className={`text-sm font-medium ${
              phase.status === 'pending' ? 'text-gray-500' : 'text-gray-900'
            }`}
          >
            {phase.name}
          </h4>
          {phase.status === 'active' && (
            <span className="text-xs text-gray-600">
              {Math.round(phase.progress)}%
            </span>
          )}
        </div>
        <p
          className={`text-xs mt-1 ${
            phase.status === 'pending' ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {phase.description}
        </p>

        {/* Phase progress bar */}
        {phase.status === 'active' && (
          <motion.div
            className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${phase.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  // Render device performance indicators
  const renderPerformanceMetrics = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{
        opacity: showMetrics ? 1 : 0,
        height: showMetrics ? 'auto' : 0,
      }}
      className="border-t border-gray-200 pt-4 mt-4 space-y-3 overflow-hidden"
    >
      {/* CPU Usage */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Cpu className="w-3 h-3 text-gray-600" />
          <span className="text-gray-600">CPU Usage</span>
        </div>
        <span
          className={`font-medium ${
            devicePerformance.cpuUsage > 70
              ? 'text-red-600'
              : devicePerformance.cpuUsage > 50
                ? 'text-yellow-600'
                : 'text-green-600'
          }`}
        >
          {Math.round(devicePerformance.cpuUsage)}%
        </span>
      </div>

      {/* Memory Usage */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-3 h-3 text-gray-600" />
          <span className="text-gray-600">Memory</span>
        </div>
        <span className="font-medium text-gray-900">
          {Math.round(devicePerformance.memoryUsage / 1024 / 1024)}MB
        </span>
      </div>

      {/* Battery Level */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Battery className="w-3 h-3 text-gray-600" />
          <span className="text-gray-600">Battery</span>
        </div>
        <span
          className={`font-medium ${
            devicePerformance.batteryLevel < 20
              ? 'text-red-600'
              : 'text-gray-900'
          }`}
        >
          {Math.round(devicePerformance.batteryLevel)}%
        </span>
      </div>

      {/* Network Speed */}
      {devicePerformance.networkSpeed > 0 && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Wifi className="w-3 h-3 text-gray-600" />
            <span className="text-gray-600">Network</span>
          </div>
          <span className="font-medium text-gray-900">
            {devicePerformance.networkSpeed} Mbps
          </span>
        </div>
      )}

      {/* Thermal State Warning */}
      {devicePerformance.thermalState !== 'normal' && (
        <div className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-xs text-yellow-800">
            Device is warming up - export may be slower to preserve battery
          </span>
        </div>
      )}
    </motion.div>
  );

  if (isCompleted && exportResult) {
    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-white rounded-xl shadow-lg p-6 max-w-sm mx-auto ${className}`}
      >
        <div className="text-center">
          <motion.div
            animate={progressAnimation}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </motion.div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Export Complete!
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            Your budget data has been exported successfully.
          </p>

          <div className="space-y-2 text-xs text-gray-600 mb-6">
            <div className="flex justify-between">
              <span>File Size:</span>
              <span>{Math.round(exportResult.fileSize / 1024)}KB</span>
            </div>
            <div className="flex justify-between">
              <span>Export Time:</span>
              <span>
                {Math.round(exportResult.metrics.exportGenerationTime / 1000)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span>Memory Used:</span>
              <span>
                {Math.round(exportResult.metrics.memoryUsage / 1024 / 1024)}MB
              </span>
            </div>
          </div>

          <motion.a
            href={exportResult.downloadUrl}
            download
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 px-4 font-medium inline-block transition-colors"
          >
            Download File
          </motion.a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg p-6 max-w-sm mx-auto ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Exporting Budget
        </h3>
        <div className="flex items-center space-x-2">
          {loadingState.canPause && (
            <button
              onClick={handlePauseResume}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={
                loadingState.isPaused ? 'Resume export' : 'Pause export'
              }
            >
              {loadingState.isPaused ? (
                <Play className="w-4 h-4 text-gray-600" />
              ) : (
                <Pause className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {loadingState.canCancel && (
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Cancel export"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-900">
            Overall Progress
          </span>
          <span className="text-sm text-gray-600">
            {Math.round(loadingState.overallProgress)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div
            className="bg-blue-600 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${loadingState.overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
          <span>
            {loadingState.isPaused ? 'Paused' : loadingState.phase.name}
          </span>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>
              {Math.round(loadingState.estimatedTimeRemaining)}s remaining
            </span>
          </div>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="space-y-1 mb-4">{phases.map(renderPhaseIndicator)}</div>

      {/* Performance Metrics Toggle */}
      <button
        onClick={() => setShowMetrics(!showMetrics)}
        className="w-full text-xs text-gray-600 hover:text-gray-800 transition-colors mb-2"
      >
        {showMetrics ? 'Hide' : 'Show'} Performance Details
      </button>

      {renderPerformanceMetrics()}

      {/* Error state */}
      {loadingState.error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              Export Failed
            </span>
          </div>
          <p className="text-xs text-red-700 mb-3">{loadingState.error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry Export</span>
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
