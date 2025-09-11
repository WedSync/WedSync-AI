'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';

export interface TouchAccessibilityOptions {
  announceActions?: boolean;
  focusManagement?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

// Screen reader announcements for touch interactions
export function useTouchAnnouncements() {
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (typeof window === 'undefined') return;

      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;

      document.body.appendChild(announcement);

      // Remove after announcement
      setTimeout(() => {
        if (announcement.parentNode) {
          announcement.parentNode.removeChild(announcement);
        }
      }, 1000);
    },
    [],
  );

  return { announce };
}

// Enhanced focus management for touch interactions
export function useTouchFocus() {
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current) {
      lastFocusedElement.current.focus();
    }
  }, []);

  return { saveFocus, restoreFocus };
}

// Detect user preferences for accessibility
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    preferKeyboard: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      preferKeyboard: window.matchMedia('(pointer: coarse)'),
    };

    const updatePreferences = () => {
      setPreferences({
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches,
        preferKeyboard: !mediaQueries.preferKeyboard.matches,
      });
    };

    updatePreferences();

    Object.values(mediaQueries).forEach((mq) => {
      mq.addEventListener('change', updatePreferences);
    });

    return () => {
      Object.values(mediaQueries).forEach((mq) => {
        mq.removeEventListener('change', updatePreferences);
      });
    };
  }, []);

  return preferences;
}

// Screen reader optimized announcements for wedding contexts
export const WEDDING_TOUCH_ANNOUNCEMENTS = {
  photoCapture: 'Photo captured for wedding album',
  guestCheckin: 'Guest checked in to wedding',
  timelineUpdate: 'Wedding timeline updated',
  vendorContact: 'Vendor contacted',
  taskComplete: 'Wedding task marked complete',
  emergencyAlert: 'Emergency alert sent to wedding coordinator',
} as const;

export type WeddingAnnouncementType = keyof typeof WEDDING_TOUCH_ANNOUNCEMENTS;
