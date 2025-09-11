/**
 * WS-140 Trial Management System - Trial Status Hook
 * Manages trial status, progress tracking, and real-time updates
 * Follows codebase patterns with SWR caching and Supabase realtime
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { TrialStatusResponse, TrialStatus, TrialProgress } from '@/types/trial';

interface UseTrialStatusOptions {
  refreshInterval?: number;
  enabled?: boolean;
  realtimeUpdates?: boolean;
}

interface UseTrialStatusReturn {
  data: TrialStatusResponse | null;
  progress: TrialProgress | null;
  status: TrialStatus | null;
  daysRemaining: number;
  progressPercentage: number;
  urgencyScore: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  shouldShowUpgrade: boolean;
}

export function useTrialStatus(
  options: UseTrialStatusOptions = {},
): UseTrialStatusReturn {
  const {
    refreshInterval = 300000, // 5 minutes default
    enabled = true,
    realtimeUpdates = true,
  } = options;

  const [realTimeUpdates, setRealTimeUpdates] = useState(0);
  const supabase = createClient();

  // Main trial status data with SWR caching
  const { data, error, isLoading, mutate } = useSWR<TrialStatusResponse>(
    enabled ? [`/api/trial/status`, realTimeUpdates] : null,
    ([url]) =>
      fetch(url).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch trial status');
        }
        return res.json();
      }),
    {
      refreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryInterval: 30000,
      dedupingInterval: 10000,
    },
  );

  // Real-time subscriptions for trial-related changes
  useEffect(() => {
    if (!realtimeUpdates || !enabled) return;

    const channel = supabase
      .channel('trial-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trial_configs',
        },
        (payload) => {
          setRealTimeUpdates((prev) => prev + 1);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trial_milestones',
        },
        (payload) => {
          mutate();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trial_feature_usage',
        },
        (payload) => {
          mutate();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, mutate, realtimeUpdates, enabled]);

  // Derived values for easy consumption
  const progress = data?.progress || null;
  const trialStatus = data?.trial?.status || null;
  const daysRemaining = progress?.days_remaining || 0;
  const progressPercentage = progress?.progress_percentage || 0;
  const urgencyScore = progress?.urgency_score || 1;

  const isTrialActive = trialStatus === 'active';
  const isTrialExpired = trialStatus === 'expired' || daysRemaining <= 0;
  const shouldShowUpgrade =
    isTrialActive && (urgencyScore >= 3 || daysRemaining <= 7);

  // Refresh function for manual updates
  const refresh = useCallback(() => {
    setRealTimeUpdates((prev) => prev + 1);
    mutate();
  }, [mutate]);

  return {
    data,
    progress,
    status: trialStatus,
    daysRemaining,
    progressPercentage,
    urgencyScore,
    isLoading,
    error: error?.message || null,
    refresh,
    isTrialActive,
    isTrialExpired,
    shouldShowUpgrade,
  };
}

export default useTrialStatus;
