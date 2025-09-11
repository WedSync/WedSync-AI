/**
 * WS-132 Trial Management System Types
 * Comprehensive type definitions for 30-day trial system with milestone tracking and ROI calculation
 */

import { z } from 'zod';

// Core trial status types
export type TrialStatus =
  | 'active'
  | 'expired'
  | 'converted'
  | 'cancelled'
  | 'suspended';

// Milestone types for wedding industry
export type MilestoneType =
  | 'first_client_connected'
  | 'initial_journey_created'
  | 'vendor_added'
  | 'guest_list_imported'
  | 'timeline_created';

// Business context types for trial onboarding
export type BusinessType =
  | 'wedding_planner'
  | 'photographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'dj_band'
  | 'videographer'
  | 'coordinator'
  | 'other';

// Trial configuration interface
export interface TrialConfig {
  id: string;
  user_id: string;
  business_type: BusinessType;
  business_goals: string[];
  current_workflow_pain_points: string[];
  expected_time_savings_hours: number;
  hourly_rate?: number;
  trial_start: Date;
  trial_end: Date;
  status: TrialStatus;
  onboarding_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

// Feature usage tracking with time savings
export interface TrialFeatureUsage {
  id: string;
  trial_id: string;
  feature_key: string;
  feature_name: string;
  usage_count: number;
  time_saved_minutes: number;
  last_used_at: Date;
  created_at: Date;
}

// Milestone achievement tracking
export interface TrialMilestone {
  id: string;
  trial_id: string;
  milestone_type: MilestoneType;
  milestone_name: string;
  description: string;
  achieved: boolean;
  achieved_at?: Date;
  time_to_achieve_hours?: number;
  value_impact_score: number; // 1-10 scale
  created_at: Date;
}

// ROI calculation results
export interface TrialROIMetrics {
  trial_id: string;
  total_time_saved_hours: number;
  estimated_cost_savings: number;
  productivity_improvement_percent: number;
  features_adopted_count: number;
  milestones_achieved_count: number;
  workflow_efficiency_gain: number;
  projected_monthly_savings: number;
  roi_percentage: number;
  calculated_at: Date;
}

// Trial progress summary
export interface TrialProgress {
  trial_id: string;
  days_remaining: number;
  days_elapsed: number;
  progress_percentage: number;
  milestones_achieved: TrialMilestone[];
  milestones_remaining: TrialMilestone[];
  feature_usage_summary: TrialFeatureUsage[];
  roi_metrics: TrialROIMetrics;
  conversion_recommendation: string;
  urgency_score: number; // 1-5 scale for conversion urgency
}

// Trial onboarding form data
export interface TrialOnboardingData {
  business_type: BusinessType;
  business_name: string;
  primary_goals: string[];
  current_challenges: string[];
  weekly_time_spent_hours: number;
  estimated_hourly_value: number;
  team_size: number;
  current_client_count: number;
  growth_goals: string;
}

// API request/response schemas with Zod validation

export const TrialOnboardingSchema = z.object({
  business_type: z.enum([
    'wedding_planner',
    'photographer',
    'venue',
    'florist',
    'caterer',
    'dj_band',
    'videographer',
    'coordinator',
    'other',
  ]),
  business_name: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100),
  primary_goals: z
    .array(z.string())
    .min(1, 'Please select at least one goal')
    .max(5),
  current_challenges: z
    .array(z.string())
    .min(1, 'Please select at least one challenge')
    .max(5),
  weekly_time_spent_hours: z
    .number()
    .min(1)
    .max(168, 'Cannot exceed 168 hours per week'),
  estimated_hourly_value: z
    .number()
    .min(10)
    .max(1000, 'Hourly value should be between $10-$1000'),
  team_size: z.number().min(1).max(100),
  current_client_count: z.number().min(0).max(1000),
  growth_goals: z
    .string()
    .min(10, 'Please describe your growth goals')
    .max(500),
});

export const StartTrialSchema = z.object({
  plan_tier: z.enum(['professional', 'premium']),
  onboarding_data: TrialOnboardingSchema,
});

export const TrackFeatureUsageSchema = z.object({
  feature_key: z.string().min(1),
  feature_name: z.string().min(1),
  time_saved_minutes: z.number().min(0).max(480), // Max 8 hours per usage
  context_data: z.record(z.string(), z.any()).optional(),
});

export const AchieveMilestoneSchema = z.object({
  milestone_type: z.enum([
    'first_client_connected',
    'initial_journey_created',
    'vendor_added',
    'guest_list_imported',
    'timeline_created',
  ]),
  context_data: z.record(z.string(), z.any()).optional(),
});

// API Response types
export interface StartTrialResponse {
  success: boolean;
  trial_id: string;
  trial_end_date: string;
  onboarding_required: boolean;
  next_steps: string[];
}

export interface TrialStatusResponse {
  success: boolean;
  trial: TrialConfig;
  progress: TrialProgress;
  recommendations: {
    next_actions: string[];
    upgrade_benefits: string[];
    urgency_message?: string;
  };
}

export interface TrialConversionResponse {
  success: boolean;
  subscription_id: string;
  plan_name: string;
  billing_amount: number;
  next_billing_date: string;
  conversion_bonus: {
    extended_features: string[];
    discount_applied?: number;
  };
}

// Error types
export interface TrialError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Constants for milestone definitions
export const MILESTONE_DEFINITIONS: Record<
  MilestoneType,
  {
    name: string;
    description: string;
    value_impact_score: number;
    estimated_time_savings_hours: number;
    instructions: string[];
  }
> = {
  first_client_connected: {
    name: 'First Client Connected',
    description: 'Successfully add and configure your first client profile',
    value_impact_score: 8,
    estimated_time_savings_hours: 2,
    instructions: [
      'Go to Clients section',
      'Click "Add New Client"',
      'Fill in client details and wedding information',
      'Set up communication preferences',
    ],
  },
  initial_journey_created: {
    name: 'Initial Journey Created',
    description: 'Create your first automated client journey',
    value_impact_score: 9,
    estimated_time_savings_hours: 5,
    instructions: [
      'Navigate to Journey Builder',
      'Choose a template or start from scratch',
      'Configure email sequences and touchpoints',
      'Activate the journey',
    ],
  },
  vendor_added: {
    name: 'Vendor Added',
    description: 'Add your first vendor partner to the platform',
    value_impact_score: 7,
    estimated_time_savings_hours: 1.5,
    instructions: [
      'Go to Vendors section',
      'Add vendor contact information',
      'Set up collaboration preferences',
      'Configure service categories',
    ],
  },
  guest_list_imported: {
    name: 'Guest List Imported',
    description: 'Import or create your first guest list',
    value_impact_score: 8,
    estimated_time_savings_hours: 3,
    instructions: [
      'Access Guest Management',
      'Choose import from CSV or manual entry',
      'Map guest information fields',
      'Set up RSVP preferences',
    ],
  },
  timeline_created: {
    name: 'Timeline Created',
    description: 'Build your first wedding timeline with tasks',
    value_impact_score: 9,
    estimated_time_savings_hours: 4,
    instructions: [
      'Open Timeline Builder',
      'Add key wedding milestones',
      'Assign tasks to team members',
      'Set up automated reminders',
    ],
  },
};

// Feature value definitions for ROI calculation
export const FEATURE_TIME_SAVINGS: Record<string, number> = {
  client_onboarding: 30, // 30 minutes saved per client
  email_automation: 20, // 20 minutes per automated email
  guest_management: 45, // 45 minutes per guest list update
  vendor_communication: 25, // 25 minutes per vendor coordination
  timeline_management: 35, // 35 minutes per timeline update
  task_automation: 15, // 15 minutes per automated task
  document_management: 20, // 20 minutes per document organization
  rsvp_tracking: 30, // 30 minutes per RSVP management session
  budget_tracking: 25, // 25 minutes per budget update
  communication_templates: 10, // 10 minutes per template usage
};

export type TrialOnboardingForm = z.infer<typeof TrialOnboardingSchema>;
export type StartTrialForm = z.infer<typeof StartTrialSchema>;
export type TrackFeatureUsageForm = z.infer<typeof TrackFeatureUsageSchema>;
export type AchieveMilestoneForm = z.infer<typeof AchieveMilestoneSchema>;

// WS-167 Enhanced Types for Activity Tracking and UI Components

// Activity tracking for enhanced components
export interface ActivityScore {
  score: number; // 0-100 percentage
  lastUpdated: Date;
  breakdown: {
    milestones: number;
    featureUsage: number;
    timeSpent: number;
    engagement: number;
  };
}

// Enhanced component props types
export interface EnhancedTrialStatusProps {
  className?: string;
  onUpgradeClick?: () => void;
  showUpgradeButton?: boolean;
  compact?: boolean;
  refreshInterval?: number;
  showActivityScore?: boolean;
  onActivityUpdate?: (score: number) => void;
}

export interface EnhancedTrialChecklistProps {
  milestones?: TrialMilestone[];
  className?: string;
  collapsed?: boolean;
  onItemComplete?: (itemId: string) => void;
  onItemClick?: (item: ChecklistItemEnhanced) => void;
  showActivityScore?: boolean;
  refreshInterval?: number;
  onActivityUpdate?: (score: number) => void;
  highlightNextAction?: boolean;
}

// Enhanced checklist item type
export interface ChecklistItemEnhanced {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  estimatedMinutes: number;
  category: 'setup' | 'clients' | 'automation' | 'collaboration';
  milestone?: MilestoneType;
  actionUrl?: string;
  instructions: string[];
  benefits: string[];
  priority: 'high' | 'medium' | 'low';
  activityScore: number;
  completedAt?: Date;
}

// Security validation types
export interface SecureTrialData {
  trial: TrialConfig;
  progress: SecureTrialProgress;
  recommendations: {
    next_actions: string[];
    upgrade_benefits: string[];
    urgency_message?: string;
  };
  success: boolean;
}

export interface SecureTrialProgress {
  trial_id: string;
  days_remaining: number; // Always >= 0
  days_elapsed: number;
  progress_percentage: number; // Always 0-100
  milestones_achieved: TrialMilestone[];
  milestones_remaining: TrialMilestone[];
  feature_usage_summary: TrialFeatureUsage[];
  roi_metrics: SecureROIMetrics;
  conversion_recommendation: string;
  urgency_score: number; // Always 1-5
}

export interface SecureROIMetrics {
  trial_id: string;
  total_time_saved_hours: number; // Always >= 0
  estimated_cost_savings: number;
  productivity_improvement_percent: number;
  features_adopted_count: number;
  milestones_achieved_count: number;
  workflow_efficiency_gain: number;
  projected_monthly_savings: number;
  roi_percentage: number; // Always >= 0, max 1000
  calculated_at: Date;
}

// Real-time updates for enhanced components
export interface TrialUpdate {
  type:
    | 'milestone_achieved'
    | 'activity_score_updated'
    | 'time_remaining_changed';
  data: {
    milestone?: TrialMilestone;
    activityScore?: number;
    timeRemaining?: string;
    timestamp: Date;
  };
}

// Component state management
export interface TrialComponentState {
  isRefreshing: boolean;
  activityScore: number;
  completionStreak: number;
  lastUpdated: Date;
  errors: string[];
}

// Enhanced API response with activity tracking
export interface EnhancedTrialStatusResponse extends TrialStatusResponse {
  activityTracking: {
    currentScore: number;
    dailyGoal: number;
    weeklyTrend: number[];
    lastActive: Date;
  };
  engagementMetrics: {
    timeSpentToday: number;
    featuresUsedToday: number;
    milestonesAchievedThisWeek: number;
  };
}

// =============================================================================
// WS-167 ENHANCED TRIAL SYSTEM DATABASE INTERFACES
// =============================================================================

// Extended business types for enhanced trial system
export type EnhancedBusinessType =
  | 'wedding_planner'
  | 'photographer'
  | 'videographer'
  | 'venue'
  | 'florist'
  | 'caterer'
  | 'dj_musician'
  | 'coordinator'
  | 'baker'
  | 'decorator'
  | 'other';

export type BusinessSize = 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
export type TrialType = 'standard' | 'extended' | 'premium' | 'enterprise';
export type EnhancedTrialStatus =
  | 'active'
  | 'paused'
  | 'expired'
  | 'converted'
  | 'cancelled'
  | 'extended';

// Trial Tracking interface (WS-167: trial_tracking table)
export interface TrialTracking {
  id: string;
  user_id: string;
  supplier_id?: string;

  // Trial identification and timing
  trial_type: TrialType;
  trial_duration_days: number;

  // Trial lifecycle timestamps
  trial_started_at: Date;
  trial_expires_at: Date;
  trial_extended_at?: Date;
  trial_converted_at?: Date;
  trial_cancelled_at?: Date;

  // Trial status and progression
  current_status: EnhancedTrialStatus;
  previous_status?: EnhancedTrialStatus;
  status_changed_at: Date;

  // Business context for personalization
  business_type: EnhancedBusinessType;
  business_size: BusinessSize;
  annual_wedding_count?: number;

  // Trial progress and engagement metrics
  onboarding_completed: boolean;
  onboarding_completed_at?: Date;
  setup_progress: number;
  feature_adoption_score: number;

  // Conversion prediction and scoring
  conversion_probability?: number;
  engagement_score?: number;
  last_activity_at?: Date;
  days_since_last_login?: number;

  // Trial source and attribution
  referral_source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  marketing_channel?: string;

  // System fields
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// Trial Activity interface (WS-167: trial_activity table)
export interface TrialActivity {
  id: string;
  trial_id: string;
  user_id: string;

  // Activity date and session information
  activity_date: Date;
  session_id: string;
  session_start_at: Date;
  session_end_at?: Date;
  session_duration_minutes?: number;

  // Feature usage tracking
  feature_category: FeatureCategory;
  feature_name: string;
  feature_key: string;

  // Usage metrics
  action_type: ActionType;
  action_count: number;
  time_spent_seconds?: number;

  // Value and impact tracking
  estimated_time_saved_minutes?: number;
  value_score?: number;
  complexity_score?: number;

  // Context and metadata
  page_url?: string;
  user_agent?: string;
  device_type?: DeviceType;
  browser?: string;
  operating_system?: string;

  // Additional context data
  context_data?: Record<string, any>;
  error_occurred?: boolean;
  error_details?: Record<string, any>;

  // Performance metrics
  page_load_time_ms?: number;
  api_response_time_ms?: number;

  // System fields
  created_at: Date;
  recorded_at: Date;
}

// Trial Email Schedule interface (WS-167: trial_email_schedule table)
export interface TrialEmailSchedule {
  id: string;
  trial_id: string;
  user_id: string;

  // Email campaign information
  campaign_type: EmailCampaignType;
  campaign_name: string;
  email_sequence_position: number;

  // Email template and content
  template_id: string;
  template_name: string;
  subject_line: string;
  email_content_preview?: string;
  personalization_data?: Record<string, any>;

  // Scheduling information
  trigger_type: TriggerType;
  trigger_condition?: Record<string, any>;

  // Timing configuration
  days_after_trial_start?: number;
  hours_after_trigger?: number;
  optimal_send_time?: string;
  timezone?: string;

  // Scheduling status and timestamps
  scheduled_for: Date;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  unsubscribed_at?: Date;

  // Email status and delivery
  email_status: EmailStatus;
  delivery_status?: DeliveryStatus;

  // Engagement metrics
  open_count?: number;
  click_count?: number;
  reply_count?: number;
  forward_count?: number;

  // A/B testing and optimization
  variant_id?: string;
  test_group?: TestGroup;
  conversion_attributed?: boolean;
  conversion_value?: number;

  // Segmentation and targeting
  recipient_segment?: string;
  send_conditions?: Record<string, any>;
  exclusion_rules?: Record<string, any>;

  // Priority and importance
  priority_level?: number;
  business_impact_score?: number;

  // Email provider integration
  email_provider?: string;
  external_message_id?: string;
  provider_response?: Record<string, any>;

  // System fields
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// Supporting types for enhanced trial system
export type FeatureCategory =
  | 'client_management'
  | 'journey_builder'
  | 'communications'
  | 'guest_management'
  | 'vendor_management'
  | 'timeline_planning'
  | 'document_management'
  | 'analytics'
  | 'billing'
  | 'settings'
  | 'mobile_app'
  | 'integrations'
  | 'templates'
  | 'automation';

export type ActionType =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'share'
  | 'export'
  | 'import'
  | 'send'
  | 'schedule'
  | 'automate'
  | 'analyze'
  | 'configure';

export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'unknown';

export type EmailCampaignType =
  | 'welcome_series'
  | 'onboarding'
  | 'feature_introduction'
  | 'engagement'
  | 'milestone_celebration'
  | 'conversion'
  | 'retention'
  | 'win_back'
  | 'educational'
  | 'promotional'
  | 'reminder'
  | 'survey';

export type TriggerType =
  | 'time_based'
  | 'event_based'
  | 'behavior_based'
  | 'milestone_based'
  | 'engagement_based'
  | 'conversion_based'
  | 'manual';

export type EmailStatus =
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'failed'
  | 'cancelled'
  | 'skipped'
  | 'paused';

export type DeliveryStatus =
  | 'pending'
  | 'delivered'
  | 'soft_bounce'
  | 'hard_bounce'
  | 'spam'
  | 'rejected';

export type TestGroup = 'control' | 'variant_a' | 'variant_b' | 'variant_c';

// Enhanced API schemas with Zod validation for WS-167
export const TrialTrackingCreateSchema = z.object({
  trial_type: z
    .enum(['standard', 'extended', 'premium', 'enterprise'])
    .default('standard'),
  trial_duration_days: z.number().min(7).max(90).default(30),
  business_type: z.enum([
    'wedding_planner',
    'photographer',
    'videographer',
    'venue',
    'florist',
    'caterer',
    'dj_musician',
    'coordinator',
    'baker',
    'decorator',
    'other',
  ]),
  business_size: z
    .enum(['solo', 'small', 'medium', 'large', 'enterprise'])
    .default('small'),
  annual_wedding_count: z.number().min(0).optional(),
  referral_source: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  marketing_channel: z.string().optional(),
});

export const TrialActivityCreateSchema = z.object({
  trial_id: z.string().uuid(),
  feature_category: z.enum([
    'client_management',
    'journey_builder',
    'communications',
    'guest_management',
    'vendor_management',
    'timeline_planning',
    'document_management',
    'analytics',
    'billing',
    'settings',
    'mobile_app',
    'integrations',
    'templates',
    'automation',
  ]),
  feature_name: z.string().min(1).max(100),
  feature_key: z.string().min(1).max(100),
  action_type: z
    .enum([
      'view',
      'create',
      'edit',
      'delete',
      'share',
      'export',
      'import',
      'send',
      'schedule',
      'automate',
      'analyze',
      'configure',
    ])
    .default('view'),
  action_count: z.number().min(1).default(1),
  time_spent_seconds: z.number().min(0).optional(),
  estimated_time_saved_minutes: z.number().min(0).optional(),
  value_score: z.number().min(1).max(10).optional(),
  complexity_score: z.number().min(1).max(5).optional(),
  context_data: z.record(z.string(), z.any()).optional(),
  device_type: z
    .enum(['desktop', 'tablet', 'mobile', 'unknown'])
    .default('desktop'),
  page_load_time_ms: z.number().min(0).optional(),
  api_response_time_ms: z.number().min(0).optional(),
});

export const TrialEmailScheduleCreateSchema = z.object({
  trial_id: z.string().uuid(),
  campaign_type: z.enum([
    'welcome_series',
    'onboarding',
    'feature_introduction',
    'engagement',
    'milestone_celebration',
    'conversion',
    'retention',
    'win_back',
    'educational',
    'promotional',
    'reminder',
    'survey',
  ]),
  campaign_name: z.string().min(1).max(200),
  email_sequence_position: z.number().min(1).default(1),
  template_id: z.string().min(1),
  template_name: z.string().min(1).max(200),
  subject_line: z.string().min(1).max(300),
  trigger_type: z
    .enum([
      'time_based',
      'event_based',
      'behavior_based',
      'milestone_based',
      'engagement_based',
      'conversion_based',
      'manual',
    ])
    .default('time_based'),
  days_after_trial_start: z.number().min(0).default(0),
  hours_after_trigger: z.number().min(0).default(0),
  optimal_send_time: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/)
    .default('10:00:00'),
  timezone: z.string().default('UTC'),
  priority_level: z.number().min(1).max(10).default(5),
  business_impact_score: z.number().min(1).max(10).default(5),
  personalization_data: z.record(z.string(), z.any()).optional(),
  send_conditions: z.record(z.string(), z.any()).optional(),
});

// Enhanced API response types for WS-167
export interface WS167TrialStatusResponse {
  success: boolean;
  trial_tracking: TrialTracking;
  recent_activities: TrialActivity[];
  scheduled_emails: TrialEmailSchedule[];
  engagement_metrics: {
    daily_active_sessions: number;
    feature_adoption_rate: number;
    time_saved_total_minutes: number;
    conversion_likelihood: number;
    engagement_trend: 'increasing' | 'decreasing' | 'stable';
  };
  recommendations: {
    next_actions: string[];
    feature_suggestions: string[];
    conversion_opportunities: string[];
  };
}

export interface TrialAnalyticsResponse {
  success: boolean;
  trial_id: string;
  analytics_period: {
    start_date: string;
    end_date: string;
  };
  usage_summary: {
    total_sessions: number;
    total_time_spent_minutes: number;
    unique_features_used: number;
    most_valuable_features: Array<{
      feature_name: string;
      usage_count: number;
      time_saved_minutes: number;
    }>;
  };
  email_performance: {
    emails_sent: number;
    average_open_rate: number;
    average_click_rate: number;
    conversion_attributed_emails: number;
  };
  conversion_indicators: {
    setup_completion_rate: number;
    feature_adoption_score: number;
    engagement_score: number;
    days_until_conversion_prediction: number;
  };
}

// Type exports for form validation
export type TrialTrackingCreateForm = z.infer<typeof TrialTrackingCreateSchema>;
export type TrialActivityCreateForm = z.infer<typeof TrialActivityCreateSchema>;
export type TrialEmailScheduleCreateForm = z.infer<
  typeof TrialEmailScheduleCreateSchema
>;
