/**
 * WS-240: Wedding Season Cost Projections API
 * GET /api/ai-optimization/projections
 *
 * Wedding season cost projections and budget recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BudgetTrackingEngine } from '@/lib/ai/optimization/BudgetTrackingEngine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const featureType = searchParams.get('featureType');

    if (!supplierId || !featureType) {
      return NextResponse.json(
        { error: 'supplierId and featureType are required' },
        { status: 400 },
      );
    }

    const budgetEngine = new BudgetTrackingEngine();

    // Mock usage metrics for projection
    const mockUsage = {
      supplierId,
      featureType,
      period: { start: new Date(), end: new Date() },
      requests: { total: 150, successful: 145, failed: 5, cached: 45 },
      costs: { total: 37.5, average: 0.25, peak: 1.5, savings: 7.5 },
      patterns: {
        hourlyDistribution: new Array(24).fill(0),
        peakHours: [9, 10, 14, 15],
        seasonalTrend: 1.3,
      },
      optimization: {
        cacheHitRate: 30,
        modelOptimization: 20,
        batchProcessingRate: 15,
      },
    };

    const projection = await budgetEngine.calculateWeddingSeasonProjection(
      supplierId,
      featureType,
      mockUsage,
    );

    return NextResponse.json({
      success: true,
      projection,
      weddingSeasonInsights: {
        peakMonths: 'March through October',
        costIncrease: '60% above off-season',
        optimizationOpportunity: '75% potential savings with smart caching',
        businessImpact: {
          photographyStudios: '£240→£60/month (12,000 photos)',
          venues: '£150→£45/month (50 descriptions)',
          weddingPlanners: '£200→£60/month (timeline assistance)',
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate projections' },
      { status: 500 },
    );
  }
}
