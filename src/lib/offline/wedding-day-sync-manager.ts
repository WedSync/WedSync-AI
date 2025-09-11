'use client';

import React from 'react';
import useWeddingDayOfflineStore, {
  type OfflineAction,
} from '@/stores/wedding-day-offline';
import { WeddingDayRealtimeManager } from '@/lib/realtime/wedding-day-realtime';

export class WeddingDaySyncManager {
  private offlineStore = useWeddingDayOfflineStore.getState();
  private realtimeManager: WeddingDayRealtimeManager | null = null;
  private syncIntervalId: NodeJS.Timeout | null = null;
  private syncInProgress = false;

  constructor(
    private weddingId: string,
    private coordinatorId: string,
  ) {
    // Subscribe to offline store changes
    useWeddingDayOfflineStore.subscribe(
      (state) => state.isOnline,
      (isOnline) => {
        if (isOnline && !this.syncInProgress) {
          this.startSync();
        } else if (!isOnline) {
          this.stopSync();
        }
      },
    );
  }

  /**
   * Initialize the sync manager with realtime connection
   */
  async initialize(realtimeManager: WeddingDayRealtimeManager): Promise<void> {
    this.realtimeManager = realtimeManager;

    // Start sync if online
    if (this.offlineStore.isOnline) {
      await this.startSync();
    }
  }

  /**
   * Start the sync process
   */
  private async startSync(): Promise<void> {
    if (this.syncInProgress || !this.realtimeManager) return;

    this.syncInProgress = true;
    this.offlineStore.setSyncInProgress(true);

    console.log('Starting wedding day sync...');

    try {
      // Sync pending actions
      await this.syncPendingActions();

      // Fetch latest data from server
      await this.fetchLatestData();

      // Set up periodic sync
      this.setupPeriodicSync();

      this.offlineStore.setLastSyncTime(new Date().toISOString());
      console.log('Wedding day sync completed successfully');
    } catch (error) {
      console.error('Wedding day sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.offlineStore.setSyncInProgress(false);
    }
  }

  /**
   * Stop the sync process
   */
  private stopSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    this.syncInProgress = false;
    this.offlineStore.setSyncInProgress(false);
    console.log('Wedding day sync stopped');
  }

  /**
   * Sync all pending offline actions
   */
  private async syncPendingActions(): Promise<void> {
    const { pendingActions } = this.offlineStore;

    if (pendingActions.length === 0) {
      console.log('No pending actions to sync');
      return;
    }

    console.log(`Syncing ${pendingActions.length} pending actions...`);

    // Process actions in order
    for (const action of pendingActions) {
      try {
        await this.syncAction(action);
        this.offlineStore.markActionSynced(action.id);
        console.log(`Action ${action.id} synced successfully`);
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);

        // Mark as failed if retry count is exceeded
        if (action.retryCount >= 3) {
          this.offlineStore.markActionFailed(action.id);
          console.log(
            `Action ${action.id} marked as failed after ${action.retryCount} retries`,
          );
        } else {
          // Will be retried in next sync cycle
          console.log(
            `Action ${action.id} will be retried (attempt ${action.retryCount + 1})`,
          );
        }
      }
    }
  }

  /**
   * Sync a single action
   */
  private async syncAction(action: OfflineAction): Promise<void> {
    if (!this.realtimeManager) {
      throw new Error('Realtime manager not initialized');
    }

    switch (action.type) {
      case 'vendor_checkin':
        await this.realtimeManager.vendorCheckIn(
          action.data.vendorId,
          action.data.location,
          action.data.notes,
        );
        break;

      case 'timeline_update':
        await this.realtimeManager.updateTimelineEvent(
          action.data.eventId,
          action.data.update,
        );
        break;

      case 'issue_create':
        await this.realtimeManager.createIssue(action.data.issue);
        break;

      case 'issue_update':
        await this.realtimeManager.updateIssue(
          action.data.issueId,
          action.data.update,
        );
        break;

      case 'status_update':
        await this.realtimeManager.updateVendorStatus(
          action.data.vendorId,
          action.data.status,
          action.data.eta,
        );
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  /**
   * Fetch the latest data from the server
   */
  private async fetchLatestData(): Promise<void> {
    try {
      // In a real implementation, you would fetch data from your API
      // For now, we'll simulate this with mock data
      console.log('Fetching latest wedding day data...');

      // This would typically be API calls like:
      // const vendors = await fetch(`/api/weddings/${this.weddingId}/vendors`)
      // const timeline = await fetch(`/api/weddings/${this.weddingId}/timeline`)
      // const issues = await fetch(`/api/weddings/${this.weddingId}/issues`)
      // const weather = await fetch(`/api/weddings/${this.weddingId}/weather`)

      // For demo purposes, we'll use mock data
      await this.updateLocalDataWithMocks();
    } catch (error) {
      console.error('Failed to fetch latest data:', error);
      throw error;
    }
  }

  /**
   * Update local store with mock data (replace with real API calls)
   */
  private async updateLocalDataWithMocks(): Promise<void> {
    // This is a placeholder - in a real app, you'd fetch actual data from your API
    const mockVendors = [
      {
        id: 'vendor-1',
        vendorId: 'vendor-1',
        vendorName: 'Elegant Florals',
        vendorType: 'florist' as const,
        checkInTime: new Date().toISOString(),
        location: { lat: 40.7128, lng: -74.006, address: 'New York, NY' },
        status: 'checked-in' as const,
        notes: 'Flowers delivered on time',
        contact: { phone: '555-0123', email: 'flowers@elegant.com' },
        assignedTasks: ['Ceremony arrangements', 'Reception centerpieces'],
      },
    ];

    const mockTimeline = [
      {
        id: 'event-1',
        title: 'Ceremony Setup',
        description: 'Set up ceremony decorations and seating',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
        duration: 60,
        location: 'Garden Pavilion',
        status: 'pending' as const,
        priority: 'high' as const,
        assignedVendors: ['vendor-1'],
        requirements: ['Chairs', 'Arch decorations', 'Sound system'],
        weather_dependent: true,
        notes: 'Check weather forecast',
      },
    ];

    const mockIssues = [];

    const mockWeather = {
      condition: 'clear' as const,
      temperature: 72,
      humidity: 45,
      windSpeed: 8,
      precipitation: 10,
      visibility: 10,
      timestamp: new Date().toISOString(),
      forecast: [
        {
          time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
          condition: 'clear' as const,
          temperature: 74,
          precipitation: 5,
        },
        {
          time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          condition: 'cloudy' as const,
          temperature: 71,
          precipitation: 15,
        },
      ],
    };

    // Update the offline store with the fetched data
    this.offlineStore.updateVendors(mockVendors);
    this.offlineStore.updateTimeline(mockTimeline);
    this.offlineStore.updateIssues(mockIssues);
    this.offlineStore.updateWeather(mockWeather);

    console.log('Local data updated with server data');
  }

  /**
   * Set up periodic sync to keep data fresh
   */
  private setupPeriodicSync(): void {
    // Clear existing interval
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    // Sync every 30 seconds
    this.syncIntervalId = setInterval(async () => {
      if (!this.syncInProgress && this.offlineStore.isOnline) {
        try {
          await this.syncPendingActions();
          await this.fetchLatestData();
          this.offlineStore.setLastSyncTime(new Date().toISOString());
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      }
    }, 30000); // 30 seconds
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    if (!this.offlineStore.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    await this.startSync();
  }

  /**
   * Retry failed actions
   */
  async retryFailedActions(): Promise<void> {
    const { failedActions } = this.offlineStore;

    if (failedActions.length === 0) {
      console.log('No failed actions to retry');
      return;
    }

    console.log(`Retrying ${failedActions.length} failed actions...`);

    // Move failed actions back to pending
    failedActions.forEach((action) => {
      this.offlineStore.retryAction(action.id);
    });

    // Trigger sync
    if (this.offlineStore.isOnline) {
      await this.startSync();
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const {
      pendingActions,
      failedActions,
      isOnline,
      syncInProgress,
      lastSyncTime,
    } = this.offlineStore;

    return {
      isOnline,
      syncInProgress,
      lastSyncTime,
      pendingActionsCount: pendingActions.length,
      failedActionsCount: failedActions.length,
      hasUnsyncedData: pendingActions.length > 0 || failedActions.length > 0,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopSync();
    this.realtimeManager = null;
  }
}

// Hook for using sync manager
export const useWeddingDaySyncManager = (
  weddingId: string,
  coordinatorId: string,
) => {
  const [syncManager, setSyncManager] =
    React.useState<WeddingDaySyncManager | null>(null);

  React.useEffect(() => {
    const manager = new WeddingDaySyncManager(weddingId, coordinatorId);
    setSyncManager(manager);

    return () => {
      manager.destroy();
    };
  }, [weddingId, coordinatorId]);

  return syncManager;
};
