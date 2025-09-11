import { NextRequest, NextResponse } from 'next/server';
import {
  AdvancedViralCalculator,
  ViralBottleneck,
  OptimizationRecommendation,
} from '@/lib/analytics/advanced-viral-calculator';
import { ViralOptimizationEngine } from '@/lib/analytics/viral-optimization-engine';
import { supabaseAdmin } from '@/lib/database/supabase-admin';

interface ViralBottlenecksResponse {
  bottlenecks: ViralBottleneck[];
  recommendations: OptimizationRecommendation[];
}

// Verify admin access
async function verifyAdminAccess(request: NextRequest): Promise<boolean> {
  try {
    const supabase = supabaseAdmin;
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return false;

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch {
    return false;
  }
}

async function getCohortUsers(timeframe: string): Promise<string[]> {
  const supabase = supabaseAdmin;
  const now = new Date();
  let startDate: Date;

  switch (timeframe) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', now.toISOString());

  if (error) throw new Error(`Failed to get cohort users: ${error.message}`);
  return data?.map((user) => user.id) || [];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin access
    const isAdmin = await verifyAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || '30d';
    const vendorType = searchParams.get('vendorType');

    // Get cohort users for analysis
    const cohortUsers = await getCohortUsers(timeframe);

    if (cohortUsers.length === 0) {
      return NextResponse.json({
        bottlenecks: [],
        recommendations: [
          {
            priority: 'high' as const,
            category: 'user_acquisition',
            action:
              'Focus on user acquisition - insufficient data for viral analysis',
            expectedImpact: 0,
            implementationEffort: 'high' as const,
            roi: 0,
          },
        ],
      });
    }

    // Initialize calculators
    const viralCalculator = new AdvancedViralCalculator();
    const optimizationEngine = new ViralOptimizationEngine();

    // Calculate current metrics
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const currentMetrics = await viralCalculator.calculateEnhanced({
      start: startDate,
      end: now,
    });

    // Identify bottlenecks
    console.log(
      'Identifying viral bottlenecks for cohort users:',
      cohortUsers.length,
    );
    const bottlenecks =
      await viralCalculator.identifyViralBottlenecks(cohortUsers);

    // Generate optimization recommendations
    console.log(
      'Generating optimization recommendations based on bottlenecks:',
      bottlenecks.length,
    );
    const recommendations =
      await viralCalculator.generateOptimizationRecommendations(
        currentMetrics,
        bottlenecks,
      );

    // Enrich bottlenecks with additional context
    const enrichedBottlenecks = bottlenecks.map((bottleneck) => ({
      ...bottleneck,
      affectedUsers: Math.floor(cohortUsers.length * bottleneck.impact),
      priority:
        bottleneck.impact > 0.3
          ? 'high'
          : bottleneck.impact > 0.15
            ? 'medium'
            : 'low',
      metadata: {
        analysisDate: new Date().toISOString(),
        cohortSize: cohortUsers.length,
        timeframe,
      },
    }));

    // Enrich recommendations with wedding industry context
    const enrichedRecommendations = recommendations.map((rec) => ({
      ...rec,
      weddingContext: getWeddingIndustryContext(rec.category),
      timeline: getImplementationTimeline(rec.implementationEffort),
      successMetrics: getSuccessMetrics(rec.category),
    }));

    const response: ViralBottlenecksResponse = {
      bottlenecks: enrichedBottlenecks,
      recommendations: enrichedRecommendations,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Viral bottlenecks API error:', error);

    // Handle specific error types
    if (error.message?.includes('insufficient data')) {
      return NextResponse.json({
        bottlenecks: [],
        recommendations: [
          {
            priority: 'high' as const,
            category: 'data_collection',
            action:
              'Collect more user interaction data to enable bottleneck analysis',
            expectedImpact: 0,
            implementationEffort: 'medium' as const,
            roi: 0,
          },
        ],
      });
    }

    return NextResponse.json(
      { error: 'Failed to analyze viral bottlenecks', details: error.message },
      { status: 500 },
    );
  }
}

function getWeddingIndustryContext(category: string): string {
  const contexts: { [key: string]: string } = {
    seasonal:
      'Wedding season (May-Sept) drives 70% of viral activity. Off-season requires different strategies.',
    loop_optimization:
      'Vendor-to-couple loops convert 3x better than peer-to-peer in wedding industry.',
    quality:
      'Wedding referrals are trust-based. Quality scoring prevents spam and maintains reputation.',
    targeting:
      'Wedding vendors typically serve 20-50 couples annually. Target active planning phases.',
    timing:
      'Couples plan 12-18 months ahead. Vendors book 6-12 months out. Time messaging accordingly.',
    messaging:
      'Wedding communications must be elegant and professional. Avoid generic marketing language.',
    incentive:
      'Wedding industry values relationships over discounts. Focus on exclusive access and recognition.',
    user_acquisition:
      'Wedding industry is relationship-driven. Focus on warm introductions over cold outreach.',
    data_collection:
      'Wedding data is highly sensitive. Ensure GDPR compliance and clear value exchange.',
  };

  return (
    contexts[category] ||
    'Industry-specific considerations apply to this optimization area.'
  );
}

function getImplementationTimeline(effort: string): string {
  const timelines: { [key: string]: string } = {
    low: '1-2 weeks',
    medium: '1-2 months',
    high: '3-6 months',
  };

  return timelines[effort] || 'Timeline varies based on complexity';
}

function getSuccessMetrics(category: string): string[] {
  const metrics: { [key: string]: string[] } = {
    seasonal: [
      'Viral coefficient increase >20% in off-season',
      'Year-round user acquisition consistency',
    ],
    loop_optimization: [
      'Target loop conversion rate >15%',
      'Revenue per viral user increase >30%',
    ],
    quality: [
      'Spam reports <1%',
      'User satisfaction score >4.5/5',
      'Retention rate >85%',
    ],
    targeting: [
      'Click-through rate >8%',
      'Conversion rate >12%',
      'Time to activation <7 days',
    ],
    timing: [
      'Message open rate >25%',
      'Response rate >15%',
      'Engagement within 48h >40%',
    ],
    messaging: [
      'A/B test lift >10%',
      'Brand sentiment improvement',
      'Referral quality score >0.8',
    ],
    incentive: [
      'Participation rate >20%',
      'Incremental referrals >15%',
      'ROI >2.5x',
    ],
    user_acquisition: [
      'Monthly active users growth >10%',
      'Cost per acquisition reduction >25%',
    ],
    data_collection: [
      'Data completeness >90%',
      'User consent rate >80%',
      'Analysis accuracy >95%',
    ],
  };

  return (
    metrics[category] || [
      'Engagement increase',
      'Conversion improvement',
      'ROI positive',
    ]
  );
}

// Handle unsupported methods
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for bottleneck analysis.' },
    { status: 405 },
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for bottleneck analysis.' },
    { status: 405 },
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for bottleneck analysis.' },
    { status: 405 },
  );
}
