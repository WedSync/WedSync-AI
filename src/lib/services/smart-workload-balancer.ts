import { createClient } from '@supabase/supabase-js';
import { Task, HelperSuggestion } from '@/types/workflow';
import {
  helperAnalytics,
  HelperPerformanceMetrics,
} from './helper-performance-analytics';
import { enhancedConflictDetection } from './enhanced-conflict-detection';

export interface HelperWorkloadProfile {
  helper_id: string;
  helper_name: string;
  current_workload: number; // 0-100 scale
  capacity: number; // Maximum recommended workload (0-100)

  // Time-based workload
  hours_scheduled_today: number;
  hours_scheduled_this_week: number;
  peak_hours_utilization: number; // During 4-8 PM wedding peak hours

  // Task complexity workload
  complexity_weighted_load: number; // Weighted by task difficulty
  high_priority_task_count: number;
  average_task_duration: number; // minutes

  // Performance-adjusted capacity
  performance_multiplier: number; // Based on performance metrics (0.5-1.5)
  fatigue_factor: number; // Reduces capacity based on recent intensive work
  skill_efficiency_bonus: number; // Increases capacity for skilled helpers

  // Availability windows
  available_time_slots: TimeSlot[];
  unavailable_periods: UnavailablePeriod[];
  preferred_working_hours: { start: string; end: string };

  // Workload trends
  workload_trend: 'increasing' | 'stable' | 'decreasing';
  projected_workload_next_week: number;
  historical_overload_incidents: number;

  last_updated: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available_capacity: number; // 0-100, accounts for partial availability
  buffer_time_included: boolean;
}

export interface UnavailablePeriod {
  start: Date;
  end: Date;
  reason: 'break' | 'travel' | 'other_wedding' | 'personal' | 'maintenance';
  is_flexible: boolean; // Can be moved if needed
}

export interface WorkloadBalance {
  balance_score: number; // 0-100, how well balanced the workload is
  overloaded_helpers: string[]; // Helper IDs with >80% workload
  underutilized_helpers: string[]; // Helper IDs with <40% workload
  optimal_helpers: string[]; // Helper IDs with 40-80% workload

  recommendations: WorkloadRecommendation[];
  redistribution_opportunities: RedistributionOpportunity[];
  capacity_alerts: CapacityAlert[];
}

export interface WorkloadRecommendation {
  type:
    | 'redistribute'
    | 'hire_additional'
    | 'reduce_scope'
    | 'reschedule'
    | 'skill_development';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_helpers: string[];
  expected_impact: {
    workload_improvement: number; // Percentage points
    efficiency_gain: number;
    risk_reduction: number;
  };
  implementation_steps: string[];
  estimated_effort: 'minimal' | 'moderate' | 'significant';
}

export interface RedistributionOpportunity {
  source_helper_id: string;
  target_helper_id: string;
  task_ids: string[];
  workload_transfer_amount: number; // Percentage points
  efficiency_score: number; // 0-100, how good this redistribution is
  implementation_complexity: 'easy' | 'moderate' | 'complex';
  risk_factors: string[];
}

export interface CapacityAlert {
  alert_type:
    | 'overload'
    | 'burnout_risk'
    | 'skill_mismatch'
    | 'availability_conflict';
  severity: 'warning' | 'critical' | 'emergency';
  helper_id: string;
  helper_name: string;
  current_workload: number;
  threshold_exceeded: number;
  projected_impact: string;
  immediate_actions: string[];
  timeline: 'immediate' | 'within_24h' | 'within_week';
}

export interface BalancingConstraints {
  max_workload_per_helper: number; // Default 85%
  min_workload_for_efficiency: number; // Default 30%
  peak_hours_max_workload: number; // Default 90%

  skill_matching_weight: number; // 0-1, importance of skill matching
  performance_weight: number; // 0-1, importance of performance history
  preference_weight: number; // 0-1, importance of helper preferences

  allow_task_splitting: boolean;
  allow_schedule_adjustment: boolean;
  require_helper_approval: boolean;

  emergency_rebalancing: boolean; // Allow aggressive rebalancing for critical situations
}

/**
 * Smart Workload Balancer Service
 * Automatically optimizes task distribution to prevent helper overload and maximize efficiency
 */
export class SmartWorkloadBalancerService {
  private supabase: ReturnType<typeof createClient>;
  private analyticsService = helperAnalytics;
  private conflictDetection = enhancedConflictDetection;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Main workload balancing method - analyzes and optimizes helper workloads
   */
  async balanceWorkloads(
    weddingId: string,
    constraints: Partial<BalancingConstraints> = {},
  ): Promise<WorkloadBalance> {
    try {
      // Set default constraints
      const balancingConstraints: BalancingConstraints = {
        max_workload_per_helper: 85,
        min_workload_for_efficiency: 30,
        peak_hours_max_workload: 90,
        skill_matching_weight: 0.7,
        performance_weight: 0.8,
        preference_weight: 0.5,
        allow_task_splitting: true,
        allow_schedule_adjustment: true,
        require_helper_approval: false,
        emergency_rebalancing: false,
        ...constraints,
      };

      // Get current workload profiles for all helpers
      const workloadProfiles = await this.calculateWorkloadProfiles(weddingId);

      // Analyze current balance state
      const currentBalance = this.analyzeWorkloadBalance(workloadProfiles);

      // Generate redistribution opportunities
      const redistributionOpportunities =
        await this.identifyRedistributionOpportunities(
          workloadProfiles,
          weddingId,
          balancingConstraints,
        );

      // Generate capacity alerts
      const capacityAlerts = this.generateCapacityAlerts(
        workloadProfiles,
        balancingConstraints,
      );

      // Create recommendations
      const recommendations = await this.generateWorkloadRecommendations(
        workloadProfiles,
        redistributionOpportunities,
        capacityAlerts,
        balancingConstraints,
      );

      return {
        balance_score: currentBalance.balance_score,
        overloaded_helpers: currentBalance.overloaded_helpers,
        underutilized_helpers: currentBalance.underutilized_helpers,
        optimal_helpers: currentBalance.optimal_helpers,
        recommendations,
        redistribution_opportunities: redistributionOpportunities,
        capacity_alerts: capacityAlerts,
      };
    } catch (error) {
      console.error('Error balancing workloads:', error);
      throw error;
    }
  }

  /**
   * Proactively rebalance workloads based on real-time changes
   */
  async proactiveRebalancing(
    weddingId: string,
    triggerEvent:
      | 'task_added'
      | 'helper_unavailable'
      | 'task_delayed'
      | 'helper_overload',
  ): Promise<{
    rebalancing_needed: boolean;
    urgent_actions: any[];
    suggested_changes: any[];
    impact_analysis: any;
  }> {
    try {
      const workloadProfiles = await this.calculateWorkloadProfiles(weddingId);
      const urgentActions = [];
      const suggestedChanges = [];

      // Check for immediate issues requiring action
      const criticallyOverloaded = workloadProfiles.filter(
        (p) => p.current_workload > 95,
      );
      const emergencyRebalancing = criticallyOverloaded.length > 0;

      if (emergencyRebalancing) {
        // Generate emergency rebalancing actions
        for (const overloadedHelper of criticallyOverloaded) {
          const emergencyAction = await this.generateEmergencyRebalancing(
            overloadedHelper,
            workloadProfiles,
          );
          urgentActions.push(emergencyAction);
        }
      }

      // Generate proactive suggestions based on trigger event
      const proactiveSuggestions = await this.generateProactiveSuggestions(
        workloadProfiles,
        triggerEvent,
        weddingId,
      );
      suggestedChanges.push(...proactiveSuggestions);

      // Analyze impact of potential changes
      const impactAnalysis = this.analyzeRebalancingImpact(
        workloadProfiles,
        urgentActions,
        suggestedChanges,
      );

      return {
        rebalancing_needed:
          urgentActions.length > 0 || suggestedChanges.length > 0,
        urgent_actions: urgentActions,
        suggested_changes: suggestedChanges,
        impact_analysis: impactAnalysis,
      };
    } catch (error) {
      console.error('Error in proactive rebalancing:', error);
      throw error;
    }
  }

  /**
   * Optimize task assignment for a new task considering workload balance
   */
  async optimizeTaskAssignment(
    task: Task,
    availableHelpers: string[],
    balancingPriority: 'efficiency' | 'balance' | 'performance' = 'balance',
  ): Promise<{
    recommended_helper: string;
    assignment_score: number;
    workload_impact: any;
    alternative_options: Array<{
      helper_id: string;
      score: number;
      impact: any;
    }>;
  }> {
    try {
      // Get current workload profiles for available helpers
      const helperProfiles =
        await this.getHelperWorkloadProfiles(availableHelpers);

      // Score each helper for this task assignment
      const helperScores = await Promise.all(
        helperProfiles.map(async (profile) => {
          const assignmentScore = await this.calculateAssignmentScore(
            task,
            profile,
            balancingPriority,
          );

          const workloadImpact = this.calculateWorkloadImpact(task, profile);

          return {
            helper_id: profile.helper_id,
            helper_name: profile.helper_name,
            score: assignmentScore,
            workload_impact: workloadImpact,
          };
        }),
      );

      // Sort by score and select best option
      const sortedOptions = helperScores.sort((a, b) => b.score - a.score);
      const recommended = sortedOptions[0];
      const alternatives = sortedOptions.slice(1, 4); // Top 3 alternatives

      return {
        recommended_helper: recommended.helper_id,
        assignment_score: recommended.score,
        workload_impact: recommended.workload_impact,
        alternative_options: alternatives,
      };
    } catch (error) {
      console.error('Error optimizing task assignment:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive workload profiles for all helpers
   */
  async calculateWorkloadProfiles(
    weddingId: string,
  ): Promise<HelperWorkloadProfile[]> {
    try {
      // Get all helpers for the wedding
      const { data: helpers } = await this.supabase
        .from('task_helpers')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('status', 'active');

      if (!helpers) return [];

      // Calculate profiles for each helper
      const profiles = await Promise.all(
        helpers.map((helper) =>
          this.calculateIndividualWorkloadProfile(helper, weddingId),
        ),
      );

      return profiles;
    } catch (error) {
      console.error('Error calculating workload profiles:', error);
      return [];
    }
  }

  /**
   * Calculate detailed workload profile for an individual helper
   */
  private async calculateIndividualWorkloadProfile(
    helper: any,
    weddingId: string,
  ): Promise<HelperWorkloadProfile> {
    // Get current assignments
    const { data: assignments } = await this.supabase
      .from('task_assignments')
      .select(
        `
        *,
        tasks(*)
      `,
      )
      .eq('helper_id', helper.id)
      .eq('status', 'active')
      .gte('scheduled_start', new Date().toISOString());

    // Get performance metrics
    const performanceMetrics =
      await this.analyticsService.calculateHelperMetrics(
        helper.id,
        {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        }, // Last 30 days
      );

    // Calculate time-based workload
    const timeBasedWorkload = this.calculateTimeBasedWorkload(
      assignments || [],
    );

    // Calculate complexity-weighted workload
    const complexityWeightedLoad = this.calculateComplexityWeightedWorkload(
      assignments || [],
    );

    // Calculate performance-adjusted capacity
    const performanceMultiplier =
      this.calculatePerformanceMultiplier(performanceMetrics);

    // Calculate fatigue factor
    const fatigueFactor = this.calculateFatigueFactor(
      assignments || [],
      performanceMetrics,
    );

    // Calculate skill efficiency bonus
    const skillEfficiencyBonus = this.calculateSkillEfficiencyBonus(
      helper,
      assignments || [],
    );

    // Generate availability windows
    const availabilityWindows = await this.generateAvailabilityWindows(
      helper,
      assignments || [],
    );

    // Calculate base capacity (considering all factors)
    const baseCapacity = 100;
    const adjustedCapacity = Math.min(
      100,
      baseCapacity *
        performanceMultiplier *
        (1 - fatigueFactor) *
        (1 + skillEfficiencyBonus),
    );

    // Current workload calculation
    const currentWorkload = Math.min(
      100,
      (timeBasedWorkload + complexityWeightedLoad) / 2,
    );

    // Workload trend analysis
    const workloadTrend = this.analyzeWorkloadTrend(assignments || []);
    const projectedWorkloadNextWeek = this.projectWorkloadNextWeek(
      assignments || [],
      currentWorkload,
    );

    return {
      helper_id: helper.id,
      helper_name: helper.name,
      current_workload: currentWorkload,
      capacity: adjustedCapacity,

      hours_scheduled_today: timeBasedWorkload.today,
      hours_scheduled_this_week: timeBasedWorkload.thisWeek,
      peak_hours_utilization: timeBasedWorkload.peakHours,

      complexity_weighted_load: complexityWeightedLoad,
      high_priority_task_count:
        assignments?.filter((a) => a.tasks?.priority === 'high').length || 0,
      average_task_duration: this.calculateAverageTaskDuration(
        assignments || [],
      ),

      performance_multiplier: performanceMultiplier,
      fatigue_factor: fatigueFactor,
      skill_efficiency_bonus: skillEfficiencyBonus,

      available_time_slots: availabilityWindows.available,
      unavailable_periods: availabilityWindows.unavailable,
      preferred_working_hours: helper.preferred_hours || {
        start: '09:00',
        end: '17:00',
      },

      workload_trend: workloadTrend,
      projected_workload_next_week: projectedWorkloadNextWeek,
      historical_overload_incidents:
        performanceMetrics.no_show_rate > 0.1
          ? Math.floor(performanceMetrics.no_show_rate * 10)
          : 0,

      last_updated: new Date(),
    };
  }

  /**
   * Analyze current workload balance across all helpers
   */
  private analyzeWorkloadBalance(profiles: HelperWorkloadProfile[]): {
    balance_score: number;
    overloaded_helpers: string[];
    underutilized_helpers: string[];
    optimal_helpers: string[];
  } {
    if (profiles.length === 0) {
      return {
        balance_score: 100,
        overloaded_helpers: [],
        underutilized_helpers: [],
        optimal_helpers: [],
      };
    }

    const workloads = profiles.map((p) => p.current_workload);
    const averageWorkload =
      workloads.reduce((sum, w) => sum + w, 0) / workloads.length;

    // Calculate standard deviation to measure balance
    const variance =
      workloads.reduce((sum, w) => sum + Math.pow(w - averageWorkload, 2), 0) /
      workloads.length;
    const standardDeviation = Math.sqrt(variance);

    // Balance score: lower deviation = better balance (0-100 scale)
    const balanceScore = Math.max(0, 100 - standardDeviation * 2); // Scale factor of 2

    // Categorize helpers
    const overloaded = profiles
      .filter((p) => p.current_workload > 80)
      .map((p) => p.helper_id);
    const underutilized = profiles
      .filter((p) => p.current_workload < 40)
      .map((p) => p.helper_id);
    const optimal = profiles
      .filter((p) => p.current_workload >= 40 && p.current_workload <= 80)
      .map((p) => p.helper_id);

    return {
      balance_score: Math.round(balanceScore),
      overloaded_helpers: overloaded,
      underutilized_helpers: underutilized,
      optimal_helpers: optimal,
    };
  }

  /**
   * Identify opportunities to redistribute workload between helpers
   */
  private async identifyRedistributionOpportunities(
    profiles: HelperWorkloadProfile[],
    weddingId: string,
    constraints: BalancingConstraints,
  ): Promise<RedistributionOpportunity[]> {
    const opportunities: RedistributionOpportunity[] = [];

    const overloadedHelpers = profiles.filter(
      (p) => p.current_workload > constraints.max_workload_per_helper,
    );
    const availableHelpers = profiles.filter(
      (p) => p.current_workload < constraints.max_workload_per_helper,
    );

    for (const overloadedHelper of overloadedHelpers) {
      // Get tasks that could potentially be redistributed
      const { data: redistributableTasks } = await this.supabase
        .from('task_assignments')
        .select(
          `
          *,
          tasks(*)
        `,
        )
        .eq('helper_id', overloadedHelper.helper_id)
        .eq('status', 'assigned')
        .gte('scheduled_start', new Date().toISOString());

      if (!redistributableTasks) continue;

      // Find best target helper for each redistributable task
      for (const task of redistributableTasks) {
        const bestTarget = await this.findBestRedistributionTarget(
          task,
          overloadedHelper,
          availableHelpers,
          constraints,
        );

        if (bestTarget) {
          opportunities.push({
            source_helper_id: overloadedHelper.helper_id,
            target_helper_id: bestTarget.helper_id,
            task_ids: [task.task_id],
            workload_transfer_amount: this.calculateTaskWorkloadImpact(task),
            efficiency_score: bestTarget.efficiency_score,
            implementation_complexity: bestTarget.complexity,
            risk_factors: bestTarget.risk_factors,
          });
        }
      }
    }

    // Sort opportunities by efficiency score
    return opportunities.sort(
      (a, b) => b.efficiency_score - a.efficiency_score,
    );
  }

  /**
   * Generate capacity alerts for helpers at risk
   */
  private generateCapacityAlerts(
    profiles: HelperWorkloadProfile[],
    constraints: BalancingConstraints,
  ): CapacityAlert[] {
    const alerts: CapacityAlert[] = [];

    for (const profile of profiles) {
      // Overload alert
      if (profile.current_workload > constraints.max_workload_per_helper) {
        alerts.push({
          alert_type: 'overload',
          severity: profile.current_workload > 95 ? 'emergency' : 'critical',
          helper_id: profile.helper_id,
          helper_name: profile.helper_name,
          current_workload: profile.current_workload,
          threshold_exceeded:
            profile.current_workload - constraints.max_workload_per_helper,
          projected_impact: `Risk of burnout and task quality degradation`,
          immediate_actions: [
            'Redistribute high-priority tasks',
            'Extend task deadlines where possible',
            'Consider hiring additional help',
          ],
          timeline: profile.current_workload > 95 ? 'immediate' : 'within_24h',
        });
      }

      // Burnout risk alert
      if (profile.fatigue_factor > 0.3 && profile.current_workload > 70) {
        alerts.push({
          alert_type: 'burnout_risk',
          severity: 'warning',
          helper_id: profile.helper_id,
          helper_name: profile.helper_name,
          current_workload: profile.current_workload,
          threshold_exceeded: profile.fatigue_factor,
          projected_impact: `Increasing risk of errors and no-shows`,
          immediate_actions: [
            'Schedule mandatory break periods',
            'Reduce task complexity',
            'Provide additional support',
          ],
          timeline: 'within_week',
        });
      }

      // Peak hours overload
      if (
        profile.peak_hours_utilization > constraints.peak_hours_max_workload
      ) {
        alerts.push({
          alert_type: 'overload',
          severity: 'warning',
          helper_id: profile.helper_id,
          helper_name: profile.helper_name,
          current_workload: profile.peak_hours_utilization,
          threshold_exceeded:
            profile.peak_hours_utilization -
            constraints.peak_hours_max_workload,
          projected_impact: `Peak wedding hours overload risk`,
          immediate_actions: [
            'Redistribute peak-hour tasks',
            'Add buffer time between tasks',
            'Consider backup helper for peak hours',
          ],
          timeline: 'within_24h',
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { emergency: 3, critical: 2, warning: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate comprehensive workload recommendations
   */
  private async generateWorkloadRecommendations(
    profiles: HelperWorkloadProfile[],
    opportunities: RedistributionOpportunity[],
    alerts: CapacityAlert[],
    constraints: BalancingConstraints,
  ): Promise<WorkloadRecommendation[]> {
    const recommendations: WorkloadRecommendation[] = [];

    // High-priority redistribution recommendations
    if (opportunities.length > 0) {
      const topOpportunities = opportunities.slice(0, 3); // Top 3 opportunities

      recommendations.push({
        type: 'redistribute',
        priority: 'high',
        description: `Redistribute ${topOpportunities.length} tasks to improve workload balance`,
        affected_helpers: [
          ...topOpportunities.map((o) => o.source_helper_id),
          ...topOpportunities.map((o) => o.target_helper_id),
        ],
        expected_impact: {
          workload_improvement: topOpportunities.reduce(
            (sum, o) => sum + o.workload_transfer_amount,
            0,
          ),
          efficiency_gain: 15,
          risk_reduction: 25,
        },
        implementation_steps: [
          'Review task compatibility with target helpers',
          'Confirm availability with target helpers',
          'Update task assignments and notify all parties',
          'Monitor progress and adjust if needed',
        ],
        estimated_effort: 'moderate',
      });
    }

    // Emergency alerts recommendations
    const emergencyAlerts = alerts.filter((a) => a.severity === 'emergency');
    if (emergencyAlerts.length > 0) {
      recommendations.push({
        type: 'reduce_scope',
        priority: 'critical',
        description: `Immediate action required for ${emergencyAlerts.length} overloaded helpers`,
        affected_helpers: emergencyAlerts.map((a) => a.helper_id),
        expected_impact: {
          workload_improvement: 20,
          efficiency_gain: 0,
          risk_reduction: 50,
        },
        implementation_steps: [
          'Identify non-critical tasks that can be postponed',
          'Negotiate timeline extensions with clients where possible',
          'Activate backup helpers or hire temporary staff',
          'Implement immediate workload caps',
        ],
        estimated_effort: 'significant',
      });
    }

    // Skill development recommendations
    const lowPerformanceHelpers = profiles.filter(
      (p) => p.performance_multiplier < 0.8,
    );
    if (lowPerformanceHelpers.length > 0) {
      recommendations.push({
        type: 'skill_development',
        priority: 'medium',
        description: `Improve efficiency through skill development for ${lowPerformanceHelpers.length} helpers`,
        affected_helpers: lowPerformanceHelpers.map((h) => h.helper_id),
        expected_impact: {
          workload_improvement: 10,
          efficiency_gain: 20,
          risk_reduction: 15,
        },
        implementation_steps: [
          'Assess specific skill gaps',
          'Design targeted training programs',
          'Pair with experienced mentors',
          'Track skill development progress',
        ],
        estimated_effort: 'moderate',
      });
    }

    // Hiring recommendations
    const totalWorkload = profiles.reduce(
      (sum, p) => sum + p.current_workload,
      0,
    );
    const averageWorkload = totalWorkload / profiles.length;

    if (averageWorkload > 75 && opportunities.length < 2) {
      recommendations.push({
        type: 'hire_additional',
        priority: 'medium',
        description: `Consider hiring additional helpers to reduce overall workload pressure`,
        affected_helpers: profiles.map((p) => p.helper_id),
        expected_impact: {
          workload_improvement: 25,
          efficiency_gain: 10,
          risk_reduction: 30,
        },
        implementation_steps: [
          'Calculate optimal number of additional helpers needed',
          'Define required skills and availability',
          'Post job requirements and screen candidates',
          'Onboard and train new helpers',
        ],
        estimated_effort: 'significant',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Helper calculation methods (simplified for brevity)
  private calculateTimeBasedWorkload(assignments: any[]): {
    today: number;
    thisWeek: number;
    peakHours: number;
  } {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(
      todayStart.getTime() - todayStart.getDay() * 24 * 60 * 60 * 1000,
    );

    let todayHours = 0;
    let weekHours = 0;
    let peakHours = 0;

    for (const assignment of assignments) {
      if (
        !assignment.tasks?.scheduled_start ||
        !assignment.tasks?.scheduled_end
      )
        continue;

      const start = new Date(assignment.tasks.scheduled_start);
      const end = new Date(assignment.tasks.scheduled_end);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours

      // Today's workload
      if (
        start >= todayStart &&
        start < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      ) {
        todayHours += duration;
      }

      // This week's workload
      if (start >= weekStart) {
        weekHours += duration;
      }

      // Peak hours workload (4 PM - 8 PM)
      const hour = start.getHours();
      if (hour >= 16 && hour <= 20) {
        peakHours += duration;
      }
    }

    return {
      today: Math.min((todayHours / 8) * 100, 100), // Normalize to percentage of 8-hour day
      thisWeek: Math.min((weekHours / 40) * 100, 100), // Normalize to percentage of 40-hour week
      peakHours: Math.min((peakHours / 4) * 100, 100), // Normalize to percentage of 4 peak hours
    };
  }

  private calculateComplexityWeightedWorkload(assignments: any[]): number {
    if (assignments.length === 0) return 0;

    const complexityWeights = {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
    };

    const totalWeightedTasks = assignments.reduce((sum, assignment) => {
      const priority = assignment.tasks?.priority || 'medium';
      const weight =
        complexityWeights[priority as keyof typeof complexityWeights] || 1.0;
      return sum + weight;
    }, 0);

    // Normalize to 0-100 scale (assuming max 20 medium-complexity tasks = 100%)
    return Math.min((totalWeightedTasks / 30) * 100, 100);
  }

  private calculatePerformanceMultiplier(
    metrics: HelperPerformanceMetrics,
  ): number {
    // Base multiplier is 1.0, adjusted based on performance
    let multiplier = 1.0;

    // Adjust based on completion rate
    if (metrics.completion_rate > 0.9) multiplier += 0.2;
    else if (metrics.completion_rate < 0.7) multiplier -= 0.3;

    // Adjust based on quality ratings
    if (metrics.average_client_rating > 4.5) multiplier += 0.15;
    else if (metrics.average_client_rating < 3.5) multiplier -= 0.25;

    // Adjust based on reliability
    if (metrics.no_show_rate < 0.05) multiplier += 0.1;
    else if (metrics.no_show_rate > 0.15) multiplier -= 0.2;

    return Math.max(0.5, Math.min(1.5, multiplier)); // Clamp between 0.5 and 1.5
  }

  private calculateFatigueFactor(
    assignments: any[],
    metrics: HelperPerformanceMetrics,
  ): number {
    // Calculate fatigue based on recent workload intensity
    let fatigueFactor = 0;

    // Recent overwork increases fatigue
    if (metrics.recent_performance_change < -10) fatigueFactor += 0.2;

    // High current workload increases fatigue
    const recentAssignments = assignments.filter((a) => {
      const assigned = new Date(a.assigned_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return assigned >= weekAgo;
    });

    if (recentAssignments.length > 10) fatigueFactor += 0.15;

    // Poor performance trend indicates fatigue
    if (metrics.performance_trajectory === 'declining') fatigueFactor += 0.1;

    return Math.min(fatigueFactor, 0.5); // Cap at 50% capacity reduction
  }

  private calculateSkillEfficiencyBonus(
    helper: any,
    assignments: any[],
  ): number {
    // Calculate efficiency bonus based on skill matching
    let bonus = 0;

    // If helper has relevant skills for most assignments, give efficiency bonus
    const skillMatchCount = assignments.filter((assignment) => {
      const requiredSkills = assignment.tasks?.required_skills || [];
      const helperSkills = helper.skills || [];

      return requiredSkills.some((skill: string) =>
        helperSkills.some((helperSkill: any) =>
          helperSkill.name.toLowerCase().includes(skill.toLowerCase()),
        ),
      );
    }).length;

    const skillMatchRate =
      assignments.length > 0 ? skillMatchCount / assignments.length : 0;

    if (skillMatchRate > 0.8)
      bonus = 0.2; // 20% efficiency bonus
    else if (skillMatchRate > 0.6) bonus = 0.1; // 10% efficiency bonus

    return bonus;
  }

  private async generateAvailabilityWindows(
    helper: any,
    assignments: any[],
  ): Promise<{
    available: TimeSlot[];
    unavailable: UnavailablePeriod[];
  }> {
    // Simplified availability window generation
    const available: TimeSlot[] = [];
    const unavailable: UnavailablePeriod[] = [];

    // Generate standard working hours as available time slots
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      // Next 7 days
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      const startHour = 9; // 9 AM
      const endHour = 17; // 5 PM

      const start = new Date(date);
      start.setHours(startHour, 0, 0, 0);

      const end = new Date(date);
      end.setHours(endHour, 0, 0, 0);

      available.push({
        start,
        end,
        available_capacity: 100,
        buffer_time_included: true,
      });
    }

    // Mark existing assignments as unavailable
    for (const assignment of assignments) {
      if (
        assignment.tasks?.scheduled_start &&
        assignment.tasks?.scheduled_end
      ) {
        unavailable.push({
          start: new Date(assignment.tasks.scheduled_start),
          end: new Date(assignment.tasks.scheduled_end),
          reason: 'other_wedding',
          is_flexible: false,
        });
      }
    }

    return { available, unavailable };
  }

  private analyzeWorkloadTrend(
    assignments: any[],
  ): 'increasing' | 'stable' | 'decreasing' {
    if (assignments.length < 4) return 'stable';

    // Simple trend analysis based on assignment frequency over time
    const sortedAssignments = assignments.sort(
      (a, b) =>
        new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime(),
    );

    const firstHalf = sortedAssignments.slice(
      0,
      Math.floor(assignments.length / 2),
    );
    const secondHalf = sortedAssignments.slice(
      Math.floor(assignments.length / 2),
    );

    const firstHalfRate = firstHalf.length;
    const secondHalfRate = secondHalf.length;

    if (secondHalfRate > firstHalfRate * 1.2) return 'increasing';
    if (secondHalfRate < firstHalfRate * 0.8) return 'decreasing';
    return 'stable';
  }

  private projectWorkloadNextWeek(
    assignments: any[],
    currentWorkload: number,
  ): number {
    // Simple projection based on current trend
    const trend = this.analyzeWorkloadTrend(assignments);

    switch (trend) {
      case 'increasing':
        return Math.min(currentWorkload * 1.2, 100);
      case 'decreasing':
        return Math.max(currentWorkload * 0.8, 0);
      default:
        return currentWorkload;
    }
  }

  private calculateAverageTaskDuration(assignments: any[]): number {
    if (assignments.length === 0) return 120; // Default 2 hours

    const durations = assignments
      .filter((a) => a.tasks?.scheduled_start && a.tasks?.scheduled_end)
      .map((a) => {
        const start = new Date(a.tasks.scheduled_start);
        const end = new Date(a.tasks.scheduled_end);
        return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      });

    return durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 120;
  }

  private async getHelperWorkloadProfiles(
    helperIds: string[],
  ): Promise<HelperWorkloadProfile[]> {
    const profiles: HelperWorkloadProfile[] = [];

    for (const helperId of helperIds) {
      // This would typically get the helper's wedding ID from the context
      // For now, we'll use a placeholder implementation
      const profile = await this.calculateIndividualWorkloadProfile(
        { id: helperId, name: `Helper ${helperId}` },
        'wedding-id-placeholder',
      );
      profiles.push(profile);
    }

    return profiles;
  }

  private async calculateAssignmentScore(
    task: Task,
    profile: HelperWorkloadProfile,
    priority: 'efficiency' | 'balance' | 'performance',
  ): Promise<number> {
    let score = 50; // Base score

    // Workload balance factor
    const workloadFactor =
      profile.current_workload < profile.capacity
        ? 1 - profile.current_workload / 100
        : 0.5; // Penalize overloaded helpers

    // Performance factor
    const performanceFactor = profile.performance_multiplier;

    // Skill efficiency factor
    const skillFactor = 1 + profile.skill_efficiency_bonus;

    // Apply weighting based on priority
    switch (priority) {
      case 'efficiency':
        score =
          score *
          (performanceFactor * 0.5 + skillFactor * 0.3 + workloadFactor * 0.2);
        break;
      case 'balance':
        score =
          score *
          (workloadFactor * 0.5 + performanceFactor * 0.3 + skillFactor * 0.2);
        break;
      case 'performance':
        score =
          score *
          (performanceFactor * 0.6 + skillFactor * 0.3 + workloadFactor * 0.1);
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateWorkloadImpact(
    task: Task,
    profile: HelperWorkloadProfile,
  ): any {
    const taskComplexity =
      task.priority === 'high' ? 2.0 : task.priority === 'medium' ? 1.5 : 1.0;
    const estimatedDuration = 2; // hours, placeholder

    const workloadIncrease = ((estimatedDuration * taskComplexity) / 40) * 100; // Percentage of 40-hour week

    return {
      current_workload: profile.current_workload,
      projected_workload: Math.min(
        100,
        profile.current_workload + workloadIncrease,
      ),
      workload_increase: workloadIncrease,
      capacity_utilization:
        (profile.current_workload + workloadIncrease) / profile.capacity,
      risk_level:
        profile.current_workload + workloadIncrease > 85
          ? 'high'
          : profile.current_workload + workloadIncrease > 70
            ? 'medium'
            : 'low',
    };
  }

  // Additional helper methods would be implemented here...
  private async generateEmergencyRebalancing(
    overloadedHelper: HelperWorkloadProfile,
    allProfiles: HelperWorkloadProfile[],
  ): Promise<any> {
    return {
      type: 'emergency_redistribution',
      helper_id: overloadedHelper.helper_id,
      urgency: 'immediate',
      actions: [
        'Redistribute highest priority tasks',
        'Activate backup helpers',
      ],
    };
  }

  private async generateProactiveSuggestions(
    profiles: HelperWorkloadProfile[],
    triggerEvent: string,
    weddingId: string,
  ): Promise<any[]> {
    return []; // Placeholder
  }

  private analyzeRebalancingImpact(
    profiles: HelperWorkloadProfile[],
    urgent: any[],
    suggested: any[],
  ): any {
    return {
      estimated_balance_improvement: 25,
      risk_reduction: 40,
      efficiency_gain: 15,
    };
  }

  private async findBestRedistributionTarget(
    task: any,
    source: HelperWorkloadProfile,
    targets: HelperWorkloadProfile[],
    constraints: BalancingConstraints,
  ): Promise<any> {
    return null; // Placeholder
  }

  private calculateTaskWorkloadImpact(task: any): number {
    return 5; // Placeholder - 5 percentage points
  }
}

// Export singleton instance
export const smartWorkloadBalancer = new SmartWorkloadBalancerService();
