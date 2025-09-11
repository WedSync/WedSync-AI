import { NextRequest, NextResponse } from 'next/server';
import type {
  CacheApiResponse,
  SeasonalData,
  WeddingSeason,
} from '@/types/ai-cache';

/**
 * WS-241 AI Cache Seasonal Data API Endpoint
 * GET /api/ai/cache/seasonal
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplier_id');

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'supplier_id is required' },
        { status: 400 },
      );
    }

    // Determine current wedding season based on date
    const getCurrentSeason = (): WeddingSeason => {
      const month = new Date().getMonth();
      if ([4, 5, 6, 7, 8, 9].includes(month)) return 'peak'; // May-Oct
      if ([3, 10].includes(month)) return 'shoulder'; // Apr, Nov
      if ([11, 0, 1].includes(month)) return 'holiday'; // Dec, Jan, Feb
      return 'off'; // Mar
    };

    const mockSeasonalData: SeasonalData = {
      currentSeason: getCurrentSeason(),
      seasonalMultiplier:
        getCurrentSeason() === 'peak'
          ? 1.6
          : getCurrentSeason() === 'shoulder'
            ? 1.2
            : 0.8,
      peakMonths: ['May', 'June', 'July', 'August', 'September', 'October'],
      offSeasonMonths: ['January', 'February', 'March', 'December'],
      seasonalTrends: [
        {
          month: 'January',
          season: 'off',
          queryVolume: 45,
          popularQueries: [
            'What are your 2024 wedding packages?',
            'Are you booking weddings for next year?',
            'What is your pricing structure?',
          ],
          supplierActivity: {
            photographer: 0.3,
            wedding_planner: 0.4,
            venue: 0.6,
            catering: 0.2,
            florist: 0.2,
            band: 0.1,
            dj: 0.1,
            decorator: 0.2,
          },
        },
        {
          month: 'June',
          season: 'peak',
          queryVolume: 180,
          popularQueries: [
            'Are you available for our June wedding?',
            'Can you handle last-minute changes?',
            'What is your emergency contact process?',
          ],
          supplierActivity: {
            photographer: 1.8,
            wedding_planner: 2.1,
            venue: 1.9,
            catering: 1.7,
            florist: 1.6,
            band: 1.5,
            dj: 1.4,
            decorator: 1.6,
          },
        },
        {
          month: 'September',
          season: 'peak',
          queryVolume: 165,
          popularQueries: [
            'Do you have autumn wedding packages?',
            'What are your rates for fall weddings?',
            'Can you work with outdoor lighting challenges?',
          ],
          supplierActivity: {
            photographer: 1.7,
            wedding_planner: 1.9,
            venue: 1.8,
            catering: 1.6,
            florist: 1.9,
            band: 1.4,
            dj: 1.3,
            decorator: 1.7,
          },
        },
      ],
      recommendations: [
        {
          season: 'peak',
          title: 'Increase Cache TTL During Peak Season',
          description:
            'Extend cache lifetime to 48-72 hours during wedding season to handle increased query volume efficiently.',
          action: 'increase_ttl',
          priority: 'high',
          supplierTypes: ['photographer', 'wedding_planner', 'venue'],
        },
        {
          season: 'peak',
          title: 'Warm Popular Wedding Season Queries',
          description:
            'Pre-cache common peak season questions about availability, pricing, and emergency protocols.',
          action: 'warm_cache',
          priority: 'high',
          supplierTypes: ['photographer', 'venue', 'catering'],
        },
        {
          season: 'off',
          title: 'Optimize for Planning Queries',
          description:
            'Focus cache warming on future planning and booking inquiries during off-season.',
          action: 'adjust_threshold',
          priority: 'medium',
          supplierTypes: ['photographer', 'wedding_planner', 'venue'],
        },
        {
          season: 'shoulder',
          title: 'Balance Cache Strategy',
          description:
            'Moderate cache settings to balance between peak season preparation and off-season efficiency.',
          action: 'adjust_threshold',
          priority: 'medium',
          supplierTypes: [
            'photographer',
            'wedding_planner',
            'venue',
            'florist',
          ],
        },
      ],
    };

    const response: CacheApiResponse<SeasonalData> = {
      success: true,
      data: mockSeasonalData,
      timestamp: new Date().toISOString(),
      cacheInfo: {
        hit: false,
        age: 0,
        quality: 4.5,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching seasonal data:', error);
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
