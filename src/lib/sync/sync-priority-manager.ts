'use client';

import { addMinutes, isAfter, isBefore, format, parseISO } from 'date-fns';
import type { SyncQueueItem } from './core-sync-engine';

/**
 * Sync Priority Management System
 *
 * Handles wedding day priorities, role-based prioritization,
 * and intelligent queue management for optimal sync performance
 */

export interface PriorityContext {
  weddingId?: string;
  weddingDate?: string;
  currentTime?: string;
  userRole?: UserRole;
  userId?: string;
  deviceId?: string;
  isActiveCoordinator?: boolean;
  locationContext?: 'venue' | 'remote' | 'mobile';
}

export interface PriorityRule {
  id: string;
  name: string;
  description: string;
  condition: (item: SyncQueueItem, context: PriorityContext) => boolean;
  priority: number; // 1-10, higher is more important
  weight: number; // Multiplier for final priority calculation
  active: boolean;
}

export interface PriorityAnalysis {
  finalPriority: number;
  baseScore: number;
  appliedRules: string[];
  boosts: Array<{ rule: string; boost: number }>;
  explanation: string;
  timeToProcess: number; // estimated seconds until processing
  isWeddingDayCritical: boolean;
}

export type UserRole =
  | 'coordinator'
  | 'photographer'
  | 'vendor'
  | 'planner'
  | 'guest';

export class SyncPriorityManager {
  private rules: PriorityRule[] = [];
  private weddingDayThreshold = 24 * 60 * 60 * 1000; // 24 hours in ms

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Calculate priority for a sync item
   */
  calculatePriority(
    item: SyncQueueItem,
    context: PriorityContext,
  ): PriorityAnalysis {
    const startTime = Date.now();

    // Base score from item type and role
    const baseScore = this.calculateBaseScore(item, context);

    // Apply priority rules
    const ruleResults = this.applyPriorityRules(item, context);

    // Calculate final priority
    let finalPriority = baseScore;
    const appliedRules: string[] = [];
    const boosts: Array<{ rule: string; boost: number }> = [];

    ruleResults.forEach((result) => {
      if (result.applies) {
        finalPriority += result.boost;
        appliedRules.push(result.rule.name);
        boosts.push({ rule: result.rule.name, boost: result.boost });
      }
    });

    // Ensure priority stays within bounds (1-10)
    finalPriority = Math.max(1, Math.min(10, finalPriority));

    // Generate explanation
    const explanation = this.generatePriorityExplanation(
      item,
      context,
      appliedRules,
      finalPriority,
    );

    // Estimate processing time
    const timeToProcess = this.estimateProcessingTime(finalPriority, context);

    return {
      finalPriority,
      baseScore,
      appliedRules,
      boosts,
      explanation,
      timeToProcess,
      isWeddingDayCritical: this.isWeddingDayCritical(item, context),
    };
  }

  /**
   * Sort sync items by priority with intelligent batching
   */
  prioritizeQueue(
    items: SyncQueueItem[],
    context: PriorityContext,
  ): SyncQueueItem[] {
    const itemsWithPriority = items.map((item) => {
      const analysis = this.calculatePriority(item, context);
      return {
        ...item,
        priority: analysis.finalPriority,
        priorityAnalysis: analysis,
      };
    });

    // Sort by priority (highest first), then by timestamp for equal priorities
    return itemsWithPriority.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // For equal priorities, wedding day items first
      const aIsWeddingDay = this.isWeddingDayCritical(a, context);
      const bIsWeddingDay = this.isWeddingDayCritical(b, context);

      if (aIsWeddingDay !== bIsWeddingDay) {
        return aIsWeddingDay ? -1 : 1;
      }

      // Finally, sort by timestamp (oldest first for fairness)
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  /**
   * Create priority-based batches for processing
   */
  createPriorityBatches(
    items: SyncQueueItem[],
    context: PriorityContext,
    maxBatchSize: number = 10,
  ): SyncQueueItem[][] {
    const sortedItems = this.prioritizeQueue(items, context);
    const batches: SyncQueueItem[][] = [];

    // Critical batch (priority 9-10)
    const critical = sortedItems.filter((item) => (item.priority || 0) >= 9);
    if (critical.length > 0) {
      // Process critical items in smaller batches for speed
      for (let i = 0; i < critical.length; i += Math.min(maxBatchSize / 2, 5)) {
        batches.push(critical.slice(i, i + Math.min(maxBatchSize / 2, 5)));
      }
    }

    // High priority batch (priority 7-8)
    const high = sortedItems.filter((item) => {
      const priority = item.priority || 0;
      return priority >= 7 && priority < 9;
    });
    if (high.length > 0) {
      for (let i = 0; i < high.length; i += Math.min(maxBatchSize, 8)) {
        batches.push(high.slice(i, i + Math.min(maxBatchSize, 8)));
      }
    }

    // Normal priority batch (priority < 7)
    const normal = sortedItems.filter((item) => (item.priority || 0) < 7);
    if (normal.length > 0) {
      for (let i = 0; i < normal.length; i += maxBatchSize) {
        batches.push(normal.slice(i, i + maxBatchSize));
      }
    }

    return batches;
  }

  /**
   * Check if immediate processing is required
   */
  requiresImmediateProcessing(
    item: SyncQueueItem,
    context: PriorityContext,
  ): boolean {
    const analysis = this.calculatePriority(item, context);

    // Wedding day coordinator changes are always immediate
    if (analysis.isWeddingDayCritical && context.userRole === 'coordinator') {
      return true;
    }

    // Critical priority items during wedding day
    if (analysis.finalPriority >= 9 && this.isWeddingDay(context)) {
      return true;
    }

    // Critical issues always immediate
    if (item.type === 'issue_create' || item.type === 'issue_update') {
      const severity = item.data?.severity;
      return severity === 'critical' || severity === 'high';
    }

    return false;
  }

  /**
   * Initialize default priority rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // Wedding Day Rules (Highest Priority)
      {
        id: 'wedding-day-coordinator',
        name: 'Wedding Day Coordinator Priority',
        description: 'Active coordinator changes during wedding day',
        condition: (item, context) =>
          this.isWeddingDay(context) &&
          context.userRole === 'coordinator' &&
          context.isActiveCoordinator === true,
        priority: 10,
        weight: 1.0,
        active: true,
      },

      {
        id: 'wedding-day-timeline',
        name: 'Wedding Day Timeline Changes',
        description: 'Timeline updates during wedding day',
        condition: (item, context) =>
          this.isWeddingDay(context) && item.type === 'timeline_update',
        priority: 9,
        weight: 1.0,
        active: true,
      },

      {
        id: 'wedding-day-vendor-checkin',
        name: 'Wedding Day Vendor Check-ins',
        description: 'Vendor check-ins and status updates during wedding day',
        condition: (item, context) =>
          this.isWeddingDay(context) &&
          (item.type === 'vendor_checkin' || item.type === 'status_update'),
        priority: 8,
        weight: 1.0,
        active: true,
      },

      {
        id: 'wedding-day-issues',
        name: 'Wedding Day Issue Management',
        description: 'Issue creation and updates during wedding day',
        condition: (item, context) =>
          this.isWeddingDay(context) &&
          (item.type === 'issue_create' || item.type === 'issue_update'),
        priority: 9,
        weight: 1.0,
        active: true,
      },

      // Role-Based Priority Rules
      {
        id: 'coordinator-changes',
        name: 'Coordinator Changes',
        description: 'Changes made by coordinators',
        condition: (item, context) => context.userRole === 'coordinator',
        priority: 7,
        weight: 0.8,
        active: true,
      },

      {
        id: 'photographer-updates',
        name: 'Photographer Updates',
        description: 'Updates from photographers',
        condition: (item, context) => context.userRole === 'photographer',
        priority: 6,
        weight: 0.6,
        active: true,
      },

      {
        id: 'vendor-communications',
        name: 'Vendor Communications',
        description: 'Vendor status and communication updates',
        condition: (item, context) =>
          context.userRole === 'vendor' ||
          item.type === 'vendor_checkin' ||
          item.type === 'status_update',
        priority: 6,
        weight: 0.6,
        active: true,
      },

      // Content-Based Priority Rules
      {
        id: 'critical-issues',
        name: 'Critical Issues',
        description: 'Critical severity issues',
        condition: (item, context) =>
          (item.type === 'issue_create' || item.type === 'issue_update') &&
          item.data?.severity === 'critical',
        priority: 9,
        weight: 1.0,
        active: true,
      },

      {
        id: 'high-issues',
        name: 'High Priority Issues',
        description: 'High severity issues',
        condition: (item, context) =>
          (item.type === 'issue_create' || item.type === 'issue_update') &&
          item.data?.severity === 'high',
        priority: 7,
        weight: 0.8,
        active: true,
      },

      {
        id: 'timeline-critical',
        name: 'Critical Timeline Events',
        description: 'Critical timeline events',
        condition: (item, context) =>
          item.type === 'timeline_update' && item.data?.priority === 'critical',
        priority: 8,
        weight: 0.9,
        active: true,
      },

      // Time-Based Priority Rules
      {
        id: 'pre-wedding-24h',
        name: '24 Hour Pre-Wedding',
        description: 'Actions within 24 hours of wedding',
        condition: (item, context) => this.isWithinWeddingWindow(context, 24),
        priority: 7,
        weight: 0.7,
        active: true,
      },

      {
        id: 'pre-wedding-1h',
        name: '1 Hour Pre-Wedding',
        description: 'Actions within 1 hour of wedding',
        condition: (item, context) => this.isWithinWeddingWindow(context, 1),
        priority: 8,
        weight: 0.9,
        active: true,
      },

      // Location-Based Priority Rules
      {
        id: 'venue-location',
        name: 'At Venue Location',
        description: 'Actions performed at the wedding venue',
        condition: (item, context) => context.locationContext === 'venue',
        priority: 6,
        weight: 0.5,
        active: true,
      },

      // Degradation Rules (Lower Priority)
      {
        id: 'draft-content',
        name: 'Draft Content',
        description: 'Draft saves and non-critical updates',
        condition: (item, context) => item.type === 'form_draft',
        priority: 2,
        weight: -0.5,
        active: true,
      },

      {
        id: 'viral-actions',
        name: 'Social/Viral Actions',
        description: 'Social sharing and viral actions',
        condition: (item, context) => item.type === 'viral_action',
        priority: 3,
        weight: -0.3,
        active: true,
      },
    ];
  }

  /**
   * Calculate base priority score
   */
  private calculateBaseScore(
    item: SyncQueueItem,
    context: PriorityContext,
  ): number {
    // Base scores by action type
    const typeScores = {
      issue_create: 7,
      issue_update: 6,
      timeline_update: 5,
      vendor_checkin: 5,
      status_update: 4,
      form_submission: 4,
      client_update: 3,
      note_create: 3,
      form_draft: 2,
      viral_action: 2,
    };

    return typeScores[item.type] || 3;
  }

  /**
   * Apply all priority rules to an item
   */
  private applyPriorityRules(
    item: SyncQueueItem,
    context: PriorityContext,
  ): Array<{ rule: PriorityRule; applies: boolean; boost: number }> {
    return this.rules
      .filter((rule) => rule.active)
      .map((rule) => {
        const applies = rule.condition(item, context);
        const boost = applies ? rule.priority * rule.weight : 0;
        return { rule, applies, boost };
      });
  }

  /**
   * Generate human-readable explanation for priority calculation
   */
  private generatePriorityExplanation(
    item: SyncQueueItem,
    context: PriorityContext,
    appliedRules: string[],
    finalPriority: number,
  ): string {
    const baseExplanation = `Base priority for ${item.type}: ${this.calculateBaseScore(item, context)}`;

    if (appliedRules.length === 0) {
      return `${baseExplanation} (no additional rules applied)`;
    }

    const ruleExplanations = appliedRules
      .map((ruleName) => {
        const rule = this.rules.find((r) => r.name === ruleName);
        return rule ? `+${rule.description}` : ruleName;
      })
      .join(', ');

    let contextInfo = '';
    if (this.isWeddingDay(context)) {
      contextInfo = ' [WEDDING DAY]';
    } else if (this.isWithinWeddingWindow(context, 24)) {
      contextInfo = ' [PRE-WEDDING]';
    }

    return `${baseExplanation}, ${ruleExplanations} = Priority ${finalPriority}${contextInfo}`;
  }

  /**
   * Estimate processing time based on priority
   */
  private estimateProcessingTime(
    priority: number,
    context: PriorityContext,
  ): number {
    // Higher priority = faster processing
    if (priority >= 9) return 0; // Immediate
    if (priority >= 7) return 5; // Within 5 seconds
    if (priority >= 5) return 15; // Within 15 seconds
    if (priority >= 3) return 30; // Within 30 seconds
    return 60; // Within 1 minute
  }

  /**
   * Check if item is wedding day critical
   */
  private isWeddingDayCritical(
    item: SyncQueueItem,
    context: PriorityContext,
  ): boolean {
    return (
      this.isWeddingDay(context) &&
      (context.userRole === 'coordinator' ||
        item.type === 'issue_create' ||
        item.type === 'issue_update' ||
        item.type === 'timeline_update' ||
        item.data?.severity === 'critical' ||
        item.data?.severity === 'high')
    );
  }

  /**
   * Check if it's currently the wedding day
   */
  private isWeddingDay(context: PriorityContext): boolean {
    if (!context.weddingDate) return false;

    const currentTime = context.currentTime
      ? parseISO(context.currentTime)
      : new Date();
    const weddingDate = parseISO(context.weddingDate);

    // Consider it "wedding day" from 6 AM on the wedding date until 2 AM the next day
    const weddingDayStart = new Date(weddingDate);
    weddingDayStart.setHours(6, 0, 0, 0);

    const weddingDayEnd = new Date(weddingDate);
    weddingDayEnd.setDate(weddingDayEnd.getDate() + 1);
    weddingDayEnd.setHours(2, 0, 0, 0);

    return (
      isAfter(currentTime, weddingDayStart) &&
      isBefore(currentTime, weddingDayEnd)
    );
  }

  /**
   * Check if within wedding window (hours before wedding)
   */
  private isWithinWeddingWindow(
    context: PriorityContext,
    hours: number,
  ): boolean {
    if (!context.weddingDate) return false;

    const currentTime = context.currentTime
      ? parseISO(context.currentTime)
      : new Date();
    const weddingDate = parseISO(context.weddingDate);
    const windowStart = addMinutes(weddingDate, -hours * 60);

    return (
      isAfter(currentTime, windowStart) && isBefore(currentTime, weddingDate)
    );
  }

  /**
   * Update priority rules dynamically
   */
  updateRule(ruleId: string, updates: Partial<PriorityRule>): boolean {
    const ruleIndex = this.rules.findIndex((rule) => rule.id === ruleId);
    if (ruleIndex === -1) return false;

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Add custom priority rule
   */
  addCustomRule(rule: PriorityRule): void {
    this.rules.push(rule);
  }

  /**
   * Get current priority rules
   */
  getPriorityRules(): PriorityRule[] {
    return [...this.rules];
  }

  /**
   * Get priority statistics for monitoring
   */
  getQueueStatistics(
    items: SyncQueueItem[],
    context: PriorityContext,
  ): {
    totalItems: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    weddingDayItems: number;
    estimatedProcessingTime: number;
  } {
    const analyses = items.map((item) => this.calculatePriority(item, context));

    const criticalCount = analyses.filter((a) => a.finalPriority >= 9).length;
    const highCount = analyses.filter(
      (a) => a.finalPriority >= 7 && a.finalPriority < 9,
    ).length;
    const mediumCount = analyses.filter(
      (a) => a.finalPriority >= 4 && a.finalPriority < 7,
    ).length;
    const lowCount = analyses.filter((a) => a.finalPriority < 4).length;
    const weddingDayItems = analyses.filter(
      (a) => a.isWeddingDayCritical,
    ).length;

    const estimatedProcessingTime = analyses.reduce(
      (total, a) => total + a.timeToProcess,
      0,
    );

    return {
      totalItems: items.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      weddingDayItems,
      estimatedProcessingTime,
    };
  }
}

// Singleton instance
export const syncPriorityManager = new SyncPriorityManager();
