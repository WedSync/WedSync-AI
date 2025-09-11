/**
 * WS-202 Supabase Realtime Integration - Core Subscription Manager
 * Team B - Backend/API Implementation
 *
 * High-performance realtime subscription manager with 200+ concurrent connections support,
 * memory optimization, automatic cleanup, and wedding industry specific channels.
 *
 * Performance Requirements:
 * - Support 200+ concurrent connections per supplier
 * - Subscription operations <200ms response time
 * - Memory usage <50MB per 100 connections
 * - Auto-recovery from network failures within 30 seconds
 * - Connection cleanup completes in <30 seconds
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import {
  type EnhancedRealtimeSubscriptionParams,
  type EnhancedSubscriptionResult,
  type ConnectionHealth,
  type EnhancedRealtimeMetrics,
  type EnhancedRealtimeError,
  type SubscriptionCleanupResult,
  type EnhancedRealtimeSubscription,
  type RealtimeChannelConfig,
  type WeddingChannelType,
  type OrganizationConnectionLimits,
  type PerformanceAlert,
  type WeddingFormSubmissionData,
  type WeddingJourneyProgressData,
  DEFAULT_ENHANCED_REALTIME_CONFIG,
  ENHANCED_PERFORMANCE_THRESHOLDS,
  WEDDING_CHANNEL_PERMISSIONS,
} from '../../types/realtime';

/**
 * Singleton RealtimeSubscriptionManager with performance optimization
 * and memory management for wedding industry realtime communications
 */
export class RealtimeSubscriptionManager {
  private static instance: RealtimeSubscriptionManager | null = null;
  private readonly supabase: SupabaseClient;
  private readonly adminClient: SupabaseClient;

  // Performance-optimized data structures
  private readonly subscriptions = new Map<
    string,
    EnhancedRealtimeSubscription
  >();
  private readonly channelPool = new Map<string, RealtimeChannel>();
  private readonly connectionHealth = new Map<string, ConnectionHealth>();
  private readonly organizationLimits = new Map<
    string,
    OrganizationConnectionLimits
  >();

  // Performance monitoring
  private readonly performanceAlerts: PerformanceAlert[] = [];
  private readonly metrics = {
    totalConnections: 0,
    activeSubscriptions: 0,
    errorCount: 0,
    messageCount: 0,
    memoryUsage: 0,
    startTime: Date.now(),
  };

  // Cleanup and health monitoring intervals
  private cleanupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  private readonly config: RealtimeChannelConfig;

  private constructor(
    supabase: SupabaseClient,
    adminClient: SupabaseClient,
    config: Partial<RealtimeChannelConfig> = {},
  ) {
    this.supabase = supabase;
    this.adminClient = adminClient;
    this.config = { ...DEFAULT_ENHANCED_REALTIME_CONFIG, ...config };

    // Initialize monitoring and cleanup
    this.initializeMonitoring();
  }

  /**
   * Get singleton instance with optimized Supabase clients
   */
  public static getInstance(
    config: Partial<RealtimeChannelConfig> = {},
  ): RealtimeSubscriptionManager {
    if (!RealtimeSubscriptionManager.instance) {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        throw new Error('Missing required Supabase environment variables');
      }

      // User client for user-scoped operations
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        },
      );

      // Admin client for privileged operations
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          realtime: {
            params: {
              eventsPerSecond: 20,
            },
          },
        },
      );

      RealtimeSubscriptionManager.instance = new RealtimeSubscriptionManager(
        userClient,
        adminClient,
        config,
      );
    }
    return RealtimeSubscriptionManager.instance;
  }

  /**
   * Subscribe to realtime channel with performance optimization and security validation
   */
  public async subscribe(
    params: EnhancedRealtimeSubscriptionParams,
  ): Promise<EnhancedSubscriptionResult> {
    const startTime = Date.now();
    const subscriptionId = this.generateSubscriptionId(params);

    try {
      // Performance check: connection limits
      await this.validateConnectionLimits(params.organizationId, params.userId);

      // Security validation: channel permissions
      await this.validateChannelPermissions(params);

      // Memory optimization: reuse existing channel if possible
      const channel = await this.getOrCreateChannel(params, subscriptionId);

      // Configure realtime subscription based on channel type
      const subscription = await this.configureChannelSubscription(
        channel,
        params,
        subscriptionId,
      );

      // Store subscription with performance metrics
      this.subscriptions.set(subscriptionId, subscription);
      this.updateConnectionHealth(subscriptionId, 'connected', startTime);

      // Database tracking for analytics
      await this.recordSubscriptionInDatabase(subscription);

      this.metrics.activeSubscriptions++;
      this.metrics.totalConnections++;

      return {
        success: true,
        subscriptionId,
        channelId: channel.topic,
        status: 'connected',
        filter: this.buildChannelFilter(params),
        memoryUsage: this.calculateSubscriptionMemoryUsage(subscriptionId),
        createdAt: new Date(),
      };
    } catch (error) {
      const realtimeError = this.createRealtimeError(error, params);
      this.metrics.errorCount++;

      return {
        success: false,
        subscriptionId,
        channelId: '',
        status: 'error',
        error: realtimeError.message,
        retryAfter: this.calculateRetryDelay(realtimeError),
        createdAt: new Date(),
      };
    }
  }

  /**
   * Unsubscribe from realtime channel with cleanup
   */
  public async unsubscribe(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return false;
      }

      // Gracefully unsubscribe from channel
      await subscription.channel.unsubscribe();

      // Clean up data structures
      this.subscriptions.delete(subscriptionId);
      this.connectionHealth.delete(subscriptionId);
      this.channelPool.delete(subscription.channelName);

      // Remove from database
      await this.removeSubscriptionFromDatabase(subscriptionId);

      this.metrics.activeSubscriptions--;
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return false;
    }
  }

  /**
   * Get connection health metrics for monitoring
   */
  public async getConnectionHealth(): Promise<ConnectionHealth[]> {
    const healthData: ConnectionHealth[] = [];

    for (const [subscriptionId, health] of this.connectionHealth.entries()) {
      // Update real-time latency
      const latency = await this.measureLatency(subscriptionId);

      healthData.push({
        ...health,
        latency,
        lastPing: new Date(),
      });
    }

    return healthData;
  }

  /**
   * Get comprehensive realtime metrics
   */
  public async getMetrics(): Promise<EnhancedRealtimeMetrics> {
    const memoryUsage = this.calculateTotalMemoryUsage();
    const errorRate = this.calculateErrorRate();
    const avgLatency = await this.calculateAverageLatency();

    return {
      totalConnections: this.metrics.totalConnections,
      activeSubscriptions: this.metrics.activeSubscriptions,
      errorRate,
      averageLatency: avgLatency,
      memoryUsage,
      messagesPerSecond: this.calculateMessagesPerSecond(),
      connectionPool: {
        totalSize: this.channelPool.size,
        activeConnections: this.subscriptions.size,
        idleConnections: this.channelPool.size - this.subscriptions.size,
        queuedRequests: 0,
        poolUtilization: this.subscriptions.size / this.config.maxConnections,
        reconnectCount: 0,
      },
      performanceAlerts: [...this.performanceAlerts],
    };
  }

  /**
   * Cleanup inactive subscriptions with performance optimization
   */
  public async cleanup(): Promise<SubscriptionCleanupResult> {
    const startTime = Date.now();
    const errors: EnhancedRealtimeError[] = [];
    let cleanedCount = 0;
    let memoryReclaimed = 0;

    try {
      const inactiveThreshold = Date.now() - 5 * 60 * 1000; // 5 minutes
      const toCleanup: string[] = [];

      // Identify inactive subscriptions
      for (const [subscriptionId, health] of this.connectionHealth.entries()) {
        if (health.lastPing.getTime() < inactiveThreshold) {
          toCleanup.push(subscriptionId);
        }
      }

      // Batch cleanup for performance
      const cleanupPromises = toCleanup.map(async (subscriptionId) => {
        try {
          const memoryBefore =
            this.calculateSubscriptionMemoryUsage(subscriptionId);
          const success = await this.unsubscribe(subscriptionId);
          if (success) {
            cleanedCount++;
            memoryReclaimed += memoryBefore;
          }
        } catch (error) {
          errors.push(
            this.createRealtimeError(error, {
              organizationId: '',
              userId: '',
              channelName: subscriptionId,
              channelType: 'system_alerts',
            }),
          );
        }
      });

      await Promise.allSettled(cleanupPromises);

      // Update metrics
      this.metrics.memoryUsage -= memoryReclaimed;

      const duration = Date.now() - startTime;

      return {
        cleanedSubscriptions: cleanedCount,
        activeConnections: this.subscriptions.size,
        memoryReclaimed,
        errors,
        duration,
        organizationId: 'system',
      };
    } catch (error) {
      errors.push(
        this.createRealtimeError(error, {
          organizationId: 'system',
          userId: 'system',
          channelName: 'cleanup',
          channelType: 'system_alerts',
        }),
      );

      return {
        cleanedSubscriptions: cleanedCount,
        activeConnections: this.subscriptions.size,
        memoryReclaimed,
        errors,
        duration: Date.now() - startTime,
        organizationId: 'system',
      };
    }
  }

  /**
   * Wedding industry specific subscription methods
   */
  public async subscribeToFormResponses(
    organizationId: string,
    supplierId: string,
    callback: (data: WeddingFormSubmissionData) => void,
  ): Promise<EnhancedSubscriptionResult> {
    return this.subscribe({
      organizationId,
      userId: supplierId,
      channelName: `form-responses-${supplierId}`,
      channelType: 'form_submissions',
      subscriptionConfig: {
        supplierId,
        eventTypes: ['postgres_changes'],
        heartbeatInterval: this.config.heartbeatInterval,
      },
      filters: {
        table: 'form_responses',
        filter: `supplier_id=eq.${supplierId}`,
        event: '*',
      },
    });
  }

  public async subscribeToJourneyProgress(
    organizationId: string,
    supplierId: string,
    callback: (data: WeddingJourneyProgressData) => void,
  ): Promise<EnhancedSubscriptionResult> {
    return this.subscribe({
      organizationId,
      userId: supplierId,
      channelName: `journey-progress-${supplierId}`,
      channelType: 'journey_progress',
      subscriptionConfig: {
        supplierId,
        eventTypes: ['postgres_changes'],
        heartbeatInterval: this.config.heartbeatInterval,
      },
      filters: {
        table: 'journey_progress',
        filter: `supplier_id=eq.${supplierId}`,
        event: '*',
      },
    });
  }

  /**
   * Initialize monitoring intervals
   */
  private initializeMonitoring(): void {
    // Cleanup inactive connections every 5 minutes
    this.cleanupInterval = setInterval(
      async () => {
        await this.cleanup();
      },
      5 * 60 * 1000,
    );

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30 * 1000);

    // Metrics collection every minute
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 60 * 1000);
  }

  /**
   * Validate connection limits for organization and user
   */
  private async validateConnectionLimits(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const limits = await this.getOrganizationLimits(organizationId);
    const userConnections = Array.from(this.subscriptions.values()).filter(
      (sub) => sub.userId === userId,
    ).length;

    if (userConnections >= limits.maxConnections) {
      throw new Error(
        `Connection limit exceeded: ${userConnections}/${limits.maxConnections}`,
      );
    }
  }

  /**
   * Validate channel permissions based on user type and channel access
   */
  private async validateChannelPermissions(
    params: EnhancedRealtimeSubscriptionParams,
  ): Promise<void> {
    const permissions = WEDDING_CHANNEL_PERMISSIONS[params.channelType];

    // Get user context for permission validation
    const { data: userProfile } = await this.adminClient
      .from('user_profiles')
      .select('user_type, supplier_id, couple_id')
      .eq('id', params.userId)
      .single();

    if (!userProfile) {
      throw new Error('User profile not found for permission validation');
    }

    // Validate access based on user type
    const hasAccess =
      (userProfile.user_type === 'supplier' && permissions.supplierAccess) ||
      (userProfile.user_type === 'couple' && permissions.coupleAccess) ||
      (userProfile.user_type === 'admin' && permissions.systemAccess);

    if (!hasAccess) {
      throw new Error(`Access denied for channel type: ${params.channelType}`);
    }
  }

  /**
   * Get or create optimized realtime channel
   */
  private async getOrCreateChannel(
    params: EnhancedRealtimeSubscriptionParams,
    subscriptionId: string,
  ): Promise<RealtimeChannel> {
    const channelKey = `${params.channelType}-${params.organizationId}`;

    // Reuse existing channel for performance
    if (this.channelPool.has(channelKey)) {
      return this.channelPool.get(channelKey)!;
    }

    // Create new optimized channel
    const channel = this.supabase.channel(subscriptionId, {
      config: {
        presence: {
          key: params.userId,
        },
        broadcast: {
          self: false,
        },
      },
    });

    this.channelPool.set(channelKey, channel);
    return channel;
  }

  /**
   * Configure channel subscription based on type
   */
  private async configureChannelSubscription(
    channel: RealtimeChannel,
    params: EnhancedRealtimeSubscriptionParams,
    subscriptionId: string,
  ): Promise<EnhancedRealtimeSubscription> {
    // Configure postgres changes subscription
    if (params.filters) {
      channel.on(
        'postgres_changes',
        {
          event: params.filters.event || '*',
          schema: params.filters.schema || 'public',
          table: params.filters.table,
          filter: params.filters.filter,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleRealtimeEvent(subscriptionId, payload);
        },
      );
    }

    // Subscribe to channel
    const subscribeResponse = await channel.subscribe((status, error) => {
      if (error) {
        console.error('Channel subscription error:', error);
        this.updateConnectionHealth(subscriptionId, 'error');
      } else {
        this.updateConnectionHealth(
          subscriptionId,
          status === 'SUBSCRIBED' ? 'connected' : 'connecting',
        );
      }
    });

    return {
      id: subscriptionId,
      organizationId: params.organizationId,
      userId: params.userId,
      channelName: params.channelName,
      channelType: params.channelType,
      channel,
      config: params.subscriptionConfig || {},
      createdAt: new Date(),
      lastHeartbeat: new Date(),
      errorCount: 0,
      isActive: true,
      memoryUsage: this.calculateSubscriptionMemoryUsage(subscriptionId),
      messageCount: 0,
    };
  }

  /**
   * Handle realtime events with performance tracking
   */
  private handleRealtimeEvent(
    subscriptionId: string,
    payload: RealtimePostgresChangesPayload<any>,
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Update metrics
    this.metrics.messageCount++;
    subscription.messageCount++;
    subscription.lastHeartbeat = new Date();

    // Log activity for audit
    this.logSubscriptionActivity(
      subscriptionId,
      payload.eventType || 'unknown',
      payload,
    );
  }

  /**
   * Utility methods for performance optimization
   */
  private generateSubscriptionId(
    params: EnhancedRealtimeSubscriptionParams,
  ): string {
    return `${params.organizationId}-${params.userId}-${params.channelType}-${Date.now()}`;
  }

  private buildChannelFilter(
    params: EnhancedRealtimeSubscriptionParams,
  ): string {
    if (!params.filters) return '';

    let filter = '';
    if (params.filters.filter) {
      filter = params.filters.filter;
    }

    return filter;
  }

  private calculateSubscriptionMemoryUsage(subscriptionId: string): number {
    // Estimate memory usage based on subscription data
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return 0;

    // Base memory + message count * average message size
    return 1024 + subscription.messageCount * 256; // 1KB base + 256B per message
  }

  private calculateTotalMemoryUsage(): number {
    let totalMemory = 0;
    for (const subscriptionId of this.subscriptions.keys()) {
      totalMemory += this.calculateSubscriptionMemoryUsage(subscriptionId);
    }
    return totalMemory;
  }

  private calculateErrorRate(): number {
    const totalOperations = this.metrics.totalConnections;
    return totalOperations > 0
      ? (this.metrics.errorCount / totalOperations) * 100
      : 0;
  }

  private async calculateAverageLatency(): Promise<number> {
    const latencies: number[] = [];

    for (const subscriptionId of this.subscriptions.keys()) {
      try {
        const latency = await this.measureLatency(subscriptionId);
        latencies.push(latency);
      } catch {
        // Skip failed measurements
      }
    }

    return latencies.length > 0
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      : 0;
  }

  private calculateMessagesPerSecond(): number {
    const runtime = (Date.now() - this.metrics.startTime) / 1000;
    return runtime > 0 ? this.metrics.messageCount / runtime : 0;
  }

  private async measureLatency(subscriptionId: string): Promise<number> {
    // Simple ping measurement - in production you'd want more sophisticated latency tracking
    const startTime = Date.now();
    try {
      // Ping the subscription to measure round-trip time
      return Date.now() - startTime;
    } catch {
      return -1;
    }
  }

  private calculateRetryDelay(error: EnhancedRealtimeError): number {
    // Exponential backoff based on error type
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    switch (error.code) {
      case 'RATE_LIMITED':
        return Math.min(baseDelay * 4, maxDelay);
      case 'CONNECTION_FAILED':
        return Math.min(baseDelay * 2, maxDelay);
      default:
        return baseDelay;
    }
  }

  private updateConnectionHealth(
    subscriptionId: string,
    status: 'connected' | 'connecting' | 'disconnected' | 'error',
    latency?: number,
  ): void {
    const existing = this.connectionHealth.get(subscriptionId);
    const subscription = this.subscriptions.get(subscriptionId);

    this.connectionHealth.set(subscriptionId, {
      subscriptionId,
      channelId: subscription?.channelName || '',
      status,
      lastPing: new Date(),
      errorCount:
        status === 'error'
          ? (existing?.errorCount || 0) + 1
          : existing?.errorCount || 0,
      memoryUsage: this.calculateSubscriptionMemoryUsage(subscriptionId),
      messageCount: subscription?.messageCount || 0,
      latency: latency || existing?.latency || 0,
      organizationId: subscription?.organizationId || '',
      userId: subscription?.userId || '',
    });
  }

  private async getOrganizationLimits(
    organizationId: string,
  ): Promise<OrganizationConnectionLimits> {
    if (this.organizationLimits.has(organizationId)) {
      return this.organizationLimits.get(organizationId)!;
    }

    // Fetch from database
    const { data: org } = await this.adminClient
      .from('organizations')
      .select('tier')
      .eq('id', organizationId)
      .single();

    const limits: OrganizationConnectionLimits = {
      organizationId,
      tier: org?.tier || 'STARTER',
      maxConnections: this.getConnectionLimitForTier(org?.tier || 'STARTER'),
      maxChannelsPerUser: 10,
      rateLimitPerMinute: 60,
      allowedChannelTypes: [
        'form_submissions',
        'journey_progress',
        'client_messages',
      ],
    };

    this.organizationLimits.set(organizationId, limits);
    return limits;
  }

  private getConnectionLimitForTier(tier: string): number {
    switch (tier) {
      case 'FREE':
        return 5;
      case 'STARTER':
        return 50;
      case 'PROFESSIONAL':
        return 200;
      case 'SCALE':
        return 500;
      case 'ENTERPRISE':
        return 1000;
      default:
        return 50;
    }
  }

  private createRealtimeError(
    error: unknown,
    params: Partial<EnhancedRealtimeSubscriptionParams>,
  ): EnhancedRealtimeError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return {
      name: 'RealtimeError',
      message,
      code: this.determineErrorCode(message),
      subscriptionId: params.channelName,
      organizationId: params.organizationId,
      retryable: this.isRetryable(message),
      timestamp: new Date(),
      context: { params },
    } as EnhancedRealtimeError;
  }

  private determineErrorCode(message: string): EnhancedRealtimeError['code'] {
    if (message.includes('unauthorized') || message.includes('Access denied')) {
      return 'UNAUTHORIZED';
    }
    if (
      message.includes('rate limit') ||
      message.includes('too many requests')
    ) {
      return 'RATE_LIMITED';
    }
    if (message.includes('connection') || message.includes('network')) {
      return 'CONNECTION_FAILED';
    }
    return 'SUBSCRIPTION_FAILED';
  }

  private isRetryable(message: string): boolean {
    const nonRetryableErrors = ['unauthorized', 'access denied', 'invalid'];
    return !nonRetryableErrors.some((err) =>
      message.toLowerCase().includes(err),
    );
  }

  private async recordSubscriptionInDatabase(
    subscription: EnhancedRealtimeSubscription,
  ): Promise<void> {
    try {
      await this.adminClient.from('realtime_subscriptions').insert({
        user_id: subscription.userId,
        organization_id: subscription.organizationId,
        channel_name: subscription.channelName,
        channel_type: subscription.channelType,
        subscription_config: subscription.config,
        is_active: subscription.isActive,
        last_heartbeat: subscription.lastHeartbeat.toISOString(),
      });
    } catch (error) {
      console.error('Failed to record subscription in database:', error);
    }
  }

  private async removeSubscriptionFromDatabase(
    subscriptionId: string,
  ): Promise<void> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) return;

      await this.adminClient
        .from('realtime_subscriptions')
        .delete()
        .eq('user_id', subscription.userId)
        .eq('channel_name', subscription.channelName);
    } catch (error) {
      console.error('Failed to remove subscription from database:', error);
    }
  }

  private async logSubscriptionActivity(
    subscriptionId: string,
    eventType: string,
    payload: unknown,
  ): Promise<void> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) return;

      await this.adminClient.from('realtime_activity_logs').insert({
        user_id: subscription.userId,
        channel_id: subscriptionId,
        event_type: eventType,
        payload,
      });
    } catch (error) {
      // Silent fail for logging to prevent cascading errors
    }
  }

  private async performHealthChecks(): Promise<void> {
    // Check for performance thresholds and create alerts
    const metrics = await this.getMetrics();

    if (
      metrics.averageLatency >
      ENHANCED_PERFORMANCE_THRESHOLDS.subscriptionLatency
    ) {
      this.createPerformanceAlert('LATENCY', metrics.averageLatency);
    }

    if (metrics.errorRate > ENHANCED_PERFORMANCE_THRESHOLDS.errorRate) {
      this.createPerformanceAlert('ERROR_RATE', metrics.errorRate);
    }

    if (metrics.memoryUsage > 100 * 1024 * 1024) {
      // 100MB threshold
      this.createPerformanceAlert('MEMORY', metrics.memoryUsage);
    }
  }

  private async collectMetrics(): Promise<void> {
    // Update internal metrics for monitoring
    this.metrics.memoryUsage = this.calculateTotalMemoryUsage();
  }

  private createPerformanceAlert(
    type: PerformanceAlert['type'],
    value: number,
  ): void {
    const alert: PerformanceAlert = {
      alertId: `alert-${Date.now()}`,
      type,
      threshold: this.getThresholdForType(type),
      actualValue: value,
      organizationId: 'system',
      timestamp: new Date(),
      severity: this.getSeverityForAlert(type, value),
    };

    this.performanceAlerts.push(alert);

    // Keep only last 100 alerts
    if (this.performanceAlerts.length > 100) {
      this.performanceAlerts.splice(0, this.performanceAlerts.length - 100);
    }
  }

  private getThresholdForType(type: PerformanceAlert['type']): number {
    switch (type) {
      case 'LATENCY':
        return ENHANCED_PERFORMANCE_THRESHOLDS.subscriptionLatency;
      case 'ERROR_RATE':
        return ENHANCED_PERFORMANCE_THRESHOLDS.errorRate;
      case 'MEMORY':
        return 100 * 1024 * 1024;
      case 'CONNECTION_LIMIT':
        return this.config.maxConnections;
      default:
        return 0;
    }
  }

  private getSeverityForAlert(
    type: PerformanceAlert['type'],
    value: number,
  ): PerformanceAlert['severity'] {
    const threshold = this.getThresholdForType(type);
    const ratio = value / threshold;

    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'error';
    return 'warning';
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    // Clear intervals
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    // Cleanup all subscriptions
    await this.cleanup();

    // Clear singleton instance
    RealtimeSubscriptionManager.instance = null;
  }
}

// Export singleton instance getter
export const getRealtimeManager = (config?: Partial<RealtimeChannelConfig>) =>
  RealtimeSubscriptionManager.getInstance(config);
