// Task Reporting Service
// WS-058: Comprehensive reporting for task delegation system

import { createClient } from '@supabase/supabase-js';

interface TaskCompletionMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  onTimeCompletions: number;
  onTimeRate: number;
  averageCompletionTime: number;
  byPriority: {
    critical: { total: number; completed: number; rate: number };
    high: { total: number; completed: number; rate: number };
    medium: { total: number; completed: number; rate: number };
    low: { total: number; completed: number; rate: number };
  };
  byCategory: Record<
    string,
    { total: number; completed: number; rate: number }
  >;
}

interface HelperWorkloadBalance {
  helperId: string;
  helperName: string;
  currentTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalHoursAssigned: number;
  availableHours: number;
  utilizationRate: number;
  efficiencyScore: number;
  taskDistribution: {
    category: string;
    count: number;
    hours: number;
  }[];
  upcomingDeadlines: {
    taskId: string;
    title: string;
    deadline: Date;
    hoursRemaining: number;
  }[];
}

interface CriticalPathAnalysis {
  weddingId: string;
  criticalTasks: {
    id: string;
    title: string;
    deadline: Date;
    status: string;
    dependencies: string[];
    successors: string[];
    slackTime: number;
    isCritical: boolean;
    estimatedDuration: number;
    actualDuration?: number;
    riskLevel: 'low' | 'medium' | 'high';
  }[];
  totalCriticalTasks: number;
  completedCriticalTasks: number;
  atRiskTasks: number;
  estimatedCompletionDate: Date;
  projectHealth: 'on-track' | 'at-risk' | 'delayed';
  recommendations: string[];
}

interface FinalTaskReport {
  weddingId: string;
  reportDate: Date;
  summary: {
    totalTasks: number;
    completedTasks: number;
    cancelledTasks: number;
    overdueTasks: number;
    totalBudgetImpact: number;
    totalHoursWorked: number;
  };
  teamPerformance: {
    memberId: string;
    memberName: string;
    tasksCompleted: number;
    onTimeRate: number;
    efficiencyScore: number;
    hoursWorked: number;
  }[];
  vendorPerformance: {
    vendorId: string;
    vendorName: string;
    tasksCompleted: number;
    deliveryRate: number;
    averageResponseTime: number;
    satisfactionScore?: number;
  }[];
  timeline: {
    phase: string;
    startDate: Date;
    endDate: Date;
    tasksCompleted: number;
    delayDays: number;
  }[];
  budgetAnalysis: {
    plannedBudget: number;
    actualSpent: number;
    variance: number;
    byCategory: Record<
      string,
      { planned: number; actual: number; variance: number }
    >;
  };
  insights: {
    topPerformers: string[];
    bottlenecks: string[];
    costSavings: number;
    lessonsLearned: string[];
  };
}

export class TaskReportingService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Calculate task completion rates
   */
  async getTaskCompletionRates(
    weddingId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<TaskCompletionMetrics> {
    try {
      let query = this.supabase
        .from('workflow_tasks')
        .select('*')
        .eq('wedding_id', weddingId);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: tasks, error } = await query;
      if (error) throw error;

      const metrics: TaskCompletionMetrics = {
        totalTasks: tasks.length,
        completedTasks: 0,
        completionRate: 0,
        onTimeCompletions: 0,
        onTimeRate: 0,
        averageCompletionTime: 0,
        byPriority: {
          critical: { total: 0, completed: 0, rate: 0 },
          high: { total: 0, completed: 0, rate: 0 },
          medium: { total: 0, completed: 0, rate: 0 },
          low: { total: 0, completed: 0, rate: 0 },
        },
        byCategory: {},
      };

      let totalCompletionTime = 0;
      let completionTimeCount = 0;

      tasks.forEach((task: any) => {
        // Overall metrics
        if (task.status === 'completed') {
          metrics.completedTasks++;

          if (
            task.completion_date &&
            new Date(task.completion_date) <= new Date(task.deadline)
          ) {
            metrics.onTimeCompletions++;
          }

          if (task.start_date && task.completion_date) {
            const completionTime =
              (new Date(task.completion_date).getTime() -
                new Date(task.start_date).getTime()) /
              (1000 * 60 * 60);
            totalCompletionTime += completionTime;
            completionTimeCount++;
          }
        }

        // Priority metrics
        const priority = task.priority as keyof typeof metrics.byPriority;
        if (metrics.byPriority[priority]) {
          metrics.byPriority[priority].total++;
          if (task.status === 'completed') {
            metrics.byPriority[priority].completed++;
          }
        }

        // Category metrics
        if (!metrics.byCategory[task.category]) {
          metrics.byCategory[task.category] = {
            total: 0,
            completed: 0,
            rate: 0,
          };
        }
        metrics.byCategory[task.category].total++;
        if (task.status === 'completed') {
          metrics.byCategory[task.category].completed++;
        }
      });

      // Calculate rates
      metrics.completionRate =
        metrics.totalTasks > 0
          ? (metrics.completedTasks / metrics.totalTasks) * 100
          : 0;
      metrics.onTimeRate =
        metrics.completedTasks > 0
          ? (metrics.onTimeCompletions / metrics.completedTasks) * 100
          : 0;
      metrics.averageCompletionTime =
        completionTimeCount > 0 ? totalCompletionTime / completionTimeCount : 0;

      // Calculate priority rates
      Object.keys(metrics.byPriority).forEach((priority) => {
        const p = priority as keyof typeof metrics.byPriority;
        if (metrics.byPriority[p].total > 0) {
          metrics.byPriority[p].rate =
            (metrics.byPriority[p].completed / metrics.byPriority[p].total) *
            100;
        }
      });

      // Calculate category rates
      Object.keys(metrics.byCategory).forEach((category) => {
        if (metrics.byCategory[category].total > 0) {
          metrics.byCategory[category].rate =
            (metrics.byCategory[category].completed /
              metrics.byCategory[category].total) *
            100;
        }
      });

      return metrics;
    } catch (error) {
      console.error('Error calculating task completion rates:', error);
      throw error;
    }
  }

  /**
   * Get helper workload balance
   */
  async getHelperWorkloadBalance(
    helperId?: string,
  ): Promise<HelperWorkloadBalance[]> {
    try {
      let query = this.supabase.from('team_members').select(`
          *,
          tasks:workflow_tasks(*)
        `);

      if (helperId) {
        query = query.eq('id', helperId);
      }

      const { data: helpers, error } = await query;
      if (error) throw error;

      const workloadReports: HelperWorkloadBalance[] = [];

      for (const helper of helpers) {
        const now = new Date();
        const tasks = helper.tasks || [];

        // Calculate metrics
        const currentTasks = tasks.filter((t: any) =>
          ['todo', 'in_progress'].includes(t.status),
        );
        const completedTasks = tasks.filter(
          (t: any) => t.status === 'completed',
        );
        const overdueTasks = tasks.filter(
          (t: any) =>
            new Date(t.deadline) < now &&
            !['completed', 'cancelled'].includes(t.status),
        );

        // Calculate hours
        const totalHoursAssigned = currentTasks.reduce(
          (sum: number, t: any) => sum + (t.estimated_duration || 0),
          0,
        );

        // Task distribution by category
        const categoryMap = new Map();
        currentTasks.forEach((task: any) => {
          if (!categoryMap.has(task.category)) {
            categoryMap.set(task.category, { count: 0, hours: 0 });
          }
          const cat = categoryMap.get(task.category);
          cat.count++;
          cat.hours += task.estimated_duration || 0;
        });

        const taskDistribution = Array.from(categoryMap.entries()).map(
          ([category, data]) => ({
            category,
            count: data.count,
            hours: data.hours,
          }),
        );

        // Upcoming deadlines
        const upcomingDeadlines = currentTasks
          .filter((t: any) => {
            const deadline = new Date(t.deadline);
            const daysUntil =
              (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return daysUntil <= 7 && daysUntil >= 0;
          })
          .map((t: any) => ({
            taskId: t.id,
            title: t.title,
            deadline: new Date(t.deadline),
            hoursRemaining:
              (new Date(t.deadline).getTime() - now.getTime()) /
              (1000 * 60 * 60),
          }))
          .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

        // Calculate efficiency score
        const completionRate =
          tasks.length > 0 ? completedTasks.length / tasks.length : 0;
        const onTimeRate =
          completedTasks.length > 0
            ? completedTasks.filter(
                (t: any) =>
                  t.completion_date &&
                  new Date(t.completion_date) <= new Date(t.deadline),
              ).length / completedTasks.length
            : 0;
        const efficiencyScore = (completionRate * 0.5 + onTimeRate * 0.5) * 100;

        const report: HelperWorkloadBalance = {
          helperId: helper.id,
          helperName: helper.name,
          currentTasks: currentTasks.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          totalHoursAssigned,
          availableHours: helper.available_hours_per_week || 40,
          utilizationRate:
            helper.available_hours_per_week > 0
              ? (totalHoursAssigned / helper.available_hours_per_week) * 100
              : 0,
          efficiencyScore,
          taskDistribution,
          upcomingDeadlines,
        };

        workloadReports.push(report);
      }

      return workloadReports;
    } catch (error) {
      console.error('Error getting helper workload balance:', error);
      throw error;
    }
  }

  /**
   * Perform critical path analysis
   */
  async analyzeCriticalPath(weddingId: string): Promise<CriticalPathAnalysis> {
    try {
      // Get all tasks and dependencies
      const { data: tasks, error: tasksError } = await this.supabase
        .from('workflow_tasks')
        .select('*')
        .eq('wedding_id', weddingId);

      if (tasksError) throw tasksError;

      const { data: dependencies, error: depsError } = await this.supabase
        .from('task_dependencies')
        .select('*')
        .in(
          'predecessor_task_id',
          tasks.map((t: any) => t.id),
        );

      if (depsError) throw depsError;

      // Build dependency map
      const dependencyMap = new Map();
      const successorMap = new Map();

      dependencies.forEach((dep: any) => {
        if (!dependencyMap.has(dep.successor_task_id)) {
          dependencyMap.set(dep.successor_task_id, []);
        }
        dependencyMap.get(dep.successor_task_id).push(dep.predecessor_task_id);

        if (!successorMap.has(dep.predecessor_task_id)) {
          successorMap.set(dep.predecessor_task_id, []);
        }
        successorMap.get(dep.predecessor_task_id).push(dep.successor_task_id);
      });

      // Calculate critical path
      const criticalTasks = tasks.map((task: any) => {
        const dependencies = dependencyMap.get(task.id) || [];
        const successors = successorMap.get(task.id) || [];

        // Calculate slack time (simplified)
        const deadline = new Date(task.deadline);
        const now = new Date();
        const remainingTime =
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        const estimatedDuration = task.estimated_duration || 0;
        const slackTime = remainingTime - estimatedDuration;

        // Determine if critical
        const isCritical =
          task.is_critical_path ||
          slackTime <= 0 ||
          task.priority === 'critical';

        // Assess risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (slackTime < 0 && task.status !== 'completed') {
          riskLevel = 'high';
        } else if (slackTime < 24 && task.status !== 'completed') {
          riskLevel = 'medium';
        }

        return {
          id: task.id,
          title: task.title,
          deadline: new Date(task.deadline),
          status: task.status,
          dependencies,
          successors,
          slackTime,
          isCritical,
          estimatedDuration,
          actualDuration:
            task.completion_date && task.start_date
              ? (new Date(task.completion_date).getTime() -
                  new Date(task.start_date).getTime()) /
                (1000 * 60 * 60)
              : undefined,
          riskLevel,
        };
      });

      // Filter critical tasks
      const criticalPathTasks = criticalTasks.filter((t: any) => t.isCritical);
      const completedCritical = criticalPathTasks.filter(
        (t: any) => t.status === 'completed',
      ).length;
      const atRisk = criticalPathTasks.filter(
        (t: any) => t.riskLevel === 'high',
      ).length;

      // Determine project health
      let projectHealth: 'on-track' | 'at-risk' | 'delayed' = 'on-track';
      if (atRisk > criticalPathTasks.length * 0.3) {
        projectHealth = 'delayed';
      } else if (atRisk > criticalPathTasks.length * 0.1) {
        projectHealth = 'at-risk';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      if (atRisk > 0) {
        recommendations.push(
          `${atRisk} critical tasks are at high risk of delay. Immediate attention required.`,
        );
      }
      if (criticalPathTasks.length > 10) {
        recommendations.push(
          'Consider parallelizing some critical tasks to reduce project timeline.',
        );
      }
      const highUtilization = await this.getHelperWorkloadBalance();
      const overloaded = highUtilization.filter((h) => h.utilizationRate > 90);
      if (overloaded.length > 0) {
        recommendations.push(
          `${overloaded.length} team members are over 90% utilized. Consider redistributing tasks.`,
        );
      }

      // Calculate estimated completion date
      const remainingTasks = criticalPathTasks.filter(
        (t: any) => t.status !== 'completed',
      );
      const totalRemainingHours = remainingTasks.reduce(
        (sum, t) => sum + t.estimatedDuration,
        0,
      );
      const estimatedCompletionDate = new Date(
        Date.now() + totalRemainingHours * 60 * 60 * 1000,
      );

      return {
        weddingId,
        criticalTasks: criticalPathTasks,
        totalCriticalTasks: criticalPathTasks.length,
        completedCriticalTasks: completedCritical,
        atRiskTasks: atRisk,
        estimatedCompletionDate,
        projectHealth,
        recommendations,
      };
    } catch (error) {
      console.error('Error analyzing critical path:', error);
      throw error;
    }
  }

  /**
   * Generate final task report
   */
  async generateFinalReport(weddingId: string): Promise<FinalTaskReport> {
    try {
      // Get all wedding data
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .single();

      const { data: tasks } = await this.supabase
        .from('workflow_tasks')
        .select(
          `
          *,
          assigned_to:team_members(id, name),
          vendor:vendors(id, name)
        `,
        )
        .eq('wedding_id', weddingId);

      const { data: budgetData } = await this.supabase
        .from('budget_line_items')
        .select('*')
        .eq('wedding_id', weddingId);

      // Calculate summary
      const summary = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.status === 'completed')
          .length,
        cancelledTasks: tasks.filter((t: any) => t.status === 'cancelled')
          .length,
        overdueTasks: tasks.filter((t: any) => {
          const now = new Date();
          return (
            new Date(t.deadline) < now &&
            !['completed', 'cancelled'].includes(t.status)
          );
        }).length,
        totalBudgetImpact: tasks.reduce(
          (sum: number, t: any) => sum + (t.budget_impact || 0),
          0,
        ),
        totalHoursWorked: tasks
          .filter((t: any) => t.completion_date && t.start_date)
          .reduce((sum: number, t: any) => {
            const hours =
              (new Date(t.completion_date).getTime() -
                new Date(t.start_date).getTime()) /
              (1000 * 60 * 60);
            return sum + hours;
          }, 0),
      };

      // Team performance
      const teamMap = new Map();
      tasks.forEach((task: any) => {
        if (task.assigned_to) {
          const memberId = task.assigned_to.id;
          if (!teamMap.has(memberId)) {
            teamMap.set(memberId, {
              memberId,
              memberName: task.assigned_to.name,
              tasksCompleted: 0,
              onTime: 0,
              hoursWorked: 0,
            });
          }
          const member = teamMap.get(memberId);
          if (task.status === 'completed') {
            member.tasksCompleted++;
            if (
              task.completion_date &&
              new Date(task.completion_date) <= new Date(task.deadline)
            ) {
              member.onTime++;
            }
            if (task.start_date && task.completion_date) {
              member.hoursWorked +=
                (new Date(task.completion_date).getTime() -
                  new Date(task.start_date).getTime()) /
                (1000 * 60 * 60);
            }
          }
        }
      });

      const teamPerformance = Array.from(teamMap.values()).map((member) => ({
        memberId: member.memberId,
        memberName: member.memberName,
        tasksCompleted: member.tasksCompleted,
        onTimeRate:
          member.tasksCompleted > 0
            ? (member.onTime / member.tasksCompleted) * 100
            : 0,
        efficiencyScore:
          member.tasksCompleted > 0
            ? (member.onTime / member.tasksCompleted) * 100
            : 0,
        hoursWorked: member.hoursWorked,
      }));

      // Vendor performance
      const vendorMap = new Map();
      tasks.forEach((task: any) => {
        if (task.vendor) {
          const vendorId = task.vendor.id;
          if (!vendorMap.has(vendorId)) {
            vendorMap.set(vendorId, {
              vendorId,
              vendorName: task.vendor.name,
              tasksCompleted: 0,
              onTime: 0,
            });
          }
          const vendor = vendorMap.get(vendorId);
          if (task.status === 'completed') {
            vendor.tasksCompleted++;
            if (
              task.completion_date &&
              new Date(task.completion_date) <= new Date(task.deadline)
            ) {
              vendor.onTime++;
            }
          }
        }
      });

      const vendorPerformance = Array.from(vendorMap.values()).map(
        (vendor) => ({
          vendorId: vendor.vendorId,
          vendorName: vendor.vendorName,
          tasksCompleted: vendor.tasksCompleted,
          deliveryRate:
            vendor.tasksCompleted > 0
              ? (vendor.onTime / vendor.tasksCompleted) * 100
              : 0,
          averageResponseTime: 24, // Placeholder
          satisfactionScore: 4.5, // Placeholder
        }),
      );

      // Timeline analysis (simplified)
      const timeline = [
        {
          phase: 'Planning',
          startDate: new Date(wedding.created_at),
          endDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          tasksCompleted: Math.floor(summary.completedTasks * 0.3),
          delayDays: 0,
        },
        {
          phase: 'Preparation',
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          tasksCompleted: Math.floor(summary.completedTasks * 0.5),
          delayDays: 0,
        },
        {
          phase: 'Execution',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          tasksCompleted: Math.floor(summary.completedTasks * 0.2),
          delayDays: 0,
        },
      ];

      // Budget analysis
      const budgetByCategory: Record<
        string,
        { planned: number; actual: number; variance: number }
      > = {};
      tasks.forEach((task: any) => {
        if (!budgetByCategory[task.category]) {
          budgetByCategory[task.category] = {
            planned: 0,
            actual: 0,
            variance: 0,
          };
        }
        budgetByCategory[task.category].planned += task.budget_impact || 0;
        // Actual would come from actual spending records
        budgetByCategory[task.category].actual += task.budget_impact || 0;
        budgetByCategory[task.category].variance =
          budgetByCategory[task.category].actual -
          budgetByCategory[task.category].planned;
      });

      const totalPlanned = Object.values(budgetByCategory).reduce(
        (sum, cat) => sum + cat.planned,
        0,
      );
      const totalActual = Object.values(budgetByCategory).reduce(
        (sum, cat) => sum + cat.actual,
        0,
      );

      // Generate insights
      const topPerformers = teamPerformance
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, 3)
        .map((p) => p.memberName);

      const bottlenecks = tasks
        .filter((t: any) => t.status === 'blocked')
        .map((t: any) => t.title)
        .slice(0, 3);

      const report: FinalTaskReport = {
        weddingId,
        reportDate: new Date(),
        summary,
        teamPerformance,
        vendorPerformance,
        timeline,
        budgetAnalysis: {
          plannedBudget: totalPlanned,
          actualSpent: totalActual,
          variance: totalActual - totalPlanned,
          byCategory: budgetByCategory,
        },
        insights: {
          topPerformers,
          bottlenecks,
          costSavings:
            totalPlanned - totalActual > 0 ? totalPlanned - totalActual : 0,
          lessonsLearned: [
            `Achieved ${summary.completedTasks} task completions with ${teamPerformance.length} team members`,
            `Maintained ${((summary.completedTasks / summary.totalTasks) * 100).toFixed(1)}% completion rate`,
            summary.overdueTasks > 0
              ? `${summary.overdueTasks} tasks experienced delays`
              : 'All tasks completed on schedule',
          ],
        },
      };

      // Store report in database
      await this.supabase.from('task_reports').insert({
        wedding_id: weddingId,
        report_type: 'final',
        report_data: report,
        created_at: new Date().toISOString(),
      });

      return report;
    } catch (error) {
      console.error('Error generating final report:', error);
      throw error;
    }
  }

  /**
   * Export report to different formats
   */
  async exportReport(
    report: any,
    format: 'json' | 'csv' | 'pdf',
  ): Promise<string | Buffer> {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'csv':
        // Convert report to CSV format
        const csvRows: string[] = [];
        csvRows.push('Section,Metric,Value');

        // Summary section
        Object.entries(report.summary).forEach(([key, value]) => {
          csvRows.push(`Summary,${key},${value}`);
        });

        // Team performance
        report.teamPerformance.forEach((member: any) => {
          csvRows.push(
            `Team,${member.memberName},Tasks: ${member.tasksCompleted} | Efficiency: ${member.efficiencyScore}%`,
          );
        });

        return csvRows.join('\n');

      case 'pdf':
        // PDF generation would require a library like jsPDF
        // For now, return a placeholder
        return Buffer.from('PDF report generation not implemented');

      default:
        return JSON.stringify(report);
    }
  }
}

export default TaskReportingService;
