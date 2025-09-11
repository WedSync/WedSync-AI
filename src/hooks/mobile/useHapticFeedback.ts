'use client';

import { useCallback, useRef, useMemo } from 'react';

// WS-258 Mobile Haptic Feedback Hook for Wedding Industry Emergency Scenarios
// Optimized for wedding vendors using mobile devices in high-stress situations

export interface HapticPattern {
  name: string;
  pattern: number[];
  description: string;
  intensity: 'light' | 'medium' | 'heavy';
  useCase: string;
}

// Wedding industry haptic feedback patterns
export const WEDDING_HAPTIC_PATTERNS: Record<string, HapticPattern> = {
  // Basic interaction patterns
  TOUCH_START: {
    name: 'touch_start',
    pattern: [10],
    description: 'Light tap confirmation',
    intensity: 'light',
    useCase: 'Button press acknowledgment',
  },

  TOUCH_SUCCESS: {
    name: 'touch_success',
    pattern: [50, 30, 50],
    description: 'Successful action completion',
    intensity: 'medium',
    useCase: 'Form submission, backup completion',
  },

  // Wedding day critical patterns
  WEDDING_DAY_ALERT: {
    name: 'wedding_day_alert',
    pattern: [200, 100, 200, 100, 200],
    description: 'Critical wedding day notification',
    intensity: 'heavy',
    useCase: 'Wedding day emergencies, critical alerts',
  },

  EMERGENCY_MODE: {
    name: 'emergency_mode',
    pattern: [300, 150, 300, 150, 300, 150, 300],
    description: 'Emergency mode activation',
    intensity: 'heavy',
    useCase: 'System failures, data loss alerts',
  },

  // Backup operation patterns
  BACKUP_START: {
    name: 'backup_start',
    pattern: [80, 40, 80],
    description: 'Backup operation initiated',
    intensity: 'medium',
    useCase: 'Backup start confirmation',
  },

  BACKUP_COMPLETE: {
    name: 'backup_complete',
    pattern: [100, 50, 100, 50, 200],
    description: 'Backup successfully completed',
    intensity: 'medium',
    useCase: 'Backup success notification',
  },

  BACKUP_ERROR: {
    name: 'backup_error',
    pattern: [200, 100, 200, 100, 200],
    description: 'Backup operation failed',
    intensity: 'heavy',
    useCase: 'Backup failures, data sync errors',
  },

  // Drag and gesture patterns
  DRAG_START: {
    name: 'drag_start',
    pattern: [15],
    description: 'Drag gesture initiated',
    intensity: 'light',
    useCase: 'Start of drag operations',
  },

  DRAG_SNAP: {
    name: 'drag_snap',
    pattern: [25],
    description: 'Snap to position',
    intensity: 'light',
    useCase: 'Snapping to targets, magnetic positioning',
  },

  DRAG_DROP_SUCCESS: {
    name: 'drag_drop_success',
    pattern: [60, 30, 60],
    description: 'Successful drop operation',
    intensity: 'medium',
    useCase: 'File drops, reordering completion',
  },

  // Long press and multi-touch
  LONG_PRESS: {
    name: 'long_press',
    pattern: [80, 40, 80, 40, 80],
    description: 'Long press confirmation',
    intensity: 'medium',
    useCase: 'Context menu activation, emergency actions',
  },

  MULTI_TOUCH: {
    name: 'multi_touch',
    pattern: [30, 10, 30, 10, 30],
    description: 'Multi-touch gesture detected',
    intensity: 'light',
    useCase: 'Pinch zoom, multi-select operations',
  },

  // Vendor-specific scenarios
  PHOTOGRAPHER_ALERT: {
    name: 'photographer_alert',
    pattern: [50, 25, 50, 25, 100],
    description: 'Photography-specific alert',
    intensity: 'medium',
    useCase: 'Photo upload failures, camera connection issues',
  },

  VENUE_EMERGENCY: {
    name: 'venue_emergency',
    pattern: [400, 200, 400, 200, 400],
    description: 'Venue emergency notification',
    intensity: 'heavy',
    useCase: 'Power outages, equipment failures at venues',
  },

  PLANNER_REMINDER: {
    name: 'planner_reminder',
    pattern: [60, 30, 60, 30, 120],
    description: 'Wedding planner reminder',
    intensity: 'medium',
    useCase: 'Schedule reminders, vendor check-ins',
  },

  // Network and sync patterns
  NETWORK_POOR: {
    name: 'network_poor',
    pattern: [100, 50, 100],
    description: 'Poor network connection detected',
    intensity: 'medium',
    useCase: 'Network degradation warnings',
  },

  OFFLINE_MODE: {
    name: 'offline_mode',
    pattern: [150, 75, 150, 75, 300],
    description: 'Offline mode activated',
    intensity: 'heavy',
    useCase: 'Loss of connectivity at venues',
  },

  SYNC_COMPLETE: {
    name: 'sync_complete',
    pattern: [40, 20, 40, 20, 80],
    description: 'Data synchronization completed',
    intensity: 'medium',
    useCase: 'Background sync completion',
  },

  // Error and warning patterns
  ERROR_MINOR: {
    name: 'error_minor',
    pattern: [100, 100, 100],
    description: 'Minor error or warning',
    intensity: 'medium',
    useCase: 'Form validation errors, minor issues',
  },

  ERROR_MAJOR: {
    name: 'error_major',
    pattern: [300, 100, 300, 100, 300],
    description: 'Major error requiring attention',
    intensity: 'heavy',
    useCase: 'Payment failures, critical system errors',
  },

  WARNING_WEDDING: {
    name: 'warning_wedding',
    pattern: [150, 75, 150, 75, 150],
    description: 'Wedding-related warning',
    intensity: 'medium',
    useCase: 'Scheduling conflicts, vendor issues',
  },
};

export interface UseHapticFeedbackOptions {
  enabled?: boolean;
  respectUserPreferences?: boolean;
  debugMode?: boolean;
  fallbackToAudio?: boolean;
}

export interface HapticFeedbackAPI {
  trigger: (
    patternName: keyof typeof WEDDING_HAPTIC_PATTERNS,
    customPattern?: number[],
  ) => Promise<boolean>;
  triggerPattern: (pattern: number[]) => Promise<boolean>;
  isSupported: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  getPatterns: () => Record<string, HapticPattern>;
  testPattern: (
    patternName: keyof typeof WEDDING_HAPTIC_PATTERNS,
  ) => Promise<void>;
}

export function useHapticFeedback(
  options: UseHapticFeedbackOptions = {},
): HapticFeedbackAPI {
  const {
    enabled = true,
    respectUserPreferences = true,
    debugMode = false,
    fallbackToAudio = false,
  } = options;

  const enabledRef = useRef(enabled);
  const lastTriggerRef = useRef<number>(0);

  // Check if haptic feedback is supported
  const isSupported = useMemo(() => {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  }, []);

  // Check user preferences for reduced motion/haptics
  const respectsUserPreferences = useMemo(() => {
    if (!respectUserPreferences) return true;

    try {
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      return !prefersReducedMotion;
    } catch (error) {
      return true; // Default to enabled if we can't detect preference
    }
  }, [respectUserPreferences]);

  const isEnabled = useMemo(() => {
    return isSupported && enabledRef.current && respectsUserPreferences;
  }, [isSupported, respectsUserPreferences]);

  // Throttling to prevent haptic spam
  const shouldThrottle = useCallback((minInterval: number = 50): boolean => {
    const now = Date.now();
    if (now - lastTriggerRef.current < minInterval) {
      return true;
    }
    lastTriggerRef.current = now;
    return false;
  }, []);

  // Fallback audio feedback for when haptics aren't available
  const triggerAudioFallback = useCallback(
    (intensity: 'light' | 'medium' | 'heavy') => {
      if (!fallbackToAudio) return;

      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different frequencies for different intensities
        const frequencies = {
          light: 440, // A4
          medium: 523.25, // C5
          heavy: 659.25, // E5
        };

        const volumes = {
          light: 0.1,
          medium: 0.2,
          heavy: 0.3,
        };

        oscillator.frequency.setValueAtTime(
          frequencies[intensity],
          audioContext.currentTime,
        );
        gainNode.gain.setValueAtTime(
          volumes[intensity],
          audioContext.currentTime,
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.1,
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.warn('Audio fallback failed:', error);
      }
    },
    [fallbackToAudio],
  );

  // Main haptic trigger function
  const trigger = useCallback(
    async (
      patternName: keyof typeof WEDDING_HAPTIC_PATTERNS,
      customPattern?: number[],
    ): Promise<boolean> => {
      if (!isEnabled) {
        if (debugMode) {
          console.log(`Haptic feedback disabled: ${patternName}`);
        }
        return false;
      }

      // Throttle rapid-fire haptic calls
      if (shouldThrottle()) {
        if (debugMode) {
          console.log(`Haptic feedback throttled: ${patternName}`);
        }
        return false;
      }

      try {
        const pattern =
          customPattern || WEDDING_HAPTIC_PATTERNS[patternName]?.pattern;
        if (!pattern) {
          console.warn(`Haptic pattern not found: ${patternName}`);
          return false;
        }

        const success = navigator.vibrate(pattern);

        if (debugMode) {
          const patternInfo = WEDDING_HAPTIC_PATTERNS[patternName];
          console.log(`Haptic triggered: ${patternName}`, {
            pattern,
            intensity: patternInfo?.intensity,
            useCase: patternInfo?.useCase,
            success,
          });
        }

        // Trigger audio fallback if haptic failed
        if (!success && WEDDING_HAPTIC_PATTERNS[patternName]) {
          triggerAudioFallback(WEDDING_HAPTIC_PATTERNS[patternName].intensity);
        }

        return success;
      } catch (error) {
        console.warn('Haptic feedback error:', error);

        // Fallback to audio if available
        if (WEDDING_HAPTIC_PATTERNS[patternName]) {
          triggerAudioFallback(WEDDING_HAPTIC_PATTERNS[patternName].intensity);
        }

        return false;
      }
    },
    [isEnabled, shouldThrottle, debugMode, triggerAudioFallback],
  );

  // Direct pattern trigger
  const triggerPattern = useCallback(
    async (pattern: number[]): Promise<boolean> => {
      if (!isEnabled || shouldThrottle()) return false;

      try {
        return navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Direct haptic pattern error:', error);
        return false;
      }
    },
    [isEnabled, shouldThrottle],
  );

  // Set enabled state
  const setEnabled = useCallback(
    (newEnabled: boolean) => {
      enabledRef.current = newEnabled;
      if (debugMode) {
        console.log(`Haptic feedback ${newEnabled ? 'enabled' : 'disabled'}`);
      }
    },
    [debugMode],
  );

  // Get all available patterns
  const getPatterns = useCallback(() => {
    return WEDDING_HAPTIC_PATTERNS;
  }, []);

  // Test a specific pattern (useful for settings/debug)
  const testPattern = useCallback(
    async (patternName: keyof typeof WEDDING_HAPTIC_PATTERNS) => {
      const pattern = WEDDING_HAPTIC_PATTERNS[patternName];
      if (!pattern) return;

      await trigger(patternName);

      if (debugMode) {
        console.log(`Testing pattern: ${patternName}`, {
          description: pattern.description,
          intensity: pattern.intensity,
          useCase: pattern.useCase,
          pattern: pattern.pattern,
        });
      }
    },
    [trigger, debugMode],
  );

  return {
    trigger,
    triggerPattern,
    isSupported,
    isEnabled,
    setEnabled,
    getPatterns,
    testPattern,
  };
}

// Wedding-specific convenience hooks
export function useWeddingHaptics() {
  const haptics = useHapticFeedback({
    enabled: true,
    respectUserPreferences: true,
    debugMode: process.env.NODE_ENV === 'development',
  });

  return {
    ...haptics,
    // Wedding day specific shortcuts
    weddingDayAlert: () => haptics.trigger('WEDDING_DAY_ALERT'),
    emergencyMode: () => haptics.trigger('EMERGENCY_MODE'),
    venueEmergency: () => haptics.trigger('VENUE_EMERGENCY'),
    photographerAlert: () => haptics.trigger('PHOTOGRAPHER_ALERT'),
    plannerReminder: () => haptics.trigger('PLANNER_REMINDER'),
    backupComplete: () => haptics.trigger('BACKUP_COMPLETE'),
    backupError: () => haptics.trigger('BACKUP_ERROR'),
    networkIssue: () => haptics.trigger('NETWORK_POOR'),
    offlineMode: () => haptics.trigger('OFFLINE_MODE'),
  };
}

export default useHapticFeedback;
