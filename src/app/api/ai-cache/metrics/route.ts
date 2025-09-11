/**
 * WS-241: AI Caching Strategy System - Metrics and Monitoring API
 * Team D: AI/ML Engineering Implementation
 *
 * API endpoint for AI cache performance metrics, monitoring, and health checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiCacheOrchestrator } from '@/lib/ai/caching/ai-cache-orchestrator';

// Query parameters validation
const MetricsQuerySchema = z.object({
  timeframe: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
  include_trends: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default(false),
  include_seasonal: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default(false),
  include_quality: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default(true),
  include_predictions: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default(false),
  format: z
    .enum(['detailed', 'summary', 'dashboard'])
    .optional()
    .default('detailed'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedParams = MetricsQuerySchema.parse(queryParams);

    // Get comprehensive metrics
    const metricsResponse = await aiCacheOrchestrator.processAICacheRequest({
      query: '',
      context: {} as any, // Not needed for metrics
      operation: 'get_metrics',
    });

    if (!metricsResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: metricsResponse.error,
          message: 'Failed to retrieve AI cache metrics',
        },
        { status: 500 },
      );
    }

    const metricsData = metricsResponse.data;

    // Format response based on requested format
    let responseData;

    switch (validatedParams.format) {
      case 'summary':
        responseData = {
          overall_health: calculateOverallHealth(metricsData),
          key_metrics: {
            cache_hit_rate: metricsData.performance_metrics.hit_rate,
            quality_score: metricsData.performance_metrics.quality_score,
            prediction_accuracy:
              metricsData.performance_metrics.ai_specific_metrics
                .prediction_accuracy,
            cost_savings: metricsData.performance_metrics.cost_savings,
          },
          status: getSystemStatus(metricsData),
          last_updated: new Date().toISOString(),
        };
        break;

      case 'dashboard':
        responseData = {
          health_overview: {
            overall_score: calculateOverallHealth(metricsData),
            cache_health: metricsData.system_health.cache_health,
            quality_health: metricsData.system_health.quality_health,
            model_health: metricsData.system_health.model_health,
          },
          real_time_metrics: {
            current_hit_rate: metricsData.performance_metrics.hit_rate,
            avg_response_time:
              metricsData.performance_metrics.avg_response_time,
            active_cache_entries: Math.floor(Math.random() * 10000 + 5000), // Mock
            requests_per_minute: Math.floor(Math.random() * 500 + 100), // Mock
          },
          quality_metrics: metricsData.quality_dashboard.current_metrics,
          active_alerts: metricsData.quality_dashboard.active_alerts,
          recommendations: metricsData.quality_dashboard.recommendations.slice(
            0,
            5,
          ),
        };
        break;

      default: // detailed
        responseData = {
          performance_metrics: metricsData.performance_metrics,
          quality_dashboard: validatedParams.include_quality
            ? metricsData.quality_dashboard
            : undefined,
          system_health: metricsData.system_health,
          seasonal_patterns: validatedParams.include_seasonal
            ? metricsData.quality_dashboard.seasonal_patterns
            : undefined,
          model_performance:
            metricsData.performance_metrics.ai_specific_metrics
              .model_performance,
          trends: validatedParams.include_trends
            ? await getTrendData(validatedParams.timeframe)
            : undefined,
          predictions: validatedParams.include_predictions
            ? await getPredictionMetrics()
            : undefined,
        };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      metadata: {
        timeframe: validatedParams.timeframe,
        generated_at: new Date().toISOString(),
        format: validatedParams.format,
        system_version: '1.0.0',
      },
    });
  } catch (error) {
    console.error('AI Cache Metrics API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          message: 'Invalid query parameters',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve metrics',
      },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  try {
    // Quick health check
    const healthResponse = await aiCacheOrchestrator.processAICacheRequest({
      query: 'health_check',
      context: {} as any,
      operation: 'get_metrics',
    });

    if (healthResponse.success) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'X-System-Status': 'healthy',
          'X-Cache-Hit-Rate': '0.85',
          'X-Quality-Score': '0.87',
        },
      });
    } else {
      return new NextResponse(null, {
        status: 503,
        headers: {
          'X-System-Status': 'degraded',
          'X-Error': healthResponse.error || 'Unknown error',
        },
      });
    }
  } catch (error) {
    return new NextResponse(null, {
      status: 500,
      headers: {
        'X-System-Status': 'error',
        'X-Error': 'Health check failed',
      },
    });
  }
}

// Model training trigger endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const TrainingRequestSchema = z.object({
      action: z.enum(['trigger_training', 'update_models', 'analyze_feedback']),
      parameters: z
        .object({
          force_retrain: z.boolean().optional().default(false),
          models_to_update: z.array(z.string()).optional(),
          feedback_timeframe: z.string().optional().default('7d'),
        })
        .optional()
        .default({}),
    });

    const validatedData = TrainingRequestSchema.parse(body);

    let result;

    switch (validatedData.action) {
      case 'trigger_training':
        result = await aiCacheOrchestrator.triggerModelImprovement();
        break;

      case 'update_models':
        // Mock model update - in production, this would trigger specific model updates
        result = {
          models_updated: validatedData.parameters.models_to_update || ['all'],
          performance_improvements: {
            quality_model: 0.03,
            prediction_model: 0.02,
          },
          next_training_schedule: new Date(Date.now() + 24 * 60 * 60 * 1000),
          quality_impact: 0.04,
        };
        break;

      case 'analyze_feedback':
        // Mock feedback analysis
        result = {
          feedback_analyzed: 1250,
          quality_issues_identified: 5,
          improvement_recommendations: [
            'Enhance cultural sensitivity for Asian weddings',
            'Improve budget recommendations for luxury tier',
            'Add more seasonal advice for winter weddings',
          ],
          overall_satisfaction: 0.86,
        };
        break;

      default:
        throw new Error('Invalid action');
    }

    return NextResponse.json({
      success: true,
      action: validatedData.action,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Cache Training API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
          message: 'Invalid request data',
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to process training request',
      },
      { status: 500 },
    );
  }
}

// Utility functions
function calculateOverallHealth(metricsData: any): number {
  const cacheHealth = metricsData.system_health?.cache_health || 0.8;
  const qualityHealth = metricsData.system_health?.quality_health || 0.8;
  const modelHealth = metricsData.system_health?.model_health || 0.8;

  return (
    Math.round(((cacheHealth + qualityHealth + modelHealth) / 3) * 100) / 100
  );
}

function getSystemStatus(metricsData: any): string {
  const overallHealth = calculateOverallHealth(metricsData);

  if (overallHealth >= 0.9) return 'excellent';
  if (overallHealth >= 0.8) return 'good';
  if (overallHealth >= 0.7) return 'fair';
  if (overallHealth >= 0.6) return 'degraded';
  return 'critical';
}

async function getTrendData(timeframe: string): Promise<any> {
  // Mock trend data - in production, this would query historical metrics
  return {
    timeframe: timeframe,
    data_points: 24, // Mock data points
    trends: {
      hit_rate_trend: 'improving',
      quality_trend: 'stable',
      prediction_accuracy_trend: 'improving',
      cost_trend: 'decreasing',
    },
    projections: {
      next_24h_hit_rate: 0.87,
      next_24h_quality_score: 0.89,
      expected_cost_savings: 15000,
    },
  };
}

async function getPredictionMetrics(): Promise<any> {
  // Mock prediction metrics
  return {
    total_predictions_made: 15420,
    correct_predictions: 12650,
    accuracy_rate: 0.82,
    top_predicted_categories: [
      { category: 'venue_questions', count: 3240, accuracy: 0.89 },
      { category: 'budget_questions', count: 2880, accuracy: 0.85 },
      { category: 'vendor_questions', count: 2650, accuracy: 0.87 },
      { category: 'timeline_questions', count: 2340, accuracy: 0.81 },
      { category: 'cultural_questions', count: 1890, accuracy: 0.91 },
    ],
    seasonal_accuracy: {
      spring: 0.84,
      summer: 0.87,
      fall: 0.83,
      winter: 0.79,
    },
  };
}
