/**
 * WS-241 AI Caching Strategy System - Main Cache Query Endpoint
 * Handles AI cache queries with wedding-optimized retrieval
 * Team B - Backend Infrastructure & API Development
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  WeddingAICacheService,
  AIQuery,
  WeddingContext,
} from '@/lib/ai-cache/WeddingAICacheService';
import { ratelimit } from '@/lib/ratelimit';

// Initialize cache service
const cacheService = new WeddingAICacheService(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  process.env.REDIS_URL || 'redis://localhost:6379',
);

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Rate limiting - 30 requests per minute per user
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    const { success, limit, remaining, reset } =
      await ratelimit.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        },
      );
    }

    // Parse request body
    const body = await request.json();
    const { query, weddingContext, options } = body as {
      query: AIQuery;
      weddingContext: WeddingContext;
      options?: {
        bypassCache?: boolean;
        preferredSource?: 'memory' | 'redis' | 'database';
        includeMetrics?: boolean;
      };
    };

    // Validate required fields
    if (!query?.type || !query?.content) {
      return NextResponse.json(
        { error: 'Invalid query. Required fields: type, content' },
        { status: 400 },
      );
    }

    if (!weddingContext?.location || !weddingContext?.weddingDate) {
      return NextResponse.json(
        {
          error:
            'Invalid wedding context. Required fields: location, weddingDate',
        },
        { status: 400 },
      );
    }

    // Validate wedding date format
    const weddingDate = new Date(weddingContext.weddingDate);
    if (isNaN(weddingDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid wedding date format' },
        { status: 400 },
      );
    }

    // Update wedding context with parsed date
    const processedContext: WeddingContext = {
      ...weddingContext,
      weddingDate,
    };

    // Authentication check
    const supabase = createRouteHandlerClient({ cookies: cookies() });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to access cache.' },
        { status: 401 },
      );
    }

    // Get user's organization for context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'User profile not found or no organization associated' },
        { status: 404 },
      );
    }

    console.log(
      `Cache query: ${query.type} for user ${user.id}, org ${profile.organization_id}`,
    );

    // Attempt to get cached response
    const cached = await cacheService.getCachedResponse(
      query,
      processedContext,
      options,
    );

    if (cached) {
      console.log(
        `Cache HIT: ${query.type} from ${cached.source} (${Date.now() - startTime}ms)`,
      );

      const response = {
        data: cached.data,
        source: 'cache',
        cacheSource: cached.source,
        cachedAt: cached.timestamp,
        hitCount: cached.hitCount,
        ttl: cached.ttl,
        responseTimeMs: Date.now() - startTime,
      };

      if (options?.includeMetrics) {
        response.metadata = cached.metadata;
      }

      return NextResponse.json(response, {
        headers: {
          'X-Cache-Status': 'HIT',
          'X-Cache-Source': cached.source,
          'X-Response-Time': (Date.now() - startTime).toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      });
    }

    // Cache miss - would typically call AI service here
    console.log(`Cache MISS: ${query.type} (${Date.now() - startTime}ms)`);

    // For this implementation, we'll return a placeholder response
    // In a real implementation, this would call your AI service
    const mockAIResponse = {
      result: `AI response for ${query.type} query: ${query.content.substring(0, 100)}...`,
      confidence: 0.95,
      processingTime: Math.random() * 1000 + 500, // Random processing time
      model: query.model || 'gpt-4',
      tokens: Math.floor(Math.random() * 1000) + 100,
    };

    // Calculate estimated cost (mock calculation)
    const estimatedCost = Math.floor(mockAIResponse.tokens * 0.03); // 3 cents per 1000 tokens

    // Store in cache for future requests
    await cacheService.setCachedResponse(
      query,
      mockAIResponse,
      processedContext,
      {
        cost: estimatedCost,
        modelUsed: mockAIResponse.model,
        processingTime: mockAIResponse.processingTime,
      },
    );

    const responseTimeMs = Date.now() - startTime;

    return NextResponse.json(
      {
        data: mockAIResponse,
        source: 'ai',
        responseTimeMs,
        cached: true,
        cost: {
          cents: estimatedCost,
          tokens: mockAIResponse.tokens,
        },
      },
      {
        headers: {
          'X-Cache-Status': 'MISS',
          'X-Cache-Source': 'ai',
          'X-Response-Time': responseTimeMs.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-Cost-Cents': estimatedCost.toString(),
        },
      },
    );
  } catch (error) {
    console.error('AI Cache Query Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error processing cache query',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'X-Cache-Status': 'ERROR',
          'X-Response-Time': (Date.now() - Date.now()).toString(),
        },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  try {
    const health = await cacheService.healthCheck();

    return NextResponse.json({
      service: 'AI Cache Query API',
      status: health.status,
      timestamp: new Date().toISOString(),
      health,
    });
  } catch (error) {
    return NextResponse.json(
      {
        service: 'AI Cache Query API',
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
