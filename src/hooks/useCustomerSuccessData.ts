'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DashboardMetrics,
  HealthScoreResponse,
  InterventionResponse,
} from '@/types/customer-success-api';

interface UseCustomerSuccessDataProps {
  searchQuery?: string;
  refreshTrigger?: number;
  initialData?: {
    metrics: DashboardMetrics;
    healthScores: HealthScoreResponse[];
    interventions: InterventionResponse[];
  };
}

interface UseCustomerSuccessDataReturn {
  metrics: DashboardMetrics | undefined;
  healthScores: HealthScoreResponse[] | undefined;
  interventions: InterventionResponse[] | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCustomerSuccessData({
  searchQuery = '',
  refreshTrigger = 0,
  initialData,
}: UseCustomerSuccessDataProps = {}): UseCustomerSuccessDataReturn {
  const [metrics, setMetrics] = useState<DashboardMetrics | undefined>(
    initialData?.metrics,
  );
  const [healthScores, setHealthScores] = useState<
    HealthScoreResponse[] | undefined
  >(initialData?.healthScores);
  const [interventions, setInterventions] = useState<
    InterventionResponse[] | undefined
  >(initialData?.interventions);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch dashboard metrics
      const metricsResponse = await fetch(
        '/api/admin/customer-success/metrics',
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!metricsResponse.ok) {
        throw new Error(`Metrics API error: ${metricsResponse.status}`);
      }

      const metricsData = await metricsResponse.json();
      setMetrics(metricsData.data);

      // Fetch health scores with search
      const healthScoresUrl = new URL(
        '/api/admin/customer-success/health-scores',
        window.location.origin,
      );
      if (searchQuery) {
        healthScoresUrl.searchParams.set('search', searchQuery);
      }
      healthScoresUrl.searchParams.set('limit', '10');
      healthScoresUrl.searchParams.set('sort_by', 'score');
      healthScoresUrl.searchParams.set('sort_order', 'desc');

      const healthScoresResponse = await fetch(healthScoresUrl.toString(), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!healthScoresResponse.ok) {
        throw new Error(
          `Health scores API error: ${healthScoresResponse.status}`,
        );
      }

      const healthScoresData = await healthScoresResponse.json();
      setHealthScores(healthScoresData.data);

      // Fetch interventions
      const interventionsUrl = new URL(
        '/api/admin/customer-success/interventions',
        window.location.origin,
      );
      if (searchQuery) {
        interventionsUrl.searchParams.set('client_search', searchQuery);
      }
      interventionsUrl.searchParams.set('limit', '10');
      interventionsUrl.searchParams.set('sort_by', 'created_at');
      interventionsUrl.searchParams.set('sort_order', 'desc');

      const interventionsResponse = await fetch(interventionsUrl.toString(), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!interventionsResponse.ok) {
        throw new Error(
          `Interventions API error: ${interventionsResponse.status}`,
        );
      }

      const interventionsData = await interventionsResponse.json();
      setInterventions(interventionsData.data);
    } catch (err) {
      console.error('Error fetching customer success data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching data',
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial load and refresh trigger
  useEffect(() => {
    if (!initialData || refreshTrigger > 0) {
      fetchData();
    }
  }, [fetchData, initialData, refreshTrigger]);

  // Search query changes
  useEffect(() => {
    if (searchQuery !== undefined) {
      const timeoutId = setTimeout(() => {
        fetchData();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, fetchData]);

  return {
    metrics,
    healthScores,
    interventions,
    isLoading,
    error,
    refetch,
  };
}
