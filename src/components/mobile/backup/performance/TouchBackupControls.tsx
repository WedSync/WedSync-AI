'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, useSpring, useMotionValue, PanInfo } from 'motion';
import { useBackupPerformanceMonitoring } from '@/hooks/useBackupPerformanceMonitoring';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

// WS-258 Touch-Optimized Backup Controls with Haptic Feedback
// Wedding industry emergency scenarios with professional mobile UX

interface BackupOperation {
  id: string;
  type:
    | 'client-data'
    | 'photo-metadata'
    | 'schedule'
    | 'contracts'
    | 'payment-info'
    | 'full-backup';
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  size: string;
  lastBackup: Date | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  weddingDate?: Date;
  clientName?: string;
}

interface TouchBackupControlsProps {
  operations: BackupOperation[];
  onBackupStart: (operationId: string) => Promise<void>;
  onBackupCancel: (operationId: string) => Promise<void>;
  onEmergencyRestore: (operationId: string) => Promise<void>;
  isEmergencyMode?: boolean;
  isWeddingDay?: boolean;
  networkQuality: 'poor' | 'good' | 'excellent';
  className?: string;
}

// Haptic feedback patterns for different wedding scenarios
const HAPTIC_PATTERNS = {
  touch_start: [10], // Light tap feedback
  backup_start: [50, 30, 50], // Success pattern
  backup_complete: [100, 50, 100, 50, 100], // Strong success
  emergency_mode: [200, 100, 200, 100, 200], // Critical alert
  error: [300, 100, 300], // Error pattern
  drag_snap: [20], // Subtle snap feedback
  long_press: [80, 20, 80], // Long press confirmation
};

// Wedding industry backup priorities
const BACKUP_PRIORITIES = {
  critical: {
    color: '#ef4444', // Red for critical wedding data
    urgency: 'URGENT - Wedding Day Essential',
    icon: '🚨',
    vibrationPattern: HAPTIC_PATTERNS.emergency_mode,
  },
  high: {
    color: '#f59e0b', // Amber for high priority
    urgency: 'High Priority',
    icon: '⚠️',
    vibrationPattern: HAPTIC_PATTERNS.backup_start,
  },
  medium: {
    color: '#3b82f6', // Blue for standard
    urgency: 'Standard Priority',
    icon: 'ℹ️',
    vibrationPattern: HAPTIC_PATTERNS.touch_start,
  },
  low: {
    color: '#6b7280', // Gray for low priority
    urgency: 'Background',
    icon: '📋',
    vibrationPattern: HAPTIC_PATTERNS.touch_start,
  },
};

// Touch target dimensions (minimum 48x48px for accessibility)
const TOUCH_TARGET_SIZE = 48;
const DRAG_THRESHOLD = 100; // pixels to trigger action
const LONG_PRESS_DURATION = 800; // ms for emergency actions

export default function TouchBackupControls({
  operations,
  onBackupStart,
  onBackupCancel,
  onEmergencyRestore,
  isEmergencyMode = false,
  isWeddingDay = false,
  networkQuality = 'good',
  className = '',
}: TouchBackupControlsProps) {
  const [selectedOperation, setSelectedOperation] = useState<string | null>(
    null,
  );
  const [draggedOperation, setDraggedOperation] = useState<string | null>(null);
  const [longPressTimeout, setLongPressTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false);

  const { measurePerformance, getAverageDuration } =
    useBackupPerformanceMonitoring('TouchBackupControls');
  const performanceMonitor = usePerformanceMonitor('TouchBackupControls');

  // Motion values for smooth animations
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const scale = useSpring(1, { stiffness: 300, damping: 30 });

  // Haptic feedback function
  const triggerHaptic = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback not supported:', error);
      }
    }
  }, []);

  // Wedding-specific backup urgency calculation
  const getBackupUrgency = useCallback(
    (operation: BackupOperation): 'critical' | 'high' | 'medium' | 'low' => {
      if (isEmergencyMode) return 'critical';
      if (isWeddingDay && ['client-data', 'schedule'].includes(operation.type))
        return 'critical';
      if (
        operation.weddingDate &&
        operation.weddingDate <= new Date(Date.now() + 86400000)
      )
        return 'high'; // Within 24 hours
      return operation.priority;
    },
    [isEmergencyMode, isWeddingDay],
  );

  // Touch handlers with performance monitoring
  const handleTouchStart = useCallback(
    (operationId: string) => {
      const startTime = performance.now();

      setSelectedOperation(operationId);
      scale.set(0.95); // Visual feedback for touch
      triggerHaptic(HAPTIC_PATTERNS.touch_start);

      // Long press detection for emergency actions
      const timeout = setTimeout(() => {
        setShowEmergencyOptions(true);
        triggerHaptic(HAPTIC_PATTERNS.long_press);
      }, LONG_PRESS_DURATION);

      setLongPressTimeout(timeout);

      const touchTime = performance.now() - startTime;
      performanceMonitor.measurePerformance('touch-start', touchTime);
    },
    [scale, triggerHaptic, performanceMonitor],
  );

  const handleTouchEnd = useCallback(() => {
    scale.set(1);
    setSelectedOperation(null);

    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
  }, [scale, longPressTimeout]);

  // Drag gesture handlers with snap-to-action zones
  const handleDragStart = useCallback(
    (operationId: string) => {
      const startTime = performance.now();

      setDraggedOperation(operationId);
      triggerHaptic(HAPTIC_PATTERNS.touch_start);

      if (longPressTimeout) {
        clearTimeout(longPressTimeout);
        setLongPressTimeout(null);
      }

      const dragStartTime = performance.now() - startTime;
      performanceMonitor.measurePerformance('drag-start', dragStartTime);
    },
    [triggerHaptic, longPressTimeout, performanceMonitor],
  );

  const handleDrag = useCallback(
    (info: PanInfo) => {
      const { offset } = info;

      // Visual feedback for drag distance
      if (Math.abs(offset.x) > DRAG_THRESHOLD) {
        scale.set(0.9);
      } else {
        scale.set(1);
      }
    },
    [scale],
  );

  const handleDragEnd = useCallback(
    async (info: PanInfo, operationId: string) => {
      const startTime = performance.now();
      const { offset } = info;

      setDraggedOperation(null);
      scale.set(1);
      dragX.set(0);
      dragY.set(0);

      try {
        // Right swipe: Start backup
        if (offset.x > DRAG_THRESHOLD) {
          triggerHaptic(HAPTIC_PATTERNS.backup_start);
          await onBackupStart(operationId);
        }
        // Left swipe: Emergency restore (if in emergency mode)
        else if (offset.x < -DRAG_THRESHOLD && isEmergencyMode) {
          triggerHaptic(HAPTIC_PATTERNS.emergency_mode);
          await onEmergencyRestore(operationId);
        }
        // Down swipe: Cancel operation
        else if (offset.y > DRAG_THRESHOLD) {
          triggerHaptic(HAPTIC_PATTERNS.error);
          await onBackupCancel(operationId);
        } else {
          // Snap back if threshold not met
          triggerHaptic(HAPTIC_PATTERNS.drag_snap);
        }
      } catch (error) {
        console.error('Backup operation failed:', error);
        triggerHaptic(HAPTIC_PATTERNS.error);
      }

      const dragEndTime = performance.now() - startTime;
      performanceMonitor.measurePerformance('drag-end', dragEndTime);
    },
    [
      scale,
      dragX,
      dragY,
      triggerHaptic,
      onBackupStart,
      onEmergencyRestore,
      onBackupCancel,
      isEmergencyMode,
      performanceMonitor,
    ],
  );

  // Network-aware operation filtering
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      if (networkQuality === 'poor' && op.type === 'full-backup') return false;
      if (isEmergencyMode && op.priority === 'low') return false;
      return true;
    });
  }, [operations, networkQuality, isEmergencyMode]);

  // Wedding day priority sorting
  const sortedOperations = useMemo(() => {
    return [...filteredOperations].sort((a, b) => {
      const urgencyA = getBackupUrgency(a);
      const urgencyB = getBackupUrgency(b);
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[urgencyB] - priorityOrder[urgencyA];
    });
  }, [filteredOperations, getBackupUrgency]);

  return (
    <div className={`touch-backup-controls ${className}`}>
      {/* Emergency mode banner */}
      {isEmergencyMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600 text-white p-4 rounded-lg mb-4 text-center font-semibold"
        >
          🚨 EMERGENCY MODE ACTIVE
          <p className="text-sm mt-1">Swipe left for emergency restore</p>
        </motion.div>
      )}

      {/* Wedding day status */}
      {isWeddingDay && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-lg mb-4 text-center"
        >
          💒 WEDDING DAY MODE
          <p className="text-sm mt-1">Critical backups prioritized</p>
        </motion.div>
      )}

      {/* Network quality indicator */}
      <div
        className={`network-indicator mb-4 p-2 rounded-lg text-center text-sm font-medium ${
          networkQuality === 'poor'
            ? 'bg-red-100 text-red-800'
            : networkQuality === 'good'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
        }`}
      >
        📡 Network: {networkQuality.toUpperCase()}
        {networkQuality === 'poor' && ' - Large backups disabled'}
      </div>

      {/* Touch backup operations */}
      <div className="backup-operations-list space-y-3">
        {sortedOperations.map((operation) => {
          const urgency = getBackupUrgency(operation);
          const priorityConfig = BACKUP_PRIORITIES[urgency];

          return (
            <motion.div
              key={operation.id}
              drag={!showEmergencyOptions}
              dragConstraints={{
                left: -200,
                right: 200,
                top: -50,
                bottom: 100,
              }}
              dragElastic={0.2}
              whileTap={{ scale: 0.95 }}
              onTouchStart={() => handleTouchStart(operation.id)}
              onTouchEnd={handleTouchEnd}
              onDragStart={() => handleDragStart(operation.id)}
              onDrag={(_, info) => handleDrag(info)}
              onDragEnd={(_, info) => handleDragEnd(info, operation.id)}
              style={{
                x: draggedOperation === operation.id ? dragX : 0,
                y: draggedOperation === operation.id ? dragY : 0,
                scale: selectedOperation === operation.id ? 0.95 : 1,
              }}
              className={`
                backup-operation-card
                bg-white dark:bg-gray-800 
                rounded-2xl p-4 shadow-lg
                border-l-4 cursor-pointer
                min-h-[${TOUCH_TARGET_SIZE}px]
                touch-manipulation
                select-none
                ${selectedOperation === operation.id ? 'ring-2 ring-blue-500' : ''}
              `}
              style={{
                borderLeftColor: priorityConfig.color,
                minHeight: TOUCH_TARGET_SIZE,
              }}
            >
              {/* Operation header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{priorityConfig.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {operation.type.replace('-', ' ').toUpperCase()}
                    </h3>
                    {operation.clientName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {operation.clientName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-xs font-medium"
                    style={{ color: priorityConfig.color }}
                  >
                    {priorityConfig.urgency}
                  </p>
                  <p className="text-xs text-gray-500">{operation.size}</p>
                </div>
              </div>

              {/* Progress bar (if operation is processing) */}
              {operation.status === 'processing' && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Backing up...</span>
                    <span>{Math.round(operation.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${operation.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Status indicators */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      operation.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : operation.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : operation.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {operation.status.toUpperCase()}
                  </span>
                  {operation.weddingDate && (
                    <span>
                      Wedding: {operation.weddingDate.toLocaleDateString()}
                    </span>
                  )}
                </div>
                {operation.lastBackup && (
                  <span>Last: {operation.lastBackup.toLocaleTimeString()}</span>
                )}
              </div>

              {/* Touch interaction hints */}
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>👉 Swipe right: Start backup</span>
                  {isEmergencyMode && (
                    <span>👈 Swipe left: Emergency restore</span>
                  )}
                  <span>👇 Swipe down: Cancel</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Emergency options modal */}
      {showEmergencyOptions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onTouchStart={() => setShowEmergencyOptions(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 m-4 w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-center mb-4">
              🚨 Emergency Actions
            </h3>
            <div className="space-y-3">
              <button
                className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold"
                style={{ minHeight: TOUCH_TARGET_SIZE }}
                onTouchStart={() => {
                  triggerHaptic(HAPTIC_PATTERNS.emergency_mode);
                  // Emergency backup all critical data
                }}
              >
                🆘 Emergency Backup All Critical Data
              </button>
              <button
                className="w-full py-4 bg-orange-600 text-white rounded-xl font-semibold"
                style={{ minHeight: TOUCH_TARGET_SIZE }}
                onTouchStart={() => {
                  triggerHaptic(HAPTIC_PATTERNS.backup_start);
                  // Contact support
                }}
              >
                📞 Contact Emergency Support
              </button>
              <button
                className="w-full py-4 bg-gray-600 text-white rounded-xl font-semibold"
                style={{ minHeight: TOUCH_TARGET_SIZE }}
                onTouchStart={() => setShowEmergencyOptions(false)}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Performance debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
          <p>Touch Performance:</p>
          <p>Touch Start: {getAverageDuration('touch-start')?.toFixed(2)}ms</p>
          <p>Drag Operations: {getAverageDuration('drag-end')?.toFixed(2)}ms</p>
        </div>
      )}
    </div>
  );
}
