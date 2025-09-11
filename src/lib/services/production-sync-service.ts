/**
 * Production Sync Service
 * WS-155: Guest Communications - Round 3
 * Ensures perfect synchronization between mobile, desktop, and web platforms
 */

import { supabase } from '@/lib/supabase';

interface SyncEntity {
  id: string;
  type: 'message' | 'thread' | 'notification' | 'preference' | 'draft';
  data: any;
  timestamp: string;
  version: number;
  deviceId: string;
  userId: string;
  hash: string;
}

interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  resolver?: (local: any, remote: any) => any;
}

interface SyncStatus {
  lastSync: string;
  pendingUploads: number;
  pendingDownloads: number;
  conflicts: number;
  isOnline: boolean;
  isSyncing: boolean;
}

interface DeviceInfo {
  id: string;
  type: 'mobile' | 'desktop' | 'web';
  platform: string;
  version: string;
  lastSeen: string;
  isActive: boolean;
}

export class ProductionSyncService {
  private static instance: ProductionSyncService;
  private syncQueue: SyncEntity[] = [];
  private conflictQueue: { local: SyncEntity; remote: SyncEntity }[] = [];
  private syncInProgress: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private deviceId: string;
  private currentUser: string | null = null;
  private lastSyncTimestamp: string = '0';
  private conflictResolutionRules: Map<string, ConflictResolution> = new Map();

  private constructor() {
    this.deviceId = this.generateDeviceId();
    this.initializeConflictResolution();
    this.setupSyncListeners();
    this.startPeriodicSync();
  }

  static getInstance(): ProductionSyncService {
    if (!this.instance) {
      this.instance = new ProductionSyncService();
    }
    return this.instance;
  }

  /**
   * Initialize sync for user
   */
  async initializeSync(userId: string): Promise<void> {
    this.currentUser = userId;
    this.lastSyncTimestamp =
      localStorage.getItem(`sync_timestamp_${userId}`) || '0';

    // Register device
    await this.registerDevice();

    // Perform initial sync
    await this.performFullSync();

    console.log(`Sync initialized for user ${userId}`);
  }

  /**
   * Initialize conflict resolution rules
   */
  private initializeConflictResolution() {
    // Messages: Server wins (prevent duplication)
    this.conflictResolutionRules.set('message', {
      strategy: 'server-wins',
    });

    // Threads: Merge (combine metadata)
    this.conflictResolutionRules.set('thread', {
      strategy: 'merge',
      resolver: (local, remote) => ({
        ...remote,
        metadata: { ...local.metadata, ...remote.metadata },
        participants: Array.from(
          new Set([
            ...(local.participants || []),
            ...(remote.participants || []),
          ]),
        ),
      }),
    });

    // Notifications: Client wins for read status
    this.conflictResolutionRules.set('notification', {
      strategy: 'merge',
      resolver: (local, remote) => ({
        ...remote,
        read: local.read || remote.read,
        dismissed: local.dismissed || remote.dismissed,
      }),
    });

    // Preferences: Client wins (user's latest choice)
    this.conflictResolutionRules.set('preference', {
      strategy: 'client-wins',
    });

    // Drafts: Client wins (user's latest input)
    this.conflictResolutionRules.set('draft', {
      strategy: 'client-wins',
    });
  }

  /**
   * Setup sync listeners
   */
  private setupSyncListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.performIncrementalSync();
      }
    });

    // Listen for storage events (other tabs)
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('sync_')) {
        this.handleStorageChange(event);
      }
    });

    // Listen for Supabase realtime updates
    this.setupRealtimeSubscription();
  }

  /**
   * Setup Supabase realtime subscription
   */
  private setupRealtimeSubscription() {
    if (!this.currentUser) return;

    const subscription = supabase
      .channel(`sync_${this.currentUser}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_entities',
          filter: `user_id=eq.${this.currentUser}`,
        },
        (payload) => {
          this.handleRealtimeUpdate(payload);
        },
      )
      .subscribe();
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (!this.syncInProgress && navigator.onLine) {
        this.performIncrementalSync();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Sync an entity
   */
  async syncEntity(
    type: SyncEntity['type'],
    id: string,
    data: any,
    userId?: string,
  ): Promise<void> {
    const entity: SyncEntity = {
      id,
      type,
      data,
      timestamp: new Date().toISOString(),
      version: this.generateVersion(),
      deviceId: this.deviceId,
      userId: userId || this.currentUser!,
      hash: this.generateHash(data),
    };

    // Add to local queue
    this.syncQueue.push(entity);

    // Store locally for offline support
    await this.storeLocally(entity);

    // Attempt immediate sync if online
    if (navigator.onLine && !this.syncInProgress) {
      this.performIncrementalSync();
    }
  }

  /**
   * Perform full sync
   */
  async performFullSync(): Promise<void> {
    if (this.syncInProgress || !this.currentUser) return;

    this.syncInProgress = true;
    console.log('Starting full sync...');

    try {
      // Download all changes since last sync
      await this.downloadChanges();

      // Upload all pending changes
      await this.uploadChanges();

      // Resolve conflicts
      await this.resolveConflicts();

      // Update last sync timestamp
      this.updateLastSyncTimestamp();

      console.log('Full sync completed');
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Perform incremental sync
   */
  async performIncrementalSync(): Promise<void> {
    if (this.syncInProgress || !this.currentUser || !navigator.onLine) return;

    this.syncInProgress = true;

    try {
      // Upload pending changes first
      await this.uploadPendingChanges();

      // Download new changes
      await this.downloadRecentChanges();

      // Quick conflict resolution
      await this.resolveConflicts();

      this.updateLastSyncTimestamp();
    } catch (error) {
      console.error('Incremental sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Download changes from server
   */
  private async downloadChanges(): Promise<void> {
    const { data: serverEntities } = await supabase
      .from('sync_entities')
      .select('*')
      .eq('user_id', this.currentUser)
      .gt('timestamp', this.lastSyncTimestamp)
      .neq('device_id', this.deviceId)
      .order('timestamp', { ascending: true });

    if (serverEntities) {
      for (const serverEntity of serverEntities) {
        await this.processServerEntity(serverEntity);
      }
    }
  }

  /**
   * Download recent changes
   */
  private async downloadRecentChanges(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recentEntities } = await supabase
      .from('sync_entities')
      .select('*')
      .eq('user_id', this.currentUser)
      .gt('timestamp', Math.max(this.lastSyncTimestamp, fiveMinutesAgo))
      .neq('device_id', this.deviceId)
      .order('timestamp', { ascending: true });

    if (recentEntities) {
      for (const entity of recentEntities) {
        await this.processServerEntity(entity);
      }
    }
  }

  /**
   * Upload changes to server
   */
  private async uploadChanges(): Promise<void> {
    const localEntities = await this.getLocalEntities();

    for (const entity of localEntities) {
      try {
        await supabase.from('sync_entities').upsert(entity);

        // Apply to local state
        await this.applyEntityToLocalState(entity);

        // Remove from local queue
        this.removeFromLocalQueue(entity.id);
      } catch (error) {
        console.error('Failed to upload entity:', entity.id, error);
      }
    }
  }

  /**
   * Upload pending changes
   */
  private async uploadPendingChanges(): Promise<void> {
    const pendingEntities = [...this.syncQueue];
    this.syncQueue = [];

    for (const entity of pendingEntities) {
      try {
        await supabase.from('sync_entities').upsert(entity);

        await this.removeFromLocalStorage(entity.id);
      } catch (error) {
        console.error('Failed to upload pending entity:', entity.id, error);
        // Re-add to queue for retry
        this.syncQueue.push(entity);
      }
    }
  }

  /**
   * Process server entity
   */
  private async processServerEntity(serverEntity: SyncEntity): Promise<void> {
    const localEntity = await this.getLocalEntity(
      serverEntity.id,
      serverEntity.type,
    );

    if (localEntity) {
      // Check for conflicts
      if (this.hasConflict(localEntity, serverEntity)) {
        this.conflictQueue.push({ local: localEntity, remote: serverEntity });
      } else {
        // No conflict, apply server entity
        await this.applyEntityToLocalState(serverEntity);
      }
    } else {
      // New entity, apply directly
      await this.applyEntityToLocalState(serverEntity);
    }
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflicts(): Promise<void> {
    while (this.conflictQueue.length > 0) {
      const conflict = this.conflictQueue.shift()!;
      const resolution = this.conflictResolutionRules.get(conflict.local.type);

      if (resolution) {
        const resolvedEntity = this.resolveConflict(conflict, resolution);
        await this.applyEntityToLocalState(resolvedEntity);

        // Upload resolved entity
        await supabase.from('sync_entities').upsert(resolvedEntity);
      } else {
        console.warn('No resolution rule for conflict:', conflict.local.type);
      }
    }
  }

  /**
   * Resolve individual conflict
   */
  private resolveConflict(
    conflict: { local: SyncEntity; remote: SyncEntity },
    resolution: ConflictResolution,
  ): SyncEntity {
    const { local, remote } = conflict;

    switch (resolution.strategy) {
      case 'client-wins':
        return { ...local, timestamp: new Date().toISOString() };

      case 'server-wins':
        return remote;

      case 'merge':
        if (resolution.resolver) {
          const mergedData = resolution.resolver(local.data, remote.data);
          return {
            ...remote,
            data: mergedData,
            timestamp: new Date().toISOString(),
            version: this.generateVersion(),
          };
        }
        return remote;

      case 'manual':
        // Store for manual resolution
        this.storeManualConflict(conflict);
        return remote; // Use server version temporarily

      default:
        return remote;
    }
  }

  /**
   * Apply entity to local state
   */
  private async applyEntityToLocalState(entity: SyncEntity): Promise<void> {
    switch (entity.type) {
      case 'message':
        await this.applyMessage(entity);
        break;
      case 'thread':
        await this.applyThread(entity);
        break;
      case 'notification':
        await this.applyNotification(entity);
        break;
      case 'preference':
        await this.applyPreference(entity);
        break;
      case 'draft':
        await this.applyDraft(entity);
        break;
    }

    // Dispatch event for UI updates
    window.dispatchEvent(
      new CustomEvent('sync-entity-applied', {
        detail: entity,
      }),
    );
  }

  /**
   * Apply message entity
   */
  private async applyMessage(entity: SyncEntity): Promise<void> {
    const message = entity.data;

    // Update in database
    await supabase.from('guest_messages').upsert({
      id: entity.id,
      ...message,
      synced_at: entity.timestamp,
    });

    // Update in local cache
    const cachedMessages = JSON.parse(
      localStorage.getItem('cached_messages') || '[]',
    );
    const existingIndex = cachedMessages.findIndex(
      (m: any) => m.id === entity.id,
    );

    if (existingIndex >= 0) {
      cachedMessages[existingIndex] = message;
    } else {
      cachedMessages.push(message);
    }

    localStorage.setItem('cached_messages', JSON.stringify(cachedMessages));
  }

  /**
   * Apply thread entity
   */
  private async applyThread(entity: SyncEntity): Promise<void> {
    const thread = entity.data;

    await supabase.from('message_threads').upsert({
      id: entity.id,
      ...thread,
      synced_at: entity.timestamp,
    });
  }

  /**
   * Apply notification entity
   */
  private async applyNotification(entity: SyncEntity): Promise<void> {
    const notification = entity.data;

    await supabase.from('notifications').upsert({
      id: entity.id,
      ...notification,
      synced_at: entity.timestamp,
    });
  }

  /**
   * Apply preference entity
   */
  private async applyPreference(entity: SyncEntity): Promise<void> {
    const preferences = entity.data;
    localStorage.setItem(
      `preferences_${this.currentUser}`,
      JSON.stringify(preferences),
    );
  }

  /**
   * Apply draft entity
   */
  private async applyDraft(entity: SyncEntity): Promise<void> {
    const draft = entity.data;
    localStorage.setItem(`draft_${entity.id}`, JSON.stringify(draft));
  }

  /**
   * Handle realtime update
   */
  private handleRealtimeUpdate(payload: any): void {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const entity = payload.new as SyncEntity;
      if (entity.device_id !== this.deviceId) {
        this.processServerEntity(entity);
      }
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('Device came online, starting sync...');
    this.performIncrementalSync();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('Device went offline');
  }

  /**
   * Handle storage change from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === `sync_timestamp_${this.currentUser}` && event.newValue) {
      this.lastSyncTimestamp = event.newValue;
    }
  }

  /**
   * Register device
   */
  private async registerDevice(): Promise<void> {
    const deviceInfo: DeviceInfo = {
      id: this.deviceId,
      type: this.detectDeviceType(),
      platform: this.detectPlatform(),
      version: '1.0.0', // App version
      lastSeen: new Date().toISOString(),
      isActive: true,
    };

    await supabase.from('sync_devices').upsert({
      id: this.deviceId,
      user_id: this.currentUser,
      ...deviceInfo,
    });
  }

  /**
   * Helper methods
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private generateVersion(): number {
    return Date.now();
  }

  private generateHash(data: any): string {
    return btoa(JSON.stringify(data))
      .replace(/[^a-zA-Z0-9]/g, '')
      .substr(0, 16);
  }

  private detectDeviceType(): 'mobile' | 'desktop' | 'web' {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod|Android/.test(userAgent)) {
      return 'mobile';
    }
    if (window.electron) {
      return 'desktop';
    }
    return 'web';
  }

  private detectPlatform(): string {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
    if (/Android/.test(userAgent)) return 'Android';
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Macintosh/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    return 'Unknown';
  }

  private hasConflict(local: SyncEntity, remote: SyncEntity): boolean {
    return local.hash !== remote.hash && local.version !== remote.version;
  }

  private async storeLocally(entity: SyncEntity): Promise<void> {
    const key = `sync_entity_${entity.id}`;
    localStorage.setItem(key, JSON.stringify(entity));
  }

  private async getLocalEntities(): Promise<SyncEntity[]> {
    const entities: SyncEntity[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sync_entity_')) {
        const entity = JSON.parse(localStorage.getItem(key)!);
        entities.push(entity);
      }
    }
    return entities;
  }

  private async getLocalEntity(
    id: string,
    type: string,
  ): Promise<SyncEntity | null> {
    const key = `sync_entity_${id}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  private removeFromLocalQueue(id: string): void {
    this.syncQueue = this.syncQueue.filter((entity) => entity.id !== id);
  }

  private async removeFromLocalStorage(id: string): Promise<void> {
    const key = `sync_entity_${id}`;
    localStorage.removeItem(key);
  }

  private updateLastSyncTimestamp(): void {
    this.lastSyncTimestamp = new Date().toISOString();
    localStorage.setItem(
      `sync_timestamp_${this.currentUser}`,
      this.lastSyncTimestamp,
    );
  }

  private storeManualConflict(conflict: {
    local: SyncEntity;
    remote: SyncEntity;
  }): void {
    const conflicts = JSON.parse(
      localStorage.getItem('manual_conflicts') || '[]',
    );
    conflicts.push({
      ...conflict,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('manual_conflicts', JSON.stringify(conflicts));
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSync: this.lastSyncTimestamp,
      pendingUploads: this.syncQueue.length,
      pendingDownloads: 0, // Would need to check server
      conflicts: this.conflictQueue.length,
      isOnline: navigator.onLine,
      isSyncing: this.syncInProgress,
    };
  }

  /**
   * Get registered devices
   */
  async getRegisteredDevices(): Promise<DeviceInfo[]> {
    const { data } = await supabase
      .from('sync_devices')
      .select('*')
      .eq('user_id', this.currentUser);

    return data || [];
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    await this.performFullSync();
  }

  /**
   * Clear sync data
   */
  async clearSyncData(): Promise<void> {
    // Clear local storage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('sync_')) {
        localStorage.removeItem(key);
      }
    }

    // Clear queues
    this.syncQueue = [];
    this.conflictQueue = [];

    // Reset timestamp
    this.lastSyncTimestamp = '0';
  }

  /**
   * Cleanup on service destruction
   */
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

// Export singleton instance
export const productionSync = ProductionSyncService.getInstance();
