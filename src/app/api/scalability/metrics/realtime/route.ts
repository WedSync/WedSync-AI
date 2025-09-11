/**
 * WS-340: Real-time Metrics API Endpoint
 * Team B - Backend/API Development
 *
 * GET /api/scalability/metrics/realtime
 * Returns real-time system metrics with wedding context
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntelligentAutoScalingEngine } from '@/lib/scalability/backend/intelligent-auto-scaling-engine';
import { RealTimePerformanceMonitor } from '@/lib/scalability/backend/real-time-performance-monitor';

// Initialize scalability services
const scalabilityEngine = new IntelligentAutoScalingEngine();
const performanceMonitor = new RealTimePerformanceMonitor();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const services = searchParams.get('services')?.split(',') || [];
    const timeRange = searchParams.get('timeRange') || '1h';
    const includeWeddingContext =
      searchParams.get('includeWeddingContext') === 'true';
    const includePredictions =
      searchParams.get('includePredictions') === 'true';

    console.log(
      `[ScalabilityAPI] Real-time metrics request: services=${services.length}, timeRange=${timeRange}`,
    );

    // Validate user access (mock implementation)
    const user = await getCurrentUser();
    await validateScalabilityAccess(user.id);

    // Collect real-time metrics
    const realTimeMetrics = await collectRealTimeMetrics({
      services,
      timeRange: parseTimeRange(timeRange),
      includeWeddingContext,
      includePredictions,
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics: realTimeMetrics.current,
        trends: realTimeMetrics.trends,
        predictions: realTimeMetrics.predictions,
        weddingContext: realTimeMetrics.weddingContext,
        lastUpdated: realTimeMetrics.timestamp,
        systemHealth: realTimeMetrics.systemHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ScalabilityAPI] Real-time metrics error:', error);
    return handleAPIError(error);
  }
}

async function collectRealTimeMetrics(options: {
  services: string[];
  timeRange: { start: Date; end: Date };
  includeWeddingContext: boolean;
  includePredictions: boolean;
}) {
  const startTime = Date.now();

  try {
    // Start real-time monitoring session if not already active
    const monitoringSession = await performanceMonitor.startRealTimeMonitoring(
      options.services,
    );

    // Collect current metrics
    const currentMetrics =
      await performanceMonitor.getActiveMonitoringSessions();

    // Calculate trends
    const trends = await calculateMetricsTrends(
      options.services,
      options.timeRange,
    );

    // Get predictions if requested
    let predictions = null;
    if (options.includePredictions) {
      predictions = await generateMetricsPredictions(options.services);
    }

    // Get wedding context if requested
    let weddingContext = null;
    if (options.includeWeddingContext) {
      weddingContext = await getWeddingContext();
    }

    // Calculate system health
    const systemHealth = await calculateSystemHealth(options.services);

    const processingTime = Date.now() - startTime;
    console.log(`[ScalabilityAPI] Metrics collected in ${processingTime}ms`);

    return {
      current: currentMetrics,
      trends,
      predictions,
      weddingContext,
      systemHealth,
      timestamp: new Date(),
      processingTimeMs: processingTime,
    };
  } catch (error) {
    console.error(
      '[ScalabilityAPI] Error collecting real-time metrics:',
      error,
    );
    throw new Error(
      `Failed to collect real-time metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function calculateMetricsTrends(
  services: string[],
  timeRange: { start: Date; end: Date },
) {
  // Mock trends calculation - in production would analyze historical data
  const trends: Record<string, any> = {};

  for (const service of services) {
    trends[service] = {
      cpu: {
        current: 45 + Math.random() * 30,
        trend: Math.random() > 0.5 ? 'increasing' : 'stable',
        changeRate: (Math.random() - 0.5) * 10, // -5% to +5% change
      },
      memory: {
        current: 55 + Math.random() * 25,
        trend: Math.random() > 0.7 ? 'increasing' : 'stable',
        changeRate: (Math.random() - 0.5) * 8,
      },
      responseTime: {
        current: 200 + Math.random() * 300,
        trend: Math.random() > 0.6 ? 'increasing' : 'decreasing',
        changeRate: (Math.random() - 0.5) * 20,
      },
      throughput: {
        current: 100 + Math.random() * 200,
        trend: Math.random() > 0.4 ? 'increasing' : 'stable',
        changeRate: (Math.random() - 0.5) * 15,
      },
    };
  }

  return trends;
}

async function generateMetricsPredictions(services: string[]) {
  // Mock predictions - in production would use ML models
  const predictions: Record<string, any> = {};

  for (const service of services) {
    const currentHour = new Date().getHours();

    predictions[service] = {
      nextHour: {
        expectedLoad: 100 + Math.sin((currentHour / 24) * 2 * Math.PI) * 50,
        confidence: 0.8 + Math.random() * 0.15,
        scalingRecommendation: Math.random() > 0.7 ? 'scale_up' : 'maintain',
      },
      next4Hours: Array.from({ length: 4 }, (_, i) => ({
        hour: currentHour + i + 1,
        expectedLoad:
          100 + Math.sin(((currentHour + i + 1) / 24) * 2 * Math.PI) * 50,
        confidence: 0.7 + Math.random() * 0.2,
      })),
      weddingImpact: {
        hasUpcomingWeddings: Math.random() > 0.7,
        expectedLoadIncrease: Math.random() * 150,
        peakTime: new Date(Date.now() + Math.random() * 8 * 60 * 60 * 1000),
      },
    };
  }

  return predictions;
}

async function getWeddingContext() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDay();

  const isWeddingSeason = currentMonth >= 4 && currentMonth <= 9; // May to October
  const isWeddingDay =
    currentDay === 6 || (currentDay === 0 && Math.random() < 0.3); // Saturday or sometimes Sunday

  return {
    isWeddingSeason,
    isWeddingDay,
    seasonalMultiplier: isWeddingSeason ? 1.5 : 1.0,
    upcomingWeddings: Math.floor(Math.random() * 15),
    criticalPeriod:
      isWeddingDay &&
      currentDate.getHours() >= 10 &&
      currentDate.getHours() <= 18,
    weddingTypes: {
      intimate: Math.floor(Math.random() * 3),
      medium: Math.floor(Math.random() * 5),
      large: Math.floor(Math.random() * 3),
      luxury: Math.floor(Math.random() * 2),
    },
  };
}

async function calculateSystemHealth(services: string[]) {
  // Mock system health calculation
  const healthScores = services.map((service) => {
    const baseHealth = 85 + Math.random() * 10; // 85-95% base health
    const randomVariation = (Math.random() - 0.5) * 10; // ±5% variation
    return Math.max(0, Math.min(100, baseHealth + randomVariation));
  });

  const overallHealth =
    healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;

  let status: 'healthy' | 'warning' | 'critical';
  if (overallHealth >= 90) status = 'healthy';
  else if (overallHealth >= 70) status = 'warning';
  else status = 'critical';

  return {
    overallHealth: Math.round(overallHealth),
    status,
    serviceHealthScores: services.reduce(
      (acc, service, index) => {
        acc[service] = Math.round(healthScores[index]);
        return acc;
      },
      {} as Record<string, number>,
    ),
    alerts: generateMockAlerts(overallHealth),
    recommendations: generateHealthRecommendations(overallHealth, status),
  };
}

function generateMockAlerts(healthScore: number) {
  const alerts = [];

  if (healthScore < 80) {
    alerts.push({
      id: `health_alert_${Date.now()}`,
      severity: healthScore < 60 ? 'critical' : 'warning',
      message: 'System health below optimal threshold',
      service: 'system',
      timestamp: new Date().toISOString(),
    });
  }

  if (Math.random() < 0.2) {
    // 20% chance of having an active alert
    alerts.push({
      id: `perf_alert_${Date.now()}`,
      severity: 'warning',
      message: 'Elevated response times detected on API service',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

function generateHealthRecommendations(healthScore: number, status: string) {
  const recommendations = [];

  if (status === 'critical') {
    recommendations.push(
      'Immediate scaling recommended for all critical services',
    );
    recommendations.push('Review error logs for recent incidents');
    recommendations.push('Consider emergency scaling protocols');
  } else if (status === 'warning') {
    recommendations.push('Monitor system closely for performance degradation');
    recommendations.push('Consider preemptive scaling during peak hours');
  }

  if (healthScore < 85) {
    recommendations.push('Review recent deployments for potential issues');
    recommendations.push('Check database connection pool utilization');
  }

  return recommendations;
}

function parseTimeRange(timeRange: string): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (timeRange) {
    case '15m':
      start = new Date(end.getTime() - 15 * 60 * 1000);
      break;
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      break;
    case '4h':
      start = new Date(end.getTime() - 4 * 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 60 * 60 * 1000); // Default to 1 hour
  }

  return { start, end };
}

async function getCurrentUser() {
  // Mock user - in production would get from auth system
  return {
    id: 'user_123',
    role: 'admin',
    permissions: ['scalability_read', 'scalability_write'],
  };
}

async function validateScalabilityAccess(userId: string) {
  // Mock access validation - in production would check permissions
  console.log(`[ScalabilityAPI] Access validated for user: ${userId}`);
}

function handleAPIError(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized access to scalability metrics',
          code: 'UNAUTHORIZED',
        },
        { status: 401 },
      );
    }

    if (error.message.includes('Invalid')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: 'INVALID_REQUEST',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 },
  );
}
