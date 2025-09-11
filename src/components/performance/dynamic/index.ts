// Dynamic imports for WedSync heavy components
// Optimized for wedding suppliers with code splitting and lazy loading

export { default as DynamicReviewAnalyticsDashboard } from './DynamicReviewAnalyticsDashboard';
export { default as DynamicCustomerHealthDashboard } from './DynamicCustomerHealthDashboard';
export { default as DynamicPhotoGroupsManager } from './DynamicPhotoGroupsManager';
export { default as DynamicSeatingArrangement } from './DynamicSeatingArrangement';
export { default as DynamicTrialConversionFlow } from './DynamicTrialConversionFlow';

// Bundle analyzer helper
export const DYNAMIC_COMPONENT_CHUNKS = {
  ReviewAnalyticsDashboard: 'analytics-dashboard',
  CustomerHealthDashboard: 'customer-health',
  PhotoGroupsManager: 'photo-groups',
  SeatingArrangement: 'seating-tools',
  TrialConversionFlow: 'trial-conversion',
} as const;

// Performance metrics for dynamic components
export const COMPONENT_LOAD_PRIORITIES = {
  ReviewAnalyticsDashboard: 'low',
  CustomerHealthDashboard: 'medium',
  PhotoGroupsManager: 'medium',
  SeatingArrangement: 'low',
  TrialConversionFlow: 'low',
} as const;

// Wedding timeline-based preloading hints
export const WEDDING_PHASE_COMPONENTS = {
  planning: ['CustomerHealthDashboard', 'SeatingArrangement'],
  execution: ['PhotoGroupsManager'],
  'post-wedding': ['ReviewAnalyticsDashboard'],
} as const;
