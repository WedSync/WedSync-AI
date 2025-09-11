/**
 * Wedding-Specific Analytics Insights API Endpoint
 *
 * Specialized endpoint providing wedding industry business intelligence,
 * seasonal patterns, market insights, and predictive analytics for
 * photographers, venues, planners, florists, and other wedding vendors.
 *
 * @route POST /api/analytics/wedding-insights
 * @author WedSync Analytics Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { WeddingBusinessIntelligence } from '@/lib/analytics/wedding-business-intelligence';
import { PredictiveAnalyticsService } from '@/lib/analytics/predictive-analytics';
import { createDatabaseOptimization } from '@/lib/analytics/database-optimization';
import { createSupabaseServiceClient } from '@/lib/supabase';

// Initialize wedding-specific analytics services
const weddingBI = new WeddingBusinessIntelligence();
const predictiveAnalytics = new PredictiveAnalyticsService();
const dbOptimizer = createDatabaseOptimization();

/**
 * Wedding insights request interface
 */
interface WeddingInsightsRequest {
  vendorId: string;
  vendorType:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'planner'
    | 'caterer'
    | 'other';
  analysisType:
    | 'seasonal'
    | 'forecast'
    | 'benchmark'
    | 'market_trends'
    | 'comprehensive';
  timeframe?: {
    years?: number;
    months?: number;
    forecastPeriod?: number;
  };
  competitors?: string[];
  marketSegment?: {
    region: string;
    priceRange: 'budget' | 'mid-range' | 'premium' | 'luxury';
    weddingTypes: string[];
  };
  includeRecommendations?: boolean;
}

/**
 * Wedding insights response interface
 */
interface WeddingInsightsResponse {
  analysisType: string;
  vendorType: string;
  insights: any;
  recommendations: any[];
  seasonalContext: any;
  marketPosition: any;
  forecasts?: any;
  benchmarks?: any;
  metadata: {
    executionTime: number;
    dataQuality: number;
    confidenceLevel: number;
    lastUpdated: string;
    nextUpdate: string;
  };
}

/**
 * POST /api/analytics/wedding-insights
 *
 * Generate comprehensive wedding industry insights and analytics
 * Optimized for peak wedding season decision-making
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request
    const requestData: WeddingInsightsRequest = await request.json();

    if (
      !requestData.vendorId ||
      !requestData.vendorType ||
      !requestData.analysisType
    ) {
      return NextResponse.json(
        {
          error: 'Missing required fields: vendorId, vendorType, analysisType',
          code: 'INVALID_REQUEST',
        },
        { status: 400 },
      );
    }

    // Authentication and authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing authentication token' },
        { status: 401 },
      );
    }

    const userContext = await validateAuthToken(
      authHeader.replace('Bearer ', ''),
    );
    if (!userContext.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 },
      );
    }

    // Check vendor access
    if (
      !(await hasVendorAccess(
        userContext.organizationId!,
        requestData.vendorId,
      ))
    ) {
      return NextResponse.json(
        { error: 'Forbidden - No access to vendor insights' },
        { status: 403 },
      );
    }

    // Check tier permissions for advanced insights
    const tierPermissions = getTierPermissions(userContext.tier!);
    if (!tierPermissions.canAccessInsights) {
      return NextResponse.json(
        {
          error: 'Upgrade required for wedding insights',
          requiredTier: 'professional',
          upgradeUrl: '/pricing',
          trialAvailable: true,
        },
        { status: 402 },
      );
    }

    // Generate cache key for insights
    const cacheKey = generateInsightsCacheKey(requestData);

    // Get cached insights or calculate new ones
    const insights = await dbOptimizer.getCachedQuery(
      cacheKey,
      async () => {
        return await generateWeddingInsights(requestData, userContext);
      },
      tierPermissions.cacheTime,
    );

    const executionTime = Date.now() - startTime;

    // Build comprehensive response
    const response: WeddingInsightsResponse = {
      analysisType: requestData.analysisType,
      vendorType: requestData.vendorType,
      insights: insights.data,
      recommendations: insights.recommendations,
      seasonalContext: insights.seasonalContext,
      marketPosition: insights.marketPosition,
      forecasts: insights.forecasts,
      benchmarks: insights.benchmarks,
      metadata: {
        executionTime,
        dataQuality: insights.dataQuality,
        confidenceLevel: insights.confidenceLevel,
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(
          Date.now() + tierPermissions.cacheTime * 1000,
        ).toISOString(),
      },
    };

    // Add performance and usage headers
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'X-Response-Time': executionTime.toString(),
      'X-Analysis-Type': requestData.analysisType,
      'X-Vendor-Type': requestData.vendorType,
      'X-Data-Quality': insights.dataQuality.toString(),
      'X-Confidence-Level': insights.confidenceLevel.toString(),
      'Cache-Control': `private, max-age=${tierPermissions.cacheTime}`,
      'X-Tier': userContext.tier!,
    });

    // Add rate limiting headers
    const rateLimitInfo = getRateLimitInfo(userContext.tier!, 'insights');
    responseHeaders.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    responseHeaders.set(
      'X-RateLimit-Remaining',
      rateLimitInfo.remaining.toString(),
    );

    return NextResponse.json(response, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Wedding insights API error:', error);
    const executionTime = Date.now() - startTime;

    // Handle specific error types
    if (error.message?.includes('insufficient data')) {
      return NextResponse.json(
        {
          error: 'Insufficient data for reliable insights',
          code: 'INSUFFICIENT_DATA',
          suggestions: [
            'Add more client data to improve insights accuracy',
            'Connect additional data sources',
            'Wait for more historical data to accumulate',
          ],
          minimumDataRequirements: {
            clients: 10,
            timespan: '3 months',
            completedWeddings: 3,
          },
        },
        {
          status: 422,
          headers: {
            'X-Response-Time': executionTime.toString(),
          },
        },
      );
    }

    if (error.message?.includes('analysis timeout')) {
      return NextResponse.json(
        {
          error:
            'Analysis timeout - try a smaller timeframe or simpler analysis',
          code: 'ANALYSIS_TIMEOUT',
          recommendations: [
            'Reduce analysis timeframe',
            'Choose specific analysis type instead of comprehensive',
            'Try again during off-peak hours',
          ],
        },
        {
          status: 408,
          headers: {
            'Retry-After': '300',
            'X-Response-Time': executionTime.toString(),
          },
        },
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to generate wedding insights',
        code: 'ANALYSIS_ERROR',
        timestamp: new Date().toISOString(),
        support: 'Contact support if this error persists',
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': executionTime.toString(),
        },
      },
    );
  }
}

/**
 * GET /api/analytics/wedding-insights
 *
 * Retrieve pre-calculated wedding insights and market trends
 * Optimized for dashboard widgets and quick insights display
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  try {
    const vendorId = searchParams.get('vendorId');
    const vendorType = searchParams.get('vendorType') as any;
    const insightType = searchParams.get('type') || 'overview';

    if (!vendorId || !vendorType) {
      return NextResponse.json(
        { error: 'Missing required parameters: vendorId, vendorType' },
        { status: 400 },
      );
    }

    // Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userContext = await validateAuthToken(
      authHeader.replace('Bearer ', ''),
    );
    if (!userContext.success) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get quick insights based on type
    const quickInsights = await getQuickInsights(
      vendorId,
      vendorType,
      insightType,
    );

    const executionTime = Date.now() - startTime;

    return NextResponse.json(
      {
        data: quickInsights,
        metadata: {
          vendorId,
          vendorType,
          insightType,
          executionTime,
          cached: true,
          lastUpdated: quickInsights.lastUpdated,
          tier: userContext.tier,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': executionTime.toString(),
          'X-Insight-Type': insightType,
          'Cache-Control': 'private, max-age=300', // 5 minutes
        },
      },
    );
  } catch (error) {
    console.error('Quick insights error:', error);
    const executionTime = Date.now() - startTime;

    return NextResponse.json(
      { error: 'Failed to retrieve insights' },
      {
        status: 500,
        headers: {
          'X-Response-Time': executionTime.toString(),
        },
      },
    );
  }
}

// Helper functions

async function validateAuthToken(token: string): Promise<{
  success: boolean;
  userId?: string;
  organizationId?: string;
  tier?: string;
}> {
  try {
    // In production, properly verify JWT
    const payload = JSON.parse(atob(token.split('.')[1]));

    return {
      success: true,
      userId: payload.userId,
      organizationId: payload.organizationId,
      tier: payload.tier || 'free',
    };
  } catch {
    return { success: false };
  }
}

async function hasVendorAccess(
  organizationId: string,
  vendorId: string,
): Promise<boolean> {
  // In production, verify vendor belongs to organization
  return true;
}

function getTierPermissions(tier: string): {
  canAccessInsights: boolean;
  cacheTime: number;
  maxAnalysisDepth: string;
  includeForecasting: boolean;
  includeBenchmarking: boolean;
} {
  const permissions = {
    free: {
      canAccessInsights: false,
      cacheTime: 3600,
      maxAnalysisDepth: 'basic',
      includeForecasting: false,
      includeBenchmarking: false,
    },
    starter: {
      canAccessInsights: false,
      cacheTime: 1800,
      maxAnalysisDepth: 'basic',
      includeForecasting: false,
      includeBenchmarking: false,
    },
    professional: {
      canAccessInsights: true,
      cacheTime: 900,
      maxAnalysisDepth: 'detailed',
      includeForecasting: true,
      includeBenchmarking: false,
    },
    scale: {
      canAccessInsights: true,
      cacheTime: 600,
      maxAnalysisDepth: 'comprehensive',
      includeForecasting: true,
      includeBenchmarking: true,
    },
    enterprise: {
      canAccessInsights: true,
      cacheTime: 300,
      maxAnalysisDepth: 'comprehensive',
      includeForecasting: true,
      includeBenchmarking: true,
    },
  };

  return permissions[tier as keyof typeof permissions] || permissions.free;
}

function generateInsightsCacheKey(request: WeddingInsightsRequest): string {
  const keyParts = [
    'wedding_insights',
    request.vendorId,
    request.vendorType,
    request.analysisType,
    request.timeframe?.years || 'default',
    request.competitors?.sort().join(',') || 'none',
    request.marketSegment ? JSON.stringify(request.marketSegment) : 'none',
  ];

  return keyParts.join(':');
}

async function generateWeddingInsights(
  request: WeddingInsightsRequest,
  userContext: any,
): Promise<any> {
  const results: any = {
    data: {},
    recommendations: [],
    seasonalContext: {},
    marketPosition: {},
    dataQuality: 0.85,
    confidenceLevel: 0.8,
  };

  try {
    // Get base wedding metrics
    const weddingMetrics = await weddingBI.calculateWeddingMetrics(
      request.vendorId,
      {
        startDate: new Date(
          Date.now() -
            (request.timeframe?.years || 2) * 365 * 24 * 60 * 60 * 1000,
        ),
        endDate: new Date(),
        timezone: 'UTC',
      },
    );

    results.data.baseMetrics = weddingMetrics;

    // Generate insights based on analysis type
    switch (request.analysisType) {
      case 'seasonal':
        results.data.seasonal = await weddingBI.analyzeSeasonalPatterns(
          request.vendorId,
          request.timeframe?.years || 2,
        );
        results.seasonalContext = generateSeasonalContext(
          results.data.seasonal,
        );
        break;

      case 'forecast':
        if (getTierPermissions(userContext.tier).includeForecasting) {
          results.forecasts = await weddingBI.predictBookingTrends(
            request.vendorId,
            request.timeframe?.forecastPeriod || 12,
          );
        }
        break;

      case 'benchmark':
        if (
          request.competitors &&
          getTierPermissions(userContext.tier).includeBenchmarking
        ) {
          results.benchmarks = await weddingBI.benchmarkPerformance(
            request.vendorId,
            request.competitors,
          );
          results.marketPosition = results.benchmarks.vendorPosition;
        }
        break;

      case 'market_trends':
        if (request.marketSegment) {
          results.data.marketTrends = await weddingBI.generateMarketInsights(
            request.marketSegment,
          );
        }
        break;

      case 'comprehensive':
        // All insights for enterprise tier
        if (userContext.tier === 'enterprise' || userContext.tier === 'scale') {
          const [seasonal, forecasts, marketTrends] = await Promise.all([
            weddingBI.analyzeSeasonalPatterns(request.vendorId, 2),
            weddingBI.predictBookingTrends(request.vendorId, 12),
            request.marketSegment
              ? weddingBI.generateMarketInsights(request.marketSegment)
              : null,
          ]);

          results.data.seasonal = seasonal;
          results.forecasts = forecasts;
          results.data.marketTrends = marketTrends;
          results.seasonalContext = generateSeasonalContext(seasonal);
        }
        break;
    }

    // Generate vendor-type specific recommendations
    results.recommendations = generateVendorRecommendations(
      request.vendorType,
      results.data,
      results.seasonalContext,
    );

    // Calculate overall data quality and confidence
    results.dataQuality = calculateDataQuality(weddingMetrics);
    results.confidenceLevel = calculateConfidenceLevel(
      results.data,
      request.analysisType,
    );

    return results;
  } catch (error) {
    console.error('Error generating wedding insights:', error);
    throw error;
  }
}

function generateSeasonalContext(seasonalData: any): any {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  return {
    currentSeason: getCurrentSeason(currentMonth),
    isPeakSeason: currentMonth >= 5 && currentMonth <= 9,
    peakMonths: [5, 6, 7, 8, 9],
    lowSeasons: [12, 1, 2, 3],
    shoulderSeasons: [4, 10, 11],
    seasonalMultiplier: getSeasonalMultiplier(currentMonth),
    nextSeasonStart: getNextSeasonStart(currentMonth),
    recommendations: getSeasonalRecommendations(currentMonth),
  };
}

function generateVendorRecommendations(
  vendorType: string,
  data: any,
  seasonalContext: any,
): any[] {
  const recommendations: any[] = [];

  // Base recommendations for all vendor types
  if (seasonalContext.isPeakSeason) {
    recommendations.push({
      type: 'seasonal_optimization',
      priority: 'high',
      title: 'Peak Season Strategy',
      description: 'Maximize revenue during peak wedding season',
      actions: [
        'Increase pricing by 15-25%',
        'Optimize scheduling for maximum capacity',
        'Focus on efficiency and quality delivery',
      ],
    });
  }

  // Vendor-specific recommendations
  switch (vendorType) {
    case 'photographer':
      recommendations.push({
        type: 'service_expansion',
        priority: 'medium',
        title: 'Photography Service Expansion',
        description:
          'Consider expanding service offerings based on market trends',
        actions: [
          'Add engagement session packages',
          'Offer same-day highlight reels',
          'Create social media content packages',
        ],
      });
      break;

    case 'venue':
      recommendations.push({
        type: 'capacity_optimization',
        priority: 'high',
        title: 'Venue Capacity Optimization',
        description: 'Optimize venue scheduling and pricing',
        actions: [
          'Implement dynamic pricing for peak dates',
          'Offer off-season packages',
          'Create all-inclusive packages',
        ],
      });
      break;

    case 'florist':
      recommendations.push({
        type: 'seasonal_products',
        priority: 'medium',
        title: 'Seasonal Flower Strategy',
        description: 'Align flower offerings with seasonal availability',
        actions: [
          'Promote seasonal flower packages',
          'Create preservation services',
          'Offer sustainable/local options',
        ],
      });
      break;

    case 'planner':
      recommendations.push({
        type: 'service_packages',
        priority: 'high',
        title: 'Wedding Planning Packages',
        description: 'Optimize service packages for different client needs',
        actions: [
          'Create tiered service packages',
          'Offer day-of coordination',
          'Provide vendor relationship benefits',
        ],
      });
      break;
  }

  return recommendations;
}

async function getQuickInsights(
  vendorId: string,
  vendorType: string,
  insightType: string,
): Promise<any> {
  const supabase = createSupabaseServiceClient();

  try {
    const insights: any = {
      lastUpdated: new Date().toISOString(),
      type: insightType,
    };

    switch (insightType) {
      case 'overview':
        // Get basic overview metrics
        const { data: clients } = await supabase
          .from('clients')
          .select('id, wedding_date, budget, created_at')
          .eq('organization_id', vendorId);

        if (clients) {
          insights.totalClients = clients.length;
          insights.upcomingWeddings = clients.filter(
            (c) => c.wedding_date && new Date(c.wedding_date) > new Date(),
          ).length;
          insights.averageBudget =
            clients.reduce((sum, c) => sum + (c.budget || 0), 0) /
            (clients.length || 1);
        }
        break;

      case 'seasonal':
        insights.currentSeason = getCurrentSeason(new Date().getMonth() + 1);
        insights.isPeakSeason = isPeakSeason();
        insights.seasonalTip = getSeasonalTip(vendorType);
        break;

      case 'performance':
        // Mock performance data
        insights.monthlyGrowth =
          Math.round((Math.random() - 0.3) * 20 * 100) / 100;
        insights.satisfactionScore =
          Math.round((Math.random() * 2 + 8) * 10) / 10;
        insights.efficiency = Math.round((Math.random() * 0.3 + 0.7) * 100);
        break;
    }

    return insights;
  } catch (error) {
    console.error('Error getting quick insights:', error);
    return {
      error: 'Unable to load insights',
      lastUpdated: new Date().toISOString(),
      type: insightType,
    };
  }
}

function getRateLimitInfo(
  tier: string,
  endpoint: string,
): { limit: number; remaining: number } {
  const limits: Record<string, Record<string, number>> = {
    free: { insights: 2 },
    starter: { insights: 10 },
    professional: { insights: 50 },
    scale: { insights: 200 },
    enterprise: { insights: 1000 },
  };

  const limit = limits[tier]?.[endpoint] || 2;
  return {
    limit,
    remaining: Math.floor(limit * 0.7), // Mock remaining
  };
}

function calculateDataQuality(metrics: any): number {
  // Calculate data quality based on completeness and recency
  let quality = 0.5; // Base quality

  if (metrics.totalClients > 10) quality += 0.2;
  if (metrics.totalClients > 50) quality += 0.1;
  if (metrics.operationalMetrics.totalBookings > 5) quality += 0.1;
  if (metrics.customerMetrics.customerSatisfactionScore > 0) quality += 0.1;

  return Math.min(quality, 1.0);
}

function calculateConfidenceLevel(data: any, analysisType: string): number {
  // Calculate confidence based on data volume and analysis complexity
  let confidence = 0.6; // Base confidence

  if (analysisType === 'seasonal' && data.seasonal) confidence += 0.2;
  if (analysisType === 'forecast') confidence += 0.1; // Forecasts are inherently less certain
  if (analysisType === 'benchmark' && data.benchmarks) confidence += 0.15;

  return Math.min(confidence, 0.95); // Max 95% confidence
}

// Utility functions for seasonal analysis
function getCurrentSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

function getSeasonalMultiplier(month: number): number {
  // Peak season multipliers for wedding industry
  const multipliers: Record<number, number> = {
    1: 0.6,
    2: 0.7,
    3: 0.9,
    4: 1.2,
    5: 1.4,
    6: 1.5,
    7: 1.5,
    8: 1.4,
    9: 1.3,
    10: 1.1,
    11: 0.8,
    12: 0.7,
  };

  return multipliers[month] || 1.0;
}

function getNextSeasonStart(currentMonth: number): Date {
  const nextSeason = currentMonth < 5 ? 5 : 12; // Next peak season or low season
  const nextYear =
    nextSeason === 12 ? new Date().getFullYear() : new Date().getFullYear();
  return new Date(nextYear, nextSeason - 1, 1);
}

function getSeasonalRecommendations(month: number): string[] {
  if (month >= 5 && month <= 9) {
    return [
      'Peak season - maximize capacity and pricing',
      'Focus on operational efficiency',
      'Prepare for high demand periods',
    ];
  } else if (month >= 10 && month <= 11) {
    return [
      'Shoulder season - focus on fall weddings',
      "Plan for next year's peak season",
      'Consider off-season promotions',
    ];
  } else {
    return [
      'Low season - focus on planning and preparation',
      'Offer off-season discounts',
      'Invest in marketing for next year',
    ];
  }
}

function isPeakSeason(): boolean {
  const month = new Date().getMonth() + 1;
  return month >= 5 && month <= 9;
}

function getSeasonalTip(vendorType: string): string {
  const month = new Date().getMonth() + 1;
  const isPeak = month >= 5 && month <= 9;

  const tips = {
    photographer: isPeak
      ? 'Peak season: Focus on quick turnaround and quality delivery'
      : 'Off-season: Perfect time for engagement shoots and planning',
    venue: isPeak
      ? 'High demand period: Implement premium pricing strategies'
      : 'Plan maintenance and improvements for next season',
    florist: isPeak
      ? 'Busy season: Ensure sufficient inventory and delivery capacity'
      : 'Prepare for next season: Plan flower sourcing and partnerships',
    planner: isPeak
      ? 'Wedding season: Maximize efficiency and client satisfaction'
      : 'Planning season: Focus on next year bookings and vendor relationships',
    caterer: isPeak
      ? 'Peak catering season: Focus on menu efficiency and quality'
      : 'Menu development time: Create new offerings for next season',
    other: isPeak
      ? 'Peak wedding season: Optimize operations and pricing'
      : 'Perfect time for business development and planning',
  };

  return tips[vendorType as keyof typeof tips] || tips.other;
}
