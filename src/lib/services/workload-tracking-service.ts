import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TaskStatus, TaskPriority } from '@/types/workflow';

export interface WorkloadMetrics {
  team_member_id: string;
  team_member_name: string;
  role: string;
  specialty: string;
  total_assigned_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  estimated_hours_total: number;
  estimated_hours_remaining: number;
  capacity_utilization: number; // 0-100%
  workload_score: number; // Weighted score considering priority and deadlines
  availability_status: 'available' | 'busy' | 'overloaded' | 'unavailable';
  avg_completion_time_days: number;
  task_completion_rate: number;
}

export interface TaskAssignmentSuggestion {
  team_member_id: string;
  team_member_name: string;
  confidence_score: number; // 0-100%
  reasons: string[];
  workload_impact: 'low' | 'medium' | 'high';
  estimated_completion_date: string;
}

export interface CapacityPlan {
  wedding_id: string;
  total_team_size: number;
  total_capacity_hours: number;
  allocated_hours: number;
  remaining_capacity: number;
  capacity_utilization: number;
  bottlenecks: {
    specialty: string;
    overallocation_percentage: number;
    affected_tasks: number;
  }[];
  recommendations: string[];
}

export class WorkloadTrackingService {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
  }

  /**
   * Calculate comprehensive workload metrics for all team members
   */
  async calculateWorkloadMetrics(
    weddingId: string,
  ): Promise<WorkloadMetrics[]> {
    const { data, error } = await this.supabase.rpc(
      'calculate_workload_metrics',
      {
        wedding_id_param: weddingId,
      },
    );

    if (error) {
      throw new Error(`Failed to calculate workload metrics: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get suggested team member for task assignment
   */
  async suggestTeamMemberForTask(
    weddingId: string,
    taskCategory: string,
    priority: TaskPriority,
    estimatedHours: number,
    deadline?: string,
  ): Promise<TaskAssignmentSuggestion[]> {
    // Get team members with their current workload
    const workloadMetrics = await this.calculateWorkloadMetrics(weddingId);

    // Filter by specialty/category match
    const relevantMembers = workloadMetrics.filter(
      (member) =>
        member.specialty === taskCategory ||
        member.role === 'admin' ||
        member.role === 'coordinator',
    );

    if (relevantMembers.length === 0) {
      // Fallback to any available member
      relevantMembers.push(
        ...workloadMetrics.filter(
          (m) => m.availability_status !== 'unavailable',
        ),
      );
    }

    const suggestions: TaskAssignmentSuggestion[] = [];

    for (const member of relevantMembers) {
      const confidenceScore = this.calculateAssignmentConfidence(
        member,
        taskCategory,
        priority,
        estimatedHours,
        deadline,
      );

      const workloadImpact = this.assessWorkloadImpact(member, estimatedHours);
      const estimatedCompletion = this.estimateCompletionDate(
        member,
        estimatedHours,
        deadline,
      );

      const reasons = this.generateAssignmentReasons(
        member,
        taskCategory,
        priority,
        workloadImpact,
      );

      suggestions.push({
        team_member_id: member.team_member_id,
        team_member_name: member.team_member_name,
        confidence_score: confidenceScore,
        reasons,
        workload_impact: workloadImpact,
        estimated_completion_date: estimatedCompletion,
      });
    }

    // Sort by confidence score
    return suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
  }

  /**
   * Analyze team capacity and identify bottlenecks
   */
  async analyzeTeamCapacity(weddingId: string): Promise<CapacityPlan> {
    const { data: capacityData, error } = await this.supabase.rpc(
      'analyze_team_capacity',
      {
        wedding_id_param: weddingId,
      },
    );

    if (error) {
      throw new Error(`Failed to analyze team capacity: ${error.message}`);
    }

    // Get bottleneck analysis
    const { data: bottlenecks } = await this.supabase.rpc(
      'identify_capacity_bottlenecks',
      {
        wedding_id_param: weddingId,
      },
    );

    const recommendations = this.generateCapacityRecommendations(
      capacityData,
      bottlenecks || [],
    );

    return {
      wedding_id: weddingId,
      total_team_size: capacityData?.total_team_size || 0,
      total_capacity_hours: capacityData?.total_capacity_hours || 0,
      allocated_hours: capacityData?.allocated_hours || 0,
      remaining_capacity: capacityData?.remaining_capacity || 0,
      capacity_utilization: capacityData?.capacity_utilization || 0,
      bottlenecks: bottlenecks || [],
      recommendations,
    };
  }

  /**
   * Balance workload across team members
   */
  async balanceWorkload(weddingId: string): Promise<{
    reassignments: {
      task_id: string;
      from_member: string;
      to_member: string;
      reason: string;
    }[];
    workload_improvement: number;
  }> {
    const workloadMetrics = await this.calculateWorkloadMetrics(weddingId);
    const overloadedMembers = workloadMetrics.filter(
      (m) => m.availability_status === 'overloaded',
    );
    const availableMembers = workloadMetrics.filter(
      (m) => m.availability_status === 'available',
    );

    const reassignments: {
      task_id: string;
      from_member: string;
      to_member: string;
      reason: string;
    }[] = [];

    if (overloadedMembers.length === 0 || availableMembers.length === 0) {
      return { reassignments, workload_improvement: 0 };
    }

    // Get reassignable tasks from overloaded members
    for (const overloadedMember of overloadedMembers) {
      const { data: reassignableTasks } = await this.supabase
        .from('workflow_tasks')
        .select('id, title, category, estimated_hours, priority')
        .eq('assigned_to', overloadedMember.team_member_id)
        .eq('wedding_id', weddingId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false });

      if (!reassignableTasks) continue;

      // Find suitable candidates for each task
      for (const task of reassignableTasks) {
        const suitableMembers = availableMembers.filter(
          (member) =>
            member.specialty === task.category ||
            ['admin', 'coordinator'].includes(member.role),
        );

        if (suitableMembers.length === 0) continue;

        // Pick the member with lowest workload score
        const bestCandidate = suitableMembers.reduce((best, current) =>
          current.workload_score < best.workload_score ? current : best,
        );

        reassignments.push({
          task_id: task.id,
          from_member: overloadedMember.team_member_name,
          to_member: bestCandidate.team_member_name,
          reason: `Rebalancing workload - ${overloadedMember.team_member_name} is overloaded (${overloadedMember.capacity_utilization}% capacity)`,
        });

        // Update available member's workload (for next iteration)
        bestCandidate.estimated_hours_remaining += task.estimated_hours || 0;
        bestCandidate.workload_score += this.calculateTaskWeight(task);

        // Only reassign a few tasks per overloaded member
        if (reassignments.length >= 2) break;
      }
    }

    const workload_improvement = this.calculateWorkloadImprovement(
      reassignments.length,
      overloadedMembers.length,
    );

    return { reassignments, workload_improvement };
  }

  private calculateAssignmentConfidence(
    member: WorkloadMetrics,
    taskCategory: string,
    priority: TaskPriority,
    estimatedHours: number,
    deadline?: string,
  ): number {
    let confidence = 50; // Base confidence

    // Specialty match
    if (member.specialty === taskCategory) confidence += 30;
    else if (['admin', 'coordinator'].includes(member.role)) confidence += 15;

    // Availability status
    switch (member.availability_status) {
      case 'available':
        confidence += 20;
        break;
      case 'busy':
        confidence += 5;
        break;
      case 'overloaded':
        confidence -= 25;
        break;
      case 'unavailable':
        confidence -= 50;
        break;
    }

    // Completion rate
    confidence += member.task_completion_rate * 0.3;

    // Capacity utilization (sweet spot is 70-85%)
    if (
      member.capacity_utilization >= 70 &&
      member.capacity_utilization <= 85
    ) {
      confidence += 10;
    } else if (member.capacity_utilization > 85) {
      confidence -= (member.capacity_utilization - 85) * 0.5;
    }

    // Deadline pressure
    if (deadline && priority === TaskPriority.CRITICAL) {
      const daysUntilDeadline = Math.ceil(
        (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (
        daysUntilDeadline <= 3 &&
        member.avg_completion_time_days <= daysUntilDeadline
      ) {
        confidence += 15;
      }
    }

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private assessWorkloadImpact(
    member: WorkloadMetrics,
    estimatedHours: number,
  ): 'low' | 'medium' | 'high' {
    const newUtilization =
      ((member.estimated_hours_remaining + estimatedHours) /
        (member.estimated_hours_total || 40)) *
      100;

    if (newUtilization <= 75) return 'low';
    if (newUtilization <= 90) return 'medium';
    return 'high';
  }

  private estimateCompletionDate(
    member: WorkloadMetrics,
    estimatedHours: number,
    deadline?: string,
  ): string {
    const avgDaysPerTask = member.avg_completion_time_days || 3;
    const hoursPerDay = 8; // Standard work day
    const estimatedDays = Math.ceil(estimatedHours / hoursPerDay);

    // Factor in current workload
    const workloadDelayDays = Math.floor(
      member.estimated_hours_remaining / hoursPerDay,
    );

    const completionDate = new Date();
    completionDate.setDate(
      completionDate.getDate() + estimatedDays + workloadDelayDays,
    );

    return completionDate.toISOString();
  }

  private generateAssignmentReasons(
    member: WorkloadMetrics,
    taskCategory: string,
    priority: TaskPriority,
    workloadImpact: 'low' | 'medium' | 'high',
  ): string[] {
    const reasons: string[] = [];

    if (member.specialty === taskCategory) {
      reasons.push(`Specialized in ${taskCategory}`);
    }

    if (member.availability_status === 'available') {
      reasons.push('Currently available');
    }

    if (member.task_completion_rate > 80) {
      reasons.push(
        `High completion rate (${member.task_completion_rate.toFixed(1)}%)`,
      );
    }

    if (workloadImpact === 'low') {
      reasons.push('Low impact on current workload');
    }

    if (member.capacity_utilization < 70) {
      reasons.push('Has available capacity');
    }

    if (member.overdue_tasks === 0) {
      reasons.push('No overdue tasks');
    }

    return reasons;
  }

  private generateCapacityRecommendations(
    capacityData: any,
    bottlenecks: any[],
  ): string[] {
    const recommendations: string[] = [];

    if (capacityData?.capacity_utilization > 90) {
      recommendations.push(
        'Team is at high capacity utilization. Consider adding more team members or extending timelines.',
      );
    }

    if (bottlenecks.length > 0) {
      recommendations.push(
        `Capacity bottlenecks identified in: ${bottlenecks.map((b) => b.specialty).join(', ')}. Consider cross-training or hiring specialists.`,
      );
    }

    if (capacityData?.remaining_capacity < 0) {
      recommendations.push(
        'Team capacity is overallocated. Prioritize critical tasks and consider deadline adjustments.',
      );
    }

    if (capacityData?.capacity_utilization < 50) {
      recommendations.push(
        'Team has significant available capacity. This is a good time to take on additional projects or advance deadlines.',
      );
    }

    return recommendations;
  }

  private calculateTaskWeight(task: any): number {
    let weight = task.estimated_hours || 4;

    // Priority multiplier
    switch (task.priority) {
      case TaskPriority.CRITICAL:
        weight *= 2;
        break;
      case TaskPriority.HIGH:
        weight *= 1.5;
        break;
      case TaskPriority.MEDIUM:
        weight *= 1;
        break;
      case TaskPriority.LOW:
        weight *= 0.7;
        break;
    }

    return weight;
  }

  private calculateWorkloadImprovement(
    reassignmentsCount: number,
    overloadedCount: number,
  ): number {
    if (overloadedCount === 0) return 0;
    return Math.round((reassignmentsCount / (overloadedCount * 3)) * 100); // Assume 3 tasks per overloaded member
  }

  /**
   * Get workload trends over time
   */
  async getWorkloadTrends(
    weddingId: string,
    days: number = 30,
  ): Promise<
    {
      date: string;
      total_active_tasks: number;
      average_workload_score: number;
      team_utilization: number;
    }[]
  > {
    const { data, error } = await this.supabase.rpc('get_workload_trends', {
      wedding_id_param: weddingId,
      days_param: days,
    });

    if (error) {
      throw new Error(`Failed to get workload trends: ${error.message}`);
    }

    return data || [];
  }
}

export const workloadTrackingService = new WorkloadTrackingService();
