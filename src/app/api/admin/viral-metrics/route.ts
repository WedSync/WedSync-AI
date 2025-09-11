import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-admin';
import {
  AdvancedViralCalculator,
  EnhancedViralCoefficient,
} from '@/lib/analytics/advanced-viral-calculator';
import {
  WeddingViralAnalyzer,
  CohortViralData,
} from '@/lib/analytics/wedding-viral-analyzer';
import {
  ViralOptimizationEngine,
  BottleneckAnalysis,
} from '@/lib/analytics/viral-optimization-engine';

// Response interfaces matching the specification
interface ViralMetricsResponse {
  enhanced: EnhancedViralCoefficient;
  historical: ViralTrendData[];
  loops: ViralLoopData[];
  seasonal: SeasonalAdjustments;
  cohorts: CohortViralData[];
  metadata: {
    calculatedAt: string;
    dataQuality: number;
    confidenceScore: number;
  };
}

interface ViralTrendData {
  date: string;
  coefficient: number;
  adjustedCoefficient: number;
  userCount: number;
  invitationRate: number;
  activationRate: number;
}

interface ViralLoopData {
  type: string;
  count: number;
  conversionRate: number;
  revenue: number;
  efficiency: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface SeasonalAdjustments {
  currentSeason: 'peak' | 'shoulder' | 'off';
  seasonalMultiplier: number;
  monthlyFactors: Record<string, number>;
  recommendations: string[];
}

// Validation schemas
const timeframeSchema = ['7d', '30d', '90d', '1y'] as const;
type Timeframe = (typeof timeframeSchema)[number];

// Initialize services
const viralCalculator = new AdvancedViralCalculator();
const weddingAnalyzer = new WeddingViralAnalyzer();
const optimizationEngine = new ViralOptimizationEngine();

// Authentication middleware
async function verifyAdminAccess(
  request: NextRequest,
): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const supabase = supabaseAdmin;

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { isAdmin: false };
    }

    const token = authHeader.substring(7);

    // Verify the JWT token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return { isAdmin: false };
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false };
    }

    const isAdmin =
      profile.role === 'admin' ||
      profile.role === 'super_admin' ||
      profile.permissions?.includes('admin_analytics');

    return { isAdmin, userId: user.id };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isAdmin: false };
  }
}

// GET /api/admin/viral-metrics
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { isAdmin, userId } = await verifyAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as Timeframe) || '30d';
    const vendorTypeFilter = searchParams.get('vendorTypes')?.split(',');
    const includeHistorical = searchParams.get('includeHistorical') === 'true';
    const includeCohorts = searchParams.get('includeCohorts') === 'true';

    // Validate timeframe
    if (!timeframeSchema.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: 7d, 30d, 90d, 1y' },
        { status: 400 },
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Calculate enhanced viral metrics
    const enhanced = await viralCalculator.calculateEnhanced({
      start: startDate,
      end: endDate,
    });

    // Calculate historical trends if requested
    let historical: ViralTrendData[] = [];
    if (includeHistorical) {
      historical = await calculateHistoricalTrends(startDate, endDate);
    }

    // Process viral loops data
    const loops: ViralLoopData[] = await Promise.all(
      enhanced.loops.map(async (loop) => ({
        type: loop.type,
        count: loop.count,
        conversionRate: loop.conversionRate,
        revenue: loop.revenue,
        efficiency: loop.conversionRate * loop.quality * loop.amplification,
        trend: await determineLoopTrend(loop.type, timeframe),
      })),
    );

    // Calculate seasonal adjustments
    const seasonal: SeasonalAdjustments = {
      currentSeason: getCurrentSeason(),
      seasonalMultiplier: enhanced.weddingSeasonMultiplier,
      monthlyFactors: getMonthlySeasonalFactors(),
      recommendations: await getSeasonalRecommendations(enhanced),
    };

    // Get cohort data if requested
    let cohorts: CohortViralData[] = [];
    if (includeCohorts) {
      cohorts = await getCohortViralData(startDate, endDate);
    }

    // Calculate metadata
    const metadata = {
      calculatedAt: new Date().toISOString(),
      dataQuality: await calculateDataQuality(enhanced),
      confidenceScore: await calculateConfidenceScore(enhanced, timeframe),
    };

    const response: ViralMetricsResponse = {
      enhanced,
      historical,
      loops,
      seasonal,
      cohorts,
      metadata,
    };

    // Log admin access for audit trail
    await logAdminAccess(userId!, 'viral_metrics_view', {
      timeframe,
      vendorTypeFilter,
      includeHistorical,
      includeCohorts,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Viral metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error calculating viral metrics' },
      { status: 500 },
    );
  }
}

// Helper functions
async function calculateHistoricalTrends(
  startDate: Date,
  endDate: Date,
): Promise<ViralTrendData[]> {
  const trends: ViralTrendData[] = [];
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const intervals = Math.min(30, daysDiff); // Max 30 data points
  const intervalDays = Math.floor(daysDiff / intervals);

  for (let i = 0; i < intervals; i++) {
    const intervalStart = new Date(
      startDate.getTime() + i * intervalDays * 24 * 60 * 60 * 1000,
    );
    const intervalEnd = new Date(
      startDate.getTime() + (i + 1) * intervalDays * 24 * 60 * 60 * 1000,
    );

    try {
      const metrics = await viralCalculator.calculateEnhanced({
        start: intervalStart,
        end: intervalEnd,
      });

      // Get user count for this interval
      const supabase = supabaseAdmin;
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', intervalStart.toISOString())
        .lte('created_at', intervalEnd.toISOString());

      trends.push({
        date: intervalStart.toISOString().split('T')[0],
        coefficient: metrics.coefficient,
        adjustedCoefficient: metrics.adjustedCoefficient,
        userCount: userCount || 0,
        invitationRate: metrics.invitationRate,
        activationRate: metrics.activationRate,
      });
    } catch (error) {
      console.warn(`Failed to calculate metrics for interval ${i}:`, error);
      // Add placeholder data to maintain timeline consistency
      trends.push({
        date: intervalStart.toISOString().split('T')[0],
        coefficient: 0,
        adjustedCoefficient: 0,
        userCount: 0,
        invitationRate: 0,
        activationRate: 0,
      });
    }
  }

  return trends;
}

async function determineLoopTrend(
  loopType: string,
  timeframe: Timeframe,
): Promise<'improving' | 'stable' | 'declining'> {
  try {
    const supabase = supabaseAdmin;

    // Get recent performance
    const recentEnd = new Date();
    const recentStart = new Date(
      recentEnd.getTime() - 14 * 24 * 60 * 60 * 1000,
    ); // Last 2 weeks

    // Get older performance for comparison
    const olderEnd = recentStart;
    const olderStart = new Date(olderEnd.getTime() - 14 * 24 * 60 * 60 * 1000); // Previous 2 weeks

    const { data: recentMetrics } = await supabase
      .from('viral_loop_metrics')
      .select('conversion_rate')
      .eq('loop_type', loopType)
      .gte('start_date', recentStart.toISOString())
      .lte('end_date', recentEnd.toISOString())
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    const { data: olderMetrics } = await supabase
      .from('viral_loop_metrics')
      .select('conversion_rate')
      .eq('loop_type', loopType)
      .gte('start_date', olderStart.toISOString())
      .lte('end_date', olderEnd.toISOString())
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (!recentMetrics || !olderMetrics) return 'stable';

    const improvement =
      (recentMetrics.conversion_rate - olderMetrics.conversion_rate) /
      olderMetrics.conversion_rate;

    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'declining';
    return 'stable';
  } catch (error) {
    console.warn('Failed to determine loop trend:', error);
    return 'stable';
  }
}

function getCurrentSeason(): 'peak' | 'shoulder' | 'off' {
  const month = new Date().getMonth() + 1;
  if ([5, 6, 7, 8, 9].includes(month)) return 'peak';
  if ([4, 10].includes(month)) return 'shoulder';
  return 'off';
}

function getMonthlySeasonalFactors(): Record<string, number> {
  return {
    January: 0.6,
    February: 0.7,
    March: 0.8,
    April: 1.1,
    May: 1.4,
    June: 1.5,
    July: 1.5,
    August: 1.4,
    September: 1.3,
    October: 1.1,
    November: 0.7,
    December: 0.6,
  };
}

async function getSeasonalRecommendations(
  metrics: EnhancedViralCoefficient,
): Promise<string[]> {
  const currentSeason = getCurrentSeason();
  const recommendations: string[] = [];

  switch (currentSeason) {
    case 'peak':
      recommendations.push(
        'Focus on quality over quantity - peak season drives natural virality',
      );
      recommendations.push(
        'Leverage vendor collaboration opportunities during busy wedding season',
      );
      if (metrics.qualityScore < 0.7) {
        recommendations.push(
          'Implement referral quality filters to maintain high standards',
        );
      }
      break;

    case 'shoulder':
      recommendations.push(
        'Invest in relationship building - vendors have more available time',
      );
      recommendations.push(
        'Prepare viral acceleration strategies for upcoming peak season',
      );
      if (metrics.invitationRate < 0.8) {
        recommendations.push(
          'Launch engagement campaigns to boost referral activity',
        );
      }
      break;

    case 'off':
      recommendations.push(
        'Focus on vendor acquisition and platform improvements',
      );
      recommendations.push('Build anticipation for upcoming wedding season');
      recommendations.push(
        'Implement major viral optimization features while activity is lower',
      );
      break;
  }

  return recommendations;
}

async function getCohortViralData(
  startDate: Date,
  endDate: Date,
): Promise<CohortViralData[]> {
  const cohorts: CohortViralData[] = [];

  // Generate monthly cohorts for the date range
  const currentDate = new Date(startDate);
  currentDate.setDate(1); // First day of month

  while (currentDate <= endDate) {
    try {
      const cohortData =
        await weddingAnalyzer.analyzeWeddingCohortVirality(currentDate);
      cohorts.push(cohortData);
    } catch (error) {
      console.warn(
        `Failed to analyze cohort for ${currentDate.toISOString()}:`,
        error,
      );
    }

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return cohorts.sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth));
}

async function calculateDataQuality(
  metrics: EnhancedViralCoefficient,
): Promise<number> {
  let qualityScore = 1.0;

  // Reduce quality score for missing or low-quality data
  if (metrics.loops.length === 0) qualityScore -= 0.3;
  if (metrics.vendorTypeBreakdown.length < 3) qualityScore -= 0.2;
  if (metrics.geographicSpread.length < 2) qualityScore -= 0.2;
  if (metrics.qualityScore < 0.5) qualityScore -= 0.1;
  if (metrics.coefficient === 0) qualityScore -= 0.4;

  return Math.max(0.1, qualityScore);
}

async function calculateConfidenceScore(
  metrics: EnhancedViralCoefficient,
  timeframe: Timeframe,
): Promise<number> {
  let confidence = 0.8; // Base confidence

  // Adjust based on data recency
  const timeframeMultiplier = {
    '7d': 0.9, // Very recent data
    '30d': 0.8, // Recent data
    '90d': 0.7, // Somewhat old data
    '1y': 0.6, // Old data
  }[timeframe];

  confidence *= timeframeMultiplier;

  // Adjust based on sample size (loop count)
  const totalLoopCount = metrics.loops.reduce(
    (sum, loop) => sum + loop.count,
    0,
  );
  if (totalLoopCount < 50) confidence -= 0.2;
  else if (totalLoopCount < 100) confidence -= 0.1;

  // Adjust based on data consistency
  if (metrics.velocityTrend === 'stable') confidence += 0.05;
  else if (metrics.velocityTrend === 'accelerating') confidence += 0.03;
  else confidence -= 0.03; // decelerating

  return Math.max(0.3, Math.min(0.95, confidence));
}

async function logAdminAccess(
  userId: string,
  action: string,
  parameters: any,
): Promise<void> {
  try {
    const supabase = supabaseAdmin;
    await supabase.from('admin_audit_log').insert({
      user_id: userId,
      action,
      resource: 'viral_metrics',
      parameters,
      timestamp: new Date().toISOString(),
      ip_address: '0.0.0.0', // Would be extracted from request in production
      user_agent: 'api_request',
    });
  } catch (error) {
    console.warn('Failed to log admin access:', error);
    // Don't throw error - logging failure shouldn't break the main functionality
  }
}
