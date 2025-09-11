'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';

interface WeddingTrendData {
  period: string;
  bookings: number;
  revenue: number;
  avgCost: number;
  popularStyles: string[];
  seasonality: number;
  growthRate: number;
}

interface PriceInsight {
  category: string;
  currentPrice: number;
  marketAverage: number;
  suggestedPrice: number;
  competitorRange: { min: number; max: number };
  demandLevel: number;
  priceElasticity: number;
  recommendation: 'increase' | 'decrease' | 'maintain';
  confidenceScore: number;
  potentialImpact: {
    revenue: number;
    bookings: number;
    marketShare: number;
  };
}

interface MarketOpportunity {
  region: string;
  marketSize: number;
  competitorCount: number;
  avgWeddingBudget: number;
  growthRate: number;
  seasonalDemand: Record<string, number>;
  opportunityScore: number;
  barriers: string[];
  recommendations: string[];
}

interface ClientSegment {
  name: string;
  size: number;
  avgBudget: number;
  bookingLeadTime: number;
  conversionRate: number;
  lifetimeValue: number;
  churnRate: number;
  preferredChannels: string[];
  behaviorPatterns: {
    planningDuration: number;
    decisionFactors: string[];
    pricesensitivity: number;
    loyaltyScore: number;
  };
}

interface VendorAnalytics {
  vendor: string;
  category: string;
  performanceMetrics: {
    bookingCount: number;
    revenue: number;
    clientSatisfaction: number;
    responseTime: number;
    cancellationRate: number;
  };
  marketPosition: {
    ranking: number;
    marketShare: number;
    competitiveAdvantage: string[];
  };
  partnershipValue: {
    referralCount: number;
    crossSellOpportunities: number;
    exclusivityScore: number;
  };
}

interface BusinessIntelligence {
  trends: WeddingTrendData[];
  priceInsights: PriceInsight[];
  marketOpportunities: MarketOpportunity[];
  clientSegments: ClientSegment[];
  vendorAnalytics: VendorAnalytics[];
  keyInsights: {
    type: 'opportunity' | 'risk' | 'trend' | 'optimization';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: number;
    actionItems: string[];
    dataPoints: Record<string, number>;
  }[];
  lastUpdated: string;
}

interface UseWeddingIntelligenceOptions {
  timeframe?: '7d' | '30d' | '90d' | '365d';
  region?: string;
  includeCompetitorData?: boolean;
  enableRealTimeUpdates?: boolean;
  segmentAnalysis?: boolean;
}

export function useWeddingIntelligence({
  timeframe = '30d',
  region = 'all',
  includeCompetitorData = false,
  enableRealTimeUpdates = true,
  segmentAnalysis = true,
}: UseWeddingIntelligenceOptions = {}) {
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [trendPredictions, setTrendPredictions] = useState<any[]>([]);
  const [optimizationOpportunities, setOptimizationOpportunities] = useState<
    any[]
  >([]);

  const supabase = await createClient();

  // Main intelligence data
  const {
    data: intelligenceData,
    error,
    isLoading,
    mutate,
  } = useSWR<BusinessIntelligence>(
    [
      `/api/intelligence/wedding-analytics`,
      timeframe,
      region,
      includeCompetitorData,
      segmentAnalysis,
    ],
    async ([url, timeframe, region, includeCompetitor, segmentAnalysis]) => {
      const params = new URLSearchParams({
        timeframe,
        region,
        includeCompetitor: includeCompetitor.toString(),
        segmentAnalysis: segmentAnalysis.toString(),
      });

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch intelligence data');
      return response.json();
    },
    {
      refreshInterval: enableRealTimeUpdates ? 300000 : 0, // 5 minutes if real-time enabled
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  // AI-powered price optimization
  const generatePriceOptimization = useCallback(
    async (category: string, currentPrice: number) => {
      try {
        const response = await fetch('/api/intelligence/price-optimization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            currentPrice,
            timeframe,
            region,
            includeCompetitorData,
          }),
        });

        if (!response.ok) throw new Error('Price optimization failed');
        return response.json();
      } catch (error) {
        console.error('Price optimization error:', error);
        return null;
      }
    },
    [timeframe, region, includeCompetitorData],
  );

  // Market opportunity analysis
  const analyzeMarketOpportunity = useCallback(
    async (targetRegion: string) => {
      try {
        const response = await fetch('/api/intelligence/market-opportunity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetRegion,
            currentRegion: region,
            timeframe,
            analysisDepth: 'comprehensive',
          }),
        });

        if (!response.ok) throw new Error('Market analysis failed');
        return response.json();
      } catch (error) {
        console.error('Market opportunity analysis error:', error);
        return null;
      }
    },
    [region, timeframe],
  );

  // Client behavior prediction
  const predictClientBehavior = useCallback(
    async (clientSegment: string) => {
      try {
        const response = await fetch('/api/intelligence/client-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segment: clientSegment,
            timeframe,
            predictionHorizon: '90d',
            includeSeasonality: true,
          }),
        });

        if (!response.ok) throw new Error('Client prediction failed');
        return response.json();
      } catch (error) {
        console.error('Client behavior prediction error:', error);
        return null;
      }
    },
    [timeframe],
  );

  // Vendor performance optimization
  const optimizeVendorNetwork = useCallback(async () => {
    try {
      const response = await fetch('/api/intelligence/vendor-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe,
          region,
          optimizationGoals: ['revenue', 'client_satisfaction', 'efficiency'],
        }),
      });

      if (!response.ok) throw new Error('Vendor optimization failed');
      return response.json();
    } catch (error) {
      console.error('Vendor network optimization error:', error);
      return null;
    }
  }, [timeframe, region]);

  // Seasonal trend forecasting
  const forecastSeasonalTrends = useCallback(
    async (forecastPeriod: string = '365d') => {
      try {
        const response = await fetch('/api/intelligence/seasonal-forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forecastPeriod,
            region,
            includeWeatherData: true,
            includeTrendAnalysis: true,
          }),
        });

        if (!response.ok) throw new Error('Seasonal forecasting failed');
        const forecast = await response.json();
        setTrendPredictions(forecast.predictions);
        return forecast;
      } catch (error) {
        console.error('Seasonal forecasting error:', error);
        return null;
      }
    },
    [region],
  );

  // Export intelligence report
  const exportIntelligenceReport = useCallback(
    async (format: 'pdf' | 'excel' | 'powerpoint') => {
      try {
        const response = await fetch('/api/intelligence/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format,
            timeframe,
            region,
            includeCharts: true,
            includeRecommendations: true,
            data: intelligenceData,
          }),
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wedding-intelligence-report.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Export error:', error);
      }
    },
    [timeframe, region, intelligenceData],
  );

  // Real-time intelligence updates
  useEffect(() => {
    if (!enableRealTimeUpdates) return;

    const channel = supabase
      .channel('intelligence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          mutate(); // Refresh intelligence data when bookings change
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        () => {
          mutate(); // Refresh when client data changes
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealTimeUpdates, supabase, mutate]);

  // Generate AI insights based on current data
  useEffect(() => {
    if (intelligenceData) {
      generateAIInsights();
      identifyOptimizationOpportunities();
    }
  }, [intelligenceData]);

  const generateAIInsights = useCallback(() => {
    if (!intelligenceData) return;

    const insights = [];

    // Analyze trends for insights
    if (intelligenceData.trends) {
      const latestTrend =
        intelligenceData.trends[intelligenceData.trends.length - 1];
      if (latestTrend.growthRate > 15) {
        insights.push({
          type: 'opportunity',
          priority: 'high',
          title: 'Strong Growth Trend',
          description: `${latestTrend.growthRate}% growth rate indicates strong market demand`,
          confidence: 0.9,
        });
      }
    }

    // Analyze pricing for insights
    if (intelligenceData.priceInsights) {
      const underpriced = intelligenceData.priceInsights.filter(
        (p) => p.currentPrice < p.marketAverage * 0.9 && p.demandLevel > 0.7,
      );

      if (underpriced.length > 0) {
        insights.push({
          type: 'optimization',
          priority: 'high',
          title: 'Pricing Optimization Opportunity',
          description: `${underpriced.length} categories are underpriced with high demand`,
          confidence: 0.85,
        });
      }
    }

    setAiInsights(insights);
  }, [intelligenceData]);

  const identifyOptimizationOpportunities = useCallback(() => {
    if (!intelligenceData) return;

    const opportunities = [];

    // Client segment opportunities
    if (intelligenceData.clientSegments) {
      const highValueSegments = intelligenceData.clientSegments.filter(
        (s) => s.lifetimeValue > 50000 && s.churnRate < 0.1,
      );

      opportunities.push({
        category: 'client_acquisition',
        title: 'Focus on High-Value Segments',
        impact: 'high',
        effort: 'medium',
        description: `${highValueSegments.length} segments show high value and low churn`,
      });
    }

    // Vendor optimization opportunities
    if (intelligenceData.vendorAnalytics) {
      const topPerformers = intelligenceData.vendorAnalytics.filter(
        (v) => v.performanceMetrics.clientSatisfaction > 4.5,
      );

      opportunities.push({
        category: 'vendor_partnership',
        title: 'Strengthen Top Vendor Partnerships',
        impact: 'medium',
        effort: 'low',
        description: `${topPerformers.length} vendors show exceptional performance`,
      });
    }

    setOptimizationOpportunities(opportunities);
  }, [intelligenceData]);

  return {
    // Core data
    intelligenceData,
    isLoading,
    error,

    // AI-generated insights
    aiInsights,
    trendPredictions,
    optimizationOpportunities,

    // Analysis functions
    generatePriceOptimization,
    analyzeMarketOpportunity,
    predictClientBehavior,
    optimizeVendorNetwork,
    forecastSeasonalTrends,

    // Utility functions
    exportIntelligenceReport,
    refreshData: mutate,

    // Status
    lastUpdated: intelligenceData?.lastUpdated,
  };
}
