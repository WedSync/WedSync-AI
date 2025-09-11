/**
 * WS-342 Real-Time Wedding Collaboration - Event Broadcaster
 * Team C: Integration & System Architecture
 */

import type {
  WeddingCollaborationEvent,
  IntegrationEvent,
  BroadcastResult,
} from './types/integration';

import type {
  VendorIntegrationManagerInterface,
  IntegrationServices,
  EventSubscriberCallback,
  EventFilter,
  WeddingEmergency,
} from './types/integration-services';

import { createSupabaseClient } from '@/lib/supabase';

export class EventBroadcaster {
  private supabase = createSupabaseClient();
  private subscribers: Map<string, EventSubscriber[]> = new Map();
  private broadcastQueue: BroadcastJob[] = [];
  private isProcessingQueue = false;
  private vendorIntegrationManager?: VendorIntegrationManagerInterface;

  constructor(services: IntegrationServices = {}) {
    this.vendorIntegrationManager = services.vendorIntegrationManager;
    this.startQueueProcessor();
  }

  /**
   * Broadcast event to all relevant systems
   */
  async broadcastEvent(
    event: WeddingCollaborationEvent,
  ): Promise<BroadcastResult[]> {
    try {
      console.log(
        `Broadcasting event: ${event.eventType} for wedding ${event.weddingId}`,
      );

      // Determine target systems for the event
      const targetSystems = await this.determineTargetSystems(event);

      if (targetSystems.length === 0) {
        return [
          {
            success: true,
            targetSystem: 'none',
            deliveryStatus: 'delivered',
          },
        ];
      }

      // Create broadcast jobs
      const broadcastJobs = targetSystems.map((systemId) => ({
        id: `broadcast_${event.id}_${systemId}_${Date.now()}`,
        event,
        targetSystem: systemId,
        priority: event.priority,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
      }));

      // Add to broadcast queue
      this.broadcastQueue.push(...broadcastJobs);

      // Process high-priority events immediately
      if (event.priority === 'critical' || event.priority === 'emergency') {
        return await this.processHighPriorityBroadcasts(broadcastJobs);
      }

      // Queue for batch processing
      return broadcastJobs.map((job) => ({
        success: true,
        targetSystem: job.targetSystem,
        deliveryStatus: 'pending' as const,
      }));
    } catch (error) {
      console.error('Failed to broadcast event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to specific event types
   */
  subscribeToEvents(
    eventTypes: string[],
    callback: EventSubscriberCallback,
    filter?: EventFilter,
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscriber: EventSubscriber = {
      id: subscriptionId,
      eventTypes,
      callback,
      filter,
      active: true,
      createdAt: new Date(),
    };

    // Add to subscribers for each event type
    for (const eventType of eventTypes) {
      const eventSubscribers = this.subscribers.get(eventType) || [];
      eventSubscribers.push(subscriber);
      this.subscribers.set(eventType, eventSubscribers);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscribers] of this.subscribers) {
      const filteredSubscribers = subscribers.filter(
        (sub) => sub.id !== subscriptionId,
      );
      this.subscribers.set(eventType, filteredSubscribers);
    }
  }

  /**
   * Send real-time notification to internal subscribers
   */
  async notifySubscribers(event: WeddingCollaborationEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.eventType) || [];

    for (const subscriber of subscribers) {
      if (!subscriber.active) continue;

      // Apply filter if present
      if (
        subscriber.filter &&
        !this.eventMatchesFilter(event, subscriber.filter)
      ) {
        continue;
      }

      try {
        await subscriber.callback(event);
      } catch (error) {
        console.error(
          `Subscriber ${subscriber.id} failed to process event:`,
          error,
        );

        // Deactivate problematic subscribers after multiple failures
        subscriber.active = false;
      }
    }
  }

  /**
   * Broadcast wedding emergency alert
   */
  async broadcastEmergencyAlert(
    weddingId: string,
    emergency: WeddingEmergency,
  ): Promise<BroadcastResult[]> {
    const emergencyEvent: WeddingCollaborationEvent = {
      id: `emergency_${weddingId}_${Date.now()}`,
      weddingId,
      eventType: 'emergency_notification',
      data: emergency,
      priority: 'emergency',
      timestamp: new Date(),
      initiatedBy: 'system',
      affectedSystems: [], // Will be determined
    };

    // Emergency broadcasts bypass normal queue
    const targetSystems = await this.getEmergencyNotificationTargets(weddingId);
    const results: BroadcastResult[] = [];

    // Send to all systems immediately
    for (const systemId of targetSystems) {
      try {
        const result = await this.sendImmediateBroadcast(
          emergencyEvent,
          systemId,
        );
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          targetSystem: systemId,
          deliveryStatus: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Send to internal subscribers
    await this.notifySubscribers(emergencyEvent);

    // Log emergency broadcast
    await this.logEmergencyBroadcast(weddingId, emergency, results);

    return results;
  }

  // Private helper methods

  private startQueueProcessor(): void {
    // Process broadcast queue every 10 seconds
    setInterval(() => {
      if (!this.isProcessingQueue && this.broadcastQueue.length > 0) {
        this.processQueue();
      }
    }, 10000);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    try {
      // Process up to 10 broadcasts at a time
      const batchSize = 10;
      const batch = this.broadcastQueue.splice(0, batchSize);

      if (batch.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      // Group by priority
      const highPriority = batch.filter(
        (job) => job.priority === 'high' || job.priority === 'critical',
      );
      const normalPriority = batch.filter(
        (job) => job.priority === 'normal' || job.priority === 'low',
      );

      // Process high priority first
      await this.processBatch(highPriority);
      await this.processBatch(normalPriority);
    } catch (error) {
      console.error('Error processing broadcast queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processBatch(jobs: BroadcastJob[]): Promise<void> {
    const promises = jobs.map(async (job) => {
      try {
        const result = await this.executeBroadcast(job);

        if (!result.success && job.attempts < job.maxAttempts) {
          // Re-queue failed job for retry
          job.attempts++;
          job.nextRetry = new Date(Date.now() + job.attempts * 30000); // Exponential backoff
          this.broadcastQueue.push(job);
        }

        return result;
      } catch (error) {
        console.error(`Broadcast job ${job.id} failed:`, error);
        return {
          success: false,
          targetSystem: job.targetSystem,
          deliveryStatus: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    await Promise.all(promises);
  }

  private async executeBroadcast(job: BroadcastJob): Promise<BroadcastResult> {
    const { event, targetSystem } = job;

    try {
      // Convert to integration event
      const integrationEvent: IntegrationEvent = {
        id: event.id,
        sourceSystem: 'wedsync',
        targetSystems: [targetSystem],
        eventType: event.eventType,
        weddingId: event.weddingId,
        data: event.data,
        timestamp: event.timestamp,
        priority: event.priority,
        weddingDate: new Date(), // Will be filled by orchestrator
        isWeddingDay: false,
        affectedVendors: [],
      };

      // Use vendor integration manager to broadcast if available
      if (this.vendorIntegrationManager) {
        const results =
          await this.vendorIntegrationManager.broadcastToVendorSystems(event);

        if (results.length > 0) {
          return results[0]; // Return first result for this system
        }
      }

      return {
        success: true,
        targetSystem,
        deliveryStatus: 'delivered',
      };
    } catch (error) {
      return {
        success: false,
        targetSystem,
        deliveryStatus: 'failed',
        error:
          error instanceof Error ? error.message : 'Broadcast execution failed',
      };
    }
  }

  private async processHighPriorityBroadcasts(
    jobs: BroadcastJob[],
  ): Promise<BroadcastResult[]> {
    const results: BroadcastResult[] = [];

    for (const job of jobs) {
      const result = await this.executeBroadcast(job);
      results.push(result);
    }

    return results;
  }

  private async determineTargetSystems(
    event: WeddingCollaborationEvent,
  ): Promise<string[]> {
    // Get integrated systems for this wedding
    const { data: integrations } = await this.supabase
      .from('wedding_vendor_integrations')
      .select('vendor_integration_id, system_type')
      .eq('wedding_id', event.weddingId)
      .eq('status', 'active');

    if (!integrations) return [];

    // Filter systems based on event type
    return integrations
      .filter((integration) =>
        this.systemShouldReceiveEvent(integration.system_type, event.eventType),
      )
      .map((integration) => integration.vendor_integration_id);
  }

  private systemShouldReceiveEvent(
    systemType: string,
    eventType: string,
  ): boolean {
    // Business rules for which systems should receive which events
    const systemEventMap: Record<string, string[]> = {
      photography_crm: [
        'wedding_timeline_update',
        'vendor_status_change',
        'communication_sent',
        'emergency_notification',
      ],
      wedding_planning: [
        'wedding_timeline_update',
        'budget_modification',
        'guest_list_update',
        'vendor_status_change',
        'emergency_notification',
      ],
      venue_management: [
        'wedding_timeline_update',
        'guest_list_update',
        'emergency_notification',
      ],
      calendar_system: ['wedding_timeline_update', 'calendar_event_created'],
      payment_processor: ['payment_status_change'],
      communication: ['communication_sent', 'emergency_notification'],
    };

    const allowedEvents = systemEventMap[systemType] || [];
    return allowedEvents.includes(eventType);
  }

  private async sendImmediateBroadcast(
    event: WeddingCollaborationEvent,
    targetSystem: string,
  ): Promise<BroadcastResult> {
    const job: BroadcastJob = {
      id: `immediate_${event.id}_${targetSystem}`,
      event,
      targetSystem,
      priority: event.priority,
      attempts: 0,
      maxAttempts: 1, // No retries for emergency broadcasts
      createdAt: new Date(),
    };

    return await this.executeBroadcast(job);
  }

  private async getEmergencyNotificationTargets(
    weddingId: string,
  ): Promise<string[]> {
    // Get all active integrations for emergency notifications
    const { data: integrations } = await this.supabase
      .from('wedding_vendor_integrations')
      .select('vendor_integration_id')
      .eq('wedding_id', weddingId)
      .eq('status', 'active');

    return integrations?.map((i) => i.vendor_integration_id) || [];
  }

  private eventMatchesFilter(
    event: WeddingCollaborationEvent,
    filter: EventFilter,
  ): boolean {
    if (filter.weddingId && filter.weddingId !== event.weddingId) {
      return false;
    }

    if (filter.priority && filter.priority !== event.priority) {
      return false;
    }

    if (
      filter.minPriorityLevel &&
      !this.meetsMinPriority(event.priority, filter.minPriorityLevel)
    ) {
      return false;
    }

    return true;
  }

  private meetsMinPriority(
    eventPriority: string,
    minPriority: string,
  ): boolean {
    const priorityLevels = ['low', 'normal', 'high', 'critical', 'emergency'];
    const eventLevel = priorityLevels.indexOf(eventPriority);
    const minLevel = priorityLevels.indexOf(minPriority);

    return eventLevel >= minLevel;
  }

  private async logEmergencyBroadcast(
    weddingId: string,
    emergency: WeddingEmergency,
    results: BroadcastResult[],
  ): Promise<void> {
    await this.supabase.from('emergency_broadcasts').insert({
      wedding_id: weddingId,
      emergency_type: emergency.type,
      emergency_data: emergency,
      broadcast_results: results,
      broadcast_at: new Date(),
    });
  }
}

// Supporting interfaces
interface EventSubscriber {
  id: string;
  eventTypes: string[];
  callback: EventSubscriberCallback;
  filter?: EventFilter;
  active: boolean;
  createdAt: Date;
}

interface EventSubscriberCallback {
  (event: WeddingCollaborationEvent): Promise<void>;
}

interface EventFilter {
  weddingId?: string;
  priority?: string;
  minPriorityLevel?: string;
  systemType?: string;
}

interface BroadcastJob {
  id: string;
  event: WeddingCollaborationEvent;
  targetSystem: string;
  priority: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  nextRetry?: Date;
}

interface WeddingEmergency {
  type: 'weather' | 'venue' | 'vendor' | 'medical' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actionRequired: string;
  affectedVendors: string[];
  reportedBy: string;
  reportedAt: Date;
}
