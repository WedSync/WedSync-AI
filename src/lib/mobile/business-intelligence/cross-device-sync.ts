/**
 * Cross-Device Synchronization System for Business Intelligence
 * Coordinates real-time sync of executive metrics across multiple devices
 *
 * Key Features:
 * - Real-time metric synchronization via Server-Sent Events
 * - Device registration and management
 * - Conflict resolution for concurrent updates
 * - Optimistic updates with rollback capability
 * - Intelligent sync scheduling and batching
 */

import { BusinessMetrics, ExecutiveAlert } from './BusinessIntelligencePWA';
import { OfflineStorage } from './offline-storage';

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  platform: string;
  capabilities: {
    pushNotifications: boolean;
    backgroundSync: boolean;
    offline: boolean;
  };
  lastSeen: string;
  syncEnabled: boolean;
}

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number;
  conflictResolution: 'server-wins' | 'client-wins' | 'latest-wins' | 'merge';
  optimisticUpdates: boolean;
  realtimeEnabled: boolean;
  batchUpdates: boolean;
  maxRetries: number;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  conflictCount: number;
  connectedDevices: DeviceInfo[];
  syncErrors: string[];
}

export class CrossDeviceSync {
  private config: SyncConfig;
  private state: SyncState;
  private deviceInfo: DeviceInfo;
  private offlineStorage: OfflineStorage;
  private eventSource: EventSource | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private pendingUpdates: Map<string, any> = new Map();
  private optimisticUpdates: Map<string, any> = new Map();

  constructor(deviceInfo: DeviceInfo, config: Partial<SyncConfig> = {}) {
    this.deviceInfo = deviceInfo;
    this.config = {
      autoSync: true,
      syncInterval: 30000, // 30 seconds
      conflictResolution: 'latest-wins',
      optimisticUpdates: true,
      realtimeEnabled: true,
      batchUpdates: true,
      maxRetries: 3,
      ...config,
    };

    this.state = {
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSync: null,
      pendingOperations: 0,
      conflictCount: 0,
      connectedDevices: [],
      syncErrors: [],
    };

    this.offlineStorage = new OfflineStorage();
    this.setupEventListeners();
  }

  /**
   * Initialize cross-device synchronization
   */
  async initialize(): Promise<void> {
    try {
      // Initialize offline storage
      await this.offlineStorage.initialize();

      // Register this device
      await this.registerDevice();

      // Load connected devices
      await this.loadConnectedDevices();

      // Start real-time sync if enabled
      if (this.config.realtimeEnabled) {
        await this.startRealtimeSync();
      }

      // Start periodic sync if auto-sync enabled
      if (this.config.autoSync) {
        this.startPeriodicSync();
      }

      console.log('Cross-device sync initialized successfully');
      this.emit('initialized', { deviceId: this.deviceInfo.id });
    } catch (error) {
      console.error('Failed to initialize cross-device sync:', error);
      throw new Error('Cross-device sync initialization failed');
    }
  }

  /**
   * Register current device for synchronization
   */
  async registerDevice(): Promise<void> {
    try {
      const response = await fetch('/api/sync/device-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.deviceInfo.id,
          deviceName: this.deviceInfo.name,
          deviceType: this.deviceInfo.type,
          userAgent: navigator.userAgent,
          platform: this.deviceInfo.platform,
          capabilities: this.deviceInfo.capabilities,
          fingerprint: await this.generateDeviceFingerprint(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Device registration failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('Device registered successfully:', this.deviceInfo.id);
        this.emit('device-registered', result.device);
      } else {
        throw new Error(result.error || 'Device registration failed');
      }
    } catch (error) {
      console.error('Device registration error:', error);
      throw error;
    }
  }

  /**
   * Sync business metrics across devices
   */
  async syncBusinessMetrics(
    metrics: BusinessMetrics,
    optimistic = false,
  ): Promise<BusinessMetrics> {
    if (this.state.isSyncing && !optimistic) {
      console.log('Sync already in progress, queuing update...');
      return this.queueUpdate('metrics', metrics);
    }

    try {
      this.state.isSyncing = true;
      this.state.pendingOperations++;

      // Apply optimistic update immediately if enabled
      if (this.config.optimisticUpdates && optimistic) {
        const updateId = this.generateUpdateId();
        this.optimisticUpdates.set(updateId, metrics);
        this.emit('metrics-updated', metrics);
      }

      // Get stored sync state
      const syncState = await this.offlineStorage.getSyncState();
      const version = syncState?.version || 0;

      const response = await fetch('/api/sync/business-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.deviceInfo.id,
          metrics,
          timestamp: new Date().toISOString(),
          lastSync: syncState?.lastSync,
          version,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.conflict) {
        // Handle conflict
        const resolvedMetrics = await this.resolveConflict(
          'metrics',
          metrics,
          result.data,
        );

        // Update local storage with resolved data
        await this.offlineStorage.saveBusinessMetrics(resolvedMetrics);

        // Update sync state
        await this.offlineStorage.saveSyncState({
          lastSync: result.serverTimestamp,
          pendingChanges: [],
          deviceId: this.deviceInfo.id,
          version: result.serverVersion,
        });

        this.state.conflictCount++;
        this.emit('conflict-resolved', {
          type: 'metrics',
          resolution: this.config.conflictResolution,
          data: resolvedMetrics,
        });

        return resolvedMetrics;
      } else if (result.success) {
        // Success - update sync state
        await this.offlineStorage.saveSyncState({
          lastSync: result.data.timestamp,
          pendingChanges: [],
          deviceId: this.deviceInfo.id,
          version: result.data.version,
        });

        this.state.lastSync = new Date(result.data.timestamp);
        this.emit('metrics-synced', metrics);

        return metrics;
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Business metrics sync error:', error);

      // Rollback optimistic update on error
      if (optimistic) {
        this.rollbackOptimisticUpdates();
      }

      // Queue for retry if offline
      if (!navigator.onLine) {
        await this.queueUpdate('metrics', metrics);
      }

      this.state.syncErrors.push(error.message);
      this.emit('sync-error', { type: 'metrics', error: error.message });

      throw error;
    } finally {
      this.state.isSyncing = false;
      this.state.pendingOperations = Math.max(
        0,
        this.state.pendingOperations - 1,
      );
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncState & { serverStatus?: any }> {
    try {
      const response = await fetch(
        `/api/sync/status?deviceId=${this.deviceInfo.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.status) {
          return {
            ...this.state,
            serverStatus: result.status,
          };
        }
      }

      return this.state;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return this.state;
    }
  }

  /**
   * Start real-time synchronization via Server-Sent Events
   */
  private async startRealtimeSync(): Promise<void> {
    try {
      const sseUrl = `/api/sync/realtime?deviceId=${this.deviceInfo.id}&types=all`;

      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('Real-time sync connection established');
        this.emit('realtime-connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeEvent(data);
        } catch (error) {
          console.error('Error parsing realtime event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Real-time sync connection error:', error);
        this.emit('realtime-error', error);

        // Attempt reconnection after delay
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.startRealtimeSync();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to start real-time sync:', error);
    }
  }

  /**
   * Handle real-time sync events
   */
  private handleRealtimeEvent(event: any): void {
    switch (event.type) {
      case 'metrics-updated':
        if (event.deviceId !== this.deviceInfo.id) {
          this.handleRemoteMetricsUpdate(event.data);
        }
        break;

      case 'device-status':
        this.handleDeviceStatusUpdate(event.data);
        break;

      case 'sync-conflict':
        this.handleSyncConflict(event.data);
        break;

      case 'alert-received':
        this.handleRemoteAlert(event.data);
        break;

      case 'heartbeat':
        // Connection is alive
        break;

      default:
        console.log('Unknown realtime event:', event.type);
    }
  }

  /**
   * Handle remote metrics update
   */
  private async handleRemoteMetricsUpdate(data: any): Promise<void> {
    try {
      // Get latest metrics from server
      const response = await fetch(
        `/api/sync/business-metrics?deviceId=${this.deviceInfo.id}&lastSync=${this.state.lastSync?.toISOString() || ''}`,
      );

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.data && result.data.needsUpdate) {
          // Update local storage
          await this.offlineStorage.saveBusinessMetrics(result.data.metrics);

          // Update sync state
          await this.offlineStorage.saveSyncState({
            lastSync: result.data.timestamp,
            pendingChanges: [],
            deviceId: this.deviceInfo.id,
            version: result.data.version,
          });

          this.state.lastSync = new Date(result.data.timestamp);

          this.emit('remote-metrics-updated', {
            metrics: result.data.metrics,
            sourceDevice: data.sourceDevice,
            version: result.data.version,
          });
        }
      }
    } catch (error) {
      console.error('Error handling remote metrics update:', error);
    }
  }

  /**
   * Handle device status update
   */
  private handleDeviceStatusUpdate(data: any): void {
    switch (data.action) {
      case 'registered':
        // New device registered
        this.emit('device-connected', {
          deviceId: data.deviceId,
          deviceName: data.deviceName,
          deviceType: data.deviceType,
        });
        break;

      case 'status-updated':
        // Device sync status changed
        this.emit('device-status-changed', {
          deviceId: data.deviceId,
          syncType: data.syncType,
          status: data.status,
        });
        break;
    }
  }

  /**
   * Handle sync conflict
   */
  private handleSyncConflict(data: any): void {
    this.state.conflictCount++;
    this.emit('conflict-detected', {
      conflictType: data.conflictType,
      deviceId: data.deviceId,
      serverVersion: data.serverVersion,
      clientVersion: data.clientVersion,
      resolution: data.resolution,
    });
  }

  /**
   * Handle remote alert
   */
  private handleRemoteAlert(data: any): void {
    this.emit('alert-received', {
      alertId: data.alertId,
      priority: data.priority,
      title: data.title,
      message: data.message,
      sourceDevice: data.sourceDevice,
    });
  }

  /**
   * Resolve sync conflicts
   */
  private async resolveConflict(
    type: string,
    localData: any,
    serverData: any,
  ): Promise<any> {
    switch (this.config.conflictResolution) {
      case 'server-wins':
        return serverData.metrics;

      case 'client-wins':
        // Force push local data
        return localData;

      case 'latest-wins':
        const serverTime = new Date(serverData.timestamp);
        const localTime = new Date();
        return serverTime > localTime ? serverData.metrics : localData;

      case 'merge':
        // Implement type-specific merging
        if (type === 'metrics') {
          return this.mergeBusinessMetrics(localData, serverData.metrics);
        }
        return serverData.metrics;

      default:
        return serverData.metrics;
    }
  }

  /**
   * Merge business metrics data
   */
  private mergeBusinessMetrics(
    local: BusinessMetrics,
    server: BusinessMetrics,
  ): BusinessMetrics {
    return {
      revenue: server.revenue, // Use server revenue data (most critical)
      clients: {
        ...local.clients,
        total: server.clients.total, // Use server totals
        active: server.clients.active,
      },
      performance: server.performance, // Use server performance data
      alerts: [
        ...local.alerts,
        ...server.alerts.filter(
          (serverAlert) =>
            !local.alerts.some(
              (localAlert) => localAlert.id === serverAlert.id,
            ),
        ),
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    };
  }

  /**
   * Queue update for later sync
   */
  private async queueUpdate(type: string, data: any): Promise<any> {
    const updateId = this.generateUpdateId();
    this.pendingUpdates.set(updateId, { type, data, timestamp: new Date() });

    // Store in offline storage for persistence
    await this.offlineStorage.addPendingAction({
      url: '/api/sync/business-metrics',
      method: 'POST',
      data: { type, data },
      priority: 'high',
    });

    this.state.pendingOperations++;
    this.emit('update-queued', { type, updateId });

    return data;
  }

  /**
   * Rollback optimistic updates
   */
  private rollbackOptimisticUpdates(): void {
    this.optimisticUpdates.clear();
    this.emit('optimistic-rollback');
  }

  /**
   * Load connected devices
   */
  private async loadConnectedDevices(): Promise<void> {
    try {
      const response = await fetch('/api/sync/device-register');

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.devices) {
          this.state.connectedDevices = result.devices
            .filter((device: any) => device.id !== this.deviceInfo.id)
            .map((device: any) => ({
              id: device.id,
              name: device.name,
              type: device.type,
              platform: device.platform,
              capabilities: device.capabilities,
              lastSeen: device.lastSeen,
              syncEnabled: device.syncEnabled,
            }));
        }
      }
    } catch (error) {
      console.error('Error loading connected devices:', error);
    }
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      if (
        this.state.isOnline &&
        !this.state.isSyncing &&
        this.pendingUpdates.size > 0
      ) {
        // Process pending updates
        for (const [updateId, update] of this.pendingUpdates.entries()) {
          try {
            if (update.type === 'metrics') {
              await this.syncBusinessMetrics(update.data);
              this.pendingUpdates.delete(updateId);
              this.state.pendingOperations = Math.max(
                0,
                this.state.pendingOperations - 1,
              );
            }
          } catch (error) {
            console.error('Periodic sync error:', error);
          }
        }
      }
    }, this.config.syncInterval);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.emit('online');

      // Resume real-time sync if needed
      if (this.config.realtimeEnabled && !this.eventSource) {
        this.startRealtimeSync();
      }
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.emit('offline');
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.isOnline) {
        // Page became visible - trigger sync
        this.emit('visibility-changed', { visible: true });
      }
    });
  }

  /**
   * Generate device fingerprint
   */
  private async generateDeviceFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      canvas.toDataURL(),
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(): string {
    return `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event emitter methods
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    state: SyncState;
    pendingUpdates: number;
    optimisticUpdates: number;
    connectedDevices: number;
    isRealTimeConnected: boolean;
  } {
    return {
      state: this.state,
      pendingUpdates: this.pendingUpdates.size,
      optimisticUpdates: this.optimisticUpdates.size,
      connectedDevices: this.state.connectedDevices.length,
      isRealTimeConnected: this.eventSource?.readyState === EventSource.OPEN,
    };
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (this.state.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    // Get latest metrics and sync
    const cachedMetrics = await this.offlineStorage.getBusinessMetrics();
    if (cachedMetrics) {
      await this.syncBusinessMetrics(cachedMetrics);
    }
  }

  /**
   * Cleanup and destroy sync system
   */
  destroy(): void {
    // Close event source
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Clear pending updates
    this.pendingUpdates.clear();
    this.optimisticUpdates.clear();

    // Clear event listeners
    this.listeners.clear();

    console.log('Cross-device sync destroyed');
  }
}

export default CrossDeviceSync;
