/**
 * WS-167 Trial Management System - Test Fixtures
 * Comprehensive test data fixtures for all trial scenarios
 * Provides consistent test data across unit, integration, and E2E tests
 */

import { addDays, subDays, addHours, subHours } from 'date-fns';
import {
  TrialConfig,
  TrialFeatureUsage,
  TrialMilestone,
  TrialOnboardingData,
  TrialROIMetrics,
  TrialProgress,
  TrialStatusResponse,
  TrialActivity,
  TrialTracking,
  TrialEmailSchedule,
  BusinessType,
  MilestoneType,
  TrialStatus,
  EnhancedTrialStatus,
  FeatureCategory,
  ActionType,
  EmailCampaignType,
  TriggerType,
  EmailStatus
} from '@/types/trial';

// Base date for consistent test scenarios
const FIXTURE_BASE_DATE = new Date('2025-01-20T10:00:00Z');

/**
 * User fixtures for different business types and scenarios
 */
export const UserFixtures = {
  // Wedding planner with high engagement
  weddingPlannerActive: {
    id: 'user-wp-active-001',
    email: 'sarah@dreamweddings.com',
    aud: 'authenticated',
    user_metadata: {
      business_name: 'Dream Weddings Co',
      business_type: 'wedding_planner',
      location: 'San Francisco, CA'
    }
  },

  // Photographer starting trial
  photographerNew: {
    id: 'user-photo-new-002',
    email: 'mike@capturemoments.com',
    aud: 'authenticated',
    user_metadata: {
      business_name: 'Capture Moments Photography',
      business_type: 'photographer',
      location: 'Austin, TX'
    }
  },

  // Venue coordinator with low engagement
  venueCoordinatorLow: {
    id: 'user-venue-low-003',
    email: 'jen@grandballroom.com',
    aud: 'authenticated',
    user_metadata: {
      business_name: 'Grand Ballroom Events',
      business_type: 'venue',
      location: 'Chicago, IL'
    }
  },

  // Enterprise wedding planner
  enterpriseWeddingPlanner: {
    id: 'user-enterprise-004',
    email: 'admin@luxuryweddings.com',
    aud: 'authenticated',
    user_metadata: {
      business_name: 'Luxury Weddings International',
      business_type: 'wedding_planner',
      location: 'New York, NY',
      team_size: 25
    }
  }
};

/**
 * Onboarding data fixtures for different business scenarios
 */
export const OnboardingDataFixtures: Record<string, TrialOnboardingData> = {
  weddingPlannerHighValue: {
    business_type: 'wedding_planner',
    business_name: 'Elite Wedding Designs',
    primary_goals: ['save_time', 'grow_business', 'improve_efficiency'],
    current_challenges: ['manual_tasks', 'communication_delays', 'client_tracking'],
    weekly_time_spent_hours: 45,
    estimated_hourly_value: 125,
    team_size: 4,
    current_client_count: 28,
    growth_goals: 'Scale to 100+ premium weddings annually while maintaining quality and expanding to destination weddings'
  },

  photographerSolo: {
    business_type: 'photographer',
    business_name: 'Lens & Light Photography',
    primary_goals: ['save_time', 'improve_efficiency'],
    current_challenges: ['manual_tasks', 'client_tracking'],
    weekly_time_spent_hours: 25,
    estimated_hourly_value: 85,
    team_size: 1,
    current_client_count: 12,
    growth_goals: 'Streamline booking process and client management to handle 30+ weddings per year'
  },

  venueManager: {
    business_type: 'venue',
    business_name: 'Riverside Garden Venue',
    primary_goals: ['improve_efficiency', 'grow_business'],
    current_challenges: ['communication_delays', 'vendor_coordination'],
    weekly_time_spent_hours: 35,
    estimated_hourly_value: 65,
    team_size: 3,
    current_client_count: 45,
    growth_goals: 'Optimize venue operations and increase bookings by 40% through better vendor relationships'
  },

  floristBoutique: {
    business_type: 'florist',
    business_name: 'Bloom & Blossom',
    primary_goals: ['save_time', 'grow_business'],
    current_challenges: ['manual_tasks', 'communication_delays', 'tracking_issues'],
    weekly_time_spent_hours: 30,
    estimated_hourly_value: 70,
    team_size: 2,
    current_client_count: 18,
    growth_goals: 'Expand from 50 to 100 weddings annually and develop signature floral collections'
  },

  djMusicianFreelancer: {
    business_type: 'dj_musician',
    business_name: 'Harmony Entertainment',
    primary_goals: ['save_time', 'improve_efficiency'],
    current_challenges: ['manual_tasks', 'client_tracking'],
    weekly_time_spent_hours: 20,
    estimated_hourly_value: 95,
    team_size: 1,
    current_client_count: 24,
    growth_goals: 'Build premium brand and increase bookings through referral system'
  }
};

/**
 * Trial configuration fixtures for different states and scenarios
 */
export const TrialConfigFixtures: Record<string, TrialConfig> = {
  activeHighEngagement: {
    id: 'trial-active-high-001',
    user_id: UserFixtures.weddingPlannerActive.id,
    business_type: 'wedding_planner',
    business_goals: ['save_time', 'grow_business', 'improve_efficiency'],
    current_workflow_pain_points: ['manual_tasks', 'communication_delays', 'client_tracking'],
    expected_time_savings_hours: 18,
    hourly_rate: 125,
    trial_start: subDays(FIXTURE_BASE_DATE, 10),
    trial_end: addDays(FIXTURE_BASE_DATE, 20),
    status: 'active',
    onboarding_completed: true,
    created_at: subDays(FIXTURE_BASE_DATE, 10),
    updated_at: subDays(FIXTURE_BASE_DATE, 1)
  },

  activeNewUser: {
    id: 'trial-new-user-002',
    user_id: UserFixtures.photographerNew.id,
    business_type: 'photographer',
    business_goals: ['save_time', 'improve_efficiency'],
    current_workflow_pain_points: ['manual_tasks', 'client_tracking'],
    expected_time_savings_hours: 8,
    hourly_rate: 85,
    trial_start: subDays(FIXTURE_BASE_DATE, 2),
    trial_end: addDays(FIXTURE_BASE_DATE, 28),
    status: 'active',
    onboarding_completed: true,
    created_at: subDays(FIXTURE_BASE_DATE, 2),
    updated_at: FIXTURE_BASE_DATE
  },

  activeLowEngagement: {
    id: 'trial-low-engagement-003',
    user_id: UserFixtures.venueCoordinatorLow.id,
    business_type: 'venue',
    business_goals: ['improve_efficiency'],
    current_workflow_pain_points: ['communication_delays'],
    expected_time_savings_hours: 5,
    hourly_rate: 65,
    trial_start: subDays(FIXTURE_BASE_DATE, 20),
    trial_end: addDays(FIXTURE_BASE_DATE, 10),
    status: 'active',
    onboarding_completed: true,
    created_at: subDays(FIXTURE_BASE_DATE, 20),
    updated_at: subDays(FIXTURE_BASE_DATE, 15)
  },

  expiredTrial: {
    id: 'trial-expired-004',
    user_id: 'user-expired-004',
    business_type: 'wedding_planner',
    business_goals: ['save_time'],
    current_workflow_pain_points: ['manual_tasks'],
    expected_time_savings_hours: 12,
    hourly_rate: 95,
    trial_start: subDays(FIXTURE_BASE_DATE, 40),
    trial_end: subDays(FIXTURE_BASE_DATE, 10),
    status: 'expired',
    onboarding_completed: true,
    created_at: subDays(FIXTURE_BASE_DATE, 40),
    updated_at: subDays(FIXTURE_BASE_DATE, 10)
  },

  convertedTrial: {
    id: 'trial-converted-005',
    user_id: 'user-converted-005',
    business_type: 'photographer',
    business_goals: ['save_time', 'grow_business'],
    current_workflow_pain_points: ['manual_tasks', 'client_tracking'],
    expected_time_savings_hours: 15,
    hourly_rate: 110,
    trial_start: subDays(FIXTURE_BASE_DATE, 35),
    trial_end: subDays(FIXTURE_BASE_DATE, 5),
    status: 'converted',
    onboarding_completed: true,
    created_at: subDays(FIXTURE_BASE_DATE, 35),
    updated_at: subDays(FIXTURE_BASE_DATE, 5)
  },

  cancelledTrial: {
    id: 'trial-cancelled-006',
    user_id: 'user-cancelled-006',
    business_type: 'venue',
    business_goals: ['improve_efficiency'],
    current_workflow_pain_points: ['communication_delays'],
    expected_time_savings_hours: 6,
    hourly_rate: 55,
    trial_start: subDays(FIXTURE_BASE_DATE, 25),
    trial_end: addDays(FIXTURE_BASE_DATE, 5),
    status: 'cancelled',
    onboarding_completed: true,
    created_at: subDays(FIXTURE_BASE_DATE, 25),
    updated_at: subDays(FIXTURE_BASE_DATE, 2)
  }
};

/**
 * Feature usage fixtures for different engagement levels
 */
export const FeatureUsageFixtures: Record<string, TrialFeatureUsage[]> = {
  highEngagementUsage: [
    {
      id: 'usage-high-001',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      feature_key: 'client_onboarding',
      feature_name: 'Client Onboarding System',
      usage_count: 12,
      time_saved_minutes: 360, // 6 hours total
      last_used_at: subHours(FIXTURE_BASE_DATE, 2),
      created_at: subDays(FIXTURE_BASE_DATE, 8)
    },
    {
      id: 'usage-high-002',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      feature_key: 'email_automation',
      feature_name: 'Email Automation System',
      usage_count: 25,
      time_saved_minutes: 500, // 8.33 hours
      last_used_at: subHours(FIXTURE_BASE_DATE, 1),
      created_at: subDays(FIXTURE_BASE_DATE, 7)
    },
    {
      id: 'usage-high-003',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      feature_key: 'timeline_management',
      feature_name: 'Wedding Timeline Builder',
      usage_count: 8,
      time_saved_minutes: 280, // 4.67 hours
      last_used_at: subHours(FIXTURE_BASE_DATE, 6),
      created_at: subDays(FIXTURE_BASE_DATE, 6)
    },
    {
      id: 'usage-high-004',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      feature_key: 'vendor_communication',
      feature_name: 'Vendor Coordination Tools',
      usage_count: 15,
      time_saved_minutes: 375, // 6.25 hours
      last_used_at: subHours(FIXTURE_BASE_DATE, 4),
      created_at: subDays(FIXTURE_BASE_DATE, 5)
    },
    {
      id: 'usage-high-005',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      feature_key: 'guest_management',
      feature_name: 'Guest Management System',
      usage_count: 6,
      time_saved_minutes: 270, // 4.5 hours
      last_used_at: subHours(FIXTURE_BASE_DATE, 8),
      created_at: subDays(FIXTURE_BASE_DATE, 4)
    }
  ],

  moderateEngagementUsage: [
    {
      id: 'usage-mod-001',
      trial_id: TrialConfigFixtures.activeNewUser.id,
      feature_key: 'client_onboarding',
      feature_name: 'Client Onboarding System',
      usage_count: 3,
      time_saved_minutes: 90,
      last_used_at: subHours(FIXTURE_BASE_DATE, 12),
      created_at: subDays(FIXTURE_BASE_DATE, 1)
    },
    {
      id: 'usage-mod-002',
      trial_id: TrialConfigFixtures.activeNewUser.id,
      feature_key: 'document_management',
      feature_name: 'Document Organization',
      usage_count: 4,
      time_saved_minutes: 80,
      last_used_at: subHours(FIXTURE_BASE_DATE, 18),
      created_at: subDays(FIXTURE_BASE_DATE, 1)
    }
  ],

  lowEngagementUsage: [
    {
      id: 'usage-low-001',
      trial_id: TrialConfigFixtures.activeLowEngagement.id,
      feature_key: 'task_automation',
      feature_name: 'Task Automation',
      usage_count: 1,
      time_saved_minutes: 15,
      last_used_at: subDays(FIXTURE_BASE_DATE, 5),
      created_at: subDays(FIXTURE_BASE_DATE, 5)
    }
  ]
};

/**
 * Milestone fixtures for different achievement scenarios
 */
export const MilestoneFixtures: Record<string, TrialMilestone[]> = {
  highAchievementMilestones: [
    {
      id: 'milestone-high-001',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      milestone_type: 'first_client_connected',
      milestone_name: 'First Client Connected',
      description: 'Successfully add and configure your first client profile',
      achieved: true,
      achieved_at: subDays(FIXTURE_BASE_DATE, 8),
      time_to_achieve_hours: 6,
      value_impact_score: 8,
      created_at: subDays(FIXTURE_BASE_DATE, 10)
    },
    {
      id: 'milestone-high-002',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      milestone_type: 'initial_journey_created',
      milestone_name: 'Initial Journey Created',
      description: 'Create your first automated client journey',
      achieved: true,
      achieved_at: subDays(FIXTURE_BASE_DATE, 7),
      time_to_achieve_hours: 24,
      value_impact_score: 9,
      created_at: subDays(FIXTURE_BASE_DATE, 10)
    },
    {
      id: 'milestone-high-003',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      milestone_type: 'vendor_added',
      milestone_name: 'Vendor Added',
      description: 'Add your first vendor partner to the platform',
      achieved: true,
      achieved_at: subDays(FIXTURE_BASE_DATE, 6),
      time_to_achieve_hours: 12,
      value_impact_score: 7,
      created_at: subDays(FIXTURE_BASE_DATE, 10)
    },
    {
      id: 'milestone-high-004',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      milestone_type: 'timeline_created',
      milestone_name: 'Timeline Created',
      description: 'Build your first wedding timeline with tasks',
      achieved: true,
      achieved_at: subDays(FIXTURE_BASE_DATE, 4),
      time_to_achieve_hours: 18,
      value_impact_score: 9,
      created_at: subDays(FIXTURE_BASE_DATE, 10)
    },
    {
      id: 'milestone-high-005',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      milestone_type: 'guest_list_imported',
      milestone_name: 'Guest List Imported',
      description: 'Import or create your first guest list',
      achieved: false,
      value_impact_score: 8,
      created_at: subDays(FIXTURE_BASE_DATE, 10)
    }
  ],

  moderateAchievementMilestones: [
    {
      id: 'milestone-mod-001',
      trial_id: TrialConfigFixtures.activeNewUser.id,
      milestone_type: 'first_client_connected',
      milestone_name: 'First Client Connected',
      description: 'Successfully add and configure your first client profile',
      achieved: true,
      achieved_at: subDays(FIXTURE_BASE_DATE, 1),
      time_to_achieve_hours: 18,
      value_impact_score: 8,
      created_at: subDays(FIXTURE_BASE_DATE, 2)
    },
    {
      id: 'milestone-mod-002',
      trial_id: TrialConfigFixtures.activeNewUser.id,
      milestone_type: 'initial_journey_created',
      milestone_name: 'Initial Journey Created',
      description: 'Create your first automated client journey',
      achieved: false,
      value_impact_score: 9,
      created_at: subDays(FIXTURE_BASE_DATE, 2)
    }
  ],

  lowAchievementMilestones: [
    {
      id: 'milestone-low-001',
      trial_id: TrialConfigFixtures.activeLowEngagement.id,
      milestone_type: 'first_client_connected',
      milestone_name: 'First Client Connected',
      description: 'Successfully add and configure your first client profile',
      achieved: false,
      value_impact_score: 8,
      created_at: subDays(FIXTURE_BASE_DATE, 20)
    },
    {
      id: 'milestone-low-002',
      trial_id: TrialConfigFixtures.activeLowEngagement.id,
      milestone_type: 'initial_journey_created',
      milestone_name: 'Initial Journey Created',
      description: 'Create your first automated client journey',
      achieved: false,
      value_impact_score: 9,
      created_at: subDays(FIXTURE_BASE_DATE, 20)
    }
  ]
};

/**
 * ROI metrics fixtures for different performance scenarios
 */
export const ROIMetricsFixtures: Record<string, TrialROIMetrics> = {
  exceptionalROI: {
    trial_id: TrialConfigFixtures.activeHighEngagement.id,
    total_time_saved_hours: 29.25, // From high engagement usage
    estimated_cost_savings: 3656.25, // 29.25 * 125
    productivity_improvement_percent: 100, // Maxed out: (4 milestones * 15) + (5 features * 5) = 85, capped at 100
    features_adopted_count: 5,
    milestones_achieved_count: 4,
    workflow_efficiency_gain: 100, // 29.25 / 18 * 100 = 162.5, capped at 100
    projected_monthly_savings: 15825, // Weekly savings * 4 weeks
    roi_percentage: 32204, // ((15825 - 49) / 49) * 100
    calculated_at: FIXTURE_BASE_DATE
  },

  goodROI: {
    trial_id: TrialConfigFixtures.activeNewUser.id,
    total_time_saved_hours: 2.83, // From moderate usage
    estimated_cost_savings: 240.55, // 2.83 * 85
    productivity_improvement_percent: 30, // (1 milestone * 15) + (2 features * 5) = 25
    features_adopted_count: 2,
    milestones_achieved_count: 1,
    workflow_efficiency_gain: 35.38, // 2.83 / 8 * 100
    projected_monthly_savings: 1617.71, // Projected monthly
    roi_percentage: 3199, // ROI calculation
    calculated_at: FIXTURE_BASE_DATE
  },

  poorROI: {
    trial_id: TrialConfigFixtures.activeLowEngagement.id,
    total_time_saved_hours: 0.25, // From low usage
    estimated_cost_savings: 16.25, // 0.25 * 65
    productivity_improvement_percent: 5, // (0 milestones * 15) + (1 feature * 5) = 5
    features_adopted_count: 1,
    milestones_achieved_count: 0,
    workflow_efficiency_gain: 5, // 0.25 / 5 * 100
    projected_monthly_savings: 105, // Very low projected savings
    roi_percentage: 114, // ((105 - 49) / 49) * 100
    calculated_at: FIXTURE_BASE_DATE
  }
};

/**
 * Enhanced trial tracking fixtures for WS-167
 */
export const TrialTrackingFixtures: Record<string, TrialTracking> = {
  enterpriseTrialTracking: {
    id: 'tracking-enterprise-001',
    user_id: UserFixtures.enterpriseWeddingPlanner.id,
    supplier_id: 'supplier-enterprise-001',
    trial_type: 'premium',
    trial_duration_days: 45, // Extended trial for enterprise
    trial_started_at: subDays(FIXTURE_BASE_DATE, 15),
    trial_expires_at: addDays(FIXTURE_BASE_DATE, 30),
    trial_extended_at: subDays(FIXTURE_BASE_DATE, 5),
    trial_converted_at: undefined,
    trial_cancelled_at: undefined,
    current_status: 'active',
    previous_status: undefined,
    status_changed_at: subDays(FIXTURE_BASE_DATE, 15),
    business_type: 'wedding_planner',
    business_size: 'enterprise',
    annual_wedding_count: 500,
    onboarding_completed: true,
    onboarding_completed_at: subDays(FIXTURE_BASE_DATE, 14),
    setup_progress: 95,
    feature_adoption_score: 88,
    conversion_probability: 0.85,
    engagement_score: 92,
    last_activity_at: subHours(FIXTURE_BASE_DATE, 2),
    days_since_last_login: 0,
    referral_source: 'partner_program',
    utm_source: 'wedding_wire',
    utm_medium: 'cpc',
    utm_campaign: 'premium_trial_2025',
    marketing_channel: 'paid_search',
    created_at: subDays(FIXTURE_BASE_DATE, 15),
    updated_at: FIXTURE_BASE_DATE,
    created_by: 'system'
  },

  standardTrialTracking: {
    id: 'tracking-standard-002',
    user_id: UserFixtures.photographerNew.id,
    trial_type: 'standard',
    trial_duration_days: 30,
    trial_started_at: subDays(FIXTURE_BASE_DATE, 7),
    trial_expires_at: addDays(FIXTURE_BASE_DATE, 23),
    current_status: 'active',
    status_changed_at: subDays(FIXTURE_BASE_DATE, 7),
    business_type: 'photographer',
    business_size: 'solo',
    annual_wedding_count: 35,
    onboarding_completed: true,
    onboarding_completed_at: subDays(FIXTURE_BASE_DATE, 6),
    setup_progress: 75,
    feature_adoption_score: 45,
    conversion_probability: 0.65,
    engagement_score: 58,
    last_activity_at: subHours(FIXTURE_BASE_DATE, 8),
    days_since_last_login: 0,
    referral_source: 'organic_search',
    utm_source: 'google',
    utm_medium: 'organic',
    marketing_channel: 'seo',
    created_at: subDays(FIXTURE_BASE_DATE, 7),
    updated_at: FIXTURE_BASE_DATE
  }
};

/**
 * Trial activity fixtures for detailed tracking
 */
export const TrialActivityFixtures: Record<string, TrialActivity[]> = {
  highActivityStream: [
    {
      id: 'activity-high-001',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      user_id: UserFixtures.weddingPlannerActive.id,
      activity_date: subDays(FIXTURE_BASE_DATE, 1),
      session_id: 'session-001',
      session_start_at: subHours(FIXTURE_BASE_DATE, 3),
      session_end_at: subHours(FIXTURE_BASE_DATE, 2),
      session_duration_minutes: 60,
      feature_category: 'client_management',
      feature_name: 'Client Profile Setup',
      feature_key: 'client_onboarding',
      action_type: 'create',
      action_count: 2,
      time_spent_seconds: 1800, // 30 minutes
      estimated_time_saved_minutes: 45,
      value_score: 9,
      complexity_score: 3,
      page_url: '/clients/new',
      device_type: 'desktop',
      browser: 'Chrome',
      operating_system: 'macOS',
      context_data: {
        clients_created: 2,
        forms_completed: 2,
        photos_uploaded: 8
      },
      error_occurred: false,
      page_load_time_ms: 1200,
      api_response_time_ms: 340,
      created_at: subDays(FIXTURE_BASE_DATE, 1),
      recorded_at: subDays(FIXTURE_BASE_DATE, 1)
    },
    {
      id: 'activity-high-002',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      user_id: UserFixtures.weddingPlannerActive.id,
      activity_date: subDays(FIXTURE_BASE_DATE, 2),
      session_id: 'session-002',
      session_start_at: subDays(FIXTURE_BASE_DATE, 2),
      session_end_at: subHours(subDays(FIXTURE_BASE_DATE, 2), -1),
      session_duration_minutes: 90,
      feature_category: 'journey_builder',
      feature_name: 'Automated Email Sequences',
      feature_key: 'email_automation',
      action_type: 'configure',
      action_count: 5,
      time_spent_seconds: 2700, // 45 minutes
      estimated_time_saved_minutes: 120,
      value_score: 8,
      complexity_score: 4,
      page_url: '/journeys/email-builder',
      device_type: 'desktop',
      context_data: {
        sequences_created: 3,
        emails_configured: 5,
        triggers_set: 8
      },
      error_occurred: false,
      page_load_time_ms: 980,
      api_response_time_ms: 280,
      created_at: subDays(FIXTURE_BASE_DATE, 2),
      recorded_at: subDays(FIXTURE_BASE_DATE, 2)
    }
  ]
};

/**
 * Email scheduling fixtures for trial nurturing
 */
export const TrialEmailScheduleFixtures: Record<string, TrialEmailSchedule[]> = {
  welcomeSeries: [
    {
      id: 'email-welcome-001',
      trial_id: TrialConfigFixtures.activeNewUser.id,
      user_id: UserFixtures.photographerNew.id,
      campaign_type: 'welcome_series',
      campaign_name: 'Photography Trial Welcome Series',
      email_sequence_position: 1,
      template_id: 'template-welcome-001',
      template_name: 'Welcome to Your Trial',
      subject_line: '🎉 Welcome to WedSync - Your 30-day trial starts now!',
      email_content_preview: 'Welcome to WedSync! We\'re excited to help you streamline your photography business...',
      personalization_data: {
        business_name: OnboardingDataFixtures.photographerSolo.business_name,
        first_name: 'Mike',
        business_type: 'photographer',
        expected_savings: '$680/month'
      },
      trigger_type: 'time_based',
      days_after_trial_start: 0,
      hours_after_trigger: 1,
      optimal_send_time: '10:00:00',
      timezone: 'America/Chicago',
      scheduled_for: addHours(subDays(FIXTURE_BASE_DATE, 2), 1),
      sent_at: addHours(subDays(FIXTURE_BASE_DATE, 2), 1),
      delivered_at: addHours(subDays(FIXTURE_BASE_DATE, 2), 1),
      opened_at: addHours(subDays(FIXTURE_BASE_DATE, 2), 3),
      clicked_at: addHours(subDays(FIXTURE_BASE_DATE, 2), 3),
      email_status: 'sent',
      delivery_status: 'delivered',
      open_count: 2,
      click_count: 1,
      reply_count: 0,
      forward_count: 0,
      variant_id: 'welcome_v1',
      test_group: 'control',
      conversion_attributed: false,
      recipient_segment: 'new_photographer_trial',
      priority_level: 8,
      business_impact_score: 9,
      email_provider: 'sendgrid',
      external_message_id: 'sg_msg_001',
      created_at: subDays(FIXTURE_BASE_DATE, 2),
      updated_at: addHours(subDays(FIXTURE_BASE_DATE, 2), 4)
    }
  ],

  engagementSeries: [
    {
      id: 'email-engagement-001',
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      user_id: UserFixtures.weddingPlannerActive.id,
      campaign_type: 'engagement',
      campaign_name: 'High Engagement Milestone Celebration',
      email_sequence_position: 3,
      template_id: 'template-milestone-001',
      template_name: 'Milestone Achievement Celebration',
      subject_line: '🏆 Amazing progress! You\'ve achieved 4 milestones',
      trigger_type: 'milestone_based',
      trigger_condition: {
        milestone_type: 'timeline_created',
        achievement_count: 4
      },
      days_after_trial_start: 10,
      scheduled_for: subDays(FIXTURE_BASE_DATE, 1),
      sent_at: subDays(FIXTURE_BASE_DATE, 1),
      delivered_at: subDays(FIXTURE_BASE_DATE, 1),
      opened_at: subHours(FIXTURE_BASE_DATE, 18),
      email_status: 'sent',
      delivery_status: 'delivered',
      open_count: 1,
      click_count: 1,
      conversion_attributed: true,
      conversion_value: 588, // Monthly subscription value
      priority_level: 9,
      business_impact_score: 10,
      created_at: subDays(FIXTURE_BASE_DATE, 2),
      updated_at: subHours(FIXTURE_BASE_DATE, 18)
    }
  ]
};

/**
 * Complete trial status response fixtures
 */
export const TrialStatusResponseFixtures: Record<string, TrialStatusResponse> = {
  highPerformanceTrial: {
    success: true,
    trial: TrialConfigFixtures.activeHighEngagement,
    progress: {
      trial_id: TrialConfigFixtures.activeHighEngagement.id,
      days_remaining: 20,
      days_elapsed: 10,
      progress_percentage: 33.33,
      milestones_achieved: MilestoneFixtures.highAchievementMilestones.filter(m => m.achieved),
      milestones_remaining: MilestoneFixtures.highAchievementMilestones.filter(m => !m.achieved),
      feature_usage_summary: FeatureUsageFixtures.highEngagementUsage,
      roi_metrics: ROIMetricsFixtures.exceptionalROI,
      conversion_recommendation: 'Exceptional ROI! You\'re saving $15,825/month. Upgrade now to lock in these savings.',
      urgency_score: 2
    },
    recommendations: {
      next_actions: [
        'Complete your guest list import to unlock the final milestone',
        'Explore advanced automation features',
        'Upgrade now to secure your productivity gains'
      ],
      upgrade_benefits: [
        'Unlimited clients and vendors',
        'Advanced journey automation',
        'Priority support access',
        'Advanced analytics and reporting'
      ],
      urgency_message: undefined
    }
  },

  newTrialInProgress: {
    success: true,
    trial: TrialConfigFixtures.activeNewUser,
    progress: {
      trial_id: TrialConfigFixtures.activeNewUser.id,
      days_remaining: 28,
      days_elapsed: 2,
      progress_percentage: 6.67,
      milestones_achieved: MilestoneFixtures.moderateAchievementMilestones.filter(m => m.achieved),
      milestones_remaining: MilestoneFixtures.moderateAchievementMilestones.filter(m => !m.achieved),
      feature_usage_summary: FeatureUsageFixtures.moderateEngagementUsage,
      roi_metrics: ROIMetricsFixtures.goodROI,
      conversion_recommendation: 'Keep exploring! Try reaching more milestones to see the full value of WedSync Professional.',
      urgency_score: 2
    },
    recommendations: {
      next_actions: [
        'Add your first client to see the platform\'s value',
        'Create your first automated journey',
        'Try more features to see comprehensive time savings'
      ],
      upgrade_benefits: [
        'Unlimited clients and vendors',
        'Advanced journey automation',
        'Priority support access',
        'Advanced analytics and reporting'
      ]
    }
  },

  urgentTrial: {
    success: true,
    trial: {
      ...TrialConfigFixtures.activeLowEngagement,
      trial_end: addDays(FIXTURE_BASE_DATE, 3) // 3 days remaining
    },
    progress: {
      trial_id: TrialConfigFixtures.activeLowEngagement.id,
      days_remaining: 3,
      days_elapsed: 27,
      progress_percentage: 90,
      milestones_achieved: [],
      milestones_remaining: MilestoneFixtures.lowAchievementMilestones,
      feature_usage_summary: FeatureUsageFixtures.lowEngagementUsage,
      roi_metrics: ROIMetricsFixtures.poorROI,
      conversion_recommendation: 'Trial ending soon! You\'ve achieved 0 milestones. Upgrade to continue your progress.',
      urgency_score: 5
    },
    recommendations: {
      next_actions: [
        'Add your first client to see the platform\'s value',
        'Complete more milestones to maximize your trial benefits'
      ],
      upgrade_benefits: [
        'Unlimited clients and vendors',
        'Advanced journey automation',
        'Priority support access',
        'Advanced analytics and reporting'
      ],
      urgency_message: 'Only 3 days left! Don\'t lose your progress.'
    }
  }
};

/**
 * Utility functions for fixture management
 */
export const FixtureUtils = {
  /**
   * Create a custom trial config with overrides
   */
  createTrialConfig(overrides: Partial<TrialConfig>): TrialConfig {
    return {
      ...TrialConfigFixtures.activeHighEngagement,
      ...overrides
    };
  },

  /**
   * Create feature usage data for a specific trial
   */
  createFeatureUsage(trialId: string, featureKey: string, overrides: Partial<TrialFeatureUsage> = {}): TrialFeatureUsage {
    return {
      id: `usage-${trialId}-${featureKey}`,
      trial_id: trialId,
      feature_key: featureKey,
      feature_name: featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      usage_count: 1,
      time_saved_minutes: 30,
      last_used_at: FIXTURE_BASE_DATE,
      created_at: subDays(FIXTURE_BASE_DATE, 1),
      ...overrides
    };
  },

  /**
   * Create a milestone for a specific trial
   */
  createMilestone(trialId: string, milestoneType: MilestoneType, achieved: boolean = false, overrides: Partial<TrialMilestone> = {}): TrialMilestone {
    return {
      id: `milestone-${trialId}-${milestoneType}`,
      trial_id: trialId,
      milestone_type: milestoneType,
      milestone_name: milestoneType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Test milestone for ${milestoneType}`,
      achieved,
      achieved_at: achieved ? subDays(FIXTURE_BASE_DATE, 1) : undefined,
      time_to_achieve_hours: achieved ? 12 : undefined,
      value_impact_score: 8,
      created_at: subDays(FIXTURE_BASE_DATE, 2),
      ...overrides
    };
  },

  /**
   * Generate time-series activity data
   */
  generateActivityTimeSeries(trialId: string, userId: string, days: number): TrialActivity[] {
    const activities: TrialActivity[] = [];
    const features = ['client_management', 'email_automation', 'timeline_planning', 'vendor_management'];
    
    for (let i = 0; i < days; i++) {
      const activityDate = subDays(FIXTURE_BASE_DATE, i);
      const sessionsPerDay = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < sessionsPerDay; j++) {
        const featureCategory = features[Math.floor(Math.random() * features.length)] as FeatureCategory;
        
        activities.push({
          id: `activity-${trialId}-${i}-${j}`,
          trial_id: trialId,
          user_id: userId,
          activity_date: activityDate,
          session_id: `session-${i}-${j}`,
          session_start_at: addHours(activityDate, 9 + (j * 3)),
          session_end_at: addHours(activityDate, 9 + (j * 3) + 1),
          session_duration_minutes: 60,
          feature_category: featureCategory,
          feature_name: `${featureCategory.replace(/_/g, ' ')} Feature`,
          feature_key: featureCategory,
          action_type: 'view' as ActionType,
          action_count: Math.floor(Math.random() * 10) + 1,
          time_spent_seconds: Math.floor(Math.random() * 3600) + 300,
          estimated_time_saved_minutes: Math.floor(Math.random() * 60) + 5,
          value_score: Math.floor(Math.random() * 5) + 6,
          complexity_score: Math.floor(Math.random() * 5) + 1,
          device_type: 'desktop',
          error_occurred: false,
          page_load_time_ms: Math.floor(Math.random() * 2000) + 500,
          api_response_time_ms: Math.floor(Math.random() * 500) + 100,
          created_at: activityDate,
          recorded_at: activityDate
        });
      }
    }
    
    return activities;
  },

  /**
   * Reset all fixture dates relative to a new base date
   */
  resetFixtureDates(newBaseDate: Date): void {
    // This would update all fixture dates relative to the new base date
    // Implementation would recursively update all date fields in fixtures
    console.log(`Fixture dates would be reset to base date: ${newBaseDate.toISOString()}`);
  }
};

/**
 * Test helpers for database operations and bulk data creation
 */
export class TrialTestHelpers {
  /**
   * Create a test trial with all associated data
   */
  static async createTestTrial(
    supabase: any,
    config: TrialConfig
  ): Promise<{ trialId: string; userId: string }> {
    // Create test user first
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-${config.id}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        business_name: config.business_type + ' Business',
        business_type: config.business_type
      }
    });

    if (userError) throw userError;

    const userId = userData.user.id;

    // Create trial record
    const { data: trialData, error: trialError } = await supabase
      .from('trials')
      .insert({
        ...config,
        id: config.id,
        user_id: userId
      })
      .select()
      .single();

    if (trialError) throw trialError;

    return {
      trialId: trialData.id,
      userId: userId
    };
  }

  /**
   * Create bulk feature usage data for performance testing
   */
  static async createBulkFeatureUsage(
    supabase: any,
    trialId: string,
    count: number
  ): Promise<void> {
    const featureKeys = [
      'client_onboarding',
      'email_automation',
      'timeline_management',
      'vendor_communication',
      'guest_management',
      'document_management',
      'task_automation',
      'analytics_dashboard',
      'communication_hub',
      'workflow_builder'
    ];

    const bulkData = [];
    
    for (let i = 0; i < count; i++) {
      const featureKey = featureKeys[i % featureKeys.length];
      const usageCount = Math.floor(Math.random() * 20) + 1;
      const timeSaved = Math.floor(Math.random() * 120) + 15;
      
      bulkData.push({
        id: `bulk-usage-${trialId}-${i}`,
        trial_id: trialId,
        feature_key: featureKey,
        feature_name: featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        usage_count: usageCount,
        time_saved_minutes: timeSaved,
        last_used_at: subDays(FIXTURE_BASE_DATE, Math.floor(Math.random() * 30)),
        created_at: subDays(FIXTURE_BASE_DATE, Math.floor(Math.random() * 30))
      });
    }

    // Insert in chunks to avoid query size limits
    const chunkSize = 50;
    for (let i = 0; i < bulkData.length; i += chunkSize) {
      const chunk = bulkData.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('trial_feature_usage')
        .insert(chunk);
      
      if (error) throw error;
    }
  }

  /**
   * Create bulk milestone data for performance testing
   */
  static async createBulkMilestones(
    supabase: any,
    trialId: string,
    count: number
  ): Promise<void> {
    const milestoneTypes = [
      'first_client_connected',
      'initial_journey_created',
      'vendor_added',
      'timeline_created',
      'guest_list_imported',
      'first_email_sent',
      'automation_configured',
      'dashboard_customized',
      'team_member_invited',
      'payment_processed'
    ];

    const bulkData = [];
    
    for (let i = 0; i < count; i++) {
      const milestoneType = milestoneTypes[i % milestoneTypes.length];
      const achieved = Math.random() > 0.4; // 60% achievement rate
      const valueImpactScore = Math.floor(Math.random() * 5) + 6; // 6-10 scale
      
      bulkData.push({
        id: `bulk-milestone-${trialId}-${i}`,
        trial_id: trialId,
        milestone_type: milestoneType,
        milestone_name: milestoneType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `Performance test milestone: ${milestoneType}`,
        achieved: achieved,
        achieved_at: achieved ? subDays(FIXTURE_BASE_DATE, Math.floor(Math.random() * 20)) : undefined,
        time_to_achieve_hours: achieved ? Math.floor(Math.random() * 48) + 1 : undefined,
        value_impact_score: valueImpactScore,
        created_at: subDays(FIXTURE_BASE_DATE, Math.floor(Math.random() * 30))
      });
    }

    // Insert in chunks
    const chunkSize = 50;
    for (let i = 0; i < bulkData.length; i += chunkSize) {
      const chunk = bulkData.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('trial_milestones')
        .insert(chunk);
      
      if (error) throw error;
    }
  }

  /**
   * Create bulk activity data for performance testing
   */
  static async createBulkActivityData(
    supabase: any,
    trialId: string,
    userId: string,
    count: number
  ): Promise<void> {
    const activities = FixtureUtils.generateActivityTimeSeries(trialId, userId, count);
    
    // Insert in chunks
    const chunkSize = 50;
    for (let i = 0; i < activities.length; i += chunkSize) {
      const chunk = activities.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('trial_activities')
        .insert(chunk);
      
      if (error) throw error;
    }
  }

  /**
   * Clean up test data after performance tests
   */
  static async cleanupTestData(supabase: any, userId: string): Promise<void> {
    // Delete in reverse dependency order to avoid foreign key constraints
    
    // Get trial ID first
    const { data: trials } = await supabase
      .from('trials')
      .select('id')
      .eq('user_id', userId);

    if (trials && trials.length > 0) {
      const trialIds = trials.map(t => t.id);
      
      // Delete trial activities
      await supabase
        .from('trial_activities')
        .delete()
        .in('trial_id', trialIds);

      // Delete trial feature usage
      await supabase
        .from('trial_feature_usage')
        .delete()
        .in('trial_id', trialIds);

      // Delete trial milestones
      await supabase
        .from('trial_milestones')
        .delete()
        .in('trial_id', trialIds);

      // Delete trials
      await supabase
        .from('trials')
        .delete()
        .eq('user_id', userId);
    }

    // Delete user (this will cascade to auth.users if properly configured)
    await supabase.auth.admin.deleteUser(userId);
  }

  /**
   * Generate test data for specific performance scenarios
   */
  static async seedPerformanceTestData(supabase: any): Promise<{
    highEngagementTrial: { trialId: string; userId: string };
    moderateEngagementTrial: { trialId: string; userId: string };
    lowEngagementTrial: { trialId: string; userId: string };
  }> {
    const highEngagement = await this.createTestTrial(
      supabase,
      TrialConfigFixtures.activeHighEngagement
    );
    
    const moderateEngagement = await this.createTestTrial(
      supabase,
      TrialConfigFixtures.activeNewUser
    );
    
    const lowEngagement = await this.createTestTrial(
      supabase,
      TrialConfigFixtures.activeLowEngagement
    );

    // Create usage data for each scenario
    await this.createBulkFeatureUsage(supabase, highEngagement.trialId, 200);
    await this.createBulkMilestones(supabase, highEngagement.trialId, 50);
    
    await this.createBulkFeatureUsage(supabase, moderateEngagement.trialId, 100);
    await this.createBulkMilestones(supabase, moderateEngagement.trialId, 25);
    
    await this.createBulkFeatureUsage(supabase, lowEngagement.trialId, 20);
    await this.createBulkMilestones(supabase, lowEngagement.trialId, 10);

    return {
      highEngagementTrial: highEngagement,
      moderateEngagementTrial: moderateEngagement,
      lowEngagementTrial: lowEngagement
    };
  }

  /**
   * Validate test data integrity
   */
  static async validateTestData(supabase: any, trialId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check trial exists
    const { data: trial, error: trialError } = await supabase
      .from('trials')
      .select('*')
      .eq('id', trialId)
      .single();

    if (trialError || !trial) {
      errors.push('Trial not found or invalid');
    }

    // Check feature usage data
    const { data: usage, error: usageError } = await supabase
      .from('trial_feature_usage')
      .select('count(*)')
      .eq('trial_id', trialId);

    if (usageError) {
      errors.push('Feature usage data validation failed');
    }

    // Check milestone data
    const { data: milestones, error: milestonesError } = await supabase
      .from('trial_milestones')
      .select('count(*)')
      .eq('trial_id', trialId);

    if (milestonesError) {
      errors.push('Milestone data validation failed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create realistic performance test scenarios
   */
  static async createPerformanceScenario(
    supabase: any,
    scenarioName: 'light_load' | 'moderate_load' | 'heavy_load'
  ): Promise<string[]> {
    const scenarios = {
      light_load: { trials: 5, usagePerTrial: 50, milestonesPerTrial: 10 },
      moderate_load: { trials: 25, usagePerTrial: 200, milestonesPerTrial: 30 },
      heavy_load: { trials: 100, usagePerTrial: 500, milestonesPerTrial: 50 }
    };

    const scenario = scenarios[scenarioName];
    const createdTrialIds: string[] = [];

    for (let i = 0; i < scenario.trials; i++) {
      const config = {
        ...TrialConfigFixtures.activeHighEngagement,
        id: `perf-test-${scenarioName}-${i}`,
        user_id: undefined // Will be created
      };

      const { trialId } = await this.createTestTrial(supabase, config);
      createdTrialIds.push(trialId);

      await this.createBulkFeatureUsage(supabase, trialId, scenario.usagePerTrial);
      await this.createBulkMilestones(supabase, trialId, scenario.milestonesPerTrial);
    }

    return createdTrialIds;
  }
}

// Export all fixtures for easy importing
export default {
  UserFixtures,
  OnboardingDataFixtures,
  TrialConfigFixtures,
  FeatureUsageFixtures,
  MilestoneFixtures,
  ROIMetricsFixtures,
  TrialTrackingFixtures,
  TrialActivityFixtures,
  TrialEmailScheduleFixtures,
  TrialStatusResponseFixtures,
  FixtureUtils,
  TrialTestHelpers
};