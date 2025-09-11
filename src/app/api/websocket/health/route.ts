/**
 * WebSocket Health Monitoring API - WS-203 Team B Implementation
 *
 * Provides real-time connection health status, metrics, and system diagnostics.
 * Critical for wedding day monitoring and proactive issue resolution.
 *
 * Wedding Industry Features:
 * - Wedding day priority monitoring with enhanced alerting
 * - Connection quality analytics for venue WiFi optimization
 * - Real-time presence tracking for supplier coordination
 * - Performance metrics for wedding season traffic analysis
 * - Health checks for critical wedding day connections
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { createClient } from '@/lib/supabase/server';
import { defaultPresenceManager } from '@/lib/websocket/presence-manager';
import { rateLimitService } from '@/lib/rate-limit';
import { logger } from '@/lib/monitoring/logger';

// ================================================
// VALIDATION SCHEMA
// ================================================

const healthCheckSchema = z.object({
  connectionId: z.string().optional(),
  userId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  includeMetrics: z.boolean().optional().default(true),
  includeConnections: z.boolean().optional().default(false),
  qualityThreshold: z.number().min(0).max(100).optional().default(50),
  weddingDayOnly: z.boolean().optional().default(false),
});

type HealthCheckRequest = z.infer<typeof healthCheckSchema>;

// ================================================
// HEALTH CHECK HANDLER
// ================================================

export const GET = withSecureValidation(
  healthCheckSchema,
  async (request: NextRequest, validatedData: HealthCheckRequest) => {
    const startTime = Date.now();

    try {
      // Get authenticated user
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        logger.warn('Unauthorized health check attempt', {
          ip: request.ip,
          userAgent: request.headers.get('user-agent'),
        });

        return Response.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required to access health metrics',
            code: 'AUTH_REQUIRED',
          },
          { status: 401 },
        );
      }

      // Rate limiting for health checks
      const rateLimitKey = `websocket:health:${user.id}`;
      const allowed = await rateLimitService.checkLimit(rateLimitKey, 60, 3600); // 60 per hour

      if (!allowed) {
        return Response.json(
          {
            error: 'RATE_LIMITED',
            message: 'Health check rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 3600,
          },
          { status: 429 },
        );
      }

      // Get user profile for permission validation
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        return Response.json(
          {
            error: 'PROFILE_ERROR',
            message: 'Unable to validate user permissions',
            code: 'PROFILE_FETCH_FAILED',
          },
          { status: 400 },
        );
      }

      // Get system health metrics
      const systemMetrics = defaultPresenceManager.getMetrics();

      // Get specific connection health if requested
      let connectionHealth = null;
      if (validatedData.connectionId) {
        connectionHealth = defaultPresenceManager.getConnectionHealth(
          validatedData.connectionId,
        );

        if (!connectionHealth) {
          return Response.json(
            {
              error: 'CONNECTION_NOT_FOUND',
              message: 'Specified connection not found',
              code: 'CONNECTION_NOT_FOUND',
            },
            { status: 404 },
          );
        }

        // Verify user has access to this connection
        if (
          connectionHealth.userId !== user.id &&
          userProfile.role !== 'admin'
        ) {
          return Response.json(
            {
              error: 'FORBIDDEN',
              message: 'Access denied to connection health data',
              code: 'PERMISSION_DENIED',
            },
            { status: 403 },
          );
        }
      }

      // Get user connections if requested
      let userConnections = [];
      if (validatedData.includeConnections) {
        const targetUserId = validatedData.userId || user.id;

        // Admin can view any user's connections
        if (targetUserId !== user.id && userProfile.role !== 'admin') {
          return Response.json(
            {
              error: 'FORBIDDEN',
              message: 'Access denied to user connection data',
              code: 'PERMISSION_DENIED',
            },
            { status: 403 },
          );
        }

        userConnections =
          defaultPresenceManager.getUserConnections(targetUserId);

        // Filter by quality threshold if specified
        if (validatedData.qualityThreshold > 0) {
          userConnections = userConnections.filter(
            (conn) => conn.connectionQuality >= validatedData.qualityThreshold,
          );
        }

        // Filter by wedding day connections if requested
        if (validatedData.weddingDayOnly) {
          userConnections = userConnections.filter(
            (conn) => conn.metadata.weddingContext?.isWeddingDay,
          );
        }
      }

      // Get channel connections if requested
      let channelConnections = [];
      if (validatedData.channelId) {
        channelConnections = defaultPresenceManager.getChannelConnections(
          validatedData.channelId,
        );

        // Verify user has access to this channel
        const { data: hasChannelAccess, error: channelPermissionError } =
          await supabase.rpc('validate_websocket_channel_permission', {
            user_uuid: user.id,
            channel_id_param: validatedData.channelId,
            operation_type: 'health_check',
          });

        if (channelPermissionError || !hasChannelAccess) {
          return Response.json(
            {
              error: 'FORBIDDEN',
              message: 'Access denied to channel health data',
              code: 'CHANNEL_PERMISSION_DENIED',
            },
            { status: 403 },
          );
        }
      }

      // Check system health status
      const healthStatus = calculateSystemHealthStatus(systemMetrics);

      // Get database connection health
      const dbHealthStart = Date.now();
      const { data: dbTest, error: dbError } = await supabase
        .from('websocket_channels')
        .select('count(*)')
        .limit(1);
      const dbLatency = Date.now() - dbHealthStart;

      const dbHealth = {
        status: dbError ? 'unhealthy' : 'healthy',
        latency: dbLatency,
        error: dbError?.message,
      };

      // Check recent connection issues
      const { data: recentIssues } = await supabase
        .from('websocket_connection_health')
        .select('*')
        .eq('status', 'disconnected')
        .gte('disconnected_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .order('disconnected_at', { ascending: false })
        .limit(10);

      const latency = Date.now() - startTime;

      // Log health check access
      logger.info('WebSocket health check accessed', {
        userId: user.id,
        role: userProfile.role,
        connectionId: validatedData.connectionId,
        includeMetrics: validatedData.includeMetrics,
        includeConnections: validatedData.includeConnections,
        systemStatus: healthStatus.status,
        latency: `${latency}ms`,
      });

      // Return comprehensive health data
      return Response.json(
        {
          success: true,
          timestamp: new Date().toISOString(),
          system: {
            status: healthStatus.status,
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV,
          },
          database: dbHealth,
          websocket: {
            ...systemMetrics,
            healthScore: healthStatus.score,
            alerts: healthStatus.alerts,
            performance: {
              averageLatency: systemMetrics.averageLatency,
              targetLatency: 500, // 500ms target
              status: systemMetrics.averageLatency < 500 ? 'good' : 'degraded',
            },
          },
          connection: connectionHealth
            ? {
                id: connectionHealth.connectionId,
                userId: connectionHealth.userId,
                channelId: connectionHealth.channelId,
                status: connectionHealth.status,
                quality: connectionHealth.connectionQuality,
                latency: connectionHealth.latency,
                uptime:
                  new Date().getTime() - connectionHealth.connectedAt.getTime(),
                reconnectAttempts: connectionHealth.reconnectAttempts,
                deviceType: connectionHealth.metadata.deviceType,
                isWeddingDay:
                  connectionHealth.metadata.weddingContext?.isWeddingDay ||
                  false,
                priority:
                  connectionHealth.metadata.weddingContext?.priority ||
                  'medium',
              }
            : null,
          userConnections: validatedData.includeConnections
            ? userConnections.map((conn) => ({
                id: conn.connectionId,
                channelId: conn.channelId,
                status: conn.status,
                quality: conn.connectionQuality,
                latency: conn.latency,
                uptime: new Date().getTime() - conn.connectedAt.getTime(),
                deviceType: conn.metadata.deviceType,
                isWeddingDay:
                  conn.metadata.weddingContext?.isWeddingDay || false,
              }))
            : undefined,
          channelConnections: validatedData.channelId
            ? channelConnections.map((conn) => ({
                connectionId: conn.connectionId,
                userId: conn.userId,
                status: conn.status,
                quality: conn.connectionQuality,
                latency: conn.latency,
                deviceType: conn.metadata.deviceType,
              }))
            : undefined,
          recentIssues:
            recentIssues?.map((issue) => ({
              connectionId: issue.connection_id,
              userId: issue.user_id,
              disconnectedAt: issue.disconnected_at,
              reason: issue.disconnect_reason,
              sessionDuration:
                issue.disconnected_at && issue.connected_at
                  ? new Date(issue.disconnected_at).getTime() -
                    new Date(issue.connected_at).getTime()
                  : null,
            })) || [],
          performance: {
            healthCheckLatency: `${latency}ms`,
            target: '<100ms',
            status:
              latency < 100
                ? 'excellent'
                : latency < 250
                  ? 'good'
                  : 'needs_optimization',
          },
        },
        {
          status: 200,
          headers: {
            'X-Health-Status': healthStatus.status,
            'X-Health-Score': healthStatus.score.toString(),
            'X-Performance-Latency': `${latency}ms`,
            'X-Active-Connections': systemMetrics.activeConnections.toString(),
          },
        },
      );
    } catch (error) {
      const latency = Date.now() - startTime;

      logger.error('WebSocket health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        latency: `${latency}ms`,
        requestData: validatedData,
      });

      return Response.json(
        {
          success: false,
          error: 'HEALTH_CHECK_FAILED',
          message: 'Failed to retrieve health status',
          code: 'HEALTH_CHECK_ERROR',
          timestamp: new Date().toISOString(),
          system: {
            status: 'unhealthy',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
          },
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        { status: 500 },
      );
    }
  },
);

// ================================================
// HEARTBEAT ENDPOINT (POST)
// ================================================

const heartbeatSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  latency: z.number().min(0).optional(),
  additionalData: z.record(z.any()).optional(),
});

type HeartbeatRequest = z.infer<typeof heartbeatSchema>;

export const POST = withSecureValidation(
  heartbeatSchema,
  async (request: NextRequest, validatedData: HeartbeatRequest) => {
    const startTime = Date.now();

    try {
      // Get authenticated user
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return Response.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required for heartbeat',
            code: 'AUTH_REQUIRED',
          },
          { status: 401 },
        );
      }

      // Rate limiting for heartbeat (generous limits)
      const rateLimitKey = `websocket:heartbeat:${user.id}`;
      const allowed = await rateLimitService.checkLimit(rateLimitKey, 120, 60); // 120 per minute

      if (!allowed) {
        return Response.json(
          {
            error: 'RATE_LIMITED',
            message: 'Heartbeat rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          { status: 429 },
        );
      }

      // Verify connection belongs to user
      const connection = defaultPresenceManager.getConnectionHealth(
        validatedData.connectionId,
      );
      if (!connection) {
        return Response.json(
          {
            error: 'CONNECTION_NOT_FOUND',
            message: 'Connection not found',
            code: 'CONNECTION_NOT_FOUND',
          },
          { status: 404 },
        );
      }

      if (connection.userId !== user.id) {
        return Response.json(
          {
            error: 'FORBIDDEN',
            message: 'Access denied to connection',
            code: 'PERMISSION_DENIED',
          },
          { status: 403 },
        );
      }

      // Process heartbeat
      await defaultPresenceManager.processHeartbeat(
        validatedData.connectionId,
        validatedData.latency,
        validatedData.additionalData,
      );

      const latency = Date.now() - startTime;

      // Return heartbeat acknowledgment
      return Response.json(
        {
          success: true,
          timestamp: new Date().toISOString(),
          connectionId: validatedData.connectionId,
          status: connection.status,
          quality: connection.connectionQuality,
          latency: connection.latency,
          serverLatency: latency,
          nextHeartbeatIn: 30000, // 30 seconds
        },
        {
          status: 200,
          headers: {
            'X-Connection-Quality': connection.connectionQuality.toString(),
            'X-Server-Latency': `${latency}ms`,
          },
        },
      );
    } catch (error) {
      const latency = Date.now() - startTime;

      logger.error('Heartbeat processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId: validatedData.connectionId,
        latency: `${latency}ms`,
      });

      return Response.json(
        {
          error: 'HEARTBEAT_FAILED',
          message: 'Failed to process heartbeat',
          code: 'HEARTBEAT_ERROR',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Calculate overall system health status
 */
function calculateSystemHealthStatus(metrics: any): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  alerts: string[];
} {
  let score = 100;
  const alerts: string[] = [];

  // Connection health scoring
  if (metrics.activeConnections === 0) {
    score -= 20;
    alerts.push('No active connections');
  }

  // Latency scoring
  if (metrics.averageLatency > 1000) {
    score -= 30;
    alerts.push('High average latency (>1000ms)');
  } else if (metrics.averageLatency > 500) {
    score -= 15;
    alerts.push('Elevated average latency (>500ms)');
  }

  // Quality distribution scoring
  const { excellent, good, fair, poor } = metrics.qualityDistribution;
  const total = excellent + good + fair + poor;

  if (total > 0) {
    const poorPercentage = (poor / total) * 100;
    if (poorPercentage > 25) {
      score -= 25;
      alerts.push('High percentage of poor quality connections');
    } else if (poorPercentage > 10) {
      score -= 10;
      alerts.push('Elevated poor quality connections');
    }
  }

  // Reconnection rate scoring
  if (metrics.reconnectionRate > 0.5) {
    score -= 20;
    alerts.push('High reconnection rate');
  } else if (metrics.reconnectionRate > 0.2) {
    score -= 10;
    alerts.push('Elevated reconnection rate');
  }

  // Wedding day connection monitoring
  if (metrics.weddingDayConnections > 0) {
    alerts.push(
      `${metrics.weddingDayConnections} wedding day connections active`,
    );
  }

  // Determine status
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (score >= 80) {
    status = 'healthy';
  } else if (score >= 60) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return { status, score, alerts };
}
