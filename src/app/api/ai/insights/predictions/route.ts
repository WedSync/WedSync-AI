import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { PredictiveAnalyticsEngine } from '@/lib/ai/feature-management/predictive-analytics-engine';
import { AIPerformanceMonitor } from '@/lib/ai/feature-management/monitoring/performance-monitor';
import { Logger } from '@/lib/logging/Logger';
import { rateLimit } from '@/lib/rate-limiter';

const logger = new Logger('AIPredictionsAPI');

// Query schema for predictions
const PredictionsQuerySchema = z.object({
  timeframe: z.enum(['30d', '90d', '180d', '365d']).default('90d'),
  categories: z
    .array(
      z.enum([
        'forms',
        'timeline',
        'guest-management',
        'payments',
        'integration',
        'mobile',
        'analytics',
        'communication',
      ]),
    )
    .optional(),
  confidence_threshold: z.coerce.number().min(0).max(1).default(0.7),
  include_seasonal: z.coerce.boolean().default(true),
  format: z.enum(['summary', 'detailed']).default('summary'),
});

interface PredictionResponse {
  trends: Array<{
    category: string;
    trend_direction: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    predicted_requests: number;
    seasonal_factor: number;
    key_drivers: string[];
  }>;
  emerging_needs: Array<{
    need: string;
    confidence: number;
    urgency: 'low' | 'medium' | 'high';
    affected_user_segments: string[];
    estimated_impact: string;
    recommended_action: string;
  }>;
  seasonal_insights: {
    current_season: 'peak' | 'shoulder' | 'off';
    peak_categories: string[];
    seasonal_multipliers: Record<string, number>;
    wedding_day_factors: Record<string, number>;
  };
  business_intelligence: {
    feature_request_velocity: number;
    implementation_backlog_health: 'healthy' | 'concerning' | 'critical';
    user_satisfaction_indicators: Record<string, number>;
    competitive_gaps: string[];
    innovation_opportunities: string[];
  };
  recommendations: {
    immediate_actions: Array<{
      action: string;
      priority: number;
      effort_estimate: string;
      expected_outcome: string;
    }>;
    strategic_initiatives: Array<{
      initiative: string;
      timeline: string;
      investment_level: 'low' | 'medium' | 'high';
      expected_roi: string;
    }>;
  };
  metadata: {
    analysis_date: string;
    data_points_analyzed: number;
    confidence_score: number;
    processing_time_ms: number;
    cost_cents: number;
    tokens_used: number;
  };
}

export async function GET(request: NextRequest) {
  const performanceMonitor = new AIPerformanceMonitor();
  const startTime = Date.now();
  let totalTokensUsed = 0;
  let totalCostCents = 0;

  try {
    // Rate limiting
    const rateLimitResult = await rateLimit('ai-predictions', 5, 60); // 5 requests per minute
    if (rateLimitResult.error) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Authentication
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, organizations(*)')
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Check permissions (Admin only or Enterprise tier)
    const userTier = profile.organizations?.tier || 'free';
    const isAdmin = ['admin', 'owner'].includes(profile.role);

    if (!isAdmin && userTier !== 'enterprise') {
      return NextResponse.json(
        { error: 'AI predictions require Enterprise tier or admin access' },
        { status: 403 },
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const query = PredictionsQuerySchema.parse(
      Object.fromEntries(url.searchParams),
    );

    logger.info('Starting AI predictions analysis', {
      userId: session.user.id,
      organizationId: profile.organization_id,
      timeframe: query.timeframe,
      categories: query.categories,
    });

    // Initialize predictive analytics engine
    const predictiveEngine = new PredictiveAnalyticsEngine();

    // Fetch historical data for analysis
    const timeframeDays = {
      '30d': 30,
      '90d': 90,
      '180d': 180,
      '365d': 365,
    }[query.timeframe];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Get feature requests data
    let dataQuery = supabase
      .from('feature_requests')
      .select(
        `
        *,
        user_profiles!inner(role),
        organizations!inner(tier, size)
      `,
      )
      .gte('created_at', startDate.toISOString());

    // Apply organization filter for non-admins
    if (!isAdmin) {
      dataQuery = dataQuery.eq('organization_id', profile.organization_id);
    }

    // Apply category filter if specified
    if (query.categories && query.categories.length > 0) {
      dataQuery = dataQuery.in('category', query.categories);
    }

    const { data: historicalRequests, error: dataError } = await dataQuery;

    if (dataError) {
      logger.error('Failed to fetch historical data', { error: dataError });
      return NextResponse.json(
        { error: 'Failed to fetch historical data' },
        { status: 500 },
      );
    }

    // Perform trend analysis
    const trendAnalysisStartTime = Date.now();
    const trendAnalysis = await predictiveEngine.analyzeTrends({
      historical_data: historicalRequests || [],
      timeframe_days: timeframeDays,
      categories: query.categories,
      confidence_threshold: query.confidence_threshold,
    });

    // Record trend analysis metrics
    await performanceMonitor.recordMetric({
      component: 'predictive-engine',
      operation: 'analyze_trends',
      duration: Date.now() - trendAnalysisStartTime,
      success: true,
      tokens_used: trendAnalysis.metadata?.tokens_used || 0,
      cost_cents: trendAnalysis.metadata?.cost_cents || 0,
      tier: userTier,
      user_id: session.user.id,
      organization_id: profile.organization_id,
    });

    totalTokensUsed += trendAnalysis.metadata?.tokens_used || 0;
    totalCostCents += trendAnalysis.metadata?.cost_cents || 0;

    // Detect emerging needs
    const emergingNeedsStartTime = Date.now();
    const emergingNeeds = await predictiveEngine.detectEmergingNeeds({
      recent_requests: historicalRequests?.slice(-50) || [], // Last 50 requests
      market_context: {
        wedding_season: getCurrentWeddingSeason(),
        industry_trends: ['mobile-first', 'ai-integration', 'automation'],
        competitive_landscape: 'saturated',
      },
    });

    // Record emerging needs detection metrics
    await performanceMonitor.recordMetric({
      component: 'predictive-engine',
      operation: 'detect_emerging_needs',
      duration: Date.now() - emergingNeedsStartTime,
      success: true,
      tokens_used: emergingNeeds.metadata?.tokens_used || 0,
      cost_cents: emergingNeeds.metadata?.cost_cents || 0,
      tier: userTier,
      user_id: session.user.id,
      organization_id: profile.organization_id,
    });

    totalTokensUsed += emergingNeeds.metadata?.tokens_used || 0;
    totalCostCents += emergingNeeds.metadata?.cost_cents || 0;

    // Generate business intelligence insights
    const biStartTime = Date.now();
    const businessIntelligence =
      await predictiveEngine.generateBusinessIntelligence({
        feature_requests: historicalRequests || [],
        user_feedback: [], // Would include user satisfaction data
        market_data: {
          competitor_features: [],
          industry_benchmarks: {},
        },
      });

    // Record business intelligence metrics
    await performanceMonitor.recordMetric({
      component: 'predictive-engine',
      operation: 'generate_business_intelligence',
      duration: Date.now() - biStartTime,
      success: true,
      tokens_used: businessIntelligence.metadata?.tokens_used || 0,
      cost_cents: businessIntelligence.metadata?.cost_cents || 0,
      tier: userTier,
      user_id: session.user.id,
      organization_id: profile.organization_id,
    });

    totalTokensUsed += businessIntelligence.metadata?.tokens_used || 0;
    totalCostCents += businessIntelligence.metadata?.cost_cents || 0;

    // Build comprehensive response
    const response: PredictionResponse = {
      trends: trendAnalysis.trends.map((trend: any) => ({
        category: trend.category,
        trend_direction: trend.direction,
        confidence: trend.confidence,
        predicted_requests: trend.predicted_volume,
        seasonal_factor: trend.seasonal_adjustment,
        key_drivers: trend.driving_factors,
      })),
      emerging_needs: emergingNeeds.emerging_needs.map((need: any) => ({
        need: need.description,
        confidence: need.confidence,
        urgency: need.urgency_level,
        affected_user_segments: need.target_segments,
        estimated_impact: need.business_impact,
        recommended_action: need.recommended_response,
      })),
      seasonal_insights: {
        current_season: getCurrentWeddingSeason(),
        peak_categories: trendAnalysis.seasonal_patterns?.peak_categories || [],
        seasonal_multipliers:
          trendAnalysis.seasonal_patterns?.multipliers || {},
        wedding_day_factors: {
          'guest-management': 1.5,
          timeline: 2.0,
          communication: 1.3,
          mobile: 1.8,
        },
      },
      business_intelligence: {
        feature_request_velocity:
          businessIntelligence.metrics?.request_velocity || 0,
        implementation_backlog_health:
          businessIntelligence.backlog_health || 'healthy',
        user_satisfaction_indicators:
          businessIntelligence.satisfaction_metrics || {},
        competitive_gaps: businessIntelligence.competitive_analysis?.gaps || [],
        innovation_opportunities:
          businessIntelligence.innovation_opportunities || [],
      },
      recommendations: {
        immediate_actions:
          businessIntelligence.recommendations?.immediate || [],
        strategic_initiatives:
          businessIntelligence.recommendations?.strategic || [],
      },
      metadata: {
        analysis_date: new Date().toISOString(),
        data_points_analyzed: historicalRequests?.length || 0,
        confidence_score:
          (trendAnalysis.overall_confidence +
            emergingNeeds.overall_confidence +
            businessIntelligence.confidence_score) /
          3,
        processing_time_ms: Date.now() - startTime,
        cost_cents: totalCostCents,
        tokens_used: totalTokensUsed,
      },
    };

    logger.info('AI predictions analysis completed', {
      userId: session.user.id,
      processingTime: Date.now() - startTime,
      dataPoints: historicalRequests?.length || 0,
      totalCost: totalCostCents,
      totalTokens: totalTokensUsed,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('AI predictions analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    });

    // Record failure metrics
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await performanceMonitor.recordMetric({
          component: 'predictive-engine',
          operation: 'generate_predictions',
          duration: processingTime,
          success: false,
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          tier: 'unknown',
          user_id: session.user.id,
          organization_id: 'unknown',
        });
      }
    } catch (metricsError) {
      logger.error('Failed to record failure metrics', { error: metricsError });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Predictions analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Determine current wedding season
 */
function getCurrentWeddingSeason(): 'peak' | 'shoulder' | 'off' {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  if (currentMonth >= 5 && currentMonth <= 10) {
    return 'peak'; // May-October
  } else if (currentMonth === 4 || currentMonth === 11) {
    return 'shoulder'; // April, November
  } else {
    return 'off'; // December-March
  }
}
