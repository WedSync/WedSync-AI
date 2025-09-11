/**
 * WS-170 Viral Optimization System - Reward Types
 * TypeScript interfaces for viral reward system with double-sided incentives
 */

// Extend existing ReferralReward with viral-specific properties
export interface ViralReward {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_type:
    | 'signup'
    | 'subscription'
    | 'revenue_share'
    | 'milestone'
    | 'viral_bonus';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'viral_champion';

  // Base reward properties
  base_reward_amount: number;
  multiplier: number;
  final_reward_amount: number;
  reward_currency: 'USD' | 'credits' | 'features';

  // Viral-specific properties
  viral_coefficient: number;
  network_depth: number;
  referee_reward_amount: number;
  velocity_bonus: number;
  geographic_expansion_bonus: number;
  viral_chain_length: number;

  // Status and timestamps
  status:
    | 'pending'
    | 'approved'
    | 'fulfilled'
    | 'expired'
    | 'revoked'
    | 'fraud_detected';
  expires_at: Date;
  earned_at: Date;
  fulfilled_at?: Date;

  // Metadata and audit
  metadata: ViralRewardMetadata;
}

export interface ViralRewardMetadata {
  calculation_factors: string[];
  viral_metrics: {
    chain_position: number;
    parent_referral_id?: string;
    child_referrals: string[];
    viral_velocity_score: number;
    network_contribution_score: number;
  };
  fraud_checks: {
    ip_validation: boolean;
    device_fingerprint_check: boolean;
    behavior_analysis_score: number;
    circular_referral_check: boolean;
  };
  calculated_at: string;
  [key: string]: any;
}

// Double-sided incentive calculation result
export interface DoubleIncentive {
  referrer_reward: ViralRewardCalculation;
  referee_reward: ViralRewardCalculation;
  total_system_cost: number;
  viral_multiplier: number;
  network_effect_bonus: number;
  combined_eligibility_score: number;
  distribution_method: 'immediate' | 'milestone_based' | 'staggered';
}

// Enhanced reward calculation with viral factors
export interface ViralRewardCalculation {
  base_amount: number;
  tier_multiplier: number;
  viral_coefficient_bonus: number;
  velocity_bonus: number;
  network_depth_bonus: number;
  geographic_bonus: number;
  special_bonuses: number;
  final_amount: number;
  currency: 'USD' | 'credits' | 'features';
  expires_at: Date;
  calculation_factors: string[];
  viral_factors: ViralCalculationFactors;
}

export interface ViralCalculationFactors {
  referral_velocity: number;
  network_penetration: number;
  geographic_spread_coefficient: number;
  demographic_diversity_score: number;
  retention_impact_score: number;
  revenue_attribution_percentage: number;
}

// Viral tier configuration with enhanced rewards
export interface ViralRewardTier {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'viral_champion';
  min_successful_referrals: number;
  min_viral_coefficient: number;
  min_network_depth: number;

  // Base rewards
  signup_reward: number;
  subscription_reward: number;
  revenue_share_percentage: number;
  milestone_bonus: number;

  // Viral-specific rewards
  viral_multiplier: number;
  referee_signup_reward: number;
  referee_subscription_reward: number;
  network_depth_bonus_per_level: number;
  velocity_bonus_multiplier: number;
  geographic_expansion_bonus: number;

  // Tier properties
  expires_after_days: number;
  special_perks: string[];
  fraud_detection_sensitivity: 'low' | 'medium' | 'high' | 'maximum';
}

// Eligibility validation result
export interface EligibilityValidationResult {
  is_eligible: boolean;
  confidence_score: number;
  validation_factors: {
    account_age_check: boolean;
    activity_pattern_check: boolean;
    device_uniqueness_check: boolean;
    geographic_consistency_check: boolean;
    behavioral_analysis_check: boolean;
    circular_referral_check: boolean;
  };
  fraud_risk_score: number;
  recommended_action:
    | 'approve'
    | 'manual_review'
    | 'deny'
    | 'flag_for_investigation';
  validation_notes: string[];
}

// Viral campaign configuration
export interface ViralCampaignConfig {
  campaign_id: string;
  campaign_name: string;
  campaign_type:
    | 'standard'
    | 'time_limited'
    | 'milestone_based'
    | 'geographic_expansion';

  // Campaign parameters
  max_reward_per_user: number;
  max_total_campaign_cost: number;
  target_viral_coefficient: number;
  min_conversion_quality_score: number;

  // Time constraints
  starts_at: Date;
  ends_at: Date;
  max_referrals_per_user: number;
  max_referrals_per_day: number;

  // Reward multipliers
  early_adopter_multiplier: number;
  volume_milestone_multipliers: Record<number, number>;
  geographic_multipliers: Record<string, number>;

  // Fraud prevention
  fraud_detection_level: 'standard' | 'enhanced' | 'maximum';
  manual_review_threshold: number;
  auto_approval_limit: number;

  // Status
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Reward distribution result
export interface RewardDistributionResult {
  distribution_id: string;
  referrer_distribution: {
    reward_id: string;
    amount: number;
    currency: string;
    method:
      | 'account_credit'
      | 'cash_payout'
      | 'feature_unlock'
      | 'discount_code';
    transaction_id?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  };
  referee_distribution: {
    reward_id: string;
    amount: number;
    currency: string;
    method:
      | 'account_credit'
      | 'cash_payout'
      | 'feature_unlock'
      | 'discount_code';
    transaction_id?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  };
  total_distributed: number;
  distribution_timestamp: Date;
  processing_time_ms: number;
  notes?: string;
}

// Analytics and performance metrics
export interface ViralRewardAnalytics {
  user_id: string;
  timeframe: string;

  // Core metrics
  total_rewards_earned: number;
  total_rewards_pending: number;
  total_referrals_made: number;
  successful_conversions: number;

  // Viral metrics
  viral_coefficient: number;
  network_depth_achieved: number;
  total_network_size: number;
  revenue_attributed: number;

  // Performance indicators
  current_tier: string;
  next_tier_requirements: string | null;
  average_conversion_time: number;
  geographic_reach: string[];

  // Reward breakdown
  referrer_rewards_total: number;
  referee_rewards_facilitated: number;
  bonus_rewards_earned: number;

  // Recent activity
  recent_rewards: ViralReward[];
  recent_referrals: Array<{
    referee_id: string;
    conversion_date: Date;
    conversion_type: string;
    reward_amount: number;
    status: string;
  }>;
}

// Error types for reward system
export type RewardSystemError =
  | 'INVALID_REFERRAL'
  | 'FRAUD_DETECTED'
  | 'ELIGIBILITY_FAILED'
  | 'CALCULATION_ERROR'
  | 'DISTRIBUTION_FAILED'
  | 'TIER_VALIDATION_FAILED'
  | 'CAMPAIGN_LIMIT_EXCEEDED'
  | 'PERFORMANCE_THRESHOLD_EXCEEDED'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

// Performance monitoring
export interface PerformanceMetrics {
  operation: string;
  execution_time_ms: number;
  threshold_ms: number;
  performance_grade: 'excellent' | 'good' | 'warning' | 'critical';
  memory_usage?: number;
  database_queries?: number;
  cache_hit_ratio?: number;
  timestamp: Date;
}
