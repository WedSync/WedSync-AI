/**
 * WS-241: AI Caching Strategy System - Core Types
 * Team D: AI/ML Engineering Implementation
 */

export interface WeddingContext {
  wedding_id: string;
  couple_id: string;
  wedding_date: Date;
  location: {
    city: string;
    state: string;
    country: string;
    venue?: string;
  };
  budget_range: 'low' | 'medium' | 'high' | 'luxury';
  wedding_style:
    | 'classic'
    | 'modern'
    | 'rustic'
    | 'bohemian'
    | 'traditional'
    | 'destination'
    | 'vintage';
  guest_count: number;
  current_planning_stage:
    | 'early'
    | 'venue_selection'
    | 'vendor_booking'
    | 'final_details'
    | 'wedding_week';
  cultural_preferences: string[];
  preferences: Record<string, any>;
  timezone: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
}

export interface CacheEntry {
  cache_key: string;
  query: string;
  response: string;
  context: WeddingContext;
  created_at: Date;
  last_accessed: Date;
  access_count: number;
  quality_score: number;
  original_quality: number;
  ttl: number;
  tags: string[];
  storage_cost: number;
  generation_cost: number;
}

export interface QueryPrediction {
  query: string;
  confidence_score: number;
  priority: number;
  predicted_context: Partial<WeddingContext>;
  reasoning: string;
}

export interface CachePerformanceMetrics {
  hit_rate: number;
  miss_rate: number;
  avg_response_time: number;
  quality_score: number;
  cost_savings: number;
  storage_efficiency: number;
  prediction_accuracy: number;
}

export interface WeddingEntityExtraction {
  venues: string[];
  vendors: string[];
  services: string[];
  dates: Date[];
  budget_items: string[];
  cultural_elements: string[];
  locations: string[];
}

export interface QualityAssessment {
  overall_quality: number;
  accuracy: number;
  relevance: number;
  completeness: number;
  cultural_sensitivity: number;
  budget_appropriateness: number;
  cache_recommendation: 'cache' | 'no_cache' | 'cache_with_modification';
  improvements: string[];
}

export interface CacheOptimizationDecision {
  should_cache: boolean;
  cache_duration: number;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  eviction_weight: number;
  preload_recommendation: boolean;
  context_scope: 'specific' | 'similar' | 'broad';
}

export interface SeasonalPattern {
  season: string;
  months: number[];
  query_patterns: string[];
  peak_times: string[];
  common_contexts: Partial<WeddingContext>[];
  priority_multiplier: number;
}

export interface MLModelConfig {
  model_name: string;
  model_version: string;
  input_shape: number[];
  output_shape: number[];
  performance_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  last_trained: Date;
  training_data_size: number;
}

export interface FeedbackData {
  query: string;
  response: string;
  context: WeddingContext;
  user_rating: number;
  user_feedback: string;
  improvement_suggestions: string[];
  timestamp: Date;
  user_type: 'couple' | 'vendor' | 'planner';
}

export interface CacheAnalytics {
  daily_metrics: CachePerformanceMetrics;
  weekly_trends: CachePerformanceMetrics[];
  seasonal_performance: Record<string, CachePerformanceMetrics>;
  quality_trends: {
    date: Date;
    quality_score: number;
    prediction_accuracy: number;
  }[];
  cost_analysis: {
    cache_costs: number;
    generation_costs: number;
    storage_costs: number;
    total_savings: number;
  };
}
