// ============================================================================
// WS-182: Churn Intelligence Dashboard - Component Exports
// ============================================================================
// Team A - Round 1 Implementation
// Date: 2025-01-20
//
// Centralized exports for all churn intelligence components.
// Provides easy import access for the complete churn intelligence system.
// ============================================================================

export { default as ChurnRiskDashboard } from './ChurnRiskDashboard';
export { default as AtRiskSupplierCard } from './AtRiskSupplierCard';
export { default as ChurnTrendChart } from './ChurnTrendChart';
export { default as RetentionCampaignManager } from './RetentionCampaignManager';
export { default as ChurnAlertPanel } from './ChurnAlertPanel';

// Re-export types for convenience
export type {
  ChurnRiskDashboardProps,
  AtRiskSupplierCardProps,
  ChurnTrendChartProps,
  RetentionCampaignManagerProps,
  ChurnAlertPanelProps,
  AtRiskSupplier,
  ChurnMetrics,
  RetentionCampaign,
  ChurnAlert,
  ChurnRiskLevel,
  RetentionAction,
  ChurnRiskFactor,
  RetentionRecommendation,
} from '@/types/churn-intelligence';
