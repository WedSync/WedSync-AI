'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WeddingPlatformScalabilityOrchestrator } from '@/lib/platform/scalability-orchestrator';
import type {
  PlatformScalingMetrics,
  WeddingSeasonMetrics,
  ScalingDecision,
  WeddingProtectionStatus,
} from '@/types/platform-scaling';

export interface PlatformScalingState {
  isLoading: boolean;
  metrics: PlatformScalingMetrics | null;
  weddingProtection: WeddingProtectionStatus;
  lastDecision: ScalingDecision | null;
  error: string | null;
}

export interface PlatformScalingActions {
  refreshMetrics: () => Promise<void>;
  enableWeddingProtection: () => Promise<void>;
  disableWeddingProtection: () => Promise<void>;
  triggerScalingDecision: () => Promise<void>;
  resetError: () => void;
}

export function usePlatformScaling(): PlatformScalingState &
  PlatformScalingActions {
  const [state, setState] = useState<PlatformScalingState>({
    isLoading: true,
    metrics: null,
    weddingProtection: {
      isActive: false,
      activatedBy: '',
      activatedAt: '',
      reason: '',
      affectedSystems: [],
    },
    lastDecision: null,
    error: null,
  });

  const orchestratorRef = useRef<WeddingPlatformScalabilityOrchestrator | null>(
    null,
  );
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Initialize orchestrator
  useEffect(() => {
    const initializeOrchestrator = async () => {
      try {
        if (!orchestratorRef.current) {
          orchestratorRef.current = new WeddingPlatformScalabilityOrchestrator({
            projectId: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || '',
            region: 'us-east-1',
            scalingThresholds: {
              cpu: 70,
              memory: 80,
              requests: 1000,
              errors: 1,
              weddingDayMultiplier: 2.0,
            },
            enableWeddingProtection: true,
            emergencyContacts: ['admin@wedsync.com'],
          });

          await orchestratorRef.current.initialize();
        }
      } catch (error) {
        console.error('Failed to initialize platform orchestrator:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize platform scaling',
        }));
      }
    };

    initializeOrchestrator();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Real-time metrics polling
  useEffect(() => {
    if (!orchestratorRef.current) return;

    const pollMetrics = async () => {
      try {
        const metrics = await orchestratorRef.current!.getCurrentMetrics();
        const protectionStatus =
          await orchestratorRef.current!.getWeddingProtectionStatus();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          metrics,
          weddingProtection: protectionStatus,
          error: null,
        }));
      } catch (error) {
        console.error('Failed to poll platform metrics:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to refresh platform metrics',
        }));
      }
    };

    // Initial load
    pollMetrics();

    // Poll every 30 seconds for real-time updates
    pollingIntervalRef.current = setInterval(pollMetrics, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [orchestratorRef.current]);

  // Listen for real-time wedding events
  useEffect(() => {
    const channel = supabase
      .channel('wedding-scaling-events')
      .on('broadcast', { event: 'wedding-day-started' }, (payload) => {
        setState((prev) => ({
          ...prev,
          weddingProtection: {
            ...prev.weddingProtection,
            isActive: true,
            reason: `Wedding day protection activated: ${payload.wedding_count} active weddings`,
          },
        }));
      })
      .on('broadcast', { event: 'viral-growth-spike' }, (payload) => {
        setState((prev) => ({
          ...prev,
          metrics: prev.metrics
            ? {
                ...prev.metrics,
                viralGrowthMetrics: {
                  ...prev.metrics.viralGrowthMetrics,
                  currentGrowthRate: payload.growth_rate,
                  activeViralPatterns: payload.patterns,
                },
              }
            : null,
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const refreshMetrics = useCallback(async () => {
    if (!orchestratorRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const metrics = await orchestratorRef.current.getCurrentMetrics();
      const protectionStatus =
        await orchestratorRef.current.getWeddingProtectionStatus();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        metrics,
        weddingProtection: protectionStatus,
      }));
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh platform metrics',
      }));
    }
  }, []);

  const enableWeddingProtection = useCallback(async () => {
    if (!orchestratorRef.current) return;

    try {
      await orchestratorRef.current.enableWeddingProtection(
        'Manual activation by admin',
      );
      await refreshMetrics();
    } catch (error) {
      console.error('Failed to enable wedding protection:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to enable wedding protection',
      }));
    }
  }, [refreshMetrics]);

  const disableWeddingProtection = useCallback(async () => {
    if (!orchestratorRef.current) return;

    try {
      await orchestratorRef.current.disableWeddingProtection();
      await refreshMetrics();
    } catch (error) {
      console.error('Failed to disable wedding protection:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to disable wedding protection',
      }));
    }
  }, [refreshMetrics]);

  const triggerScalingDecision = useCallback(async () => {
    if (!orchestratorRef.current) return;

    try {
      const decision = await orchestratorRef.current.makeScalingDecision();
      setState((prev) => ({ ...prev, lastDecision: decision }));
    } catch (error) {
      console.error('Failed to trigger scaling decision:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to make scaling decision',
      }));
    }
  }, []);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refreshMetrics,
    enableWeddingProtection,
    disableWeddingProtection,
    triggerScalingDecision,
    resetError,
  };
}
