// WS-010 Round 2: ML Timeline Optimization Types
// Built on Team B Round 1 foundation - enhances existing timeline optimization with ML

import {
  VendorCategory,
  TimelineMilestone,
} from '@/lib/analytics/wedding-metrics';
import {
  TimelineItem,
  VendorStatus,
} from '@/components/dashboard/realtime/RealtimeTimeline';

// =============================================
// ML MODEL TYPES
// =============================================

export interface MLPredictionModel {
  id: string;
  name: string;
  version: string;
  accuracy: number; // >0.85 required
  training_data_size: number;
  last_updated: string;
  model_type:
    | 'conflict_detection'
    | 'vendor_performance'
    | 'buffer_optimization'
    | 'timeline_optimization';
  hyperparameters: Record<string, any>;
  performance_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    confusion_matrix: number[][];
  };
}

export interface ConflictPrediction {
  id: string;
  confidence: number; // 0-1 scale, must be >0.85 for high confidence
  conflict_type:
    | 'vendor_overlap'
    | 'timeline_rush'
    | 'equipment_conflict'
    | 'venue_constraint'
    | 'weather_impact';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_items: string[]; // timeline item IDs
  affected_vendors: string[]; // vendor IDs
  predicted_delay_minutes: number;
  suggested_resolution: ConflictResolution;
  impact_score: number; // 1-10 scale
  historical_patterns: HistoricalPattern[];
  created_at: string;
}

export interface ConflictResolution {
  strategy:
    | 'reschedule'
    | 'add_buffer'
    | 'swap_vendors'
    | 'parallel_execution'
    | 'equipment_adjustment';
  description: string;
  estimated_cost: number;
  time_adjustment: {
    item_id: string;
    original_time: string;
    suggested_time: string;
    buffer_added_minutes: number;
  }[];
  confidence: number;
  success_probability: number; // Based on historical data
}

export interface VendorPerformanceScore {
  vendor_id: string;
  vendor_name: string;
  category: VendorCategory;
  overall_score: number; // 1-10 scale
  reliability_score: number; // On-time delivery rate
  punctuality_score: number; // Setup time accuracy
  communication_score: number; // Response time and quality
  quality_score: number; // Historical wedding outcomes
  risk_level: 'low' | 'medium' | 'high';
  historical_conflicts: number;
  total_events: number;
  conflict_rate: number;
  performance_trends: VendorTrend[];
  prediction_factors: VendorPredictionFactors;
  last_updated: string;
}

export interface VendorPredictionFactors {
  weather_sensitivity: number; // 0-1 scale
  equipment_complexity: number; // 0-1 scale
  team_size_variability: number; // 0-1 scale
  venue_familiarity: number; // 0-1 scale for specific venue
  seasonal_performance: Record<string, number>; // season -> performance multiplier
  time_of_day_preference: {
    morning: number; // 0-1 performance multiplier
    afternoon: number;
    evening: number;
  };
}

export interface VendorTrend {
  period: string; // 'last_30_days' | 'last_90_days' | 'last_year'
  direction: 'improving' | 'declining' | 'stable';
  metric: 'reliability' | 'punctuality' | 'communication' | 'quality';
  change_percentage: number;
  statistical_significance: number; // 0-1 scale
}

export interface HistoricalPattern {
  pattern_id: string;
  pattern_type:
    | 'seasonal'
    | 'vendor_combination'
    | 'venue_specific'
    | 'time_based';
  description: string;
  frequency: number; // How often this pattern occurs
  confidence: number; // Statistical confidence in the pattern
  context: {
    venue_types?: string[];
    vendor_combinations?: string[];
    time_ranges?: string[];
    seasons?: string[];
    guest_count_ranges?: [number, number][];
  };
  outcomes: {
    success_rate: number;
    average_delay_minutes: number;
    client_satisfaction: number;
  };
}

export interface BufferRecommendation {
  timeline_item_id: string;
  recommended_buffer_minutes: number;
  confidence: number;
  reasoning: string;
  risk_factors: RiskFactor[];
  cost_impact: number; // Additional cost if any
  alternative_options: {
    buffer_minutes: number;
    risk_reduction: number;
    cost_impact: number;
    description: string;
  }[];
}

export interface RiskFactor {
  factor_type:
    | 'weather'
    | 'vendor_history'
    | 'venue_constraint'
    | 'equipment'
    | 'timeline_density';
  risk_level: number; // 1-10 scale
  description: string;
  mitigation_options: string[];
  historical_frequency: number; // 0-1 scale
}

// =============================================
// TIMELINE OPTIMIZATION TYPES
// =============================================

export interface OptimizedTimeline {
  original_timeline_id: string;
  optimized_items: OptimizedTimelineItem[];
  optimization_score: number; // 1-100 scale
  improvements: TimelineImprovement[];
  total_buffer_added: number;
  estimated_success_probability: number;
  created_at: string;
  model_version: string;
}

export interface OptimizedTimelineItem extends TimelineItem {
  optimization_changes: {
    time_adjusted: boolean;
    buffer_added: number;
    vendor_suggested?: string; // Alternative vendor if recommended
    equipment_changes?: string[];
    priority_adjusted?: boolean;
  };
  risk_score: number; // 1-10 scale
  confidence: number; // ML model confidence in this optimization
}

export interface TimelineImprovement {
  type:
    | 'conflict_resolved'
    | 'buffer_optimized'
    | 'vendor_upgraded'
    | 'parallel_optimized';
  description: string;
  time_saved_minutes: number;
  risk_reduction: number;
  cost_impact: number;
  confidence: number;
}

// =============================================
// REAL-TIME ML TYPES
// =============================================

export interface MLInferenceRequest {
  timeline_id: string;
  timeline_items: TimelineItem[];
  vendor_data: VendorPerformanceScore[];
  wedding_context: WeddingContext;
  optimization_goals: OptimizationGoals;
  inference_type:
    | 'conflict_detection'
    | 'timeline_optimization'
    | 'vendor_recommendation'
    | 'buffer_calculation';
}

export interface MLInferenceResponse {
  request_id: string;
  inference_time_ms: number; // Must be <2000ms
  model_version: string;
  predictions: ConflictPrediction[];
  optimizations: TimelineImprovement[];
  buffer_recommendations: BufferRecommendation[];
  overall_confidence: number;
  success_probability: number;
  memory_usage_mb?: number; // For performance monitoring
}

export interface WeddingContext {
  wedding_id: string;
  wedding_date: string;
  venue_type: string;
  guest_count: number;
  budget_tier: 'budget' | 'mid_tier' | 'luxury' | 'ultra_luxury';
  weather_forecast?: WeatherData;
  special_requirements: string[];
  season: 'spring' | 'summer' | 'fall' | 'winter';
  day_of_week: string;
  time_of_day: 'morning' | 'afternoon' | 'evening';
}

export interface WeatherData {
  date: string;
  temperature_high: number;
  temperature_low: number;
  precipitation_chance: number;
  wind_speed: number;
  conditions: string;
  impact_factors: {
    outdoor_ceremony: number; // Risk multiplier 0-2
    transportation: number; // Risk multiplier 0-2
    vendor_setup: number; // Risk multiplier 0-2
  };
}

export interface OptimizationGoals {
  minimize_conflicts: boolean;
  minimize_total_time: boolean;
  minimize_cost: boolean;
  maximize_vendor_performance: boolean;
  respect_vendor_preferences: boolean;
  maintain_client_priorities: string[]; // timeline item IDs that are fixed
  business_hours_only: boolean;
}

// =============================================
// TRAINING DATA TYPES
// =============================================

export interface TrainingDataSet {
  id: string;
  name: string;
  created_at: string;
  size: number;
  data_quality_score: number; // 0-1 scale
  features: FeatureVector[];
  outcomes: TrainingOutcome[];
  validation_split: number;
  test_split: number;
}

export interface FeatureVector {
  timeline_features: {
    total_items: number;
    total_duration_minutes: number;
    vendor_count: number;
    overlap_count: number;
    density_score: number; // items per hour
  };
  venue_features: {
    capacity: number;
    setup_complexity: number; // 1-10 scale
    location_accessibility: number; // 1-10 scale
    weather_exposure: number; // 0-1 scale
  };
  vendor_features: {
    avg_reliability_score: number;
    category_distribution: Record<VendorCategory, number>;
    historical_conflict_rate: number;
    communication_quality: number;
  };
  temporal_features: {
    season_numeric: number; // 0-3 (spring, summer, fall, winter)
    day_of_week_numeric: number; // 0-6
    time_of_day_numeric: number; // 0-2 (morning, afternoon, evening)
    days_until_wedding: number;
  };
  external_features: {
    weather_risk_score: number;
    local_event_conflicts: number; // Competing events in the area
    vendor_availability_score: number;
  };
}

export interface TrainingOutcome {
  wedding_id: string;
  actual_conflicts: number;
  actual_delay_minutes: number;
  client_satisfaction_score: number; // 1-10 scale
  budget_variance_percentage: number;
  vendor_performance_scores: Record<string, number>;
  timeline_success_rate: number; // 0-1 scale
  lessons_learned: string[];
}

// =============================================
// PERFORMANCE MONITORING TYPES
// =============================================

export interface MLPerformanceMetrics {
  model_id: string;
  timestamp: string;
  inference_time_ms: number;
  memory_usage_mb: number;
  cpu_usage_percentage: number;
  prediction_accuracy: number;
  false_positive_rate: number;
  false_negative_rate: number;
  user_feedback_score?: number; // When available from actual wedding outcomes
}

export interface ModelRetrainingTrigger {
  trigger_type:
    | 'scheduled'
    | 'performance_degradation'
    | 'new_data_threshold'
    | 'manual';
  threshold_met: boolean;
  current_accuracy: number;
  target_accuracy: number;
  training_data_size: number;
  last_retrained: string;
  should_retrain: boolean;
  estimated_training_time_minutes: number;
}

// =============================================
// INTEGRATION TYPES (with Team A Round 2 & Team E Round 1)
// =============================================

export interface RealtimeMLUpdate {
  type:
    | 'prediction_update'
    | 'model_retrained'
    | 'conflict_detected'
    | 'optimization_complete';
  timeline_id: string;
  predictions?: ConflictPrediction[];
  optimizations?: TimelineImprovement[];
  model_version: string;
  confidence: number;
  timestamp: string;
  requires_notification: boolean; // For Team E integration
}

export interface MLNotificationPayload {
  notification_type:
    | 'high_risk_conflict'
    | 'optimization_suggestion'
    | 'model_updated';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  action_required: boolean;
  suggested_actions: string[];
  timeline_id: string;
  affected_vendors: string[];
  confidence: number;
  expires_at?: string;
}

// =============================================
// API TYPES
// =============================================

export interface MLTimelineRequest {
  timeline_id: string;
  force_refresh?: boolean;
  include_historical_data?: boolean;
  optimization_goals?: Partial<OptimizationGoals>;
}

export interface MLTimelineResponse {
  success: boolean;
  data?: {
    predictions: ConflictPrediction[];
    optimizations: OptimizedTimeline;
    vendor_scores: VendorPerformanceScore[];
    buffer_recommendations: BufferRecommendation[];
    performance_metrics: MLPerformanceMetrics;
  };
  error?: string;
  inference_time_ms: number;
  model_version: string;
}

export interface MLVendorAnalysisRequest {
  vendor_ids?: string[];
  category?: VendorCategory;
  include_predictions?: boolean;
  timeline_context?: WeddingContext;
}

export interface MLVendorAnalysisResponse {
  success: boolean;
  data?: {
    vendor_scores: VendorPerformanceScore[];
    category_insights: Record<
      VendorCategory,
      {
        avg_score: number;
        risk_factors: RiskFactor[];
        recommendations: string[];
      }
    >;
    performance_trends: VendorTrend[];
  };
  error?: string;
}

// =============================================
// VALIDATION TYPES
// =============================================

export interface MLValidationResult {
  validation_id: string;
  model_version: string;
  test_dataset_size: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  false_negative_rate: number;
  confusion_matrix: number[][];
  validation_passed: boolean; // Must be >85% accuracy
  recommendations: string[];
  timestamp: string;
}

export interface ProductionReadinessCheck {
  model_ready: boolean;
  accuracy_check: boolean; // >85%
  performance_check: boolean; // <2s inference
  security_check: boolean;
  integration_check: boolean;
  data_privacy_check: boolean;
  error_handling_check: boolean;
  monitoring_setup: boolean;
  rollback_plan: boolean;
  deployment_approved: boolean;
}
