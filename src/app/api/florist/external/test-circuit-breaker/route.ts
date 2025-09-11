/**
 * API Route: Circuit Breaker Testing for Florist Intelligence
 * POST /api/florist/external/test-circuit-breaker - WS-253 Team C Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { circuitBreakerManager } from '@/lib/integrations/circuit-breaker';
import { getOpenAIFloristClient } from '@/lib/integrations/openai-florist-client';
import { z } from 'zod';

// Request validation schema
const testCircuitBreakerSchema = z.object({
  service: z.enum(['openai', 'all']),
  simulate_failure: z.boolean().optional().default(false),
  failure_count: z.number().min(1).max(10).optional().default(1),
});

export async function POST(request: NextRequest) {
  try {
    // Only allow in development/testing environments
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Circuit breaker testing not available in production' },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = testCircuitBreakerSchema.parse(body);

    const floristClient = getOpenAIFloristClient();
    const results: any = {
      test_timestamp: new Date().toISOString(),
      service: validatedData.service,
      simulate_failure: validatedData.simulate_failure,
      results: {},
    };

    if (validatedData.service === 'openai' || validatedData.service === 'all') {
      // Test OpenAI circuit breaker
      if (validatedData.simulate_failure) {
        // Force circuit breaker open for testing
        const cbStats = await floristClient.getCircuitBreakerStatus();

        // Simulate failures by forcing the circuit breaker open
        for (let i = 0; i < validatedData.failure_count; i++) {
          try {
            // This will fail and increment failure count
            await floristClient.generateColorPalette({
              baseColors: ['#INVALID'], // Invalid to force failure
              style: 'romantic',
              season: 'spring',
            });
          } catch (error) {
            // Expected to fail
          }
        }

        results.results.openai = {
          circuit_breaker_triggered: true,
          failure_simulation_count: validatedData.failure_count,
          status: await floristClient.getCircuitBreakerStatus(),
        };
      } else {
        // Test normal operation
        try {
          const testResult = await floristClient.generateColorPalette(
            {
              baseColors: ['#FF69B4'],
              style: 'romantic',
              season: 'spring',
            },
            {
              userId: 'test-user',
              userTier: 'ENTERPRISE', // Use high tier to avoid rate limits
            },
          );

          results.results.openai = {
            operation_successful: true,
            response_received: !!testResult,
            cached: testResult.cached || false,
            status: await floristClient.getCircuitBreakerStatus(),
          };
        } catch (error) {
          results.results.openai = {
            operation_successful: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: await floristClient.getCircuitBreakerStatus(),
          };
        }
      }
    }

    // Get all circuit breaker statuses
    results.all_circuit_breakers = circuitBreakerManager.getAllStats();
    results.system_health = circuitBreakerManager.getSystemHealth();

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Circuit breaker testing error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Circuit breaker test failed',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to test circuit breaker',
    },
    { status: 405 },
  );
}
