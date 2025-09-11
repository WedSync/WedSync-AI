/**
 * Scalability Infrastructure Dashboard Components
 * WS-340: Enterprise-grade real-time scalability monitoring system
 *
 * Export all scalability dashboard components for easy import
 */

export { ScalabilityInfrastructureDashboard as default } from './ScalabilityInfrastructureDashboard';
export { DashboardHeader } from './DashboardHeader';
export { MetricsOverviewPanel } from './MetricsOverviewPanel';
export { ScalingPoliciesManager } from './ScalingPoliciesManager';
export { WeddingAwareScaling } from './WeddingAwareScaling';
export { ScalingEventsTimeline } from './ScalingEventsTimeline';
export { ServiceHealthMatrix } from './ServiceHealthMatrix';
export { CapacityPlanningWidget } from './CapacityPlanningWidget';
export { AlertsAndNotifications } from './AlertsAndNotifications';

// Re-export types for convenience
export type {
  ScalabilityDashboardProps,
  ScalingMetrics,
  ScalingPolicy,
  ScalingEvent,
  WeddingEvent,
  WeddingScalingPrefs,
  ServiceInstance,
  AlertThreshold,
  ScalingAlert,
} from '@/types/scalability';
