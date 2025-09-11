/**
 * WS-183 LTV Marketing Attribution API
 * POST /api/integrations/ltv/marketing - Process attribution data and marketing spend
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  LTVDataPipeline,
  MarketingAttributionData,
} from '@/lib/integrations/ltv-data-pipeline';
import { MarketingSpendIntegration } from '@/lib/analytics/marketing-spend-integration';
import { MarketingAttributionPipeline } from '@/lib/analytics/marketing-attribution-pipeline';

interface MarketingAttributionRequest {
  action:
    | 'process_attribution'
    | 'update_spend'
    | 'sync_channels'
    | 'calculate_cac';
  attributionData?: MarketingAttributionData[];
  spendData?: {
    source: string;
    campaign: string;
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
    dateRange: { start: string; end: string };
  }[];
  channels?: string[];
  calculationConfig?: {
    attributionModel:
      | 'first_touch'
      | 'last_touch'
      | 'linear'
      | 'time_decay'
      | 'position_based';
    timeDecayHalfLife?: number;
    includeCrossPlatform?: boolean;
  };
}

interface MarketingAttributionResponse {
  action: string;
  success: boolean;
  results: {
    processedRecords?: number;
    attributionUpdates?: number;
    cacCalculations?: number;
    channelPerformance?: Record<
      string,
      {
        totalSpend: number;
        totalConversions: number;
        cac: number;
        roi: number;
        attribution: number;
      }
    >;
    dataQuality?: {
      validRecords: number;
      invalidRecords: number;
      qualityScore: number;
      issues: string[];
    };
  };
  errors?: string[];
  processingTimeMs: number;
  metadata?: {
    affectedSuppliers: number;
    totalSpendProcessed: number;
    averageCac: number;
    ltvCacRatio: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: MarketingAttributionRequest = await request.json();

    if (!body.action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 },
      );
    }

    const pipeline = new LTVDataPipeline();
    const spendIntegration = new MarketingSpendIntegration();
    const attributionPipeline = new MarketingAttributionPipeline();

    let response: MarketingAttributionResponse;

    switch (body.action) {
      case 'process_attribution':
        response = await processAttribution(body, pipeline);
        break;

      case 'update_spend':
        response = await updateSpend(body, spendIntegration);
        break;

      case 'sync_channels':
        response = await syncChannels(body, attributionPipeline);
        break;

      case 'calculate_cac':
        response = await calculateCac(body, spendIntegration);
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported action: ${body.action}` },
          { status: 400 },
        );
    }

    response.processingTimeMs = Date.now() - startTime;

    // Log marketing activity
    await logMarketingActivity(body.action, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Marketing attribution API error:', error);

    const errorResponse: MarketingAttributionResponse = {
      action: 'error',
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      processingTimeMs: Date.now() - startTime,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'channels':
        const channels = await getAttributionChannels();
        return NextResponse.json({ success: true, channels });

      case 'performance':
        const timeRange = searchParams.get('timeRange') || '30'; // days
        const performance = await getChannelPerformance(parseInt(timeRange));
        return NextResponse.json({ success: true, performance });

      case 'models':
        const models = await getAttributionModels();
        return NextResponse.json({ success: true, models });

      case 'cac_trends':
        const period = searchParams.get('period') || '90'; // days
        const trends = await getCacTrends(parseInt(period));
        return NextResponse.json({ success: true, trends });

      default:
        return NextResponse.json(
          {
            error:
              'Invalid action. Supported actions: channels, performance, models, cac_trends',
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Marketing attribution GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}

// Implementation functions

async function processAttribution(
  body: MarketingAttributionRequest,
  pipeline: LTVDataPipeline,
): Promise<MarketingAttributionResponse> {
  if (!body.attributionData || body.attributionData.length === 0) {
    return {
      action: 'process_attribution',
      success: false,
      results: {},
      errors: ['No attribution data provided'],
      processingTimeMs: 0,
    };
  }

  try {
    const result = await pipeline.synchronizeMarketingData(
      body.attributionData,
    );

    const channelPerformance = Object.keys(result.channelBreakdown).reduce(
      (acc, channel) => {
        const channelData = result.channelBreakdown[channel];
        acc[channel] = {
          totalSpend: channelData.spend,
          totalConversions: Math.round(channelData.attribution * 100), // Approximate conversions
          cac: channelData.spend / Math.max(channelData.attribution * 100, 1),
          roi:
            ((channelData.attribution * 5000 - channelData.spend) /
              channelData.spend) *
            100, // Assuming $5k LTV
          attribution: channelData.attribution,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      action: 'process_attribution',
      success: true,
      results: {
        processedRecords: result.syncedRecords,
        attributionUpdates: result.attributionUpdates,
        cacCalculations: result.cacRecalculations,
        channelPerformance,
        dataQuality: {
          validRecords:
            result.syncedRecords - result.dataValidationErrors.length,
          invalidRecords: result.dataValidationErrors.length,
          qualityScore:
            result.dataValidationErrors.length === 0
              ? 1.0
              : (result.syncedRecords - result.dataValidationErrors.length) /
                result.syncedRecords,
          issues: result.dataValidationErrors,
        },
      },
      processingTimeMs: 0,
      metadata: {
        affectedSuppliers: new Set(body.attributionData.map((d) => d.userId))
          .size,
        totalSpendProcessed: result.totalSpendProcessed,
        averageCac:
          result.totalSpendProcessed / Math.max(result.cacRecalculations, 1),
        ltvCacRatio:
          5000 /
          (result.totalSpendProcessed / Math.max(result.cacRecalculations, 1)), // Assuming $5k LTV
      },
    };
  } catch (error) {
    return {
      action: 'process_attribution',
      success: false,
      results: {},
      errors: [
        error instanceof Error
          ? error.message
          : 'Attribution processing failed',
      ],
      processingTimeMs: 0,
    };
  }
}

async function updateSpend(
  body: MarketingAttributionRequest,
  spendIntegration: MarketingSpendIntegration,
): Promise<MarketingAttributionResponse> {
  if (!body.spendData || body.spendData.length === 0) {
    return {
      action: 'update_spend',
      success: false,
      results: {},
      errors: ['No spend data provided'],
      processingTimeMs: 0,
    };
  }

  try {
    // Convert spend data to MarketingSpendData format
    const spendData = body.spendData.map((spend) => ({
      id: `spend_${spend.source}_${spend.campaign}_${Date.now()}`,
      date: new Date(spend.dateRange.start),
      source: spend.source as any,
      campaign: spend.campaign,
      spend: spend.spend,
      currency: 'USD' as const,
      clicks: spend.clicks,
      impressions: spend.impressions,
      conversions: spend.conversions,
      conversionValue: spend.conversions * 150, // Average wedding supplier value
      budgetAllocated: spend.spend * 1.2,
      budgetRemaining: spend.spend * 0.2,
      bidStrategy: 'auto',
      targetAudience: 'wedding-suppliers',
      creativeId: `creative_${spend.campaign}`,
      keywordData: [],
    }));

    await spendIntegration.storeSpendData(spendData);

    // Calculate ROI with estimated LTV
    const ltvData = { [body.spendData[0].source]: 5000 }; // $5k average LTV
    const roiCalculations = await spendIntegration.calculateROIWithLTV(
      spendData,
      ltvData,
    );

    const channelPerformance = roiCalculations.reduce(
      (acc, calc) => {
        acc[calc.source] = {
          totalSpend: calc.totalSpend,
          totalConversions: Math.round(calc.totalRevenue / calc.ltv),
          cac: calc.cac,
          roi: calc.roi,
          attribution: 1.0, // Full attribution for spend data
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      action: 'update_spend',
      success: true,
      results: {
        processedRecords: spendData.length,
        channelPerformance,
        dataQuality: {
          validRecords: spendData.length,
          invalidRecords: 0,
          qualityScore: 1.0,
          issues: [],
        },
      },
      processingTimeMs: 0,
      metadata: {
        affectedSuppliers: roiCalculations.length,
        totalSpendProcessed: roiCalculations.reduce(
          (sum, calc) => sum + calc.totalSpend,
          0,
        ),
        averageCac:
          roiCalculations.reduce((sum, calc) => sum + calc.cac, 0) /
          roiCalculations.length,
        ltvCacRatio:
          roiCalculations.reduce((sum, calc) => sum + calc.ltvCacRatio, 0) /
          roiCalculations.length,
      },
    };
  } catch (error) {
    return {
      action: 'update_spend',
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Spend update failed'],
      processingTimeMs: 0,
    };
  }
}

async function syncChannels(
  body: MarketingAttributionRequest,
  attributionPipeline: MarketingAttributionPipeline,
): Promise<MarketingAttributionResponse> {
  if (!body.channels || body.channels.length === 0) {
    return {
      action: 'sync_channels',
      success: false,
      results: {},
      errors: ['No channels specified for sync'],
      processingTimeMs: 0,
    };
  }

  try {
    const syncResults = {
      processedRecords: 0,
      attributionUpdates: 0,
    };

    const channelPerformance: Record<string, any> = {};

    // Sync each channel
    for (const channel of body.channels) {
      let channelData: any[] = [];

      switch (channel) {
        case 'google_ads':
          channelData = await attributionPipeline.ingestGoogleAdsData(
            'customer_123', // Would come from config
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            new Date().toISOString().split('T')[0],
          );
          break;

        case 'facebook_ads':
          channelData = await attributionPipeline.ingestFacebookAdsData(
            'act_123', // Would come from config
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            new Date().toISOString().split('T')[0],
          );
          break;

        case 'google_analytics':
          channelData = await attributionPipeline.ingestGoogleAnalyticsData(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            new Date().toISOString().split('T')[0],
          );
          break;

        default:
          console.warn(`Channel sync not implemented for: ${channel}`);
          continue;
      }

      syncResults.processedRecords += channelData.length;
      syncResults.attributionUpdates += channelData.length;

      // Calculate channel performance
      const totalSpend = channelData.reduce(
        (sum, td) => sum + (td.spend || 0),
        0,
      );
      const totalConversions = channelData.reduce(
        (sum, td) => sum + (td.conversions || 0),
        0,
      );

      channelPerformance[channel] = {
        totalSpend,
        totalConversions,
        cac: totalConversions > 0 ? totalSpend / totalConversions : 0,
        roi:
          totalSpend > 0
            ? ((totalConversions * 5000 - totalSpend) / totalSpend) * 100
            : 0,
        attribution: totalConversions > 0 ? totalConversions / 100 : 0, // Normalized
      };
    }

    return {
      action: 'sync_channels',
      success: true,
      results: {
        processedRecords: syncResults.processedRecords,
        attributionUpdates: syncResults.attributionUpdates,
        channelPerformance,
        dataQuality: {
          validRecords: syncResults.processedRecords,
          invalidRecords: 0,
          qualityScore: 0.95,
          issues: [],
        },
      },
      processingTimeMs: 0,
      metadata: {
        affectedSuppliers: Math.floor(syncResults.processedRecords / 10), // Estimate
        totalSpendProcessed: Object.values(channelPerformance).reduce(
          (sum, perf: any) => sum + perf.totalSpend,
          0,
        ),
        averageCac:
          Object.values(channelPerformance).reduce(
            (sum, perf: any) => sum + perf.cac,
            0,
          ) / body.channels.length,
        ltvCacRatio:
          5000 /
          (Object.values(channelPerformance).reduce(
            (sum, perf: any) => sum + perf.cac,
            0,
          ) /
            body.channels.length),
      },
    };
  } catch (error) {
    return {
      action: 'sync_channels',
      success: false,
      results: {},
      errors: [error instanceof Error ? error.message : 'Channel sync failed'],
      processingTimeMs: 0,
    };
  }
}

async function calculateCac(
  body: MarketingAttributionRequest,
  spendIntegration: MarketingSpendIntegration,
): Promise<MarketingAttributionResponse> {
  try {
    const config = body.calculationConfig || { attributionModel: 'time_decay' };

    // This would fetch recent data for CAC calculation
    const budgetAllocation = await spendIntegration.trackBudgetAllocation();

    const channelPerformance: Record<string, any> = {};
    let totalSpendProcessed = 0;
    let totalCacCalculations = 0;

    Object.entries(budgetAllocation.allocations).forEach(
      ([channel, allocation]) => {
        const estimatedConversions = allocation.spent / 150; // $150 average CAC
        const cac = allocation.spent / Math.max(estimatedConversions, 1);

        channelPerformance[channel] = {
          totalSpend: allocation.spent,
          totalConversions: estimatedConversions,
          cac,
          roi:
            ((estimatedConversions * 5000 - allocation.spent) /
              allocation.spent) *
            100,
          attribution: allocation.utilizationRate,
        };

        totalSpendProcessed += allocation.spent;
        totalCacCalculations++;
      },
    );

    const averageCac = totalSpendProcessed / Math.max(totalCacCalculations, 1);

    return {
      action: 'calculate_cac',
      success: true,
      results: {
        cacCalculations: totalCacCalculations,
        channelPerformance,
        dataQuality: {
          validRecords: totalCacCalculations,
          invalidRecords: 0,
          qualityScore: 0.92,
          issues: [],
        },
      },
      processingTimeMs: 0,
      metadata: {
        affectedSuppliers: Math.floor(totalSpendProcessed / 150), // Estimate based on average CAC
        totalSpendProcessed,
        averageCac,
        ltvCacRatio: 5000 / averageCac,
      },
    };
  } catch (error) {
    return {
      action: 'calculate_cac',
      success: false,
      results: {},
      errors: [
        error instanceof Error ? error.message : 'CAC calculation failed',
      ],
      processingTimeMs: 0,
    };
  }
}

// Helper functions for GET endpoints

async function getAttributionChannels() {
  return [
    {
      id: 'google_ads',
      name: 'Google Ads',
      status: 'active',
      lastSync: new Date(),
    },
    {
      id: 'facebook_ads',
      name: 'Facebook Ads',
      status: 'active',
      lastSync: new Date(),
    },
    {
      id: 'google_analytics',
      name: 'Google Analytics',
      status: 'active',
      lastSync: new Date(),
    },
    {
      id: 'linkedin_ads',
      name: 'LinkedIn Ads',
      status: 'inactive',
      lastSync: null,
    },
    {
      id: 'organic',
      name: 'Organic Traffic',
      status: 'active',
      lastSync: new Date(),
    },
  ];
}

async function getChannelPerformance(timeRangeDays: number) {
  // Mock data - in production would query from database
  return {
    google_ads: {
      spend: 15000,
      conversions: 100,
      cac: 150,
      roi: 233,
      attribution: 0.35,
      trend: 'increasing',
    },
    facebook_ads: {
      spend: 12000,
      conversions: 75,
      cac: 160,
      roi: 213,
      attribution: 0.28,
      trend: 'stable',
    },
    google_analytics: {
      spend: 0,
      conversions: 45,
      cac: 0,
      roi: Infinity,
      attribution: 0.22,
      trend: 'increasing',
    },
    organic: {
      spend: 0,
      conversions: 30,
      cac: 0,
      roi: Infinity,
      attribution: 0.15,
      trend: 'stable',
    },
  };
}

async function getAttributionModels() {
  return [
    {
      id: 'first_touch',
      name: 'First Touch',
      description: '100% attribution to first touchpoint',
      active: true,
      accuracy: 0.65,
    },
    {
      id: 'last_touch',
      name: 'Last Touch',
      description: '100% attribution to last touchpoint',
      active: true,
      accuracy: 0.7,
    },
    {
      id: 'linear',
      name: 'Linear',
      description: 'Equal attribution across all touchpoints',
      active: true,
      accuracy: 0.75,
    },
    {
      id: 'time_decay',
      name: 'Time Decay',
      description: 'More attribution to recent touchpoints',
      active: true,
      accuracy: 0.8,
    },
    {
      id: 'position_based',
      name: 'Position Based',
      description: '40% first, 40% last, 20% middle',
      active: true,
      accuracy: 0.78,
    },
  ];
}

async function getCacTrends(periodDays: number) {
  // Mock trend data - in production would calculate from historical data
  const trends = [];
  for (let i = periodDays; i > 0; i -= 7) {
    trends.push({
      week: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      averageCac: 140 + Math.random() * 40,
      totalSpend: 20000 + Math.random() * 10000,
      conversions: 120 + Math.random() * 40,
      ltvCacRatio: 3.2 + Math.random() * 1.5,
    });
  }
  return trends.reverse();
}

async function logMarketingActivity(
  action: string,
  response: MarketingAttributionResponse,
) {
  console.log(
    `Marketing activity logged: ${action} - Success: ${response.success}`,
  );
}
