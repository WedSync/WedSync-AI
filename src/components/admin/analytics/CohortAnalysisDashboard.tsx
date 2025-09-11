'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  CohortData,
  CohortMetric,
  TimeRange,
  CohortAnalysisResult,
  AutomatedInsight,
  CohortTrend,
  CohortDetailMetrics,
} from '@/types/cohort-analysis';
import CohortAnalysisHeatmap from './CohortAnalysisHeatmap';
import CohortMetricsSelector from './CohortMetricsSelector';
import CohortInsightsPanel from './CohortInsightsPanel';
import CohortDetailModal from './CohortDetailModal';
import { BarChart3, RefreshCw, AlertTriangle } from 'lucide-react';

interface CohortAnalysisDashboardProps {
  className?: string;
}

const CohortAnalysisDashboard: React.FC<CohortAnalysisDashboardProps> = ({
  className = '',
}) => {
  // State management
  const [selectedMetric, setSelectedMetric] =
    useState<CohortMetric>('retention');
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(12);
  const [selectedCohort, setSelectedCohort] = useState<CohortData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data - In production, this would come from API calls
  const mockCohortData: CohortData[] = useMemo(
    () => [
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
        seasonal_cohort: 'Q2',
        months_tracked: 9,
      },
    ],
    [],
  );

  // Time range options
  const timeRangeOptions: TimeRange[] = [
    { label: '3M', months: 3, description: '3-month cohort analysis' },
    { label: '6M', months: 6, description: '6-month cohort analysis' },
    { label: '12M', months: 12, description: '12-month cohort analysis' },
    { label: '24M', months: 24, description: '24-month cohort analysis' },
  ];

  // Mock analysis results
  const mockAnalysisResult: CohortAnalysisResult = useMemo(
    () => ({
      cohorts: mockCohortData,
      overall_metrics: {
        average_retention: 0.74,
        best_cohort_month: '2024-04-01',
        worst_cohort_month: '2024-01-01',
        total_suppliers_analyzed: 719,
        revenue_attribution_total: 3850000,
      },
      seasonal_insights: {
        q1_average_retention: 0.71,
        q2_average_retention: 0.84,
        q3_average_retention: 0.68,
        q4_average_retention: 0.76,
        peak_season_performance: 'Q2 (April-June)',
      },
    }),
    [mockCohortData],
  );

  // Mock insights
  const mockInsights: AutomatedInsight[] = [
    {
      id: 'insight-1',
      type: 'opportunity',
      title: 'Q2 Peak Performance Opportunity',
      description:
        'April cohorts show 84% retention vs 71% average, indicating optimal onboarding conditions during peak wedding season.',
      impact_score: 9,
      actionable_recommendation:
        'Increase marketing spend by 40% in March-April to capitalize on peak season supplier conversion rates.',
      affected_cohorts: ['2024-04-01', '2024-05-01'],
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

  // Mock trends
  const mockTrends: CohortTrend[] = [
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

  // Mock detail metrics
  const mockDetailMetrics: CohortDetailMetrics = useMemo(
    () => ({
      cohort: selectedCohort || mockCohortData[0],
      individual_suppliers: Array.from({ length: 15 }, (_, i) => ({
        supplier_id: `SUP-${(selectedCohort?.cohort_start || '2024-01-01').slice(0, 7).replace('-', '')}-${(i + 1).toString().padStart(3, '0')}`,
        signup_date: selectedCohort?.cohort_start || '2024-01-01',
        current_status: i < 10 ? 'active' : i < 13 ? 'at_risk' : 'churned',
        revenue_contribution: Math.floor(Math.random() * 50000) + 10000,
        retention_score: Math.random() * 0.4 + 0.6,
        category: ['photographer', 'venue', 'caterer', 'florist', 'dj'][i % 5],
      })),
      retention_curve: Array.from({ length: selectedTimeRange }, (_, i) => ({
        month: i + 1,
        retention_percentage: (selectedCohort?.retention_rates[i] || 0.8) * 100,
        revenue_per_supplier:
          (selectedCohort?.revenue_progression[i] || 50000) /
          (selectedCohort?.cohort_size || 100),
      })),
      benchmark_comparison: {
        vs_average_retention: 0.08,
        vs_previous_cohort: 0.05,
        performance_percentile: 75,
      },
    }),
    [selectedCohort, selectedTimeRange, mockCohortData],
  );

  // Handlers
  const handleMetricChange = useCallback((metric: CohortMetric) => {
    setSelectedMetric(metric);
  }, []);

  const handleTimeRangeChange = useCallback((range: number) => {
    setSelectedTimeRange(range);
  }, []);

  const handleCohortSelect = useCallback((cohort: CohortData) => {
    setSelectedCohort(cohort);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedCohort(null);
  }, []);

  const handleExport = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock export functionality
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In production, this would trigger actual export
      console.log('Exporting cohort analysis data...');

      // Create download link
      const data = {
        analysis_type: selectedMetric,
        time_range: selectedTimeRange,
        cohorts: mockCohortData,
        insights: mockInsights,
        generated_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cohort-analysis-${selectedMetric}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMetric, selectedTimeRange, mockCohortData, mockInsights]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data refresh
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-primary-600" />
            Cohort Analysis Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Track supplier retention, revenue, and lifetime value by signup
            cohort
          </p>
        </div>

        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <div className="text-sm text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`
              px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200
              rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-all duration-200
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-4 focus:ring-primary-100
              flex items-center space-x-2
            `}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Selector */}
      <CohortMetricsSelector
        selectedMetric={selectedMetric}
        onMetricChange={handleMetricChange}
        timeRangeOptions={timeRangeOptions}
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={handleTimeRangeChange}
        onExport={handleExport}
        isLoading={isLoading}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Heatmap - Takes 2 columns */}
        <div className="xl:col-span-2">
          <CohortAnalysisHeatmap
            cohortData={mockCohortData}
            selectedMetric={selectedMetric}
            timeRange={selectedTimeRange}
            onCohortSelect={handleCohortSelect}
          />
        </div>

        {/* Insights Panel - Takes 1 column */}
        <div className="xl:col-span-1">
          <CohortInsightsPanel
            cohortAnalysis={mockAnalysisResult}
            insights={mockInsights}
            trends={mockTrends}
          />
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-xl flex items-center space-x-4">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <span className="text-gray-900 font-medium">
              Loading cohort analysis...
            </span>
          </div>
        </div>
      )}

      {/* Error State - Mock */}
      {false && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-error-600" />
          <div>
            <p className="text-sm font-medium text-error-900">
              Failed to load cohort data
            </p>
            <p className="text-xs text-error-700">
              Please try refreshing the page or contact support.
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCohort && (
        <CohortDetailModal
          cohort={selectedCohort}
          detailMetrics={mockDetailMetrics}
          isOpen={isModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default CohortAnalysisDashboard;
