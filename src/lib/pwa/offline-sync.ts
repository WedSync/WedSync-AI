import { createClient } from '@supabase/supabase-js';

export interface OfflineSyncConfig {
  maxRetries: number;
  retryDelay: number; // base delay in ms
  maxDelay: number; // maximum delay in ms
  batchSize: number;
  syncInterval: number; // sync check interval in ms
  criticalSyncTimeout: number; // timeout for critical data sync
}

export interface SyncItem {
  id: string;
  type:
    | 'incident'
    | 'contact'
    | 'venue_data'
    | 'performance_metric'
    | 'scaling_event';
  data: any;
  timestamp: Date;
  retryCount: number;
  lastAttempt?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  venueId?: string;
  userId?: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed' | 'expired';
  errorMessage?: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export class OfflineSyncManager {
  private supabase;
  private config: OfflineSyncConfig;
  private syncQueue: Map<string, SyncItem> = new Map();
  private isOnline: boolean = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;
  private criticalSyncTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Set<(event: SyncEvent) => void> = new Set();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<OfflineSyncConfig>,
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = {
      maxRetries: 5,
      retryDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      batchSize: 10,
      syncInterval: 30000, // 30 seconds
      criticalSyncTimeout: 5000, // 5 seconds for critical items
      ...config,
    };

    this.initializeEventListeners();
    this.startPeriodicSync();
    this.loadPersistedQueue();
  }

  private initializeEventListeners(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
      this.notifyListeners({ type: 'online', data: null });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners({ type: 'offline', data: null });
    });

    // Listen for visibility changes (app comes to foreground)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });

    // Service Worker message handling
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        this.handleServiceWorkerSync(event.data);
      }
    });
  }

  /**
   * Add item to sync queue with priority handling
   */
  async addToQueue(
    type: SyncItem['type'],
    data: any,
    priority: SyncItem['priority'] = 'medium',
    metadata?: {
      venueId?: string;
      userId?: string;
    },
  ): Promise<string> {
    const syncItem: SyncItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      priority,
      venueId: metadata?.venueId,
      userId: metadata?.userId,
      syncStatus: 'pending',
    };

    this.syncQueue.set(syncItem.id, syncItem);
    await this.persistQueue();

    // Trigger immediate sync for critical items
    if (priority === 'critical' && this.isOnline) {
      this.triggerCriticalSync(syncItem);
    } else if (this.isOnline) {
      // Standard sync for non-critical items
      setTimeout(() => this.triggerSync(), 100);
    }

    this.notifyListeners({
      type: 'item_added',
      data: { id: syncItem.id, type, priority },
    });

    return syncItem.id;
  }

  /**
   * Immediate sync for critical items (incidents, emergency contacts)
   */
  private async triggerCriticalSync(item: SyncItem): Promise<void> {
    if (this.criticalSyncTimeout) {
      clearTimeout(this.criticalSyncTimeout);
    }

    this.criticalSyncTimeout = setTimeout(async () => {
      try {
        await this.syncSingleItem(item);
      } catch (error) {
        console.error('Critical sync failed:', error);
        this.notifyListeners({
          type: 'critical_sync_failed',
          data: { id: item.id, error: error.message },
        });
      }
    }, 100);
  }

  /**
   * Main sync process with batch handling
   */
  async triggerSync(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, synced: 0, failed: 0, errors: [] };
    }

    const pendingItems = Array.from(this.syncQueue.values())
      .filter(
        (item) =>
          item.syncStatus === 'pending' ||
          (item.syncStatus === 'failed' &&
            item.retryCount < this.config.maxRetries),
      )
      .sort((a, b) => {
        // Sort by priority (critical first)
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // Then by timestamp (oldest first)
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

    if (pendingItems.length === 0) {
      return { success: true, synced: 0, failed: 0, errors: [] };
    }

    this.notifyListeners({
      type: 'sync_started',
      data: { itemCount: pendingItems.length },
    });

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < pendingItems.length; i += this.config.batchSize) {
      const batch = pendingItems.slice(i, i + this.config.batchSize);

      await Promise.all(
        batch.map(async (item) => {
          try {
            const success = await this.syncSingleItem(item);
            if (success) {
              result.synced++;
            } else {
              result.failed++;
              result.errors.push({
                id: item.id,
                error: item.errorMessage || 'Unknown error',
              });
            }
          } catch (error) {
            result.failed++;
            result.errors.push({ id: item.id, error: error.message });
          }
        }),
      );

      // Add delay between batches to avoid overwhelming the server
      if (i + this.config.batchSize < pendingItems.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    await this.persistQueue();

    this.notifyListeners({
      type: 'sync_completed',
      data: result,
    });

    return result;
  }

  /**
   * Sync individual item with retry logic
   */
  private async syncSingleItem(item: SyncItem): Promise<boolean> {
    item.syncStatus = 'syncing';
    item.lastAttempt = new Date();

    try {
      let success = false;

      switch (item.type) {
        case 'incident':
          success = await this.syncIncident(item);
          break;
        case 'contact':
          success = await this.syncContact(item);
          break;
        case 'venue_data':
          success = await this.syncVenueData(item);
          break;
        case 'performance_metric':
          success = await this.syncPerformanceMetric(item);
          break;
        case 'scaling_event':
          success = await this.syncScalingEvent(item);
          break;
        default:
          throw new Error(`Unknown sync type: ${item.type}`);
      }

      if (success) {
        item.syncStatus = 'synced';
        this.syncQueue.delete(item.id); // Remove synced items

        this.notifyListeners({
          type: 'item_synced',
          data: { id: item.id, type: item.type },
        });

        return true;
      } else {
        throw new Error('Sync operation returned false');
      }
    } catch (error) {
      item.retryCount++;
      item.errorMessage = error.message;

      if (item.retryCount >= this.config.maxRetries) {
        item.syncStatus = 'expired';
        this.notifyListeners({
          type: 'item_expired',
          data: { id: item.id, type: item.type, error: error.message },
        });
      } else {
        item.syncStatus = 'failed';
        // Schedule retry with exponential backoff
        const delay = Math.min(
          this.config.retryDelay * Math.pow(2, item.retryCount - 1),
          this.config.maxDelay,
        );

        setTimeout(() => {
          if (this.isOnline && this.syncQueue.has(item.id)) {
            this.syncSingleItem(item);
          }
        }, delay);
      }

      return false;
    }
  }

  /**
   * Sync incident data to Supabase
   */
  private async syncIncident(item: SyncItem): Promise<boolean> {
    const { data: incident } = item;

    const { error } = await this.supabase.from('incidents').upsert({
      id: incident.id,
      type: incident.type,
      severity: incident.severity,
      location: incident.location,
      description: incident.description,
      reported_by: incident.reportedBy,
      venue_id: incident.venueId,
      coordinates: incident.coordinates,
      timestamp: incident.timestamp,
      status: incident.status || 'active',
      offline_created: true,
      synced_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Incident sync failed: ${error.message}`);
    }

    // Sync voice recording if present
    if (incident.voiceRecording) {
      await this.uploadVoiceRecording(incident.id, incident.voiceRecording);
    }

    // Sync photos if present
    if (incident.photos && incident.photos.length > 0) {
      await this.uploadIncidentPhotos(incident.id, incident.photos);
    }

    return true;
  }

  /**
   * Sync emergency contact data
   */
  private async syncContact(item: SyncItem): Promise<boolean> {
    const { data: contact } = item;

    const { error } = await this.supabase.from('emergency_contacts').upsert({
      id: contact.id,
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
      venue_id: contact.venueId,
      is_primary: contact.isPrimary,
      priority: contact.priority,
      synced_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Contact sync failed: ${error.message}`);
    }

    return true;
  }

  /**
   * Sync venue data
   */
  private async syncVenueData(item: SyncItem): Promise<boolean> {
    const { data: venueData } = item;

    const { error } = await this.supabase.from('venues').upsert({
      id: venueData.id,
      name: venueData.name,
      address: venueData.address,
      coordinates: venueData.coordinates,
      emergency_procedures: venueData.emergencyProcedures,
      security_contacts: venueData.securityContacts,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Venue data sync failed: ${error.message}`);
    }

    return true;
  }

  /**
   * Sync performance metrics
   */
  private async syncPerformanceMetric(item: SyncItem): Promise<boolean> {
    const { data: metric } = item;

    const { error } = await this.supabase.from('performance_metrics').insert({
      metric_name: metric.metricName,
      metric_value: metric.metricValue,
      metric_unit: metric.metricUnit,
      timestamp: metric.timestamp,
      venue_id: metric.venueId,
      user_id: metric.userId,
      endpoint: metric.endpoint,
      device_type: metric.deviceType,
      connection_type: metric.connectionType,
      location: metric.location,
      metadata: metric.metadata,
    });

    if (error) {
      throw new Error(`Performance metric sync failed: ${error.message}`);
    }

    return true;
  }

  /**
   * Sync scaling events
   */
  private async syncScalingEvent(item: SyncItem): Promise<boolean> {
    const { data: event } = item;

    const { error } = await this.supabase.from('scaling_events').insert({
      incident_id: event.incidentId,
      trigger_type: event.triggerType,
      scaling_action: event.scalingAction,
      resource_type: event.resourceType,
      target_capacity: event.targetCapacity,
      current_capacity: event.currentCapacity,
      timestamp: event.timestamp,
      status: event.status,
      venue_id: event.venueId,
      metadata: event.metadata,
    });

    if (error) {
      throw new Error(`Scaling event sync failed: ${error.message}`);
    }

    return true;
  }

  /**
   * Upload voice recording to Supabase Storage
   */
  private async uploadVoiceRecording(
    incidentId: string,
    recording: Blob,
  ): Promise<void> {
    const fileName = `incidents/${incidentId}/voice-recording-${Date.now()}.webm`;

    const { error } = await this.supabase.storage
      .from('incident-evidence')
      .upload(fileName, recording);

    if (error) {
      throw new Error(`Voice recording upload failed: ${error.message}`);
    }
  }

  /**
   * Upload incident photos to Supabase Storage
   */
  private async uploadIncidentPhotos(
    incidentId: string,
    photos: File[],
  ): Promise<void> {
    const uploadPromises = photos.map(async (photo, index) => {
      const fileName = `incidents/${incidentId}/photo-${index}-${Date.now()}.${photo.name.split('.').pop()}`;

      const { error } = await this.supabase.storage
        .from('incident-evidence')
        .upload(fileName, photo);

      if (error) {
        throw new Error(`Photo upload failed: ${error.message}`);
      }
    });

    await Promise.all(uploadPromises);
  }

  /**
   * Handle sync completion from service worker
   */
  private handleServiceWorkerSync(data: any): void {
    if (data.syncedItems) {
      data.syncedItems.forEach((itemId: string) => {
        this.syncQueue.delete(itemId);
      });
      this.persistQueue();
    }
  }

  /**
   * Persist sync queue to localStorage
   */
  private async persistQueue(): Promise<void> {
    try {
      const queueData = Array.from(this.syncQueue.entries()).map(
        ([id, item]) => [
          id,
          {
            ...item,
            timestamp: item.timestamp.toISOString(),
            lastAttempt: item.lastAttempt?.toISOString(),
          },
        ],
      );

      localStorage.setItem('wedsync_sync_queue', JSON.stringify(queueData));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }

  /**
   * Load persisted sync queue from localStorage
   */
  private async loadPersistedQueue(): Promise<void> {
    try {
      const queueData = localStorage.getItem('wedsync_sync_queue');
      if (queueData) {
        const parsedData = JSON.parse(queueData);

        parsedData.forEach(([id, item]: [string, any]) => {
          this.syncQueue.set(id, {
            ...item,
            timestamp: new Date(item.timestamp),
            lastAttempt: item.lastAttempt
              ? new Date(item.lastAttempt)
              : undefined,
          });
        });

        // Trigger sync if online
        if (this.isOnline && this.syncQueue.size > 0) {
          setTimeout(() => this.triggerSync(), 1000);
        }
      }
    } catch (error) {
      console.error('Failed to load persisted sync queue:', error);
    }
  }

  /**
   * Start periodic sync check
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.size > 0) {
        this.triggerSync();
      }
    }, this.config.syncInterval);
  }

  /**
   * Add event listener for sync events
   */
  addEventListener(listener: (event: SyncEvent) => void): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: SyncEvent) => void): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Notify all event listeners
   */
  private notifyListeners(event: SyncEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Sync event listener error:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): {
    isOnline: boolean;
    queueSize: number;
    pendingCount: number;
    failedCount: number;
    criticalCount: number;
  } {
    const items = Array.from(this.syncQueue.values());

    return {
      isOnline: this.isOnline,
      queueSize: this.syncQueue.size,
      pendingCount: items.filter((item) => item.syncStatus === 'pending')
        .length,
      failedCount: items.filter((item) => item.syncStatus === 'failed').length,
      criticalCount: items.filter((item) => item.priority === 'critical')
        .length,
    };
  }

  /**
   * Clear expired items from queue
   */
  clearExpiredItems(): number {
    const expiredItems = Array.from(this.syncQueue.entries())
      .filter(([_, item]) => item.syncStatus === 'expired')
      .map(([id]) => id);

    expiredItems.forEach((id) => this.syncQueue.delete(id));

    if (expiredItems.length > 0) {
      this.persistQueue();
    }

    return expiredItems.length;
  }

  /**
   * Force sync specific item by ID
   */
  async forceSyncItem(itemId: string): Promise<boolean> {
    const item = this.syncQueue.get(itemId);
    if (!item) {
      return false;
    }

    item.retryCount = 0; // Reset retry count for force sync
    return await this.syncSingleItem(item);
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.criticalSyncTimeout) {
      clearTimeout(this.criticalSyncTimeout);
    }
    this.eventListeners.clear();
    this.persistQueue();
  }
}

// Event types
export type SyncEvent =
  | { type: 'online'; data: null }
  | { type: 'offline'; data: null }
  | { type: 'item_added'; data: { id: string; type: string; priority: string } }
  | { type: 'item_synced'; data: { id: string; type: string } }
  | { type: 'item_expired'; data: { id: string; type: string; error: string } }
  | { type: 'sync_started'; data: { itemCount: number } }
  | { type: 'sync_completed'; data: SyncResult }
  | { type: 'critical_sync_failed'; data: { id: string; error: string } };

// Factory function
export function createOfflineSyncManager(
  config?: Partial<OfflineSyncConfig>,
): OfflineSyncManager {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return new OfflineSyncManager(supabaseUrl, supabaseKey, config);
}

// Global instance
let globalSyncManager: OfflineSyncManager | null = null;

export function getOfflineSyncManager(): OfflineSyncManager {
  if (!globalSyncManager) {
    globalSyncManager = createOfflineSyncManager();
  }
  return globalSyncManager;
}
