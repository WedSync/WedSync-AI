'use client';

/**
 * WS-239: Haptic Feedback Hook
 * Custom hook for haptic feedback on mobile devices
 * Supports iOS and Android native haptic APIs via PWA/WebApp
 */

import { useCallback, useRef } from 'react';

export type HapticType = 'selection' | 'impact' | 'notification';

export interface HapticFeedbackAPI {
  triggerHaptic: (type: HapticType, intensity?: number) => void;
  isSupported: boolean;
  isEnabled: boolean;
}

// Extend Window interface for haptic APIs
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        hapticFeedback?: {
          postMessage: (message: any) => void;
        };
      };
    };
    TapticEngine?: {
      selection: () => void;
      impact: (options: { style: 'light' | 'medium' | 'heavy' }) => void;
      notification: (options: {
        type: 'success' | 'warning' | 'error';
      }) => void;
    };
    Android?: {
      performHapticFeedback?: (type: number) => void;
    };
  }
}

export function useHapticFeedback(): HapticFeedbackAPI {
  const lastHapticTime = useRef<number>(0);
  const hapticThrottle = 50; // Minimum time between haptic events (ms)

  // Check if haptic feedback is supported
  const isSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // iOS Haptic Engine (iOS 10+)
    if ('ontouchstart' in window && 'navigator' in window) {
      const nav = navigator as any;
      return !!(
        nav.vibrate ||
        nav.webkitVibrate ||
        nav.mozVibrate ||
        nav.msVibrate
      );
    }

    // Android Vibration API
    if ('vibrate' in navigator) {
      return true;
    }

    // WebKit Haptic Feedback (Safari)
    if (window.DeviceMotionEvent) {
      return true;
    }

    return false;
  }, []);

  // Check if haptic feedback is enabled (user preference)
  const isEnabled = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Check user preferences or device settings
    const userPreference = localStorage.getItem('hapticFeedbackEnabled');
    if (userPreference !== null) {
      return userPreference === 'true';
    }

    // Default to enabled on mobile devices
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    return isMobile;
  }, []);

  // Trigger haptic feedback
  const triggerHaptic = useCallback(
    (type: HapticType, intensity: number = 1) => {
      const now = Date.now();

      // Throttle haptic events to prevent overwhelming the user
      if (now - lastHapticTime.current < hapticThrottle) {
        return;
      }

      lastHapticTime.current = now;

      if (!isSupported() || !isEnabled()) {
        return;
      }

      try {
        // iOS Haptic Feedback (WebKit)
        if (window.webkit && window.webkit.messageHandlers) {
          const handlers = window.webkit.messageHandlers as any;
          if (handlers.hapticFeedback) {
            handlers.hapticFeedback.postMessage({ type, intensity });
            return;
          }
        }

        // iOS Taptic Engine (if available)
        if (window.TapticEngine) {
          const taptic = window.TapticEngine as any;
          switch (type) {
            case 'selection':
              taptic.selection();
              break;
            case 'impact':
              taptic.impact({ style: intensity > 0.5 ? 'heavy' : 'light' });
              break;
            case 'notification':
              taptic.notification({
                type: intensity > 0.7 ? 'success' : 'warning',
              });
              break;
          }
          return;
        }

        // Web Vibration API fallback
        if ('vibrate' in navigator) {
          const patterns: Record<HapticType, number | number[]> = {
            selection: Math.floor(25 * intensity),
            impact: Math.floor(50 * intensity),
            notification: [50, 50, 50].map((v) => Math.floor(v * intensity)),
          };

          const pattern = patterns[type];
          if (Array.isArray(pattern)) {
            navigator.vibrate(pattern);
          } else {
            navigator.vibrate(pattern);
          }
          return;
        }

        // Android WebView Haptic (if available)
        if (window.Android && window.Android.performHapticFeedback) {
          const android = window.Android as any;
          const feedbackConstants = {
            selection: 0, // VIRTUAL_KEY
            impact: 1, // LONG_PRESS
            notification: 3, // KEYBOARD_TAP
          };
          android.performHapticFeedback(feedbackConstants[type]);
          return;
        }
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
      }
    },
    [isSupported, isEnabled, hapticThrottle],
  );

  return {
    triggerHaptic,
    isSupported: isSupported(),
    isEnabled: isEnabled(),
  };
}
