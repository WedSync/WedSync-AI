import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { WeddingIndustryDataIntegrator } from '@/lib/integrations/analytics/wedding-industry-data';
import { buildStructuredReport } from '@/lib/analytics/report-builders';

// Helper functions for insight calculations to reduce nesting complexity
function getInsightsWithOpportunityScore(insights: any[]): any[] {
  return insights.filter(
    (insight) => insight.executive_summary?.opportunityScore
  );
}

function calculateAverageOpportunityScore(insights: any[]): number {
  const insightsWithScores = getInsightsWithOpportunityScore(insights);
  
  if (insightsWithScores.length === 0) {
    return 0;
  }
  
  const totalScore = insightsWithScores.reduce(
    (sum, insight) => sum + insight.executive_summary.opportunityScore,
    0
  );
  
  return totalScore / insightsWithScores.length;
}

function getRecentInsights(insights: any[], daysBack: number = 30): any[] {
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  return insights.filter(
    (insight) => new Date(insight.created_at) > cutoffDate
  );
}

function calculateInsightsTrend(insights: any[]): any | null {
  if (insights.length <= 1) {
    return null;
  }
  
  return {
    totalInsights: insights.length,
    recentInsights: getRecentInsights(insights).length,
    averageOpportunityScore: calculateAverageOpportunityScore(insights),
  };
}

const InsightsRequestSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  insightType: z.enum([
    'market_analysis',
    'competitive_intelligence',
    'trend_analysis',
    'pricing_insights',
    'seasonal_patterns',
    'geographic_analysis',
  ]),
  scope: z
    .enum(['local', 'regional', 'national', 'global'])
    .default('regional'),
  vendorCategories: z
    .array(
      z.enum([
        'photographer',
        'videographer',
        'venue',
        'catering',
        'florist',
        'music_dj',
        'band',
        'planner',
        'makeup_artist',
        'transportation',
        'cake_designer',
        'decor',
        'officiant',
        'stationery',
        'rentals',
      ]),
    )
    .optional(),
  geographicFilters: z
    .object({
      country: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      radius: z.number().min(1).max(500).optional(), // miles
      coordinates: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
    })
    .optional(),
  timeframe: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    compareWithPreviousPeriod: z.boolean().default(false),
  }),
  weddingSeasonAnalysis: z
    .object({
      includePeakSeason: z.boolean().default(true),
      includeOffSeason: z.boolean().default(true),
      seasonalComparisons: z.boolean().default(true),
    })
    .optional(),
  competitorAnalysis: z
    .object({
      includeDirectCompetitors: z.boolean().default(true),
      includeMarketLeaders: z.boolean().default(true),
      pricingComparison: z.boolean().default(true),
      serviceOfferingComparison: z.boolean().default(true),
      customerSatisfactionComparison: z.boolean().default(false), // Premium feature
    })
    .optional(),
  benchmarkingMetrics: z
    .array(
      z.enum([
        'booking_volume',
        'average_booking_value',
        'customer_satisfaction',
        'response_time',
        'conversion_rate',
        'retention_rate',
        'referral_rate',
        'pricing_competitiveness',
        'service_quality',
        'market_share',
      ]),
    )
    .optional(),
  industryDataSources: z
    .array(
      z.enum([
        'theknot',
        'weddingwire',
        'zola',
        'weddingspot',
        'herecomestheguide',
      ]),
    )
    .optional(),
  customFilters: z.record(z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  includeActionableRecommendations: z.boolean().default(true),
});

const MarketInsightSchema = z.object({
  category: z.string(),
  metric: z.string(),
  value: z.number(),
  unit: z.string(),
  trend: z.enum(['increasing', 'decreasing', 'stable', 'volatile']),
  percentageChange: z.number(),
  benchmarkComparison: z.enum(['above_market', 'at_market', 'below_market']),
  significance: z.enum(['low', 'medium', 'high', 'critical']),
  seasonalPattern: z
    .object({
      peakMonths: z.array(z.string()),
      lowMonths: z.array(z.string()),
      volatility: z.number().min(0).max(100),
    })
    .optional(),
  geographicVariation: z
    .object({
      highPerformingAreas: z.array(z.string()),
      underPerformingAreas: z.array(z.string()),
      averageVariation: z.number(),
    })
    .optional(),
});

const CompetitorProfileSchema = z.object({
  competitorId: z.string(),
  name: z.string(),
  category: z.string(),
  marketPosition: z.enum(['leader', 'challenger', 'follower', 'niche']),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  pricingStrategy: z.enum(['premium', 'competitive', 'value', 'discount']),
  serviceOfferings: z.array(z.string()),
  customerSatisfaction: z.number().min(1).max(5).optional(),
  marketShare: z.number().min(0).max(100).optional(),
  bookingVolume: z
    .object({
      monthly: z.number(),
      yearOverYear: z.number(),
      seasonalPattern: z.string(),
    })
    .optional(),
  geographicPresence: z.array(z.string()),
  differentiators: z.array(z.string()),
  threatLevel: z.enum(['low', 'medium', 'high', 'critical']),
});

const IndustryInsightsReportSchema = z.object({
  insightId: z.string().uuid(),
  organizationId: z.string().uuid(),
  reportType: z.string(),
  generatedAt: z.string().datetime(),
  scope: z.string(),
  timeframe: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  executiveSummary: z.object({
    keyFindings: z.array(z.string()),
    criticalInsights: z.array(z.string()),
    actionPriorities: z.array(z.string()),
    marketPosition: z.string(),
    opportunityScore: z.number().min(0).max(100),
  }),
  marketAnalysis: z.object({
    marketSize: z.object({
      totalValue: z.number(),
      unit: z.string(),
      growthRate: z.number(),
    }),
    marketTrends: z.array(MarketInsightSchema),
    seasonalPatterns: z.array(
      z.object({
        season: z.string(),
        impact: z.number(),
        keyMetrics: z.record(z.number()),
      }),
    ),
    geographicInsights: z.array(
      z.object({
        region: z.string(),
        performance: z.number(),
        opportunities: z.array(z.string()),
        challenges: z.array(z.string()),
      }),
    ),
  }),
  competitiveAnalysis: z.object({
    directCompetitors: z.array(CompetitorProfileSchema),
    marketLeaders: z.array(CompetitorProfileSchema),
    competitiveLandscape: z.object({
      concentration: z.enum([
        'highly_concentrated',
        'moderately_concentrated',
        'fragmented',
      ]),
      barriers: z.array(z.string()),
      opportunities: z.array(z.string()),
    }),
    benchmarking: z.array(
      z.object({
        metric: z.string(),
        yourPerformance: z.number(),
        marketAverage: z.number(),
        topPerformer: z.number(),
        improvementPotential: z.number(),
      }),
    ),
  }),
  weddingIndustrySpecifics: z.object({
    seasonalDemand: z.array(
      z.object({
        month: z.string(),
        demandIndex: z.number(),
        averagePricing: z.number(),
        bookingVolume: z.number(),
      }),
    ),
    vendorEcosystem: z.array(
      z.object({
        category: z.string(),
        saturation: z.number(),
        averagePricing: z.number(),
        qualityStandards: z.number(),
        customerDemand: z.number(),
      }),
    ),
    emergingTrends: z.array(
      z.object({
        trend: z.string(),
        adoptionRate: z.number(),
        potentialImpact: z.enum(['low', 'medium', 'high', 'transformative']),
        timeToMaturity: z.string(),
        relevanceToYou: z.number().min(0).max(100),
      }),
    ),
    customerBehaviorInsights: z.object({
      bookingTimeline: z.object({
        averageLeadTime: z.number(),
        planningMilestones: z.array(z.string()),
      }),
      spendingPatterns: z.object({
        averageWeddingBudget: z.number(),
        categoryAllocations: z.record(z.number()),
      }),
      selectionCriteria: z.array(
        z.object({
          factor: z.string(),
          importance: z.number().min(1).max(5),
          influenceOnDecision: z.number().min(0).max(100),
        }),
      ),
    }),
  }),
  actionableRecommendations: z.array(
    z.object({
      category: z.enum([
        'pricing',
        'services',
        'marketing',
        'operations',
        'competitive',
        'market_expansion',
      ]),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      recommendation: z.string(),
      rationale: z.string(),
      expectedImpact: z.string(),
      implementationComplexity: z.enum(['low', 'medium', 'high']),
      timeframe: z.string(),
      estimatedROI: z.number().optional(),
      keyMetrics: z.array(z.string()),
      weddingSpecificConsiderations: z.string().optional(),
    }),
  ),
  dataQuality: z.object({
    dataSourcesCovered: z.array(z.string()),
    dataFreshness: z.string(),
    confidenceLevel: z.number().min(0).max(100),
    limitations: z.array(z.string()),
    nextUpdateDue: z.string().datetime(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const authorization = headersList.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = InsightsRequestSchema.parse(body);

    // Verify organization access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', validatedData.organizationId)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization access denied' },
        { status: 403 },
      );
    }

    // Check subscription tier permissions for industry insights
    const { data: organization, error: subscriptionError } = await supabase
      .from('organizations')
      .select('subscription_tier, vendor_category, location')
      .eq('id', validatedData.organizationId)
      .single();

    if (subscriptionError) {
      return NextResponse.json(
        { error: 'Failed to verify subscription' },
        { status: 500 },
      );
    }

    // Professional tier or higher required for industry insights
    const allowedTiers = ['professional', 'scale', 'enterprise'];
    if (!allowedTiers.includes(organization.subscription_tier)) {
      return NextResponse.json(
        {
          error: 'Industry insights require Professional tier or higher',
          requiredTier: 'professional',
          currentTier: organization.subscription_tier,
        },
        { status: 403 },
      );
    }

    // Enterprise-only features
    const enterpriseFeatures = ['competitive_intelligence', 'pricing_insights'];
    if (
      enterpriseFeatures.includes(validatedData.insightType) &&
      organization.subscription_tier !== 'enterprise'
    ) {
      return NextResponse.json(
        {
          error: `${validatedData.insightType} insights require Enterprise tier`,
          requiredTier: 'enterprise',
          currentTier: organization.subscription_tier,
        },
        { status: 403 },
      );
    }

    const insightId = crypto.randomUUID();

    // Initialize Wedding Industry Data Integrator
    const industryIntegrator = new WeddingIndustryDataIntegrator({
      organizationId: validatedData.organizationId,
      vendorCategory: organization.vendor_category,
      location: organization.location,
    });

    // Create insight generation job record
    const { error: insightJobError } = await supabase
      .from('analytics_industry_insights')
      .insert({
        id: insightId,
        organization_id: validatedData.organizationId,
        insight_type: validatedData.insightType,
        scope: validatedData.scope,
        vendor_categories: validatedData.vendorCategories || [],
        geographic_filters: validatedData.geographicFilters || {},
        timeframe: validatedData.timeframe,
        wedding_season_analysis: validatedData.weddingSeasonAnalysis || {},
        competitor_analysis: validatedData.competitorAnalysis || {},
        benchmarking_metrics: validatedData.benchmarkingMetrics || [],
        industry_data_sources: validatedData.industryDataSources || [],
        custom_filters: validatedData.customFilters || {},
        priority: validatedData.priority,
        status: 'generating',
        created_by: user.id,
      });

    if (insightJobError) {
      console.error(
        'Failed to create insight generation job:',
        insightJobError,
      );
      return NextResponse.json(
        { error: 'Failed to initiate insight generation' },
        { status: 500 },
      );
    }

    // Generate industry insights
    let insightReport;

    try {
      insightReport = await industryIntegrator.generateIndustryInsights({
        insightId,
        insightType: validatedData.insightType,
        scope: validatedData.scope,
        vendorCategories: validatedData.vendorCategories,
        geographicFilters: validatedData.geographicFilters,
        timeframe: validatedData.timeframe,
        weddingSeasonAnalysis: validatedData.weddingSeasonAnalysis,
        competitorAnalysis: validatedData.competitorAnalysis,
        benchmarkingMetrics: validatedData.benchmarkingMetrics,
        industryDataSources: validatedData.industryDataSources,
        includeActionableRecommendations:
          validatedData.includeActionableRecommendations,
      });
    } catch (generationError) {
      console.error('Industry insight generation failed:', generationError);

      // Update job status to failed
      await supabase
        .from('analytics_industry_insights')
        .update({
          status: 'failed',
          error_message:
            generationError instanceof Error
              ? generationError.message
              : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', insightId);

      return NextResponse.json(
        {
          error: 'Industry insight generation failed',
          details:
            generationError instanceof Error
              ? generationError.message
              : 'Unknown error',
        },
        { status: 500 },
      );
    }

    // Structure the comprehensive insights report using helper
    const structuredReport = buildStructuredReport(
      insightId,
      validatedData.organizationId,
      validatedData,
      insightReport
    );

    // Update insight generation job with results
    await supabase
      .from('analytics_industry_insights')
      .update({
        status: 'completed',
        executive_summary: structuredReport.executiveSummary,
        market_analysis: structuredReport.marketAnalysis,
        competitive_analysis: structuredReport.competitiveAnalysis,
        wedding_industry_specifics: structuredReport.weddingIndustrySpecifics,
        actionable_recommendations: structuredReport.actionableRecommendations,
        data_quality: structuredReport.dataQuality,
        completed_at: structuredReport.generatedAt,
      })
      .eq('id', insightId);

    // Create audit log entry
    await supabase.from('analytics_audit_log').insert({
      organization_id: validatedData.organizationId,
      action: 'industry_insights',
      details: {
        insightId,
        insightType: validatedData.insightType,
        scope: validatedData.scope,
        opportunityScore: structuredReport.executiveSummary.opportunityScore,
        recommendationsGenerated:
          structuredReport.actionableRecommendations.length,
        dataSourcesUsed: structuredReport.dataQuality.dataSourcesCovered.length,
      },
      performed_by: user.id,
    });

    // Create alert for high-priority recommendations
    const criticalRecommendations =
      structuredReport.actionableRecommendations.filter(
        (rec) => rec.priority === 'critical',
      );
    if (criticalRecommendations.length > 0) {
      await supabase.from('analytics_alerts').insert({
        organization_id: validatedData.organizationId,
        alert_type: 'industry_insight',
        severity: 'high',
        message: `${criticalRecommendations.length} critical market opportunities identified`,
        details: {
          insightId,
          criticalRecommendations: criticalRecommendations.slice(0, 3), // Limit for storage
          opportunityScore: structuredReport.executiveSummary.opportunityScore,
        },
        created_by: user.id,
      });
    }

    return NextResponse.json(structuredReport, { status: 200 });
  } catch (error) {
    console.error('Analytics industry insights error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during insight generation' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const insightId = searchParams.get('insightId');
    const organizationId = searchParams.get('organizationId');
    const insightType = searchParams.get('insightType');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!insightId && !organizationId) {
      return NextResponse.json(
        { error: 'insightId or organizationId parameter required' },
        { status: 400 },
      );
    }

    const headersList = await headers();
    const authorization = headersList.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authorization.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    // Get industry insights
    let query = supabase.from('analytics_industry_insights').select('*');

    if (insightId) {
      query = query.eq('id', insightId);
    } else {
      query = query.eq('organization_id', organizationId);

      // Verify organization access
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single();

      if (orgError || !orgMember) {
        return NextResponse.json(
          { error: 'Organization access denied' },
          { status: 403 },
        );
      }

      if (insightType) {
        query = query.eq('insight_type', insightType);
      }
    }

    const { data: industryInsights, error } = await query
      .order('created_at', { ascending: false })
      .limit(insightId ? 1 : limit);

    if (error) {
      console.error('Failed to fetch industry insights:', error);
      return NextResponse.json(
        { error: 'Failed to fetch industry insights' },
        { status: 500 },
      );
    }

    if (insightId) {
      const insight = industryInsights[0];
      if (!insight) {
        return NextResponse.json(
          { error: 'Industry insight not found' },
          { status: 404 },
        );
      }

      // Verify user has access to this insight's organization
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', insight.organization_id)
        .single();

      if (orgError || !orgMember) {
        return NextResponse.json(
          { error: 'Access denied to this industry insight' },
          { status: 403 },
        );
      }

      return NextResponse.json(insight, { status: 200 });
    }

    // Calculate insights trends
    const insightsTrend = calculateInsightsTrend(industryInsights);

    return NextResponse.json(
      {
        industryInsights,
        insightsTrend,
        total: industryInsights.length,
        weddingOptimizedInsights: industryInsights.filter(
          (insight) => insight.wedding_season_analysis?.includePeakSeason,
        ).length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Analytics industry insights retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
