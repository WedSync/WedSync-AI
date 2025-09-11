'use client';

import React, { useState, useEffect } from 'react';
import { getDemoTime, formatDemoTime, isScreenshotMode } from './screenshot-helpers';
import { isDemoMode } from './config';

/**
 * Hook for displaying consistent demo time across the application
 * Returns frozen time in screenshot mode, real time otherwise
 */
export function useDemoTime() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!isDemoMode()) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(interval);
    }

    // For demo mode, update based on screenshot mode state
    const updateTime = () => {
      setCurrentTime(getDemoTime());
    };

    // Initial update
    updateTime();

    // Only set interval if not in screenshot mode (time is frozen)
    if (!isScreenshotMode()) {
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // Don't render time updates until mounted (prevents hydration issues)
  if (!mounted) {
    return {
      currentTime: new Date(),
      formatTime: (format?: 'time' | 'date' | 'datetime') => new Date().toLocaleString(),
      isScreenshotMode: false,
      isDemoMode: false
    };
  }

  return {
    currentTime,
    formatTime: (format?: 'time' | 'date' | 'datetime') => formatDemoTime(format),
    isScreenshotMode: isScreenshotMode(),
    isDemoMode: isDemoMode()
  };
}

/**
 * Hook for demo time that automatically updates every second (unless frozen)
 */
export function useLiveDemoTime() {
  const { currentTime, formatTime, isScreenshotMode: screenshotMode, isDemoMode: demoMode } = useDemoTime();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (demoMode && !screenshotMode) {
      const interval = setInterval(() => {
        forceUpdate({});
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [demoMode, screenshotMode]);

  return {
    currentTime: demoMode ? getDemoTime() : new Date(),
    formatTime,
    isScreenshotMode: screenshotMode,
    isDemoMode: demoMode
  };
}

/**
 * Hook for displaying relative time (e.g., "2 hours ago")
 */
export function useRelativeDemoTime(targetDate: Date | string) {
  const { currentTime, isDemoMode: demoMode } = useDemoTime();
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;

  const getRelativeTime = (from: Date, to: Date): string => {
    const diffInSeconds = Math.floor((to.getTime() - from.getTime()) / 1000);
    const absDiff = Math.abs(diffInSeconds);

    if (absDiff < 60) {
      return diffInSeconds > 0 ? 'just now' : 'just now';
    }

    const minutes = Math.floor(absDiff / 60);
    if (minutes < 60) {
      const suffix = diffInSeconds > 0 ? ' ago' : ' from now';
      return `${minutes} minute${minutes !== 1 ? 's' : ''}${suffix}`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const suffix = diffInSeconds > 0 ? ' ago' : ' from now';
      return `${hours} hour${hours !== 1 ? 's' : ''}${suffix}`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      const suffix = diffInSeconds > 0 ? ' ago' : ' from now';
      return `${days} day${days !== 1 ? 's' : ''}${suffix}`;
    }

    // For longer periods, just show the date
    return target.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: target.getFullYear() !== currentTime.getFullYear() ? 'numeric' : undefined
    });
  };

  return {
    relativeTime: getRelativeTime(target, currentTime),
    absoluteTime: target.toLocaleString(),
    isDemoMode: demoMode
  };
}

/**
 * Component for displaying consistent demo time
 */
export function DemoTimeDisplay({ 
  format = 'datetime',
  className = '',
  showTimezone = false
}: {
  format?: 'time' | 'date' | 'datetime';
  className?: string;
  showTimezone?: boolean;
}) {
  const { formatTime, isScreenshotMode: screenshotMode, isDemoMode: demoMode } = useDemoTime();

  return (
    <span className={className}>
      {formatTime(format)}
      {showTimezone && ' UTC'}
      {demoMode && screenshotMode && (
        <span className="text-xs text-blue-600 ml-1" title="Time is frozen in screenshot mode">
          🔒
        </span>
      )}
    </span>
  );
}

export default useDemoTime;