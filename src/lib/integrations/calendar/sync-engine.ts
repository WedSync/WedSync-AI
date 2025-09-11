/**
 * Calendar Sync Engine with Conflict Resolution
 * Orchestrates multi-provider calendar synchronization for wedding events
 */

import {
  CalendarConnection,
  UnifiedWeddingEvent,
  CalendarEvent,
  BatchResult,
  ConflictInfo,
  WeddingEventType,
  VendorRole,
  CalendarProvider,
  SyncResult,
  ConflictResolution,
  ConflictType,
  SyncAttempt,
  IntegrationError,
} from './types';
import { GoogleCalendarService } from './providers/google-calendar-service';
import { OutlookCalendarService } from './providers/outlook-calendar-service';
import { AppleCalendarService } from './providers/apple-calendar-service';
import { CalendarService } from './types';

export interface SyncEngineConfig {
  maxConcurrentSyncs: number;
  retryAttempts: number;
  batchSize: number;
  weddingDayPriorityMode: boolean;
  conflictResolutionStrategy:
    | 'vendor_priority'
    | 'timeline_priority'
    | 'manual_review';
}

export interface SyncMetrics {
  totalEvents: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsDetected: number;
  conflictsResolved: number;
  averageSyncTime: number;
  providerStats: Record<
    CalendarProvider,
    {
      events: number;
      successes: number;
      failures: number;
      avgResponseTime: number;
    }
  >;
}

export class CalendarSyncEngine {
  private services: Map<CalendarProvider, CalendarService>;
  private activeSyncs: Map<string, SyncAttempt>;
  private config: SyncEngineConfig;
  private metrics: SyncMetrics;

  constructor(config: Partial<SyncEngineConfig> = {}) {
    this.config = {
      maxConcurrentSyncs: 10,
      retryAttempts: 3,
      batchSize: 50,
      weddingDayPriorityMode: false,
      conflictResolutionStrategy: 'vendor_priority',
      ...config,
    };

    this.services = new Map([
      ['google', new GoogleCalendarService()],
      ['outlook', new OutlookCalendarService()],
      ['apple', new AppleCalendarService()],
    ]);

    this.activeSyncs = new Map();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Sync wedding timeline events to all connected calendars
   * Main entry point for wedding timeline synchronization
   */
  async syncWeddingTimeline(
    weddingId: string,
    timelineEvents: UnifiedWeddingEvent[],
  ): Promise<SyncResult> {
    const syncId = `sync-${weddingId}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Get all calendar connections for this wedding
      const connections = await this.getWeddingConnections(weddingId);

      if (connections.length === 0) {
        return {
          syncId,
          status: 'completed',
          totalEvents: timelineEvents.length,
          successfulSyncs: 0,
          failedSyncs: 0,
          conflicts: [],
          duration: Date.now() - startTime,
          details: 'No calendar connections found for wedding',
        };
      }

      // Check for conflicts before syncing
      const conflicts = await this.detectConflicts(timelineEvents, connections);

      if (conflicts.length > 0 && !this.config.weddingDayPriorityMode) {
        // Attempt to resolve conflicts automatically
        const resolvedConflicts = await this.resolveConflicts(
          conflicts,
          timelineEvents,
        );

        // Update timeline events with conflict resolutions
        timelineEvents = this.applyConflictResolutions(
          timelineEvents,
          resolvedConflicts,
        );
      }

      // Create sync attempt record
      const syncAttempt: SyncAttempt = {
        id: syncId,
        weddingId,
        startTime: new Date(startTime),
        status: 'in_progress',
        totalEvents: timelineEvents.length,
        processedEvents: 0,
        connections: connections.map((c) => c.id),
        conflicts: conflicts.length,
      };

      this.activeSyncs.set(syncId, syncAttempt);

      // Execute parallel sync to all providers
      const syncResults = await this.executeBatchSync(
        timelineEvents,
        connections,
      );

      // Calculate final results
      const totalSuccessful = syncResults.reduce(
        (sum, result) => sum + result.successful.length,
        0,
      );
      const totalFailed = syncResults.reduce(
        (sum, result) => sum + result.failed.length,
        0,
      );

      // Update sync status
      syncAttempt.status = totalFailed > 0 ? 'partial_failure' : 'completed';
      syncAttempt.endTime = new Date();
      syncAttempt.processedEvents = totalSuccessful + totalFailed;

      // Update metrics
      this.updateMetrics(syncResults, Date.now() - startTime);

      // Store sync results for audit trail
      await this.storeSyncResults(syncId, syncResults);

      return {
        syncId,
        status: syncAttempt.status,
        totalEvents: timelineEvents.length,
        successfulSyncs: totalSuccessful,
        failedSyncs: totalFailed,
        conflicts: conflicts.filter((c) => !c.resolved),
        duration: Date.now() - startTime,
        details: `Synced ${totalSuccessful}/${timelineEvents.length * connections.length} events across ${connections.length} calendars`,
        providerResults: this.groupResultsByProvider(syncResults, connections),
      };
    } catch (error) {
      // Mark sync as failed
      const syncAttempt = this.activeSyncs.get(syncId);
      if (syncAttempt) {
        syncAttempt.status = 'failed';
        syncAttempt.endTime = new Date();
        syncAttempt.error = error.message;
      }

      throw new IntegrationError(
        'SYNC_ENGINE_FAILURE',
        `Wedding timeline sync failed for ${weddingId}: ${error.message}`,
        { weddingId, syncId, error: error.message },
      );
    } finally {
      this.activeSyncs.delete(syncId);
    }
  }

  /**
   * Handle webhook notifications from calendar providers
   * Processes changes and propagates them to other connected calendars
   */
  async handleWebhookNotification(
    provider: CalendarProvider,
    payload: any,
    signature: string,
  ): Promise<void> {
    const service = this.services.get(provider);
    if (!service) {
      throw new Error(`Unknown calendar provider: ${provider}`);
    }

    // Validate webhook signature
    if (!service.validateWebhook(payload, signature)) {
      throw new IntegrationError(
        'WEBHOOK_VALIDATION_FAILED',
        `Invalid webhook signature from ${provider}`,
        { provider, payload },
      );
    }

    try {
      // Parse webhook payload to extract changed events
      const changedEvents = await this.parseWebhookPayload(provider, payload);

      if (changedEvents.length === 0) {
        return; // No actionable changes
      }

      // For each changed event, propagate to other connected calendars
      for (const eventChange of changedEvents) {
        await this.propagateEventChange(eventChange);
      }
    } catch (error) {
      throw new IntegrationError(
        'WEBHOOK_PROCESSING_FAILED',
        `Failed to process ${provider} webhook: ${error.message}`,
        { provider, error: error.message },
      );
    }
  }

  /**
   * Detect scheduling conflicts across all connected calendars
   */
  private async detectConflicts(
    timelineEvents: UnifiedWeddingEvent[],
    connections: CalendarConnection[],
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    for (const event of timelineEvents) {
      // Check for time conflicts with existing events
      for (const connection of connections) {
        const service = this.services.get(connection.provider);
        if (!service) continue;

        try {
          const availability = await service.checkAvailability(
            connection,
            event.startTime,
            event.endTime,
            event.vendorRole,
          );

          if (!availability.isAvailable) {
            conflicts.push(
              ...availability.conflicts.map((conflict) => ({
                ...conflict,
                affectedEvent: event,
                connection,
                severity: this.calculateConflictSeverity(event, conflict),
                suggestedTimes: availability.suggestedTimes,
                resolved: false,
              })),
            );
          }
        } catch (error) {
          console.warn(
            `Failed to check availability for ${connection.provider}:`,
            error,
          );
        }
      }

      // Check for wedding-specific conflicts (e.g., photographer can't be in two places)
      const weddingConflicts = await this.detectWeddingLogicConflicts(
        event,
        timelineEvents,
      );
      conflicts.push(...weddingConflicts);
    }

    return conflicts;
  }

  /**
   * Resolve conflicts automatically based on configured strategy
   */
  private async resolveConflicts(
    conflicts: ConflictInfo[],
    timelineEvents: UnifiedWeddingEvent[],
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      let resolution: ConflictResolution;

      switch (this.config.conflictResolutionStrategy) {
        case 'vendor_priority':
          resolution = await this.resolveByVendorPriority(conflict);
          break;
        case 'timeline_priority':
          resolution = await this.resolveByTimelinePriority(
            conflict,
            timelineEvents,
          );
          break;
        case 'manual_review':
          resolution = this.createManualReviewResolution(conflict);
          break;
        default:
          resolution = await this.resolveByVendorPriority(conflict);
      }

      if (resolution.action !== 'manual_review') {
        conflict.resolved = true;
        conflict.resolution = resolution;
      }

      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Execute batch synchronization across all providers
   */
  private async executeBatchSync(
    events: UnifiedWeddingEvent[],
    connections: CalendarConnection[],
  ): Promise<BatchResult[]> {
    const syncPromises: Promise<BatchResult>[] = [];

    // Group connections by provider for efficient batching
    const connectionsByProvider = this.groupConnectionsByProvider(connections);

    for (const [provider, providerConnections] of connectionsByProvider) {
      const service = this.services.get(provider);
      if (!service) continue;

      for (const connection of providerConnections) {
        // Create batch sync promise for this connection
        const syncPromise = this.syncToConnection(service, connection, events);
        syncPromises.push(syncPromise);

        // Respect max concurrent syncs limit
        if (syncPromises.length >= this.config.maxConcurrentSyncs) {
          const results = await Promise.allSettled(syncPromises);
          const batchResults = results.map((r) =>
            r.status === 'fulfilled'
              ? r.value
              : this.createFailedBatchResult(events, r.reason),
          );

          // Clear promises array and continue
          syncPromises.length = 0;

          // Return partial results (in production, you'd accumulate them)
          return batchResults;
        }
      }
    }

    // Execute remaining sync promises
    if (syncPromises.length > 0) {
      const results = await Promise.allSettled(syncPromises);
      return results.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : this.createFailedBatchResult(events, r.reason),
      );
    }

    return [];
  }

  /**
   * Sync events to a specific calendar connection
   */
  private async syncToConnection(
    service: CalendarService,
    connection: CalendarConnection,
    events: UnifiedWeddingEvent[],
  ): Promise<BatchResult> {
    const startTime = Date.now();

    try {
      // Check if tokens need refresh
      if (this.shouldRefreshTokens(connection)) {
        await this.refreshConnectionTokens(connection);
      }

      // Execute batch create with the service
      const result = await service.batchCreateEvents(connection, events);

      // Record timing metrics
      const responseTime = Date.now() - startTime;
      this.updateProviderMetrics(
        connection.provider,
        events.length,
        result,
        responseTime,
      );

      return result;
    } catch (error) {
      // Record failure metrics
      this.updateProviderMetrics(
        connection.provider,
        events.length,
        null,
        Date.now() - startTime,
      );

      throw new IntegrationError(
        'CONNECTION_SYNC_FAILED',
        `Failed to sync to ${connection.provider}: ${error.message}`,
        { connection: connection.id, error: error.message },
      );
    }
  }

  /**
   * Propagate event changes to other connected calendars
   */
  private async propagateEventChange(eventChange: any): Promise<void> {
    // Get the original wedding event and all its connections
    const weddingEvent = await this.getWeddingEventById(
      eventChange.weddingEventId,
    );
    const connections = await this.getEventConnections(
      eventChange.weddingEventId,
    );

    // Update the event in all other connected calendars
    const updatePromises = connections
      .filter((connection) => connection.id !== eventChange.sourceConnectionId)
      .map(async (connection) => {
        const service = this.services.get(connection.provider);
        if (!service) return;

        try {
          if (eventChange.type === 'deleted') {
            await service.deleteEvent(connection, eventChange.externalEventId);
          } else {
            await service.updateEvent(
              connection,
              eventChange.externalEventId,
              weddingEvent,
            );
          }
        } catch (error) {
          console.error(
            `Failed to propagate change to ${connection.provider}:`,
            error,
          );
        }
      });

    await Promise.allSettled(updatePromises);
  }

  /**
   * Detect wedding-specific logic conflicts
   */
  private async detectWeddingLogicConflicts(
    event: UnifiedWeddingEvent,
    allEvents: UnifiedWeddingEvent[],
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    // Check for vendor double-booking
    const overlappingEvents = allEvents.filter(
      (e) =>
        e.id !== event.id &&
        e.vendorRole === event.vendorRole &&
        this.eventsOverlap(e, event),
    );

    for (const overlapping of overlappingEvents) {
      conflicts.push({
        type: 'vendor_double_booking',
        severity: 'high',
        message: `${event.vendorRole} double-booked: ${event.title} overlaps with ${overlapping.title}`,
        affectedEvent: event,
        conflictingEvent: overlapping,
        startTime: event.startTime,
        endTime: event.endTime,
        resolved: false,
      });
    }

    // Check for critical path violations
    if (event.eventType === 'ceremony' && event.isWeddingCritical) {
      const setupConflicts = this.checkCeremonySetupConflicts(event, allEvents);
      conflicts.push(...setupConflicts);
    }

    return conflicts;
  }

  /**
   * Check if two events overlap in time
   */
  private eventsOverlap(
    event1: UnifiedWeddingEvent,
    event2: UnifiedWeddingEvent,
  ): boolean {
    return (
      event1.startTime < event2.endTime && event2.startTime < event1.endTime
    );
  }

  /**
   * Calculate conflict severity based on wedding impact
   */
  private calculateConflictSeverity(
    event: UnifiedWeddingEvent,
    conflict: any,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (event.isWeddingCritical && event.eventType === 'ceremony') {
      return 'critical';
    }

    if (event.isWeddingCritical) {
      return 'high';
    }

    if (
      event.eventType === 'vendor_setup' ||
      event.eventType === 'vendor_breakdown'
    ) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Resolve conflict by vendor priority
   */
  private async resolveByVendorPriority(
    conflict: ConflictInfo,
  ): Promise<ConflictResolution> {
    // Define vendor priority order for weddings
    const vendorPriority = {
      photographer: 1,
      videographer: 2,
      officiant: 3,
      venue_coordinator: 4,
      florist: 5,
      caterer: 6,
      dj: 7,
      other: 8,
    };

    const eventPriority =
      vendorPriority[conflict.affectedEvent.vendorRole] || 8;
    const conflictPriority = conflict.conflictingEvent
      ? vendorPriority[conflict.conflictingEvent.vendorRole] || 8
      : 9;

    if (eventPriority < conflictPriority) {
      // Keep the higher priority event, suggest alternative for lower priority
      return {
        conflictId: `conflict-${Date.now()}`,
        action: 'reschedule_conflicting',
        suggestedTime: conflict.suggestedTimes?.[0],
        reason: `${conflict.affectedEvent.vendorRole} has higher priority than ${conflict.conflictingEvent?.vendorRole}`,
        confidence: 0.8,
      };
    } else {
      return {
        conflictId: `conflict-${Date.now()}`,
        action: 'reschedule_affected',
        suggestedTime: conflict.suggestedTimes?.[0],
        reason: 'Conflicting event has higher vendor priority',
        confidence: 0.8,
      };
    }
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): SyncMetrics {
    return {
      totalEvents: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      averageSyncTime: 0,
      providerStats: {
        google: { events: 0, successes: 0, failures: 0, avgResponseTime: 0 },
        outlook: { events: 0, successes: 0, failures: 0, avgResponseTime: 0 },
        apple: { events: 0, successes: 0, failures: 0, avgResponseTime: 0 },
      },
    };
  }

  /**
   * Update sync metrics
   */
  private updateMetrics(results: BatchResult[], duration: number): void {
    const totalSuccessful = results.reduce(
      (sum, r) => sum + r.successful.length,
      0,
    );
    const totalFailed = results.reduce((sum, r) => sum + r.failed.length, 0);

    this.metrics.totalEvents += totalSuccessful + totalFailed;
    this.metrics.successfulSyncs += totalSuccessful;
    this.metrics.failedSyncs += totalFailed;

    // Update average sync time
    const totalSyncs = this.metrics.successfulSyncs + this.metrics.failedSyncs;
    this.metrics.averageSyncTime =
      (this.metrics.averageSyncTime *
        (totalSyncs - totalSuccessful - totalFailed) +
        duration) /
      totalSyncs;
  }

  /**
   * Get current sync metrics
   */
  getSyncMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Enable wedding day priority mode
   */
  enableWeddingDayMode(): void {
    this.config.weddingDayPriorityMode = true;
    this.config.maxConcurrentSyncs = 20; // Increase concurrency for wedding day
    this.config.retryAttempts = 5; // More retries on wedding day
  }

  /**
   * Get active sync operations
   */
  getActiveSyncs(): SyncAttempt[] {
    return Array.from(this.activeSyncs.values());
  }

  // Helper methods (simplified implementations)
  private async getWeddingConnections(
    weddingId: string,
  ): Promise<CalendarConnection[]> {
    // Implementation would query database for calendar connections
    // This is a placeholder
    return [];
  }

  private async getWeddingEventById(
    eventId: string,
  ): Promise<UnifiedWeddingEvent> {
    // Implementation would query database
    throw new Error('Method not implemented');
  }

  private async getEventConnections(
    eventId: string,
  ): Promise<CalendarConnection[]> {
    // Implementation would query database
    return [];
  }

  private shouldRefreshTokens(connection: CalendarConnection): boolean {
    return (
      connection.expiresAt &&
      connection.expiresAt < new Date(Date.now() + 300000)
    ); // 5 minutes buffer
  }

  private async refreshConnectionTokens(
    connection: CalendarConnection,
  ): Promise<void> {
    // Implementation would refresh tokens and update database
  }

  private groupConnectionsByProvider(
    connections: CalendarConnection[],
  ): Map<CalendarProvider, CalendarConnection[]> {
    const grouped = new Map();
    for (const connection of connections) {
      if (!grouped.has(connection.provider)) {
        grouped.set(connection.provider, []);
      }
      grouped.get(connection.provider).push(connection);
    }
    return grouped;
  }

  private updateProviderMetrics(
    provider: CalendarProvider,
    eventCount: number,
    result: BatchResult | null,
    responseTime: number,
  ): void {
    const stats = this.metrics.providerStats[provider];
    stats.events += eventCount;

    if (result) {
      stats.successes += result.successful.length;
      stats.failures += result.failed.length;
    } else {
      stats.failures += eventCount;
    }

    // Update average response time
    const totalRequests = stats.successes + stats.failures;
    stats.avgResponseTime =
      (stats.avgResponseTime * (totalRequests - eventCount) + responseTime) /
      totalRequests;
  }

  private createFailedBatchResult(
    events: UnifiedWeddingEvent[],
    error: any,
  ): BatchResult {
    return {
      successful: [],
      failed: events.map((event) => ({
        originalEvent: event,
        error: error.message || 'Unknown error',
        errorCode: 'BATCH_SYNC_FAILED',
      })),
      partialFailure: true,
    };
  }

  private groupResultsByProvider(
    results: BatchResult[],
    connections: CalendarConnection[],
  ): any {
    // Implementation would group results by provider for reporting
    return {};
  }

  private applyConflictResolutions(
    events: UnifiedWeddingEvent[],
    resolutions: ConflictResolution[],
  ): UnifiedWeddingEvent[] {
    // Implementation would apply conflict resolutions to timeline events
    return events;
  }

  private parseWebhookPayload(
    provider: CalendarProvider,
    payload: any,
  ): Promise<any[]> {
    // Implementation would parse provider-specific webhook payloads
    return Promise.resolve([]);
  }

  private async storeSyncResults(
    syncId: string,
    results: BatchResult[],
  ): Promise<void> {
    // Implementation would store sync results for audit trail
  }

  private resolveByTimelinePriority(
    conflict: ConflictInfo,
    events: UnifiedWeddingEvent[],
  ): Promise<ConflictResolution> {
    // Implementation for timeline-based conflict resolution
    throw new Error('Method not implemented');
  }

  private createManualReviewResolution(
    conflict: ConflictInfo,
  ): ConflictResolution {
    return {
      conflictId: `conflict-${Date.now()}`,
      action: 'manual_review',
      reason: 'Conflict requires manual review',
      confidence: 0.1,
    };
  }

  private checkCeremonySetupConflicts(
    ceremony: UnifiedWeddingEvent,
    allEvents: UnifiedWeddingEvent[],
  ): ConflictInfo[] {
    // Implementation for ceremony-specific conflict checking
    return [];
  }
}
