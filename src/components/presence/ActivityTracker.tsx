'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import type { ActivityTrackerProps, PresenceStatus } from '@/types/presence';

// Activity tracking state interface
interface ActivityState {
  lastActivity: Date;
  isActive: boolean;
  mouseMoveCount: number;
  keyPressCount: number;
  scrollCount: number;
  clickCount: number;
  focusCount: number;
  activityScore: number; // Weighted activity score
}

// Activity weights for intelligent status detection
const ACTIVITY_WEIGHTS = {
  mouseMove: 1,
  keyPress: 3,
  scroll: 2,
  click: 2,
  focus: 1,
  visibility: 4,
};

// Default timeout configurations (in milliseconds)
const DEFAULT_TIMEOUTS = {
  idle: 120000, // 2 minutes - transition to idle
  away: 600000, // 10 minutes - transition to away
  offline: 1800000, // 30 minutes - transition to offline (if enabled)
  debounce: 2000, // 2 seconds - debounce activity events
  updateInterval: 30000, // 30 seconds - status broadcast interval
  activityWindow: 60000, // 1 minute - activity scoring window
};

// Wedding-specific timeout adjustments
const WEDDING_TIMEOUTS = {
  idle: 90000, // 1.5 minutes - shorter for wedding day
  away: 300000, // 5 minutes - shorter for coordination needs
  offline: 900000, // 15 minutes - shorter for critical coordination
  debounce: 1000, // 1 second - more responsive for wedding day
  updateInterval: 15000, // 15 seconds - more frequent updates
};

export function ActivityTracker({
  enabled = true,
  trackMouse = true,
  trackKeyboard = true,
  trackFocus = true,
  idleTimeout = DEFAULT_TIMEOUTS.idle,
  awayTimeout = DEFAULT_TIMEOUTS.away,
  onStatusChange,
}: ActivityTrackerProps) {
  const { user } = useAuth();

  // Refs for managing state and timers
  const activityStateRef = useRef<ActivityState>({
    lastActivity: new Date(),
    isActive: true,
    mouseMoveCount: 0,
    keyPressCount: 0,
    scrollCount: 0,
    clickCount: 0,
    focusCount: 0,
    activityScore: 100,
  });

  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const offlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityWindowRef = useRef<NodeJS.Timeout | null>(null);

  const currentStatusRef = useRef<PresenceStatus>('online');
  const isWeddingContextRef = useRef(false); // Will be determined from URL or context

  // Detect wedding context for adjusted timeouts
  useEffect(() => {
    const isWeddingPage =
      window.location.pathname.includes('/wedding') ||
      window.location.pathname.includes('/venue') ||
      window.location.search.includes('wedding');
    isWeddingContextRef.current = isWeddingPage;
  }, []);

  // Get timeout values based on context
  const getTimeouts = useCallback(() => {
    return isWeddingContextRef.current ? WEDDING_TIMEOUTS : DEFAULT_TIMEOUTS;
  }, []);

  // Calculate activity score based on recent activity
  const calculateActivityScore = useCallback((): number => {
    const state = activityStateRef.current;
    const timeouts = getTimeouts();

    const score =
      state.mouseMoveCount * ACTIVITY_WEIGHTS.mouseMove +
      state.keyPressCount * ACTIVITY_WEIGHTS.keyPress +
      state.scrollCount * ACTIVITY_WEIGHTS.scroll +
      state.clickCount * ACTIVITY_WEIGHTS.click +
      state.focusCount * ACTIVITY_WEIGHTS.focus;

    // Decay score over time
    const timeSinceLastActivity = Date.now() - state.lastActivity.getTime();
    const decayFactor = Math.max(
      0,
      1 - timeSinceLastActivity / timeouts.activityWindow,
    );

    return Math.min(100, score * decayFactor);
  }, [getTimeouts]);

  // Reset activity counters
  const resetActivityCounters = useCallback(() => {
    activityStateRef.current = {
      ...activityStateRef.current,
      mouseMoveCount: 0,
      keyPressCount: 0,
      scrollCount: 0,
      clickCount: 0,
      focusCount: 0,
    };
  }, []);

  // Update activity state with intelligent scoring
  const updateActivity = useCallback(
    (activityType: keyof typeof ACTIVITY_WEIGHTS) => {
      if (!enabled) return;

      const now = new Date();
      const state = activityStateRef.current;

      // Update activity counts
      switch (activityType) {
        case 'mouseMove':
          state.mouseMoveCount++;
          break;
        case 'keyPress':
          state.keyPressCount++;
          break;
        case 'scroll':
          state.scrollCount++;
          break;
        case 'click':
          state.clickCount++;
          break;
        case 'focus':
          state.focusCount++;
          break;
      }

      // Update activity state
      activityStateRef.current = {
        ...state,
        lastActivity: now,
        isActive: true,
        activityScore: calculateActivityScore(),
      };

      // Clear existing timeouts
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current);
      if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);

      const timeouts = getTimeouts();

      // Set new timeouts based on current status and activity level
      const activityScore = activityStateRef.current.activityScore;

      // Adjust timeouts based on activity score (higher activity = longer before idle)
      const activityMultiplier = 1 + activityScore / 100;
      const adjustedIdleTimeout = Math.min(
        idleTimeout * activityMultiplier,
        idleTimeout * 2,
      );
      const adjustedAwayTimeout = Math.min(
        awayTimeout * activityMultiplier,
        awayTimeout * 1.5,
      );

      // Set idle timeout
      idleTimeoutRef.current = setTimeout(() => {
        if (currentStatusRef.current === 'online') {
          currentStatusRef.current = 'idle';
          onStatusChange?.('idle');
        }
      }, adjustedIdleTimeout);

      // Set away timeout
      awayTimeoutRef.current = setTimeout(() => {
        if (
          currentStatusRef.current === 'online' ||
          currentStatusRef.current === 'idle'
        ) {
          currentStatusRef.current = 'away';
          onStatusChange?.('away');
        }
      }, adjustedAwayTimeout);

      // Optional offline timeout for extended inactivity
      if (DEFAULT_TIMEOUTS.offline) {
        offlineTimeoutRef.current = setTimeout(() => {
          if (currentStatusRef.current !== 'busy') {
            currentStatusRef.current = 'offline';
            onStatusChange?.('offline');
          }
        }, DEFAULT_TIMEOUTS.offline);
      }

      // Update status to online if currently idle/away from new activity
      if (
        currentStatusRef.current === 'idle' ||
        currentStatusRef.current === 'away'
      ) {
        currentStatusRef.current = 'online';
        onStatusChange?.('online');
      }
    },
    [
      enabled,
      idleTimeout,
      awayTimeout,
      onStatusChange,
      calculateActivityScore,
      getTimeouts,
    ],
  );

  // Debounced activity handlers to prevent excessive updates
  const createDebouncedHandler = useCallback(
    (activityType: keyof typeof ACTIVITY_WEIGHTS) => {
      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
          updateActivity(activityType);
        }, getTimeouts().debounce);
      };
    },
    [updateActivity, getTimeouts],
  );

  // Event handlers
  const handleMouseMove = useCallback(createDebouncedHandler('mouseMove'), [
    createDebouncedHandler,
  ]);
  const handleKeyPress = useCallback(createDebouncedHandler('keyPress'), [
    createDebouncedHandler,
  ]);
  const handleScroll = useCallback(createDebouncedHandler('scroll'), [
    createDebouncedHandler,
  ]);
  const handleClick = useCallback(createDebouncedHandler('click'), [
    createDebouncedHandler,
  ]);

  const handleFocus = useCallback(() => {
    updateActivity('focus');
  }, [updateActivity]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Page became hidden - transition to idle faster
      if (currentStatusRef.current === 'online') {
        currentStatusRef.current = 'idle';
        onStatusChange?.('idle');
      }
    } else {
      // Page became visible - register as activity
      updateActivity('visibility');
    }
  }, [updateActivity, onStatusChange]);

  // Page unload handler - set offline status
  const handleBeforeUnload = useCallback(() => {
    currentStatusRef.current = 'offline';
    onStatusChange?.('offline');
  }, [onStatusChange]);

  // Setup event listeners
  useEffect(() => {
    if (!enabled || !user?.id) return;

    // Mouse activity
    if (trackMouse) {
      document.addEventListener('mousemove', handleMouseMove, {
        passive: true,
      });
      document.addEventListener('click', handleClick);
      document.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Keyboard activity
    if (trackKeyboard) {
      document.addEventListener('keydown', handleKeyPress);
      document.addEventListener('keypress', handleKeyPress);
    }

    // Focus and visibility
    if (trackFocus) {
      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Page unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initialize status as online
    currentStatusRef.current = 'online';
    onStatusChange?.('online');
    updateActivity('focus'); // Initial activity registration

    // Cleanup function
    return () => {
      // Remove event listeners
      if (trackMouse) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('click', handleClick);
        document.removeEventListener('scroll', handleScroll);
      }

      if (trackKeyboard) {
        document.removeEventListener('keydown', handleKeyPress);
        document.removeEventListener('keypress', handleKeyPress);
      }

      if (trackFocus) {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleFocus);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      }

      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Clear all timeouts
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current);
      if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (activityWindowRef.current) clearTimeout(activityWindowRef.current);

      // Set offline status on cleanup
      onStatusChange?.('offline');
    };
  }, [
    enabled,
    user?.id,
    trackMouse,
    trackKeyboard,
    trackFocus,
    handleMouseMove,
    handleKeyPress,
    handleScroll,
    handleClick,
    handleFocus,
    handleVisibilityChange,
    handleBeforeUnload,
    onStatusChange,
    updateActivity,
  ]);

  // Periodic activity counter reset for memory efficiency
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      resetActivityCounters();
      activityStateRef.current.activityScore = calculateActivityScore();
    }, getTimeouts().activityWindow);

    return () => clearInterval(interval);
  }, [enabled, resetActivityCounters, calculateActivityScore, getTimeouts]);

  // Development mode debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && enabled) {
      const debugInterval = setInterval(() => {
        const state = activityStateRef.current;
        console.debug('ActivityTracker State:', {
          status: currentStatusRef.current,
          activityScore: state.activityScore,
          lastActivity: state.lastActivity,
          counters: {
            mouse: state.mouseMoveCount,
            keyboard: state.keyPressCount,
            scroll: state.scrollCount,
            click: state.clickCount,
            focus: state.focusCount,
          },
        });
      }, 30000); // Debug every 30 seconds

      return () => clearInterval(debugInterval);
    }
  }, [enabled]);

  // This component renders nothing (invisible)
  return null;
}

// Specialized variants for different contexts

interface WeddingActivityTrackerProps
  extends Omit<ActivityTrackerProps, 'idleTimeout' | 'awayTimeout'> {
  weddingId: string;
  isWeddingDay?: boolean;
}

export function WeddingActivityTracker({
  weddingId,
  isWeddingDay = false,
  ...props
}: WeddingActivityTrackerProps) {
  // More responsive timeouts for wedding coordination
  const idleTimeout = isWeddingDay ? 60000 : 90000; // 1-1.5 minutes
  const awayTimeout = isWeddingDay ? 180000 : 300000; // 3-5 minutes

  return (
    <ActivityTracker
      idleTimeout={idleTimeout}
      awayTimeout={awayTimeout}
      {...props}
    />
  );
}

interface PhotographerActivityTrackerProps
  extends Omit<ActivityTrackerProps, 'idleTimeout' | 'awayTimeout'> {
  shootingMode?: boolean;
}

export function PhotographerActivityTracker({
  shootingMode = false,
  ...props
}: PhotographerActivityTrackerProps) {
  // Different timeouts for photographers during shoots
  const idleTimeout = shootingMode ? 300000 : 120000; // 5 minutes during shoots, 2 minutes otherwise
  const awayTimeout = shootingMode ? 900000 : 600000; // 15 minutes during shoots, 10 minutes otherwise

  return (
    <ActivityTracker
      idleTimeout={idleTimeout}
      awayTimeout={awayTimeout}
      {...props}
    />
  );
}

export default ActivityTracker;
