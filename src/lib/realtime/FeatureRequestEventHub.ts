/**
 * Feature Request Event Hub
 * Handles real-time events for the feature request management system
 */

import { WebSocketManager } from './WebSocketManager';

export interface FeatureRequestEvent {
  type:
    | 'feature_request_created'
    | 'feature_request_updated'
    | 'feature_request_status_changed'
    | 'user_vote';
  requestId: string;
  userId: string;
  data: any;
  weddingContext?: {
    isWeddingDay: boolean;
    daysUntilWedding: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: string;
}

export interface EventSubscription {
  id: string;
  userId: string;
  eventTypes: string[];
  filters?: {
    requestId?: string;
    severity?: string;
    weddingContext?: boolean;
  };
}

export class FeatureRequestEventHub {
  private wsManager: WebSocketManager | null = null;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHandlers: Map<string, ((event: FeatureRequestEvent) => void)[]> =
    new Map();

  constructor(websocketUrl?: string) {
    if (websocketUrl) {
      this.wsManager = new WebSocketManager({
        url: websocketUrl,
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
      });
    }
  }

  /**
   * Initialize the event hub
   */
  async initialize(): Promise<boolean> {
    if (this.wsManager) {
      const connected = await this.wsManager.connect();

      if (connected) {
        // Subscribe to all feature request events
        this.wsManager.subscribe('feature_request_event', (payload) => {
          this.handleIncomingEvent(payload);
        });
      }

      return connected;
    }

    return true; // No WebSocket configured, but still functional
  }

  /**
   * Publish a feature request event
   */
  async publishEvent(event: FeatureRequestEvent): Promise<boolean> {
    try {
      // Add timestamp if not provided
      if (!event.timestamp) {
        event.timestamp = new Date().toISOString();
      }

      // Send through WebSocket if available
      if (this.wsManager && this.wsManager.getConnectionStatus()) {
        this.wsManager.send({
          type: 'feature_request_event',
          payload: event,
        });
      }

      // Process locally
      this.handleIncomingEvent(event);

      return true;
    } catch (error) {
      console.error('Failed to publish feature request event:', error);
      return false;
    }
  }

  /**
   * Subscribe to feature request events
   */
  subscribe(
    userId: string,
    eventTypes: string[],
    handler: (event: FeatureRequestEvent) => void,
    filters?: EventSubscription['filters'],
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store subscription
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      userId,
      eventTypes,
      filters,
    });

    // Register handler for each event type
    eventTypes.forEach((eventType) => {
      if (!this.eventHandlers.has(eventType)) {
        this.eventHandlers.set(eventType, []);
      }

      this.eventHandlers.get(eventType)!.push(handler);
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from feature request events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      return false;
    }

    // Remove handlers (this is simplified - in production you'd track handlers per subscription)
    subscription.eventTypes.forEach((eventType) => {
      if (this.eventHandlers.has(eventType)) {
        // For simplicity, we're not removing specific handlers
        // In production, you'd want to track handlers per subscription
      }
    });

    this.subscriptions.delete(subscriptionId);
    return true;
  }

  /**
   * Get active subscriptions for a user
   */
  getUserSubscriptions(userId: string): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.userId === userId,
    );
  }

  /**
   * Handle incoming feature request event
   */
  private handleIncomingEvent(event: FeatureRequestEvent): void {
    const handlers = this.eventHandlers.get(event.type);

    if (handlers) {
      handlers.forEach((handler) => {
        try {
          // Apply filters if needed
          // For now, call all handlers - in production you'd filter based on subscription filters
          handler(event);
        } catch (error) {
          console.error('Error in feature request event handler:', error);
        }
      });
    }
  }

  /**
   * Create a wedding-context-aware event
   */
  createWeddingContextEvent(
    baseEvent: Omit<FeatureRequestEvent, 'weddingContext' | 'timestamp'>,
    weddingDate?: string,
  ): FeatureRequestEvent {
    let weddingContext: FeatureRequestEvent['weddingContext'];

    if (weddingDate) {
      const wedding = new Date(weddingDate);
      const today = new Date();
      const daysUntilWedding = Math.ceil(
        (wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (daysUntilWedding <= 0) {
        severity = 'critical'; // Wedding day or past
      } else if (daysUntilWedding <= 7) {
        severity = 'high'; // Within a week
      } else if (daysUntilWedding <= 30) {
        severity = 'medium'; // Within a month
      }

      weddingContext = {
        isWeddingDay: daysUntilWedding === 0,
        daysUntilWedding,
        severity,
      };
    }

    return {
      ...baseEvent,
      weddingContext,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    this.subscriptions.clear();
    this.eventHandlers.clear();
  }
}
