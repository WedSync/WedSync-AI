import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from '@supabase/supabase-js';
import { BaseIntegrationService } from '../BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface PortfolioUpdate {
  id: string;
  portfolioId: string;
  userId: string;
  type:
    | 'image_added'
    | 'image_removed'
    | 'metadata_updated'
    | 'ai_analysis_complete'
    | 'processing_status';
  data: Record<string, any>;
  timestamp: Date;
  device?: string;
  sessionId?: string;
}

interface ConflictResolution {
  conflictId: string;
  portfolioId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  lastModified: Date;
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
}

interface PresenceData {
  userId: string;
  username: string;
  portfolioId: string;
  cursor?: { x: number; y: number };
  selectedImages?: string[];
  lastSeen: Date;
}

export class RealtimeSyncManager extends BaseIntegrationService {
  protected serviceName = 'Realtime Sync Manager';
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, (update: PortfolioUpdate) => void> =
    new Map();
  private presence: Map<string, PresenceData> = new Map();
  private conflictQueue: ConflictResolution[] = [];
  private optimisticUpdates: Map<
    string,
    { update: PortfolioUpdate; rollback: () => void }
  > = new Map();
  private syncBuffer: PortfolioUpdate[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
    this.initializeSupabase();
  }

  private initializeSupabase(): void {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      },
    );
  }

  async validateConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('portfolios')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Realtime connection validation failed:', error);
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.refreshSession();

    if (error || !session) {
      throw new IntegrationError(
        'Failed to refresh Supabase session',
        'SESSION_REFRESH_FAILED',
        ErrorCategory.AUTHENTICATION,
        error || undefined,
      );
    }

    return session.access_token;
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    try {
      // For Supabase operations, we use the client directly
      const result = await this.supabase.rpc(endpoint, options?.body || {});

      if (result.error) {
        throw new IntegrationError(
          `Supabase RPC failed: ${result.error.message}`,
          'SUPABASE_RPC_FAILED',
          ErrorCategory.EXTERNAL_API,
          result.error,
        );
      }

      return {
        success: true,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new IntegrationError(
        'Realtime sync request failed',
        'SYNC_REQUEST_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  async subscribeToPortfolio(
    portfolioId: string,
    userId: string,
    callback: (update: PortfolioUpdate) => void,
  ): Promise<string> {
    const subscriptionId = `portfolio_${portfolioId}_${userId}_${Date.now()}`;

    try {
      // Create channel for portfolio updates
      const channel = this.supabase
        .channel(`portfolio:${portfolioId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'portfolio_images',
            filter: `portfolio_id=eq.${portfolioId}`,
          },
          (payload) =>
            this.handleDatabaseChange(payload, portfolioId, callback),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'portfolio_metadata',
            filter: `portfolio_id=eq.${portfolioId}`,
          },
          (payload) =>
            this.handleMetadataChange(payload, portfolioId, callback),
        )
        .on('broadcast', { event: 'portfolio_update' }, (payload) => {
          this.handleBroadcastUpdate(payload, callback);
        })
        .subscribe();

      this.channels.set(subscriptionId, channel);
      this.subscriptions.set(subscriptionId, callback);

      return subscriptionId;
    } catch (error) {
      throw new IntegrationError(
        'Failed to subscribe to portfolio updates',
        'SUBSCRIPTION_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  private handleDatabaseChange(
    payload: any,
    portfolioId: string,
    callback: (update: PortfolioUpdate) => void,
  ): void {
    const update: PortfolioUpdate = {
      id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      portfolioId,
      userId: payload.new?.user_id || payload.old?.user_id,
      type: this.mapEventToType(payload.eventType),
      data: payload.new || payload.old,
      timestamp: new Date(),
    };

    callback(update);
  }

  private handleMetadataChange(
    payload: any,
    portfolioId: string,
    callback: (update: PortfolioUpdate) => void,
  ): void {
    const update: PortfolioUpdate = {
      id: `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      portfolioId,
      userId: payload.new?.updated_by || payload.old?.updated_by,
      type: 'metadata_updated',
      data: payload.new || payload.old,
      timestamp: new Date(),
    };

    callback(update);
  }

  private handleBroadcastUpdate(
    payload: any,
    callback: (update: PortfolioUpdate) => void,
  ): void {
    if (payload.payload && typeof payload.payload === 'object') {
      callback(payload.payload as PortfolioUpdate);
    }
  }

  private mapEventToType(eventType: string): PortfolioUpdate['type'] {
    switch (eventType) {
      case 'INSERT':
        return 'image_added';
      case 'DELETE':
        return 'image_removed';
      case 'UPDATE':
        return 'metadata_updated';
      default:
        return 'processing_status';
    }
  }

  async unsubscribeFromPortfolio(subscriptionId: string): Promise<void> {
    const channel = this.channels.get(subscriptionId);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);
  }

  async broadcastPortfolioUpdate(update: PortfolioUpdate): Promise<void> {
    const channel = this.supabase.channel(`portfolio:${update.portfolioId}`);

    try {
      await channel.send({
        type: 'broadcast',
        event: 'portfolio_update',
        payload: update,
      });
    } catch (error) {
      throw new IntegrationError(
        'Failed to broadcast portfolio update',
        'BROADCAST_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  async enablePresenceTracking(
    portfolioId: string,
    userData: Omit<PresenceData, 'portfolioId' | 'lastSeen'>,
  ): Promise<string> {
    const presenceId = `presence_${portfolioId}_${userData.userId}`;

    try {
      const channel = this.supabase.channel(
        `portfolio:${portfolioId}:presence`,
        {
          config: { presence: { key: userData.userId } },
        },
      );

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          this.syncPresenceState(portfolioId, presenceState);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.handlePresenceJoin(portfolioId, key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.handlePresenceLeave(portfolioId, key, leftPresences);
        })
        .subscribe();

      // Track own presence
      await channel.track({
        ...userData,
        portfolioId,
        lastSeen: new Date().toISOString(),
      });

      this.channels.set(presenceId, channel);

      return presenceId;
    } catch (error) {
      throw new IntegrationError(
        'Failed to enable presence tracking',
        'PRESENCE_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  private syncPresenceState(
    portfolioId: string,
    presenceState: Record<string, any>,
  ): void {
    Object.values(presenceState).forEach((presences: any) => {
      presences.forEach((presence: any) => {
        this.presence.set(presence.userId, {
          ...presence,
          lastSeen: new Date(presence.lastSeen),
        });
      });
    });
  }

  private handlePresenceJoin(
    portfolioId: string,
    key: string,
    newPresences: any[],
  ): void {
    newPresences.forEach((presence) => {
      console.log(`User ${presence.username} joined portfolio ${portfolioId}`);
      this.presence.set(presence.userId, {
        ...presence,
        lastSeen: new Date(presence.lastSeen),
      });
    });
  }

  private handlePresenceLeave(
    portfolioId: string,
    key: string,
    leftPresences: any[],
  ): void {
    leftPresences.forEach((presence) => {
      console.log(`User ${presence.username} left portfolio ${portfolioId}`);
      this.presence.delete(presence.userId);
    });
  }

  async updatePresence(
    portfolioId: string,
    userId: string,
    updates: Partial<Pick<PresenceData, 'cursor' | 'selectedImages'>>,
  ): Promise<void> {
    const presenceId = `presence_${portfolioId}_${userId}`;
    const channel = this.channels.get(presenceId);

    if (channel) {
      const currentPresence = this.presence.get(userId);
      if (currentPresence) {
        const updatedPresence = {
          ...currentPresence,
          ...updates,
          lastSeen: new Date().toISOString(),
        };

        await channel.track(updatedPresence);
        this.presence.set(userId, { ...updatedPresence, lastSeen: new Date() });
      }
    }
  }

  getActiveUsers(portfolioId: string): PresenceData[] {
    return Array.from(this.presence.values()).filter(
      (presence) => presence.portfolioId === portfolioId,
    );
  }

  async optimisticUpdate(
    update: PortfolioUpdate,
    rollbackFn: () => void,
    timeoutMs: number = 5000,
  ): Promise<void> {
    const updateId = `optimistic_${update.id}`;

    // Store the optimistic update
    this.optimisticUpdates.set(updateId, {
      update,
      rollback: rollbackFn,
    });

    try {
      // Attempt to sync with server
      await this.broadcastPortfolioUpdate(update);

      // If successful, remove from optimistic updates
      this.optimisticUpdates.delete(updateId);
    } catch (error) {
      // If failed, schedule rollback
      setTimeout(() => {
        const storedUpdate = this.optimisticUpdates.get(updateId);
        if (storedUpdate) {
          storedUpdate.rollback();
          this.optimisticUpdates.delete(updateId);
        }
      }, timeoutMs);

      throw error;
    }
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any,
  ): Promise<void> {
    const conflict = this.conflictQueue.find(
      (c) => c.conflictId === conflictId,
    );
    if (!conflict) {
      throw new IntegrationError(
        'Conflict not found',
        'CONFLICT_NOT_FOUND',
        ErrorCategory.VALIDATION,
      );
    }

    let resolvedValue: any;

    switch (resolution) {
      case 'local':
        resolvedValue = conflict.localValue;
        break;
      case 'remote':
        resolvedValue = conflict.remoteValue;
        break;
      case 'merge':
        resolvedValue =
          mergedData ||
          this.mergeValues(conflict.localValue, conflict.remoteValue);
        break;
    }

    // Apply resolution to database
    const { error } = await this.supabase
      .from('portfolio_metadata')
      .update({ [conflict.field]: resolvedValue })
      .eq('portfolio_id', conflict.portfolioId);

    if (error) {
      throw new IntegrationError(
        'Failed to apply conflict resolution',
        'CONFLICT_RESOLUTION_FAILED',
        ErrorCategory.EXTERNAL_API,
        error,
      );
    }

    // Remove from conflict queue
    this.conflictQueue = this.conflictQueue.filter(
      (c) => c.conflictId !== conflictId,
    );

    // Broadcast resolution
    await this.broadcastPortfolioUpdate({
      id: `conflict_resolved_${conflictId}`,
      portfolioId: conflict.portfolioId,
      userId: 'system',
      type: 'metadata_updated',
      data: {
        field: conflict.field,
        value: resolvedValue,
        conflictResolved: true,
      },
      timestamp: new Date(),
    });
  }

  private mergeValues(localValue: any, remoteValue: any): any {
    // Simple merge strategy - in production, this would be more sophisticated
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return { ...remoteValue, ...localValue };
    }

    // For non-objects, prefer local value
    return localValue;
  }

  async batchSyncUpdates(updates: PortfolioUpdate[]): Promise<void> {
    this.syncBuffer.push(...updates);

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(async () => {
      const batch = [...this.syncBuffer];
      this.syncBuffer = [];

      try {
        // Group updates by portfolio
        const portfolioGroups = batch.reduce(
          (groups, update) => {
            if (!groups[update.portfolioId]) {
              groups[update.portfolioId] = [];
            }
            groups[update.portfolioId].push(update);
            return groups;
          },
          {} as Record<string, PortfolioUpdate[]>,
        );

        // Broadcast each portfolio's updates
        for (const [portfolioId, portfolioUpdates] of Object.entries(
          portfolioGroups,
        )) {
          const channel = this.supabase.channel(`portfolio:${portfolioId}`);

          await channel.send({
            type: 'broadcast',
            event: 'batch_portfolio_updates',
            payload: { updates: portfolioUpdates },
          });
        }
      } catch (error) {
        console.error('Batch sync failed:', error);
        // Re-queue failed updates
        this.syncBuffer.unshift(...batch);
      }
    }, 100); // 100ms batch window
  }

  async getPortfolioState(portfolioId: string): Promise<{
    images: any[];
    metadata: any;
    lastUpdated: Date;
    conflictsCount: number;
  }> {
    const [imagesResult, metadataResult] = await Promise.all([
      this.supabase
        .from('portfolio_images')
        .select('*')
        .eq('portfolio_id', portfolioId),
      this.supabase
        .from('portfolio_metadata')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .single(),
    ]);

    if (imagesResult.error) {
      throw new IntegrationError(
        'Failed to fetch portfolio images',
        'FETCH_IMAGES_FAILED',
        ErrorCategory.EXTERNAL_API,
        imagesResult.error,
      );
    }

    const conflicts = this.conflictQueue.filter(
      (c) => c.portfolioId === portfolioId,
    );

    return {
      images: imagesResult.data || [],
      metadata: metadataResult.data || {},
      lastUpdated: new Date(),
      conflictsCount: conflicts.length,
    };
  }

  getConnectionStatus(): {
    connected: boolean;
    channels: number;
    subscriptions: number;
    presenceUsers: number;
    pendingConflicts: number;
    optimisticUpdates: number;
  } {
    return {
      connected: this.supabase.realtime.isConnected(),
      channels: this.channels.size,
      subscriptions: this.subscriptions.size,
      presenceUsers: this.presence.size,
      pendingConflicts: this.conflictQueue.length,
      optimisticUpdates: this.optimisticUpdates.size,
    };
  }

  async cleanup(): Promise<void> {
    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Unsubscribe from all channels
    for (const [id, channel] of this.channels.entries()) {
      await channel.unsubscribe();
    }

    this.channels.clear();
    this.subscriptions.clear();
    this.presence.clear();
    this.optimisticUpdates.clear();
    this.syncBuffer = [];
  }

  async enableBackgroundSync(): Promise<void> {
    // Set up periodic sync for offline/connection recovery
    setInterval(async () => {
      if (!this.supabase.realtime.isConnected()) {
        try {
          // Attempt to reconnect
          await this.supabase.realtime.connect();
          console.log('Realtime connection restored');
        } catch (error) {
          console.warn('Failed to restore realtime connection:', error);
        }
      }

      // Process any pending optimistic updates
      if (this.optimisticUpdates.size > 0) {
        console.log(
          `Processing ${this.optimisticUpdates.size} optimistic updates`,
        );
        // Implementation would retry failed updates
      }
    }, 30000); // Check every 30 seconds
  }
}
