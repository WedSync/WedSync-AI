// WS-055: Predictive Analytics Engine Types
// Client Intelligence Foundation for Wedding Industry

export interface ClientBehaviorData {
  client_id: string;
  engagement_score: number;
  questionnaire_completed_at: Date | null;
  initial_contact_at: Date;
  last_activity_at: Date;
  responses_count: number;
  budget_range: 'low' | 'medium' | 'high' | 'luxury';
  venue_booked: boolean | null;
  timeline_interactions: number;
  vendor_inquiries: number;
  document_downloads: number;
  pricing_views: number;
  session_duration_avg: number; // seconds
  page_views_total: number;
  form_interactions: number;
  response_time_avg: number; // seconds
  message_length_avg: number;
  questions_asked: number;
}

export interface BookingPrediction {
  client_id: string;
  probability: number; // 0-1 scale
  confidence: number; // 0-1 scale
  factors: BookingFactor[];
  risk_indicators: RiskIndicator[];
  model_version: string;
  prediction_date: Date;
  inference_time_ms: number;
}

export interface BookingFactor {
  factor_type:
    | 'quick_questionnaire_completion'
    | 'high_engagement'
    | 'budget_alignment'
    | 'venue_urgency'
    | 'timeline_pressure'
    | 'vendor_research'
    | 'pricing_focus'
    | 'communication_frequency'
    | 'session_depth'
    | 'referral_source';
  impact_score: number; // -10 to +10 scale
  description: string;
  confidence: number;
}

export interface IntentScore {
  client_id: string;
  score: number; // 0-100 scale
  category: 'low' | 'medium' | 'high' | 'very_high';
  indicators: IntentIndicator[];
  trend: 'increasing' | 'stable' | 'decreasing';
  last_updated: Date;
}

export interface IntentIndicator {
  indicator_type:
    | 'active_venue_search'
    | 'quick_response_time'
    | 'multiple_vendor_inquiries'
    | 'pricing_research'
    | 'timeline_urgency'
    | 'budget_confirmation'
    | 'referral_activity'
    | 'social_media_engagement'
    | 'repeat_visits';
  strength: number; // 0-10 scale
  description: string;
  detected_at: Date;
}

export interface ChurnRiskAssessment {
  client_id: string;
  risk_score: number; // 0-100 scale
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: ChurnRiskFactor[];
  intervention_suggestions: InterventionSuggestion[];
  probability_churn_30d: number; // 0-1 scale
  last_assessed: Date;
}

export interface ChurnRiskFactor {
  factor_type:
    | 'extended_inactivity'
    | 'declining_engagement'
    | 'slow_response_times'
    | 'incomplete_questionnaire'
    | 'budget_concerns'
    | 'competitor_activity'
    | 'timeline_delays'
    | 'communication_gaps'
    | 'negative_feedback';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  first_detected: Date;
  trend: 'worsening' | 'stable' | 'improving';
}

export interface InterventionSuggestion {
  type:
    | 'email_outreach'
    | 'phone_call'
    | 'discount_offer'
    | 'timeline_adjustment'
    | 'vendor_recommendation'
    | 'priority_support'
    | 'consultation_scheduling';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  description: string;
  expected_impact: number; // 0-10 scale
  cost_estimate: number;
  timeline_days: number;
}

export interface BehaviorPattern {
  pattern_id: string;
  pattern_type:
    | 'booking_ready'
    | 'price_shopping'
    | 'early_researcher'
    | 'urgent_seeker'
    | 'churn_risk'
    | 'high_value'
    | 'budget_conscious'
    | 'luxury_seeker';
  confidence: number; // 0-1 scale
  signals: PatternSignal[];
  typical_outcomes: PatternOutcome;
  recommended_actions: string[];
  identified_at: Date;
}

export interface PatternSignal {
  signal_type:
    | 'venue_inquiry_sequence'
    | 'pricing_interest'
    | 'timeline_creation'
    | 'vendor_contact_pattern'
    | 'session_behavior'
    | 'communication_style';
  strength: number; // 0-10 scale
  description: string;
  data_points: any[];
}

export interface PatternOutcome {
  booking_probability: number;
  average_timeline_to_booking: number; // days
  typical_budget_range: string;
  conversion_factors: string[];
  success_rate: number;
}

export interface RealTimeActivity {
  client_id: string;
  activity_type:
    | 'page_view'
    | 'form_interaction'
    | 'vendor_inquiry'
    | 'pricing_view'
    | 'document_download'
    | 'timeline_interaction'
    | 'message_sent'
    | 'venue_view'
    | 'booking_inquiry'
    | 'calendar_check';
  timestamp: Date;
  metadata: Record<string, any>;
  value_score: number; // 1-10 scale based on activity importance
  duration?: number; // seconds for time-based activities
}

export interface ScoreUpdate {
  client_id: string;
  previous_score: number;
  new_score: number;
  score_change: number;
  factors_changed: string[];
  confidence: number;
  update_reason: string;
  timestamp: Date;
}

export interface PredictiveModel {
  model_id: string;
  model_type:
    | 'booking_prediction'
    | 'intent_scoring'
    | 'churn_detection'
    | 'behavior_classification';
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  training_date: Date;
  feature_importance: FeatureImportance[];
  hyperparameters: Record<string, any>;
  validation_results: ValidationResults;
}

export interface FeatureImportance {
  feature_name: string;
  importance_score: number; // 0-1 scale
  description: string;
  feature_type:
    | 'behavioral'
    | 'temporal'
    | 'engagement'
    | 'communication'
    | 'demographic';
}

export interface ValidationResults {
  test_accuracy: number;
  cross_validation_score: number;
  confusion_matrix: number[][];
  roc_auc_score: number;
  feature_stability: number;
  data_drift_score: number;
  bias_metrics: BiasMetrics;
}

export interface BiasMetrics {
  demographic_parity: number;
  equal_opportunity: number;
  calibration_score: number;
  fairness_assessment: 'passed' | 'failed' | 'warning';
}

export interface MLPipelineConfig {
  feature_extraction: {
    behavioral_window_days: number;
    engagement_weight: number;
    temporal_decay_factor: number;
    communication_weight: number;
  };
  model_parameters: {
    booking_prediction: {
      algorithm: 'random_forest' | 'gradient_boosting' | 'neural_network';
      hyperparameters: Record<string, any>;
    };
    intent_scoring: {
      algorithm: 'logistic_regression' | 'svm' | 'ensemble';
      hyperparameters: Record<string, any>;
    };
    churn_detection: {
      algorithm: 'isolation_forest' | 'one_class_svm' | 'autoencoder';
      hyperparameters: Record<string, any>;
    };
  };
  real_time: {
    update_frequency_ms: number;
    batch_size: number;
    cache_ttl_seconds: number;
    websocket_enabled: boolean;
  };
}

export interface HistoricalAnalytics {
  analysis_id: string;
  period_start: Date;
  period_end: Date;
  total_clients: number;
  conversion_metrics: {
    overall_booking_rate: number;
    high_intent_booking_rate: number;
    medium_intent_booking_rate: number;
    low_intent_booking_rate: number;
  };
  behavior_insights: {
    avg_time_to_booking: number; // days
    most_predictive_factors: string[];
    seasonal_patterns: SeasonalPattern[];
    churn_patterns: ChurnPattern[];
  };
  model_performance: {
    prediction_accuracy_trend: number[];
    false_positive_rate: number;
    false_negative_rate: number;
    model_drift_score: number;
  };
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  booking_rate_multiplier: number;
  typical_timeline_days: number;
  behavior_characteristics: string[];
}

export interface ChurnPattern {
  pattern_name: string;
  frequency: number;
  early_indicators: string[];
  intervention_success_rate: number;
  cost_of_churn: number;
}

export interface PredictionAPI {
  predict_booking_probability(client_id: string): Promise<BookingPrediction>;
  calculate_intent_score(client_id: string): Promise<IntentScore>;
  assess_churn_risk(client_id: string): Promise<ChurnRiskAssessment>;
  recognize_behavior_pattern(
    client_data: ClientBehaviorData,
  ): Promise<BehaviorPattern>;
  process_real_time_activity(activity: RealTimeActivity): Promise<ScoreUpdate>;
  batch_predict(client_ids: string[]): Promise<BookingPrediction[]>;
  get_historical_analytics(period_days: number): Promise<HistoricalAnalytics>;
}

export interface PredictionError {
  error_type:
    | 'model_not_found'
    | 'insufficient_data'
    | 'prediction_failed'
    | 'invalid_input'
    | 'timeout'
    | 'service_unavailable';
  message: string;
  client_id?: string;
  model_version?: string;
  timestamp: Date;
  stack_trace?: string;
}

// Real-time scoring configuration
export interface RealTimeScoringConfig {
  websocket_url: string;
  update_frequency_ms: number;
  batch_processing: {
    enabled: boolean;
    batch_size: number;
    flush_interval_ms: number;
  };
  caching: {
    enabled: boolean;
    ttl_seconds: number;
    max_entries: number;
  };
  performance_thresholds: {
    max_inference_time_ms: number;
    max_memory_usage_mb: number;
    min_accuracy_threshold: number;
  };
}

// Integration with existing wedding planning system
export interface WeddingPlannerInsights {
  client_id: string;
  wedding_date?: Date;
  current_planning_stage:
    | 'initial'
    | 'vendor_selection'
    | 'planning'
    | 'final_details'
    | 'post_wedding';
  priority_recommendations: PlannerRecommendation[];
  next_best_actions: NextBestAction[];
  risk_alerts: RiskAlert[];
  opportunity_score: number; // 0-100 scale
}

export interface PlannerRecommendation {
  type:
    | 'contact_client'
    | 'schedule_meeting'
    | 'send_proposal'
    | 'follow_up'
    | 'offer_discount'
    | 'prioritize_support'
    | 'assign_specialist';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string;
  expected_impact: number;
  effort_required: 'low' | 'medium' | 'high';
  deadline?: Date;
}

export interface NextBestAction {
  action_type: string;
  description: string;
  success_probability: number;
  estimated_value: number;
  time_investment: number; // minutes
  dependencies: string[];
}

export interface RiskAlert {
  alert_type:
    | 'churn_risk'
    | 'competitor_threat'
    | 'budget_concern'
    | 'timeline_pressure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggested_response: string;
  escalation_required: boolean;
  created_at: Date;
}
