'use client';

import { createClient } from '@/lib/supabase/client';
import {
  Guest,
  GuestRealtimeUpdate,
  GuestAnalytics,
} from '@/types/guest-management';

export interface GuestSyncEvent {
  type:
    | 'guest_created'
    | 'guest_updated'
    | 'guest_deleted'
    | 'rsvp_updated'
    | 'task_assigned'
    | 'budget_updated'
    | 'website_updated';
  guest_id?: string;
  data?: any;
  metadata?: {
    source: 'guest_list' | 'rsvp' | 'tasks' | 'budget' | 'website';
    user_id?: string;
    timestamp: string;
    integration_updates?: string[];
  };
}

export interface SyncSubscription {
  id: string;
  channel: string;
  callback: (event: GuestSyncEvent) => void;
  active: boolean;
}

class GuestSyncManager {
  private supabase = createClient();
  private subscriptions: Map<string, SyncSubscription> = new Map();
  private channels: Map<string, any> = new Map();
  private integrationCallbacks: Map<string, (event: GuestSyncEvent) => void> =
    new Map();

  // Subscribe to guest updates for a specific couple
  subscribeToGuestUpdates(
    coupleId: string,
    callback: (event: GuestSyncEvent) => void,
    options?: {
      includeRSVP?: boolean;
      includeTasks?: boolean;
      includeBudget?: boolean;
      includeWebsite?: boolean;
    },
  ): string {
    const subscriptionId = `guest-sync-${coupleId}-${Date.now()}`;

    // Create main guest updates channel
    const guestChannel = this.supabase
      .channel(`guests:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          this.handleGuestChange(payload, callback);
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'households',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          this.handleHouseholdChange(payload, callback);
        },
      );

    // Subscribe to RSVP updates
    if (options?.includeRSVP !== false) {
      guestChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvp_responses',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          this.handleRSVPChange(payload, callback);
        },
      );
    }

    // Subscribe to task assignments
    if (options?.includeTasks !== false) {
      guestChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `wedding_id=eq.${coupleId}`,
        },
        (payload) => {
          this.handleTaskChange(payload, callback);
        },
      );
    }

    // Subscribe to budget updates
    if (options?.includeBudget !== false) {
      guestChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_transactions',
          filter: `wedding_id=eq.${coupleId}`,
        },
        (payload) => {
          this.handleBudgetChange(payload, callback);
        },
      );
    }

    // Subscribe to website updates
    if (options?.includeWebsite !== false) {
      guestChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedding_websites',
          filter: `wedding_id=eq.${coupleId}`,
        },
        (payload) => {
          this.handleWebsiteChange(payload, callback);
        },
      );
    }

    guestChannel.subscribe((status) => {
      console.log('Guest sync subscription status:', status);
    });

    const subscription: SyncSubscription = {
      id: subscriptionId,
      channel: `guests:${coupleId}`,
      callback,
      active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.channels.set(`guests:${coupleId}`, guestChannel);

    return subscriptionId;
  }

  // Subscribe to cross-system integration events
  subscribeToIntegrationUpdates(
    callback: (event: GuestSyncEvent) => void,
  ): string {
    const subscriptionId = `integration-sync-${Date.now()}`;

    const integrationChannel = this.supabase
      .channel('integration-events')
      .on('broadcast', { event: 'integration_update' }, (payload) => {
        callback(payload.payload as GuestSyncEvent);
      });

    integrationChannel.subscribe();

    this.integrationCallbacks.set(subscriptionId, callback);
    this.channels.set('integration-events', integrationChannel);

    return subscriptionId;
  }

  // Broadcast integration update to all subscribers
  async broadcastIntegrationUpdate(event: GuestSyncEvent): Promise<void> {
    const integrationChannel = this.channels.get('integration-events');
    if (integrationChannel) {
      await integrationChannel.send({
        type: 'broadcast',
        event: 'integration_update',
        payload: event,
      });
    }
  }

  // Handle guest table changes
  private handleGuestChange(
    payload: any,
    callback: (event: GuestSyncEvent) => void,
  ) {
    const event: GuestSyncEvent = {
      type:
        payload.eventType === 'INSERT'
          ? 'guest_created'
          : payload.eventType === 'UPDATE'
            ? 'guest_updated'
            : 'guest_deleted',
      guest_id: payload.new?.id || payload.old?.id,
      data: payload.new || payload.old,
      metadata: {
        source: 'guest_list',
        timestamp: new Date().toISOString(),
        integration_updates: this.getAffectedIntegrations(payload),
      },
    };

    callback(event);
    this.broadcastIntegrationUpdate(event);
  }

  // Handle household changes
  private handleHouseholdChange(
    payload: any,
    callback: (event: GuestSyncEvent) => void,
  ) {
    // Household changes affect guest grouping in all systems
    const event: GuestSyncEvent = {
      type: 'guest_updated',
      data: payload.new || payload.old,
      metadata: {
        source: 'guest_list',
        timestamp: new Date().toISOString(),
        integration_updates: ['rsvp', 'website', 'budget'],
      },
    };

    callback(event);
    this.broadcastIntegrationUpdate(event);
  }

  // Handle RSVP changes
  private handleRSVPChange(
    payload: any,
    callback: (event: GuestSyncEvent) => void,
  ) {
    const event: GuestSyncEvent = {
      type: 'rsvp_updated',
      guest_id: payload.new?.guest_id || payload.old?.guest_id,
      data: payload.new || payload.old,
      metadata: {
        source: 'rsvp',
        timestamp: new Date().toISOString(),
        integration_updates: ['budget', 'website', 'tasks'],
      },
    };

    callback(event);
    this.broadcastIntegrationUpdate(event);
  }

  // Handle task assignment changes
  private handleTaskChange(
    payload: any,
    callback: (event: GuestSyncEvent) => void,
  ) {
    const event: GuestSyncEvent = {
      type: 'task_assigned',
      guest_id: payload.new?.assigned_to || payload.old?.assigned_to,
      data: payload.new || payload.old,
      metadata: {
        source: 'tasks',
        timestamp: new Date().toISOString(),
        integration_updates: ['guest_list', 'website'],
      },
    };

    callback(event);
    this.broadcastIntegrationUpdate(event);
  }

  // Handle budget changes
  private handleBudgetChange(
    payload: any,
    callback: (event: GuestSyncEvent) => void,
  ) {
    const event: GuestSyncEvent = {
      type: 'budget_updated',
      data: payload.new || payload.old,
      metadata: {
        source: 'budget',
        timestamp: new Date().toISOString(),
        integration_updates: ['guest_list', 'website'],
      },
    };

    callback(event);
    this.broadcastIntegrationUpdate(event);
  }

  // Handle website changes
  private handleWebsiteChange(
    payload: any,
    callback: (event: GuestSyncEvent) => void,
  ) {
    const event: GuestSyncEvent = {
      type: 'website_updated',
      data: payload.new || payload.old,
      metadata: {
        source: 'website',
        timestamp: new Date().toISOString(),
        integration_updates: ['guest_list'],
      },
    };

    callback(event);
    this.broadcastIntegrationUpdate(event);
  }

  // Determine which integrations are affected by a change
  private getAffectedIntegrations(payload: any): string[] {
    const integrations = [];

    if (payload.new?.rsvp_status !== payload.old?.rsvp_status) {
      integrations.push('rsvp', 'budget', 'website');
    }

    if (
      payload.new?.first_name !== payload.old?.first_name ||
      payload.new?.last_name !== payload.old?.last_name
    ) {
      integrations.push('rsvp', 'tasks', 'website');
    }

    if (payload.new?.category !== payload.old?.category) {
      integrations.push('website', 'tasks');
    }

    if (payload.new?.helper_role !== payload.old?.helper_role) {
      integrations.push('tasks', 'website');
    }

    return integrations;
  }

  // Unsubscribe from updates
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
    }

    // Clean up integration callbacks
    if (this.integrationCallbacks.has(subscriptionId)) {
      this.integrationCallbacks.delete(subscriptionId);
    }
  }

  // Unsubscribe all
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.active = false;
    });

    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });

    this.subscriptions.clear();
    this.channels.clear();
    this.integrationCallbacks.clear();
  }

  // Get active subscriptions count
  getActiveSubscriptionsCount(): number {
    return Array.from(this.subscriptions.values()).filter((s) => s.active)
      .length;
  }

  // Trigger manual sync for all systems
  async triggerFullSync(coupleId: string): Promise<void> {
    const event: GuestSyncEvent = {
      type: 'guest_updated',
      data: { couple_id: coupleId, sync_type: 'full' },
      metadata: {
        source: 'guest_list',
        timestamp: new Date().toISOString(),
        integration_updates: ['rsvp', 'tasks', 'budget', 'website'],
      },
    };

    await this.broadcastIntegrationUpdate(event);
  }
}

// Singleton instance
const guestSyncManager = new GuestSyncManager();

// React hook for guest sync
export function useGuestSync(
  coupleId: string,
  options?: {
    includeRSVP?: boolean;
    includeTasks?: boolean;
    includeBudget?: boolean;
    includeWebsite?: boolean;
  },
) {
  const [lastUpdate, setLastUpdate] = React.useState<GuestSyncEvent | null>(
    null,
  );
  const [connected, setConnected] = React.useState(false);
  const subscriptionRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!coupleId) return;

    const handleSyncEvent = (event: GuestSyncEvent) => {
      setLastUpdate(event);
      console.log('Guest sync event:', event);
    };

    subscriptionRef.current = guestSyncManager.subscribeToGuestUpdates(
      coupleId,
      handleSyncEvent,
      options,
    );

    setConnected(true);

    return () => {
      if (subscriptionRef.current) {
        guestSyncManager.unsubscribe(subscriptionRef.current);
        setConnected(false);
      }
    };
  }, [
    coupleId,
    options?.includeRSVP,
    options?.includeTasks,
    options?.includeBudget,
    options?.includeWebsite,
  ]);

  const triggerSync = React.useCallback(() => {
    if (coupleId) {
      guestSyncManager.triggerFullSync(coupleId);
    }
  }, [coupleId]);

  return {
    lastUpdate,
    connected,
    triggerSync,
    subscriptionsCount: guestSyncManager.getActiveSubscriptionsCount(),
  };
}

// Integration-specific sync hooks
export function useRSVPSync(callback: (event: GuestSyncEvent) => void) {
  React.useEffect(() => {
    const subscriptionId = guestSyncManager.subscribeToIntegrationUpdates(
      (event) => {
        if (
          event.type === 'rsvp_updated' ||
          event.metadata?.integration_updates?.includes('rsvp')
        ) {
          callback(event);
        }
      },
    );

    return () => {
      guestSyncManager.unsubscribe(subscriptionId);
    };
  }, [callback]);
}

export function useTaskSync(callback: (event: GuestSyncEvent) => void) {
  React.useEffect(() => {
    const subscriptionId = guestSyncManager.subscribeToIntegrationUpdates(
      (event) => {
        if (
          event.type === 'task_assigned' ||
          event.metadata?.integration_updates?.includes('tasks')
        ) {
          callback(event);
        }
      },
    );

    return () => {
      guestSyncManager.unsubscribe(subscriptionId);
    };
  }, [callback]);
}

export function useBudgetSync(callback: (event: GuestSyncEvent) => void) {
  React.useEffect(() => {
    const subscriptionId = guestSyncManager.subscribeToIntegrationUpdates(
      (event) => {
        if (
          event.type === 'budget_updated' ||
          event.metadata?.integration_updates?.includes('budget')
        ) {
          callback(event);
        }
      },
    );

    return () => {
      guestSyncManager.unsubscribe(subscriptionId);
    };
  }, [callback]);
}

export function useWebsiteSync(callback: (event: GuestSyncEvent) => void) {
  React.useEffect(() => {
    const subscriptionId = guestSyncManager.subscribeToIntegrationUpdates(
      (event) => {
        if (
          event.type === 'website_updated' ||
          event.metadata?.integration_updates?.includes('website')
        ) {
          callback(event);
        }
      },
    );

    return () => {
      guestSyncManager.unsubscribe(subscriptionId);
    };
  }, [callback]);
}

export default guestSyncManager;
