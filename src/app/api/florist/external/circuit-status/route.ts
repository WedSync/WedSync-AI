/**
 * API Route: Circuit Breaker Status for Florist Intelligence
 * GET /api/florist/external/circuit-status - WS-253 Team C Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { circuitBreakerManager } from '@/lib/integrations/circuit-breaker';
import { getOpenAIFloristClient } from '@/lib/integrations/openai-florist-client';
import { getRedisClient } from '@/lib/cache/redis';

export async function GET(request: NextRequest) {
  try {
    const floristClient = getOpenAIFloristClient();
    const redis = getRedisClient();

    // Get all circuit breaker statistics
    const allCircuitBreakers = circuitBreakerManager.getAllStats();
    const systemHealth = circuitBreakerManager.getSystemHealth();

    // Get OpenAI specific status
    const openAIStatus = await floristClient.getCircuitBreakerStatus();

    // Get Redis health
    const redisHealth = await redis.healthCheck();
    const redisStats = redis.getStats();

    // Get cache info
    const cacheInfo = await redis.getCacheInfo();

    // Overall service health check
    const serviceHealth = await floristClient.healthCheck();

    const response = {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        system_health: {
          overall_healthy: systemHealth.overall_healthy,
          services_operational: serviceHealth.healthy,
          redis_connected: redisHealth.healthy,
          openai_available: serviceHealth.openai_available,
        },
        circuit_breakers: {
          all_breakers: allCircuitBreakers,
          openai_florist: openAIStatus,
          system_summary: systemHealth,
        },
        redis_status: {
          connected: redisHealth.healthy,
          latency_ms: redisHealth.latency,
          cache_stats: redisStats,
          memory_info: cacheInfo,
        },
        service_availability: {
          openai_service: serviceHealth.openai_available,
          redis_cache: redisHealth.healthy,
          circuit_breaker_state: serviceHealth.circuit_breaker_state,
          overall_availability: serviceHealth.healthy && redisHealth.healthy,
        },
        performance_metrics: {
          cache_hit_rate: redisStats.hit_rate,
          total_cache_operations: redisStats.hits + redisStats.misses,
          error_rate:
            redisStats.errors > 0
              ? (redisStats.errors / (redisStats.hits + redisStats.misses)) *
                100
              : 0,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Circuit status error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve circuit breaker status',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        timestamp: new Date().toISOString(),
        fallback_data: {
          system_healthy: false,
          error_details:
            error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use GET to check circuit breaker status',
    },
    { status: 405 },
  );
}
