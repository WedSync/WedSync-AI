// WS-181 Cohort Analysis System - Component Exports
// Team A - Admin Analytics Components

export { default as CohortAnalysisDashboard } from './CohortAnalysisDashboard';
export { default as CohortAnalysisHeatmap } from './CohortAnalysisHeatmap';
export { default as CohortMetricsSelector } from './CohortMetricsSelector';
export { default as CohortInsightsPanel } from './CohortInsightsPanel';
export { default as CohortDetailModal } from './CohortDetailModal';

// Re-export types for convenience
export type {
  CohortData,
  CohortAnalysisResult,
  CohortDetailMetrics,
  AutomatedInsight,
  CohortTrend,
  CohortMetric,
  TimeRange,
  CohortHeatmapCell,
  CohortAnalysisFilters,
  CohortExportData,
} from '@/types/cohort-analysis';
