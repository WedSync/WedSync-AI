import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TaskStatus, TaskPriority, TaskCategory } from '@/types/workflow';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ProgressMetrics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  blocked_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  on_time_completion_rate: number;
  average_completion_time: number;
  estimated_completion_date: Date | null;
  velocity: number; // tasks completed per week
}

interface TeamPerformanceMetrics {
  team_member_id: string;
  name: string;
  role: string;
  total_assigned: number;
  completed: number;
  in_progress: number;
  overdue: number;
  completion_rate: number;
  average_completion_time: number;
  efficiency_score: number;
  workload_utilization: number;
  specialties: TaskCategory[];
}

interface TaskTrendData {
  date: string;
  completed: number;
  created: number;
  in_progress: number;
  overdue: number;
  cumulative_completed: number;
  velocity: number;
}

interface CategoryAnalytics {
  category: TaskCategory;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  average_duration: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  efficiency_ratio: number;
}

interface DeadlineAnalytics {
  upcoming_deadlines: {
    task_id: string;
    title: string;
    deadline: Date;
    days_remaining: number;
    priority: TaskPriority;
    assigned_to: string | null;
  }[];
  overdue_tasks: {
    task_id: string;
    title: string;
    deadline: Date;
    days_overdue: number;
    priority: TaskPriority;
    assigned_to: string | null;
  }[];
  deadline_distribution: {
    this_week: number;
    next_week: number;
    this_month: number;
    later: number;
  };
}

interface PredictiveAnalytics {
  estimated_completion_date: Date | null;
  completion_probability: number;
  risk_factors: RiskFactor[];
  bottlenecks: Bottleneck[];
  recommendations: string[];
}

interface RiskFactor {
  type: 'deadline' | 'resource' | 'dependency' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_tasks: string[];
  mitigation_suggestions: string[];
}

interface Bottleneck {
  type: 'team_member' | 'category' | 'dependency' | 'resource';
  identifier: string;
  severity: number;
  description: string;
  affected_tasks: string[];
  suggested_actions: string[];
}

interface WeddingProgressAnalytics {
  wedding_id: string;
  wedding_name: string;
  wedding_date: Date;
  days_until_wedding: number;
  progress_metrics: ProgressMetrics;
  category_breakdown: CategoryAnalytics[];
  deadline_analytics: DeadlineAnalytics;
  critical_path_health: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  completion_forecast: Date | null;
}

export class TaskAnalyticsService {
  // Get comprehensive progress metrics for a wedding
  async getWeddingProgressMetrics(
    weddingId: string,
  ): Promise<WeddingProgressAnalytics> {
    try {
      // Get wedding details
      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .select('id, client_name, wedding_date')
        .eq('id', weddingId)
        .single();

      if (weddingError || !wedding) {
        throw new Error('Wedding not found');
      }

      // Get all tasks for the wedding
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(
          `
          id, title, status, priority, category, deadline, estimated_duration,
          start_date, completion_date, assigned_to, created_at
        `,
        )
        .eq('wedding_id', weddingId);

      if (tasksError) throw tasksError;

      const tasksData = tasks || [];
      const weddingDate = new Date(wedding.wedding_date);
      const now = new Date();
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calculate progress metrics
      const progressMetrics = this.calculateProgressMetrics(tasksData);

      // Calculate category breakdown
      const categoryBreakdown = this.calculateCategoryAnalytics(tasksData);

      // Calculate deadline analytics
      const deadlineAnalytics = this.calculateDeadlineAnalytics(tasksData);

      // Calculate critical path health (simplified)
      const criticalPathHealth = this.calculateCriticalPathHealth(
        tasksData,
        weddingDate,
      );

      // Determine risk level
      const riskLevel = this.assessRiskLevel(
        progressMetrics,
        deadlineAnalytics,
        daysUntilWedding,
      );

      // Forecast completion
      const completionForecast = this.forecastCompletion(
        tasksData,
        progressMetrics,
      );

      return {
        wedding_id: weddingId,
        wedding_name: wedding.client_name || 'Untitled Wedding',
        wedding_date: weddingDate,
        days_until_wedding: daysUntilWedding,
        progress_metrics: progressMetrics,
        category_breakdown: categoryBreakdown,
        deadline_analytics: deadlineAnalytics,
        critical_path_health: criticalPathHealth,
        risk_level: riskLevel,
        completion_forecast: completionForecast,
      };
    } catch (error) {
      console.error('Failed to get wedding progress metrics:', error);
      throw error;
    }
  }

  // Calculate overall progress metrics
  private calculateProgressMetrics(tasks: any[]): ProgressMetrics {
    const now = new Date();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const todoTasks = tasks.filter((t) => t.status === TaskStatus.TODO).length;
    const blockedTasks = tasks.filter(
      (t) => t.status === TaskStatus.BLOCKED,
    ).length;

    const overdueTasks = tasks.filter(
      (t) => t.status !== TaskStatus.COMPLETED && new Date(t.deadline) < now,
    ).length;

    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate on-time completion rate
    const completedOnTime = tasks.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED &&
        t.completion_date &&
        new Date(t.completion_date) <= new Date(t.deadline),
    ).length;

    const onTimeCompletionRate =
      completedTasks > 0 ? (completedOnTime / completedTasks) * 100 : 0;

    // Calculate average completion time
    const completedWithDates = tasks.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED && t.start_date && t.completion_date,
    );

    const avgCompletionTime =
      completedWithDates.length > 0
        ? completedWithDates.reduce((sum, task) => {
            const start = new Date(task.start_date);
            const end = new Date(task.completion_date);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
          }, 0) / completedWithDates.length
        : 0;

    // Calculate velocity (tasks completed per week)
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const recentlyCompleted = tasks.filter(
      (t) =>
        t.status === TaskStatus.COMPLETED &&
        t.completion_date &&
        new Date(t.completion_date) >= threeWeeksAgo,
    ).length;

    const velocity = recentlyCompleted / 3; // per week

    // Estimate completion date
    const remainingTasks = totalTasks - completedTasks;
    const estimatedCompletionDate =
      velocity > 0
        ? new Date(
            now.getTime() +
              (remainingTasks / velocity) * 7 * 24 * 60 * 60 * 1000,
          )
        : null;

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      in_progress_tasks: inProgressTasks,
      todo_tasks: todoTasks,
      blocked_tasks: blockedTasks,
      overdue_tasks: overdueTasks,
      completion_rate: completionRate,
      on_time_completion_rate: onTimeCompletionRate,
      average_completion_time: avgCompletionTime,
      estimated_completion_date: estimatedCompletionDate,
      velocity: velocity,
    };
  }

  // Calculate analytics by category
  private calculateCategoryAnalytics(tasks: any[]): CategoryAnalytics[] {
    const categories = [...new Set(tasks.map((t) => t.category))];

    return categories.map((category) => {
      const categoryTasks = tasks.filter((t) => t.category === category);
      const completedCategoryTasks = categoryTasks.filter(
        (t) => t.status === TaskStatus.COMPLETED,
      );

      const totalTasks = categoryTasks.length;
      const completedTasks = completedCategoryTasks.length;
      const completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const totalEstimatedHours = categoryTasks.reduce(
        (sum, t) => sum + (t.estimated_duration || 0),
        0,
      );

      // Calculate average duration for completed tasks
      const avgDuration =
        completedCategoryTasks.length > 0
          ? completedCategoryTasks.reduce((sum, t) => {
              if (t.start_date && t.completion_date) {
                const duration =
                  (new Date(t.completion_date).getTime() -
                    new Date(t.start_date).getTime()) /
                  (1000 * 60 * 60);
                return sum + duration;
              }
              return sum + (t.estimated_duration || 0);
            }, 0) / completedCategoryTasks.length
          : 0;

      const totalActualHours = completedCategoryTasks.reduce((sum, t) => {
        if (t.start_date && t.completion_date) {
          return (
            sum +
            (new Date(t.completion_date).getTime() -
              new Date(t.start_date).getTime()) /
              (1000 * 60 * 60)
          );
        }
        return sum + (t.estimated_duration || 0);
      }, 0);

      const efficiencyRatio =
        totalEstimatedHours > 0 ? totalActualHours / totalEstimatedHours : 1;

      return {
        category: category as TaskCategory,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate: completionRate,
        average_duration: avgDuration,
        total_estimated_hours: totalEstimatedHours,
        total_actual_hours: totalActualHours,
        efficiency_ratio: efficiencyRatio,
      };
    });
  }

  // Calculate deadline analytics
  private calculateDeadlineAnalytics(tasks: any[]): DeadlineAnalytics {
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activeTasks = tasks.filter(
      (t) =>
        t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED,
    );

    const upcomingDeadlines = activeTasks
      .filter((t) => new Date(t.deadline) >= now)
      .map((t) => ({
        task_id: t.id,
        title: t.title,
        deadline: new Date(t.deadline),
        days_remaining: Math.ceil(
          (new Date(t.deadline).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        priority: t.priority as TaskPriority,
        assigned_to: t.assigned_to,
      }))
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    const overdueTasks = activeTasks
      .filter((t) => new Date(t.deadline) < now)
      .map((t) => ({
        task_id: t.id,
        title: t.title,
        deadline: new Date(t.deadline),
        days_overdue: Math.ceil(
          (now.getTime() - new Date(t.deadline).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        priority: t.priority as TaskPriority,
        assigned_to: t.assigned_to,
      }))
      .sort((a, b) => b.days_overdue - a.days_overdue);

    const deadlineDistribution = {
      this_week: activeTasks.filter(
        (t) => new Date(t.deadline) <= oneWeek && new Date(t.deadline) >= now,
      ).length,
      next_week: activeTasks.filter(
        (t) =>
          new Date(t.deadline) <= twoWeeks && new Date(t.deadline) > oneWeek,
      ).length,
      this_month: activeTasks.filter(
        (t) =>
          new Date(t.deadline) <= oneMonth && new Date(t.deadline) > twoWeeks,
      ).length,
      later: activeTasks.filter((t) => new Date(t.deadline) > oneMonth).length,
    };

    return {
      upcoming_deadlines: upcomingDeadlines,
      overdue_tasks: overdueTasks,
      deadline_distribution: deadlineDistribution,
    };
  }

  // Calculate critical path health (simplified)
  private calculateCriticalPathHealth(tasks: any[], weddingDate: Date): number {
    const now = new Date();
    const totalDays = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (totalDays <= 0) return 0; // Wedding has passed

    const criticalTasks = tasks.filter(
      (t) =>
        t.priority === TaskPriority.CRITICAL &&
        t.status !== TaskStatus.COMPLETED,
    );

    const completedCritical = tasks.filter(
      (t) =>
        t.priority === TaskPriority.CRITICAL &&
        t.status === TaskStatus.COMPLETED,
    ).length;

    const totalCritical = tasks.filter(
      (t) => t.priority === TaskPriority.CRITICAL,
    ).length;

    const criticalCompletionRate =
      totalCritical > 0 ? (completedCritical / totalCritical) * 100 : 100;

    // Factor in overdue critical tasks
    const overdueCritical = criticalTasks.filter(
      (t) => new Date(t.deadline) < now,
    ).length;
    const overduePenalty = overdueCritical * 10; // 10% penalty per overdue critical task

    const health = Math.max(
      0,
      Math.min(100, criticalCompletionRate - overduePenalty),
    );

    return health;
  }

  // Assess overall risk level
  private assessRiskLevel(
    progress: ProgressMetrics,
    deadlines: DeadlineAnalytics,
    daysUntilWedding: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Factor 1: Completion rate
    if (progress.completion_rate < 30) riskScore += 3;
    else if (progress.completion_rate < 50) riskScore += 2;
    else if (progress.completion_rate < 70) riskScore += 1;

    // Factor 2: Overdue tasks
    const overduePercentage =
      (progress.overdue_tasks / progress.total_tasks) * 100;
    if (overduePercentage > 20) riskScore += 3;
    else if (overduePercentage > 10) riskScore += 2;
    else if (overduePercentage > 5) riskScore += 1;

    // Factor 3: Time remaining vs tasks remaining
    if (daysUntilWedding < 7 && progress.completion_rate < 90) riskScore += 3;
    else if (daysUntilWedding < 14 && progress.completion_rate < 80)
      riskScore += 2;
    else if (daysUntilWedding < 30 && progress.completion_rate < 70)
      riskScore += 1;

    // Factor 4: Velocity vs remaining work
    const remainingTasks = progress.total_tasks - progress.completed_tasks;
    const weeksRemaining = daysUntilWedding / 7;
    if (progress.velocity > 0 && weeksRemaining > 0) {
      const requiredVelocity = remainingTasks / weeksRemaining;
      if (requiredVelocity > progress.velocity * 2) riskScore += 2;
      else if (requiredVelocity > progress.velocity * 1.5) riskScore += 1;
    }

    // Determine risk level
    if (riskScore >= 7) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  // Forecast completion date
  private forecastCompletion(
    tasks: any[],
    progress: ProgressMetrics,
  ): Date | null {
    if (progress.velocity <= 0) return null;

    const remainingTasks = progress.total_tasks - progress.completed_tasks;
    const weeksToComplete = remainingTasks / progress.velocity;
    const now = new Date();

    return new Date(now.getTime() + weeksToComplete * 7 * 24 * 60 * 60 * 1000);
  }

  // Get team performance metrics
  async getTeamPerformanceMetrics(
    weddingId?: string,
  ): Promise<TeamPerformanceMetrics[]> {
    try {
      let tasksQuery = supabase
        .from('tasks')
        .select(
          `
          id, status, assigned_to, estimated_duration, start_date, 
          completion_date, deadline, category,
          team_member:team_members(id, name, role, specialties)
        `,
        )
        .not('assigned_to', 'is', null);

      if (weddingId) {
        tasksQuery = tasksQuery.eq('wedding_id', weddingId);
      }

      const { data: tasksWithMembers, error } = await tasksQuery;

      if (error) throw error;

      // Group tasks by team member
      const memberTasks: Record<string, any[]> = {};
      const memberInfo: Record<string, any> = {};

      (tasksWithMembers || []).forEach((task) => {
        const memberId = task.assigned_to;
        if (!memberTasks[memberId]) {
          memberTasks[memberId] = [];
          memberInfo[memberId] = task.team_member;
        }
        memberTasks[memberId].push(task);
      });

      // Calculate metrics for each team member
      const teamMetrics: TeamPerformanceMetrics[] = Object.entries(
        memberTasks,
      ).map(([memberId, tasks]) => {
        const member = memberInfo[memberId];
        const now = new Date();

        const totalAssigned = tasks.length;
        const completed = tasks.filter(
          (t) => t.status === TaskStatus.COMPLETED,
        ).length;
        const inProgress = tasks.filter(
          (t) => t.status === TaskStatus.IN_PROGRESS,
        ).length;
        const overdue = tasks.filter(
          (t) =>
            t.status !== TaskStatus.COMPLETED && new Date(t.deadline) < now,
        ).length;

        const completionRate =
          totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0;

        // Calculate average completion time
        const completedTasks = tasks.filter(
          (t) =>
            t.status === TaskStatus.COMPLETED &&
            t.start_date &&
            t.completion_date,
        );

        const avgCompletionTime =
          completedTasks.length > 0
            ? completedTasks.reduce((sum, task) => {
                const duration =
                  (new Date(task.completion_date).getTime() -
                    new Date(task.start_date).getTime()) /
                  (1000 * 60 * 60);
                return sum + duration;
              }, 0) / completedTasks.length
            : 0;

        // Calculate efficiency score
        const onTimeCompletions = completedTasks.filter(
          (t) => new Date(t.completion_date) <= new Date(t.deadline),
        ).length;

        const efficiencyScore =
          completed > 0
            ? (onTimeCompletions / completed) * 100 * (completionRate / 100)
            : 0;

        // Calculate workload utilization
        const totalEstimatedHours = tasks.reduce(
          (sum, t) => sum + (t.estimated_duration || 0),
          0,
        );
        const assumedCapacity = 40; // hours per week
        const workloadUtilization = totalEstimatedHours / assumedCapacity;

        return {
          team_member_id: memberId,
          name: member?.name || 'Unknown',
          role: member?.role || 'Unknown',
          total_assigned: totalAssigned,
          completed: completed,
          in_progress: inProgress,
          overdue: overdue,
          completion_rate: completionRate,
          average_completion_time: avgCompletionTime,
          efficiency_score: efficiencyScore,
          workload_utilization: Math.min(100, workloadUtilization * 100),
          specialties: member?.specialties || [],
        };
      });

      return teamMetrics.sort(
        (a, b) => b.efficiency_score - a.efficiency_score,
      );
    } catch (error) {
      console.error('Failed to get team performance metrics:', error);
      throw error;
    }
  }

  // Get task trend data for charts
  async getTaskTrendData(
    weddingId: string,
    days: number = 30,
  ): Promise<TaskTrendData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000,
      );

      // Get task creation and completion data
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, status, created_at, completion_date, deadline')
        .eq('wedding_id', weddingId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const trendData: TaskTrendData[] = [];
      let cumulativeCompleted = 0;

      for (let i = 0; i < days; i++) {
        const currentDate = new Date(
          startDate.getTime() + i * 24 * 60 * 60 * 1000,
        );
        const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

        const dateStr = currentDate.toISOString().split('T')[0];

        const created =
          tasks?.filter((t) => {
            const createdDate = new Date(t.created_at);
            return createdDate >= currentDate && createdDate < nextDate;
          }).length || 0;

        const completed =
          tasks?.filter((t) => {
            const completedDate = t.completion_date
              ? new Date(t.completion_date)
              : null;
            return (
              completedDate &&
              completedDate >= currentDate &&
              completedDate < nextDate
            );
          }).length || 0;

        const inProgress =
          tasks?.filter((t) => {
            return (
              t.status === TaskStatus.IN_PROGRESS &&
              new Date(t.created_at) <= currentDate
            );
          }).length || 0;

        const overdue =
          tasks?.filter((t) => {
            return (
              t.status !== TaskStatus.COMPLETED &&
              new Date(t.deadline) < currentDate &&
              new Date(t.created_at) <= currentDate
            );
          }).length || 0;

        cumulativeCompleted += completed;

        // Calculate velocity (7-day rolling average)
        const weekStart = Math.max(0, i - 6);
        const weekData = trendData.slice(weekStart);
        const weekCompleted =
          weekData.reduce((sum, day) => sum + day.completed, 0) + completed;
        const velocity =
          weekData.length > 0
            ? weekCompleted / Math.min(7, weekData.length + 1)
            : completed;

        trendData.push({
          date: dateStr,
          completed,
          created,
          in_progress: inProgress,
          overdue,
          cumulative_completed: cumulativeCompleted,
          velocity,
        });
      }

      return trendData;
    } catch (error) {
      console.error('Failed to get task trend data:', error);
      throw error;
    }
  }

  // Get predictive analytics
  async getPredictiveAnalytics(
    weddingId: string,
  ): Promise<PredictiveAnalytics> {
    try {
      const progressMetrics = await this.getWeddingProgressMetrics(weddingId);

      // Simplified predictive analytics
      const completionProbability =
        this.calculateCompletionProbability(progressMetrics);
      const riskFactors = this.identifyRiskFactors(progressMetrics);
      const bottlenecks = await this.identifyBottlenecks(weddingId);
      const recommendations = this.generateRecommendations(
        progressMetrics,
        riskFactors,
      );

      return {
        estimated_completion_date:
          progressMetrics.progress_metrics.estimated_completion_date,
        completion_probability: completionProbability,
        risk_factors: riskFactors,
        bottlenecks: bottlenecks,
        recommendations: recommendations,
      };
    } catch (error) {
      console.error('Failed to get predictive analytics:', error);
      throw error;
    }
  }

  private calculateCompletionProbability(
    analytics: WeddingProgressAnalytics,
  ): number {
    const { progress_metrics, days_until_wedding, risk_level } = analytics;

    let baseProbability = progress_metrics.completion_rate;

    // Adjust for time remaining
    if (days_until_wedding < 7 && progress_metrics.completion_rate < 90) {
      baseProbability *= 0.7;
    } else if (
      days_until_wedding < 14 &&
      progress_metrics.completion_rate < 80
    ) {
      baseProbability *= 0.8;
    }

    // Adjust for velocity
    if (progress_metrics.velocity > 0) {
      const remainingTasks =
        progress_metrics.total_tasks - progress_metrics.completed_tasks;
      const weeksRemaining = days_until_wedding / 7;
      const requiredVelocity = remainingTasks / weeksRemaining;

      if (progress_metrics.velocity >= requiredVelocity) {
        baseProbability = Math.min(100, baseProbability * 1.1);
      } else {
        baseProbability *= progress_metrics.velocity / requiredVelocity;
      }
    }

    // Adjust for risk level
    const riskAdjustments = {
      low: 1.0,
      medium: 0.9,
      high: 0.7,
      critical: 0.5,
    };

    baseProbability *= riskAdjustments[risk_level];

    return Math.max(0, Math.min(100, baseProbability));
  }

  private identifyRiskFactors(
    analytics: WeddingProgressAnalytics,
  ): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];
    const { progress_metrics, deadline_analytics, days_until_wedding } =
      analytics;

    // Deadline risk
    if (deadline_analytics.overdue_tasks.length > 0) {
      riskFactors.push({
        type: 'deadline',
        severity:
          deadline_analytics.overdue_tasks.length > 5 ? 'high' : 'medium',
        description: `${deadline_analytics.overdue_tasks.length} tasks are overdue`,
        affected_tasks: deadline_analytics.overdue_tasks.map((t) => t.task_id),
        mitigation_suggestions: [
          'Prioritize overdue tasks immediately',
          'Consider adding resources to overdue tasks',
          'Review and adjust remaining deadlines if necessary',
        ],
      });
    }

    // Resource risk
    if (progress_metrics.velocity < 1 && days_until_wedding < 30) {
      riskFactors.push({
        type: 'resource',
        severity: 'high',
        description: 'Low task completion velocity with approaching deadline',
        affected_tasks: [],
        mitigation_suggestions: [
          'Increase team capacity',
          'Parallel task execution where possible',
          'Consider hiring additional temporary help',
        ],
      });
    }

    return riskFactors;
  }

  private async identifyBottlenecks(weddingId: string): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    try {
      // Get team performance to identify resource bottlenecks
      const teamMetrics = await this.getTeamPerformanceMetrics(weddingId);

      teamMetrics.forEach((member) => {
        if (member.workload_utilization > 120 || member.overdue > 3) {
          bottlenecks.push({
            type: 'team_member',
            identifier: member.team_member_id,
            severity: member.workload_utilization > 150 ? 3 : 2,
            description: `${member.name} is overloaded with ${member.overdue} overdue tasks`,
            affected_tasks: [], // Would need additional query to get task IDs
            suggested_actions: [
              'Redistribute some tasks to other team members',
              "Prioritize this team member's most critical tasks",
              'Consider extending deadlines for non-critical tasks',
            ],
          });
        }
      });
    } catch (error) {
      console.error('Failed to identify bottlenecks:', error);
    }

    return bottlenecks;
  }

  private generateRecommendations(
    analytics: WeddingProgressAnalytics,
    riskFactors: RiskFactor[],
  ): string[] {
    const recommendations: string[] = [];
    const { progress_metrics, days_until_wedding, risk_level } = analytics;

    // General progress recommendations
    if (progress_metrics.completion_rate < 50 && days_until_wedding < 30) {
      recommendations.push(
        'Consider prioritizing high-impact tasks and delegate where possible',
      );
    }

    if (progress_metrics.overdue_tasks > 0) {
      recommendations.push(
        'Address overdue tasks immediately to prevent cascading delays',
      );
    }

    if (progress_metrics.velocity < 2 && days_until_wedding < 14) {
      recommendations.push(
        'Increase task completion velocity by adding resources or working parallel streams',
      );
    }

    // Risk-specific recommendations
    if (risk_level === 'high' || risk_level === 'critical') {
      recommendations.push(
        'Implement daily standup meetings to track progress and remove blockers',
      );
      recommendations.push(
        'Consider hiring additional temporary help for the final weeks',
      );
    }

    // Category-specific recommendations
    if (analytics.category_breakdown.some((cat) => cat.completion_rate < 30)) {
      recommendations.push(
        'Focus on underperforming categories that could impact wedding day',
      );
    }

    return recommendations;
  }
}
