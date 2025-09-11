import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SecureQueryBuilder } from '@/lib/database/secure-query-builder';

export interface AnalyticsUpdateEvent {
  type:
    | 'journey_started'
    | 'journey_completed'
    | 'node_executed'
    | 'client_engaged';
  journeyId: string;
  instanceId?: string;
  clientId?: string;
  nodeId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class AnalyticsRealTimeService {
  private supabase = createClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<(event: AnalyticsUpdateEvent) => void>> =
    new Map();
  private metricsCache: Map<string, any> = new Map();
  private updateQueue: AnalyticsUpdateEvent[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Subscribe to real-time analytics updates for a specific journey or all journeys
   */
  subscribeToJourneyUpdates(
    journeyId?: string,
    callback?: (event: AnalyticsUpdateEvent) => void,
  ): () => void {
    // Validate journeyId if provided to prevent injection
    const validatedJourneyId = journeyId
      ? SecureQueryBuilder.validateUUID(journeyId)
      : undefined;
    const channelName = validatedJourneyId
      ? `journey-${validatedJourneyId}`
      : 'all-journeys';

    // Add callback to listeners if provided
    if (callback) {
      if (!this.listeners.has(channelName)) {
        this.listeners.set(channelName, new Set());
      }
      this.listeners.get(channelName)!.add(callback);
    }

    // Create channel if it doesn't exist
    if (!this.channels.has(channelName)) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'journey_instances',
            filter: validatedJourneyId
              ? SecureQueryBuilder.createSafeFilter(
                  'journey_id',
                  'eq',
                  validatedJourneyId,
                )
              : undefined,
          },
          (payload) => {
            this.handleJourneyInstanceChange(payload);
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'node_executions',
            filter: validatedJourneyId
              ? SecureQueryBuilder.createSafeFilter(
                  'journey_id',
                  'eq',
                  validatedJourneyId,
                )
              : undefined,
          },
          (payload) => {
            this.handleNodeExecutionChange(payload);
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_journey_progress',
            filter: validatedJourneyId
              ? SecureQueryBuilder.createSafeFilter(
                  'journey_id',
                  'eq',
                  validatedJourneyId,
                )
              : undefined,
          },
          (payload) => {
            this.handleClientProgressChange(payload);
          },
        )
        .subscribe((status) => {
          console.log(`Analytics subscription ${channelName} status:`, status);
        });

      this.channels.set(channelName, channel);
    }

    // Start processing queue if not already running
    if (!this.processingInterval) {
      this.startQueueProcessor();
    }

    // Return unsubscribe function
    return () => {
      if (callback && this.listeners.has(channelName)) {
        this.listeners.get(channelName)!.delete(callback);

        // Remove channel if no more listeners
        if (this.listeners.get(channelName)!.size === 0) {
          this.listeners.delete(channelName);
          const channel = this.channels.get(channelName);
          if (channel) {
            this.supabase.removeChannel(channel);
            this.channels.delete(channelName);
          }
        }
      }
    };
  }

  private handleJourneyInstanceChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    let event: AnalyticsUpdateEvent | null = null;

    if (eventType === 'INSERT') {
      event = {
        type: 'journey_started',
        journeyId: newRecord.journey_id,
        instanceId: newRecord.id,
        clientId: newRecord.client_id,
        timestamp: newRecord.created_at,
        metadata: {
          status: newRecord.status,
        },
      };
    } else if (eventType === 'UPDATE') {
      if (
        newRecord.status === 'completed' &&
        oldRecord?.status !== 'completed'
      ) {
        event = {
          type: 'journey_completed',
          journeyId: newRecord.journey_id,
          instanceId: newRecord.id,
          clientId: newRecord.client_id,
          timestamp: newRecord.updated_at,
          metadata: {
            completionTime: this.calculateCompletionTime(
              newRecord.created_at,
              newRecord.completed_at,
            ),
            status: newRecord.status,
          },
        };
      }
    }

    if (event) {
      this.queueUpdate(event);
      this.notifyListeners(event);
    }
  }

  private handleNodeExecutionChange(payload: any) {
    const { eventType, new: newRecord } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const event: AnalyticsUpdateEvent = {
        type: 'node_executed',
        journeyId: newRecord.journey_id,
        instanceId: newRecord.instance_id,
        nodeId: newRecord.node_id,
        timestamp: newRecord.created_at,
        metadata: {
          status: newRecord.status,
          executionTime: newRecord.execution_time_ms,
        },
      };

      this.queueUpdate(event);
      this.notifyListeners(event);
    }
  }

  private handleClientProgressChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'UPDATE') {
      // Check if engagement level changed
      if (newRecord.engagement_level !== oldRecord?.engagement_level) {
        const event: AnalyticsUpdateEvent = {
          type: 'client_engaged',
          journeyId: newRecord.journey_id,
          instanceId: newRecord.instance_id,
          clientId: newRecord.client_id,
          timestamp: newRecord.updated_at,
          metadata: {
            engagementLevel: newRecord.engagement_level,
            completionPercentage: newRecord.completion_percentage,
            previousEngagement: oldRecord?.engagement_level,
          },
        };

        this.queueUpdate(event);
        this.notifyListeners(event);
      }
    }
  }

  private queueUpdate(event: AnalyticsUpdateEvent) {
    this.updateQueue.push(event);

    // Update local cache immediately for instant UI updates
    this.updateMetricsCache(event);
  }

  private updateMetricsCache(event: AnalyticsUpdateEvent) {
    const cacheKey = event.journeyId;
    const currentMetrics = this.metricsCache.get(cacheKey) || {
      totalInstances: 0,
      completedInstances: 0,
      activeInstances: 0,
      nodesExecuted: 0,
      highEngagementClients: 0,
    };

    switch (event.type) {
      case 'journey_started':
        currentMetrics.totalInstances++;
        currentMetrics.activeInstances++;
        break;
      case 'journey_completed':
        currentMetrics.completedInstances++;
        currentMetrics.activeInstances = Math.max(
          0,
          currentMetrics.activeInstances - 1,
        );
        break;
      case 'node_executed':
        currentMetrics.nodesExecuted++;
        break;
      case 'client_engaged':
        if (
          event.metadata?.engagementLevel === 'high' &&
          event.metadata?.previousEngagement !== 'high'
        ) {
          currentMetrics.highEngagementClients++;
        }
        break;
    }

    this.metricsCache.set(cacheKey, currentMetrics);
  }

  private startQueueProcessor() {
    // Process queue every 5 seconds to batch updates
    this.processingInterval = setInterval(() => {
      this.processUpdateQueue();
    }, 5000);
  }

  private async processUpdateQueue() {
    if (this.updateQueue.length === 0) return;

    const updates = [...this.updateQueue];
    this.updateQueue = [];

    // Group updates by journey for efficient batch processing
    const groupedUpdates = updates.reduce(
      (acc, update) => {
        if (!acc[update.journeyId]) {
          acc[update.journeyId] = [];
        }
        acc[update.journeyId].push(update);
        return acc;
      },
      {} as Record<string, AnalyticsUpdateEvent[]>,
    );

    // Process each journey's updates
    for (const [journeyId, journeyUpdates] of Object.entries(groupedUpdates)) {
      await this.persistAnalyticsUpdates(journeyId, journeyUpdates);
    }
  }

  private async persistAnalyticsUpdates(
    journeyId: string,
    updates: AnalyticsUpdateEvent[],
  ) {
    try {
      // Count different event types
      const counts = updates.reduce(
        (acc, update) => {
          acc[update.type] = (acc[update.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Update analytics tables
      const { error } = await this.supabase.rpc(
        'update_journey_analytics_batch',
        {
          p_journey_id: journeyId,
          p_instances_started: counts['journey_started'] || 0,
          p_instances_completed: counts['journey_completed'] || 0,
          p_nodes_executed: counts['node_executed'] || 0,
          p_engagements: counts['client_engaged'] || 0,
        },
      );

      if (error) {
        console.error('Failed to persist analytics updates:', error);
      }
    } catch (error) {
      console.error('Error persisting analytics:', error);
    }
  }

  private notifyListeners(event: AnalyticsUpdateEvent) {
    // Notify journey-specific listeners
    const journeyListeners = this.listeners.get(`journey-${event.journeyId}`);
    if (journeyListeners) {
      journeyListeners.forEach((callback) => callback(event));
    }

    // Notify global listeners
    const globalListeners = this.listeners.get('all-journeys');
    if (globalListeners) {
      globalListeners.forEach((callback) => callback(event));
    }
  }

  private calculateCompletionTime(startTime: string, endTime: string): number {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.round((end - start) / 1000); // Return seconds
  }

  /**
   * Get cached metrics for a journey
   */
  getCachedMetrics(journeyId: string) {
    return this.metricsCache.get(journeyId);
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    // Clear processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining queue
    this.processUpdateQueue();

    // Remove all channels
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });

    this.channels.clear();
    this.listeners.clear();
    this.metricsCache.clear();
  }
}

// Export singleton instance
export const analyticsRealTime = new AnalyticsRealTimeService();

// Export hook for React components
export function useAnalyticsRealTime(journeyId?: string) {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = analyticsRealTime.subscribeToJourneyUpdates(
      journeyId,
      (event) => {
        // Update local state with cached metrics
        const cachedMetrics = analyticsRealTime.getCachedMetrics(
          event.journeyId,
        );
        if (cachedMetrics) {
          setMetrics(cachedMetrics);
        }
      },
    );

    // Get initial cached metrics if available
    if (journeyId) {
      const cached = analyticsRealTime.getCachedMetrics(journeyId);
      if (cached) {
        setMetrics(cached);
      }
    }

    return () => {
      unsubscribe();
    };
  }, [journeyId]);

  return metrics;
}

// Server-side analytics without React hooks
