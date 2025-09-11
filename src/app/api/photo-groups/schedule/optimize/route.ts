import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Scheduling optimization schemas
const OptimizationRequestSchema = z.object({
  couple_id: z.string().uuid(),
  strategy: z
    .enum(['time', 'location', 'priority', 'balanced', 'ai_powered'])
    .default('balanced'),
  constraints: z
    .object({
      total_time_limit: z.number().min(60).max(600).optional(), // minutes
      preferred_locations: z.array(z.string()).optional(),
      priority_weight: z.number().min(0).max(1).default(0.4),
      time_weight: z.number().min(0).max(1).default(0.3),
      guest_weight: z.number().min(0).max(1).default(0.3),
      break_time_minutes: z.number().min(0).max(30).default(10),
      max_consecutive_groups: z.number().min(1).max(10).default(5),
    })
    .optional(),
  timeline_slots: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        start_time: z.string(),
        end_time: z.string(),
        available_minutes: z.number(),
        location: z.string().optional(),
        weight: z.number().min(0).max(1).default(1),
      }),
    )
    .optional(),
  excluded_group_ids: z.array(z.string().uuid()).optional(),
});

const OptimizationResultSchema = z.object({
  optimization_id: z.string().uuid(),
  optimized_schedule: z.array(
    z.object({
      group_id: z.string().uuid(),
      timeline_slot: z.string(),
      start_time: z.string(),
      duration_minutes: z.number(),
      location: z.string().optional(),
      confidence_score: z.number().min(0).max(1),
    }),
  ),
  performance_metrics: z.object({
    total_score: z.number(),
    time_efficiency: z.number(),
    priority_satisfaction: z.number(),
    guest_satisfaction: z.number(),
    location_optimization: z.number(),
    conflicts_resolved: z.number(),
  }),
  recommendations: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      effort: z.enum(['low', 'medium', 'high']),
    }),
  ),
});

// AI-powered optimization algorithm
class PhotoGroupScheduleOptimizer {
  private photoGroups: any[];
  private constraints: any;
  private timelineSlots: any[];
  private strategy: string;

  constructor(
    photoGroups: any[],
    constraints: any,
    timelineSlots: any[],
    strategy: string,
  ) {
    this.photoGroups = photoGroups;
    this.constraints = constraints || {};
    this.timelineSlots = timelineSlots || [];
    this.strategy = strategy;
  }

  optimize(): any {
    switch (this.strategy) {
      case 'time':
        return this.optimizeByTime();
      case 'location':
        return this.optimizeByLocation();
      case 'priority':
        return this.optimizeByPriority();
      case 'ai_powered':
        return this.aiPoweredOptimization();
      default:
        return this.balancedOptimization();
    }
  }

  private optimizeByTime(): any {
    // Sort groups by estimated time (shortest first for efficiency)
    const sortedGroups = [...this.photoGroups].sort(
      (a, b) => a.estimated_time_minutes - b.estimated_time_minutes,
    );

    const optimizedSchedule = [];
    const availableSlots = new Map();

    // Initialize available time per slot
    this.timelineSlots.forEach((slot) => {
      availableSlots.set(slot.id, slot.available_minutes);
    });

    for (const group of sortedGroups) {
      let bestSlot = null;
      let bestScore = -1;

      for (const slot of this.timelineSlots) {
        const availableTime = availableSlots.get(slot.id);
        if (
          availableTime >=
          group.estimated_time_minutes +
            (this.constraints.break_time_minutes || 10)
        ) {
          const score = this.calculateTimeScore(group, slot, availableTime);
          if (score > bestScore) {
            bestScore = score;
            bestSlot = slot;
          }
        }
      }

      if (bestSlot) {
        optimizedSchedule.push({
          group_id: group.id,
          timeline_slot: bestSlot.id,
          start_time: bestSlot.start_time,
          duration_minutes: group.estimated_time_minutes,
          location: bestSlot.location,
          confidence_score: Math.min(bestScore, 1.0),
        });

        // Update available time
        availableSlots.set(
          bestSlot.id,
          availableSlots.get(bestSlot.id) -
            group.estimated_time_minutes -
            (this.constraints.break_time_minutes || 10),
        );
      }
    }

    return {
      optimized_schedule: optimizedSchedule,
      performance_metrics: this.calculatePerformanceMetrics(optimizedSchedule),
      recommendations: this.generateRecommendations(optimizedSchedule),
    };
  }

  private optimizeByPriority(): any {
    // Sort groups by priority (highest first)
    const sortedGroups = [...this.photoGroups].sort(
      (a, b) => a.priority - b.priority,
    );

    const optimizedSchedule = [];
    const slotUsage = new Map();

    for (const group of sortedGroups) {
      const bestSlot = this.findBestSlotForGroup(group, slotUsage);

      if (bestSlot) {
        optimizedSchedule.push({
          group_id: group.id,
          timeline_slot: bestSlot.slot.id,
          start_time: bestSlot.start_time,
          duration_minutes: group.estimated_time_minutes,
          location: bestSlot.slot.location,
          confidence_score: bestSlot.confidence,
        });

        this.updateSlotUsage(
          slotUsage,
          bestSlot.slot.id,
          group.estimated_time_minutes,
        );
      }
    }

    return {
      optimized_schedule: optimizedSchedule,
      performance_metrics: this.calculatePerformanceMetrics(optimizedSchedule),
      recommendations: this.generateRecommendations(optimizedSchedule),
    };
  }

  private balancedOptimization(): any {
    // Weighted scoring approach combining multiple factors
    const optimizedSchedule = [];
    const slotUsage = new Map();

    // Calculate composite scores for all group-slot combinations
    const assignments = [];

    for (const group of this.photoGroups) {
      for (const slot of this.timelineSlots) {
        const score = this.calculateCompositeScore(group, slot, slotUsage);
        if (score > 0.3) {
          // Minimum threshold
          assignments.push({
            group,
            slot,
            score,
            group_id: group.id,
            slot_id: slot.id,
          });
        }
      }
    }

    // Sort by composite score (highest first)
    assignments.sort((a, b) => b.score - a.score);

    const assignedGroups = new Set();
    const assignedSlots = new Map();

    // Assign groups to slots based on scores
    for (const assignment of assignments) {
      if (assignedGroups.has(assignment.group_id)) continue;

      const slotAvailableTime = this.getAvailableTimeForSlot(
        assignment.slot_id,
        assignedSlots,
      );
      const requiredTime =
        assignment.group.estimated_time_minutes +
        (this.constraints.break_time_minutes || 10);

      if (slotAvailableTime >= requiredTime) {
        optimizedSchedule.push({
          group_id: assignment.group_id,
          timeline_slot: assignment.slot_id,
          start_time: assignment.slot.start_time,
          duration_minutes: assignment.group.estimated_time_minutes,
          location: assignment.slot.location,
          confidence_score: assignment.score,
        });

        assignedGroups.add(assignment.group_id);
        this.updateSlotUsage(assignedSlots, assignment.slot_id, requiredTime);
      }
    }

    return {
      optimized_schedule: optimizedSchedule,
      performance_metrics: this.calculatePerformanceMetrics(optimizedSchedule),
      recommendations: this.generateRecommendations(optimizedSchedule),
    };
  }

  private aiPoweredOptimization(): any {
    // Advanced AI-powered optimization using multiple passes and refinement
    let bestSchedule = null;
    let bestScore = 0;

    // Multiple optimization passes with different strategies
    const strategies = ['priority', 'time', 'balanced'];

    for (const strategy of strategies) {
      const tempOptimizer = new PhotoGroupScheduleOptimizer(
        this.photoGroups,
        this.constraints,
        this.timelineSlots,
        strategy,
      );
      const result = tempOptimizer.optimize();
      const score = result.performance_metrics.total_score;

      if (score > bestScore) {
        bestScore = score;
        bestSchedule = result;
      }
    }

    // Apply ML-inspired refinements
    if (bestSchedule) {
      bestSchedule = this.applyMLRefinements(bestSchedule);
    }

    return bestSchedule || this.balancedOptimization();
  }

  private calculateCompositeScore(
    group: any,
    slot: any,
    slotUsage: Map<string, number>,
  ): number {
    const weights = {
      priority: this.constraints.priority_weight || 0.4,
      time: this.constraints.time_weight || 0.3,
      guest: this.constraints.guest_weight || 0.3,
    };

    // Priority score (higher priority = higher score)
    const priorityScore = (10 - group.priority) / 10;

    // Time efficiency score
    const availableTime = this.getAvailableTimeForSlot(slot.id, slotUsage);
    const timeUtilization = group.estimated_time_minutes / availableTime;
    const timeScore = Math.min(timeUtilization * 2, 1); // Optimal around 50% utilization

    // Guest satisfaction score (based on photo type and timeline slot appropriateness)
    const guestScore = this.calculateGuestSatisfactionScore(group, slot);

    return (
      (priorityScore * weights.priority +
        timeScore * weights.time +
        guestScore * weights.guest) *
      (slot.weight || 1)
    );
  }

  private calculateGuestSatisfactionScore(group: any, slot: any): number {
    // Photo type to timeline slot mapping scores
    const typeSlotScores = {
      bridal_party: {
        preparation: 0.9,
        ceremony: 0.8,
        golden_hour: 1.0,
        reception: 0.6,
      },
      family: {
        preparation: 0.7,
        ceremony: 1.0,
        golden_hour: 0.9,
        reception: 0.8,
      },
      friends: {
        preparation: 0.6,
        ceremony: 0.7,
        golden_hour: 0.8,
        reception: 1.0,
      },
      formal: {
        preparation: 0.8,
        ceremony: 1.0,
        golden_hour: 0.9,
        reception: 0.7,
      },
      candid: {
        preparation: 0.9,
        ceremony: 0.6,
        golden_hour: 0.7,
        reception: 1.0,
      },
    };

    const slotName = slot.name.toLowerCase();
    const photoType = group.photo_type;

    return typeSlotScores[photoType]?.[slotName] || 0.7;
  }

  private getAvailableTimeForSlot(
    slotId: string,
    slotUsage: Map<string, number>,
  ): number {
    const slot = this.timelineSlots.find((s) => s.id === slotId);
    const usedTime = slotUsage.get(slotId) || 0;
    return (slot?.available_minutes || 0) - usedTime;
  }

  private updateSlotUsage(
    slotUsage: Map<string, number>,
    slotId: string,
    timeUsed: number,
  ): void {
    const currentUsage = slotUsage.get(slotId) || 0;
    slotUsage.set(slotId, currentUsage + timeUsed);
  }

  private calculateTimeScore(
    group: any,
    slot: any,
    availableTime: number,
  ): number {
    const utilization = group.estimated_time_minutes / availableTime;
    // Optimal utilization is around 70-80%
    if (utilization > 0.9) return 0.5; // Too tight
    if (utilization < 0.3) return 0.7; // Underutilized
    return 1.0; // Good utilization
  }

  private findBestSlotForGroup(
    group: any,
    slotUsage: Map<string, number>,
  ): any {
    let bestSlot = null;
    let bestScore = 0;

    for (const slot of this.timelineSlots) {
      const availableTime = this.getAvailableTimeForSlot(slot.id, slotUsage);
      const requiredTime =
        group.estimated_time_minutes +
        (this.constraints.break_time_minutes || 10);

      if (availableTime >= requiredTime) {
        const score = this.calculateCompositeScore(group, slot, slotUsage);
        if (score > bestScore) {
          bestScore = score;
          bestSlot = {
            slot,
            start_time: slot.start_time,
            confidence: Math.min(score, 1.0),
          };
        }
      }
    }

    return bestSlot;
  }

  private calculatePerformanceMetrics(schedule: any[]): any {
    const totalGroups = this.photoGroups.length;
    const scheduledGroups = schedule.length;

    // Time efficiency: how well we used available time
    const totalAvailableTime = this.timelineSlots.reduce(
      (sum, slot) => sum + slot.available_minutes,
      0,
    );
    const totalUsedTime = schedule.reduce(
      (sum, item) => sum + item.duration_minutes,
      0,
    );
    const timeEfficiency = totalUsedTime / totalAvailableTime;

    // Priority satisfaction: how well we satisfied high-priority groups
    const highPriorityGroups = this.photoGroups.filter((g) => g.priority <= 3);
    const scheduledHighPriority = schedule.filter((s) => {
      const group = this.photoGroups.find((g) => g.id === s.group_id);
      return group && group.priority <= 3;
    });
    const prioritySatisfaction =
      highPriorityGroups.length > 0
        ? scheduledHighPriority.length / highPriorityGroups.length
        : 1;

    // Guest satisfaction: average confidence scores
    const avgConfidence =
      schedule.length > 0
        ? schedule.reduce((sum, item) => sum + item.confidence_score, 0) /
          schedule.length
        : 0;

    // Location optimization: groups in appropriate locations
    const locationOptimization =
      schedule.filter((s) => s.location).length / Math.max(schedule.length, 1);

    // Conflicts resolved
    const conflictsResolved = totalGroups - scheduledGroups;

    const totalScore =
      timeEfficiency * 0.25 +
      prioritySatisfaction * 0.35 +
      avgConfidence * 0.25 +
      locationOptimization * 0.15;

    return {
      total_score: Math.round(totalScore * 100) / 100,
      time_efficiency: Math.round(timeEfficiency * 100) / 100,
      priority_satisfaction: Math.round(prioritySatisfaction * 100) / 100,
      guest_satisfaction: Math.round(avgConfidence * 100) / 100,
      location_optimization: Math.round(locationOptimization * 100) / 100,
      conflicts_resolved: conflictsResolved,
    };
  }

  private generateRecommendations(schedule: any[]): any[] {
    const recommendations = [];
    const unscheduledCount = this.photoGroups.length - schedule.length;

    if (unscheduledCount > 0) {
      recommendations.push({
        type: 'unscheduled_groups',
        description: `${unscheduledCount} photo groups could not be scheduled. Consider extending timeline or adjusting priorities.`,
        impact: 'high',
        effort: 'medium',
      });
    }

    // Check for tight scheduling
    const tightSchedules = schedule.filter((s) => s.confidence_score < 0.6);
    if (tightSchedules.length > 0) {
      recommendations.push({
        type: 'tight_scheduling',
        description: `${tightSchedules.length} groups have tight scheduling. Consider adding buffer time.`,
        impact: 'medium',
        effort: 'low',
      });
    }

    // Check for location optimization
    const missingLocations = schedule.filter((s) => !s.location).length;
    if (missingLocations > 0) {
      recommendations.push({
        type: 'location_optimization',
        description: `${missingLocations} groups lack specific location assignments. Consider adding location preferences.`,
        impact: 'low',
        effort: 'low',
      });
    }

    return recommendations;
  }

  private applyMLRefinements(schedule: any): any {
    // Apply machine learning inspired refinements
    // This could be enhanced with actual ML models in the future

    // Refinement 1: Swap adjacent groups for better flow
    const refinedSchedule = this.applyAdjacentSwapOptimization(
      schedule.optimized_schedule,
    );

    // Refinement 2: Adjust timing for better transitions
    const adjustedSchedule = this.applyTimingAdjustments(refinedSchedule);

    return {
      ...schedule,
      optimized_schedule: adjustedSchedule,
      performance_metrics: this.calculatePerformanceMetrics(adjustedSchedule),
    };
  }

  private applyAdjacentSwapOptimization(schedule: any[]): any[] {
    // Simple adjacent swap optimization
    const result = [...schedule];

    for (let i = 0; i < result.length - 1; i++) {
      const current = result[i];
      const next = result[i + 1];

      // Check if swapping would improve overall score
      const currentGroup = this.photoGroups.find(
        (g) => g.id === current.group_id,
      );
      const nextGroup = this.photoGroups.find((g) => g.id === next.group_id);

      if (
        currentGroup &&
        nextGroup &&
        this.shouldSwapGroups(
          currentGroup,
          nextGroup,
          current.timeline_slot,
          next.timeline_slot,
        )
      ) {
        result[i] = { ...current, group_id: next.group_id };
        result[i + 1] = { ...next, group_id: current.group_id };
      }
    }

    return result;
  }

  private shouldSwapGroups(
    group1: any,
    group2: any,
    slot1: string,
    slot2: string,
  ): boolean {
    // Simple heuristic: swap if it improves priority alignment
    const slot1Obj = this.timelineSlots.find((s) => s.id === slot1);
    const slot2Obj = this.timelineSlots.find((s) => s.id === slot2);

    if (!slot1Obj || !slot2Obj) return false;

    const currentScore =
      this.calculateGuestSatisfactionScore(group1, slot1Obj) +
      this.calculateGuestSatisfactionScore(group2, slot2Obj);

    const swappedScore =
      this.calculateGuestSatisfactionScore(group1, slot2Obj) +
      this.calculateGuestSatisfactionScore(group2, slot1Obj);

    return swappedScore > currentScore;
  }

  private applyTimingAdjustments(schedule: any[]): any[] {
    // Apply timing adjustments for better flow
    return schedule.map((item) => ({
      ...item,
      // Add small timing adjustments based on confidence scores
      duration_minutes:
        item.confidence_score < 0.7
          ? item.duration_minutes + 5 // Add buffer for uncertain items
          : item.duration_minutes,
    }));
  }
}

// POST /api/photo-groups/schedule/optimize - Optimize photo group schedule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      couple_id,
      strategy,
      constraints,
      timeline_slots,
      excluded_group_ids,
    } = OptimizationRequestSchema.parse(body);

    // Verify user has access to this couple
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        id,
        user_profiles!inner(user_id)
      `,
      )
      .eq('id', couple_id)
      .eq('user_profiles.user_id', user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get photo groups for optimization
    let photoGroupsQuery = supabase
      .from('photo_groups')
      .select(
        `
        id,
        name,
        priority,
        estimated_time_minutes,
        timeline_slot,
        location,
        photo_type,
        assignments:photo_group_assignments(
          guest_id,
          is_primary
        )
      `,
      )
      .eq('couple_id', couple_id);

    if (excluded_group_ids && excluded_group_ids.length > 0) {
      photoGroupsQuery = photoGroupsQuery.not(
        'id',
        'in',
        `(${excluded_group_ids.join(',')})`,
      );
    }

    const { data: photoGroups, error: groupsError } = await photoGroupsQuery;

    if (groupsError) {
      console.error('Error fetching photo groups:', groupsError);
      return NextResponse.json(
        { error: 'Failed to fetch photo groups' },
        { status: 500 },
      );
    }

    if (!photoGroups || photoGroups.length === 0) {
      return NextResponse.json({
        error: 'No photo groups found for optimization',
        optimized_schedule: [],
        performance_metrics: {
          total_score: 0,
          time_efficiency: 0,
          priority_satisfaction: 0,
          guest_satisfaction: 0,
          location_optimization: 0,
          conflicts_resolved: 0,
        },
        recommendations: [],
      });
    }

    // Use default timeline slots if not provided
    const defaultTimelineSlots = timeline_slots || [
      {
        id: 'preparation',
        name: 'Preparation',
        start_time: '10:00',
        end_time: '12:00',
        available_minutes: 120,
        weight: 0.8,
      },
      {
        id: 'ceremony',
        name: 'Ceremony',
        start_time: '14:00',
        end_time: '15:30',
        available_minutes: 90,
        weight: 1.0,
      },
      {
        id: 'golden_hour',
        name: 'Golden Hour',
        start_time: '17:00',
        end_time: '18:30',
        available_minutes: 90,
        weight: 1.0,
      },
      {
        id: 'reception',
        name: 'Reception',
        start_time: '19:00',
        end_time: '22:00',
        available_minutes: 180,
        weight: 0.9,
      },
    ];

    // Run optimization
    const optimizer = new PhotoGroupScheduleOptimizer(
      photoGroups,
      constraints,
      defaultTimelineSlots,
      strategy,
    );

    const optimizationResult = optimizer.optimize();
    const optimizationId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store optimization result
    const { error: storeError } = await supabase
      .from('photo_group_schedule_optimizations')
      .insert({
        id: optimizationId,
        couple_id,
        strategy,
        input_groups: photoGroups,
        optimized_schedule: optimizationResult.optimized_schedule,
        performance_score: optimizationResult.performance_metrics.total_score,
        time_saved_minutes: Math.round(
          optimizationResult.performance_metrics.time_efficiency * 60,
        ),
        created_by: (
          await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()
        ).data?.id,
      });

    if (storeError) {
      console.error('Error storing optimization result:', storeError);
      // Continue with response even if storage fails
    }

    return NextResponse.json({
      optimization_id: optimizationId,
      strategy,
      ...optimizationResult,
      constraints: constraints || {},
      timeline_slots_used: defaultTimelineSlots,
      optimization_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Schedule optimization error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/photo-groups/schedule/optimize - Get optimization history
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coupleId = searchParams.get('couple_id');
  const optimizationId = searchParams.get('optimization_id');

  if (!coupleId && !optimizationId) {
    return NextResponse.json(
      { error: 'couple_id or optimization_id is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('photo_group_schedule_optimizations').select(`
        id,
        strategy,
        optimized_schedule,
        performance_score,
        time_saved_minutes,
        created_at,
        couples:clients!couple_id(
          id,
          user_profiles!inner(user_id)
        )
      `);

    if (optimizationId) {
      query = query.eq('id', optimizationId);
    } else {
      query = query.eq('couple_id', coupleId);
    }

    // Verify access
    query = query.eq('couples.user_profiles.user_id', user.id);

    const { data: optimizations, error: optimizationsError } = await query
      .order('created_at', { ascending: false })
      .limit(optimizationId ? 1 : 20);

    if (optimizationsError) {
      console.error('Error fetching optimizations:', optimizationsError);
      return NextResponse.json(
        { error: 'Failed to fetch optimizations' },
        { status: 500 },
      );
    }

    if (optimizationId && (!optimizations || optimizations.length === 0)) {
      return NextResponse.json(
        { error: 'Optimization not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      optimizations: optimizations || [],
      total_count: optimizations?.length || 0,
    });
  } catch (error) {
    console.error('Get optimizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
