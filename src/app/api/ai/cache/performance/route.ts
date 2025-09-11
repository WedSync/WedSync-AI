import { NextRequest, NextResponse } from 'next/server';
import type {
  CacheApiResponse,
  CachePerformance,
  TimeRange,
} from '@/types/ai-cache';

/**
 * WS-241 AI Cache Performance API Endpoint
 * GET /api/ai/cache/performance
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplier_id');
    const timeRange = (searchParams.get('range') || 'week') as TimeRange;

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'supplier_id is required' },
        { status: 400 },
      );
    }

    // Generate mock performance metrics over time
    const generateMetrics = (days: number) => {
      const metrics = [];
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      for (let i = days; i >= 0; i--) {
        const timestamp = new Date(now - i * dayMs).toISOString();
        const baseHitRate = 85 + Math.random() * 10;
        const baseResponseTime = 90 + Math.random() * 30;

        metrics.push({
          timestamp,
          hitRate: Math.min(
            99,
            Math.max(70, baseHitRate + (Math.random() - 0.5) * 5),
          ),
          responseTime: Math.max(
            50,
            baseResponseTime + (Math.random() - 0.5) * 20,
          ),
          savings: (baseHitRate / 100) * (0.3 + Math.random() * 0.2), // £0.30-0.50 per query
          qualityScore: 4.0 + Math.random() * 1.0,
          queryVolume: Math.floor(50 + Math.random() * 100),
        });
      }

      return metrics;
    };

    const daysMap = { day: 1, week: 7, month: 30, quarter: 90, year: 365 };
    const days = daysMap[timeRange] || 7;

    const mockPerformance: CachePerformance = {
      averageResponseTime: 94,
      peakResponseTime: 156,
      qualityScore: 4.3,
      metrics: generateMetrics(days),
      topQueries: [
        {
          text: 'What are your wedding photography packages and pricing?',
          hitCount: 234,
          avgConfidence: 0.92,
          savings: 105.3,
          cacheType: 'chatbot',
          supplierRelevance: 0.95,
          lastAccessed: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          text: 'Do you offer same-day photo editing and delivery?',
          hitCount: 189,
          avgConfidence: 0.88,
          savings: 85.05,
          cacheType: 'chatbot',
          supplierRelevance: 0.9,
          lastAccessed: new Date(Date.now() - 900000).toISOString(),
        },
        {
          text: 'What is included in your 8-hour wedding coverage?',
          hitCount: 167,
          avgConfidence: 0.94,
          savings: 75.15,
          cacheType: 'chatbot',
          supplierRelevance: 0.93,
          lastAccessed: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          text: 'Can you provide a timeline for our wedding day?',
          hitCount: 143,
          avgConfidence: 0.86,
          savings: 64.35,
          cacheType: 'content_generation',
          supplierRelevance: 0.88,
          lastAccessed: new Date(Date.now() - 2700000).toISOString(),
        },
        {
          text: 'What is your cancellation and rescheduling policy?',
          hitCount: 128,
          avgConfidence: 0.91,
          savings: 57.6,
          cacheType: 'email_templates',
          supplierRelevance: 0.85,
          lastAccessed: new Date(Date.now() - 1200000).toISOString(),
        },
        {
          text: 'Do you travel for destination weddings?',
          hitCount: 112,
          avgConfidence: 0.89,
          savings: 50.4,
          cacheType: 'chatbot',
          supplierRelevance: 0.82,
          lastAccessed: new Date(Date.now() - 5400000).toISOString(),
        },
        {
          text: 'What backup equipment do you bring to weddings?',
          hitCount: 98,
          avgConfidence: 0.87,
          savings: 44.1,
          cacheType: 'content_generation',
          supplierRelevance: 0.9,
          lastAccessed: new Date(Date.now() - 4500000).toISOString(),
        },
        {
          text: 'Can we see full galleries from recent weddings?',
          hitCount: 87,
          avgConfidence: 0.85,
          savings: 39.15,
          cacheType: 'chatbot',
          supplierRelevance: 0.87,
          lastAccessed: new Date(Date.now() - 6300000).toISOString(),
        },
      ],
    };

    const response: CacheApiResponse<CachePerformance> = {
      success: true,
      data: mockPerformance,
      timestamp: new Date().toISOString(),
      cacheInfo: {
        hit: true,
        age: 45, // seconds
        quality: 4.5,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching cache performance:', error);
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
