/**
 * WS-342 Real-Time Wedding Collaboration - Integration Conflict Resolver
 * Team C: Integration & System Architecture
 */

import type {
  IntegrationConflict,
  ConflictResolution,
  ConflictResolutionStrategy,
} from './types/integration';

import type { VendorConflict } from './types/vendor-systems';
import { createSupabaseClient } from '@/lib/supabase';

export class IntegrationConflictResolver {
  private supabase = createSupabaseClient();

  /**
   * Resolve integration conflict between systems
   */
  async resolveIntegrationConflict(
    conflict: IntegrationConflict,
  ): Promise<ConflictResolution> {
    try {
      // Determine resolution strategy based on conflict type and business rules
      const strategy = this.determineResolutionStrategy(conflict);

      // Apply resolution strategy
      const resolvedData = await this.applyResolutionStrategy(
        conflict,
        strategy,
      );

      const resolution: ConflictResolution = {
        strategy,
        resolvedData,
        resolvedBy: 'system',
        resolvedAt: new Date(),
        notes: `Automatically resolved using ${strategy} strategy`,
      };

      // Log resolution
      await this.logConflictResolution(conflict.id, resolution);

      return resolution;
    } catch (error) {
      console.error('Failed to resolve integration conflict:', error);
      throw error;
    }
  }

  /**
   * Resolve vendor-specific conflict
   */
  async resolveVendorConflict(
    conflict: VendorConflict,
  ): Promise<ConflictResolution> {
    try {
      const strategy = this.determineVendorResolutionStrategy(conflict);
      const resolvedData = await this.resolveVendorData(conflict, strategy);

      const resolution: ConflictResolution = {
        strategy,
        resolvedData,
        resolvedBy: 'system',
        resolvedAt: new Date(),
        notes: `Vendor conflict resolved: ${conflict.type}`,
      };

      return resolution;
    } catch (error) {
      console.error('Failed to resolve vendor conflict:', error);
      throw error;
    }
  }

  /**
   * Get pending conflicts for a wedding
   */
  async getPendingConflicts(weddingId: string): Promise<IntegrationConflict[]> {
    const { data: conflicts } = await this.supabase
      .from('integration_conflicts')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    return conflicts || [];
  }

  /**
   * Escalate conflict for manual resolution
   */
  async escalateConflict(conflictId: string, reason: string): Promise<void> {
    await this.supabase
      .from('integration_conflicts')
      .update({
        status: 'escalated',
        escalation_reason: reason,
        escalated_at: new Date(),
      })
      .eq('id', conflictId);

    // Send notification to administrators
    await this.notifyAdministrators(conflictId, reason);
  }

  /**
   * Apply manual resolution to conflict
   */
  async applyManualResolution(
    conflictId: string,
    resolution: ConflictResolution,
    userId: string,
  ): Promise<void> {
    // Update conflict with manual resolution
    await this.supabase
      .from('integration_conflicts')
      .update({
        status: 'resolved',
        resolution_data: resolution,
        resolved_by: userId,
        resolved_at: new Date(),
      })
      .eq('id', conflictId);

    // Apply the resolution to affected systems
    await this.propagateResolution(conflictId, resolution);
  }

  // Private helper methods

  private determineResolutionStrategy(
    conflict: IntegrationConflict,
  ): ConflictResolutionStrategy {
    // Business rules for automatic conflict resolution

    switch (conflict.conflictType) {
      case 'data_mismatch':
        return this.resolveDataMismatch(conflict);

      case 'timing_conflict':
        return this.resolveTimingConflict(conflict);

      case 'permission_conflict':
        return 'manual_resolution'; // Always require manual review for permissions

      case 'validation_failure':
        return 'wedsync_priority'; // Trust WedSync validation

      case 'business_rule_violation':
        return 'manual_resolution'; // Business rules need human review

      default:
        return 'manual_resolution';
    }
  }

  private resolveDataMismatch(
    conflict: IntegrationConflict,
  ): ConflictResolutionStrategy {
    // Check data freshness - newer data usually wins
    const sourceData = conflict.conflictingData.source;
    const targetData = conflict.conflictingData.target;

    if (sourceData.lastModified && targetData.lastModified) {
      const sourceTime = new Date(sourceData.lastModified);
      const targetTime = new Date(targetData.lastModified);

      return sourceTime > targetTime ? 'vendor_priority' : 'wedsync_priority';
    }

    // If no timestamps, prefer WedSync as source of truth
    return 'wedsync_priority';
  }

  private resolveTimingConflict(
    conflict: IntegrationConflict,
  ): ConflictResolutionStrategy {
    // For timing conflicts, check if it's a wedding day
    const conflictData = conflict.conflictingData;
    const isWeddingDay = this.checkIfWeddingDay(conflictData);

    if (isWeddingDay) {
      // On wedding day, prefer the most recent update
      return 'latest_wins';
    }

    // For planning phase, allow merging of schedule changes
    return 'merge_changes';
  }

  private checkIfWeddingDay(conflictData: any): boolean {
    // Check if conflict is happening on the actual wedding day
    if (conflictData.source.weddingDate || conflictData.target.weddingDate) {
      const weddingDate = new Date(
        conflictData.source.weddingDate || conflictData.target.weddingDate,
      );
      const today = new Date();

      return this.isSameDay(weddingDate, today);
    }

    return false;
  }

  private async applyResolutionStrategy(
    conflict: IntegrationConflict,
    strategy: ConflictResolutionStrategy,
  ): Promise<any> {
    const sourceData = conflict.conflictingData.source;
    const targetData = conflict.conflictingData.target;

    switch (strategy) {
      case 'wedsync_priority':
        return targetData; // WedSync is target

      case 'vendor_priority':
        return sourceData; // Vendor system is source

      case 'latest_wins':
        return this.selectLatestData(sourceData, targetData);

      case 'merge_changes':
        return this.mergeData(sourceData, targetData);

      default:
        throw new Error(`Unsupported resolution strategy: ${strategy}`);
    }
  }

  private selectLatestData(sourceData: any, targetData: any): any {
    const sourceTime = sourceData.lastModified
      ? new Date(sourceData.lastModified)
      : new Date(0);
    const targetTime = targetData.lastModified
      ? new Date(targetData.lastModified)
      : new Date(0);

    return sourceTime > targetTime ? sourceData : targetData;
  }

  private mergeData(sourceData: any, targetData: any): any {
    // Intelligent merge of conflicting data
    const merged = { ...targetData }; // Start with target as base

    // Merge non-conflicting fields from source
    for (const [key, value] of Object.entries(sourceData)) {
      if (!targetData.hasOwnProperty(key)) {
        merged[key] = value;
      } else if (
        this.shouldOverrideField(key, sourceData[key], targetData[key])
      ) {
        merged[key] = value;
      }
    }

    // Update merge metadata
    merged.mergedAt = new Date();
    merged.mergedFrom = ['source', 'target'];

    return merged;
  }

  private shouldOverrideField(
    fieldName: string,
    sourceValue: any,
    targetValue: any,
  ): boolean {
    // Business logic for field-level merge decisions
    const priorityFields = ['weddingDate', 'ceremonyTime', 'receptionTime'];

    if (priorityFields.includes(fieldName)) {
      // For critical wedding timing fields, prefer the most recent update
      return (
        sourceValue &&
        (!targetValue || new Date(sourceValue) !== new Date(targetValue))
      );
    }

    // For other fields, prefer non-empty values
    return sourceValue && !targetValue;
  }

  private determineVendorResolutionStrategy(
    conflict: VendorConflict,
  ): ConflictResolutionStrategy {
    switch (conflict.type) {
      case 'timeline_mismatch':
        return 'merge_changes'; // Merge timeline changes

      case 'payment_discrepancy':
        return 'manual_resolution'; // Always manual for payments

      case 'client_data_difference':
        return 'latest_wins'; // Most recent client data wins

      case 'package_variation':
        return 'vendor_priority'; // Trust vendor's package details

      case 'date_conflict':
        return 'manual_resolution'; // Date conflicts need human review

      default:
        return 'manual_resolution';
    }
  }

  private async resolveVendorData(
    conflict: VendorConflict,
    strategy: ConflictResolutionStrategy,
  ): Promise<any> {
    switch (strategy) {
      case 'vendor_priority':
        return conflict.vendorValue;

      case 'wedsync_priority':
        return conflict.wedsyncValue;

      case 'latest_wins':
        // Assume vendor data is more recent if it's different
        return conflict.vendorValue !== conflict.wedsyncValue
          ? conflict.vendorValue
          : conflict.wedsyncValue;

      case 'merge_changes':
        return this.mergeVendorData(
          conflict.vendorValue,
          conflict.wedsyncValue,
        );

      default:
        throw new Error(`Cannot auto-resolve with strategy: ${strategy}`);
    }
  }

  private mergeVendorData(vendorValue: any, wedsyncValue: any): any {
    if (Array.isArray(vendorValue) && Array.isArray(wedsyncValue)) {
      // Merge arrays by combining unique items
      const combined = [...wedsyncValue];
      for (const item of vendorValue) {
        if (
          !combined.some((existingItem) => this.itemsEqual(existingItem, item))
        ) {
          combined.push(item);
        }
      }
      return combined;
    }

    if (typeof vendorValue === 'object' && typeof wedsyncValue === 'object') {
      // Merge objects
      return { ...wedsyncValue, ...vendorValue };
    }

    // For primitive values, prefer vendor data
    return vendorValue;
  }

  private itemsEqual(item1: any, item2: any): boolean {
    if (item1 === item2) return true;

    if (typeof item1 === 'object' && typeof item2 === 'object') {
      // Simple object comparison - could be enhanced
      return JSON.stringify(item1) === JSON.stringify(item2);
    }

    return false;
  }

  private async logConflictResolution(
    conflictId: string,
    resolution: ConflictResolution,
  ): Promise<void> {
    await this.supabase.from('conflict_resolutions').insert({
      conflict_id: conflictId,
      strategy: resolution.strategy,
      resolved_data: resolution.resolvedData,
      resolved_by: resolution.resolvedBy,
      resolved_at: resolution.resolvedAt,
      notes: resolution.notes,
    });
  }

  private async notifyAdministrators(
    conflictId: string,
    reason: string,
  ): Promise<void> {
    // TODO: Implement admin notification system
    console.log(`Conflict ${conflictId} escalated: ${reason}`);
  }

  private async propagateResolution(
    conflictId: string,
    resolution: ConflictResolution,
  ): Promise<void> {
    // TODO: Implement resolution propagation to affected systems
    console.log(
      `Propagating resolution for conflict ${conflictId}:`,
      resolution,
    );
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}
