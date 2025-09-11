/**
 * WS-101 Dedicated Alert API Endpoints
 * RESTful API for alert management, creation, and monitoring
 * Separate from the general monitoring API for enhanced alert-specific features
 */

import { NextRequest, NextResponse } from 'next/server';
import { AlertManager } from '@/lib/monitoring/alerts';
import { MultiChannelOrchestrator } from '@/lib/alerts/channels/MultiChannelOrchestrator';
import { AlertType, AlertSeverity, Alert } from '@/lib/monitoring/alerts';
import { z } from 'zod';

// Alert creation schema
const CreateAlertSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.nativeEnum(AlertType),
  severity: z.nativeEnum(AlertSeverity),
  source: z.string().min(1).max(100),
  metadata: z.record(z.any()).optional(),
  weddingContext: z
    .object({
      id: z.string(),
      coupleName: z.string(),
      weddingDate: z.string(),
      venue: z.string().optional(),
      isWeddingDay: z.boolean().optional(),
    })
    .optional(),
});

// Initialize instances
const alertManager = new AlertManager();
const orchestrator = new MultiChannelOrchestrator();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'list';

    switch (endpoint) {
      case 'list':
        return await handleListAlerts(searchParams);
      case 'stats':
        return await handleAlertStats(searchParams);
      case 'channels':
        return await handleChannelStatus();
      case 'health':
        return await handleHealthCheck();
      default:
        return NextResponse.json(
          {
            error: 'Invalid endpoint',
            availableEndpoints: ['list', 'stats', 'channels', 'health'],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Alert API GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'create';

    switch (action) {
      case 'create':
        return await handleCreateAlert(request);
      case 'test':
        return await handleTestAlert(request);
      case 'bulk':
        return await handleBulkAlerts(request);
      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['create', 'test', 'bulk'],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Alert API POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!alertId) {
      return NextResponse.json(
        {
          error: 'Alert ID is required',
        },
        { status: 400 },
      );
    }

    switch (action) {
      case 'acknowledge':
        return await handleAcknowledgeAlert(request, alertId);
      case 'resolve':
        return await handleResolveAlert(request, alertId);
      case 'escalate':
        return await handleEscalateAlert(request, alertId);
      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            availableActions: ['acknowledge', 'resolve', 'escalate'],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Alert API PUT error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

// List alerts with filtering and pagination
async function handleListAlerts(
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const severity = searchParams.get('severity') as AlertSeverity;
  const type = searchParams.get('type') as AlertType;
  const status = searchParams.get('status'); // 'active', 'resolved', 'acknowledged'
  const weddingId = searchParams.get('weddingId');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  try {
    // Get alerts from alert manager (this would need to be implemented)
    const alerts = await getAlertsFromManager({
      page,
      limit,
      severity,
      type,
      status,
      weddingId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });

    return NextResponse.json({
      alerts: alerts.data,
      pagination: {
        page,
        limit,
        total: alerts.total,
        totalPages: Math.ceil(alerts.total / limit),
      },
      filters: {
        severity,
        type,
        status,
        weddingId,
        fromDate,
        toDate,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    throw error;
  }
}

// Get alert statistics and metrics
async function handleAlertStats(
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  const period = searchParams.get('period') || '24h'; // 1h, 24h, 7d, 30d
  const weddingId = searchParams.get('weddingId');

  try {
    const stats = await getAlertStatistics(period, weddingId);

    return NextResponse.json({
      period,
      weddingId,
      stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    throw error;
  }
}

// Get channel status and performance metrics
async function handleChannelStatus(): Promise<NextResponse> {
  try {
    const channelStatus = orchestrator.getChannelStatus();
    const channelMetrics: Record<string, any> = {};

    for (const [channelId, config] of channelStatus) {
      const metrics = orchestrator.getDeliveryMetrics(channelId);
      const recentMetrics = metrics.slice(-100); // Last 100 deliveries

      channelMetrics[channelId] = {
        config: {
          name: config.name,
          type: config.type,
          enabled: config.enabled,
          healthStatus: config.healthStatus,
          priority: config.priority,
        },
        metrics: {
          totalDeliveries: recentMetrics.length,
          successRate:
            recentMetrics.length > 0
              ? recentMetrics.filter((m) => m.success).length /
                recentMetrics.length
              : 0,
          averageLatency:
            recentMetrics.length > 0
              ? recentMetrics.reduce((sum, m) => sum + m.latency, 0) /
                recentMetrics.length
              : 0,
          fallbackUsage: recentMetrics.filter((m) => m.fallbackUsed).length,
        },
      };
    }

    return NextResponse.json({
      channels: channelMetrics,
      summary: {
        totalChannels: channelStatus.size,
        healthyChannels: Array.from(channelStatus.values()).filter(
          (c) => c.healthStatus === 'healthy',
        ).length,
        enabledChannels: Array.from(channelStatus.values()).filter(
          (c) => c.enabled,
        ).length,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    throw error;
  }
}

// Health check for alert system
async function handleHealthCheck(): Promise<NextResponse> {
  try {
    const healthReport = alertManager.getSystemHealthReport();
    const channelStatus = orchestrator.getChannelStatus();

    const overallHealth = {
      status: healthReport.status,
      uptime: healthReport.uptime,
      components: {
        alertManager: healthReport.status === 'healthy',
        multiChannelOrchestrator: true, // Would implement health check
        channels: Array.from(channelStatus.values()).filter(
          (c) => c.enabled && c.healthStatus === 'healthy',
        ).length,
      },
      issues: healthReport.recommendations,
      timestamp: Date.now(),
    };

    const statusCode =
      overallHealth.status === 'healthy'
        ? 200
        : overallHealth.status === 'degraded'
          ? 200
          : 503;

    return NextResponse.json(overallHealth, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'critical',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 503 },
    );
  }
}

// Create a new alert
async function handleCreateAlert(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = CreateAlertSchema.parse(body);

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: validatedData.title,
      message: validatedData.message,
      type: validatedData.type,
      severity: validatedData.severity,
      source: validatedData.source,
      timestamp: new Date(),
      resolved: false,
      metadata: validatedData.metadata,
    };

    // Send through multi-channel orchestrator
    const results = await orchestrator.sendAlert(
      alert,
      validatedData.weddingContext,
    );

    const successfulDeliveries = results.filter((r) => r.success);
    const failedDeliveries = results.filter((r) => !r.success);

    return NextResponse.json(
      {
        alertId: alert.id,
        created: true,
        delivery: {
          attempted: results.length,
          successful: successfulDeliveries.length,
          failed: failedDeliveries.length,
          results: results.map((r) => ({
            channelId: r.channelId,
            success: r.success,
            latency: r.latency,
            fallbackUsed: r.fallbackUsed,
            error: r.error,
          })),
        },
        timestamp: Date.now(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      );
    }
    throw error;
  }
}

// Test alert delivery system
async function handleTestAlert(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { channelIds, alertType = 'test' } = body;

    const testAlert: Alert = {
      id: `test_alert_${Date.now()}`,
      title: 'Test Alert - Please Ignore',
      message: 'This is a test alert to verify channel delivery functionality.',
      type: AlertType.SYSTEM,
      severity: AlertSeverity.LOW,
      source: 'alert-api-test',
      timestamp: new Date(),
      resolved: false,
      metadata: {
        test: true,
        requestedChannels: channelIds,
      },
    };

    // If specific channels requested, test those only
    if (channelIds && Array.isArray(channelIds)) {
      // Would implement channel-specific testing
      return NextResponse.json(
        {
          message: 'Channel-specific testing not implemented yet',
          requestedChannels: channelIds,
        },
        { status: 501 },
      );
    }

    // Test all channels
    const results = await orchestrator.sendAlert(testAlert);

    return NextResponse.json({
      testCompleted: true,
      results: results.map((r) => ({
        channelId: r.channelId,
        success: r.success,
        latency: r.latency,
        error: r.error,
      })),
      summary: {
        totalChannels: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    throw error;
  }
}

// Handle bulk alert operations
async function handleBulkAlerts(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { alerts, operation = 'create' } = body;

    if (!Array.isArray(alerts) || alerts.length === 0) {
      return NextResponse.json(
        {
          error: 'Alerts array is required and cannot be empty',
        },
        { status: 400 },
      );
    }

    if (alerts.length > 100) {
      return NextResponse.json(
        {
          error: 'Maximum 100 alerts allowed per bulk operation',
        },
        { status: 400 },
      );
    }

    const results = [];

    for (const alertData of alerts) {
      try {
        const validatedData = CreateAlertSchema.parse(alertData);

        const alert: Alert = {
          id: `bulk_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: validatedData.title,
          message: validatedData.message,
          type: validatedData.type,
          severity: validatedData.severity,
          source: validatedData.source,
          timestamp: new Date(),
          resolved: false,
          metadata: { ...validatedData.metadata, bulk: true },
        };

        const deliveryResults = await orchestrator.sendAlert(
          alert,
          validatedData.weddingContext,
        );

        results.push({
          alertId: alert.id,
          success: true,
          deliveryResults: deliveryResults.length,
        });
      } catch (error) {
        results.push({
          alertData,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      bulkOperation: 'completed',
      summary: {
        total: alerts.length,
        successful,
        failed,
        successRate: successful / alerts.length,
      },
      results,
      timestamp: Date.now(),
    });
  } catch (error) {
    throw error;
  }
}

// Acknowledge an alert
async function handleAcknowledgeAlert(
  request: NextRequest,
  alertId: string,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, notes } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required for acknowledgment',
        },
        { status: 400 },
      );
    }

    // This would integrate with the alert manager's acknowledgment system
    const success = await acknowledgeAlertById(alertId, userId, notes);

    if (success) {
      return NextResponse.json({
        alertId,
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date().toISOString(),
        notes,
        timestamp: Date.now(),
      });
    } else {
      return NextResponse.json(
        {
          error: 'Alert not found or already acknowledged',
        },
        { status: 404 },
      );
    }
  } catch (error) {
    throw error;
  }
}

// Resolve an alert
async function handleResolveAlert(
  request: NextRequest,
  alertId: string,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, resolution, notes } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required for resolution',
        },
        { status: 400 },
      );
    }

    const success = await resolveAlertById(alertId, userId, resolution, notes);

    if (success) {
      return NextResponse.json({
        alertId,
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date().toISOString(),
        resolution,
        notes,
        timestamp: Date.now(),
      });
    } else {
      return NextResponse.json(
        {
          error: 'Alert not found or already resolved',
        },
        { status: 404 },
      );
    }
  } catch (error) {
    throw error;
  }
}

// Escalate an alert
async function handleEscalateAlert(
  request: NextRequest,
  alertId: string,
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, level = 1, reason } = body;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required for escalation',
        },
        { status: 400 },
      );
    }

    if (level < 1 || level > 5) {
      return NextResponse.json(
        {
          error: 'Escalation level must be between 1 and 5',
        },
        { status: 400 },
      );
    }

    const success = await escalateAlertById(alertId, userId, level, reason);

    if (success) {
      return NextResponse.json({
        alertId,
        escalated: true,
        escalatedBy: userId,
        escalatedAt: new Date().toISOString(),
        level,
        reason,
        timestamp: Date.now(),
      });
    } else {
      return NextResponse.json(
        {
          error: 'Alert not found or escalation failed',
        },
        { status: 404 },
      );
    }
  } catch (error) {
    throw error;
  }
}

// Helper functions (these would integrate with actual alert storage/management)
async function getAlertsFromManager(
  filters: any,
): Promise<{ data: Alert[]; total: number }> {
  // This would integrate with actual alert storage
  return {
    data: [],
    total: 0,
  };
}

async function getAlertStatistics(
  period: string,
  weddingId?: string,
): Promise<any> {
  // This would calculate actual statistics
  return {
    totalAlerts: 0,
    byType: {},
    bySeverity: {},
    avgResponseTime: 0,
    successRate: 1,
  };
}

async function acknowledgeAlertById(
  alertId: string,
  userId: string,
  notes?: string,
): Promise<boolean> {
  // This would integrate with alert manager
  return true;
}

async function resolveAlertById(
  alertId: string,
  userId: string,
  resolution?: string,
  notes?: string,
): Promise<boolean> {
  // This would integrate with alert manager
  return true;
}

async function escalateAlertById(
  alertId: string,
  userId: string,
  level: number,
  reason?: string,
): Promise<boolean> {
  // This would integrate with alert manager
  return true;
}
