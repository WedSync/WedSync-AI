// WS-180 Performance Testing Framework Components
// Main dashboard and orchestration components

export { PerformanceTestDashboard } from './PerformanceTestDashboard';
export { TestExecutionPanel } from './TestExecutionPanel';
export { PerformanceMetricsChart } from './PerformanceMetricsChart';
export { TestResultsTable } from './TestResultsTable';
export { TestProgressIndicator } from './TestProgressIndicator';

// Re-export types for convenience
export type {
  PerformanceTestDashboardProps,
  TestExecutionPanelProps,
  PerformanceMetricsChartProps,
  TestResultsTableProps,
  TestProgressIndicatorProps,
  PerformanceTestRun,
  RunningTest,
  TestConfiguration,
  TestResultFilters,
  PaginationConfig,
  MetricType,
  TestType,
  TestStatus,
  ThresholdBreach,
  PerformanceAlert,
  TestEnvironment,
  PerformanceThreshold,
} from '@/types/performance-testing';
