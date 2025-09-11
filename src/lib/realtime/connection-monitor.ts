import { SupabaseClient } from '@supabase/supabase-js';
import { ConnectionStats, RealtimeError } from '../../types/realtime';

/**
 * RealtimeConnectionMonitor - Scalable connection monitoring for WedSync
 *
 * Handles the wedding industry requirement of 200+ concurrent connections
 * during peak wedding season with automatic cleanup and health monitoring.
 *
 * Key Features:
 * - Periodic cleanup of inactive connections (every 5 minutes)
 * - Connection statistics for monitoring dashboards
 * - Heartbeat/ping system for active connection tracking
 * - Wedding day safety protocols (zero tolerance for connection issues)
 * - Resource leak prevention during high-traffic periods
 */
export class RealtimeConnectionMonitor {
  private supabase: SupabaseClient;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  // Configuration for wedding industry requirements
  private cleanupIntervalMs: number = 5 * 60 * 1000; // 5 minutes
  private connectionTimeoutMs: number = 5 * 60 * 1000; // 5 minutes before marking inactive
  private enableLogging: boolean = true;
  private onStatsUpdate?: (stats: ConnectionStats) => void;
  private onConnectionAlert?: (alert: ConnectionAlert) => void;

  constructor(
    supabaseClient: SupabaseClient,
    config?: {
      cleanupIntervalMs?: number;
      connectionTimeoutMs?: number;
      enableLogging?: boolean;
      onStatsUpdate?: (stats: ConnectionStats) => void;
      onConnectionAlert?: (alert: ConnectionAlert) => void;
    },
  ) {
    this.supabase = supabaseClient;

    if (config) {
      this.cleanupIntervalMs =
        config.cleanupIntervalMs ?? this.cleanupIntervalMs;
      this.connectionTimeoutMs =
        config.connectionTimeoutMs ?? this.connectionTimeoutMs;
      this.enableLogging = config.enableLogging ?? this.enableLogging;
      this.onStatsUpdate = config.onStatsUpdate;
      this.onConnectionAlert = config.onConnectionAlert;
    }
  }

  /**
   * Start monitoring realtime connections
   * Critical for wedding day operations - must be running
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Connection monitor already running');
      return;
    }

    this.isMonitoring = true;

    if (this.enableLogging) {
      console.log('🔗 Starting realtime connection monitoring', {
        cleanupInterval: this.cleanupIntervalMs,
        connectionTimeout: this.connectionTimeoutMs,
      });
    }

    // Start periodic cleanup of inactive connections
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch((error) => {
        console.error('❌ Connection cleanup failed:', error);
        this.handleCleanupError(error);
      });
    }, this.cleanupIntervalMs);

    // Start periodic stats collection (every 30 seconds)
    this.statsInterval = setInterval(() => {
      this.updateConnectionStats().catch((error) => {
        console.error('❌ Stats update failed:', error);
      });
    }, 30000);

    // Initial cleanup and stats
    this.performCleanup().catch(console.error);
    this.updateConnectionStats().catch(console.error);
  }

  /**
   * Stop monitoring - use with caution during wedding operations
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    if (this.enableLogging) {
      console.log('🔗 Connection monitoring stopped');
    }
  }

  /**
   * Update subscription ping timestamp - call this from active connections
   */
  async updateSubscriptionPing(
    userId: string,
    channelName: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('realtime_subscriptions')
        .update({ last_ping_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('channel_name', channelName)
        .eq('active', true);

      if (error) {
        throw new RealtimeError(
          'Failed to update subscription ping',
          'CONNECTION_FAILED',
          { userId, channelName, error },
        );
      }
    } catch (error) {
      console.error('Ping update failed:', error);
      // Don't throw - ping failures shouldn't break connections
    }
  }

  /**
   * Force cleanup of inactive connections (emergency use)
   */
  async forceCleanup(): Promise<number> {
    return this.performCleanup();
  }

  /**
   * Get real-time connection statistics
   */
  async getConnectionStats(): Promise<ConnectionStats> {
    try {
      // Get active connections count
      const { count: activeCount } = await this.supabase
        .from('realtime_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      // Get today's message count
      const { count: todayMessages } = await this.supabase
        .from('realtime_activity_logs')
        .select('*', { count: 'exact', head: true })
        .gte(
          'timestamp',
          new Date().toISOString().split('T')[0] + 'T00:00:00Z',
        );

      const stats: ConnectionStats = {
        activeConnections: activeCount || 0,
        todayMessages: todayMessages || 0,
        avgMessagesPerConnection:
          activeCount && activeCount > 0
            ? Math.round((todayMessages || 0) / activeCount)
            : 0,
      };

      return stats;
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return {
        activeConnections: 0,
        todayMessages: 0,
        avgMessagesPerConnection: 0,
      };
    }
  }

  /**
   * Get detailed connection health report
   */
  async getHealthReport(): Promise<ConnectionHealthReport> {
    try {
      const stats = await this.getConnectionStats();

      // Get connection distribution by channel
      const { data: channelDistribution } = await this.supabase
        .from('realtime_subscriptions')
        .select('channel_name')
        .eq('active', true);

      const channelCounts =
        channelDistribution?.reduce(
          (acc, sub) => {
            acc[sub.channel_name] = (acc[sub.channel_name] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      // Get stale connections (no ping in last 10 minutes)
      const staleThreshold = new Date(
        Date.now() - 10 * 60 * 1000,
      ).toISOString();
      const { count: staleConnections } = await this.supabase
        .from('realtime_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .lt('last_ping_at', staleThreshold);

      // Check for connection alerts
      const alerts: ConnectionAlert[] = [];

      if (stats.activeConnections > 150) {
        // 75% of 200 capacity
        alerts.push({
          type: 'high_connection_count',
          severity: 'warning',
          message: `High connection count: ${stats.activeConnections}/200`,
          timestamp: new Date(),
          data: { activeConnections: stats.activeConnections },
        });
      }

      if ((staleConnections || 0) > 10) {
        alerts.push({
          type: 'stale_connections',
          severity: 'warning',
          message: `${staleConnections} stale connections detected`,
          timestamp: new Date(),
          data: { staleCount: staleConnections },
        });
      }

      return {
        timestamp: new Date(),
        stats,
        channelDistribution: channelCounts,
        staleConnections: staleConnections || 0,
        alerts,
        isHealthy: alerts.length === 0 && stats.activeConnections < 180,
      };
    } catch (error) {
      console.error('Health report generation failed:', error);
      return {
        timestamp: new Date(),
        stats: {
          activeConnections: 0,
          todayMessages: 0,
          avgMessagesPerConnection: 0,
        },
        channelDistribution: {},
        staleConnections: 0,
        alerts: [
          {
            type: 'system_error',
            severity: 'error',
            message: 'Failed to generate health report',
            timestamp: new Date(),
            data: { error: error instanceof Error ? error.message : error },
          },
        ],
        isHealthy: false,
      };
    }
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  private async performCleanup(): Promise<number> {
    try {
      if (this.enableLogging) {
        console.log('🧹 Performing connection cleanup...');
      }

      // Use the database cleanup function
      const { data: cleanupCount, error } = await this.supabase.rpc(
        'cleanup_inactive_subscriptions',
      );

      if (error) {
        throw new RealtimeError(
          'Database cleanup function failed',
          'CLEANUP_FAILED',
          { error },
        );
      }

      const count = (cleanupCount as number) || 0;

      if (this.enableLogging && count > 0) {
        console.log(`✅ Cleaned up ${count} inactive subscriptions`);
      }

      return count;
    } catch (error) {
      console.error('Cleanup operation failed:', error);
      throw error;
    }
  }

  private async updateConnectionStats(): Promise<void> {
    try {
      const stats = await this.getConnectionStats();

      if (this.onStatsUpdate) {
        this.onStatsUpdate(stats);
      }

      // Check for alerts
      if (stats.activeConnections > 180) {
        // 90% of capacity
        const alert: ConnectionAlert = {
          type: 'capacity_warning',
          severity: 'error',
          message: `Near capacity: ${stats.activeConnections}/200 connections`,
          timestamp: new Date(),
          data: stats,
        };

        if (this.onConnectionAlert) {
          this.onConnectionAlert(alert);
        }
      }
    } catch (error) {
      console.error('Stats update failed:', error);
    }
  }

  private handleCleanupError(error: any): void {
    const alert: ConnectionAlert = {
      type: 'cleanup_failed',
      severity: 'error',
      message: 'Connection cleanup failed',
      timestamp: new Date(),
      data: { error: error instanceof Error ? error.message : error },
    };

    if (this.onConnectionAlert) {
      this.onConnectionAlert(alert);
    }

    // For wedding industry - this is critical
    console.error(
      '🚨 CRITICAL: Connection cleanup failed during wedding operations',
      error,
    );
  }
}

// ===========================
// TYPE DEFINITIONS
// ===========================

export interface ConnectionAlert {
  type:
    | 'high_connection_count'
    | 'stale_connections'
    | 'capacity_warning'
    | 'cleanup_failed'
    | 'system_error';
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  data?: any;
}

export interface ConnectionHealthReport {
  timestamp: Date;
  stats: ConnectionStats;
  channelDistribution: Record<string, number>;
  staleConnections: number;
  alerts: ConnectionAlert[];
  isHealthy: boolean;
}

/**
 * Wedding Day Safety Monitor - Extra protection for critical wedding operations
 */
export class WeddingDaySafetyMonitor extends RealtimeConnectionMonitor {
  private weddingMode: boolean = false;
  private criticalAlerts: ConnectionAlert[] = [];

  /**
   * Enable wedding day mode - maximum safety protocols
   */
  enableWeddingDayMode(): void {
    this.weddingMode = true;
    console.log(
      '🚨 WEDDING DAY MODE ACTIVATED - Maximum safety protocols enabled',
    );

    // Reduce cleanup interval to 2 minutes for wedding day
    this.stopMonitoring();
    // @ts-ignore - Access private property for emergency override
    this.cleanupIntervalMs = 2 * 60 * 1000;
    this.startMonitoring();
  }

  /**
   * Disable wedding day mode
   */
  disableWeddingDayMode(): void {
    this.weddingMode = false;
    console.log('✅ Wedding day mode deactivated');

    // Restore normal cleanup interval
    this.stopMonitoring();
    // @ts-ignore - Access private property for reset
    this.cleanupIntervalMs = 5 * 60 * 1000;
    this.startMonitoring();
  }

  /**
   * Get critical alerts for wedding operations
   */
  getCriticalAlerts(): ConnectionAlert[] {
    return this.criticalAlerts.filter(
      (alert) =>
        alert.severity === 'error' &&
        Date.now() - alert.timestamp.getTime() < 10 * 60 * 1000, // Last 10 minutes
    );
  }
}
