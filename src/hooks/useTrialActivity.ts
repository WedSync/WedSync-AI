/**
 * WS-140 Trial Management System - Trial Activity Hook
 * Tracks user activity, feature usage, and milestone achievements during trial
 * Provides analytics and ROI calculation capabilities
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import {
  TrialFeatureUsage,
  TrialMilestone,
  MilestoneType,
  TrackFeatureUsageForm,
  AchieveMilestoneForm,
  FEATURE_TIME_SAVINGS,
} from '@/types/trial';

interface UseTrialActivityOptions {
  autoTrack?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

interface UseTrialActivityReturn {
  // Activity tracking
  trackFeatureUsage: (
    feature: string,
    timeSavedMinutes?: number,
    context?: Record<string, any>,
  ) => Promise<boolean>;
  achieveMilestone: (
    milestoneType: MilestoneType,
    context?: Record<string, any>,
  ) => Promise<boolean>;
  trackPageView: (page: string, duration?: number) => Promise<boolean>;
  trackAction: (
    action: string,
    category: string,
    value?: number,
  ) => Promise<boolean>;

  // Batch operations
  flushPendingEvents: () => Promise<void>;
  clearPendingEvents: () => void;

  // Data retrieval
  featureUsage: TrialFeatureUsage[] | null;
  milestones: TrialMilestone[] | null;
  isLoading: boolean;
  error: string | null;

  // Analytics
  getTotalTimeSaved: () => number;
  getMostUsedFeatures: (
    limit?: number,
  ) => Array<{ feature: string; count: number; timeSaved: number }>;
  getCompletionRate: () => number;

  // State
  pendingEventsCount: number;
  isTracking: boolean;
}

interface PendingEvent {
  id: string;
  type: 'feature_usage' | 'milestone' | 'page_view' | 'action';
  data: any;
  timestamp: Date;
}

export function useTrialActivity(
  options: UseTrialActivityOptions = {},
): UseTrialActivityReturn {
  const {
    autoTrack = true,
    batchSize = 10,
    flushInterval = 30000, // 30 seconds
  } = options;

  const supabase = createClient();
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const flushTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch feature usage data
  const {
    data: featureUsage,
    error: featureError,
    mutate: mutateFeatures,
  } = useSWR<TrialFeatureUsage[]>(
    '/api/trial/feature-usage',
    (url) =>
      fetch(url).then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error('Failed to fetch feature usage')),
      ),
    { refreshInterval: 60000 },
  );

  // Fetch milestones data
  const {
    data: milestones,
    error: milestonesError,
    mutate: mutateMilestones,
  } = useSWR<TrialMilestone[]>(
    '/api/trial/milestones',
    (url) =>
      fetch(url).then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error('Failed to fetch milestones')),
      ),
    { refreshInterval: 60000 },
  );

  const error = featureError?.message || milestonesError?.message || null;
  const isLoading =
    !featureUsage && !featureError && !milestones && !milestonesError;

  // Auto-flush pending events
  useEffect(() => {
    if (!autoTrack || pendingEvents.length === 0) return;

    if (pendingEvents.length >= batchSize) {
      flushPendingEvents();
    } else {
      // Set timeout for batch flush
      flushTimeoutRef.current = setTimeout(() => {
        flushPendingEvents();
      }, flushInterval);
    }

    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, [pendingEvents.length, batchSize, flushInterval, autoTrack]);

  // Track feature usage
  const trackFeatureUsage = useCallback(
    async (
      feature: string,
      timeSavedMinutes?: number,
      context?: Record<string, any>,
    ): Promise<boolean> => {
      const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const autoTimeSaved = FEATURE_TIME_SAVINGS[feature] || 0;

      const event: PendingEvent = {
        id: eventId,
        type: 'feature_usage',
        data: {
          feature_key: feature,
          feature_name: feature
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          time_saved_minutes: timeSavedMinutes || autoTimeSaved,
          context_data: context,
        },
        timestamp: new Date(),
      };

      setPendingEvents((prev) => [...prev, event]);

      if (!autoTrack) {
        return await sendEvent(event);
      }

      return true;
    },
    [autoTrack],
  );

  // Achieve milestone
  const achieveMilestone = useCallback(
    async (
      milestoneType: MilestoneType,
      context?: Record<string, any>,
    ): Promise<boolean> => {
      const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const event: PendingEvent = {
        id: eventId,
        type: 'milestone',
        data: {
          milestone_type: milestoneType,
          context_data: context,
        },
        timestamp: new Date(),
      };

      setPendingEvents((prev) => [...prev, event]);

      if (!autoTrack) {
        return await sendEvent(event);
      }

      return true;
    },
    [autoTrack],
  );

  // Track page view
  const trackPageView = useCallback(
    async (page: string, duration?: number): Promise<boolean> => {
      return await trackAction('page_view', 'navigation', duration, { page });
    },
    [],
  );

  // Track generic action
  const trackAction = useCallback(
    async (
      action: string,
      category: string,
      value?: number,
      context?: Record<string, any>,
    ): Promise<boolean> => {
      const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const event: PendingEvent = {
        id: eventId,
        type: 'action',
        data: {
          action,
          category,
          value,
          context_data: context,
        },
        timestamp: new Date(),
      };

      setPendingEvents((prev) => [...prev, event]);

      if (!autoTrack) {
        return await sendEvent(event);
      }

      return true;
    },
    [autoTrack],
  );

  // Send individual event
  const sendEvent = async (event: PendingEvent): Promise<boolean> => {
    try {
      setIsTracking(true);

      let endpoint = '';
      let payload = event.data;

      switch (event.type) {
        case 'feature_usage':
          endpoint = '/api/trial/track-usage';
          break;
        case 'milestone':
          endpoint = '/api/trial/achieve-milestone';
          break;
        case 'page_view':
        case 'action':
          endpoint = '/api/trial/track-action';
          break;
        default:
          throw new Error(`Unknown event type: ${event.type}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to track event');
      }

      // Refresh data after successful tracking
      if (event.type === 'feature_usage') {
        mutateFeatures();
      } else if (event.type === 'milestone') {
        mutateMilestones();
      }

      return true;
    } catch (err) {
      console.error('Failed to send event:', err);
      return false;
    } finally {
      setIsTracking(false);
    }
  };

  // Flush pending events
  const flushPendingEvents = useCallback(async (): Promise<void> => {
    if (pendingEvents.length === 0) return;

    const eventsToSend = [...pendingEvents];
    setPendingEvents([]);

    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }

    try {
      setIsTracking(true);

      // Send events in parallel for better performance
      const sendPromises = eventsToSend.map((event) => sendEvent(event));
      const results = await Promise.allSettled(sendPromises);

      // Handle failed events by putting them back in the queue
      const failedEvents: PendingEvent[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedEvents.push(eventsToSend[index]);
        }
      });

      if (failedEvents.length > 0) {
        console.warn(
          `${failedEvents.length} events failed to send, adding back to queue`,
        );
        setPendingEvents((prev) => [...prev, ...failedEvents]);
      }
    } catch (err) {
      console.error('Failed to flush events:', err);
      // Put events back in queue
      setPendingEvents((prev) => [...prev, ...eventsToSend]);
    } finally {
      setIsTracking(false);
    }
  }, [pendingEvents]);

  // Clear pending events
  const clearPendingEvents = useCallback(() => {
    setPendingEvents([]);
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
  }, []);

  // Analytics functions
  const getTotalTimeSaved = useCallback((): number => {
    if (!featureUsage) return 0;
    return featureUsage.reduce(
      (total, usage) => total + usage.time_saved_minutes,
      0,
    );
  }, [featureUsage]);

  const getMostUsedFeatures = useCallback(
    (limit: number = 5) => {
      if (!featureUsage) return [];

      const sortedFeatures = [...featureUsage]
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit)
        .map((usage) => ({
          feature: usage.feature_name,
          count: usage.usage_count,
          timeSaved: usage.time_saved_minutes,
        }));

      return sortedFeatures;
    },
    [featureUsage],
  );

  const getCompletionRate = useCallback((): number => {
    if (!milestones) return 0;
    const achievedCount = milestones.filter((m) => m.achieved).length;
    return milestones.length > 0
      ? (achievedCount / milestones.length) * 100
      : 0;
  }, [milestones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      // Attempt to flush remaining events before unmounting
      if (pendingEvents.length > 0) {
        flushPendingEvents();
      }
    };
  }, []);

  return {
    // Activity tracking
    trackFeatureUsage,
    achieveMilestone,
    trackPageView,
    trackAction,

    // Batch operations
    flushPendingEvents,
    clearPendingEvents,

    // Data retrieval
    featureUsage,
    milestones,
    isLoading,
    error,

    // Analytics
    getTotalTimeSaved,
    getMostUsedFeatures,
    getCompletionRate,

    // State
    pendingEventsCount: pendingEvents.length,
    isTracking,
  };
}

export default useTrialActivity;
