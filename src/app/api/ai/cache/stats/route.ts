import { NextRequest, NextResponse } from 'next/server';
import type {
  CacheStatsResponse,
  CacheStats,
  TimeRange,
} from '@/types/ai-cache';

/**
 * WS-241 AI Cache Stats API Endpoint
 * GET /api/ai/cache/stats
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

    // Mock data for development - replace with actual cache service calls
    const mockStats: CacheStats = {
      overall: {
        hitRate: 85.3,
        monthlySavings: 78.5,
        totalQueries: 1245,
        storageUsed: '245MB',
        cacheEntries: 8932,
        averageResponseTime: 94,
        lastUpdated: new Date().toISOString(),
      },
      byType: [
        {
          type: 'chatbot',
          enabled: true,
          hitRate: 87.2,
          savingsThisMonth: 45.2,
          entries: 3421,
          avgQuality: 4.3,
          responseTimes: {
            cached: 89,
            generated: 2340,
          },
          lastWarmed: new Date(Date.now() - 3600000).toISOString(),
          topQueries: [
            'What are your wedding photography packages?',
            'Do you offer same-day editing?',
            'What is your pricing for 8-hour coverage?',
          ],
        },
        {
          type: 'email_templates',
          enabled: true,
          hitRate: 92.1,
          savingsThisMonth: 23.1,
          entries: 2156,
          avgQuality: 4.5,
          responseTimes: {
            cached: 76,
            generated: 1890,
          },
          lastWarmed: new Date(Date.now() - 1800000).toISOString(),
          topQueries: [
            'Wedding day timeline coordination email',
            'Client consultation follow-up email',
            'Vendor coordination message',
          ],
        },
        {
          type: 'content_generation',
          enabled: true,
          hitRate: 78.9,
          savingsThisMonth: 10.2,
          entries: 1823,
          avgQuality: 4.1,
          responseTimes: {
            cached: 102,
            generated: 3120,
          },
          lastWarmed: new Date(Date.now() - 7200000).toISOString(),
          topQueries: [
            'Professional wedding photography service description',
            'Portfolio gallery introduction text',
            'About us page content for wedding photographers',
          ],
        },
      ],
      trends: {
        hitRateChange: 2.1,
        savingsChange: 12.3,
        queryVolumeChange: 15.7,
      },
    };

    // Adjust mock data based on time range
    if (timeRange === 'day') {
      mockStats.overall.totalQueries = Math.floor(
        mockStats.overall.totalQueries / 7,
      );
      mockStats.overall.monthlySavings = Math.floor(
        mockStats.overall.monthlySavings / 30,
      );
    } else if (timeRange === 'month') {
      mockStats.overall.totalQueries = mockStats.overall.totalQueries * 4;
      mockStats.overall.monthlySavings = mockStats.overall.monthlySavings;
    }

    const response: CacheStatsResponse = {
      success: true,
      data: mockStats,
      timestamp: new Date().toISOString(),
      metadata: {
        supplierId,
        supplierType: 'photographer', // This would come from the database
        timeRange,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
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
