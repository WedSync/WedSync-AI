'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  WeddingMetrics,
  VendorInviteConversion,
  WeddingViralPattern,
  WeddingSeasonMetrics,
} from '@/types/platform-scaling';

export interface WeddingMetricsState {
  isLoading: boolean;
  metrics: WeddingMetrics | null;
  seasonMetrics: WeddingSeasonMetrics | null;
  viralPatterns: WeddingViralPattern[];
  conversions: VendorInviteConversion[];
  error: string | null;
}

export interface WeddingMetricsActions {
  refreshMetrics: () => Promise<void>;
  trackViralGrowth: (pattern: WeddingViralPattern) => Promise<void>;
  recordConversion: (conversion: VendorInviteConversion) => Promise<void>;
  resetError: () => void;
}

export function useWeddingMetrics(): WeddingMetricsState &
  WeddingMetricsActions {
  const [state, setState] = useState<WeddingMetricsState>({
    isLoading: true,
    metrics: null,
    seasonMetrics: null,
    viralPatterns: [],
    conversions: [],
    error: null,
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Fetch wedding metrics from multiple sources
  const fetchWeddingMetrics = useCallback(async (): Promise<WeddingMetrics> => {
    try {
      // Get active Saturday weddings
      const today = new Date();
      const isSaturday = today.getDay() === 6;

      const { data: weddingData } = await supabase
        .from('weddings')
        .select('id, wedding_date, status, vendor_count')
        .eq('status', 'active')
        .gte('wedding_date', today.toISOString().split('T')[0])
        .lte(
          'wedding_date',
          new Date(today.getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        );

      // Get viral referral metrics
      const { data: referralData } = await supabase
        .from('vendor_invites')
        .select('conversion_rate, invite_source, created_at')
        .gte(
          'created_at',
          new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // Calculate viral referral rate
      const totalInvites = referralData?.length || 0;
      const conversions =
        referralData?.filter((r) => r.conversion_rate > 0).length || 0;
      const viralReferralRate =
        totalInvites > 0 ? (conversions / totalInvites) * 100 : 0;

      // Check if peak season
      const currentMonth = today.getMonth();
      const peakMonths = [4, 5, 6, 7, 8, 9]; // May through October
      const peakSeasonActive = peakMonths.includes(currentMonth);

      // Get vendor activity
      const { data: vendorActivity } = await supabase
        .from('user_profiles')
        .select('id, last_active_at, subscription_tier')
        .eq('user_type', 'vendor')
        .gte(
          'last_active_at',
          new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        );

      return {
        activeSaturdayWeddings: isSaturday ? weddingData?.length || 0 : 0,
        viralReferralRate,
        peakSeasonActive,
        totalWeddingsToday: weddingData?.length || 0,
        averageVendorCount:
          weddingData?.reduce((acc, w) => acc + (w.vendor_count || 0), 0) /
          (weddingData?.length || 1),
        activeVendorsToday: vendorActivity?.length || 0,
        conversionMetrics: {
          inviteToSignup: viralReferralRate,
          signupToActive: 75, // Default value - would calculate from user journey data
          freeToTrial: 65,
          trialToPaid: 45,
        },
      };
    } catch (error) {
      console.error('Failed to fetch wedding metrics:', error);
      throw error;
    }
  }, [supabase]);

  // Fetch seasonal wedding metrics
  const fetchSeasonMetrics =
    useCallback(async (): Promise<WeddingSeasonMetrics> => {
      try {
        const currentYear = new Date().getFullYear();

        // Get wedding bookings by month
        const { data: bookingsData } = await supabase
          .from('weddings')
          .select('wedding_date, vendor_count, budget_total')
          .gte('wedding_date', `${currentYear}-01-01`)
          .lte('wedding_date', `${currentYear}-12-31`);

        const monthlyBookings = Array.from({ length: 12 }, (_, i) => {
          const monthData =
            bookingsData?.filter(
              (b) => new Date(b.wedding_date).getMonth() === i,
            ) || [];

          return {
            month: i + 1,
            bookingCount: monthData.length,
            averageVendorCount:
              monthData.reduce((acc, w) => acc + (w.vendor_count || 0), 0) /
              (monthData.length || 1),
            averageBudget:
              monthData.reduce((acc, w) => acc + (w.budget_total || 0), 0) /
              (monthData.length || 1),
          };
        });

        const peakMonths = monthlyBookings
          .sort((a, b) => b.bookingCount - a.bookingCount)
          .slice(0, 6)
          .map((m) => m.month);

        const totalBookings = monthlyBookings.reduce(
          (acc, m) => acc + m.bookingCount,
          0,
        );
        const averageBookingsPerMonth = totalBookings / 12;

        return {
          currentSeason: getCurrentSeason(),
          peakMonths,
          totalBookingsThisYear: totalBookings,
          averageBookingsPerMonth,
          monthlyTrends: monthlyBookings,
          seasonalGrowthRate: calculateSeasonalGrowthRate(monthlyBookings),
        };
      } catch (error) {
        console.error('Failed to fetch season metrics:', error);
        throw error;
      }
    }, [supabase]);

  // Helper functions
  const getCurrentSeason = (): 'peak' | 'moderate' | 'low' => {
    const month = new Date().getMonth();
    if ([4, 5, 6, 7, 8, 9].includes(month)) return 'peak';
    if ([2, 3, 10, 11].includes(month)) return 'moderate';
    return 'low';
  };

  const calculateSeasonalGrowthRate = (monthlyData: any[]): number => {
    if (monthlyData.length < 2) return 0;
    const recent = monthlyData
      .slice(-3)
      .reduce((acc, m) => acc + m.bookingCount, 0);
    const previous = monthlyData
      .slice(-6, -3)
      .reduce((acc, m) => acc + m.bookingCount, 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const [metrics, seasonMetrics] = await Promise.all([
          fetchWeddingMetrics(),
          fetchSeasonMetrics(),
        ]);

        // Get viral patterns from database
        const { data: patternsData } = await supabase
          .from('viral_patterns')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        // Get recent conversions
        const { data: conversionsData } = await supabase
          .from('vendor_invite_conversions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          metrics,
          seasonMetrics,
          viralPatterns: patternsData || [],
          conversions: conversionsData || [],
        }));
      } catch (error) {
        console.error('Failed to load wedding metrics:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load wedding metrics',
        }));
      }
    };

    loadInitialData();
  }, [fetchWeddingMetrics, fetchSeasonMetrics, supabase]);

  // Set up real-time subscriptions for wedding events
  useEffect(() => {
    const weddingChannel = supabase
      .channel('wedding-metrics-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weddings' },
        () => {
          // Refresh metrics when new wedding is added
          refreshMetrics();
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vendor_invites' },
        (payload) => {
          // Real-time viral pattern tracking
          setState((prev) => ({
            ...prev,
            metrics: prev.metrics
              ? {
                  ...prev.metrics,
                  viralReferralRate: prev.metrics.viralReferralRate + 0.1,
                }
              : null,
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(weddingChannel);
    };
  }, [supabase]);

  // Periodic metrics refresh (every 2 minutes)
  useEffect(() => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const metrics = await fetchWeddingMetrics();
        setState((prev) => ({ ...prev, metrics }));
      } catch (error) {
        console.error('Periodic metrics refresh failed:', error);
      }
    }, 120000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchWeddingMetrics]);

  const refreshMetrics = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const [metrics, seasonMetrics] = await Promise.all([
        fetchWeddingMetrics(),
        fetchSeasonMetrics(),
      ]);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        metrics,
        seasonMetrics,
      }));
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to refresh wedding metrics',
      }));
    }
  }, [fetchWeddingMetrics, fetchSeasonMetrics]);

  const trackViralGrowth = useCallback(
    async (pattern: WeddingViralPattern) => {
      try {
        const { error } = await supabase.from('viral_patterns').insert({
          pattern_type: pattern.pattern_type,
          expected_growth_multiplier: pattern.expected_growth_multiplier,
          duration_hours: pattern.duration_hours,
          geographic_impact: pattern.geographic_impact,
          trigger_event: pattern.trigger_event,
        });

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          viralPatterns: [pattern, ...prev.viralPatterns.slice(0, 9)],
        }));
      } catch (error) {
        console.error('Failed to track viral growth:', error);
        setState((prev) => ({
          ...prev,
          error: 'Failed to track viral growth pattern',
        }));
      }
    },
    [supabase],
  );

  const recordConversion = useCallback(
    async (conversion: VendorInviteConversion) => {
      try {
        const { error } = await supabase
          .from('vendor_invite_conversions')
          .insert({
            invite_id: conversion.invite_id,
            vendor_id: conversion.vendor_id,
            couple_id: conversion.couple_id,
            conversion_stage: conversion.conversion_stage,
            conversion_rate: conversion.conversion_rate,
            time_to_convert_hours: conversion.time_to_convert_hours,
          });

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          conversions: [conversion, ...prev.conversions.slice(0, 49)],
        }));
      } catch (error) {
        console.error('Failed to record conversion:', error);
        setState((prev) => ({ ...prev, error: 'Failed to record conversion' }));
      }
    },
    [supabase],
  );

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refreshMetrics,
    trackViralGrowth,
    recordConversion,
    resetError,
  };
}
