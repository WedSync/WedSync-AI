'use client';

/**
 * WS-224: Progress Charts System - Data Management Hook
 * Custom hook for managing wedding progress data with real-time updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  WeddingMilestone,
  TaskProgress,
  BudgetItem,
  VendorMetric,
  ProgressOverview,
  ProgressTimelineData,
  ProgressAlerts,
  ProgressFilter,
  WeddingMetrics,
  ProgressChartsApiResponse,
} from '@/types/charts';

interface UseProgressDataProps {
  weddingId?: string;
  organizationId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseProgressDataReturn {
  // Data
  overview: ProgressOverview | null;
  milestones: WeddingMilestone[];
  tasks: TaskProgress[];
  budget: BudgetItem[];
  vendors: VendorMetric[];
  timeline: ProgressTimelineData[];
  alerts: ProgressAlerts | null;
  weddingMetrics: WeddingMetrics | null;

  // State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  refetch: () => Promise<void>;
  applyFilter: (filter: ProgressFilter) => void;
  clearFilter: () => void;

  // Computed values
  progressPercentage: number;
  onTrackStatus: boolean;
  criticalIssues: number;
  upcomingDeadlines: WeddingMilestone[];
  budgetUtilization: number;
}

export function useProgressData({
  weddingId,
  organizationId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}: UseProgressDataProps = {}): UseProgressDataReturn {
  const [data, setData] = useState<ProgressChartsApiResponse | null>(null);
  const [filteredData, setFilteredData] =
    useState<ProgressChartsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentFilter, setCurrentFilter] = useState<ProgressFilter | null>(
    null,
  );

  const supabase = createClientComponentClient();

  // Fetch progress data from API
  const fetchProgressData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (weddingId) params.append('weddingId', weddingId);
      if (organizationId) params.append('organizationId', organizationId);

      const response = await fetch(
        `/api/progress/charts?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch progress data: ${response.statusText}`,
        );
      }

      const progressData: ProgressChartsApiResponse = await response.json();

      setData(progressData);
      setLastUpdated(new Date());

      // Apply current filter if exists
      if (currentFilter) {
        applyFilterToData(progressData, currentFilter);
      } else {
        setFilteredData(progressData);
      }
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [weddingId, organizationId, currentFilter]);

  // Apply filter to data
  const applyFilterToData = useCallback(
    (sourceData: ProgressChartsApiResponse, filter: ProgressFilter) => {
      const filtered: ProgressChartsApiResponse = {
        ...sourceData,
        milestones: sourceData.milestones.filter((milestone) => {
          // Date range filter
          const milestoneDate = new Date(milestone.dueDate);
          if (
            milestoneDate < filter.dateRange.start ||
            milestoneDate > filter.dateRange.end
          ) {
            return false;
          }

          // Category filter
          if (
            filter.categories.length > 0 &&
            !filter.categories.includes(milestone.category)
          ) {
            return false;
          }

          // Status filter
          if (
            filter.status.length > 0 &&
            !filter.status.includes(milestone.status)
          ) {
            return false;
          }

          // Assigned to filter
          if (filter.assignedTo && milestone.assignedTo !== filter.assignedTo) {
            return false;
          }

          return true;
        }),

        tasks: sourceData.tasks.filter((task) => {
          const taskDate = new Date(task.createdAt);
          if (
            taskDate < filter.dateRange.start ||
            taskDate > filter.dateRange.end
          ) {
            return false;
          }

          if (
            filter.categories.length > 0 &&
            !filter.categories.includes(task.category)
          ) {
            return false;
          }

          return true;
        }),

        budget: sourceData.budget.filter((item) => {
          if (
            filter.categories.length > 0 &&
            !filter.categories.includes(item.category)
          ) {
            return false;
          }
          return true;
        }),
      };

      setFilteredData(filtered);
    },
    [],
  );

  // Apply filter
  const applyFilter = useCallback(
    (filter: ProgressFilter) => {
      setCurrentFilter(filter);
      if (data) {
        applyFilterToData(data, filter);
      }
    },
    [data, applyFilterToData],
  );

  // Clear filter
  const clearFilter = useCallback(() => {
    setCurrentFilter(null);
    setFilteredData(data);
  }, [data]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!autoRefresh || !organizationId) return;

    const channel = supabase
      .channel('progress_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchProgressData();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_milestones',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          fetchProgressData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, organizationId, autoRefresh, fetchProgressData]);

  // Set up periodic refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchProgressData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchProgressData]);

  // Initial fetch
  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  // Computed values
  const computedValues = useMemo(() => {
    const currentData = filteredData || data;
    if (!currentData) {
      return {
        progressPercentage: 0,
        onTrackStatus: false,
        criticalIssues: 0,
        upcomingDeadlines: [],
        budgetUtilization: 0,
      };
    }

    const progressPercentage = currentData.overview?.overallProgress || 0;
    const onTrackStatus = currentData.overview?.onTrack || false;

    const criticalIssues =
      (currentData.alerts?.overdueTasks?.length || 0) +
      (currentData.alerts?.budgetOverruns?.length || 0) +
      (currentData.alerts?.unresponsiveVendors?.length || 0);

    const upcomingDeadlines = currentData.alerts?.upcomingDeadlines || [];
    const budgetUtilization =
      currentData.overview?.totalBudget > 0
        ? (currentData.overview.spentBudget /
            currentData.overview.totalBudget) *
          100
        : 0;

    return {
      progressPercentage,
      onTrackStatus,
      criticalIssues,
      upcomingDeadlines,
      budgetUtilization,
    };
  }, [filteredData, data]);

  // Wedding metrics calculation
  const weddingMetrics = useMemo((): WeddingMetrics | null => {
    const currentData = filteredData || data;
    if (!currentData?.overview) return null;

    const daysRemaining = currentData.overview.daysUntilWedding;
    let planningPhase: WeddingMetrics['planningPhase'] = 'early';

    if (daysRemaining <= 7) planningPhase = 'week_of';
    else if (daysRemaining <= 30) planningPhase = 'final';
    else if (daysRemaining <= 90) planningPhase = 'middle';

    const stressLevel: WeddingMetrics['stressLevel'] =
      computedValues.criticalIssues > 5
        ? 'high'
        : computedValues.criticalIssues > 2
          ? 'medium'
          : 'low';

    return {
      weddingDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000),
      daysRemaining,
      planningPhase,
      guestCount: 100, // This would come from actual wedding data
      venueBooked: currentData.milestones.some(
        (m) => m.category === 'venue' && m.status === 'completed',
      ),
      budgetUtilization: computedValues.budgetUtilization,
      vendorBookingRate: currentData.overview.vendorConfirmationRate,
      timelineAdherence: computedValues.progressPercentage,
      stressLevel,
    };
  }, [filteredData, data, computedValues]);

  return {
    // Data
    overview: (filteredData || data)?.overview || null,
    milestones: (filteredData || data)?.milestones || [],
    tasks: (filteredData || data)?.tasks || [],
    budget: (filteredData || data)?.budget || [],
    vendors: (filteredData || data)?.vendors || [],
    timeline: (filteredData || data)?.timeline || [],
    alerts: (filteredData || data)?.alerts || null,
    weddingMetrics,

    // State
    loading,
    error,
    lastUpdated,

    // Actions
    refetch: fetchProgressData,
    applyFilter,
    clearFilter,

    // Computed values
    ...computedValues,
  };
}

export default useProgressData;
