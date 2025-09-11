import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface TrendDataPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  responseTime: number;
  errorRate: number;
  requestCount: number;
  activeUsers: number;
}

interface PredictionResult {
  timestamp: string;
  predicted: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

// Simple linear regression for predictions
function linearRegression(data: number[]): {
  slope: number;
  intercept: number;
} {
  const n = data.length;
  const sumX = data.reduce((acc, _, i) => acc + i, 0);
  const sumY = data.reduce((acc, val) => acc + val, 0);
  const sumXY = data.reduce((acc, val, i) => acc + i * val, 0);
  const sumX2 = data.reduce((acc, _, i) => acc + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

// Calculate predictions based on historical data
function calculatePredictions(
  historicalData: number[],
  periods: number = 6,
): PredictionResult[] {
  const { slope, intercept } = linearRegression(historicalData);
  const predictions: PredictionResult[] = [];

  for (let i = 0; i < periods; i++) {
    const x = historicalData.length + i;
    const predicted = slope * x + intercept;
    const confidence = Math.max(0, Math.min(100, 100 - Math.abs(slope) * 10));
    const trend = slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable';

    predictions.push({
      timestamp: new Date(Date.now() + (i + 1) * 60 * 60 * 1000).toISOString(),
      predicted: Math.max(0, Math.min(100, predicted)),
      confidence,
      trend,
    });
  }

  return predictions;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h';
    const metric = searchParams.get('metric') || 'all';
    const environment = searchParams.get('environment') || 'production';

    // Calculate time range based on period
    const now = new Date();
    let startTime = new Date();

    switch (period) {
      case '1h':
        startTime.setHours(now.getHours() - 1);
        break;
      case '6h':
        startTime.setHours(now.getHours() - 6);
        break;
      case '24h':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
      default:
        startTime.setDate(now.getDate() - 1);
    }

    // Generate mock trend data (in production, this would query time-series database)
    const dataPoints = [];
    const intervals =
      period === '1h' ? 12 : period === '6h' ? 36 : period === '24h' ? 48 : 168;
    const intervalMs = (now.getTime() - startTime.getTime()) / intervals;

    for (let i = 0; i < intervals; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMs);
      const timeOfDay = timestamp.getHours();

      // Simulate realistic patterns
      const baseLoad = 30;
      const peakLoad = timeOfDay >= 9 && timeOfDay <= 17 ? 40 : 20;
      const randomVariation = Math.random() * 10;

      dataPoints.push({
        timestamp: timestamp.toISOString(),
        cpu: baseLoad + peakLoad + randomVariation + Math.sin(i / 10) * 5,
        memory:
          baseLoad +
          peakLoad * 0.8 +
          randomVariation * 0.7 +
          Math.cos(i / 10) * 3,
        responseTime: 100 + peakLoad * 2 + randomVariation * 5,
        errorRate: Math.max(0, Math.random() * 2 + Math.sin(i / 5)),
        requestCount: Math.floor(
          baseLoad * 10 + peakLoad * 20 + randomVariation * 10,
        ),
        activeUsers: Math.floor(
          baseLoad * 2 + peakLoad * 5 + randomVariation * 2,
        ),
      });
    }

    // Calculate statistics
    const cpuValues = dataPoints.map((d) => d.cpu);
    const memoryValues = dataPoints.map((d) => d.memory);
    const responseTimeValues = dataPoints.map((d) => d.responseTime);

    const statistics = {
      cpu: {
        current: cpuValues[cpuValues.length - 1],
        average: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
        trend:
          cpuValues[cpuValues.length - 1] > cpuValues[0]
            ? 'increasing'
            : 'decreasing',
      },
      memory: {
        current: memoryValues[memoryValues.length - 1],
        average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        trend:
          memoryValues[memoryValues.length - 1] > memoryValues[0]
            ? 'increasing'
            : 'decreasing',
      },
      responseTime: {
        current: responseTimeValues[responseTimeValues.length - 1],
        average:
          responseTimeValues.reduce((a, b) => a + b, 0) /
          responseTimeValues.length,
        min: Math.min(...responseTimeValues),
        max: Math.max(...responseTimeValues),
        trend:
          responseTimeValues[responseTimeValues.length - 1] >
          responseTimeValues[0]
            ? 'increasing'
            : 'decreasing',
      },
    };

    // Calculate predictions
    const predictions = {
      cpu: calculatePredictions(cpuValues.slice(-12)),
      memory: calculatePredictions(memoryValues.slice(-12)),
      responseTime: calculatePredictions(responseTimeValues.slice(-12)),
    };

    // Identify anomalies
    const anomalies = [];

    // Check for CPU spikes
    const avgCpu = statistics.cpu.average;
    dataPoints.forEach((point, index) => {
      if (point.cpu > avgCpu * 1.5) {
        anomalies.push({
          timestamp: point.timestamp,
          type: 'cpu_spike',
          severity: point.cpu > avgCpu * 2 ? 'high' : 'medium',
          value: point.cpu,
          threshold: avgCpu * 1.5,
        });
      }
    });

    // Check for high error rates
    dataPoints.forEach((point) => {
      if (point.errorRate > 5) {
        anomalies.push({
          timestamp: point.timestamp,
          type: 'high_error_rate',
          severity: point.errorRate > 10 ? 'critical' : 'high',
          value: point.errorRate,
          threshold: 5,
        });
      }
    });

    // Prepare response
    const response = {
      period,
      environment,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      dataPoints:
        metric === 'all'
          ? dataPoints
          : dataPoints.map((d) => ({
              timestamp: d.timestamp,
              value: d[metric as keyof TrendDataPoint],
            })),
      statistics,
      predictions,
      anomalies: anomalies.slice(-10), // Last 10 anomalies
      recommendations: generateRecommendations(
        statistics,
        predictions,
        anomalies,
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Health trends error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch health trends',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

function generateRecommendations(
  statistics: any,
  predictions: any,
  anomalies: any[],
): string[] {
  const recommendations = [];

  // CPU recommendations
  if (statistics.cpu.average > 70) {
    recommendations.push(
      'Consider scaling up CPU resources - average usage above 70%',
    );
  }
  if (
    predictions.cpu[0]?.trend === 'up' &&
    predictions.cpu[0]?.predicted > 80
  ) {
    recommendations.push('CPU usage trending upward - prepare for scaling');
  }

  // Memory recommendations
  if (statistics.memory.average > 75) {
    recommendations.push(
      'Memory usage is high - consider optimizing memory-intensive operations',
    );
  }
  if (
    predictions.memory[0]?.trend === 'up' &&
    predictions.memory[0]?.predicted > 85
  ) {
    recommendations.push(
      'Memory usage trending toward critical levels - investigate memory leaks',
    );
  }

  // Response time recommendations
  if (statistics.responseTime.average > 500) {
    recommendations.push(
      'Response times are elevated - review database queries and API optimizations',
    );
  }

  // Anomaly-based recommendations
  const recentAnomalies = anomalies.filter(
    (a) => new Date(a.timestamp) > new Date(Date.now() - 60 * 60 * 1000),
  );

  if (recentAnomalies.filter((a) => a.type === 'cpu_spike').length > 3) {
    recommendations.push(
      'Multiple CPU spikes detected - investigate background job scheduling',
    );
  }

  if (recentAnomalies.filter((a) => a.type === 'high_error_rate').length > 0) {
    recommendations.push(
      'High error rate detected - review error logs and implement fixes',
    );
  }

  return recommendations;
}
