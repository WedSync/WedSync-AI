/**
 * WS-168: Test Fixtures for Different Health Scenarios
 * Comprehensive test data for customer success health scoring scenarios
 */

import { subDays, addDays } from 'date-fns';
import { HealthScoreComponents, HealthRiskFactor, HealthRecommendation } from '@/lib/services/health-scoring-engine';

// Base user profiles for different scenarios
export const healthTestUsers = {
  excellentHealth: {
    id: 'user-excellent-001',
    email: 'excellent@wedsync-test.com',
    supplier_id: 'supplier-excellent-001',
    created_at: subDays(new Date(), 180).toISOString(),
    organization_id: 'org-test-001',
    role: 'supplier',
    status: 'active'
  },
  goodHealth: {
    id: 'user-good-001',
    email: 'good@wedsync-test.com',
    supplier_id: 'supplier-good-001',
    created_at: subDays(new Date(), 120).toISOString(),
    organization_id: 'org-test-001',
    role: 'supplier',
    status: 'active'
  },
  averageHealth: {
    id: 'user-average-001',
    email: 'average@wedsync-test.com',
    supplier_id: 'supplier-average-001',
    created_at: subDays(new Date(), 90).toISOString(),
    organization_id: 'org-test-001',
    role: 'supplier',
    status: 'active'
  },
  poorHealth: {
    id: 'user-poor-001',
    email: 'poor@wedsync-test.com',
    supplier_id: 'supplier-poor-001',
    created_at: subDays(new Date(), 60).toISOString(),
    organization_id: 'org-test-001',
    role: 'supplier',
    status: 'active'
  },
  criticalHealth: {
    id: 'user-critical-001',
    email: 'critical@wedsync-test.com',
    supplier_id: 'supplier-critical-001',
    created_at: subDays(new Date(), 30).toISOString(),
    organization_id: 'org-test-001',
    role: 'supplier',
    status: 'active'
  },
  newUser: {
    id: 'user-new-001',
    email: 'new@wedsync-test.com',
    supplier_id: 'supplier-new-001',
    created_at: subDays(new Date(), 7).toISOString(),
    organization_id: 'org-test-001',
    role: 'supplier',
    status: 'active'
  },
  churningUser: {
    id: 'user-churning-001',
    email: 'churning@wedsync-test.com',
    supplier_id: 'supplier-churning-001',
    created_at: subDays(new Date(), 200).toISOString(),
    organization_id: 'org-test-001',
    role: 'supplier',
    status: 'active'
  }
};

// Onboarding progress scenarios
export const onboardingScenarios = {
  complete: {
    user_id: 'user-excellent-001',
    completed_steps: 8,
    total_steps: 8,
    current_step: 'completed',
    completion_rate: 100,
    steps: [
      { step: 'profile_setup', completed: true, completed_at: subDays(new Date(), 179).toISOString() },
      { step: 'business_info', completed: true, completed_at: subDays(new Date(), 178).toISOString() },
      { step: 'service_categories', completed: true, completed_at: subDays(new Date(), 177).toISOString() },
      { step: 'pricing_setup', completed: true, completed_at: subDays(new Date(), 176).toISOString() },
      { step: 'portfolio_upload', completed: true, completed_at: subDays(new Date(), 175).toISOString() },
      { step: 'first_form_created', completed: true, completed_at: subDays(new Date(), 174).toISOString() },
      { step: 'payment_setup', completed: true, completed_at: subDays(new Date(), 173).toISOString() },
      { step: 'first_client_added', completed: true, completed_at: subDays(new Date(), 172).toISOString() }
    ]
  },
  partial: {
    user_id: 'user-average-001',
    completed_steps: 5,
    total_steps: 8,
    current_step: 'portfolio_upload',
    completion_rate: 62.5,
    steps: [
      { step: 'profile_setup', completed: true, completed_at: subDays(new Date(), 89).toISOString() },
      { step: 'business_info', completed: true, completed_at: subDays(new Date(), 88).toISOString() },
      { step: 'service_categories', completed: true, completed_at: subDays(new Date(), 87).toISOString() },
      { step: 'pricing_setup', completed: true, completed_at: subDays(new Date(), 85).toISOString() },
      { step: 'portfolio_upload', completed: true, completed_at: subDays(new Date(), 82).toISOString() },
      { step: 'first_form_created', completed: false, completed_at: null },
      { step: 'payment_setup', completed: false, completed_at: null },
      { step: 'first_client_added', completed: false, completed_at: null }
    ]
  },
  minimal: {
    user_id: 'user-poor-001',
    completed_steps: 2,
    total_steps: 8,
    current_step: 'business_info',
    completion_rate: 25,
    steps: [
      { step: 'profile_setup', completed: true, completed_at: subDays(new Date(), 59).toISOString() },
      { step: 'business_info', completed: true, completed_at: subDays(new Date(), 55).toISOString() },
      { step: 'service_categories', completed: false, completed_at: null },
      { step: 'pricing_setup', completed: false, completed_at: null },
      { step: 'portfolio_upload', completed: false, completed_at: null },
      { step: 'first_form_created', completed: false, completed_at: null },
      { step: 'payment_setup', completed: false, completed_at: null },
      { step: 'first_client_added', completed: false, completed_at: null }
    ]
  }
};

// Feature usage patterns
export const featureUsageScenarios = {
  powerUser: {
    user_id: 'user-excellent-001',
    features: [
      { feature_key: 'forms', usage_count: 45, last_used: subDays(new Date(), 1).toISOString() },
      { feature_key: 'clients', usage_count: 38, last_used: subDays(new Date(), 1).toISOString() },
      { feature_key: 'analytics', usage_count: 25, last_used: subDays(new Date(), 2).toISOString() },
      { feature_key: 'communications', usage_count: 32, last_used: subDays(new Date(), 1).toISOString() },
      { feature_key: 'journey_builder', usage_count: 18, last_used: subDays(new Date(), 3).toISOString() },
      { feature_key: 'templates', usage_count: 22, last_used: subDays(new Date(), 1).toISOString() },
      { feature_key: 'integrations', usage_count: 12, last_used: subDays(new Date(), 5).toISOString() },
      { feature_key: 'reports', usage_count: 15, last_used: subDays(new Date(), 2).toISOString() },
      { feature_key: 'automation', usage_count: 8, last_used: subDays(new Date(), 4).toISOString() },
      { feature_key: 'mobile_app', usage_count: 28, last_used: subDays(new Date(), 1).toISOString() }
    ]
  },
  averageUser: {
    user_id: 'user-average-001',
    features: [
      { feature_key: 'forms', usage_count: 15, last_used: subDays(new Date(), 3).toISOString() },
      { feature_key: 'clients', usage_count: 12, last_used: subDays(new Date(), 2).toISOString() },
      { feature_key: 'analytics', usage_count: 8, last_used: subDays(new Date(), 7).toISOString() },
      { feature_key: 'communications', usage_count: 10, last_used: subDays(new Date(), 4).toISOString() },
      { feature_key: 'templates', usage_count: 6, last_used: subDays(new Date(), 5).toISOString() }
    ]
  },
  lightUser: {
    user_id: 'user-poor-001',
    features: [
      { feature_key: 'forms', usage_count: 3, last_used: subDays(new Date(), 14).toISOString() },
      { feature_key: 'clients', usage_count: 2, last_used: subDays(new Date(), 18).toISOString() }
    ]
  },
  inactiveUser: {
    user_id: 'user-critical-001',
    features: [
      { feature_key: 'forms', usage_count: 1, last_used: subDays(new Date(), 25).toISOString() }
    ]
  }
};

// Engagement event patterns
export const engagementScenarios = {
  highEngagement: {
    user_id: 'user-excellent-001',
    events: Array.from({ length: 60 }, (_, i) => ({
      id: `event-excellent-${i}`,
      client_id: 'user-excellent-001',
      event_type: ['login', 'form_created', 'client_added', 'message_sent', 'report_viewed'][i % 5],
      created_at: subDays(new Date(), i).toISOString(),
      session_duration: Math.floor(Math.random() * 1800) + 600, // 10-40 minutes
      page_views: Math.floor(Math.random() * 20) + 5
    }))
  },
  moderateEngagement: {
    user_id: 'user-average-001',
    events: Array.from({ length: 20 }, (_, i) => ({
      id: `event-average-${i}`,
      client_id: 'user-average-001',
      event_type: ['login', 'form_viewed', 'client_viewed', 'settings_changed'][i % 4],
      created_at: subDays(new Date(), i * 2).toISOString(),
      session_duration: Math.floor(Math.random() * 900) + 300, // 5-20 minutes
      page_views: Math.floor(Math.random() * 10) + 2
    }))
  },
  lowEngagement: {
    user_id: 'user-poor-001',
    events: Array.from({ length: 8 }, (_, i) => ({
      id: `event-poor-${i}`,
      client_id: 'user-poor-001',
      event_type: ['login', 'dashboard_viewed'][i % 2],
      created_at: subDays(new Date(), i * 5).toISOString(),
      session_duration: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
      page_views: Math.floor(Math.random() * 5) + 1
    }))
  },
  declining: {
    user_id: 'user-churning-001',
    events: [
      // Initially active
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `event-churning-early-${i}`,
        client_id: 'user-churning-001',
        event_type: 'login',
        created_at: subDays(new Date(), 180 - i).toISOString(),
        session_duration: 1200,
        page_views: 8
      })),
      // Declining activity
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `event-churning-decline-${i}`,
        client_id: 'user-churning-001',
        event_type: 'login',
        created_at: subDays(new Date(), 60 - i * 5).toISOString(),
        session_duration: 300,
        page_views: 2
      })),
      // Recent inactivity
      {
        id: 'event-churning-last',
        client_id: 'user-churning-001',
        event_type: 'login',
        created_at: subDays(new Date(), 21).toISOString(),
        session_duration: 180,
        page_views: 1
      }
    ]
  }
};

// Success milestone scenarios
export const milestoneScenarios = {
  highAchiever: {
    user_id: 'user-excellent-001',
    milestones: [
      { id: '1', milestone_type: 'first_login', achieved: true, achieved_at: subDays(new Date(), 179).toISOString() },
      { id: '2', milestone_type: 'profile_completed', achieved: true, achieved_at: subDays(new Date(), 178).toISOString() },
      { id: '3', milestone_type: 'first_form_created', achieved: true, achieved_at: subDays(new Date(), 174).toISOString() },
      { id: '4', milestone_type: 'first_client_added', achieved: true, achieved_at: subDays(new Date(), 172).toISOString() },
      { id: '5', milestone_type: 'first_payment_received', achieved: true, achieved_at: subDays(new Date(), 170).toISOString() },
      { id: '6', milestone_type: 'ten_clients_milestone', achieved: true, achieved_at: subDays(new Date(), 150).toISOString() },
      { id: '7', milestone_type: 'revenue_1k_milestone', achieved: true, achieved_at: subDays(new Date(), 140).toISOString() },
      { id: '8', milestone_type: 'feature_adoption_75', achieved: true, achieved_at: subDays(new Date(), 120).toISOString() },
      { id: '9', milestone_type: 'client_retention_90', achieved: true, achieved_at: subDays(new Date(), 100).toISOString() },
      { id: '10', milestone_type: 'power_user_status', achieved: true, achieved_at: subDays(new Date(), 80).toISOString() }
    ]
  },
  averageProgress: {
    user_id: 'user-average-001',
    milestones: [
      { id: '1', milestone_type: 'first_login', achieved: true, achieved_at: subDays(new Date(), 89).toISOString() },
      { id: '2', milestone_type: 'profile_completed', achieved: true, achieved_at: subDays(new Date(), 88).toISOString() },
      { id: '3', milestone_type: 'first_form_created', achieved: true, achieved_at: subDays(new Date(), 75).toISOString() },
      { id: '4', milestone_type: 'first_client_added', achieved: true, achieved_at: subDays(new Date(), 70).toISOString() },
      { id: '5', milestone_type: 'first_payment_received', achieved: true, achieved_at: subDays(new Date(), 65).toISOString() },
      { id: '6', milestone_type: 'ten_clients_milestone', achieved: false, achieved_at: null },
      { id: '7', milestone_type: 'revenue_1k_milestone', achieved: false, achieved_at: null },
      { id: '8', milestone_type: 'feature_adoption_75', achieved: false, achieved_at: null }
    ]
  },
  slowProgress: {
    user_id: 'user-poor-001',
    milestones: [
      { id: '1', milestone_type: 'first_login', achieved: true, achieved_at: subDays(new Date(), 59).toISOString() },
      { id: '2', milestone_type: 'profile_completed', achieved: true, achieved_at: subDays(new Date(), 55).toISOString() },
      { id: '3', milestone_type: 'first_form_created', achieved: false, achieved_at: null },
      { id: '4', milestone_type: 'first_client_added', achieved: false, achieved_at: null }
    ]
  }
};

// Complete health score scenarios
export const healthScoreScenarios: Record<string, HealthScoreComponents> = {
  excellent: {
    user_id: 'user-excellent-001',
    organization_id: 'org-test-001',
    onboarding_completion: 100,
    feature_adoption_breadth: 95,
    feature_adoption_depth: 88,
    engagement_frequency: 92,
    engagement_quality: 89,
    success_milestone_progress: 100,
    support_interaction_quality: 95,
    platform_value_realization: 91,
    retention_indicators: 96,
    growth_trajectory: 85,
    overall_health_score: 92,
    score_trend_7d: 3,
    score_trend_30d: 8,
    trend_direction: 'improving',
    churn_risk_score: 15,
    risk_level: 'low',
    risk_factors: [],
    improvement_opportunities: [
      {
        category: 'Growth',
        priority: 'low',
        recommendation_type: 'feature_guidance',
        title: 'Explore Advanced Features',
        description: 'Try our new AI-powered recommendations',
        expected_impact: '5-10 point improvement',
        implementation_effort: 'low',
        success_metrics: ['AI features adopted', 'Automation usage increase'],
        timeline_days: 14
      }
    ],
    next_best_actions: ['Explore advanced automation features', 'Consider upgrading plan'],
    calculated_at: new Date(),
    expires_at: addDays(new Date(), 1)
  },

  good: {
    user_id: 'user-good-001',
    organization_id: 'org-test-001',
    onboarding_completion: 90,
    feature_adoption_breadth: 75,
    feature_adoption_depth: 72,
    engagement_frequency: 78,
    engagement_quality: 80,
    success_milestone_progress: 85,
    support_interaction_quality: 88,
    platform_value_realization: 76,
    retention_indicators: 82,
    growth_trajectory: 70,
    overall_health_score: 79,
    score_trend_7d: 2,
    score_trend_30d: 5,
    trend_direction: 'improving',
    churn_risk_score: 25,
    risk_level: 'low',
    risk_factors: [
      {
        category: 'adoption',
        risk_type: 'underutilized_features',
        severity: 'low',
        impact_score: 10,
        description: 'Several valuable features remain unused',
        recommended_intervention: 'Feature discovery tour',
        urgency_level: 4,
        business_impact: 'Reduced platform stickiness'
      }
    ],
    improvement_opportunities: [
      {
        category: 'Feature Adoption',
        priority: 'medium',
        recommendation_type: 'feature_guidance',
        title: 'Expand Feature Usage',
        description: 'Try analytics and automation features to boost efficiency',
        expected_impact: '10-15 point improvement',
        implementation_effort: 'medium',
        success_metrics: ['New features tried', 'Time saved metrics'],
        timeline_days: 21
      }
    ],
    next_best_actions: ['Try analytics dashboard', 'Set up automation rules'],
    calculated_at: new Date(),
    expires_at: addDays(new Date(), 1)
  },

  average: {
    user_id: 'user-average-001',
    organization_id: 'org-test-001',
    onboarding_completion: 65,
    feature_adoption_breadth: 45,
    feature_adoption_depth: 50,
    engagement_frequency: 55,
    engagement_quality: 60,
    success_milestone_progress: 62,
    support_interaction_quality: 75,
    platform_value_realization: 58,
    retention_indicators: 68,
    growth_trajectory: 55,
    overall_health_score: 59,
    score_trend_7d: -1,
    score_trend_30d: 2,
    trend_direction: 'stable',
    churn_risk_score: 45,
    risk_level: 'medium',
    risk_factors: [
      {
        category: 'onboarding',
        risk_type: 'incomplete_setup',
        severity: 'medium',
        impact_score: 20,
        description: 'Key onboarding steps remain incomplete',
        recommended_intervention: 'Onboarding assistance outreach',
        urgency_level: 6,
        business_impact: 'Reduced feature adoption and engagement'
      },
      {
        category: 'engagement',
        risk_type: 'declining_activity',
        severity: 'medium',
        impact_score: 15,
        description: 'Usage frequency has decreased recently',
        recommended_intervention: 'Engagement reminder campaign',
        urgency_level: 5,
        business_impact: 'Potential churn risk'
      }
    ],
    improvement_opportunities: [
      {
        category: 'Onboarding',
        priority: 'high',
        recommendation_type: 'milestone_focus',
        title: 'Complete Setup Process',
        description: 'Finish remaining onboarding steps to unlock full platform value',
        expected_impact: '15-25 point improvement',
        implementation_effort: 'low',
        success_metrics: ['Onboarding completion', 'Feature activation'],
        timeline_days: 7
      },
      {
        category: 'Engagement',
        priority: 'medium',
        recommendation_type: 'engagement_boost',
        title: 'Establish Regular Usage Pattern',
        description: 'Set up daily workflows to increase platform stickiness',
        expected_impact: '10-20 point improvement',
        implementation_effort: 'medium',
        success_metrics: ['Login frequency', 'Session duration'],
        timeline_days: 14
      }
    ],
    next_best_actions: ['Complete payment setup', 'Add more clients', 'Try form templates'],
    calculated_at: new Date(),
    expires_at: addDays(new Date(), 1)
  },

  poor: {
    user_id: 'user-poor-001',
    organization_id: 'org-test-001',
    onboarding_completion: 25,
    feature_adoption_breadth: 20,
    feature_adoption_depth: 15,
    engagement_frequency: 25,
    engagement_quality: 30,
    success_milestone_progress: 28,
    support_interaction_quality: 60,
    platform_value_realization: 22,
    retention_indicators: 35,
    growth_trajectory: 20,
    overall_health_score: 28,
    score_trend_7d: -5,
    score_trend_30d: -8,
    trend_direction: 'declining',
    churn_risk_score: 75,
    risk_level: 'high',
    risk_factors: [
      {
        category: 'onboarding',
        risk_type: 'abandoned_setup',
        severity: 'high',
        impact_score: 35,
        description: 'User has not progressed through onboarding in weeks',
        recommended_intervention: 'Immediate success manager contact',
        urgency_level: 8,
        business_impact: 'High likelihood of churn within 30 days'
      },
      {
        category: 'engagement',
        risk_type: 'minimal_usage',
        severity: 'high',
        impact_score: 30,
        description: 'Very low platform engagement and feature usage',
        recommended_intervention: 'Personal onboarding session',
        urgency_level: 9,
        business_impact: 'Almost certain churn without intervention'
      }
    ],
    improvement_opportunities: [
      {
        category: 'Onboarding',
        priority: 'critical',
        recommendation_type: 'support_outreach',
        title: 'Immediate Setup Assistance',
        description: 'Get personal help to complete your account setup',
        expected_impact: '30-50 point improvement',
        implementation_effort: 'low',
        success_metrics: ['Onboarding completion', 'First milestone achieved'],
        timeline_days: 3
      },
      {
        category: 'Value Realization',
        priority: 'critical',
        recommendation_type: 'retention_intervention',
        title: 'Discover Core Value',
        description: 'Work with our team to identify your key use cases',
        expected_impact: '20-40 point improvement',
        implementation_effort: 'high',
        success_metrics: ['Use case identification', 'First successful workflow'],
        timeline_days: 7
      }
    ],
    next_best_actions: ['Schedule onboarding call', 'Complete profile setup', 'Create first form'],
    calculated_at: new Date(),
    expires_at: addDays(new Date(), 1)
  },

  critical: {
    user_id: 'user-critical-001',
    organization_id: 'org-test-001',
    onboarding_completion: 12,
    feature_adoption_breadth: 8,
    feature_adoption_depth: 5,
    engagement_frequency: 10,
    engagement_quality: 15,
    success_milestone_progress: 18,
    support_interaction_quality: 40,
    platform_value_realization: 8,
    retention_indicators: 20,
    growth_trajectory: 5,
    overall_health_score: 14,
    score_trend_7d: -8,
    score_trend_30d: -15,
    trend_direction: 'declining',
    churn_risk_score: 95,
    risk_level: 'critical',
    risk_factors: [
      {
        category: 'engagement',
        risk_type: 'extreme_inactivity',
        severity: 'critical',
        impact_score: 40,
        description: 'User has barely used the platform and shows no engagement',
        recommended_intervention: 'Emergency retention intervention',
        urgency_level: 10,
        business_impact: 'Imminent churn - immediate action required'
      },
      {
        category: 'onboarding',
        risk_type: 'failed_activation',
        severity: 'critical',
        impact_score: 35,
        description: 'User never achieved initial activation milestones',
        recommended_intervention: 'Executive-level outreach and support',
        urgency_level: 10,
        business_impact: 'Complete failure to realize platform value'
      },
      {
        category: 'value',
        risk_type: 'no_value_realization',
        severity: 'critical',
        impact_score: 30,
        description: 'User has not achieved any meaningful outcomes',
        recommended_intervention: 'Value realization workshop',
        urgency_level: 9,
        business_impact: 'No business justification for continued subscription'
      }
    ],
    improvement_opportunities: [
      {
        category: 'Emergency Intervention',
        priority: 'critical',
        recommendation_type: 'retention_intervention',
        title: 'Emergency Success Intervention',
        description: 'Immediate comprehensive support to prevent churn',
        expected_impact: 'Prevent churn - potential 40+ point improvement',
        implementation_effort: 'high',
        success_metrics: ['User re-engagement', 'First milestone completion', 'Retention'],
        timeline_days: 1
      }
    ],
    next_best_actions: ['URGENT: Contact user immediately', 'Schedule emergency onboarding', 'Assess fit and needs'],
    calculated_at: new Date(),
    expires_at: addDays(new Date(), 1)
  }
};

// Support ticket scenarios
export const supportScenarios = {
  excellentSupport: {
    user_id: 'user-excellent-001',
    tickets: [
      {
        id: 'ticket-excellent-1',
        status: 'resolved',
        created_at: subDays(new Date(), 15).toISOString(),
        resolved_at: subDays(new Date(), 14).toISOString(),
        resolution_hours: 18,
        priority: 'medium',
        satisfaction_rating: 5
      }
    ]
  },
  averageSupport: {
    user_id: 'user-average-001',
    tickets: [
      {
        id: 'ticket-average-1',
        status: 'resolved',
        created_at: subDays(new Date(), 25).toISOString(),
        resolved_at: subDays(new Date(), 23).toISOString(),
        resolution_hours: 36,
        priority: 'low',
        satisfaction_rating: 4
      },
      {
        id: 'ticket-average-2',
        status: 'resolved',
        created_at: subDays(new Date(), 10).toISOString(),
        resolved_at: subDays(new Date(), 8).toISOString(),
        resolution_hours: 48,
        priority: 'medium',
        satisfaction_rating: 3
      }
    ]
  },
  poorSupport: {
    user_id: 'user-poor-001',
    tickets: [
      {
        id: 'ticket-poor-1',
        status: 'open',
        created_at: subDays(new Date(), 5).toISOString(),
        resolved_at: null,
        resolution_hours: null,
        priority: 'high',
        satisfaction_rating: null
      },
      {
        id: 'ticket-poor-2',
        status: 'resolved',
        created_at: subDays(new Date(), 20).toISOString(),
        resolved_at: subDays(new Date(), 15).toISOString(),
        resolution_hours: 120,
        priority: 'medium',
        satisfaction_rating: 2
      }
    ]
  }
};

// Organization test data
export const organizationScenarios = {
  testOrganization: {
    id: 'org-test-001',
    name: 'Test Organization for Health Scenarios',
    created_at: subDays(new Date(), 365).toISOString(),
    subscription_tier: 'pro',
    member_count: 7,
    active_suppliers: 7
  }
};

// Intervention notification scenarios
export const interventionScenarios = {
  successfulIntervention: {
    id: 'intervention-success-001',
    supplier_id: 'user-average-001',
    organization_id: 'org-test-001',
    intervention_type: 'engagement_reminder',
    triggered_at: subDays(new Date(), 7).toISOString(),
    notification_sent: true,
    notification_opened: true,
    notification_clicked: true,
    user_responded: true,
    outcome: 'positive',
    health_score_before: 59,
    health_score_after: 68
  },
  failedIntervention: {
    id: 'intervention-failed-001',
    supplier_id: 'user-critical-001',
    organization_id: 'org-test-001',
    intervention_type: 'critical_health_alert',
    triggered_at: subDays(new Date(), 3).toISOString(),
    notification_sent: true,
    notification_opened: false,
    notification_clicked: false,
    user_responded: false,
    outcome: 'no_response',
    health_score_before: 14,
    health_score_after: 12
  }
};

// Helper functions for test data generation
export class HealthScenarioBuilder {
  static createScenarioData(scenarioType: keyof typeof healthScoreScenarios) {
    const healthScore = healthScoreScenarios[scenarioType];
    const userId = healthScore.user_id;
    
    return {
      userProfile: healthTestUsers[scenarioType as keyof typeof healthTestUsers] || healthTestUsers.averageHealth,
      healthScore,
      onboarding: onboardingScenarios.complete, // Default, can be overridden
      featureUsage: featureUsageScenarios.averageUser.features, // Default
      engagement: engagementScenarios.moderateEngagement.events, // Default
      milestones: milestoneScenarios.averageProgress.milestones, // Default
      supportTickets: supportScenarios.averageSupport.tickets // Default
    };
  }

  static createBatchScenarioData(count: number = 100) {
    const scenarios = ['excellent', 'good', 'average', 'poor', 'critical'];
    return Array.from({ length: count }, (_, i) => {
      const scenarioType = scenarios[i % scenarios.length];
      const baseData = this.createScenarioData(scenarioType as keyof typeof healthScoreScenarios);
      
      // Create unique IDs for batch data
      const uniqueId = `batch-user-${i + 1}`;
      return {
        ...baseData,
        userProfile: {
          ...baseData.userProfile,
          id: uniqueId,
          email: `batch-user-${i + 1}@wedsync-test.com`
        },
        healthScore: {
          ...baseData.healthScore,
          user_id: uniqueId
        }
      };
    });
  }

  static createTimeSeriesHealthData(userId: string, days: number = 30) {
    const baseScore = Math.floor(Math.random() * 40) + 50; // 50-90 range
    return Array.from({ length: days }, (_, i) => {
      const variance = Math.floor(Math.random() * 20) - 10; // -10 to +10
      const score = Math.max(0, Math.min(100, baseScore + variance));
      
      return {
        user_id: userId,
        date: subDays(new Date(), days - i - 1),
        health_score: score,
        component_scores: {
          onboarding_completion: Math.max(0, Math.min(100, score + Math.floor(Math.random() * 20) - 10)),
          feature_adoption_breadth: Math.max(0, Math.min(100, score + Math.floor(Math.random() * 20) - 10)),
          engagement_frequency: Math.max(0, Math.min(100, score + Math.floor(Math.random() * 20) - 10))
        }
      };
    });
  }
}

// Export all scenarios for easy importing
export const allHealthScenarios = {
  users: healthTestUsers,
  onboarding: onboardingScenarios,
  featureUsage: featureUsageScenarios,
  engagement: engagementScenarios,
  milestones: milestoneScenarios,
  healthScores: healthScoreScenarios,
  support: supportScenarios,
  organization: organizationScenarios,
  interventions: interventionScenarios
};