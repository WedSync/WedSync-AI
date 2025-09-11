/**
 * WS-144: Cross-Device Consistency Management
 * Ensures data consistency across multiple devices accessing the same wedding data
 *
 * Features:
 * - Device fingerprinting and tracking
 * - Vector clock synchronization
 * - Distributed state management
 * - Session handoff between devices
 * - Real-time consistency monitoring
 */

import { offlineDB } from '@/lib/database/offline-database';
import { advancedConflictResolver } from './advanced-conflict-resolver';
import { optimizedBackgroundSync } from './optimized-background-sync';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface DeviceInfo {
  id: string;
  fingerprint: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  lastSeen: string;
  isActive: boolean;
  capabilities: {
    offline: boolean;
    notifications: boolean;
    backgroundSync: boolean;
    storage: number; // Available storage in MB
  };
}

export interface VectorClock {
  [deviceId: string]: number;
}

export interface ConsistencyState {
  entityId: string;
  entityType: string;
  vectorClock: VectorClock;
  lastModified: string;
  modifiedBy: string;
  checksum: string;
  version: number;
}

export interface SessionHandoff {
  fromDevice: string;
  toDevice: string;
  sessionData: any;
  timestamp: string;
  expiresAt: string;
}

export interface ConsistencyMetrics {
  devicesTracked: number;
  activeDevices: number;
  inconsistenciesDetected: number;
  inconsistenciesResolved: number;
  averageResolutionTime: number;
  lastConsistencyCheck: string;
}

// =====================================================
// CROSS-DEVICE CONSISTENCY MANAGER
// =====================================================

export class CrossDeviceConsistencyManager {
  private static instance: CrossDeviceConsistencyManager;
  private currentDevice: DeviceInfo;
  private deviceRegistry: Map<string, DeviceInfo> = new Map();
  private vectorClocks: Map<string, VectorClock> = new Map();
  private consistencyStates: Map<string, ConsistencyState> = new Map();
  private sessionHandoffs: Map<string, SessionHandoff> = new Map();
  private broadcastChannel?: BroadcastChannel;
  private syncInterval?: NodeJS.Timeout;
  private metrics: ConsistencyMetrics = {
    devicesTracked: 0,
    activeDevices: 0,
    inconsistenciesDetected: 0,
    inconsistenciesResolved: 0,
    averageResolutionTime: 0,
    lastConsistencyCheck: new Date().toISOString(),
  };

  public static getInstance(): CrossDeviceConsistencyManager {
    if (!CrossDeviceConsistencyManager.instance) {
      CrossDeviceConsistencyManager.instance =
        new CrossDeviceConsistencyManager();
    }
    return CrossDeviceConsistencyManager.instance;
  }

  constructor() {
    this.currentDevice = this.generateDeviceInfo();
    this.initialize();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  private async initialize() {
    console.log('[CrossDevice] Initializing consistency manager');

    // Register current device
    await this.registerDevice(this.currentDevice);

    // Set up broadcast channel for cross-tab communication
    this.setupBroadcastChannel();

    // Start consistency monitoring
    this.startConsistencyMonitoring();

    // Load existing device states
    await this.loadDeviceStates();

    // Set up periodic cleanup
    this.setupPeriodicCleanup();
  }

  private generateDeviceInfo(): DeviceInfo {
    const deviceId = this.getOrCreateDeviceId();

    return {
      id: deviceId,
      fingerprint: this.generateFingerprint(),
      type: this.detectDeviceType(),
      browser: this.detectBrowser(),
      os: this.detectOS(),
      lastSeen: new Date().toISOString(),
      isActive: true,
      capabilities: {
        offline: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        backgroundSync: 'sync' in ServiceWorkerRegistration.prototype,
        storage: this.getAvailableStorage(),
      },
    };
  }

  private getOrCreateDeviceId(): string {
    const stored = localStorage.getItem('wedsync_device_id');
    if (stored) return stored;

    const newId = `device_${uuidv4()}`;
    localStorage.setItem('wedsync_device_id', newId);
    return newId;
  }

  private generateFingerprint(): string {
    // Generate unique device fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unknown';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('WedSync Device Fingerprint', 2, 2);

    return canvas.toDataURL().slice(-50);
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('safari')) return 'Safari';
    if (userAgent.includes('edge')) return 'Edge';
    return 'Unknown';
  }

  private detectOS(): string {
    const platform = navigator.platform.toLowerCase();

    if (platform.includes('win')) return 'Windows';
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('linux')) return 'Linux';
    if (/android/i.test(navigator.userAgent)) return 'Android';
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return 'iOS';
    return 'Unknown';
  }

  private getAvailableStorage(): number {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        return Math.floor(((quota || 0) - (usage || 0)) / 1024 / 1024);
      });
    }
    return 0;
  }

  // =====================================================
  // DEVICE MANAGEMENT
  // =====================================================

  async registerDevice(device: DeviceInfo): Promise<void> {
    this.deviceRegistry.set(device.id, device);

    // Store in database
    await offlineDB.saveToIndexedDB({
      storeName: 'devices',
      data: device,
      id: device.id,
    });

    // Sync to server
    const supabase = createClient();
    await supabase.from('device_registry').upsert({
      id: device.id,
      user_id: await this.getCurrentUserId(),
      device_info: device,
      last_seen: device.lastSeen,
    });

    this.metrics.devicesTracked++;
  }

  async loadDeviceStates(): Promise<void> {
    const devices = await offlineDB.getAllFromStore('devices');

    devices.forEach((device: DeviceInfo) => {
      this.deviceRegistry.set(device.id, device);

      // Mark as inactive if not seen recently (>1 hour)
      const lastSeenTime = new Date(device.lastSeen).getTime();
      const hourAgo = Date.now() - 60 * 60 * 1000;

      if (lastSeenTime < hourAgo) {
        device.isActive = false;
      }
    });

    this.metrics.devicesTracked = devices.length;
    this.metrics.activeDevices = devices.filter(
      (d: DeviceInfo) => d.isActive,
    ).length;
  }

  async updateDeviceActivity(deviceId: string): Promise<void> {
    const device = this.deviceRegistry.get(deviceId);
    if (!device) return;

    device.lastSeen = new Date().toISOString();
    device.isActive = true;

    await offlineDB.saveToIndexedDB({
      storeName: 'devices',
      data: device,
      id: deviceId,
    });
  }

  // =====================================================
  // VECTOR CLOCK SYNCHRONIZATION
  // =====================================================

  private initializeVectorClock(entityId: string): VectorClock {
    const clock: VectorClock = {};

    this.deviceRegistry.forEach((device) => {
      clock[device.id] = 0;
    });

    return clock;
  }

  async updateVectorClock(
    entityId: string,
    deviceId: string = this.currentDevice.id,
  ): Promise<VectorClock> {
    let clock =
      this.vectorClocks.get(entityId) || this.initializeVectorClock(entityId);

    // Increment clock for current device
    clock[deviceId] = (clock[deviceId] || 0) + 1;

    this.vectorClocks.set(entityId, clock);

    // Store updated clock
    await offlineDB.saveToIndexedDB({
      storeName: 'vector_clocks',
      data: { entityId, clock, timestamp: Date.now() },
      id: entityId,
    });

    return clock;
  }

  compareVectorClocks(
    clock1: VectorClock,
    clock2: VectorClock,
  ): 'before' | 'after' | 'concurrent' {
    let clock1Greater = false;
    let clock2Greater = false;

    const allDevices = new Set([
      ...Object.keys(clock1),
      ...Object.keys(clock2),
    ]);

    for (const deviceId of allDevices) {
      const val1 = clock1[deviceId] || 0;
      const val2 = clock2[deviceId] || 0;

      if (val1 > val2) clock1Greater = true;
      if (val2 > val1) clock2Greater = true;
    }

    if (clock1Greater && !clock2Greater) return 'after';
    if (clock2Greater && !clock1Greater) return 'before';
    return 'concurrent';
  }

  // =====================================================
  // CONSISTENCY MANAGEMENT
  // =====================================================

  async trackEntityChange(
    entityId: string,
    entityType: string,
    data: any,
  ): Promise<void> {
    const vectorClock = await this.updateVectorClock(entityId);
    const checksum = this.calculateChecksum(data);

    const state: ConsistencyState = {
      entityId,
      entityType,
      vectorClock,
      lastModified: new Date().toISOString(),
      modifiedBy: this.currentDevice.id,
      checksum,
      version: (this.consistencyStates.get(entityId)?.version || 0) + 1,
    };

    this.consistencyStates.set(entityId, state);

    // Broadcast change to other tabs/devices
    this.broadcastStateChange(state);

    // Store state
    await offlineDB.saveToIndexedDB({
      storeName: 'consistency_states',
      data: state,
      id: entityId,
    });
  }

  async checkConsistency(entityId: string): Promise<boolean> {
    const localState = this.consistencyStates.get(entityId);
    if (!localState) return true;

    // Get states from other devices
    const supabase = createClient();
    const { data: remoteStates } = await supabase
      .from('consistency_states')
      .select('*')
      .eq('entity_id', entityId);

    if (!remoteStates || remoteStates.length === 0) return true;

    // Compare vector clocks
    for (const remoteState of remoteStates) {
      const comparison = this.compareVectorClocks(
        localState.vectorClock,
        remoteState.vector_clock,
      );

      if (comparison === 'concurrent') {
        // Concurrent modification detected
        this.metrics.inconsistenciesDetected++;
        await this.resolveInconsistency(localState, remoteState);
        return false;
      }
    }

    return true;
  }

  private async resolveInconsistency(
    localState: ConsistencyState,
    remoteState: any,
  ): Promise<void> {
    const startTime = performance.now();

    console.log(
      `[CrossDevice] Resolving inconsistency for ${localState.entityId}`,
    );

    // Fetch full data for both versions
    const localData = await offlineDB.getFromIndexedDB(
      localState.entityType,
      localState.entityId,
    );

    const supabase = createClient();
    const { data: remoteData } = await supabase
      .from(localState.entityType)
      .select('*')
      .eq('id', localState.entityId)
      .single();

    // Use conflict resolver
    const resolution = await advancedConflictResolver.resolveConflict({
      entityType: localState.entityType,
      entityId: localState.entityId,
      conflictType: 'field_update',
      localVersion: localData,
      serverVersion: remoteData,
      metadata: {
        localTimestamp: localState.lastModified,
        serverTimestamp: remoteState.last_modified,
        deviceId: localState.modifiedBy,
      },
    });

    if (!resolution.requiresUserReview) {
      // Apply resolved state
      await offlineDB.saveToIndexedDB({
        storeName: localState.entityType,
        data: resolution.resolved,
        id: localState.entityId,
      });

      // Update consistency state
      await this.trackEntityChange(
        localState.entityId,
        localState.entityType,
        resolution.resolved,
      );

      this.metrics.inconsistenciesResolved++;
    }

    // Update metrics
    const resolutionTime = performance.now() - startTime;
    this.metrics.averageResolutionTime =
      (this.metrics.averageResolutionTime *
        this.metrics.inconsistenciesResolved +
        resolutionTime) /
      (this.metrics.inconsistenciesResolved + 1);
  }

  // =====================================================
  // SESSION HANDOFF
  // =====================================================

  async initiateSessionHandoff(
    toDeviceId: string,
    sessionData: any,
  ): Promise<string> {
    const handoff: SessionHandoff = {
      fromDevice: this.currentDevice.id,
      toDevice: toDeviceId,
      sessionData: await this.encryptSessionData(sessionData),
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    };

    const handoffId = `handoff_${Date.now()}`;
    this.sessionHandoffs.set(handoffId, handoff);

    // Store handoff
    await offlineDB.saveToIndexedDB({
      storeName: 'session_handoffs',
      data: handoff,
      id: handoffId,
    });

    // Notify target device
    this.broadcastHandoff(handoffId, handoff);

    return handoffId;
  }

  async receiveSessionHandoff(handoffId: string): Promise<any> {
    const handoff = this.sessionHandoffs.get(handoffId);
    if (!handoff) {
      // Try to load from database
      const stored = await offlineDB.getFromIndexedDB(
        'session_handoffs',
        handoffId,
      );
      if (!stored) throw new Error('Handoff not found');
      return this.decryptSessionData(stored.sessionData);
    }

    // Check if handoff is for current device
    if (handoff.toDevice !== this.currentDevice.id) {
      throw new Error('Handoff not intended for this device');
    }

    // Check expiration
    if (new Date(handoff.expiresAt) < new Date()) {
      throw new Error('Handoff expired');
    }

    return this.decryptSessionData(handoff.sessionData);
  }

  private async encryptSessionData(data: any): Promise<string> {
    // Simple encryption for demo - in production use proper encryption
    return btoa(JSON.stringify(data));
  }

  private async decryptSessionData(encrypted: string): Promise<any> {
    // Simple decryption for demo - in production use proper encryption
    return JSON.parse(atob(encrypted));
  }

  // =====================================================
  // BROADCAST CHANNEL COMMUNICATION
  // =====================================================

  private setupBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') return;

    this.broadcastChannel = new BroadcastChannel('wedsync_consistency');

    this.broadcastChannel.addEventListener('message', (event) => {
      this.handleBroadcastMessage(event.data);
    });
  }

  private broadcastStateChange(state: ConsistencyState) {
    if (!this.broadcastChannel) return;

    this.broadcastChannel.postMessage({
      type: 'state_change',
      deviceId: this.currentDevice.id,
      state,
    });
  }

  private broadcastHandoff(handoffId: string, handoff: SessionHandoff) {
    if (!this.broadcastChannel) return;

    this.broadcastChannel.postMessage({
      type: 'session_handoff',
      handoffId,
      handoff,
    });
  }

  private async handleBroadcastMessage(message: any) {
    switch (message.type) {
      case 'state_change':
        if (message.deviceId !== this.currentDevice.id) {
          // Another tab/device made a change
          this.consistencyStates.set(message.state.entityId, message.state);
          await this.checkConsistency(message.state.entityId);
        }
        break;

      case 'session_handoff':
        if (message.handoff.toDevice === this.currentDevice.id) {
          // Handoff is for us
          this.sessionHandoffs.set(message.handoffId, message.handoff);
          await this.notifyUserOfHandoff(message.handoffId);
        }
        break;

      case 'device_ping':
        // Respond to device discovery
        await this.updateDeviceActivity(message.deviceId);
        break;
    }
  }

  private async notifyUserOfHandoff(handoffId: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Session Handoff Available', {
        body: 'You can continue your work from another device',
        icon: '/icon-192x192.png',
        tag: handoffId,
      });
    }
  }

  // =====================================================
  // MONITORING AND CLEANUP
  // =====================================================

  private startConsistencyMonitoring() {
    // Check consistency every 30 seconds
    this.syncInterval = setInterval(async () => {
      await this.performConsistencyCheck();
    }, 30000);
  }

  private async performConsistencyCheck() {
    console.log('[CrossDevice] Performing consistency check');

    const states = Array.from(this.consistencyStates.values());

    for (const state of states) {
      await this.checkConsistency(state.entityId);
    }

    this.metrics.lastConsistencyCheck = new Date().toISOString();
  }

  private setupPeriodicCleanup() {
    // Clean up expired handoffs and inactive devices every 5 minutes
    setInterval(
      async () => {
        await this.cleanupExpiredHandoffs();
        await this.cleanupInactiveDevices();
      },
      5 * 60 * 1000,
    );
  }

  private async cleanupExpiredHandoffs() {
    const now = new Date();

    for (const [id, handoff] of this.sessionHandoffs.entries()) {
      if (new Date(handoff.expiresAt) < now) {
        this.sessionHandoffs.delete(id);
        await offlineDB.deleteFromIndexedDB('session_handoffs', id);
      }
    }
  }

  private async cleanupInactiveDevices() {
    const hourAgo = Date.now() - 60 * 60 * 1000;

    for (const [id, device] of this.deviceRegistry.entries()) {
      if (new Date(device.lastSeen).getTime() < hourAgo && device.isActive) {
        device.isActive = false;
        await this.registerDevice(device);
        this.metrics.activeDevices--;
      }
    }
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(16);
  }

  private async getCurrentUserId(): Promise<string> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  async getActiveDevices(): Promise<DeviceInfo[]> {
    return Array.from(this.deviceRegistry.values()).filter((d) => d.isActive);
  }

  async getDeviceInfo(deviceId: string): Promise<DeviceInfo | undefined> {
    return this.deviceRegistry.get(deviceId);
  }

  getCurrentDeviceId(): string {
    return this.currentDevice.id;
  }

  getMetrics(): ConsistencyMetrics {
    return { ...this.metrics };
  }

  async forceConsistencyCheck(): Promise<void> {
    await this.performConsistencyCheck();
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }
}

// Export singleton instance
export const crossDeviceConsistency =
  CrossDeviceConsistencyManager.getInstance();
