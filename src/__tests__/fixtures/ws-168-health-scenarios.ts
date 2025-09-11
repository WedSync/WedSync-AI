/**
 * WS-168: Customer Success Dashboard - Test Fixtures
 * Health scenario fixtures for comprehensive testing
 */

export const healthScenarios = {
  champion: {
    user_id: 'champion-user-001',
    organization_id: 'org-champion',
    profile: {
      name: 'Champion Supplier Co.',
      type: 'wedding_planner',
      created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months old
      subscription_tier: 'premium',
    },
    config: {
      onboarding_flow_id: 'flow-001',
      current_stage: 'mastery',
      completion_percentage: 100,
      health_score: 95,
      success_milestones_achieved: 12,
      engagement_level: 'champion',
      at_risk_score: 5,
      last_activity: new Date(),
    },
    component_scores: {
      onboarding_progress: 100,
      feature_adoption: 95,
      engagement_level: 98,
      success_milestones: 95,
      support_interaction: 90,
      retention_risk: 95,
    },
    metrics: {
      daily_active_days: 28,
      features_used: 18,
      total_features: 20,
      clients_managed: 45,
      messages_sent: 312,
      automations_created: 23,
      team_members: 8,
      avg_session_duration_minutes: 45,
      nps_score: 9,
    },
    milestones: [
      {
        type: 'onboarding',
        name: 'Profile Complete',
        achieved: true,
        days_to_achieve: 1,
      },
      {
        type: 'onboarding',
        name: 'First Client Added',
        achieved: true,
        days_to_achieve: 2,
      },
      {
        type: 'feature_adoption',
        name: 'Journey Builder Used',
        achieved: true,
        days_to_achieve: 5,
      },
      {
        type: 'feature_adoption',
        name: 'Automation Created',
        achieved: true,
        days_to_achieve: 7,
      },
      {
        type: 'engagement',
        name: 'Power User Status',
        achieved: true,
        days_to_achieve: 30,
      },
      {
        type: 'business_value',
        name: '10+ Active Clients',
        achieved: true,
        days_to_achieve: 45,
      },
      {
        type: 'retention',
        name: '3 Months Active',
        achieved: true,
        days_to_achieve: 90,
      },
    ],
    risk_factors: [],
    recommendations: [
      'Consider becoming a platform advocate',
      'Explore advanced API features',
      'Join our beta testing program',
    ],
  },

  healthy: {
    user_id: 'healthy-user-001',
    organization_id: 'org-healthy',
    profile: {
      name: 'Steady Growth Weddings',
      type: 'wedding_planner',
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months old
      subscription_tier: 'professional',
    },
    config: {
      onboarding_flow_id: 'flow-001',
      current_stage: 'advanced',
      completion_percentage: 85,
      health_score: 78,
      success_milestones_achieved: 7,
      engagement_level: 'high',
      at_risk_score: 15,
      last_activity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    component_scores: {
      onboarding_progress: 85,
      feature_adoption: 75,
      engagement_level: 80,
      success_milestones: 70,
      support_interaction: 85,
      retention_risk: 85,
    },
    metrics: {
      daily_active_days: 20,
      features_used: 14,
      total_features: 20,
      clients_managed: 18,
      messages_sent: 156,
      automations_created: 8,
      team_members: 4,
      avg_session_duration_minutes: 30,
      nps_score: 7,
    },
    milestones: [
      {
        type: 'onboarding',
        name: 'Profile Complete',
        achieved: true,
        days_to_achieve: 3,
      },
      {
        type: 'onboarding',
        name: 'First Client Added',
        achieved: true,
        days_to_achieve: 5,
      },
      {
        type: 'feature_adoption',
        name: 'Journey Builder Used',
        achieved: true,
        days_to_achieve: 12,
      },
      {
        type: 'feature_adoption',
        name: 'Automation Created',
        achieved: true,
        days_to_achieve: 20,
      },
      {
        type: 'engagement',
        name: 'Regular User Status',
        achieved: true,
        days_to_achieve: 30,
      },
      {
        type: 'business_value',
        name: '5+ Active Clients',
        achieved: true,
        days_to_achieve: 45,
      },
      {
        type: 'retention',
        name: '1 Month Active',
        achieved: true,
        days_to_achieve: 30,
      },
    ],
    risk_factors: [],
    recommendations: [
      'Explore more advanced features',
      'Consider upgrading to premium for additional capabilities',
      'Complete remaining onboarding steps',
    ],
  },

  stable: {
    user_id: 'stable-user-001',
    organization_id: 'org-stable',
    profile: {
      name: 'Traditional Weddings LLC',
      type: 'wedding_planner',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months old
      subscription_tier: 'basic',
    },
    config: {
      onboarding_flow_id: 'flow-001',
      current_stage: 'first_use',
      completion_percentage: 65,
      health_score: 62,
      success_milestones_achieved: 4,
      engagement_level: 'medium',
      at_risk_score: 35,
      last_activity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    component_scores: {
      onboarding_progress: 65,
      feature_adoption: 55,
      engagement_level: 60,
      success_milestones: 40,
      support_interaction: 75,
      retention_risk: 65,
    },
    metrics: {
      daily_active_days: 12,
      features_used: 8,
      total_features: 20,
      clients_managed: 6,
      messages_sent: 45,
      automations_created: 2,
      team_members: 2,
      avg_session_duration_minutes: 20,
      nps_score: 6,
    },
    milestones: [
      {
        type: 'onboarding',
        name: 'Profile Complete',
        achieved: true,
        days_to_achieve: 7,
      },
      {
        type: 'onboarding',
        name: 'First Client Added',
        achieved: true,
        days_to_achieve: 14,
      },
      {
        type: 'feature_adoption',
        name: 'Basic Features Used',
        achieved: true,
        days_to_achieve: 21,
      },
      {
        type: 'engagement',
        name: 'Weekly Active',
        achieved: true,
        days_to_achieve: 30,
      },
    ],
    risk_factors: [
      {
        factor_type: 'declining_engagement',
        severity: 'medium',
        description: 'Login frequency decreasing',
        recommended_action: 'Send engagement email with tips',
      },
    ],
    recommendations: [
      'Schedule a success call to review platform benefits',
      'Complete onboarding to unlock more features',
      'Watch tutorial videos for unused features',
    ],
  },

  atRisk: {
    user_id: 'at-risk-user-001',
    organization_id: 'org-at-risk',
    profile: {
      name: 'Struggling Events Co.',
      type: 'wedding_planner',
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 1.5 months old
      subscription_tier: 'basic',
    },
    config: {
      onboarding_flow_id: 'flow-001',
      current_stage: 'setup',
      completion_percentage: 35,
      health_score: 42,
      success_milestones_achieved: 1,
      engagement_level: 'low',
      at_risk_score: 68,
      last_activity: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    component_scores: {
      onboarding_progress: 35,
      feature_adoption: 25,
      engagement_level: 30,
      success_milestones: 10,
      support_interaction: 60,
      retention_risk: 32,
    },
    metrics: {
      daily_active_days: 5,
      features_used: 3,
      total_features: 20,
      clients_managed: 1,
      messages_sent: 8,
      automations_created: 0,
      team_members: 1,
      avg_session_duration_minutes: 10,
      nps_score: 4,
    },
    milestones: [
      {
        type: 'onboarding',
        name: 'Account Created',
        achieved: true,
        days_to_achieve: 0,
      },
    ],
    risk_factors: [
      {
        factor_type: 'incomplete_onboarding',
        severity: 'high',
        description: 'Onboarding stalled at 35%',
        recommended_action: 'Provide onboarding assistance call',
      },
      {
        factor_type: 'low_engagement',
        severity: 'high',
        description: 'No login in 10 days',
        recommended_action: 'Send re-engagement campaign',
      },
      {
        factor_type: 'feature_underutilization',
        severity: 'medium',
        description: 'Using only 15% of features',
        recommended_action: 'Schedule feature training session',
      },
    ],
    recommendations: [
      'Immediate: Schedule success manager call',
      'Complete basic onboarding steps',
      'Watch getting started video',
      'Add more clients to see platform value',
    ],
  },

  critical: {
    user_id: 'critical-user-001',
    organization_id: 'org-critical',
    profile: {
      name: 'Inactive Planners Inc.',
      type: 'wedding_planner',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month old
      subscription_tier: 'basic',
    },
    config: {
      onboarding_flow_id: 'flow-001',
      current_stage: 'welcome',
      completion_percentage: 10,
      health_score: 18,
      success_milestones_achieved: 0,
      engagement_level: 'low',
      at_risk_score: 92,
      last_activity: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
    component_scores: {
      onboarding_progress: 10,
      feature_adoption: 5,
      engagement_level: 5,
      success_milestones: 0,
      support_interaction: 30,
      retention_risk: 8,
    },
    metrics: {
      daily_active_days: 1,
      features_used: 1,
      total_features: 20,
      clients_managed: 0,
      messages_sent: 0,
      automations_created: 0,
      team_members: 1,
      avg_session_duration_minutes: 3,
      nps_score: 2,
    },
    milestones: [],
    risk_factors: [
      {
        factor_type: 'abandonment_risk',
        severity: 'critical',
        description: 'No meaningful activity since signup',
        recommended_action: 'Urgent intervention required',
      },
      {
        factor_type: 'zero_value_realization',
        severity: 'critical',
        description: 'No clients or features used',
        recommended_action: 'Emergency success call',
      },
      {
        factor_type: 'imminent_churn',
        severity: 'critical',
        description: 'All indicators point to churn',
        recommended_action: 'Executive escalation',
      },
    ],
    recommendations: [
      'URGENT: Executive team intervention',
      'Offer complimentary onboarding session',
      'Consider platform credit or trial extension',
      'Direct phone call from success manager',
    ],
  },

  recovering: {
    user_id: 'recovering-user-001',
    organization_id: 'org-recovering',
    profile: {
      name: 'Turnaround Weddings',
      type: 'wedding_planner',
      created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 4 months old
      subscription_tier: 'professional',
    },
    config: {
      onboarding_flow_id: 'flow-001',
      current_stage: 'first_use',
      completion_percentage: 70,
      health_score: 58,
      success_milestones_achieved: 5,
      engagement_level: 'medium',
      at_risk_score: 45,
      last_activity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    component_scores: {
      onboarding_progress: 70,
      feature_adoption: 60,
      engagement_level: 55,
      success_milestones: 50,
      support_interaction: 70,
      retention_risk: 55,
    },
    metrics: {
      daily_active_days: 8, // Increased from 3 last month
      features_used: 10, // Increased from 5 last month
      total_features: 20,
      clients_managed: 8,
      messages_sent: 62,
      automations_created: 4,
      team_members: 3,
      avg_session_duration_minutes: 25,
      nps_score: 6,
    },
    historical_health_scores: [
      { date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), score: 72 },
      { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), score: 48 },
      { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), score: 38 },
      { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), score: 52 },
      { date: new Date(), score: 58 },
    ],
    milestones: [
      {
        type: 'onboarding',
        name: 'Profile Complete',
        achieved: true,
        days_to_achieve: 45,
      },
      {
        type: 'onboarding',
        name: 'First Client Added',
        achieved: true,
        days_to_achieve: 50,
      },
      {
        type: 'feature_adoption',
        name: 'Basic Features Used',
        achieved: true,
        days_to_achieve: 90,
      },
      {
        type: 'engagement',
        name: 'Re-engaged User',
        achieved: true,
        days_to_achieve: 100,
      },
      {
        type: 'recovery',
        name: 'Health Score Improving',
        achieved: true,
        days_to_achieve: 110,
      },
    ],
    risk_factors: [
      {
        factor_type: 'recovery_in_progress',
        severity: 'low',
        description: 'User showing positive trend',
        recommended_action: 'Continue monitoring and support',
      },
    ],
    recommendations: [
      'Acknowledge improvement in next check-in',
      'Offer advanced feature training',
      'Share success stories from similar users',
      'Consider upgrade incentive',
    ],
  },

  newUser: {
    user_id: 'new-user-001',
    organization_id: 'org-new',
    profile: {
      name: 'Fresh Start Events',
      type: 'wedding_planner',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days old
      subscription_tier: 'trial',
    },
    config: {
      onboarding_flow_id: 'flow-001',
      current_stage: 'welcome',
      completion_percentage: 25,
      health_score: 50, // Neutral starting score
      success_milestones_achieved: 0,
      engagement_level: 'medium',
      at_risk_score: 0,
      last_activity: new Date(),
    },
    component_scores: {
      onboarding_progress: 25,
      feature_adoption: 10,
      engagement_level: 50,
      success_milestones: 0,
      support_interaction: 50,
      retention_risk: 100, // No risk yet
    },
    metrics: {
      daily_active_days: 2,
      features_used: 2,
      total_features: 20,
      clients_managed: 0,
      messages_sent: 0,
      automations_created: 0,
      team_members: 1,
      avg_session_duration_minutes: 15,
      nps_score: null,
    },
    milestones: [],
    risk_factors: [],
    recommendations: [
      'Complete profile setup',
      'Add first client',
      'Watch onboarding video',
      'Schedule optional onboarding call',
    ],
  },
};

// Helper function to generate bulk test data
export function generateBulkHealthScenarios(count: number) {
  const scenarios = [];
  const types = Object.keys(healthScenarios);

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const baseScenario = healthScenarios[type as keyof typeof healthScenarios];

    scenarios.push({
      ...baseScenario,
      user_id: `${type}-user-${String(i).padStart(3, '0')}`,
      profile: {
        ...baseScenario.profile,
        name: `${baseScenario.profile.name} ${i}`,
      },
    });
  }

  return scenarios;
}

// Test data for intervention scenarios
export const interventionScenarios = {
  scheduled: {
    id: 'int-scheduled-001',
    user_id: 'at-risk-user-001',
    intervention_type: 'success_call',
    priority: 'high',
    status: 'scheduled',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    scheduled_for: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    assigned_to: 'success-manager-01',
    reason: 'Health score dropped below 40',
    notes: 'User has not logged in for 10 days, feature adoption very low',
  },

  inProgress: {
    id: 'int-progress-001',
    user_id: 'stable-user-001',
    intervention_type: 'feature_training',
    priority: 'medium',
    status: 'in_progress',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    assigned_to: 'success-manager-02',
    reason: 'Low feature adoption detected',
    notes:
      'Training session in progress, covering journey builder and automation features',
  },

  completed: {
    id: 'int-completed-001',
    user_id: 'recovering-user-001',
    intervention_type: 'onboarding_assistance',
    priority: 'medium',
    status: 'completed',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    assigned_to: 'success-manager-01',
    reason: 'Onboarding stalled at 40%',
    outcome: 'successful',
    resolution_notes:
      'Completed onboarding walkthrough, user now at 85% completion',
    health_score_before: 38,
    health_score_after: 58,
  },

  automated: {
    id: 'int-automated-001',
    user_id: 'critical-user-001',
    intervention_type: 'automated_email',
    priority: 'critical',
    status: 'triggered',
    created_at: new Date(),
    triggered_at: new Date(),
    automated: true,
    trigger_condition: 'health_score < 20',
    reason: 'Critical health score detected - automated intervention',
    action_taken: 'Sent emergency re-engagement email sequence',
    follow_up_required: true,
  },
};

// Mock data for testing dashboard aggregations
export const dashboardAggregations = {
  summary: {
    total_users: 847,
    average_health_score: 68,
    milestones_achieved_today: 23,
    at_risk_users: 124,
    champion_users: 89,
    new_users_this_week: 31,
  },

  health_distribution: {
    '0-10': 8,
    '10-20': 15,
    '20-30': 28,
    '30-40': 43,
    '40-50': 81,
    '50-60': 156,
    '60-70': 234,
    '70-80': 189,
    '80-90': 72,
    '90-100': 21,
  },

  trends: {
    daily: [
      { date: '2024-01-15', avg_score: 65, active_users: 542 },
      { date: '2024-01-16', avg_score: 66, active_users: 558 },
      { date: '2024-01-17', avg_score: 67, active_users: 571 },
      { date: '2024-01-18', avg_score: 68, active_users: 589 },
      { date: '2024-01-19', avg_score: 68, active_users: 601 },
    ],
  },

  interventions: {
    pending: 18,
    in_progress: 7,
    completed_this_week: 42,
    success_rate: 0.78,
    avg_resolution_hours: 36,
  },
};
