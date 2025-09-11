/**
 * WS-342 Real-Time Wedding Collaboration - Real-Time Sync Orchestrator
 * Team C: Integration & System Architecture
 */

import type {
  WeddingCollaborationEvent,
  IntegrationEvent,
  IntegrationConflict,
  ConflictResolution,
  SystemEndpoint,
  DataMapping,
  DataFlow,
  DataFlowStatus,
  OptimizationResult,
  SyncResult,
} from './types/integration';

import type {
  EventBroadcasterInterface,
  IntegrationServices,
} from './types/integration-services';

import { createSupabaseClient } from '@/lib/supabase';
import { IntegrationConflictResolver } from './conflict-resolver';
import { DataFlowManager } from './data-flow-manager';

export class RealTimeSyncOrchestrator {
  private supabase = createSupabaseClient();
  private conflictResolver: IntegrationConflictResolver;
  private dataFlowManager: DataFlowManager;
  private eventBroadcaster?: EventBroadcasterInterface;
  private activeSyncOperations: Map<string, AbortController> = new Map();

  constructor(services: IntegrationServices = {}) {
    this.conflictResolver = new IntegrationConflictResolver();
    this.dataFlowManager = new DataFlowManager();
    this.eventBroadcaster = services.eventBroadcaster;
    this.initializeRealtimeSubscriptions();
  }

  /**
   * Initialize real-time subscriptions for wedding collaboration
   */
  private initializeRealtimeSubscriptions(): void {
    // Subscribe to wedding timeline changes
    this.supabase
      .channel('wedding_timeline_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_timeline_events',
        },
        (payload) => this.handleTimelineUpdate(payload),
      )
      .subscribe();

    // Subscribe to vendor status changes
    this.supabase
      .channel('vendor_status_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_activities',
        },
        (payload) => this.handleVendorStatusUpdate(payload),
      )
      .subscribe();

    // Subscribe to payment status changes
    this.supabase
      .channel('payment_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_history',
        },
        (payload) => this.handlePaymentUpdate(payload),
      )
      .subscribe();
  }

  /**
   * Orchestrate cross-system synchronization
   */
  async orchestrateCrossSystemSync(
    event: WeddingCollaborationEvent,
  ): Promise<SyncResult[]> {
    const syncId = `sync_${event.weddingId}_${Date.now()}`;
    const controller = new AbortController();
    this.activeSyncOperations.set(syncId, controller);

    try {
      console.log(
        `Starting cross-system sync for wedding ${event.weddingId}`,
        event,
      );

      // Get all integrated systems for this wedding
      const integratedSystems = await this.getWeddingIntegratedSystems(
        event.weddingId,
      );

      if (integratedSystems.length === 0) {
        return [
          {
            success: true,
            syncedRecords: 0,
            duration: 0,
          },
        ];
      }

      // Determine affected systems based on event type
      const affectedSystems = this.determineAffectedSystems(
        event,
        integratedSystems,
      );

      // Create sync plan
      const syncPlan = await this.createSyncPlan(event, affectedSystems);

      // Execute sync operations in parallel where possible
      const syncResults = await this.executeSyncPlan(
        syncPlan,
        controller.signal,
      );

      // Handle any conflicts that arose during sync
      const conflicts = syncResults
        .filter((result) => result.conflicts && result.conflicts.length > 0)
        .flatMap((result) => result.conflicts!);

      if (conflicts.length > 0) {
        await this.handleSyncConflicts(conflicts);
      }

      // Log sync operation
      await this.logSyncOperation(event, syncResults);

      return syncResults;
    } catch (error) {
      console.error('Cross-system sync failed:', error);
      throw error;
    } finally {
      this.activeSyncOperations.delete(syncId);
    }
  }

  /**
   * Handle integration events
   */
  async handleIntegrationEvent(event: IntegrationEvent): Promise<void> {
    try {
      console.log(`Handling integration event: ${event.eventType}`, event);

      // Determine if this is a wedding day event (higher priority)
      const isWeddingDay = await this.checkIfWeddingDay(
        event.weddingId,
        event.timestamp,
      );

      // Create wedding collaboration event
      const collaborationEvent: WeddingCollaborationEvent = {
        id: event.id,
        weddingId: event.weddingId,
        eventType: event.eventType,
        data: event.data,
        priority: isWeddingDay ? 'critical' : event.priority,
        timestamp: event.timestamp,
        initiatedBy: event.sourceSystem,
        affectedSystems: event.targetSystems,
      };

      // Route event based on type and priority
      await this.routeIntegrationEvent(collaborationEvent);

      // Broadcast to interested systems if broadcaster is available
      if (this.eventBroadcaster) {
        await this.eventBroadcaster.broadcastEvent(collaborationEvent);
      }

      // Update integration metrics
      await this.updateIntegrationMetrics(event);
    } catch (error) {
      console.error('Failed to handle integration event:', error);

      // Store failed event for retry
      await this.storeFailedEvent(event, error);
    }
  }

  /**
   * Resolve integration conflicts
   */
  async resolveIntegrationConflicts(
    conflicts: IntegrationConflict[],
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      try {
        const resolution =
          await this.conflictResolver.resolveIntegrationConflict(conflict);
        resolutions.push(resolution);

        // Apply resolution
        await this.applyConflictResolution(conflict, resolution);

        // Update conflict status
        await this.updateConflictStatus(conflict.id, 'resolved');
      } catch (error) {
        console.error('Failed to resolve conflict:', conflict.id, error);

        // Mark conflict for manual review
        await this.updateConflictStatus(conflict.id, 'escalated');
      }
    }

    return resolutions;
  }

  /**
   * Create data flow between systems
   */
  async createDataFlow(
    source: SystemEndpoint,
    target: SystemEndpoint,
    mapping: DataMapping,
  ): Promise<DataFlow> {
    const dataFlow: DataFlow = {
      id: `flow_${Date.now()}`,
      source,
      target,
      mapping: [mapping], // Convert single mapping to array
      status: 'active',
      lastSync: new Date(),
      syncFrequency: 5, // Default 5 minutes
    };

    // Store data flow configuration
    await this.supabase.from('integration_data_flows').insert({
      id: dataFlow.id,
      source_system: source.systemId,
      target_system: target.systemId,
      mapping_rules: [mapping],
      status: dataFlow.status,
      sync_frequency: dataFlow.syncFrequency,
    });

    // Register with data flow manager
    this.dataFlowManager.registerDataFlow(dataFlow);

    return dataFlow;
  }

  /**
   * Monitor active data flows
   */
  async monitorDataFlows(): Promise<DataFlowStatus[]> {
    return this.dataFlowManager.getDataFlowStatuses();
  }

  /**
   * Optimize data routing
   */
  async optimizeDataRouting(): Promise<OptimizationResult> {
    return this.dataFlowManager.optimizeRouting();
  }

  /**
   * Get active data flows for a wedding
   */
  async getActiveDataFlows(weddingId: string): Promise<DataFlow[]> {
    const { data: flows } = await this.supabase
      .from('integration_data_flows')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('status', 'active');

    return flows || [];
  }

  /**
   * Get last sync time for a wedding
   */
  async getLastSyncTime(weddingId: string): Promise<Date | null> {
    const { data: syncLog } = await this.supabase
      .from('integration_sync_log')
      .select('synced_at')
      .eq('wedding_id', weddingId)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    return syncLog ? new Date(syncLog.synced_at) : null;
  }

  // Private helper methods

  private async handleTimelineUpdate(payload: any): Promise<void> {
    const timelineEvent = payload.new || payload.old;

    if (!timelineEvent) return;

    const integrationEvent: IntegrationEvent = {
      id: `timeline_${timelineEvent.id}_${Date.now()}`,
      sourceSystem: 'wedsync',
      targetSystems: [], // Will be determined by orchestrator
      eventType: 'wedding_timeline_update',
      weddingId: timelineEvent.wedding_id,
      data: timelineEvent,
      timestamp: new Date(),
      priority: 'high',
      weddingDate: new Date(timelineEvent.event_date),
      isWeddingDay: this.isToday(new Date(timelineEvent.event_date)),
      affectedVendors: [],
    };

    await this.handleIntegrationEvent(integrationEvent);
  }

  private async handleVendorStatusUpdate(payload: any): Promise<void> {
    const vendorActivity = payload.new || payload.old;

    if (!vendorActivity || !vendorActivity.wedding_id) return;

    const integrationEvent: IntegrationEvent = {
      id: `vendor_${vendorActivity.vendor_id}_${Date.now()}`,
      sourceSystem: vendorActivity.vendor_id,
      targetSystems: [],
      eventType: 'vendor_status_change',
      weddingId: vendorActivity.wedding_id,
      data: vendorActivity,
      timestamp: new Date(vendorActivity.timestamp),
      priority: 'normal',
      weddingDate: new Date(),
      isWeddingDay: false,
      affectedVendors: [vendorActivity.vendor_id],
    };

    await this.handleIntegrationEvent(integrationEvent);
  }

  private async handlePaymentUpdate(payload: any): Promise<void> {
    const payment = payload.new || payload.old;

    if (!payment || !payment.wedding_id) return;

    const integrationEvent: IntegrationEvent = {
      id: `payment_${payment.id}_${Date.now()}`,
      sourceSystem: 'wedsync_payments',
      targetSystems: [],
      eventType: 'payment_status_change',
      weddingId: payment.wedding_id,
      data: payment,
      timestamp: new Date(),
      priority: 'high',
      weddingDate: new Date(),
      isWeddingDay: false,
      affectedVendors: [],
    };

    await this.handleIntegrationEvent(integrationEvent);
  }

  private async getWeddingIntegratedSystems(
    weddingId: string,
  ): Promise<string[]> {
    const { data: integrations } = await this.supabase
      .from('wedding_vendor_integrations')
      .select('vendor_integration_id')
      .eq('wedding_id', weddingId)
      .eq('status', 'active');

    return integrations?.map((i) => i.vendor_integration_id) || [];
  }

  private determineAffectedSystems(
    event: WeddingCollaborationEvent,
    integratedSystems: string[],
  ): string[] {
    // Business logic to determine which systems need to be updated
    // based on the event type and wedding context

    switch (event.eventType) {
      case 'wedding_timeline_update':
        // Timeline updates affect all vendor systems
        return integratedSystems;

      case 'payment_status_change':
        // Payment updates affect accounting and CRM systems
        return integratedSystems.filter(
          (system) => system.includes('crm') || system.includes('accounting'),
        );

      case 'vendor_status_change':
        // Vendor status affects planning and communication systems
        return integratedSystems.filter(
          (system) =>
            system.includes('planning') || system.includes('communication'),
        );

      default:
        return integratedSystems;
    }
  }

  private async createSyncPlan(
    event: WeddingCollaborationEvent,
    affectedSystems: string[],
  ): Promise<SyncPlan> {
    return {
      eventId: event.id,
      weddingId: event.weddingId,
      systems: affectedSystems,
      syncOperations: affectedSystems.map((systemId) => ({
        systemId,
        operation: this.determineSyncOperation(event.eventType, systemId),
        priority: event.priority,
        data: event.data,
      })),
      parallelizable: this.canRunInParallel(event.eventType),
    };
  }

  private async executeSyncPlan(
    syncPlan: SyncPlan,
    signal: AbortSignal,
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    if (syncPlan.parallelizable) {
      // Execute sync operations in parallel
      const syncPromises = syncPlan.syncOperations.map((operation) =>
        this.executeSyncOperation(operation, signal),
      );

      const parallelResults = await Promise.allSettled(syncPromises);

      for (const result of parallelResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            syncedRecords: 0,
            duration: 0,
            errors: [
              {
                type: 'network',
                message: result.reason.message,
                retryable: true,
              },
            ],
          });
        }
      }
    } else {
      // Execute sync operations sequentially
      for (const operation of syncPlan.syncOperations) {
        if (signal.aborted) break;

        const result = await this.executeSyncOperation(operation, signal);
        results.push(result);
      }
    }

    return results;
  }

  private async executeSyncOperation(
    operation: SyncOperation,
    signal: AbortSignal,
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual sync operation with vendor system adapter
      // This would involve getting the adapter and calling appropriate methods

      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate sync time

      return {
        success: true,
        syncedRecords: 1,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        syncedRecords: 0,
        duration: Date.now() - startTime,
        errors: [
          {
            type: 'network',
            message: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
          },
        ],
      };
    }
  }

  private async handleSyncConflicts(
    conflicts: IntegrationConflict[],
  ): Promise<void> {
    for (const conflict of conflicts) {
      // Store conflict for resolution
      await this.supabase.from('integration_conflicts').insert({
        id: conflict.id,
        wedding_id: conflict.weddingId,
        conflict_type: conflict.conflictType,
        source_system: conflict.sourceSystem,
        target_system: conflict.targetSystem,
        conflicting_data: conflict.conflictingData,
        status: 'pending',
      });
    }

    // Attempt automatic resolution
    await this.resolveIntegrationConflicts(conflicts);
  }

  private async checkIfWeddingDay(
    weddingId: string,
    eventTime: Date,
  ): Promise<boolean> {
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('wedding_date')
      .eq('id', weddingId)
      .single();

    if (!wedding) return false;

    const weddingDate = new Date(wedding.wedding_date);
    const today = new Date();

    return this.isSameDay(weddingDate, today);
  }

  private async routeIntegrationEvent(
    event: WeddingCollaborationEvent,
  ): Promise<void> {
    // Route high-priority events to immediate processing queue
    if (event.priority === 'critical' || event.priority === 'emergency') {
      await this.processHighPriorityEvent(event);
    } else {
      await this.queueEvent(event);
    }
  }

  private async processHighPriorityEvent(
    event: WeddingCollaborationEvent,
  ): Promise<void> {
    // Immediate processing for critical events
    await this.orchestrateCrossSystemSync(event);
  }

  private async queueEvent(event: WeddingCollaborationEvent): Promise<void> {
    // Queue for batch processing
    await this.supabase.from('integration_event_queue').insert({
      event_id: event.id,
      wedding_id: event.weddingId,
      event_type: event.eventType,
      event_data: event.data,
      priority: event.priority,
      scheduled_for: new Date(Date.now() + 5000), // Process in 5 seconds
    });
  }

  private async updateIntegrationMetrics(
    event: IntegrationEvent,
  ): Promise<void> {
    await this.supabase.from('integration_metrics').upsert(
      {
        date: new Date().toISOString().split('T')[0],
        event_type: event.eventType,
        count: 1,
      },
      { onConflict: 'date,event_type' },
    );
  }

  private async storeFailedEvent(
    event: IntegrationEvent,
    error: any,
  ): Promise<void> {
    await this.supabase.from('failed_integration_events').insert({
      event_id: event.id,
      wedding_id: event.weddingId,
      event_data: event,
      error_message: error instanceof Error ? error.message : String(error),
      retry_count: 0,
      next_retry: new Date(Date.now() + 60000), // Retry in 1 minute
    });
  }

  private async applyConflictResolution(
    conflict: IntegrationConflict,
    resolution: ConflictResolution,
  ): Promise<void> {
    // TODO: Implement conflict resolution application
    console.log('Applying conflict resolution:', conflict, resolution);
  }

  private async updateConflictStatus(
    conflictId: string,
    status: string,
  ): Promise<void> {
    await this.supabase
      .from('integration_conflicts')
      .update({ status, resolved_at: new Date() })
      .eq('id', conflictId);
  }

  private async logSyncOperation(
    event: WeddingCollaborationEvent,
    results: SyncResult[],
  ): Promise<void> {
    const totalRecords = results.reduce(
      (sum, result) => sum + result.syncedRecords,
      0,
    );
    const success = results.every((result) => result.success);

    await this.supabase.from('integration_sync_log').insert({
      wedding_id: event.weddingId,
      event_type: event.eventType,
      records_synced: totalRecords,
      success,
      synced_at: new Date(),
      sync_results: results,
    });
  }

  private determineSyncOperation(eventType: string, systemId: string): string {
    // Determine what type of sync operation is needed
    return 'update'; // Default to update operation
  }

  private canRunInParallel(eventType: string): boolean {
    // Determine if sync operations can run in parallel
    // Some operations might need to be sequential to avoid conflicts
    return ![
      'payment_status_change', // Payments might need sequential processing
      'emergency_notification', // Emergencies need careful ordering
    ].includes(eventType);
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}

// Supporting interfaces
interface SyncPlan {
  eventId: string;
  weddingId: string;
  systems: string[];
  syncOperations: SyncOperation[];
  parallelizable: boolean;
}

interface SyncOperation {
  systemId: string;
  operation: string;
  priority: string;
  data: any;
}
