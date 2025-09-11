/**
 * WS-133: Automated Customer Success and Onboarding System
 * Comprehensive customer success platform for user onboarding, retention, and success metrics tracking
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  addDays,
  differenceInDays,
  differenceInHours,
  isAfter,
} from 'date-fns';
import { redis } from '@/lib/redis';
import { engagementScoringService } from '@/lib/analytics/engagement-scoring';

export interface CustomerSuccessConfig {
  id: string;
  user_id: string;
  organization_id?: string;
  onboarding_flow_id: string;
  current_stage:
    | 'welcome'
    | 'setup'
    | 'first_use'
    | 'advanced'
    | 'mastery'
    | 'success';
  completion_percentage: number;
  health_score: number;
  success_milestones_achieved: number;
  engagement_level: 'low' | 'medium' | 'high' | 'champion';
  at_risk_score: number;
  next_milestone_due?: Date;
  last_activity: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OnboardingWorkflow {
  id: string;
  name: string;
  description: string;
  user_type: 'wedding_planner' | 'supplier' | 'couple' | 'admin';
  stages: OnboardingStage[];
  success_criteria: SuccessCriteria;
  automation_rules: AutomationRule[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OnboardingStage {
  id: string;
  workflow_id: string;
  stage_name: string;
  stage_order: number;
  title: string;
  description: string;
  tasks: OnboardingTask[];
  completion_criteria: string[];
  estimated_time_minutes: number;
  success_weight: number;
  auto_advance: boolean;
  triggers: StageTrigger[];
  created_at: Date;
}

export interface OnboardingTask {
  id: string;
  stage_id: string;
  task_name: string;
  task_order: number;
  title: string;
  description: string;
  task_type: 'action' | 'tutorial' | 'form' | 'verification' | 'integration';
  required: boolean;
  completion_action: string;
  help_resources: HelpResource[];
  estimated_minutes: number;
  success_points: number;
  completed: boolean;
  completed_at?: Date;
  skipped: boolean;
  skipped_at?: Date;
  created_at: Date;
}

export interface HealthScore {
  user_id: string;
  organization_id?: string;
  overall_score: number;
  component_scores: {
    onboarding_progress: number;
    feature_adoption: number;
    engagement_level: number;
    success_milestones: number;
    support_interaction: number;
    retention_risk: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  risk_factors: RiskFactor[];
  improvement_recommendations: string[];
  last_calculated: Date;
}

export interface SuccessMilestone {
  id: string;
  user_id: string;
  organization_id?: string;
  milestone_type:
    | 'onboarding'
    | 'feature_adoption'
    | 'engagement'
    | 'business_value'
    | 'retention';
  milestone_name: string;
  description: string;
  success_criteria: string[];
  points_value: number;
  achieved: boolean;
  achieved_at?: Date;
  time_to_achieve_hours?: number;
  business_impact: string;
  celebration_message: string;
  next_suggested_milestone?: string;
  created_at: Date;
}

export interface EngagementTrigger {
  id: string;
  user_id: string;
  organization_id?: string;
  trigger_type:
    | 'welcome'
    | 'progress_check'
    | 'milestone_celebration'
    | 'at_risk_intervention'
    | 'success_expansion';
  trigger_condition: TriggerCondition;
  action_type:
    | 'email'
    | 'in_app_notification'
    | 'task_assignment'
    | 'support_outreach'
    | 'feature_highlight';
  action_config: Record<string, any>;
  status: 'active' | 'triggered' | 'completed' | 'paused';
  last_triggered?: Date;
  next_trigger_due?: Date;
  trigger_count: number;
  success_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface AutomationRule {
  id: string;
  workflow_id?: string;
  rule_name: string;
  description: string;
  trigger_event: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  execution_delay_minutes?: number;
  max_executions_per_user?: number;
  created_at: Date;
}

interface TriggerCondition {
  event_type: string;
  conditions: Record<string, any>;
  time_delay_hours?: number;
}

interface RiskFactor {
  factor_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommended_action: string;
}

interface SuccessCriteria {
  completion_threshold_percentage: number;
  required_milestones: string[];
  time_limit_days?: number;
  success_score_minimum: number;
}

interface StageTrigger {
  trigger_type: 'time_based' | 'action_based' | 'score_based';
  trigger_config: Record<string, any>;
}

interface HelpResource {
  type: 'video' | 'article' | 'tutorial' | 'documentation';
  title: string;
  url: string;
  estimated_time_minutes: number;
}

interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

interface AutomationAction {
  action_type: string;
  action_config: Record<string, any>;
  delay_minutes?: number;
}

export class CustomerSuccessService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Initialize customer success tracking for a new user
   */
  async initializeCustomerSuccess(
    userId: string,
    userType: 'wedding_planner' | 'supplier' | 'couple' | 'admin',
    organizationId?: string,
  ): Promise<CustomerSuccessConfig> {
    try {
      // Get appropriate workflow for user type
      const workflow = await this.getWorkflowForUserType(userType);

      if (!workflow) {
        throw new Error(`No workflow found for user type: ${userType}`);
      }

      // Create customer success configuration
      const config: Omit<
        CustomerSuccessConfig,
        'id' | 'created_at' | 'updated_at'
      > = {
        user_id: userId,
        organization_id: organizationId,
        onboarding_flow_id: workflow.id,
        current_stage: 'welcome',
        completion_percentage: 0,
        health_score: 50, // Start with neutral score
        success_milestones_achieved: 0,
        engagement_level: 'medium',
        at_risk_score: 0,
        last_activity: new Date(),
      };

      const { data: customerConfig, error: configError } = await this.supabase
        .from('customer_success_configs')
        .insert(config)
        .select()
        .single();

      if (configError) {
        throw new Error(
          `Failed to create customer success config: ${configError.message}`,
        );
      }

      // Initialize success milestones
      await this.initializeSuccessMilestones(userId, userType, organizationId);

      // Setup initial engagement triggers
      await this.setupInitialEngagementTriggers(userId, organizationId);

      // Track initialization event
      await this.trackSuccessEvent(userId, 'customer_success_initialized', {
        user_type: userType,
        workflow_id: workflow.id,
        organization_id: organizationId,
      });

      return customerConfig;
    } catch (error) {
      console.error('Error initializing customer success:', error);
      throw error;
    }
  }

  /**
   * Get current customer success status
   */
  async getCustomerSuccessStatus(userId: string): Promise<{
    config: CustomerSuccessConfig;
    health_score: HealthScore;
    current_milestones: SuccessMilestone[];
    next_actions: string[];
    engagement_triggers: EngagementTrigger[];
  }> {
    try {
      // Get customer success configuration
      const { data: config, error: configError } = await this.supabase
        .from('customer_success_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (configError || !config) {
        throw new Error('Customer success config not found');
      }

      // Get health score
      const healthScore = await this.calculateHealthScore(userId);

      // Get current milestones
      const currentMilestones = await this.getCurrentMilestones(userId);

      // Get next actions
      const nextActions = await this.generateNextActions(userId, config);

      // Get active engagement triggers
      const engagementTriggers = await this.getActiveEngagementTriggers(userId);

      return {
        config,
        health_score: healthScore,
        current_milestones: currentMilestones,
        next_actions: nextActions,
        engagement_triggers: engagementTriggers,
      };
    } catch (error) {
      console.error('Error getting customer success status:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive health score
   */
  async calculateHealthScore(userId: string): Promise<HealthScore> {
    try {
      // Get customer config
      const { data: config } = await this.supabase
        .from('customer_success_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!config) {
        throw new Error('Customer config not found');
      }

      // Calculate component scores
      const componentScores = {
        onboarding_progress: config.completion_percentage,
        feature_adoption: await this.calculateFeatureAdoptionScore(userId),
        engagement_level: await this.calculateEngagementScore(userId),
        success_milestones: (config.success_milestones_achieved / 10) * 100, // Normalize to 100
        support_interaction: await this.calculateSupportScore(userId),
        retention_risk: 100 - config.at_risk_score, // Invert risk score
      };

      // Calculate weighted overall score
      const weights = {
        onboarding_progress: 0.25,
        feature_adoption: 0.2,
        engagement_level: 0.2,
        success_milestones: 0.15,
        support_interaction: 0.1,
        retention_risk: 0.1,
      };

      const overallScore = Object.entries(componentScores).reduce(
        (total, [component, score]) =>
          total + score * weights[component as keyof typeof weights],
        0,
      );

      // Determine trend
      const trend = await this.calculateScoreTrend(userId);

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(
        userId,
        componentScores,
      );

      // Generate improvement recommendations
      const recommendations = await this.generateImprovementRecommendations(
        componentScores,
        riskFactors,
      );

      const healthScore: HealthScore = {
        user_id: userId,
        organization_id: config.organization_id,
        overall_score: Math.round(overallScore),
        component_scores: componentScores,
        trend,
        risk_factors: riskFactors,
        improvement_recommendations: recommendations,
        last_calculated: new Date(),
      };

      // Save health score
      await this.supabase.from('customer_health_scores').upsert(healthScore, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });

      return healthScore;
    } catch (error) {
      console.error('Error calculating health score:', error);
      throw error;
    }
  }

  /**
   * Track milestone achievement
   */
  async achieveMilestone(
    userId: string,
    milestoneType: string,
    milestoneData: Record<string, any>,
  ): Promise<SuccessMilestone> {
    try {
      // Get milestone definition
      const { data: milestone, error: milestoneError } = await this.supabase
        .from('success_milestones')
        .select('*')
        .eq('user_id', userId)
        .eq('milestone_type', milestoneType)
        .eq('achieved', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (milestoneError || !milestone) {
        throw new Error(`Milestone not found: ${milestoneType}`);
      }

      // Mark milestone as achieved
      const achievedAt = new Date();
      const timeToAchieve = differenceInHours(
        achievedAt,
        new Date(milestone.created_at),
      );

      const { data: achievedMilestone, error: updateError } =
        await this.supabase
          .from('success_milestones')
          .update({
            achieved: true,
            achieved_at: achievedAt,
            time_to_achieve_hours: timeToAchieve,
          })
          .eq('id', milestone.id)
          .select()
          .single();

      if (updateError) {
        throw updateError;
      }

      // Update customer success config
      await this.incrementMilestoneCount(userId);

      // Trigger celebration and next milestone setup
      await this.triggerMilestoneCelebration(userId, achievedMilestone);
      await this.setupNextMilestone(userId, milestoneType);

      // Track achievement event
      await this.trackSuccessEvent(userId, 'milestone_achieved', {
        milestone_type: milestoneType,
        milestone_name: milestone.milestone_name,
        time_to_achieve_hours: timeToAchieve,
        data: milestoneData,
      });

      return achievedMilestone;
    } catch (error) {
      console.error('Error achieving milestone:', error);
      throw error;
    }
  }

  /**
   * Process engagement trigger
   */
  async processEngagementTrigger(
    userId: string,
    triggerType: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    try {
      // Get active triggers for this user and type
      const { data: triggers, error: triggersError } = await this.supabase
        .from('engagement_triggers')
        .select('*')
        .eq('user_id', userId)
        .eq('trigger_type', triggerType)
        .eq('status', 'active');

      if (triggersError || !triggers || triggers.length === 0) {
        return; // No triggers to process
      }

      for (const trigger of triggers) {
        // Check if trigger conditions are met
        const conditionsMet = await this.evaluateTriggerConditions(
          trigger,
          eventData,
        );

        if (conditionsMet) {
          // Execute trigger action
          await this.executeTriggerAction(trigger, eventData);

          // Update trigger status
          await this.supabase
            .from('engagement_triggers')
            .update({
              status: 'triggered',
              last_triggered: new Date(),
              trigger_count: trigger.trigger_count + 1,
            })
            .eq('id', trigger.id);

          // Track trigger execution
          await this.trackSuccessEvent(userId, 'engagement_trigger_executed', {
            trigger_type: triggerType,
            trigger_id: trigger.id,
            action_type: trigger.action_type,
            event_data: eventData,
          });
        }
      }
    } catch (error) {
      console.error('Error processing engagement trigger:', error);
      // Don't throw - engagement triggers shouldn't break main flow
    }
  }

  /**
   * Get success metrics dashboard data
   */
  async getSuccessMetricsDashboard(organizationId?: string): Promise<{
    summary: {
      total_users: number;
      average_health_score: number;
      milestones_achieved_today: number;
      at_risk_users: number;
      champion_users: number;
    };
    health_score_distribution: Record<string, number>;
    milestone_achievements: {
      type: string;
      count: number;
      avg_time_to_achieve: number;
    }[];
    engagement_trends: {
      date: string;
      active_users: number;
      avg_engagement_score: number;
    }[];
    at_risk_users: {
      user_id: string;
      risk_score: number;
      risk_factors: string[];
      recommended_actions: string[];
    }[];
  }> {
    try {
      // Get summary data
      let summaryQuery = this.supabase
        .from('customer_success_configs')
        .select('health_score, engagement_level, at_risk_score');

      if (organizationId) {
        summaryQuery = summaryQuery.eq('organization_id', organizationId);
      }

      const { data: summaryData } = await summaryQuery;

      const totalUsers = summaryData?.length || 0;
      const avgHealthScore =
        totalUsers > 0
          ? Math.round(
              summaryData!.reduce((sum, user) => sum + user.health_score, 0) /
                totalUsers,
            )
          : 0;

      const atRiskUsers =
        summaryData?.filter((user) => user.at_risk_score > 70).length || 0;
      const championUsers =
        summaryData?.filter((user) => user.engagement_level === 'champion')
          .length || 0;

      // Get milestones achieved today
      const today = new Date().toISOString().split('T')[0];
      let milestonesQuery = this.supabase
        .from('success_milestones')
        .select('*', { count: 'exact', head: true })
        .eq('achieved', true)
        .gte('achieved_at', `${today}T00:00:00Z`)
        .lte('achieved_at', `${today}T23:59:59Z`);

      if (organizationId) {
        milestonesQuery = milestonesQuery.eq('organization_id', organizationId);
      }

      const { count: milestonesToday } = await milestonesQuery;

      // Health score distribution
      const healthDistribution =
        summaryData?.reduce(
          (acc, user) => {
            const bucket = Math.floor(user.health_score / 10) * 10;
            const bucketKey = `${bucket}-${bucket + 9}`;
            acc[bucketKey] = (acc[bucketKey] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      // Milestone achievements by type
      let milestoneStatsQuery = this.supabase
        .from('success_milestones')
        .select('milestone_type, time_to_achieve_hours')
        .eq('achieved', true);

      if (organizationId) {
        milestoneStatsQuery = milestoneStatsQuery.eq(
          'organization_id',
          organizationId,
        );
      }

      const { data: milestoneStats } = await milestoneStatsQuery;

      const milestoneAchievements = Object.entries(
        milestoneStats?.reduce(
          (acc, milestone) => {
            const type = milestone.milestone_type;
            if (!acc[type]) {
              acc[type] = { count: 0, totalTime: 0 };
            }
            acc[type].count += 1;
            acc[type].totalTime += milestone.time_to_achieve_hours || 0;
            return acc;
          },
          {} as Record<string, { count: number; totalTime: number }>,
        ) || {},
      ).map(([type, stats]) => ({
        type,
        count: stats.count,
        avg_time_to_achieve:
          stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
      }));

      // At-risk users details
      const atRiskDetails =
        summaryData
          ?.filter((user) => user.at_risk_score > 70)
          .slice(0, 10) // Top 10 at-risk users
          .map((user) => ({
            user_id: user.user_id,
            risk_score: user.at_risk_score,
            risk_factors: ['Low engagement', 'Incomplete onboarding'], // Simplified
            recommended_actions: [
              'Schedule check-in call',
              'Send helpful resources',
            ],
          })) || [];

      return {
        summary: {
          total_users: totalUsers,
          average_health_score: avgHealthScore,
          milestones_achieved_today: milestonesToday || 0,
          at_risk_users: atRiskUsers,
          champion_users: championUsers,
        },
        health_score_distribution: healthDistribution,
        milestone_achievements: milestoneAchievements,
        engagement_trends: [], // Placeholder for trends data
        at_risk_users: atRiskDetails,
      };
    } catch (error) {
      console.error('Error getting success metrics dashboard:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getWorkflowForUserType(
    userType: string,
  ): Promise<OnboardingWorkflow | null> {
    const { data, error } = await this.supabase
      .from('onboarding_workflows')
      .select('*')
      .eq('user_type', userType)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error getting workflow:', error);
      return null;
    }

    return data;
  }

  private async initializeSuccessMilestones(
    userId: string,
    userType: string,
    organizationId?: string,
  ): Promise<void> {
    // Default milestones based on user type
    const defaultMilestones = this.getDefaultMilestonesForUserType(userType);

    const milestones = defaultMilestones.map((milestone) => ({
      user_id: userId,
      organization_id: organizationId,
      ...milestone,
      achieved: false,
      created_at: new Date(),
    }));

    await this.supabase.from('success_milestones').insert(milestones);
  }

  private getDefaultMilestonesForUserType(
    userType: string,
  ): Partial<SuccessMilestone>[] {
    const commonMilestones = [
      {
        milestone_type: 'onboarding',
        milestone_name: 'Complete Profile Setup',
        description: 'Complete your profile with all required information',
        success_criteria: [
          'Profile 100% complete',
          'Avatar uploaded',
          'Preferences set',
        ],
        points_value: 100,
        business_impact: 'Higher engagement and personalized experience',
        celebration_message:
          '🎉 Welcome to WedSync! Your profile is now complete!',
      },
      {
        milestone_type: 'feature_adoption',
        milestone_name: 'Create First Project',
        description: 'Create your first wedding project or client',
        success_criteria: ['Project created', 'Basic details added'],
        points_value: 200,
        business_impact: 'Active platform usage begins',
        celebration_message:
          '🚀 Great start! Your first project is ready to go!',
      },
      {
        milestone_type: 'engagement',
        milestone_name: 'Complete First Week',
        description: 'Stay active for your first week on the platform',
        success_criteria: ['7 days of activity', 'Multiple feature usage'],
        points_value: 150,
        business_impact: 'Increased retention likelihood',
        celebration_message:
          "🌟 One week down! You're building great momentum!",
      },
    ];

    // Add user-type specific milestones
    if (userType === 'wedding_planner') {
      return [
        ...commonMilestones,
        {
          milestone_type: 'feature_adoption',
          milestone_name: 'Add First Client',
          description: 'Add your first wedding client to the system',
          success_criteria: [
            'Client created',
            'Wedding date set',
            'Basic details complete',
          ],
          points_value: 250,
          business_impact: 'Platform value realization',
          celebration_message:
            '💍 Excellent! Your client management journey begins!',
        },
      ];
    }

    return commonMilestones;
  }

  private async setupInitialEngagementTriggers(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    const initialTriggers: Partial<EngagementTrigger>[] = [
      {
        user_id: userId,
        organization_id: organizationId,
        trigger_type: 'welcome',
        trigger_condition: {
          event_type: 'user_registered',
          conditions: {},
          time_delay_hours: 0,
        },
        action_type: 'email',
        action_config: {
          template: 'welcome_onboarding',
          personalization: true,
        },
        status: 'active',
        trigger_count: 0,
        success_rate: 0,
      },
      {
        user_id: userId,
        organization_id: organizationId,
        trigger_type: 'progress_check',
        trigger_condition: {
          event_type: 'onboarding_stalled',
          conditions: { days_without_progress: 3 },
          time_delay_hours: 72,
        },
        action_type: 'in_app_notification',
        action_config: {
          message: "Need help getting started? We're here to help!",
          action_button: 'Get Help',
          action_url: '/help/onboarding',
        },
        status: 'active',
        trigger_count: 0,
        success_rate: 0,
      },
    ];

    await this.supabase.from('engagement_triggers').insert(initialTriggers);
  }

  private async calculateFeatureAdoptionScore(userId: string): Promise<number> {
    // Implementation would check which features the user has used
    // For now, return a placeholder
    return 75;
  }

  private async calculateEngagementScore(userId: string): Promise<number> {
    // Use existing engagement scoring service
    try {
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('supplier_id')
        .eq('id', userId)
        .single();

      if (userProfile?.supplier_id) {
        const engagement = await engagementScoringService.getEngagementScore(
          userId,
          userProfile.supplier_id,
        );
        return engagement?.score || 50;
      }
    } catch (error) {
      console.warn('Could not get engagement score:', error);
    }
    return 50;
  }

  private async calculateSupportScore(userId: string): Promise<number> {
    // Implementation would check support ticket history and satisfaction
    // For now, return a placeholder
    return 85;
  }

  private async calculateScoreTrend(
    userId: string,
  ): Promise<'improving' | 'stable' | 'declining'> {
    // Implementation would compare recent health scores
    // For now, return a placeholder
    return 'stable';
  }

  private async identifyRiskFactors(
    userId: string,
    componentScores: any,
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    if (componentScores.onboarding_progress < 50) {
      riskFactors.push({
        factor_type: 'incomplete_onboarding',
        severity: 'high',
        description: 'User has not completed onboarding process',
        recommended_action: 'Send personalized onboarding assistance',
      });
    }

    if (componentScores.engagement_level < 30) {
      riskFactors.push({
        factor_type: 'low_engagement',
        severity: 'high',
        description: 'User engagement is significantly below average',
        recommended_action: 'Schedule success manager call',
      });
    }

    return riskFactors;
  }

  private async generateImprovementRecommendations(
    componentScores: any,
    riskFactors: RiskFactor[],
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (componentScores.onboarding_progress < 80) {
      recommendations.push(
        'Complete remaining onboarding steps to unlock full platform potential',
      );
    }

    if (componentScores.feature_adoption < 70) {
      recommendations.push(
        'Explore advanced features to maximize productivity gains',
      );
    }

    if (riskFactors.length > 0) {
      recommendations.push(
        'Address identified risk factors to improve overall health score',
      );
    }

    return recommendations;
  }

  private async getCurrentMilestones(
    userId: string,
  ): Promise<SuccessMilestone[]> {
    const { data, error } = await this.supabase
      .from('success_milestones')
      .select('*')
      .eq('user_id', userId)
      .eq('achieved', false)
      .order('points_value', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error getting current milestones:', error);
      return [];
    }

    return data || [];
  }

  private async generateNextActions(
    userId: string,
    config: CustomerSuccessConfig,
  ): Promise<string[]> {
    const actions: string[] = [];

    if (config.completion_percentage < 50) {
      actions.push('Complete your onboarding setup to unlock all features');
    }

    if (config.success_milestones_achieved < 3) {
      actions.push(
        'Achieve your next success milestone to improve your health score',
      );
    }

    if (config.health_score < 70) {
      actions.push(
        'Focus on increasing engagement to improve your success score',
      );
    }

    return actions;
  }

  private async getActiveEngagementTriggers(
    userId: string,
  ): Promise<EngagementTrigger[]> {
    const { data, error } = await this.supabase
      .from('engagement_triggers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting engagement triggers:', error);
      return [];
    }

    return data || [];
  }

  private async incrementMilestoneCount(userId: string): Promise<void> {
    await this.supabase.rpc('increment_customer_milestone_count', {
      p_user_id: userId,
    });
  }

  private async triggerMilestoneCelebration(
    userId: string,
    milestone: SuccessMilestone,
  ): Promise<void> {
    // Trigger celebration notification/email
    await this.processEngagementTrigger(userId, 'milestone_celebration', {
      milestone_id: milestone.id,
      milestone_name: milestone.milestone_name,
      celebration_message: milestone.celebration_message,
    });
  }

  private async setupNextMilestone(
    userId: string,
    completedMilestoneType: string,
  ): Promise<void> {
    // Logic to suggest and setup next milestone based on completed one
    // Implementation would create new milestone entries
  }

  private async evaluateTriggerConditions(
    trigger: EngagementTrigger,
    eventData: Record<string, any>,
  ): Promise<boolean> {
    // Implementation would evaluate trigger conditions against event data
    // For now, return true for simple case
    return true;
  }

  private async executeTriggerAction(
    trigger: EngagementTrigger,
    eventData: Record<string, any>,
  ): Promise<void> {
    // Implementation would execute the specified action (email, notification, etc.)
    console.log(
      `Executing trigger action: ${trigger.action_type}`,
      trigger.action_config,
    );
  }

  private async trackSuccessEvent(
    userId: string,
    eventType: string,
    eventData: any,
  ): Promise<void> {
    try {
      await this.supabase.from('customer_success_events').insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date(),
      });
    } catch (error) {
      console.error('Failed to track success event:', error);
      // Don't throw - event tracking shouldn't break main functionality
    }
  }
}

// Export singleton instance
export const customerSuccessService = new CustomerSuccessService();
