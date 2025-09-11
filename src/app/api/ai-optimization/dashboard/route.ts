import { NextRequest, NextResponse } from 'next/server';
import type {
  AIOptimizationDashboardData,
  AIOptimizationAPIResponse,
} from '@/types/ai-optimization';

// Mock data for development - replace with real database queries
const mockDashboardData: AIOptimizationDashboardData = {
  currentUsage: {
    id: '1',
    organizationId: '1',
    date: new Date().toISOString().split('T')[0],
    photographyAI: {
      apiCalls: 150,
      costPence: 300,
      cacheHits: 120,
      cacheMisses: 30,
    },
    contentGeneration: {
      apiCalls: 80,
      costPence: 400,
      cacheHits: 60,
      cacheMisses: 20,
      modelUsage: {
        gpt4: 20,
        gpt35: 60,
      },
    },
    chatbotInteractions: {
      apiCalls: 200,
      costPence: 200,
      cacheHits: 150,
      cacheMisses: 50,
    },
    totalApiCalls: 430,
    totalCostPence: 900,
    totalCacheHits: 330,
    totalCacheMisses: 100,
    cacheHitRate: 76.7,
    isWeddingSeason: new Date().getMonth() >= 2 && new Date().getMonth() <= 9,
    seasonMultiplier:
      new Date().getMonth() >= 2 && new Date().getMonth() <= 9 ? 1.6 : 1.0,
    adjustedCostPence: 900,
  },
  budgetSettings: {
    id: '1',
    organizationId: '1',
    monthlyBudgetPence: 15000,
    alertThresholds: {
      warning: 80,
      critical: 90,
      emergency: 95,
    },
    autoDisable: {
      enabled: true,
      atPercentage: 100,
      gracePeriod: 24,
    },
    seasonalSettings: {
      adjustBudgetForSeason: true,
      peakSeasonMultiplier: 1.6,
      preSeasonWarning: true,
    },
    notifications: {
      email: true,
      sms: false,
      dashboard: true,
      frequency: 'daily',
    },
  },
  cacheMetrics: {
    totalRequests: 430,
    cacheHits: 330,
    cacheMisses: 100,
    hitRate: 76.7,
    estimatedSavingsPence: 250,
    potentialSavingsPence: 100,
    photographyCache: {
      hitRate: 80.0,
      savingsPence: 120,
    },
    contentCache: {
      hitRate: 75.0,
      savingsPence: 80,
    },
    chatbotCache: {
      hitRate: 75.0,
      savingsPence: 50,
    },
  },
  modelConfig: {
    photography: {
      model: 'gpt-4-vision',
      qualityThreshold: 85,
      costPerRequest: 2,
    },
    contentGeneration: {
      clientFacing: 'gpt-4',
      internal: 'gpt-3.5-turbo',
      bulk: 'gpt-3.5-turbo',
    },
    chatbot: {
      model: 'gpt-3.5-turbo',
      fallbackModel: 'gpt-3.5-turbo',
      contextLength: 4096,
    },
  },
  recommendations: [
    {
      id: '1',
      type: 'cache',
      priority: 'high',
      title: 'Improve Photography AI Cache Hit Rate',
      description:
        'Your photography AI cache hit rate is 80%. With better template caching, you could achieve 90%+ and save £30/month.',
      potentialSavingsPence: 3000,
      implementationDifficulty: 'easy',
      estimatedTimeToImplement: '5 minutes',
      weddingContext: {
        affectedServices: ['Photography AI'],
        seasonalRelevance: true,
        clientImpact: 'none',
      },
      action: {
        buttonText: 'Optimize Cache',
        actionType: 'configure',
      },
    },
  ],
  recentSavings: {
    period: 'monthly',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    baseline: {
      totalCostPence: 18000,
      avgDailyCostPence: 580,
    },
    optimized: {
      totalCostPence: 12000,
      avgDailyCostPence: 387,
    },
    savings: {
      absolutePence: 6000,
      percentage: 33.3,
      projectedAnnualSavingsPence: 72000,
    },
    savingsByOptimization: {
      caching: 4000,
      modelSelection: 1500,
      batchProcessing: 500,
      seasonalOptimization: 0,
    },
    weddingMetrics: {
      weddingsProcessed: 12,
      avgCostPerWedding: 100,
      peakSeasonSavings: 0,
    },
  },
  upcomingJobs: [],
  seasonalProjections: [
    {
      month: 'Jan',
      isWeddingSeason: false,
      multiplier: 1.0,
      baselineCostPence: 9000,
      projectedCostPence: 9000,
      bookingVolume: 3,
      aiIntensity: 'low',
    },
    {
      month: 'Feb',
      isWeddingSeason: false,
      multiplier: 1.0,
      baselineCostPence: 10000,
      projectedCostPence: 10000,
      bookingVolume: 4,
      aiIntensity: 'low',
    },
    {
      month: 'Mar',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 12000,
      projectedCostPence: 19200,
      bookingVolume: 8,
      aiIntensity: 'medium',
    },
    {
      month: 'Apr',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 14000,
      projectedCostPence: 22400,
      bookingVolume: 12,
      aiIntensity: 'high',
    },
    {
      month: 'May',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 16000,
      projectedCostPence: 25600,
      bookingVolume: 15,
      aiIntensity: 'high',
    },
    {
      month: 'Jun',
      isWeddingSeason: true,
      multiplier: 1.6,
      baselineCostPence: 18000,
      projectedCostPence: 28800,
      bookingVolume: 18,
      aiIntensity: 'high',
    },
  ],
  budgetAlerts: {
    level: 'none',
    remainingBudgetPence: 6000,
    daysUntilReset: 11,
  },
  seasonStatus: {
    isCurrentlyPeakSeason:
      new Date().getMonth() >= 2 && new Date().getMonth() <= 9,
    nextSeasonStart:
      new Date().getMonth() >= 2 && new Date().getMonth() <= 9
        ? undefined
        : '2025-03-01',
    currentMultiplier:
      new Date().getMonth() >= 2 && new Date().getMonth() <= 9 ? 1.6 : 1.0,
    recommendedActions: [
      'Prepare budget for March peak season',
      'Optimize caching before demand increases',
    ],
  },
};

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AIOptimizationAPIResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization ID is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // In a real implementation, you would:
    // 1. Validate user authentication and authorization
    // 2. Query the database for actual AI usage metrics
    // 3. Calculate real-time cache statistics
    // 4. Generate personalized recommendations
    // 5. Return actual wedding season data

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response: AIOptimizationAPIResponse = {
      success: true,
      data: {
        ...mockDashboardData,
        currentUsage: {
          ...mockDashboardData.currentUsage,
          organizationId,
        },
        budgetSettings: {
          ...mockDashboardData.budgetSettings,
          organizationId,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Optimization Dashboard API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
