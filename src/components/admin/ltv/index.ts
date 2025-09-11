// LTV Analytics Components
// Main dashboard components for lifetime value analysis and customer acquisition insights

export { default as LTVDashboard } from './LTVDashboard';
export { default as LTVSegmentAnalyzer } from './LTVSegmentAnalyzer';
export { default as LTVPredictionVisualizer } from './LTVPredictionVisualizer';
export { default as CACRatioTracker } from './CACRatioTracker';
export { default as LTVDistributionChart } from './LTVDistributionChart';

// Named exports for individual components
export { LTVDashboard } from './LTVDashboard';
export { LTVSegmentAnalyzer } from './LTVSegmentAnalyzer';
export { LTVPredictionVisualizer } from './LTVPredictionVisualizer';
export { CACRatioTracker } from './CACRatioTracker';
export { LTVDistributionChart } from './LTVDistributionChart';

// Re-export types for convenience
export type {
  LTVMetrics,
  LTVSegment,
  LTVSegmentAnalysis,
  ChannelCACRatio,
  LTVPredictionModel,
  LTVPrediction,
  ConfidenceInterval,
  ValidationResult,
  ModelAccuracyMetrics,
  ChannelCACData,
  LTVCACRatio,
  RatioThreshold,
  PaybackAnalysis,
  LTVDistributionData,
  PercentileData,
  OutlierAnalysis,
  SegmentDistribution,
  LTVDashboardData,
  LTVFilters,
  LTVExportData,
  WeddingVendorLTV,
  WeddingMarketSegment,
  LTVAnalyticsResponse,
  LTVSegmentResponse,
  LTVPredictionResponse,
} from '@/types/ltv-analytics';
