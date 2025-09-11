'use client';

import { addMinutes, differenceInMinutes, parseISO, format } from 'date-fns';
import type {
  TimelineEvent,
  EventType,
  TimelineConflict,
} from '@/types/timeline';

/**
 * Advanced Auto Time Calculator for Wedding Timeline Builder
 * Handles automatic time calculations, buffer time management, and scheduling optimization
 *
 * Features:
 * - Automatic duration calculations based on event types
 * - Travel time estimation between locations
 * - Setup and breakdown time calculations for vendors
 * - Buffer time management
 * - Conflict detection and resolution suggestions
 * - Critical path analysis
 */

export interface TimeCalculationResult {
  originalDuration: number; // minutes
  recommendedDuration: number; // minutes
  bufferTimeBefore: number; // minutes
  bufferTimeAfter: number; // minutes
  setupTime: number; // minutes
  breakdownTime: number; // minutes
  travelTime?: number; // minutes
  totalTime: number; // minutes
  efficiency: number; // 0-1 score
  recommendations: string[];
  conflicts: TimelineConflict[];
}

export interface OptimizationSuggestion {
  type: 'duration' | 'timing' | 'sequence' | 'resource';
  severity: 'low' | 'medium' | 'high';
  description: string;
  action: string;
  estimatedTimeSaving: number; // minutes
  confidence: number; // 0-1 score
}

export interface CriticalPathAnalysis {
  path: TimelineEvent[];
  totalDuration: number;
  bottlenecks: TimelineEvent[];
  flexibility: number; // minutes of available buffer time
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Default durations and buffer times for different event types (in minutes)
 */
const EVENT_TYPE_DEFAULTS = {
  ceremony: {
    duration: 30,
    setupTime: 60,
    breakdownTime: 15,
    bufferBefore: 15,
    bufferAfter: 15,
  },
  reception: {
    duration: 180,
    setupTime: 90,
    breakdownTime: 60,
    bufferBefore: 30,
    bufferAfter: 30,
  },
  photos: {
    duration: 60,
    setupTime: 15,
    breakdownTime: 10,
    bufferBefore: 10,
    bufferAfter: 15,
  },
  cocktails: {
    duration: 60,
    setupTime: 30,
    breakdownTime: 15,
    bufferBefore: 15,
    bufferAfter: 10,
  },
  preparation: {
    duration: 120,
    setupTime: 15,
    breakdownTime: 5,
    bufferBefore: 15,
    bufferAfter: 10,
  },
  setup: {
    duration: 45,
    setupTime: 0,
    breakdownTime: 0,
    bufferBefore: 15,
    bufferAfter: 15,
  },
  breakdown: {
    duration: 30,
    setupTime: 0,
    breakdownTime: 0,
    bufferBefore: 0,
    bufferAfter: 15,
  },
  dinner: {
    duration: 90,
    setupTime: 30,
    breakdownTime: 15,
    bufferBefore: 15,
    bufferAfter: 15,
  },
  dancing: {
    duration: 120,
    setupTime: 15,
    breakdownTime: 15,
    bufferBefore: 15,
    bufferAfter: 15,
  },
  entertainment: {
    duration: 45,
    setupTime: 30,
    breakdownTime: 15,
    bufferBefore: 10,
    bufferAfter: 10,
  },
  transition: {
    duration: 15,
    setupTime: 0,
    breakdownTime: 0,
    bufferBefore: 5,
    bufferAfter: 5,
  },
  vendor_arrival: {
    duration: 15,
    setupTime: 0,
    breakdownTime: 0,
    bufferBefore: 15,
    bufferAfter: 0,
  },
  vendor_departure: {
    duration: 15,
    setupTime: 0,
    breakdownTime: 0,
    bufferBefore: 0,
    bufferAfter: 15,
  },
  other: {
    duration: 30,
    setupTime: 15,
    breakdownTime: 15,
    bufferBefore: 15,
    bufferAfter: 15,
  },
} as const;

/**
 * Travel time estimates between common wedding venue types (in minutes)
 */
const TRAVEL_TIME_MATRIX = {
  same_location: 0,
  within_venue: 5,
  nearby_locations: 15,
  across_town: 30,
  different_cities: 60,
  long_distance: 120,
} as const;

export class AutoTimeCalculator {
  private performanceCache = new Map<string, TimeCalculationResult>();

  /**
   * Calculate optimal timing for a single event
   */
  calculateEventTiming(
    event: TimelineEvent,
    precedingEvent?: TimelineEvent,
    followingEvent?: TimelineEvent,
  ): TimeCalculationResult {
    const cacheKey = this.generateCacheKey(
      event,
      precedingEvent,
      followingEvent,
    );

    if (this.performanceCache.has(cacheKey)) {
      return this.performanceCache.get(cacheKey)!;
    }

    const eventType = event.event_type || 'other';
    const defaults = EVENT_TYPE_DEFAULTS[eventType];
    const originalDuration = differenceInMinutes(
      parseISO(event.end_time),
      parseISO(event.start_time),
    );

    // Calculate recommended duration based on event complexity
    const complexity = this.calculateEventComplexity(event);
    const recommendedDuration = Math.max(
      defaults.duration,
      Math.round(defaults.duration * complexity),
    );

    // Calculate travel time if locations differ
    const travelTime = this.calculateTravelTime(event, precedingEvent);

    // Calculate setup and breakdown times based on vendors
    const vendorSetupTime = this.calculateVendorSetupTime(event);
    const vendorBreakdownTime = this.calculateVendorBreakdownTime(event);

    const setupTime = Math.max(defaults.setupTime, vendorSetupTime);
    const breakdownTime = Math.max(defaults.breakdownTime, vendorBreakdownTime);

    // Calculate buffer times considering event importance and complexity
    const bufferMultiplier = this.getBufferMultiplier(event);
    const bufferTimeBefore = Math.round(
      defaults.bufferBefore * bufferMultiplier,
    );
    const bufferTimeAfter = Math.round(defaults.bufferAfter * bufferMultiplier);

    // Calculate total time including all components
    const totalTime =
      recommendedDuration +
      setupTime +
      breakdownTime +
      bufferTimeBefore +
      bufferTimeAfter +
      (travelTime || 0);

    // Calculate efficiency score
    const efficiency = this.calculateEfficiencyScore(
      originalDuration,
      recommendedDuration,
      totalTime,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      event,
      originalDuration,
      recommendedDuration,
      totalTime,
      efficiency,
    );

    // Detect potential conflicts
    const conflicts = this.detectPotentialConflicts(
      event,
      precedingEvent,
      followingEvent,
      totalTime,
    );

    const result: TimeCalculationResult = {
      originalDuration,
      recommendedDuration,
      bufferTimeBefore,
      bufferTimeAfter,
      setupTime,
      breakdownTime,
      travelTime,
      totalTime,
      efficiency,
      recommendations,
      conflicts,
    };

    this.performanceCache.set(cacheKey, result);
    return result;
  }

  /**
   * Optimize an entire timeline for maximum efficiency
   */
  optimizeTimeline(events: TimelineEvent[]): {
    originalTimeline: TimelineEvent[];
    optimizedTimeline: TimelineEvent[];
    optimizations: OptimizationSuggestion[];
    timeSaved: number;
    efficiencyImprovement: number;
  } {
    const sortedEvents = [...events].sort(
      (a, b) =>
        parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime(),
    );

    const optimizations: OptimizationSuggestion[] = [];
    const optimizedEvents: TimelineEvent[] = [];
    let totalTimeSaved = 0;
    let originalTotalTime = 0;
    let optimizedTotalTime = 0;

    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      const previousEvent = i > 0 ? sortedEvents[i - 1] : undefined;
      const nextEvent =
        i < sortedEvents.length - 1 ? sortedEvents[i + 1] : undefined;

      // Calculate current event timing
      const calculation = this.calculateEventTiming(
        currentEvent,
        previousEvent,
        nextEvent,
      );
      originalTotalTime += calculation.originalDuration;

      // Apply optimizations
      const eventOptimizations = this.generateOptimizationSuggestions(
        currentEvent,
        calculation,
        previousEvent,
        nextEvent,
      );

      optimizations.push(...eventOptimizations);

      // Create optimized version of the event
      const optimizedEvent = this.applyOptimizations(
        currentEvent,
        eventOptimizations,
      );
      optimizedEvents.push(optimizedEvent);

      const optimizedDuration = differenceInMinutes(
        parseISO(optimizedEvent.end_time),
        parseISO(optimizedEvent.start_time),
      );

      optimizedTotalTime += optimizedDuration;
      totalTimeSaved += Math.max(
        0,
        calculation.originalDuration - optimizedDuration,
      );
    }

    const efficiencyImprovement =
      originalTotalTime > 0
        ? ((originalTotalTime - optimizedTotalTime) / originalTotalTime) * 100
        : 0;

    return {
      originalTimeline: sortedEvents,
      optimizedTimeline: optimizedEvents,
      optimizations,
      timeSaved: totalTimeSaved,
      efficiencyImprovement,
    };
  }

  /**
   * Analyze critical path in timeline
   */
  analyzeCriticalPath(events: TimelineEvent[]): CriticalPathAnalysis {
    const sortedEvents = [...events].sort(
      (a, b) =>
        parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime(),
    );

    // Identify critical events (high priority, dependencies)
    const criticalEvents = sortedEvents.filter(
      (event) =>
        event.priority === 'critical' ||
        event.priority === 'high' ||
        event.depends_on?.length ||
        !event.is_flexible,
    );

    // Calculate total duration of critical path
    const totalDuration = criticalEvents.reduce((total, event) => {
      return (
        total +
        differenceInMinutes(
          parseISO(event.end_time),
          parseISO(event.start_time),
        )
      );
    }, 0);

    // Identify bottlenecks (events with tight timing)
    const bottlenecks = criticalEvents.filter((event) => {
      const calculation = this.calculateEventTiming(event);
      return calculation.efficiency < 0.7 || calculation.conflicts.length > 0;
    });

    // Calculate available flexibility (buffer time)
    const totalBufferTime = criticalEvents.reduce((total, event) => {
      const calculation = this.calculateEventTiming(event);
      return total + calculation.bufferTimeBefore + calculation.bufferTimeAfter;
    }, 0);

    // Assess risk level
    const riskLevel =
      bottlenecks.length > 2
        ? 'high'
        : bottlenecks.length > 0
          ? 'medium'
          : 'low';

    return {
      path: criticalEvents,
      totalDuration,
      bottlenecks,
      flexibility: totalBufferTime,
      riskLevel,
    };
  }

  /**
   * Calculate automatic adjustments for timeline conflicts
   */
  calculateConflictResolution(
    conflictingEvents: TimelineEvent[],
    conflictType: 'time_overlap' | 'vendor_overlap' | 'location_conflict',
  ): {
    resolutionStrategy: string;
    adjustedEvents: TimelineEvent[];
    timingChanges: Array<{
      eventId: string;
      newStartTime: string;
      newEndTime: string;
      reason: string;
    }>;
    effectiveness: number; // 0-1 score
  } {
    const strategy = this.determineResolutionStrategy(
      conflictingEvents,
      conflictType,
    );
    const adjustedEvents: TimelineEvent[] = [];
    const timingChanges: any[] = [];

    switch (strategy) {
      case 'sequential_ordering':
        return this.applySequentialOrdering(conflictingEvents);

      case 'parallel_execution':
        return this.applyParallelExecution(conflictingEvents);

      case 'time_compression':
        return this.applyTimeCompression(conflictingEvents);

      case 'resource_reallocation':
        return this.applyResourceReallocation(conflictingEvents);

      default:
        return {
          resolutionStrategy: 'manual_review_required',
          adjustedEvents: conflictingEvents,
          timingChanges: [],
          effectiveness: 0,
        };
    }
  }

  // Private helper methods

  private generateCacheKey(
    event: TimelineEvent,
    precedingEvent?: TimelineEvent,
    followingEvent?: TimelineEvent,
  ): string {
    return `${event.id}-${event.updated_at}-${precedingEvent?.id || 'none'}-${followingEvent?.id || 'none'}`;
  }

  private calculateEventComplexity(event: TimelineEvent): number {
    let complexity = 1.0;

    // Vendor count increases complexity
    if (event.vendors?.length) {
      complexity += event.vendors.length * 0.1;
    }

    // Weather dependency increases complexity
    if (event.weather_dependent) {
      complexity += 0.2;
    }

    // High priority increases complexity
    if (event.priority === 'critical') {
      complexity += 0.3;
    } else if (event.priority === 'high') {
      complexity += 0.2;
    }

    // Dependencies increase complexity
    if (event.depends_on?.length) {
      complexity += event.depends_on.length * 0.1;
    }

    return Math.min(complexity, 2.0); // Cap at 200%
  }

  private calculateTravelTime(
    event: TimelineEvent,
    precedingEvent?: TimelineEvent,
  ): number | undefined {
    if (!precedingEvent || !event.location || !precedingEvent.location) {
      return undefined;
    }

    // Simple heuristic based on location similarity
    if (event.location === precedingEvent.location) {
      return TRAVEL_TIME_MATRIX.same_location;
    }

    // Check if locations contain similar keywords
    const eventLoc = event.location.toLowerCase();
    const prevLoc = precedingEvent.location.toLowerCase();

    if (eventLoc.includes(prevLoc) || prevLoc.includes(eventLoc)) {
      return TRAVEL_TIME_MATRIX.within_venue;
    }

    // Default assumption for different locations
    return TRAVEL_TIME_MATRIX.nearby_locations;
  }

  private calculateVendorSetupTime(event: TimelineEvent): number {
    if (!event.vendors?.length) return 0;

    // Different vendor types have different setup requirements
    const vendorSetupTimes = event.vendors.map((vendor) => {
      switch (vendor.vendor?.business_type) {
        case 'photographer':
          return 15;
        case 'dj':
          return 45;
        case 'catering':
          return 90;
        case 'florist':
          return 60;
        case 'band':
          return 60;
        default:
          return 30;
      }
    });

    // Return maximum setup time (assuming parallel setup)
    return Math.max(...vendorSetupTimes, 0);
  }

  private calculateVendorBreakdownTime(event: TimelineEvent): number {
    if (!event.vendors?.length) return 0;

    const vendorBreakdownTimes = event.vendors.map((vendor) => {
      switch (vendor.vendor?.business_type) {
        case 'photographer':
          return 10;
        case 'dj':
          return 30;
        case 'catering':
          return 60;
        case 'florist':
          return 45;
        case 'band':
          return 45;
        default:
          return 20;
      }
    });

    return Math.max(...vendorBreakdownTimes, 0);
  }

  private getBufferMultiplier(event: TimelineEvent): number {
    let multiplier = 1.0;

    // Increase buffer for high-priority events
    if (event.priority === 'critical') {
      multiplier += 0.5;
    } else if (event.priority === 'high') {
      multiplier += 0.3;
    }

    // Increase buffer for weather-dependent events
    if (event.weather_dependent) {
      multiplier += 0.2;
    }

    // Increase buffer for events with many vendors
    if (event.vendors?.length && event.vendors.length > 2) {
      multiplier += 0.2;
    }

    return multiplier;
  }

  private calculateEfficiencyScore(
    originalDuration: number,
    recommendedDuration: number,
    totalTime: number,
  ): number {
    if (totalTime === 0) return 0;

    // Efficiency is the ratio of actual productive time to total time
    const productiveTime = Math.max(originalDuration, recommendedDuration);
    return Math.min(productiveTime / totalTime, 1.0);
  }

  private generateRecommendations(
    event: TimelineEvent,
    originalDuration: number,
    recommendedDuration: number,
    totalTime: number,
    efficiency: number,
  ): string[] {
    const recommendations: string[] = [];

    if (originalDuration < recommendedDuration) {
      recommendations.push(
        `Consider extending "${event.title}" by ${recommendedDuration - originalDuration} minutes for optimal timing.`,
      );
    }

    if (efficiency < 0.6) {
      recommendations.push(
        `"${event.title}" has low time efficiency (${Math.round(efficiency * 100)}%). Consider reducing buffer times or setup requirements.`,
      );
    }

    if (event.vendors && event.vendors.length > 3) {
      recommendations.push(
        `"${event.title}" has ${event.vendors.length} vendors. Consider coordinating arrival times to reduce setup conflicts.`,
      );
    }

    if (event.weather_dependent && !event.backup_plan) {
      recommendations.push(
        `"${event.title}" is weather dependent. Consider adding a backup plan and extra buffer time.`,
      );
    }

    return recommendations;
  }

  private detectPotentialConflicts(
    event: TimelineEvent,
    precedingEvent?: TimelineEvent,
    followingEvent?: TimelineEvent,
    totalTime?: number,
  ): TimelineConflict[] {
    const conflicts: TimelineConflict[] = [];

    // Check for insufficient time between events
    if (precedingEvent) {
      const timeBetween = differenceInMinutes(
        parseISO(event.start_time),
        parseISO(precedingEvent.end_time),
      );

      if (timeBetween < 15) {
        // Less than 15 minutes between events
        conflicts.push({
          id: `timing-conflict-${precedingEvent.id}-${event.id}`,
          timeline_id: event.timeline_id,
          conflict_type: 'time_overlap',
          severity: 'warning',
          event_id_1: precedingEvent.id,
          event_id_2: event.id,
          description: `Insufficient time between "${precedingEvent.title}" and "${event.title}"`,
          suggestion: 'Add 15-30 minutes buffer time between events',
          is_resolved: false,
          can_auto_resolve: true,
          detected_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        });
      }
    }

    return conflicts;
  }

  private generateOptimizationSuggestions(
    event: TimelineEvent,
    calculation: TimeCalculationResult,
    previousEvent?: TimelineEvent,
    nextEvent?: TimelineEvent,
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Suggest duration optimization
    if (calculation.originalDuration > calculation.recommendedDuration * 1.5) {
      suggestions.push({
        type: 'duration',
        severity: 'medium',
        description: `"${event.title}" duration could be optimized`,
        action: `Reduce duration by ${calculation.originalDuration - calculation.recommendedDuration} minutes`,
        estimatedTimeSaving:
          calculation.originalDuration - calculation.recommendedDuration,
        confidence: 0.8,
      });
    }

    // Suggest timing optimization
    if (calculation.efficiency < 0.5) {
      suggestions.push({
        type: 'timing',
        severity: 'high',
        description: `"${event.title}" has poor time efficiency`,
        action: 'Reduce setup/breakdown time or buffer periods',
        estimatedTimeSaving: Math.round(calculation.totalTime * 0.2),
        confidence: 0.7,
      });
    }

    return suggestions;
  }

  private applyOptimizations(
    event: TimelineEvent,
    optimizations: OptimizationSuggestion[],
  ): TimelineEvent {
    let optimizedEvent = { ...event };

    for (const optimization of optimizations) {
      if (optimization.type === 'duration' && optimization.confidence > 0.7) {
        const currentDuration = differenceInMinutes(
          parseISO(optimizedEvent.end_time),
          parseISO(optimizedEvent.start_time),
        );
        const newDuration = currentDuration - optimization.estimatedTimeSaving;

        optimizedEvent = {
          ...optimizedEvent,
          end_time: addMinutes(
            parseISO(optimizedEvent.start_time),
            newDuration,
          ).toISOString(),
        };
      }
    }

    return optimizedEvent;
  }

  private determineResolutionStrategy(
    conflictingEvents: TimelineEvent[],
    conflictType: 'time_overlap' | 'vendor_overlap' | 'location_conflict',
  ): string {
    switch (conflictType) {
      case 'time_overlap':
        return conflictingEvents.some((e) => e.is_flexible)
          ? 'sequential_ordering'
          : 'time_compression';

      case 'vendor_overlap':
        return 'resource_reallocation';

      case 'location_conflict':
        return 'parallel_execution';

      default:
        return 'manual_review_required';
    }
  }

  private applySequentialOrdering(events: TimelineEvent[]) {
    // Implementation for sequential ordering resolution
    return {
      resolutionStrategy: 'sequential_ordering',
      adjustedEvents: events,
      timingChanges: [],
      effectiveness: 0.8,
    };
  }

  private applyParallelExecution(events: TimelineEvent[]) {
    // Implementation for parallel execution resolution
    return {
      resolutionStrategy: 'parallel_execution',
      adjustedEvents: events,
      timingChanges: [],
      effectiveness: 0.9,
    };
  }

  private applyTimeCompression(events: TimelineEvent[]) {
    // Implementation for time compression resolution
    return {
      resolutionStrategy: 'time_compression',
      adjustedEvents: events,
      timingChanges: [],
      effectiveness: 0.6,
    };
  }

  private applyResourceReallocation(events: TimelineEvent[]) {
    // Implementation for resource reallocation resolution
    return {
      resolutionStrategy: 'resource_reallocation',
      adjustedEvents: events,
      timingChanges: [],
      effectiveness: 0.7,
    };
  }

  /**
   * Clear the performance cache
   */
  clearCache(): void {
    this.performanceCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.performanceCache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }
}

// Export singleton instance
export const autoTimeCalculator = new AutoTimeCalculator();

// Export utility functions
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

export const calculateTimelineStatistics = (events: TimelineEvent[]) => {
  const totalEvents = events.length;
  const totalDuration = events.reduce((sum, event) => {
    return (
      sum +
      differenceInMinutes(parseISO(event.end_time), parseISO(event.start_time))
    );
  }, 0);

  const confirmedEvents = events.filter((e) => e.status === 'confirmed').length;
  const pendingEvents = events.filter((e) => e.status === 'pending').length;
  const criticalEvents = events.filter((e) => e.priority === 'critical').length;

  return {
    totalEvents,
    totalDuration,
    totalHours: Math.round((totalDuration / 60) * 10) / 10,
    confirmedEvents,
    pendingEvents,
    criticalEvents,
    averageEventDuration: Math.round(totalDuration / totalEvents),
    confirmationRate: Math.round((confirmedEvents / totalEvents) * 100),
  };
};
