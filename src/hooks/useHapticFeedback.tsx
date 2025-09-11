'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';

export interface HapticPattern {
  id: string;
  name: string;
  pattern: number[];
  intensity: 'light' | 'medium' | 'heavy';
  context: 'photo' | 'client' | 'schedule' | 'emergency' | 'general';
}

export interface HapticFeedbackConfig {
  enabled: boolean;
  intensity: number; // 0-1 scale
  respectUserPreferences: boolean;
  maxFrequency: number; // Max haptic events per second
}

// Predefined haptic patterns for wedding professional workflows
const HAPTIC_PATTERNS: Record<string, HapticPattern> = {
  // Photo capture patterns
  photoCapture: {
    id: 'photo-capture',
    name: 'Photo Capture',
    pattern: [75, 25, 75], // Strong-weak-strong for capture confirmation
    intensity: 'heavy',
    context: 'photo',
  },
  photoFocus: {
    id: 'photo-focus',
    name: 'Photo Focus',
    pattern: [25], // Single light tap for focus confirmation
    intensity: 'light',
    context: 'photo',
  },
  photoMenu: {
    id: 'photo-menu',
    name: 'Photo Menu',
    pattern: [50, 25, 25], // Medium-light-light for menu access
    intensity: 'medium',
    context: 'photo',
  },

  // Client communication patterns
  clientCall: {
    id: 'client-call',
    name: 'Client Call',
    pattern: [100, 50, 100], // Strong pattern for important client actions
    intensity: 'heavy',
    context: 'client',
  },
  clientMessage: {
    id: 'client-message',
    name: 'Client Message',
    pattern: [50, 25, 50], // Medium pattern for messages
    intensity: 'medium',
    context: 'client',
  },
  messageReceived: {
    id: 'message-received',
    name: 'Message Received',
    pattern: [30, 20, 30, 20, 30], // Notification pattern
    intensity: 'medium',
    context: 'client',
  },

  // Schedule management patterns
  taskComplete: {
    id: 'task-complete',
    name: 'Task Complete',
    pattern: [50, 25, 50, 25, 100], // Success pattern with strong finish
    intensity: 'heavy',
    context: 'schedule',
  },
  scheduleChange: {
    id: 'schedule-change',
    name: 'Schedule Change',
    pattern: [75, 50, 75], // Alert pattern for schedule updates
    intensity: 'medium',
    context: 'schedule',
  },
  reminder: {
    id: 'reminder',
    name: 'Reminder',
    pattern: [40, 30, 40, 30, 40], // Gentle reminder pattern
    intensity: 'light',
    context: 'schedule',
  },

  // Emergency patterns
  emergency: {
    id: 'emergency',
    name: 'Emergency Alert',
    pattern: [150, 50, 150, 50, 150, 50, 150], // Urgent emergency pattern
    intensity: 'heavy',
    context: 'emergency',
  },
  emergencyCancel: {
    id: 'emergency-cancel',
    name: 'Emergency Cancelled',
    pattern: [100, 100, 50], // Relief pattern for cancelled emergency
    intensity: 'medium',
    context: 'emergency',
  },

  // General UI patterns
  buttonPress: {
    id: 'button-press',
    name: 'Button Press',
    pattern: [25], // Quick tap for button feedback
    intensity: 'light',
    context: 'general',
  },
  navigation: {
    id: 'navigation',
    name: 'Navigation',
    pattern: [30], // Light navigation feedback
    intensity: 'light',
    context: 'general',
  },
  error: {
    id: 'error',
    name: 'Error',
    pattern: [100, 50, 50, 50, 100], // Error alert pattern
    intensity: 'heavy',
    context: 'general',
  },
  success: {
    id: 'success',
    name: 'Success',
    pattern: [50, 25, 25, 25, 75], // Success confirmation pattern
    intensity: 'medium',
    context: 'general',
  },
  warning: {
    id: 'warning',
    name: 'Warning',
    pattern: [75, 50, 75], // Warning attention pattern
    intensity: 'medium',
    context: 'general',
  },
};

export function useHapticFeedback(config: Partial<HapticFeedbackConfig> = {}) {
  const defaultConfig: HapticFeedbackConfig = {
    enabled: true,
    intensity: 1.0,
    respectUserPreferences: true,
    maxFrequency: 10,
  };

  const [configuration, setConfiguration] = useState<HapticFeedbackConfig>({
    ...defaultConfig,
    ...config,
  });

  const [isSupported, setIsSupported] = useState(false);
  const [userPreference, setUserPreference] = useState<boolean | null>(null);
  const lastHapticTime = useRef<number>(0);
  const hapticQueue = useRef<HapticPattern[]>([]);
  const isProcessingQueue = useRef(false);

  // Check device support and user preferences
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        typeof navigator !== 'undefined' && 'vibrate' in navigator;
      setIsSupported(supported);
    };

    const checkUserPreference = () => {
      // Check for user's haptic preference in localStorage
      const stored = localStorage.getItem('wedsync-haptic-preference');
      if (stored) {
        setUserPreference(stored === 'enabled');
      }

      // Check for reduced motion preference (affects haptic feedback)
      if (window.matchMedia) {
        const reducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        if (reducedMotion && userPreference === null) {
          setUserPreference(false); // Default to disabled if user prefers reduced motion
        }
      }
    };

    checkSupport();
    checkUserPreference();
  }, [userPreference]);

  // Rate limiting to prevent haptic spam
  const canTriggerHaptic = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastHaptic = now - lastHapticTime.current;
    const minInterval = 1000 / configuration.maxFrequency;

    return timeSinceLastHaptic >= minInterval;
  }, [configuration.maxFrequency]);

  // Process haptic queue
  const processHapticQueue = useCallback(async () => {
    if (isProcessingQueue.current || hapticQueue.current.length === 0) return;

    isProcessingQueue.current = true;

    while (hapticQueue.current.length > 0) {
      const pattern = hapticQueue.current.shift();
      if (!pattern) break;

      if (canTriggerHaptic()) {
        try {
          // Scale pattern intensity based on configuration
          const scaledPattern = pattern.pattern
            .map((duration) => Math.round(duration * configuration.intensity))
            .filter((duration) => duration > 0);

          if (scaledPattern.length > 0 && navigator.vibrate) {
            navigator.vibrate(scaledPattern);
            lastHapticTime.current = Date.now();
          }
        } catch (error) {
          console.warn('Haptic feedback failed:', error);
        }
      }

      // Wait for pattern to complete before processing next
      const patternDuration = pattern.pattern.reduce(
        (sum, duration) => sum + duration,
        0,
      );
      await new Promise((resolve) => setTimeout(resolve, patternDuration + 50));
    }

    isProcessingQueue.current = false;
  }, [canTriggerHaptic, configuration.intensity]);

  // Core haptic trigger function
  const triggerHaptic = useCallback(
    (patternOrId: string | HapticPattern, customIntensity?: number) => {
      // Check if haptic feedback should be triggered
      if (!isSupported || !configuration.enabled) return false;

      if (configuration.respectUserPreferences && userPreference === false)
        return false;

      let pattern: HapticPattern | undefined;

      if (typeof patternOrId === 'string') {
        pattern = HAPTIC_PATTERNS[patternOrId];
        if (!pattern) {
          console.warn(`Haptic pattern "${patternOrId}" not found`);
          return false;
        }
      } else {
        pattern = patternOrId;
      }

      // Apply custom intensity if provided
      if (customIntensity !== undefined) {
        pattern = {
          ...pattern,
          pattern: pattern.pattern.map((duration) =>
            Math.round(duration * customIntensity),
          ),
        };
      }

      // Add to queue
      hapticQueue.current.push(pattern);
      processHapticQueue();

      return true;
    },
    [isSupported, configuration, userPreference, processHapticQueue],
  );

  // Convenience functions for common wedding professional actions
  const photoCapture = useCallback(
    () => triggerHaptic('photoCapture'),
    [triggerHaptic],
  );
  const photoFocus = useCallback(
    () => triggerHaptic('photoFocus'),
    [triggerHaptic],
  );
  const photoMenu = useCallback(
    () => triggerHaptic('photoMenu'),
    [triggerHaptic],
  );

  const clientCall = useCallback(
    () => triggerHaptic('clientCall'),
    [triggerHaptic],
  );
  const clientMessage = useCallback(
    () => triggerHaptic('clientMessage'),
    [triggerHaptic],
  );
  const messageReceived = useCallback(
    () => triggerHaptic('messageReceived'),
    [triggerHaptic],
  );

  const taskComplete = useCallback(
    () => triggerHaptic('taskComplete'),
    [triggerHaptic],
  );
  const scheduleChange = useCallback(
    () => triggerHaptic('scheduleChange'),
    [triggerHaptic],
  );
  const reminder = useCallback(
    () => triggerHaptic('reminder'),
    [triggerHaptic],
  );

  const emergency = useCallback(
    () => triggerHaptic('emergency'),
    [triggerHaptic],
  );
  const emergencyCancel = useCallback(
    () => triggerHaptic('emergencyCancel'),
    [triggerHaptic],
  );

  const buttonPress = useCallback(
    () => triggerHaptic('buttonPress'),
    [triggerHaptic],
  );
  const navigation = useCallback(
    () => triggerHaptic('navigation'),
    [triggerHaptic],
  );
  const error = useCallback(() => triggerHaptic('error'), [triggerHaptic]);
  const success = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const warning = useCallback(() => triggerHaptic('warning'), [triggerHaptic]);

  // Generic intensity-based functions
  const light = useCallback(
    (duration = 25) => {
      triggerHaptic({
        id: 'light',
        name: 'Light Haptic',
        pattern: [duration],
        intensity: 'light',
        context: 'general',
      });
    },
    [triggerHaptic],
  );

  const medium = useCallback(
    (duration = 50) => {
      triggerHaptic({
        id: 'medium',
        name: 'Medium Haptic',
        pattern: [duration],
        intensity: 'medium',
        context: 'general',
      });
    },
    [triggerHaptic],
  );

  const heavy = useCallback(
    (duration = 100) => {
      triggerHaptic({
        id: 'heavy',
        name: 'Heavy Haptic',
        pattern: [duration],
        intensity: 'heavy',
        context: 'general',
      });
    },
    [triggerHaptic],
  );

  // Custom pattern creation
  const createCustomPattern = useCallback(
    (
      pattern: number[],
      intensity: 'light' | 'medium' | 'heavy' = 'medium',
      context:
        | 'photo'
        | 'client'
        | 'schedule'
        | 'emergency'
        | 'general' = 'general',
    ): HapticPattern => ({
      id: `custom-${Date.now()}`,
      name: 'Custom Pattern',
      pattern,
      intensity,
      context,
    }),
    [],
  );

  // Configuration management
  const updateConfig = useCallback(
    (newConfig: Partial<HapticFeedbackConfig>) => {
      setConfiguration((prev) => ({ ...prev, ...newConfig }));
    },
    [],
  );

  const setUserPreferenceAndStore = useCallback((enabled: boolean) => {
    setUserPreference(enabled);
    localStorage.setItem(
      'wedsync-haptic-preference',
      enabled ? 'enabled' : 'disabled',
    );
  }, []);

  // Get available patterns
  const getAvailablePatterns = useCallback((): HapticPattern[] => {
    return Object.values(HAPTIC_PATTERNS);
  }, []);

  const getPatternsByContext = useCallback(
    (context: string): HapticPattern[] => {
      return Object.values(HAPTIC_PATTERNS).filter(
        (pattern) => pattern.context === context,
      );
    },
    [],
  );

  // Test haptic functionality
  const testHaptic = useCallback(
    (patternId?: string) => {
      const pattern = patternId
        ? HAPTIC_PATTERNS[patternId]
        : HAPTIC_PATTERNS.buttonPress;
      return triggerHaptic(pattern);
    },
    [triggerHaptic],
  );

  // Clear haptic queue
  const clearQueue = useCallback(() => {
    hapticQueue.current = [];
  }, []);

  return {
    // Core functions
    triggerHaptic,
    createCustomPattern,

    // Wedding professional contexts
    photo: {
      capture: photoCapture,
      focus: photoFocus,
      menu: photoMenu,
    },
    client: {
      call: clientCall,
      message: clientMessage,
      messageReceived,
    },
    schedule: {
      taskComplete,
      scheduleChange,
      reminder,
    },
    emergency: {
      alert: emergency,
      cancel: emergencyCancel,
    },

    // Generic functions
    light,
    medium,
    heavy,
    buttonPress,
    navigation,
    error,
    success,
    warning,

    // Configuration
    config: configuration,
    updateConfig,
    setUserPreference: setUserPreferenceAndStore,

    // Information
    isSupported,
    userPreference,
    getAvailablePatterns,
    getPatternsByContext,

    // Utilities
    testHaptic,
    clearQueue,

    // Queue status
    get queueLength() {
      return hapticQueue.current.length;
    },
    get isProcessing() {
      return isProcessingQueue.current;
    },
  };
}

// Hook for context-specific haptic feedback
export function usePhotoHaptics() {
  const haptics = useHapticFeedback();

  return {
    capture: haptics.photo.capture,
    focus: haptics.photo.focus,
    menu: haptics.photo.menu,
    ...haptics,
  };
}

export function useClientHaptics() {
  const haptics = useHapticFeedback();

  return {
    call: haptics.client.call,
    message: haptics.client.message,
    messageReceived: haptics.client.messageReceived,
    ...haptics,
  };
}

export function useScheduleHaptics() {
  const haptics = useHapticFeedback();

  return {
    taskComplete: haptics.schedule.taskComplete,
    scheduleChange: haptics.schedule.scheduleChange,
    reminder: haptics.schedule.reminder,
    ...haptics,
  };
}

export function useEmergencyHaptics() {
  const haptics = useHapticFeedback();

  return {
    alert: haptics.emergency.alert,
    cancel: haptics.emergency.cancel,
    ...haptics,
  };
}

// React component wrapper for haptic feedback
export interface HapticFeedbackProviderProps {
  children: React.ReactNode;
  config?: Partial<HapticFeedbackConfig>;
}

export const HapticFeedbackProvider: React.FC<HapticFeedbackProviderProps> = ({
  children,
  config,
}) => {
  const haptics = useHapticFeedback(config);

  // Add global haptic feedback to document for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).haptics = haptics;
    }
  }, [haptics]);

  return <>{children}</>;
};
