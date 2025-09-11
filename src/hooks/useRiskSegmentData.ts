'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RiskSegmentClient,
  RiskSegmentParams,
  ApiResponse,
} from '@/types/customer-success-api';

interface UseRiskSegmentDataProps extends Partial<RiskSegmentParams> {
  refreshTrigger?: number;
}

interface UseRiskSegmentDataReturn {
  clients: RiskSegmentClient[] | undefined;
  summary: any;
  isLoading: boolean;
  error: string | null;
  pagination: any;
  refetch: (overrides?: Partial<RiskSegmentParams>) => Promise<void>;
}

export function useRiskSegmentData({
  riskLevel,
  searchQuery = '',
  sortBy = 'score',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
  includeFactors = false,
  refreshTrigger = 0,
}: UseRiskSegmentDataProps = {}): UseRiskSegmentDataReturn {
  const [clients, setClients] = useState<RiskSegmentClient[] | undefined>();
  const [summary, setSummary] = useState<any>();
  const [pagination, setPagination] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (overrides: Partial<RiskSegmentParams> = {}) => {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          risk_level: riskLevel,
          search: searchQuery,
          sort_by: sortBy,
          sort_order: sortOrder,
          page: page,
          limit: limit,
          include_factors: includeFactors,
          ...overrides,
        };

        // Build URL with parameters
        const url = new URL(
          '/api/admin/customer-success/risk-segments',
          window.location.origin,
        );

        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value.toString());
          }
        });

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          } else if (response.status === 403) {
            throw new Error('Admin access required');
          } else {
            throw new Error(`API error: ${response.status}`);
          }
        }

        const data: ApiResponse<RiskSegmentClient[]> = await response.json();

        setClients(data.data);
        setSummary(data.summary);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Error fetching risk segment data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred while fetching data',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [riskLevel, searchQuery, sortBy, sortOrder, page, limit, includeFactors],
  );

  const refetch = useCallback(
    async (overrides: Partial<RiskSegmentParams> = {}) => {
      await fetchData(overrides);
    },
    [fetchData],
  );

  // Initial load and refresh trigger
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  // Search query debounce
  useEffect(() => {
    if (searchQuery !== undefined) {
      const timeoutId = setTimeout(() => {
        fetchData({ page: 1 }); // Reset to first page on search
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, fetchData]);

  return {
    clients,
    summary,
    isLoading,
    error,
    pagination,
    refetch,
  };
}
