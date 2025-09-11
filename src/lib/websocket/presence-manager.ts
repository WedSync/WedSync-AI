/**
 * WebSocket Presence Manager - WS-203 Team B Implementation
 *
 * Handles connection health monitoring, presence tracking, and connection quality scoring.
 * Critical for wedding day reliability with automatic failover and stale connection cleanup.
 *
 * Wedding Industry Features:
 * - Wedding day priority scoring (10x monitoring during events)
 * - Supplier multi-device presence tracking
 * - Connection quality adaptation for venue WiFi issues
 * - Automatic cleanup during high-traffic wedding seasons
 * - Real-time presence updates for coordination workflows
 */

import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { logger } from '@/lib/monitoring/logger';

// Types and Interfaces
export interface ConnectionHealth {
  connectionId: string;
  userId: string;
  channelId?: string;
  status: 'active' | 'idle' | 'disconnected' | 'reconnecting';
  lastHeartbeat: Date;
  connectionQuality: number; // 0-100 score
  latency: number; // milliseconds
  reconnectAttempts: number;
  connectedAt: Date;
  metadata: {
    userAgent: string;
    ipAddress: string;
    location?: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    weddingContext?: {
      weddingId: string;
      isWeddingDay: boolean;
      priority: 'low' | 'medium' | 'high' | 'critical';
    };
  };
}

export interface PresenceEvent {
  type: 'connect' | 'disconnect' | 'heartbeat' | 'quality_change' | 'cleanup';
  connectionId: string;
  userId: string;
  channelId?: string;
  data?: any;
  timestamp: Date;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  averageLatency: number;
  qualityDistribution: {
    excellent: number; // 90-100
    good: number; // 70-89
    fair: number; // 50-69
    poor: number; // 0-49
  };
  reconnectionRate: number;
  peakConcurrentConnections: number;
  weddingDayConnections: number;
}

interface PresenceManagerConfig {
  supabaseClient: SupabaseClient;
  redis?: Redis;
  heartbeatInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
  cleanupInterval: number; // milliseconds
  qualityThreshold: number; // minimum quality score
  maxReconnectAttempts: number;
  enableMetrics: boolean;
  weddingDayMultiplier: number; // monitoring frequency multiplier
}

export class PresenceManager extends EventEmitter {
  private supabase: SupabaseClient;
  private redis?: Redis;
  private config: PresenceManagerConfig;
  private connections = new Map<string, ConnectionHealth>();
  private heartbeatInterval: NodeJS.Timer;
  private cleanupInterval: NodeJS.Timer;
  private metricsInterval: NodeJS.Timer;
  private metrics: ConnectionMetrics;
  private isShuttingDown = false;

  constructor(config: Partial<PresenceManagerConfig>) {
    super();

    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 90000, // 90 seconds
      cleanupInterval: 300000, // 5 minutes
      qualityThreshold: 50,
      maxReconnectAttempts: 3,
      enableMetrics: true,
      weddingDayMultiplier: 10,
      ...config,
    } as PresenceManagerConfig;

    this.supabase = this.config.supabaseClient;
    this.redis = this.config.redis;

    // Initialize metrics
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      averageLatency: 0,
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      reconnectionRate: 0,
      peakConcurrentConnections: 0,
      weddingDayConnections: 0,
    };

    this.setupEventListeners();
    this.startMonitoring();

    logger.info('PresenceManager initialized', {
      heartbeatInterval: this.config.heartbeatInterval,
      connectionTimeout: this.config.connectionTimeout,
      qualityThreshold: this.config.qualityThreshold,
    });
  }

  /**
   * Track new WebSocket connection
   */
  async trackConnection(
    connectionId: string,
    userId: string,
    channelId: string | undefined,
    metadata: Partial<ConnectionHealth['metadata']>,
  ): Promise<void> {
    const connection: ConnectionHealth = {
      connectionId,
      userId,
      channelId,
      status: 'active',
      lastHeartbeat: new Date(),
      connectionQuality: 100, // Start optimistic
      latency: 0,
      reconnectAttempts: 0,
      connectedAt: new Date(),
      metadata: {
        userAgent: metadata.userAgent || 'Unknown',
        ipAddress: metadata.ipAddress || 'Unknown',
        location: metadata.location,
        deviceType: this.detectDeviceType(metadata.userAgent || ''),
        weddingContext: metadata.weddingContext,
      },
    };

    // Store in memory for fast access
    this.connections.set(connectionId, connection);

    // Store in database for persistence
    await this.persistConnectionHealth(connection);

    // Store in Redis for distributed access
    if (this.redis) {
      await this.redis.setex(
        `websocket:presence:${connectionId}`,
        Math.ceil(this.config.connectionTimeout / 1000),
        JSON.stringify(connection),
      );
    }

    // Update metrics
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    this.metrics.peakConcurrentConnections = Math.max(
      this.metrics.peakConcurrentConnections,
      this.metrics.activeConnections,
    );

    if (connection.metadata.weddingContext?.isWeddingDay) {
      this.metrics.weddingDayConnections++;
    }

    // Emit presence event
    this.emit('presence', {
      type: 'connect',
      connectionId,
      userId,
      channelId,
      data: connection,
      timestamp: new Date(),
    } as PresenceEvent);

    logger.info('Connection tracked', {
      connectionId,
      userId,
      channelId,
      deviceType: connection.metadata.deviceType,
      isWeddingDay: connection.metadata.weddingContext?.isWeddingDay || false,
    });
  }

  /**
   * Process heartbeat from WebSocket connection
   */
  async processHeartbeat(
    connectionId: string,
    latency?: number,
    additionalData?: any,
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn('Heartbeat received for unknown connection', {
        connectionId,
      });
      return;
    }

    const now = new Date();
    const previousLatency = connection.latency;

    // Update connection health
    connection.lastHeartbeat = now;
    connection.status = 'active';
    connection.latency = latency || connection.latency;

    // Calculate connection quality based on latency and stability
    connection.connectionQuality = this.calculateConnectionQuality(
      connection.latency,
      now.getTime() - connection.connectedAt.getTime(),
      connection.reconnectAttempts,
    );

    // Reset reconnect attempts on successful heartbeat
    if (connection.reconnectAttempts > 0) {
      connection.reconnectAttempts = 0;
      logger.info('Connection recovered', {
        connectionId,
        userId: connection.userId,
        quality: connection.connectionQuality,
      });
    }

    // Update in Redis
    if (this.redis) {
      await this.redis.setex(
        `websocket:presence:${connectionId}`,
        Math.ceil(this.config.connectionTimeout / 1000),
        JSON.stringify(connection),
      );
    }

    // Update database periodically (not on every heartbeat for performance)
    const shouldPersist = latency && Math.abs(latency - previousLatency) > 100;
    if (shouldPersist) {
      await this.persistConnectionHealth(connection);
    }

    // Emit heartbeat event
    this.emit('presence', {
      type: 'heartbeat',
      connectionId,
      userId: connection.userId,
      channelId: connection.channelId,
      data: {
        latency: connection.latency,
        quality: connection.connectionQuality,
        additionalData,
      },
      timestamp: now,
    } as PresenceEvent);

    // Log significant quality changes
    const qualityChange =
      connection.connectionQuality -
      this.calculateConnectionQuality(
        previousLatency,
        now.getTime() - connection.connectedAt.getTime(),
        connection.reconnectAttempts,
      );

    if (Math.abs(qualityChange) > 20) {
      logger.info('Significant connection quality change', {
        connectionId,
        userId: connection.userId,
        oldQuality: connection.connectionQuality - qualityChange,
        newQuality: connection.connectionQuality,
        latency: connection.latency,
      });

      this.emit('presence', {
        type: 'quality_change',
        connectionId,
        userId: connection.userId,
        channelId: connection.channelId,
        data: {
          oldQuality: connection.connectionQuality - qualityChange,
          newQuality: connection.connectionQuality,
          latency: connection.latency,
        },
        timestamp: now,
      } as PresenceEvent);
    }
  }

  /**
   * Handle connection disconnect
   */
  async disconnectConnection(
    connectionId: string,
    reason: string = 'client_disconnect',
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.status = 'disconnected';
    connection.lastHeartbeat = new Date();

    // Remove from active connections
    this.connections.delete(connectionId);
    this.metrics.activeConnections = Math.max(
      0,
      this.metrics.activeConnections - 1,
    );

    // Remove from Redis
    if (this.redis) {
      await this.redis.del(`websocket:presence:${connectionId}`);
    }

    // Update database
    await this.supabase
      .from('websocket_connection_health')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
        disconnect_reason: reason,
      })
      .eq('connection_id', connectionId);

    // Emit disconnect event
    this.emit('presence', {
      type: 'disconnect',
      connectionId,
      userId: connection.userId,
      channelId: connection.channelId,
      data: { reason },
      timestamp: new Date(),
    } as PresenceEvent);

    logger.info('Connection disconnected', {
      connectionId,
      userId: connection.userId,
      reason,
      sessionDuration: new Date().getTime() - connection.connectedAt.getTime(),
    });
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(connectionId: string): ConnectionHealth | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): ConnectionHealth[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.userId === userId,
    );
  }

  /**
   * Get all connections for a channel
   */
  getChannelConnections(channelId: string): ConnectionHealth[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.channelId === channelId,
    );
  }

  /**
   * Get current connection metrics
   */
  getMetrics(): ConnectionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get connections by quality threshold
   */
  getConnectionsByQuality(minQuality: number): ConnectionHealth[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.connectionQuality >= minQuality,
    );
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.getUserConnections(userId).some(
      (conn) => conn.status === 'active' && this.isConnectionAlive(conn),
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Graceful shutdown handling
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    // Memory cleanup
    this.on('presence', (event: PresenceEvent) => {
      if (this.config.enableMetrics) {
        this.updateConnectionMetrics(event);
      }
    });
  }

  /**
   * Start monitoring intervals
   */
  private startMonitoring(): void {
    // Heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.config.heartbeatInterval);

    // Connection cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, this.config.cleanupInterval);

    // Metrics update
    if (this.config.enableMetrics) {
      this.metricsInterval = setInterval(() => {
        this.updateMetrics();
      }, 60000); // Update metrics every minute
    }
  }

  /**
   * Check for stale connections and missing heartbeats
   */
  private async checkHeartbeats(): Promise<void> {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceHeartbeat =
        now.getTime() - connection.lastHeartbeat.getTime();
      const timeout = this.getConnectionTimeout(connection);

      if (timeSinceHeartbeat > timeout) {
        if (connection.status === 'active') {
          // Mark as reconnecting first
          connection.status = 'reconnecting';
          connection.reconnectAttempts++;

          logger.warn('Connection heartbeat timeout', {
            connectionId,
            userId: connection.userId,
            timeSinceHeartbeat,
            reconnectAttempts: connection.reconnectAttempts,
          });

          // Allow reconnection attempts
          if (connection.reconnectAttempts < this.config.maxReconnectAttempts) {
            continue;
          }
        }

        staleConnections.push(connectionId);
      }
    }

    // Clean up stale connections
    for (const connectionId of staleConnections) {
      await this.disconnectConnection(connectionId, 'heartbeat_timeout');
    }

    if (staleConnections.length > 0) {
      logger.info('Cleaned up stale connections', {
        count: staleConnections.length,
        connectionIds: staleConnections,
      });
    }
  }

  /**
   * Clean up old connection records
   */
  private async cleanupStaleConnections(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    try {
      const { error } = await this.supabase
        .from('websocket_connection_health')
        .delete()
        .lt('created_at', cutoffTime.toISOString())
        .eq('status', 'disconnected');

      if (error) {
        logger.error('Failed to cleanup old connection records', {
          error: error.message,
        });
      }

      // Cleanup Redis entries
      if (this.redis) {
        const keys = await this.redis.keys('websocket:presence:*');
        const staleKeys: string[] = [];

        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) {
            // No expiration set
            staleKeys.push(key);
          }
        }

        if (staleKeys.length > 0) {
          await this.redis.del(...staleKeys);
          logger.info('Cleaned up stale Redis presence keys', {
            count: staleKeys.length,
          });
        }
      }

      // Emit cleanup event
      this.emit('presence', {
        type: 'cleanup',
        connectionId: '',
        userId: '',
        data: { cutoffTime },
        timestamp: new Date(),
      } as PresenceEvent);
    } catch (error) {
      logger.error('Connection cleanup failed', {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  /**
   * Update connection metrics
   */
  private updateMetrics(): void {
    const connections = Array.from(this.connections.values());

    this.metrics.activeConnections = connections.filter(
      (conn) => conn.status === 'active',
    ).length;

    if (connections.length > 0) {
      this.metrics.averageLatency =
        connections.reduce((sum, conn) => sum + conn.latency, 0) /
        connections.length;

      // Quality distribution
      const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
      for (const conn of connections) {
        if (conn.connectionQuality >= 90) distribution.excellent++;
        else if (conn.connectionQuality >= 70) distribution.good++;
        else if (conn.connectionQuality >= 50) distribution.fair++;
        else distribution.poor++;
      }
      this.metrics.qualityDistribution = distribution;

      // Reconnection rate
      const reconnections = connections.reduce(
        (sum, conn) => sum + conn.reconnectAttempts,
        0,
      );
      this.metrics.reconnectionRate = reconnections / connections.length;

      // Wedding day connections
      this.metrics.weddingDayConnections = connections.filter(
        (conn) => conn.metadata.weddingContext?.isWeddingDay,
      ).length;
    }
  }

  /**
   * Update metrics based on presence events
   */
  private updateConnectionMetrics(event: PresenceEvent): void {
    // Track event-specific metrics
    // This could be expanded for detailed analytics
  }

  /**
   * Calculate connection quality score (0-100)
   */
  private calculateConnectionQuality(
    latency: number,
    connectionAge: number,
    reconnectAttempts: number,
  ): number {
    let quality = 100;

    // Latency penalty
    if (latency > 1000)
      quality -= 40; // Very slow
    else if (latency > 500)
      quality -= 20; // Slow
    else if (latency > 200)
      quality -= 10; // Fair
    else if (latency > 100) quality -= 5; // Good
    // < 100ms = excellent (no penalty)

    // Reconnection penalty
    quality -= reconnectAttempts * 15;

    // Stability bonus for long-running connections
    const hoursConnected = connectionAge / (1000 * 60 * 60);
    if (hoursConnected > 1) quality += Math.min(10, hoursConnected * 2);

    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Get connection timeout based on priority
   */
  private getConnectionTimeout(connection: ConnectionHealth): number {
    const baseTimeout = this.config.connectionTimeout;

    if (connection.metadata.weddingContext?.isWeddingDay) {
      return baseTimeout / this.config.weddingDayMultiplier; // Faster timeout on wedding days
    }

    if (connection.metadata.weddingContext?.priority === 'critical') {
      return baseTimeout / 2;
    }

    return baseTimeout;
  }

  /**
   * Check if connection is considered alive
   */
  private isConnectionAlive(connection: ConnectionHealth): boolean {
    const now = new Date();
    const timeSinceHeartbeat =
      now.getTime() - connection.lastHeartbeat.getTime();
    const timeout = this.getConnectionTimeout(connection);

    return timeSinceHeartbeat <= timeout;
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
    const ua = userAgent.toLowerCase();

    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return 'mobile';
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * Persist connection health to database
   */
  private async persistConnectionHealth(
    connection: ConnectionHealth,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('websocket_connection_health')
        .upsert(
          {
            connection_id: connection.connectionId,
            user_id: connection.userId,
            channel_id: connection.channelId,
            status: connection.status,
            last_heartbeat: connection.lastHeartbeat.toISOString(),
            connection_quality: connection.connectionQuality,
            latency_ms: connection.latency,
            reconnect_attempts: connection.reconnectAttempts,
            connected_at: connection.connectedAt.toISOString(),
            metadata: connection.metadata,
          },
          {
            onConflict: 'connection_id',
          },
        );

      if (error) {
        logger.error('Failed to persist connection health', {
          error: error.message,
          connectionId: connection.connectionId,
        });
      }
    } catch (error) {
      logger.error('Database error persisting connection health', {
        error: error instanceof Error ? error.message : error,
        connectionId: connection.connectionId,
      });
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('PresenceManager shutting down...');

    // Clear intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    // Disconnect all connections
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      await this.disconnectConnection(connectionId, 'server_shutdown');
    }

    // Close Redis connection
    if (this.redis) {
      this.redis.disconnect();
    }

    logger.info('PresenceManager shutdown complete');
  }
}

// Default instance for simple usage
export const defaultPresenceManager = new PresenceManager({
  supabaseClient: createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ),
});
