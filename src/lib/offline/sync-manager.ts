/**
 * WS-196 Team D: Comprehensive Offline Data Synchronization System
 *
 * Advanced offline-first data synchronization with intelligent conflict resolution,
 * wedding-specific business logic, and cross-device state management
 */

import { createClient } from '@supabase/supabase-js';

export interface OfflineDataItem {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: number;
  userId: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  deviceId: string;
  sessionId: string;
}

export interface SyncConflict {
  id: string;
  table: string;
  localData: Record<string, any>;
  serverData: Record<string, any>;
  conflictFields: string[];
  resolution: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  timestamp: number;
  userId: string;
  resolved: boolean;
}

export interface SyncMetrics {
  totalSynced: number;
  totalFailed: number;
  conflictsResolved: number;
  averageSyncTime: number;
  lastSyncTimestamp: number;
  pendingItems: number;
  dataTransferred: number;
}

export class OfflineDataSyncManager {
  private indexedDB!: IDBDatabase;
  private syncQueue: OfflineDataItem[] = [];
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private deviceId: string;
  private sessionId: string;
  private metrics: SyncMetrics;
  private conflictResolutionStrategies: Map<string, ConflictResolutionStrategy>;

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.sessionId = this.generateSessionId();
    this.metrics = {
      totalSynced: 0,
      totalFailed: 0,
      conflictsResolved: 0,
      averageSyncTime: 0,
      lastSyncTimestamp: 0,
      pendingItems: 0,
      dataTransferred: 0,
    };

    this.conflictResolutionStrategies = new Map();
    this.setupConflictResolutionStrategies();

    this.initializeIndexedDB();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncOfflineDB', 3);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        this.loadSyncQueue();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Enhanced offline data store
        if (!db.objectStoreNames.contains('offline_data')) {
          const offlineStore = db.createObjectStore('offline_data', {
            keyPath: 'id',
          });
          offlineStore.createIndex('table', 'table', { unique: false });
          offlineStore.createIndex('timestamp', 'timestamp', { unique: false });
          offlineStore.createIndex('syncStatus', 'syncStatus', {
            unique: false,
          });
          offlineStore.createIndex('priority', 'priority', { unique: false });
          offlineStore.createIndex('userId', 'userId', { unique: false });
          offlineStore.createIndex('deviceId', 'deviceId', { unique: false });
        }

        // Conflict resolution store
        if (!db.objectStoreNames.contains('sync_conflicts')) {
          const conflictStore = db.createObjectStore('sync_conflicts', {
            keyPath: 'id',
          });
          conflictStore.createIndex('table', 'table', { unique: false });
          conflictStore.createIndex('userId', 'userId', { unique: false });
          conflictStore.createIndex('resolved', 'resolved', { unique: false });
          conflictStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
        }

        // Enhanced cached API responses
        if (!db.objectStoreNames.contains('api_cache')) {
          const cacheStore = db.createObjectStore('api_cache', {
            keyPath: 'url',
          });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('table', 'table', { unique: false });
          cacheStore.createIndex('priority', 'priority', { unique: false });
        }

        // Sync metrics and analytics
        if (!db.objectStoreNames.contains('sync_metrics')) {
          const metricsStore = db.createObjectStore('sync_metrics', {
            keyPath: 'id',
          });
          metricsStore.createIndex('timestamp', 'timestamp', { unique: false });
          metricsStore.createIndex('deviceId', 'deviceId', { unique: false });
        }

        // Cross-device state management
        if (!db.objectStoreNames.contains('device_state')) {
          const deviceStore = db.createObjectStore('device_state', {
            keyPath: 'key',
          });
          deviceStore.createIndex('deviceId', 'deviceId', { unique: false });
          deviceStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private setupEventListeners(): void {
    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Visibility change for background sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.triggerSync();
      }
    });

    // Before unload - save pending state
    window.addEventListener('beforeunload', () => {
      this.saveCurrentState();
    });
  }

  private setupConflictResolutionStrategies(): void {
    // Wedding-specific conflict resolution strategies
    this.conflictResolutionStrategies.set('bookings', {
      resolve: this.resolveBookingConflict.bind(this),
      priority: 'critical',
    });

    this.conflictResolutionStrategies.set('forms', {
      resolve: this.resolveFormConflict.bind(this),
      priority: 'high',
    });

    this.conflictResolutionStrategies.set('clients', {
      resolve: this.resolveClientConflict.bind(this),
      priority: 'high',
    });

    this.conflictResolutionStrategies.set('timeline', {
      resolve: this.resolveTimelineConflict.bind(this),
      priority: 'critical',
    });

    this.conflictResolutionStrategies.set('vendors', {
      resolve: this.resolveVendorConflict.bind(this),
      priority: 'normal',
    });
  }

  public async saveForOfflineSync(
    table: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, any>,
    userId: string,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal',
  ): Promise<string> {
    const offlineItem: OfflineDataItem = {
      id: this.generateOfflineId(table, operation),
      table,
      operation,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      userId,
      syncStatus: 'pending',
      retryCount: 0,
      priority,
      deviceId: this.deviceId,
      sessionId: this.sessionId,
    };

    await this.storeOfflineData(offlineItem);
    this.syncQueue.push(offlineItem);

    // Update metrics
    this.metrics.pendingItems++;
    await this.updateMetrics();

    // Trigger sync if online
    if (this.isOnline) {
      this.triggerSync();
    }

    // Notify other tabs/devices
    this.broadcastStateChange('data_queued', {
      table,
      operation,
      priority,
      timestamp: Date.now(),
    });

    return offlineItem.id;
  }

  public async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      // Load any pending items from IndexedDB
      await this.loadSyncQueue();

      // Sort by priority and timestamp
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      // Process each item in the queue
      const syncResults = [];
      for (const item of this.syncQueue) {
        if (item.syncStatus !== 'pending') continue;

        try {
          const result = await this.syncItem(item);
          syncResults.push(result);

          if (!this.isOnline) {
            // Network went offline during sync
            break;
          }
        } catch (error) {
          await this.handleSyncError(item, error);
          syncResults.push({ success: false, item, error });
        }
      }

      // Remove successfully synced items
      this.syncQueue = this.syncQueue.filter(
        (item) => item.syncStatus !== 'synced',
      );

      // Update IndexedDB
      await this.updateSyncQueue();

      // Update metrics
      const syncTime = Date.now() - startTime;
      this.updateSyncMetrics(syncResults, syncTime);

      // Notify components of sync completion
      this.notifySync(syncResults);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: OfflineDataItem): Promise<{
    success: boolean;
    item: OfflineDataItem;
    conflict?: SyncConflict;
  }> {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    item.syncStatus = 'syncing';

    try {
      let result;

      switch (item.operation) {
        case 'create':
          result = await supabase.from(item.table).insert(item.data);
          break;
        case 'update':
          result = await supabase
            .from(item.table)
            .update(item.data)
            .eq('id', item.data.id);
          break;
        case 'delete':
          result = await supabase
            .from(item.table)
            .delete()
            .eq('id', item.data.id);
          break;
      }

      if (result.error) {
        // Check if this is a conflict error
        if (this.isConflictError(result.error)) {
          const conflict = await this.handleSyncConflict(item, result.error);
          return { success: false, item, conflict };
        }
        throw new Error(result.error.message);
      }

      item.syncStatus = 'synced';

      // Wedding-specific success actions
      await this.handleSuccessfulSync(item);

      this.metrics.totalSynced++;
      this.metrics.dataTransferred += this.calculateDataSize(item.data);

      return { success: true, item };
    } catch (error) {
      item.syncStatus = 'failed';
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      item.retryCount++;

      this.metrics.totalFailed++;

      throw error;
    }
  }

  private async handleSyncConflict(
    item: OfflineDataItem,
    error: any,
  ): Promise<SyncConflict> {
    // Fetch current server data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    const { data: serverData } = await supabase
      .from(item.table)
      .select('*')
      .eq('id', item.data.id)
      .single();

    if (serverData) {
      const conflict: SyncConflict = {
        id: `conflict_${item.id}`,
        table: item.table,
        localData: item.data,
        serverData,
        conflictFields: this.detectConflictFields(item.data, serverData),
        resolution: this.determineConflictResolution(
          item.table,
          item.data,
          serverData,
        ),
        timestamp: Date.now(),
        userId: item.userId,
        resolved: false,
      };

      await this.storeSyncConflict(conflict);

      // Auto-resolve if possible
      if (conflict.resolution !== 'manual') {
        await this.resolveConflict(conflict);
        conflict.resolved = true;
        this.metrics.conflictsResolved++;
      }

      return conflict;
    }

    throw new Error('Conflict detected but server data not found');
  }

  private detectConflictFields(localData: any, serverData: any): string[] {
    const conflicts: string[] = [];

    for (const key of Object.keys(localData)) {
      if (this.hasConflict(localData[key], serverData[key])) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  private hasConflict(localValue: any, serverValue: any): boolean {
    // Skip timestamp fields and auto-generated fields
    if (
      typeof localValue === 'string' &&
      localValue.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/)
    ) {
      return false; // Skip timestamp comparisons
    }

    return localValue !== serverValue;
  }

  private determineConflictResolution(
    table: string,
    localData: any,
    serverData: any,
  ): 'client_wins' | 'server_wins' | 'merge' | 'manual' {
    const strategy = this.conflictResolutionStrategies.get(table);

    if (strategy) {
      return strategy.resolve(localData, serverData);
    }

    // Default resolution strategy
    const localTime = new Date(
      localData.updated_at || localData.created_at,
    ).getTime();
    const serverTime = new Date(
      serverData.updated_at || serverData.created_at,
    ).getTime();

    return localTime > serverTime ? 'client_wins' : 'server_wins';
  }

  // Wedding-specific conflict resolution strategies
  private resolveBookingConflict(
    localData: any,
    serverData: any,
  ): 'client_wins' | 'server_wins' | 'merge' | 'manual' {
    // For bookings, server wins on payment status (financial accuracy is critical)
    if (localData.payment_status !== serverData.payment_status) {
      return 'server_wins';
    }

    // For status changes, most recent wins
    if (localData.status !== serverData.status) {
      const localTime = new Date(localData.updated_at).getTime();
      const serverTime = new Date(serverData.updated_at).getTime();
      return localTime > serverTime ? 'client_wins' : 'server_wins';
    }

    return 'merge';
  }

  private resolveFormConflict(
    localData: any,
    serverData: any,
  ): 'client_wins' | 'server_wins' | 'merge' | 'manual' {
    // For forms, client wins for recent submissions (preserve supplier work)
    const localTime = new Date(
      localData.updated_at || localData.created_at,
    ).getTime();
    const serverTime = new Date(
      serverData.updated_at || serverData.created_at,
    ).getTime();

    return localTime > serverTime ? 'client_wins' : 'server_wins';
  }

  private resolveClientConflict(
    localData: any,
    serverData: any,
  ): 'client_wins' | 'server_wins' | 'merge' | 'manual' {
    // For client data, merge contact information
    return 'merge';
  }

  private resolveTimelineConflict(
    localData: any,
    serverData: any,
  ): 'client_wins' | 'server_wins' | 'merge' | 'manual' {
    // Timeline changes require manual resolution due to complexity
    return 'manual';
  }

  private resolveVendorConflict(
    localData: any,
    serverData: any,
  ): 'client_wins' | 'server_wins' | 'merge' | 'manual' {
    // Vendor data can usually be merged
    return 'merge';
  }

  private async resolveConflict(conflict: SyncConflict): Promise<void> {
    let resolvedData;

    switch (conflict.resolution) {
      case 'client_wins':
        resolvedData = conflict.localData;
        break;
      case 'server_wins':
        resolvedData = conflict.serverData;
        break;
      case 'merge':
        resolvedData = this.mergeData(
          conflict.localData,
          conflict.serverData,
          conflict.table,
        );
        break;
      default:
        // Manual resolution required
        this.notifyManualResolutionRequired(conflict);
        return;
    }

    // Apply resolved data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    await supabase
      .from(conflict.table)
      .update(resolvedData)
      .eq('id', resolvedData.id);

    // Remove conflict from storage
    await this.removeSyncConflict(conflict.id);

    // Notify successful resolution
    this.notifyConflictResolved(conflict, resolvedData);
  }

  private mergeData(localData: any, serverData: any, table: string): any {
    // Table-specific merge strategies
    const merged = { ...serverData }; // Start with server data

    switch (table) {
      case 'clients':
        return this.mergeClientData(localData, serverData);
      case 'forms':
        return this.mergeFormData(localData, serverData);
      case 'vendors':
        return this.mergeVendorData(localData, serverData);
      default:
        return this.mergeGenericData(localData, serverData);
    }
  }

  private mergeClientData(localData: any, serverData: any): any {
    const merged = { ...serverData };

    // Preserve local changes for specific fields
    const clientWinsFields = [
      'requirements',
      'special_requests',
      'preferred_style',
      'notes',
      'dietary_restrictions',
    ];

    for (const field of clientWinsFields) {
      if (localData[field] && localData[field] !== serverData[field]) {
        merged[field] = localData[field];
      }
    }

    // Merge contact information
    if (localData.contact_info && serverData.contact_info) {
      merged.contact_info = {
        ...serverData.contact_info,
        ...localData.contact_info,
      };
    }

    return merged;
  }

  private mergeFormData(localData: any, serverData: any): any {
    const merged = { ...serverData };

    // Form submissions are usually additive
    if (localData.submissions && serverData.submissions) {
      merged.submissions = [
        ...serverData.submissions,
        ...localData.submissions,
      ];
    } else if (localData.submissions) {
      merged.submissions = localData.submissions;
    }

    // Preserve most recent form data
    const localTime = new Date(localData.updated_at).getTime();
    const serverTime = new Date(serverData.updated_at).getTime();

    if (localTime > serverTime) {
      merged.form_data = localData.form_data;
      merged.status = localData.status;
    }

    return merged;
  }

  private mergeVendorData(localData: any, serverData: any): any {
    const merged = { ...serverData };

    // Merge contact arrays
    if (localData.contacts && serverData.contacts) {
      const allContacts = [...serverData.contacts, ...localData.contacts];
      merged.contacts = allContacts.filter(
        (contact, index, arr) =>
          arr.findIndex((c) => c.email === contact.email) === index,
      );
    }

    // Merge services
    if (localData.services && serverData.services) {
      merged.services = [
        ...new Set([...serverData.services, ...localData.services]),
      ];
    }

    return merged;
  }

  private mergeGenericData(localData: any, serverData: any): any {
    const merged = { ...serverData };

    // Merge arrays
    for (const key of Object.keys(localData)) {
      if (Array.isArray(localData[key]) && Array.isArray(serverData[key])) {
        merged[key] = [...new Set([...serverData[key], ...localData[key]])];
      }
    }

    return merged;
  }

  private async handleSuccessfulSync(item: OfflineDataItem): Promise<void> {
    // Wedding-specific post-sync actions
    switch (item.table) {
      case 'bookings':
        if (item.operation === 'create') {
          await this.triggerWeddingBookingConfirmation(item.data);
        }
        break;
      case 'forms':
        if (item.operation === 'create') {
          await this.notifySupplierOfFormSubmission(item.data);
        }
        break;
      case 'timeline':
        await this.syncTimelineToDevices(item.data);
        break;
    }
  }

  private async triggerWeddingBookingConfirmation(
    bookingData: any,
  ): Promise<void> {
    // Trigger confirmation email/notification
    console.log('Booking confirmation triggered for:', bookingData.id);

    // Queue notification for offline processing if needed
    if (!this.isOnline) {
      await this.saveForOfflineSync(
        'notifications',
        'create',
        {
          type: 'booking_confirmation',
          booking_id: bookingData.id,
          recipient: bookingData.client_email,
          template: 'booking_confirmed',
        },
        bookingData.supplier_id,
        'high',
      );
    }
  }

  private async notifySupplierOfFormSubmission(formData: any): Promise<void> {
    console.log(
      'Form submission notification for supplier:',
      formData.supplier_id,
    );

    // Real-time notification or queue for offline
    this.broadcastStateChange('form_submitted', {
      form_id: formData.id,
      supplier_id: formData.supplier_id,
      client_name: formData.client_name,
    });
  }

  private async syncTimelineToDevices(timelineData: any): Promise<void> {
    // Sync timeline changes across devices
    await this.updateDeviceState('timeline', timelineData);
  }

  private startPeriodicSync(): void {
    // Adaptive sync frequency based on network conditions
    const getSyncInterval = () => {
      if (!this.isOnline) return 60000; // 1 minute when offline (for quick online detection)
      if (this.syncQueue.length === 0) return 300000; // 5 minutes when empty
      return 30000; // 30 seconds when items are pending
    };

    const scheduleNextSync = () => {
      setTimeout(() => {
        if (this.isOnline && this.syncQueue.length > 0) {
          this.triggerSync();
        }
        scheduleNextSync();
      }, getSyncInterval());
    };

    scheduleNextSync();
  }

  private async loadSyncQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(
        ['offline_data'],
        'readonly',
      );
      const store = transaction.objectStore('offline_data');
      const request = store.getAll();

      request.onsuccess = () => {
        this.syncQueue = request.result.filter(
          (item: OfflineDataItem) =>
            item.syncStatus === 'pending' || item.syncStatus === 'failed',
        );
        this.metrics.pendingItems = this.syncQueue.length;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async storeOfflineData(item: OfflineDataItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(
        ['offline_data'],
        'readwrite',
      );
      const store = transaction.objectStore('offline_data');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateSyncQueue(): Promise<void> {
    const transaction = this.indexedDB.transaction(
      ['offline_data'],
      'readwrite',
    );
    const store = transaction.objectStore('offline_data');

    for (const item of this.syncQueue) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  private async storeSyncConflict(conflict: SyncConflict): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(
        ['sync_conflicts'],
        'readwrite',
      );
      const store = transaction.objectStore('sync_conflicts');
      const request = store.put(conflict);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async removeSyncConflict(conflictId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(
        ['sync_conflicts'],
        'readwrite',
      );
      const store = transaction.objectStore('sync_conflicts');
      const request = store.delete(conflictId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async handleSyncError(
    item: OfflineDataItem,
    error: any,
  ): Promise<void> {
    console.error(`Sync failed for ${item.table} ${item.operation}:`, error);

    // Exponential backoff for retries
    if (item.retryCount < this.getMaxRetries(item.priority)) {
      const delay = Math.min(
        1000 * Math.pow(2, item.retryCount),
        300000, // Max 5 minutes
      );

      setTimeout(() => {
        if (this.isOnline) {
          this.syncItem(item);
        }
      }, delay);
    } else {
      // Max retries reached
      item.syncStatus = 'failed';
      await this.storeOfflineData(item);

      // Notify user of permanent failure
      this.notifyPermanentFailure(item);
    }
  }

  private getMaxRetries(priority: string): number {
    const maxRetries = {
      critical: 10,
      high: 7,
      normal: 5,
      low: 3,
    };
    return maxRetries[priority as keyof typeof maxRetries] || 5;
  }

  // Utility methods
  private generateDeviceId(): string {
    const stored = localStorage.getItem('wedsync_device_id');
    if (stored) return stored;

    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('wedsync_device_id', deviceId);
    return deviceId;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOfflineId(table: string, operation: string): string {
    return `offline_${table}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };

    // Remove functions and undefined values
    for (const key of Object.keys(sanitized)) {
      if (
        typeof sanitized[key] === 'function' ||
        sanitized[key] === undefined
      ) {
        delete sanitized[key];
      }
    }

    return sanitized;
  }

  private isConflictError(error: any): boolean {
    return (
      error.message?.includes('conflict') ||
      error.code === '23505' || // Unique constraint violation
      error.message?.includes('version')
    );
  }

  private calculateDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private async updateMetrics(): Promise<void> {
    this.metrics.lastSyncTimestamp = Date.now();

    // Store metrics in IndexedDB
    const transaction = this.indexedDB.transaction(
      ['sync_metrics'],
      'readwrite',
    );
    const store = transaction.objectStore('sync_metrics');

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: `metrics_${Date.now()}`,
        ...this.metrics,
        deviceId: this.deviceId,
        timestamp: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private updateSyncMetrics(results: any[], syncTime: number): void {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    this.metrics.totalSynced += successful;
    this.metrics.totalFailed += failed;

    // Update average sync time
    const totalSyncs = this.metrics.totalSynced + this.metrics.totalFailed;
    this.metrics.averageSyncTime =
      (this.metrics.averageSyncTime * (totalSyncs - results.length) +
        syncTime) /
      totalSyncs;

    this.metrics.pendingItems = this.syncQueue.filter(
      (item) => item.syncStatus === 'pending' || item.syncStatus === 'failed',
    ).length;
  }

  private async saveCurrentState(): Promise<void> {
    // Save current state before page unload
    await this.updateDeviceState('sync_queue', {
      queue_length: this.syncQueue.length,
      last_activity: Date.now(),
      sync_in_progress: this.syncInProgress,
    });
  }

  private async updateDeviceState(key: string, value: any): Promise<void> {
    const transaction = this.indexedDB.transaction(
      ['device_state'],
      'readwrite',
    );
    const store = transaction.objectStore('device_state');

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        key,
        value,
        deviceId: this.deviceId,
        timestamp: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private broadcastStateChange(type: string, data: any): void {
    // Broadcast to other tabs/windows
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('wedsync-sync');
      channel.postMessage({
        type,
        data,
        deviceId: this.deviceId,
        timestamp: Date.now(),
      });
    }
  }

  private notifySync(results: any[]): void {
    // Notify React components of sync status
    window.dispatchEvent(
      new CustomEvent('offline-sync-complete', {
        detail: {
          synced: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          conflicts: results.filter((r) => r.conflict).length,
          pending: this.syncQueue.filter(
            (item) => item.syncStatus === 'pending',
          ).length,
          metrics: this.metrics,
        },
      }),
    );
  }

  private notifyManualResolutionRequired(conflict: SyncConflict): void {
    window.dispatchEvent(
      new CustomEvent('sync-conflict-manual', {
        detail: { conflict },
      }),
    );
  }

  private notifyConflictResolved(
    conflict: SyncConflict,
    resolvedData: any,
  ): void {
    window.dispatchEvent(
      new CustomEvent('sync-conflict-resolved', {
        detail: { conflict, resolvedData },
      }),
    );
  }

  private notifyPermanentFailure(item: OfflineDataItem): void {
    window.dispatchEvent(
      new CustomEvent('sync-permanent-failure', {
        detail: { item },
      }),
    );
  }

  // Public API
  public getSyncStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
    queueLength: number;
    failedItems: number;
    metrics: SyncMetrics;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      queueLength: this.syncQueue.length,
      failedItems: this.syncQueue.filter((item) => item.syncStatus === 'failed')
        .length,
      metrics: this.metrics,
    };
  }

  public async getUnresolvedConflicts(): Promise<SyncConflict[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction(
        ['sync_conflicts'],
        'readonly',
      );
      const store = transaction.objectStore('sync_conflicts');
      const index = store.index('resolved');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async resolveManualConflict(
    conflictId: string,
    resolution: 'client_wins' | 'server_wins' | 'custom',
    customData?: any,
  ): Promise<void> {
    const transaction = this.indexedDB.transaction(
      ['sync_conflicts'],
      'readonly',
    );
    const store = transaction.objectStore('sync_conflicts');
    const conflict = await new Promise<SyncConflict>((resolve, reject) => {
      const request = store.get(conflictId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (conflict) {
      conflict.resolution = resolution;
      if (resolution === 'custom' && customData) {
        conflict.localData = customData;
      }

      await this.resolveConflict(conflict);
    }
  }
}

// Interface for conflict resolution strategies
interface ConflictResolutionStrategy {
  resolve: (
    localData: any,
    serverData: any,
  ) => 'client_wins' | 'server_wins' | 'merge' | 'manual';
  priority: 'critical' | 'high' | 'normal' | 'low';
}

// Global sync manager instance
export const syncManager = new OfflineDataSyncManager();
