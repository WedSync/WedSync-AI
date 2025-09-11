// WS-129: Seasonal Flower Availability API
// API endpoint for accessing seasonal flower availability data

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season');
    const month = searchParams.get('month');
    const region = searchParams.get('region') || 'northeast';
    const budgetTier = searchParams.get('budget_tier') || 'standard';

    if (!season && !month) {
      return NextResponse.json(
        { error: 'Either season or month parameter is required' },
        { status: 400 },
      );
    }

    // Use the database function for seasonal recommendations
    const { data, error } = await supabase.rpc(
      'get_seasonal_flower_recommendations',
      {
        target_season: season || getSeasonFromMonth(parseInt(month!)),
        region: region,
        budget_tier: budgetTier,
      },
    );

    if (error) {
      throw new Error(`Failed to fetch seasonal data: ${error.message}`);
    }

    // Get detailed availability for specific month if provided
    let availability = null;
    if (month) {
      const { data: availabilityData, error: availabilityError } =
        await supabase
          .from('seasonal_flower_availability')
          .select(
            `
          flower_id,
          availability_status,
          cost_multiplier,
          quality_rating,
          import_required,
          local_greenhouse_available,
          notes,
          flowers!inner(
            common_name,
            primary_colors,
            style_tags,
            base_cost_per_stem
          )
        `,
          )
          .eq('month', parseInt(month))
          .eq('region', region)
          .order('quality_rating', { ascending: false });

      if (availabilityError) {
        console.error(
          'Failed to fetch availability details:',
          availabilityError,
        );
      } else {
        availability = availabilityData;
      }
    }

    // Calculate seasonal insights
    const insights = calculateSeasonalInsights(
      data,
      season || getSeasonFromMonth(parseInt(month!)),
    );

    return NextResponse.json({
      recommendations: data,
      availability,
      insights,
      season: season || getSeasonFromMonth(parseInt(month!)),
      month: month ? parseInt(month) : null,
      region,
    });
  } catch (error) {
    console.error('Seasonal API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seasonal data' },
      { status: 500 },
    );
  }
}

function getSeasonFromMonth(month: number): string {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function calculateSeasonalInsights(flowerData: any[], season: string) {
  if (!flowerData || flowerData.length === 0) {
    return {
      peak_flowers: 0,
      available_flowers: flowerData?.length || 0,
      average_cost: 0,
      top_recommendations: [],
      seasonal_notes: [`No flower data available for ${season} season`],
    };
  }

  const peakFlowers = flowerData.filter(
    (f) => f.availability_score >= 0.9,
  ).length;
  const averageCost =
    flowerData.reduce((sum, f) => sum + f.cost_per_stem, 0) / flowerData.length;

  const topRecommendations = flowerData
    .sort(
      (a, b) =>
        b.availability_score * (1 / b.cost_per_stem) -
        a.availability_score * (1 / a.cost_per_stem),
    )
    .slice(0, 5)
    .map((f) => ({
      name: f.common_name,
      colors: f.colors,
      cost: f.cost_per_stem,
      availability: f.availability_score,
      styles: f.style_compatibility,
    }));

  const seasonalNotes = [
    `${peakFlowers} flowers are in peak season for optimal quality and pricing`,
    `Average cost per stem in ${season}: $${averageCost.toFixed(2)}`,
    `${flowerData.length} total flower varieties available`,
  ];

  // Add season-specific notes
  switch (season) {
    case 'spring':
      seasonalNotes.push(
        'Spring flowers offer fresh pastels and garden varieties',
      );
      break;
    case 'summer':
      seasonalNotes.push('Summer provides abundant blooms and vibrant colors');
      break;
    case 'fall':
      seasonalNotes.push(
        'Fall features rich, warm tones and textured varieties',
      );
      break;
    case 'winter':
      seasonalNotes.push(
        'Winter focuses on evergreens and imported specialty flowers',
      );
      break;
  }

  return {
    peak_flowers: peakFlowers,
    available_flowers: flowerData.length,
    average_cost: parseFloat(averageCost.toFixed(2)),
    top_recommendations: topRecommendations,
    seasonal_notes: seasonalNotes,
  };
}
