'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  PanInfo,
  useAnimation,
} from 'motion';
import { useWeddingHaptics } from '@/hooks/mobile/useHapticFeedback';
import { useBackupPerformanceMonitoring } from '@/hooks/useBackupPerformanceMonitoring';

// WS-258 Gesture-Based Navigation for Mobile Backup Interface
// Wedding industry mobile navigation optimized for emergency scenarios

interface GestureNavigationManagerProps {
  children: React.ReactNode;
  isWeddingDay?: boolean;
  isEmergencyMode?: boolean;
  vendorType?: 'photographer' | 'venue' | 'planner' | 'vendor';
  onNavigate?: (direction: GestureDirection, intensity: number) => void;
  onEmergencyGesture?: () => void;
  className?: string;
}

type GestureDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'pinch'
  | 'spread'
  | 'rotate'
  | 'none';

interface GestureState {
  isActive: boolean;
  direction: GestureDirection;
  intensity: number;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  velocity: { x: number; y: number };
  distance: number;
  angle: number;
  scale: number;
  rotation: number;
  timestamp: number;
}

interface MultiTouchState {
  touches: Touch[];
  initialDistance: number;
  initialAngle: number;
  scale: number;
  rotation: number;
}

// Wedding industry gesture patterns for emergency scenarios
const WEDDING_GESTURES = {
  // Emergency backup gestures
  EMERGENCY_BACKUP: {
    pattern: 'triple_tap',
    description: 'Triple tap for emergency backup',
    haptic: 'EMERGENCY_MODE',
    minTapCount: 3,
    maxTapInterval: 500, // ms between taps
  },

  // Quick actions for different vendor types
  PHOTOGRAPHER_QUICK_BACKUP: {
    pattern: 'swipe_up_fast',
    description: 'Fast swipe up to backup current shoot',
    haptic: 'PHOTOGRAPHER_ALERT',
    minVelocity: 800, // px/ms
  },

  VENUE_STATUS_CHECK: {
    pattern: 'two_finger_tap',
    description: 'Two finger tap for venue status',
    haptic: 'VENUE_EMERGENCY',
    fingerCount: 2,
  },

  PLANNER_COORDINATION: {
    pattern: 'circle_gesture',
    description: 'Draw circle for vendor coordination',
    haptic: 'PLANNER_REMINDER',
    minRadius: 80, // pixels
    maxDeviation: 0.3, // 30% deviation from perfect circle
  },

  // Navigation gestures
  BACKUP_HISTORY: {
    pattern: 'swipe_right',
    description: 'Swipe right to view backup history',
    haptic: 'DRAG_SNAP',
    minDistance: 100,
  },

  PERFORMANCE_METRICS: {
    pattern: 'swipe_left',
    description: 'Swipe left to view performance metrics',
    haptic: 'DRAG_SNAP',
    minDistance: 100,
  },

  EMERGENCY_CONTACTS: {
    pattern: 'long_press_corner',
    description: 'Long press corner for emergency contacts',
    haptic: 'LONG_PRESS',
    minDuration: 1000,
    cornerThreshold: 50, // pixels from corner
  },
};

// Gesture sensitivity settings for different scenarios
const SENSITIVITY_SETTINGS = {
  normal: {
    tapThreshold: 10, // px
    swipeThreshold: 50, // px
    longPressThreshold: 500, // ms
    pinchThreshold: 1.2, // scale multiplier
    rotationThreshold: 15, // degrees
  },
  wedding_day: {
    tapThreshold: 15, // More forgiving on wedding day (stressed users)
    swipeThreshold: 40, // Easier swipes
    longPressThreshold: 400, // Faster long press
    pinchThreshold: 1.15, // More sensitive pinch
    rotationThreshold: 12, // More sensitive rotation
  },
  emergency: {
    tapThreshold: 20, // Very forgiving during emergencies
    swipeThreshold: 30, // Very easy swipes
    longPressThreshold: 300, // Very fast long press
    pinchThreshold: 1.1, // Very sensitive pinch
    rotationThreshold: 10, // Very sensitive rotation
  },
};

export default function GestureNavigationManager({
  children,
  isWeddingDay = false,
  isEmergencyMode = false,
  vendorType = 'vendor',
  onNavigate,
  onEmergencyGesture,
  className = '',
}: GestureNavigationManagerProps) {
  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    direction: 'none',
    intensity: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    distance: 0,
    angle: 0,
    scale: 1,
    rotation: 0,
    timestamp: 0,
  });

  const [multiTouchState, setMultiTouchState] = useState<MultiTouchState>({
    touches: [],
    initialDistance: 0,
    initialAngle: 0,
    scale: 1,
    rotation: 0,
  });

  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [circleGesture, setCircleGesture] = useState<{
    points: { x: number; y: number }[];
    center: { x: number; y: number };
    radius: number;
  }>({ points: [], center: { x: 0, y: 0 }, radius: 0 });

  const haptics = useWeddingHaptics();
  const { measurePerformance } = useBackupPerformanceMonitoring(
    'GestureNavigationManager',
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Motion values for smooth animations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);

  // Transform values for visual feedback
  const opacity = useTransform(scale, [0.8, 1, 1.2], [0.7, 1, 0.9]);
  const brightness = useTransform(scale, [0.8, 1, 1.2], [0.9, 1, 1.1]);

  const controls = useAnimation();

  // Get sensitivity settings based on current context
  const sensitivity = useMemo(() => {
    if (isEmergencyMode) return SENSITIVITY_SETTINGS.emergency;
    if (isWeddingDay) return SENSITIVITY_SETTINGS.wedding_day;
    return SENSITIVITY_SETTINGS.normal;
  }, [isEmergencyMode, isWeddingDay]);

  // Calculate gesture direction from movement
  const calculateDirection = useCallback(
    (
      startPos: { x: number; y: number },
      currentPos: { x: number; y: number },
    ): GestureDirection => {
      const deltaX = currentPos.x - startPos.x;
      const deltaY = currentPos.y - startPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < sensitivity.swipeThreshold) return 'none';

      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      if (angle >= -45 && angle <= 45) return 'right';
      if (angle >= 45 && angle <= 135) return 'down';
      if (angle >= 135 || angle <= -135) return 'left';
      if (angle >= -135 && angle <= -45) return 'up';

      return 'none';
    },
    [sensitivity.swipeThreshold],
  );

  // Calculate distance between two points
  const calculateDistance = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    },
    [],
  );

  // Check if gesture matches emergency pattern
  const checkEmergencyGesture = useCallback(() => {
    const startTime = performance.now();

    // Triple tap detection
    if (tapCount >= 3) {
      haptics.emergencyMode();
      onEmergencyGesture?.();
      setTapCount(0);

      const gestureTime = performance.now() - startTime;
      measurePerformance('emergency-gesture', gestureTime);
      return true;
    }

    // Corner long press detection
    if (
      gestureState.isActive &&
      gestureState.distance < sensitivity.tapThreshold
    ) {
      const { x: posX, y: posY } = gestureState.currentPosition;
      const { innerWidth, innerHeight } = window;

      const isInCorner =
        (posX < WEDDING_GESTURES.EMERGENCY_CONTACTS.cornerThreshold ||
          posX >
            innerWidth - WEDDING_GESTURES.EMERGENCY_CONTACTS.cornerThreshold) &&
        (posY < WEDDING_GESTURES.EMERGENCY_CONTACTS.cornerThreshold ||
          posY >
            innerHeight - WEDDING_GESTURES.EMERGENCY_CONTACTS.cornerThreshold);

      if (isInCorner) {
        haptics.emergencyMode();
        onEmergencyGesture?.();
        return true;
      }
    }

    return false;
  }, [
    tapCount,
    gestureState,
    sensitivity.tapThreshold,
    haptics,
    onEmergencyGesture,
    measurePerformance,
  ]);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();

      // Multi-touch detection
      if (e.touches.length > 1) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = calculateDistance(
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY },
        );
        const angle = Math.atan2(
          touch2.clientY - touch1.clientY,
          touch2.clientX - touch1.clientX,
        );

        setMultiTouchState({
          touches: Array.from(e.touches),
          initialDistance: distance,
          initialAngle: angle,
          scale: 1,
          rotation: 0,
        });

        haptics.trigger('MULTI_TOUCH');
        return;
      }

      // Single touch
      const startPos = { x: touch.clientX, y: touch.clientY };

      setGestureState((prev) => ({
        ...prev,
        isActive: true,
        startPosition: startPos,
        currentPosition: startPos,
        timestamp: now,
        direction: 'none',
        distance: 0,
      }));

      // Tap detection
      if (
        now - lastTapTime <
        WEDDING_GESTURES.EMERGENCY_BACKUP.maxTapInterval
      ) {
        setTapCount((prev) => prev + 1);
      } else {
        setTapCount(1);
      }
      setLastTapTime(now);

      // Long press detection
      longPressTimeoutRef.current = setTimeout(() => {
        if (gestureState.distance < sensitivity.tapThreshold) {
          haptics.trigger('LONG_PRESS');

          // Check for emergency long press
          checkEmergencyGesture();
        }
      }, sensitivity.longPressThreshold);

      haptics.trigger('TOUCH_START');
    },
    [
      calculateDistance,
      gestureState.distance,
      sensitivity,
      lastTapTime,
      haptics,
      checkEmergencyGesture,
    ],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };

      // Multi-touch handling
      if (e.touches.length > 1) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = calculateDistance(
          { x: touch1.clientX, y: touch1.clientY },
          { x: touch2.clientX, y: touch2.clientY },
        );
        const angle = Math.atan2(
          touch2.clientY - touch1.clientY,
          touch2.clientX - touch1.clientX,
        );

        const scaleChange = distance / multiTouchState.initialDistance;
        const rotationChange = angle - multiTouchState.initialAngle;

        setMultiTouchState((prev) => ({
          ...prev,
          scale: scaleChange,
          rotation: rotationChange * (180 / Math.PI),
        }));

        // Update visual feedback
        scale.set(scaleChange);
        rotate.set(rotationChange * (180 / Math.PI));

        if (Math.abs(scaleChange - 1) > 0.1) {
          haptics.trigger('DRAG_SNAP');
        }

        return;
      }

      // Single touch movement
      const distance = calculateDistance(
        gestureState.startPosition,
        currentPos,
      );
      const direction = calculateDirection(
        gestureState.startPosition,
        currentPos,
      );
      const velocity = {
        x: (currentPos.x - gestureState.currentPosition.x) / 16, // Assuming 60fps
        y: (currentPos.y - gestureState.currentPosition.y) / 16,
      };

      setGestureState((prev) => ({
        ...prev,
        currentPosition: currentPos,
        distance,
        direction,
        velocity,
        angle:
          Math.atan2(
            currentPos.y - prev.startPosition.y,
            currentPos.x - prev.startPosition.x,
          ) *
          (180 / Math.PI),
      }));

      // Update visual feedback
      const deltaX = currentPos.x - gestureState.startPosition.x;
      const deltaY = currentPos.y - gestureState.startPosition.y;
      x.set(deltaX * 0.3); // Damped movement for visual feedback
      y.set(deltaY * 0.3);

      // Circle gesture detection for planner coordination
      if (vendorType === 'planner' && distance > 20) {
        setCircleGesture((prev) => {
          const newPoints = [...prev.points, currentPos].slice(-20); // Keep last 20 points

          if (newPoints.length >= 8) {
            // Calculate if points form a circle
            const centerX =
              newPoints.reduce((sum, p) => sum + p.x, 0) / newPoints.length;
            const centerY =
              newPoints.reduce((sum, p) => sum + p.y, 0) / newPoints.length;
            const avgRadius =
              newPoints.reduce(
                (sum, p) =>
                  sum + calculateDistance({ x: centerX, y: centerY }, p),
                0,
              ) / newPoints.length;

            return {
              points: newPoints,
              center: { x: centerX, y: centerY },
              radius: avgRadius,
            };
          }

          return { ...prev, points: newPoints };
        });
      }

      // Clear long press timer if user moves too much
      if (distance > sensitivity.tapThreshold && longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    },
    [
      gestureState,
      multiTouchState,
      calculateDistance,
      calculateDirection,
      vendorType,
      sensitivity.tapThreshold,
      x,
      y,
      scale,
      rotate,
      haptics,
    ],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const gestureTime = performance.now() - gestureState.timestamp;

      // Clear timers
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      // Multi-touch end
      if (multiTouchState.touches.length > 1) {
        const scaleGesture =
          Math.abs(multiTouchState.scale - 1) > sensitivity.pinchThreshold - 1;
        const rotateGesture =
          Math.abs(multiTouchState.rotation) > sensitivity.rotationThreshold;

        if (scaleGesture) {
          const direction: GestureDirection =
            multiTouchState.scale > 1 ? 'spread' : 'pinch';
          onNavigate?.(direction, Math.abs(multiTouchState.scale - 1));
          haptics.trigger('DRAG_DROP_SUCCESS');
        }

        if (rotateGesture) {
          onNavigate?.('rotate', Math.abs(multiTouchState.rotation));
          haptics.trigger('DRAG_DROP_SUCCESS');
        }

        setMultiTouchState({
          touches: [],
          initialDistance: 0,
          initialAngle: 0,
          scale: 1,
          rotation: 0,
        });

        // Reset visual feedback
        scale.set(1);
        rotate.set(0);
      }

      // Single touch end
      const { direction, distance, velocity } = gestureState;

      if (distance > sensitivity.swipeThreshold) {
        const velocityMagnitude = Math.sqrt(
          velocity.x * velocity.x + velocity.y * velocity.y,
        );
        const intensity = Math.min(velocityMagnitude / 1000, 1); // Normalize to 0-1

        onNavigate?.(direction, intensity);

        // Vendor-specific gesture handling
        if (
          direction === 'up' &&
          velocityMagnitude >
            WEDDING_GESTURES.PHOTOGRAPHER_QUICK_BACKUP.minVelocity &&
          vendorType === 'photographer'
        ) {
          haptics.trigger('PHOTOGRAPHER_ALERT');
        } else if (
          direction === 'right' &&
          distance > WEDDING_GESTURES.BACKUP_HISTORY.minDistance
        ) {
          haptics.trigger('DRAG_SNAP');
        } else if (
          direction === 'left' &&
          distance > WEDDING_GESTURES.PERFORMANCE_METRICS.minDistance
        ) {
          haptics.trigger('DRAG_SNAP');
        } else {
          haptics.trigger('DRAG_DROP_SUCCESS');
        }

        measurePerformance('gesture-recognition', gestureTime);
      }

      // Check for completed circle gesture (planner coordination)
      if (vendorType === 'planner' && circleGesture.points.length >= 8) {
        const deviation = calculateCircleDeviation(circleGesture);
        if (deviation < WEDDING_GESTURES.PLANNER_COORDINATION.maxDeviation) {
          haptics.trigger('PLANNER_REMINDER');
          onNavigate?.('rotate', 1); // Indicate circle completion
        }
        setCircleGesture({ points: [], center: { x: 0, y: 0 }, radius: 0 });
      }

      // Check emergency gestures
      if (tapCount >= 3) {
        checkEmergencyGesture();
      }

      // Reset gesture state
      setGestureState((prev) => ({
        ...prev,
        isActive: false,
        direction: 'none',
        distance: 0,
        velocity: { x: 0, y: 0 },
      }));

      // Reset visual feedback
      controls.start({
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      });

      // Clear tap count after delay
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(
        () => setTapCount(0),
        WEDDING_GESTURES.EMERGENCY_BACKUP.maxTapInterval,
      );
    },
    [
      gestureState,
      multiTouchState,
      sensitivity,
      circleGesture,
      tapCount,
      vendorType,
      onNavigate,
      haptics,
      controls,
      checkEmergencyGesture,
      measurePerformance,
    ],
  );

  // Calculate circle deviation for gesture recognition
  const calculateCircleDeviation = useCallback(
    (circle: typeof circleGesture): number => {
      if (circle.points.length < 8) return 1;

      const distances = circle.points.map((point) =>
        calculateDistance(circle.center, point),
      );

      const avgDistance =
        distances.reduce((sum, d) => sum + d, 0) / distances.length;
      const variance =
        distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) /
        distances.length;
      const standardDeviation = Math.sqrt(variance);

      return standardDeviation / avgDistance;
    },
    [calculateDistance],
  );

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (longPressTimeoutRef.current)
        clearTimeout(longPressTimeoutRef.current);
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`gesture-navigation-manager ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      animate={controls}
      style={{
        x,
        y,
        scale,
        rotate,
        opacity,
        filter: `brightness(${brightness.get()})`,
      }}
    >
      {children}

      {/* Gesture feedback overlay */}
      {gestureState.isActive && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Swipe direction indicator */}
          {gestureState.direction !== 'none' &&
            gestureState.distance > sensitivity.swipeThreshold && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium"
              >
                {gestureState.direction.toUpperCase()}
                {gestureState.distance > 0 &&
                  ` (${Math.round(gestureState.distance)}px)`}
              </motion.div>
            )}

          {/* Circle gesture preview */}
          {vendorType === 'planner' && circleGesture.points.length > 3 && (
            <svg className="absolute inset-0 w-full h-full">
              <circle
                cx={circleGesture.center.x}
                cy={circleGesture.center.y}
                r={circleGesture.radius}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
              <polyline
                points={circleGesture.points
                  .map((p) => `${p.x},${p.y}`)
                  .join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                opacity="0.8"
              />
            </svg>
          )}

          {/* Multi-touch indicator */}
          {multiTouchState.touches.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium"
            >
              {multiTouchState.scale !== 1 &&
                `Scale: ${multiTouchState.scale.toFixed(2)}x`}
              {multiTouchState.rotation !== 0 &&
                ` Rotate: ${Math.round(multiTouchState.rotation)}°`}
            </motion.div>
          )}
        </div>
      )}

      {/* Emergency mode indicator */}
      {isEmergencyMode && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
          🚨 EMERGENCY GESTURES ACTIVE
        </div>
      )}

      {/* Wedding day gesture guide */}
      {isWeddingDay && (
        <div className="fixed bottom-4 left-4 right-4 z-40 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-3">
          <h4 className="font-semibold text-pink-800 text-sm mb-2">
            💒 Wedding Day Gestures
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-pink-700">
            <div>• Triple tap: Emergency backup</div>
            <div>• Swipe up fast: Quick backup</div>
            <div>• Long press corner: Emergency contacts</div>
            {vendorType === 'planner' && (
              <div>• Draw circle: Vendor coordination</div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
