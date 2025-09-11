'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CohortData,
  CohortAnalysisResult,
  CohortMetric,
  AutomatedInsight,
  CohortTrend,
  CohortDetailMetrics,
  CohortAnalysisFilters,
} from '@/types/cohort-analysis';

interface UseCohortAnalyticsOptions {
  initialMetric?: CohortMetric;
  initialTimeRange?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCohortAnalyticsReturn {
  // Data
  cohortData: CohortData[];
  analysisResult: CohortAnalysisResult | null;
  insights: AutomatedInsight[];
  trends: CohortTrend[];
  detailMetrics: CohortDetailMetrics | null;

  // State
  selectedMetric: CohortMetric;
  selectedTimeRange: number;
  selectedCohort: CohortData | null;
  filters: CohortAnalysisFilters;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setSelectedMetric: (metric: CohortMetric) => void;
  setSelectedTimeRange: (range: number) => void;
  setSelectedCohort: (cohort: CohortData | null) => void;
  updateFilters: (filters: Partial<CohortAnalysisFilters>) => void;
  refreshData: () => Promise<void>;
  exportData: (format: 'json' | 'csv' | 'excel') => Promise<void>;

  // Computed values
  filteredCohortData: CohortData[];
  performanceMetrics: {
    bestPerformingCohort: CohortData | null;
    worstPerformingCohort: CohortData | null;
    averageRetention: number;
    totalRevenue: number;
  };
}

export const useCohortAnalytics = (
  options: UseCohortAnalyticsOptions = {},
): UseCohortAnalyticsReturn => {
  const {
    initialMetric = 'retention',
    initialTimeRange = 12,
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutes
  } = options;

  // State
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [analysisResult, setAnalysisResult] =
    useState<CohortAnalysisResult | null>(null);
  const [insights, setInsights] = useState<AutomatedInsight[]>([]);
  const [trends, setTrends] = useState<CohortTrend[]>([]);
  const [detailMetrics, setDetailMetrics] =
    useState<CohortDetailMetrics | null>(null);

  const [selectedMetric, setSelectedMetric] =
    useState<CohortMetric>(initialMetric);
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<number>(initialTimeRange);
  const [selectedCohort, setSelectedCohort] = useState<CohortData | null>(null);
  const [filters, setFilters] = useState<CohortAnalysisFilters>({
    date_range: {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    supplier_categories: [],
    min_cohort_size: 10,
    selected_metric: initialMetric,
    time_range_months: initialTimeRange,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Mock data fetching function - replace with actual API calls
  const fetchCohortData = useCallback(async (): Promise<CohortData[]> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock data - replace with actual API call
    return [
      {
        cohort_start: '2024-01-01',
        cohort_size: 156,
        retention_rates: [
          1.0, 0.89, 0.82, 0.78, 0.75, 0.72, 0.69, 0.66, 0.63, 0.61, 0.58, 0.55,
        ],
        revenue_progression: [
          45000, 52000, 58000, 62000, 65000, 68000, 70000, 72000, 74000, 76000,
          77000, 78000,
        ],
        ltv_calculated: 4850,
        supplier_category: 'photographer',
        seasonal_cohort: 'Q1',
        months_tracked: 12,
      },
      {
        cohort_start: '2024-02-01',
        cohort_size: 142,
        retention_rates: [
          1.0, 0.91, 0.85, 0.81, 0.78, 0.75, 0.73, 0.7, 0.68, 0.65, 0.62, 0.59,
        ],
        revenue_progression: [
          48000, 55000, 61000, 66000, 69000, 72000, 75000, 77000, 79000, 81000,
          82000, 84000,
        ],
        ltv_calculated: 5120,
        supplier_category: 'venue',
        seasonal_cohort: 'Q1',
        months_tracked: 11,
      },
      {
        cohort_start: '2024-03-01',
        cohort_size: 198,
        retention_rates: [
          1.0, 0.94, 0.88, 0.84, 0.81, 0.79, 0.76, 0.74, 0.71, 0.69, 0.66,
        ],
        revenue_progression: [
          52000, 59000, 65000, 71000, 75000, 79000, 82000, 85000, 88000, 91000,
          93000,
        ],
        ltv_calculated: 5680,
        supplier_category: 'caterer',
        seasonal_cohort: 'Q1',
        months_tracked: 10,
      },
      {
        cohort_start: '2024-04-01',
        cohort_size: 223,
        retention_rates: [
          1.0, 0.96, 0.91, 0.87, 0.84, 0.82, 0.79, 0.77, 0.75, 0.72,
        ],
        revenue_progression: [
          58000, 66000, 73000, 79000, 84000, 89000, 93000, 97000, 100000,
          103000,
        ],
        ltv_calculated: 6250,
        supplier_category: 'florist',
        seasonal_cohort: 'Q2',
        months_tracked: 9,
      },
    ];
  }, []);

  // Fetch analysis insights
  const fetchInsights = useCallback(
    async (cohorts: CohortData[]): Promise<AutomatedInsight[]> => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      return [
        {
          id: 'insight-1',
          type: 'opportunity',
          title: 'Q2 Peak Performance Opportunity',
          description:
            'April cohorts show 84% retention vs 71% average, indicating optimal onboarding conditions during peak wedding season.',
          impact_score: 9,
          actionable_recommendation:
            'Increase marketing spend by 40% in March-April to capitalize on peak season supplier conversion rates.',
          affected_cohorts: ['2024-04-01'],
          confidence_level: 0.92,
        },
        {
          id: 'insight-2',
          type: 'warning',
          title: 'January Cohort Underperformance',
          description:
            'January 2024 cohort showing 15% below average retention, likely due to post-holiday supplier acquisition challenges.',
          impact_score: 7,
          actionable_recommendation:
            'Implement enhanced onboarding program for Q1 suppliers including personalized success manager assignment.',
          affected_cohorts: ['2024-01-01'],
          confidence_level: 0.85,
        },
      ];
    },
    [],
  );

  // Fetch trends
  const fetchTrends = useCallback(async (): Promise<CohortTrend[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return [
      {
        metric: 'retention',
        trend_direction: 'improving',
        period_comparison: 'vs Previous Quarter',
        change_percentage: 8.5,
        statistical_significance: 0.89,
      },
      {
        metric: 'revenue',
        trend_direction: 'improving',
        period_comparison: 'vs Previous Quarter',
        change_percentage: 12.3,
        statistical_significance: 0.94,
      },
      {
        metric: 'ltv',
        trend_direction: 'improving',
        period_comparison: 'vs Previous Quarter',
        change_percentage: 15.7,
        statistical_significance: 0.91,
      },
    ];
  }, []);

  // Generate analysis result
  const generateAnalysisResult = useCallback(
    (cohorts: CohortData[]): CohortAnalysisResult => {
      const totalSuppliers = cohorts.reduce(
        (sum, cohort) => sum + cohort.cohort_size,
        0,
      );
      const averageRetention =
        cohorts.reduce((sum, cohort) => {
          const latestRetention =
            cohort.retention_rates[cohort.retention_rates.length - 1] || 0;
          return sum + latestRetention;
        }, 0) / cohorts.length;

      const bestCohort = cohorts.reduce((best, cohort) => {
        const cohortRetention =
          cohort.retention_rates[cohort.retention_rates.length - 1] || 0;
        const bestRetention =
          best.retention_rates[best.retention_rates.length - 1] || 0;
        return cohortRetention > bestRetention ? cohort : best;
      });

      const worstCohort = cohorts.reduce((worst, cohort) => {
        const cohortRetention =
          cohort.retention_rates[cohort.retention_rates.length - 1] || 1;
        const worstRetention =
          worst.retention_rates[worst.retention_rates.length - 1] || 1;
        return cohortRetention < worstRetention ? cohort : worst;
      });

      const totalRevenue = cohorts.reduce((sum, cohort) => {
        return (
          sum +
          cohort.revenue_progression.reduce(
            (cohortSum, rev) => cohortSum + rev,
            0,
          )
        );
      }, 0);

      // Calculate seasonal insights
      const seasonalGroups = cohorts.reduce(
        (groups, cohort) => {
          const quarter = cohort.seasonal_cohort || 'Q1';
          if (!groups[quarter]) groups[quarter] = [];
          groups[quarter].push(cohort);
          return groups;
        },
        {} as Record<string, CohortData[]>,
      );

      const seasonalAvgs = Object.entries(seasonalGroups).reduce(
        (avgs, [quarter, cohorts]) => {
          const avg =
            cohorts.reduce((sum, cohort) => {
              const latestRetention =
                cohort.retention_rates[cohort.retention_rates.length - 1] || 0;
              return sum + latestRetention;
            }, 0) / cohorts.length;
          avgs[quarter.toLowerCase() + '_average_retention'] = avg;
          return avgs;
        },
        {} as Record<string, number>,
      );

      return {
        cohorts,
        overall_metrics: {
          average_retention: averageRetention,
          best_cohort_month: bestCohort.cohort_start,
          worst_cohort_month: worstCohort.cohort_start,
          total_suppliers_analyzed: totalSuppliers,
          revenue_attribution_total: totalRevenue,
        },
        seasonal_insights: {
          q1_average_retention: seasonalAvgs.q1_average_retention || 0,
          q2_average_retention: seasonalAvgs.q2_average_retention || 0,
          q3_average_retention: seasonalAvgs.q3_average_retention || 0,
          q4_average_retention: seasonalAvgs.q4_average_retention || 0,
          peak_season_performance: 'Q2 (April-June)',
        },
      };
    },
    [],
  );

  // Main data refresh function
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      setIsRefreshing(true);

      // Fetch all data concurrently
      const [cohortsData, trendsData] = await Promise.all([
        fetchCohortData(),
        fetchTrends(),
      ]);

      // Generate analysis and insights
      const analysis = generateAnalysisResult(cohortsData);
      const insightsData = await fetchInsights(cohortsData);

      // Update state
      setCohortData(cohortsData);
      setAnalysisResult(analysis);
      setInsights(insightsData);
      setTrends(trendsData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch cohort data',
      );
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [fetchCohortData, fetchInsights, fetchTrends, generateAnalysisResult]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    refreshData();
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Update filters when metric/time range changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      selected_metric: selectedMetric,
      time_range_months: selectedTimeRange,
    }));
  }, [selectedMetric, selectedTimeRange]);

  // Generate detail metrics when cohort is selected
  useEffect(() => {
    if (!selectedCohort) {
      setDetailMetrics(null);
      return;
    }

    // Mock detail metrics generation
    const mockDetailMetrics: CohortDetailMetrics = {
      cohort: selectedCohort,
      individual_suppliers: Array.from({ length: 15 }, (_, i) => ({
        supplier_id: `SUP-${selectedCohort.cohort_start.slice(0, 7).replace('-', '')}-${(i + 1).toString().padStart(3, '0')}`,
        signup_date: selectedCohort.cohort_start,
        current_status: i < 10 ? 'active' : i < 13 ? 'at_risk' : 'churned',
        revenue_contribution: Math.floor(Math.random() * 50000) + 10000,
        retention_score: Math.random() * 0.4 + 0.6,
        category: selectedCohort.supplier_category || 'photographer',
      })),
      retention_curve: Array.from({ length: selectedTimeRange }, (_, i) => ({
        month: i + 1,
        retention_percentage: (selectedCohort.retention_rates[i] || 0.8) * 100,
        revenue_per_supplier:
          (selectedCohort.revenue_progression[i] || 50000) /
          selectedCohort.cohort_size,
      })),
      benchmark_comparison: {
        vs_average_retention: 0.08,
        vs_previous_cohort: 0.05,
        performance_percentile: 75,
      },
    };

    setDetailMetrics(mockDetailMetrics);
  }, [selectedCohort, selectedTimeRange]);

  // Update filters helper
  const updateFilters = useCallback(
    (newFilters: Partial<CohortAnalysisFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    [],
  );

  // Export functionality
  const exportData = useCallback(
    async (format: 'json' | 'csv' | 'excel') => {
      try {
        const exportData = {
          analysis_type: selectedMetric,
          time_range: selectedTimeRange,
          cohorts: cohortData,
          analysis_result: analysisResult,
          insights: insights,
          trends: trends,
          filters: filters,
          generated_at: new Date().toISOString(),
        };

        let blob: Blob;
        let filename: string;

        switch (format) {
          case 'json':
            blob = new Blob([JSON.stringify(exportData, null, 2)], {
              type: 'application/json',
            });
            filename = `cohort-analysis-${selectedMetric}-${new Date().toISOString().slice(0, 10)}.json`;
            break;
          case 'csv':
            // Simple CSV export of cohort data
            const csvHeaders = [
              'Cohort Start',
              'Cohort Size',
              'Current Retention',
              'LTV',
              'Category',
            ];
            const csvRows = cohortData.map((cohort) => [
              cohort.cohort_start,
              cohort.cohort_size,
              (
                (cohort.retention_rates[cohort.retention_rates.length - 1] ||
                  0) * 100
              ).toFixed(2) + '%',
              cohort.ltv_calculated,
              cohort.supplier_category || 'N/A',
            ]);
            const csvContent = [csvHeaders, ...csvRows]
              .map((row) => row.join(','))
              .join('\n');
            blob = new Blob([csvContent], { type: 'text/csv' });
            filename = `cohort-analysis-${selectedMetric}-${new Date().toISOString().slice(0, 10)}.csv`;
            break;
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }

        // Create download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export failed:', err);
        throw err;
      }
    },
    [
      selectedMetric,
      selectedTimeRange,
      cohortData,
      analysisResult,
      insights,
      trends,
      filters,
    ],
  );

  // Filtered cohort data based on current filters
  const filteredCohortData = useMemo(() => {
    return cohortData.filter((cohort) => {
      // Date range filter
      const cohortDate = new Date(cohort.cohort_start);
      const startDate = new Date(filters.date_range.start);
      const endDate = new Date(filters.date_range.end);

      if (cohortDate < startDate || cohortDate > endDate) {
        return false;
      }

      // Cohort size filter
      if (cohort.cohort_size < filters.min_cohort_size) {
        return false;
      }

      // Category filter
      if (
        filters.supplier_categories.length > 0 &&
        !filters.supplier_categories.includes(cohort.supplier_category || '')
      ) {
        return false;
      }

      return true;
    });
  }, [cohortData, filters]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (filteredCohortData.length === 0) {
      return {
        bestPerformingCohort: null,
        worstPerformingCohort: null,
        averageRetention: 0,
        totalRevenue: 0,
      };
    }

    const bestCohort = filteredCohortData.reduce((best, cohort) => {
      const cohortRetention =
        cohort.retention_rates[cohort.retention_rates.length - 1] || 0;
      const bestRetention =
        best.retention_rates[best.retention_rates.length - 1] || 0;
      return cohortRetention > bestRetention ? cohort : best;
    });

    const worstCohort = filteredCohortData.reduce((worst, cohort) => {
      const cohortRetention =
        cohort.retention_rates[cohort.retention_rates.length - 1] || 1;
      const worstRetention =
        worst.retention_rates[worst.retention_rates.length - 1] || 1;
      return cohortRetention < worstRetention ? cohort : worst;
    });

    const averageRetention =
      filteredCohortData.reduce((sum, cohort) => {
        const latestRetention =
          cohort.retention_rates[cohort.retention_rates.length - 1] || 0;
        return sum + latestRetention;
      }, 0) / filteredCohortData.length;

    const totalRevenue = filteredCohortData.reduce((sum, cohort) => {
      return (
        sum +
        cohort.revenue_progression.reduce(
          (cohortSum, rev) => cohortSum + rev,
          0,
        )
      );
    }, 0);

    return {
      bestPerformingCohort: bestCohort,
      worstPerformingCohort: worstCohort,
      averageRetention,
      totalRevenue,
    };
  }, [filteredCohortData]);

  return {
    // Data
    cohortData,
    analysisResult,
    insights,
    trends,
    detailMetrics,

    // State
    selectedMetric,
    selectedTimeRange,
    selectedCohort,
    filters,

    // Loading states
    isLoading,
    isRefreshing,
    error,
    lastUpdated,

    // Actions
    setSelectedMetric,
    setSelectedTimeRange,
    setSelectedCohort,
    updateFilters,
    refreshData,
    exportData,

    // Computed values
    filteredCohortData,
    performanceMetrics,
  };
};
