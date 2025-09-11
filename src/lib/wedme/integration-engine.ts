import {
  WedSyncIntegration,
  SupplierConnection,
  SyncStatus,
  DataSyncRule,
  IntegrationConfig,
  SyncConflict,
  SyncEvent,
  DataMapping,
  CoupleProfile,
  WeddingFile,
  TimelineEvent,
  PermissionLevel,
} from '@/types/wedme/file-management';

// Integration Engine for bidirectional sync between WedMe and WedSync
export class WedSyncIntegrationEngine {
  private coupleProfile: CoupleProfile;
  private integrationConfig: IntegrationConfig;
  private suppliers: Map<string, SupplierConnection>;
  private syncRules: DataSyncRule[];
  private conflictQueue: SyncConflict[];
  private eventLog: SyncEvent[];

  constructor(coupleProfile: CoupleProfile, config: IntegrationConfig) {
    this.coupleProfile = coupleProfile;
    this.integrationConfig = config;
    this.suppliers = new Map();
    this.syncRules = config.syncRules || [];
    this.conflictQueue = [];
    this.eventLog = [];
  }

  // Initialize integration with WedSync platform
  async initializeIntegration(
    apiKey: string,
    wedSyncOrgId: string,
  ): Promise<WedSyncIntegration> {
    try {
      // Establish connection with WedSync API
      const connectionResult = await this.establishConnection(
        apiKey,
        wedSyncOrgId,
      );

      // Set up bidirectional sync channels
      await this.setupSyncChannels(connectionResult.channels);

      // Configure default sync rules
      await this.initializeDefaultSyncRules();

      // Perform initial data sync
      const initialSync = await this.performInitialSync();

      const integration: WedSyncIntegration = {
        id: `integration-${Date.now()}`,
        coupleId: this.coupleProfile.id,
        wedSyncOrgId,
        status: 'connected',
        config: this.integrationConfig,
        syncRules: this.syncRules,
        lastSyncTime: new Date().toISOString(),
        conflicts: [],
        recentEvents: this.eventLog.slice(-10),
        dataMapping: this.generateDataMapping(),
        supplierConnections: Array.from(this.suppliers.values()),
        permissions: this.generateDefaultPermissions(),
      };

      this.logEvent(
        'integration_initialized',
        'Integration successfully established',
        'success',
      );
      return integration;
    } catch (error) {
      this.logEvent(
        'integration_failed',
        `Failed to initialize integration: ${error}`,
        'error',
      );
      throw error;
    }
  }

  // Sync specific data types between platforms
  async syncData(
    dataType:
      | 'client_data'
      | 'timeline'
      | 'files'
      | 'communications'
      | 'vendor_data',
    direction: 'bidirectional' | 'to_wedsync' | 'to_wedme',
    options: { force?: boolean; conflictResolution?: 'merge' | 'skip' } = {},
  ): Promise<{
    success: boolean;
    syncedCount: number;
    conflicts: SyncConflict[];
    errors: string[];
  }> {
    this.logEvent(
      'sync_started',
      `Starting ${direction} sync for ${dataType}`,
      'info',
    );

    try {
      let syncedCount = 0;
      const conflicts: SyncConflict[] = [];
      const errors: string[] = [];

      // Check if sync is allowed by rules
      const applicableRules = this.syncRules.filter(
        (rule) => rule.dataType === dataType && rule.enabled,
      );

      if (applicableRules.length === 0 && !options.force) {
        errors.push(`No sync rules configured for ${dataType}`);
        return { success: false, syncedCount: 0, conflicts, errors };
      }

      // Perform sync based on data type and direction
      switch (dataType) {
        case 'client_data':
          const clientResult = await this.syncClientData(direction, options);
          syncedCount += clientResult.syncedCount;
          conflicts.push(...clientResult.conflicts);
          errors.push(...clientResult.errors);
          break;

        case 'timeline':
          const timelineResult = await this.syncTimelineData(
            direction,
            options,
          );
          syncedCount += timelineResult.syncedCount;
          conflicts.push(...timelineResult.conflicts);
          errors.push(...timelineResult.errors);
          break;

        case 'files':
          const filesResult = await this.syncFileData(direction, options);
          syncedCount += filesResult.syncedCount;
          conflicts.push(...filesResult.conflicts);
          errors.push(...filesResult.errors);
          break;

        case 'communications':
          const commResult = await this.syncCommunicationData(
            direction,
            options,
          );
          syncedCount += commResult.syncedCount;
          conflicts.push(...commResult.conflicts);
          errors.push(...commResult.errors);
          break;

        case 'vendor_data':
          const vendorResult = await this.syncVendorData(direction, options);
          syncedCount += vendorResult.syncedCount;
          conflicts.push(...vendorResult.conflicts);
          errors.push(...vendorResult.errors);
          break;
      }

      // Handle conflicts
      if (conflicts.length > 0) {
        this.conflictQueue.push(...conflicts);
        this.logEvent(
          'conflicts_detected',
          `${conflicts.length} conflicts detected during sync`,
          'warning',
        );
      }

      const success = errors.length === 0;
      this.logEvent(
        success ? 'sync_completed' : 'sync_completed_with_errors',
        `Sync completed. ${syncedCount} items synced, ${conflicts.length} conflicts, ${errors.length} errors`,
        success ? 'success' : 'warning',
      );

      return { success, syncedCount, conflicts, errors };
    } catch (error) {
      const errorMessage = `Sync failed: ${error}`;
      this.logEvent('sync_failed', errorMessage, 'error');
      return {
        success: false,
        syncedCount: 0,
        conflicts: [],
        errors: [errorMessage],
      };
    }
  }

  // Connect with a new supplier
  async connectSupplier(supplierInfo: {
    name: string;
    type: string;
    email: string;
    wedSyncUserId?: string;
    permissions: PermissionLevel[];
  }): Promise<SupplierConnection> {
    const supplierId = `supplier-${Date.now()}`;

    const connection: SupplierConnection = {
      id: supplierId,
      name: supplierInfo.name,
      type: supplierInfo.type,
      email: supplierInfo.email,
      wedSyncUserId: supplierInfo.wedSyncUserId,
      status: 'pending',
      permissions: supplierInfo.permissions,
      connectedAt: new Date().toISOString(),
      lastSync: null,
      pendingChanges: 0,
      syncRules: this.generateSupplierSyncRules(supplierInfo.type),
      dataAccess: this.generateDataAccessMatrix(supplierInfo.permissions),
    };

    // Send connection request to WedSync
    try {
      const wedSyncResult =
        await this.sendSupplierConnectionRequest(connection);

      if (wedSyncResult.accepted) {
        connection.status = 'connected';
        connection.wedSyncUserId = wedSyncResult.userId;
        this.suppliers.set(supplierId, connection);

        // Perform initial sync for this supplier
        await this.performSupplierInitialSync(supplierId);

        this.logEvent(
          'supplier_connected',
          `Connected to supplier: ${supplierInfo.name}`,
          'success',
        );
      } else {
        connection.status = 'pending';
        this.logEvent(
          'supplier_pending',
          `Connection request sent to: ${supplierInfo.name}`,
          'info',
        );
      }
    } catch (error) {
      connection.status = 'error';
      connection.errorMessage = `Connection failed: ${error}`;
      this.logEvent(
        'supplier_connection_failed',
        `Failed to connect to: ${supplierInfo.name}`,
        'error',
      );
    }

    this.suppliers.set(supplierId, connection);
    return connection;
  }

  // Resolve sync conflicts
  async resolveConflict(
    conflictId: string,
    resolution: 'accept_wedsync' | 'accept_wedme' | 'merge',
  ): Promise<{ success: boolean; error?: string }> {
    const conflict = this.conflictQueue.find((c) => c.id === conflictId);
    if (!conflict) {
      return { success: false, error: 'Conflict not found' };
    }

    try {
      let resolvedValue: any;

      switch (resolution) {
        case 'accept_wedsync':
          resolvedValue = conflict.wedsyncValue;
          await this.applyResolution(conflict, resolvedValue, 'wedsync');
          break;

        case 'accept_wedme':
          resolvedValue = conflict.wedmeValue;
          await this.applyResolution(conflict, resolvedValue, 'wedme');
          break;

        case 'merge':
          resolvedValue = await this.mergeConflictValues(conflict);
          await this.applyResolution(conflict, resolvedValue, 'merged');
          break;
      }

      // Remove from conflict queue
      this.conflictQueue = this.conflictQueue.filter(
        (c) => c.id !== conflictId,
      );

      this.logEvent(
        'conflict_resolved',
        `Conflict resolved using ${resolution}`,
        'success',
      );
      return { success: true };
    } catch (error) {
      this.logEvent(
        'conflict_resolution_failed',
        `Failed to resolve conflict: ${error}`,
        'error',
      );
      return { success: false, error: `Resolution failed: ${error}` };
    }
  }

  // Monitor real-time sync events
  startRealTimeSync(onEvent: (event: SyncEvent) => void): () => void {
    if (!this.integrationConfig.autoSync) {
      throw new Error('Real-time sync is disabled in configuration');
    }

    const interval = setInterval(async () => {
      try {
        // Check for changes from WedSync
        const wedSyncChanges = await this.checkWedSyncChanges();

        if (wedSyncChanges.length > 0) {
          for (const change of wedSyncChanges) {
            const syncResult = await this.processSyncChange(change);
            const event: SyncEvent = {
              id: `event-${Date.now()}-${Math.random()}`,
              type: 'data_changed',
              description: `${change.dataType} updated from WedSync`,
              timestamp: new Date().toISOString(),
              status: syncResult.success ? 'success' : 'error',
              dataType: change.dataType,
              affectedItems: syncResult.affectedItems || [],
            };

            this.eventLog.push(event);
            onEvent(event);
          }
        }
      } catch (error) {
        const errorEvent: SyncEvent = {
          id: `error-${Date.now()}`,
          type: 'sync_error',
          description: `Real-time sync error: ${error}`,
          timestamp: new Date().toISOString(),
          status: 'error',
        };

        this.eventLog.push(errorEvent);
        onEvent(errorEvent);
      }
    }, this.getRealTimeSyncInterval());

    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }

  // Get integration health status
  getHealthStatus(): {
    status: SyncStatus;
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check connection status
    const connectedSuppliers = Array.from(this.suppliers.values()).filter(
      (s) => s.status === 'connected',
    );
    const totalSuppliers = this.suppliers.size;

    if (totalSuppliers === 0) {
      issues.push('No suppliers connected');
      recommendations.push(
        'Connect with your wedding suppliers for better coordination',
      );
      score -= 30;
    } else if (connectedSuppliers.length < totalSuppliers * 0.8) {
      issues.push('Some suppliers are not properly connected');
      recommendations.push(
        'Check supplier connection status and resolve any issues',
      );
      score -= 20;
    }

    // Check for pending conflicts
    if (this.conflictQueue.length > 0) {
      issues.push(`${this.conflictQueue.length} unresolved sync conflicts`);
      recommendations.push(
        'Resolve pending sync conflicts to maintain data consistency',
      );
      score -= this.conflictQueue.length * 5;
    }

    // Check last sync time
    const lastSyncThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    const recentEvents = this.eventLog.filter(
      (e) => new Date(e.timestamp).getTime() > lastSyncThreshold,
    );

    if (recentEvents.length === 0) {
      issues.push('No recent sync activity');
      recommendations.push('Consider enabling auto-sync for real-time updates');
      score -= 15;
    }

    // Check error rate
    const errorEvents = recentEvents.filter((e) => e.status === 'error');
    const errorRate = errorEvents.length / Math.max(1, recentEvents.length);

    if (errorRate > 0.1) {
      issues.push('High error rate in sync operations');
      recommendations.push(
        'Review sync configuration and network connectivity',
      );
      score -= Math.round(errorRate * 100);
    }

    let status: SyncStatus;
    if (score >= 90) status = 'connected';
    else if (score >= 70) status = 'syncing';
    else if (score >= 50) status = 'error';
    else status = 'disconnected';

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  // Private methods for internal operations

  private async establishConnection(
    apiKey: string,
    orgId: string,
  ): Promise<any> {
    // Mock API connection - would implement actual WedSync API integration
    await this.delay(1000);

    return {
      success: true,
      connectionId: `conn-${Date.now()}`,
      channels: ['data_sync', 'real_time', 'notifications'],
      permissions: ['read', 'write', 'sync'],
    };
  }

  private async setupSyncChannels(channels: string[]): Promise<void> {
    // Set up real-time sync channels
    for (const channel of channels) {
      await this.initializeChannel(channel);
    }
  }

  private async initializeChannel(channel: string): Promise<void> {
    // Initialize specific sync channel
    await this.delay(100);
  }

  private async initializeDefaultSyncRules(): Promise<void> {
    const defaultRules: DataSyncRule[] = [
      {
        id: 'client-data-bidirectional',
        name: 'Client Data Sync',
        description: 'Sync client information between platforms',
        dataType: 'client_data',
        direction: 'bidirectional',
        frequency: 'realtime',
        enabled: true,
        conditions: [],
        conflictResolution: 'merge',
      },
      {
        id: 'timeline-bidirectional',
        name: 'Timeline Sync',
        description: 'Keep wedding timeline synchronized',
        dataType: 'timeline',
        direction: 'bidirectional',
        frequency: 'realtime',
        enabled: true,
        conditions: [],
        conflictResolution: 'merge',
      },
      {
        id: 'files-to-wedsync',
        name: 'File Upload Sync',
        description: 'Share couple files with suppliers',
        dataType: 'files',
        direction: 'to_wedsync',
        frequency: 'realtime',
        enabled: true,
        conditions: ['approved_by_couple'],
        conflictResolution: 'skip',
      },
    ];

    this.syncRules = defaultRules;
  }

  private async performInitialSync(): Promise<void> {
    // Perform comprehensive initial sync
    await this.syncData('client_data', 'bidirectional', { force: true });
    await this.syncData('timeline', 'bidirectional', { force: true });
    await this.syncData('files', 'to_wedsync', { force: true });
  }

  private async syncClientData(
    direction: string,
    options: any,
  ): Promise<{
    syncedCount: number;
    conflicts: SyncConflict[];
    errors: string[];
  }> {
    // Mock client data sync
    await this.delay(500);

    return {
      syncedCount: 1,
      conflicts: [],
      errors: [],
    };
  }

  private async syncTimelineData(
    direction: string,
    options: any,
  ): Promise<{
    syncedCount: number;
    conflicts: SyncConflict[];
    errors: string[];
  }> {
    // Mock timeline sync with potential conflicts
    await this.delay(800);

    const conflicts: SyncConflict[] = [];

    // Simulate a conflict
    if (Math.random() > 0.7) {
      conflicts.push({
        id: `conflict-${Date.now()}`,
        dataType: 'timeline',
        field: 'ceremony_start_time',
        description: 'Ceremony start time differs between platforms',
        wedmeValue: '14:00',
        wedsyncValue: '14:30',
        wedmeTimestamp: new Date(Date.now() - 3600000).toISOString(),
        wedsyncTimestamp: new Date().toISOString(),
        severity: 'medium',
        status: 'pending',
      });
    }

    return {
      syncedCount: 12,
      conflicts,
      errors: [],
    };
  }

  private async syncFileData(
    direction: string,
    options: any,
  ): Promise<{
    syncedCount: number;
    conflicts: SyncConflict[];
    errors: string[];
  }> {
    // Mock file sync
    await this.delay(1200);

    return {
      syncedCount: 47,
      conflicts: [],
      errors: [],
    };
  }

  private async syncCommunicationData(
    direction: string,
    options: any,
  ): Promise<{
    syncedCount: number;
    conflicts: SyncConflict[];
    errors: string[];
  }> {
    // Mock communication sync
    await this.delay(600);

    return {
      syncedCount: 8,
      conflicts: [],
      errors: [],
    };
  }

  private async syncVendorData(
    direction: string,
    options: any,
  ): Promise<{
    syncedCount: number;
    conflicts: SyncConflict[];
    errors: string[];
  }> {
    // Mock vendor data sync
    await this.delay(400);

    return {
      syncedCount: 3,
      conflicts: [],
      errors: [],
    };
  }

  private async sendSupplierConnectionRequest(
    connection: SupplierConnection,
  ): Promise<any> {
    // Mock supplier connection request
    await this.delay(1000);

    return {
      accepted: Math.random() > 0.3, // 70% acceptance rate
      userId: `user-${Date.now()}`,
      message: 'Connection request processed',
    };
  }

  private async performSupplierInitialSync(supplierId: string): Promise<void> {
    // Initial sync for newly connected supplier
    await this.delay(800);
  }

  private generateDataMapping(): DataMapping {
    return {
      clientData: {
        wedmeField: 'couple_profile',
        wedSyncField: 'client_info',
        transformations: ['normalize_phone', 'format_address'],
      },
      timeline: {
        wedmeField: 'timeline_events',
        wedSyncField: 'wedding_schedule',
        transformations: ['convert_timezone', 'format_datetime'],
      },
      files: {
        wedmeField: 'wedding_files',
        wedSyncField: 'client_files',
        transformations: ['resize_images', 'compress_videos'],
      },
    };
  }

  private generateDefaultPermissions(): PermissionLevel[] {
    return ['read_basic', 'read_timeline', 'write_timeline', 'read_files'];
  }

  private generateSupplierSyncRules(supplierType: string): DataSyncRule[] {
    const baseRules = [
      {
        id: `${supplierType}-timeline`,
        name: `${supplierType} Timeline Access`,
        description: `Allow ${supplierType} to sync timeline data`,
        dataType: 'timeline' as const,
        direction: 'bidirectional' as const,
        frequency: 'realtime' as const,
        enabled: true,
        conditions: [],
        conflictResolution: 'merge' as const,
      },
    ];

    // Add supplier-specific rules
    switch (supplierType.toLowerCase()) {
      case 'photographer':
        baseRules.push({
          id: 'photographer-files',
          name: 'Photo File Sync',
          description: 'Sync photo files with photographer',
          dataType: 'files',
          direction: 'bidirectional',
          frequency: 'realtime',
          enabled: true,
          conditions: ['photo_files_only'],
          conflictResolution: 'merge',
        });
        break;

      case 'venue':
        baseRules.push({
          id: 'venue-communications',
          name: 'Venue Communication Sync',
          description: 'Sync venue-related communications',
          dataType: 'communications',
          direction: 'bidirectional',
          frequency: 'hourly',
          enabled: true,
          conditions: ['venue_related'],
          conflictResolution: 'merge',
        });
        break;
    }

    return baseRules;
  }

  private generateDataAccessMatrix(permissions: PermissionLevel[]): any {
    const matrix: any = {};

    permissions.forEach((permission) => {
      switch (permission) {
        case 'read_basic':
          matrix.clientInfo = { read: true, write: false };
          break;
        case 'read_timeline':
          matrix.timeline = { read: true, write: false };
          break;
        case 'write_timeline':
          matrix.timeline = { ...matrix.timeline, write: true };
          break;
        case 'read_files':
          matrix.files = { read: true, write: false };
          break;
      }
    });

    return matrix;
  }

  private async applyResolution(
    conflict: SyncConflict,
    resolvedValue: any,
    source: 'wedsync' | 'wedme' | 'merged',
  ): Promise<void> {
    // Apply the resolved value to both platforms
    await this.delay(300);

    if (source === 'wedsync' || source === 'merged') {
      // Update WedMe with resolved value
      await this.updateWedMeData(
        conflict.dataType,
        conflict.field,
        resolvedValue,
      );
    }

    if (source === 'wedme' || source === 'merged') {
      // Update WedSync with resolved value
      await this.updateWedSyncData(
        conflict.dataType,
        conflict.field,
        resolvedValue,
      );
    }
  }

  private async mergeConflictValues(conflict: SyncConflict): Promise<any> {
    // Implement intelligent merging based on data type
    switch (conflict.dataType) {
      case 'timeline':
        // For timeline conflicts, prefer the later time
        const wedmeTime = new Date(`2024-01-01 ${conflict.wedmeValue}`);
        const wedsyncTime = new Date(`2024-01-01 ${conflict.wedsyncValue}`);
        return wedmeTime > wedsyncTime
          ? conflict.wedmeValue
          : conflict.wedsyncValue;

      case 'client_data':
        // For client data, merge non-conflicting fields
        if (
          typeof conflict.wedmeValue === 'object' &&
          typeof conflict.wedsyncValue === 'object'
        ) {
          return { ...conflict.wedsyncValue, ...conflict.wedmeValue };
        }
        break;

      default:
        // Default to WedMe value
        return conflict.wedmeValue;
    }
  }

  private async updateWedMeData(
    dataType: string,
    field: string,
    value: any,
  ): Promise<void> {
    // Update WedMe platform data
    await this.delay(200);
  }

  private async updateWedSyncData(
    dataType: string,
    field: string,
    value: any,
  ): Promise<void> {
    // Update WedSync platform data
    await this.delay(200);
  }

  private async checkWedSyncChanges(): Promise<any[]> {
    // Check for changes from WedSync platform
    await this.delay(100);

    // Mock: Occasionally return changes
    if (Math.random() > 0.8) {
      return [
        {
          dataType: 'timeline',
          field: 'venue_arrival_time',
          oldValue: '13:30',
          newValue: '13:45',
          timestamp: new Date().toISOString(),
          source: 'venue_supplier',
        },
      ];
    }

    return [];
  }

  private async processSyncChange(
    change: any,
  ): Promise<{ success: boolean; affectedItems?: string[] }> {
    // Process individual sync change
    await this.delay(150);

    return {
      success: true,
      affectedItems: [change.field],
    };
  }

  private getRealTimeSyncInterval(): number {
    switch (this.integrationConfig.syncFrequency) {
      case 'realtime':
        return 30000; // 30 seconds
      case 'hourly':
        return 3600000; // 1 hour
      case 'daily':
        return 86400000; // 24 hours
      default:
        return 300000; // 5 minutes
    }
  }

  private logEvent(
    type: string,
    description: string,
    status: 'success' | 'error' | 'warning' | 'info',
  ): void {
    const event: SyncEvent = {
      id: `event-${Date.now()}-${Math.random()}`,
      type,
      description,
      timestamp: new Date().toISOString(),
      status,
    };

    this.eventLog.push(event);

    // Keep only last 100 events
    if (this.eventLog.length > 100) {
      this.eventLog = this.eventLog.slice(-100);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Factory function and utilities
export function createWedSyncIntegration(
  couple: CoupleProfile,
  config: IntegrationConfig,
): WedSyncIntegrationEngine {
  return new WedSyncIntegrationEngine(couple, config);
}

export function generateDefaultIntegrationConfig(
  coupleId: string,
  preferences: {
    autoSync?: boolean;
    syncFrequency?: 'realtime' | 'hourly' | 'daily' | 'manual';
    notifications?: boolean;
    encryption?: boolean;
  } = {},
): IntegrationConfig {
  return {
    coupleId,
    autoSync: preferences.autoSync ?? true,
    syncFrequency: preferences.syncFrequency ?? 'realtime',
    notifyConflicts: preferences.notifications ?? true,
    encryption: preferences.encryption ?? true,
    anonymization: false,
    retentionPeriod: 365,
    conflictResolution: 'prompt',
    syncRules: [],
    dataMapping: {},
    permissions: ['read_basic', 'read_timeline', 'write_timeline'],
    webhookUrl: null,
    backupEnabled: true,
    compressionEnabled: true,
  };
}

export function validateSyncPermissions(
  permissions: PermissionLevel[],
  requestedOperation: string,
  dataType: string,
): { allowed: boolean; reason?: string } {
  const operationPermissions: { [key: string]: PermissionLevel[] } = {
    read_client: ['read_basic', 'admin'],
    read_timeline: ['read_timeline', 'write_timeline', 'admin'],
    write_timeline: ['write_timeline', 'admin'],
    read_files: ['read_files', 'write_files', 'admin'],
    write_files: ['write_files', 'admin'],
  };

  const requiredPermissions = operationPermissions[requestedOperation];
  if (!requiredPermissions) {
    return { allowed: false, reason: 'Unknown operation' };
  }

  const hasPermission = requiredPermissions.some((perm) =>
    permissions.includes(perm),
  );
  if (!hasPermission) {
    return {
      allowed: false,
      reason: `Missing required permission. Need one of: ${requiredPermissions.join(', ')}`,
    };
  }

  return { allowed: true };
}

export function generateSyncReport(integration: WedSyncIntegration): {
  summary: string;
  stats: { [key: string]: number };
  recommendations: string[];
} {
  const recentEvents = integration.recentEvents || [];
  const successfulSyncs = recentEvents.filter(
    (e) => e.status === 'success',
  ).length;
  const errorSyncs = recentEvents.filter((e) => e.status === 'error').length;
  const conflictCount = integration.conflicts?.length || 0;

  const stats = {
    totalEvents: recentEvents.length,
    successfulSyncs,
    errorSyncs,
    pendingConflicts: conflictCount,
    connectedSuppliers:
      integration.supplierConnections?.filter((s) => s.status === 'connected')
        .length || 0,
  };

  const recommendations = [];

  if (errorSyncs > successfulSyncs * 0.1) {
    recommendations.push(
      'High error rate detected. Review sync configuration and network connectivity.',
    );
  }

  if (conflictCount > 5) {
    recommendations.push(
      'Multiple unresolved conflicts. Consider reviewing sync rules and resolution strategies.',
    );
  }

  if (stats.connectedSuppliers === 0) {
    recommendations.push(
      'No suppliers connected. Connect with your wedding vendors for better coordination.',
    );
  }

  const successRate =
    stats.totalEvents > 0
      ? ((successfulSyncs / stats.totalEvents) * 100).toFixed(1)
      : '0';
  const summary = `Integration health: ${successRate}% success rate with ${stats.connectedSuppliers} connected suppliers.`;

  return { summary, stats, recommendations };
}
