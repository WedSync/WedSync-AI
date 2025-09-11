// WS-130: AI-Powered Photography Library - Featured Galleries API
// Team C Batch 10 Round 1

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const eventType = searchParams.get('event_type');
    const style = searchParams.get('style');

    // Get featured galleries with high ratings and view counts
    let query = supabase
      .from('portfolio_galleries')
      .select(
        `
        *,
        photographer:photographer_profiles(*),
        photos:portfolio_photos(
          id,
          photo_url,
          thumbnail_url,
          title,
          is_featured,
          display_order,
          tags,
          style_analysis:photo_style_analyses(
            detected_styles,
            color_analysis,
            mood_analysis,
            technical_analysis
          )
        )
      `,
      )
      .eq('is_public', true)
      .eq('is_featured', true);

    // Apply filters
    if (eventType) {
      query = query.eq('gallery_type', eventType);
    }

    if (style) {
      query = query.contains('style_focus', [style]);
    }

    // Order by engagement and quality metrics
    query = query
      .order('view_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: galleries, error } = await query;

    if (error) {
      console.error('Error fetching featured galleries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch featured galleries' },
        { status: 500 },
      );
    }

    // Process galleries with enhanced analytics
    const processedGalleries =
      galleries?.map((gallery) => {
        const photos = gallery.photos || [];
        const featuredPhotos = photos
          .filter((photo: any) => photo.is_featured)
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .slice(0, 6);

        // Calculate quality scores
        const avgStyleConfidence =
          photos.length > 0
            ? photos.reduce((sum: number, photo: any) => {
                const maxConfidence =
                  photo.style_analysis?.detected_styles?.reduce(
                    (max: number, style: any) =>
                      Math.max(max, style.confidence),
                    0,
                  ) || 0;
                return sum + maxConfidence;
              }, 0) / photos.length
            : 0;

        const avgTechnicalScore =
          photos.length > 0
            ? photos.reduce((sum: number, photo: any) => {
                return (
                  sum +
                  (photo.style_analysis?.technical_analysis
                    ?.composition_score || 5)
                );
              }, 0) / photos.length
            : 5;

        return {
          ...gallery,
          photo_count: photos.length,
          featured_photos: featuredPhotos,
          quality_metrics: {
            avg_style_confidence: Math.round(avgStyleConfidence * 100) / 100,
            avg_technical_score: Math.round(avgTechnicalScore * 10) / 10,
            total_views: gallery.view_count,
            photographer_rating: gallery.photographer?.rating || 0,
          },
          dominant_styles: extractDominantStyles(photos),
          color_themes: extractColorThemes(photos),
        };
      }) || [];

    return NextResponse.json({
      galleries: processedGalleries,
      total: processedGalleries.length,
      categories: generateCategoryBreakdown(processedGalleries),
      trending_styles: generateTrendingStyles(processedGalleries),
    });
  } catch (error) {
    console.error('Featured galleries API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to extract dominant styles from photos
function extractDominantStyles(
  photos: any[],
): Array<{ style: string; confidence: number; count: number }> {
  const styleMap = new Map<
    string,
    { totalConfidence: number; count: number }
  >();

  photos.forEach((photo) => {
    if (photo.style_analysis?.detected_styles) {
      photo.style_analysis.detected_styles.forEach((styleData: any) => {
        const existing = styleMap.get(styleData.style_name) || {
          totalConfidence: 0,
          count: 0,
        };
        styleMap.set(styleData.style_name, {
          totalConfidence: existing.totalConfidence + styleData.confidence,
          count: existing.count + 1,
        });
      });
    }
  });

  return Array.from(styleMap.entries())
    .map(([style, data]) => ({
      style,
      confidence: data.totalConfidence / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

// Helper function to extract color themes
function extractColorThemes(photos: any[]): string[] {
  const allColors: string[] = [];

  photos.forEach((photo) => {
    if (photo.style_analysis?.color_analysis?.dominant_colors) {
      allColors.push(...photo.style_analysis.color_analysis.dominant_colors);
    }
  });

  // Count color frequency and return top colors
  const colorCounts = new Map<string, number>();
  allColors.forEach((color) => {
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  });

  return Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color]) => color);
}

// Helper function to generate category breakdown
function generateCategoryBreakdown(galleries: any[]) {
  const categories = new Map<string, number>();

  galleries.forEach((gallery) => {
    const type = gallery.gallery_type || 'other';
    categories.set(type, (categories.get(type) || 0) + 1);
  });

  return Array.from(categories.entries()).map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / galleries.length) * 100),
  }));
}

// Helper function to generate trending styles
function generateTrendingStyles(galleries: any[]) {
  const styleMap = new Map<
    string,
    { count: number; totalConfidence: number; totalViews: number }
  >();

  galleries.forEach((gallery) => {
    gallery.dominant_styles?.forEach((styleData: any) => {
      const existing = styleMap.get(styleData.style) || {
        count: 0,
        totalConfidence: 0,
        totalViews: 0,
      };

      styleMap.set(styleData.style, {
        count: existing.count + styleData.count,
        totalConfidence:
          existing.totalConfidence + styleData.confidence * styleData.count,
        totalViews: existing.totalViews + (gallery.view_count || 0),
      });
    });
  });

  return Array.from(styleMap.entries())
    .map(([style, data]) => ({
      style,
      popularity_score: data.totalViews + data.count * 10,
      avg_confidence: data.totalConfidence / data.count,
      gallery_count: data.count,
    }))
    .sort((a, b) => b.popularity_score - a.popularity_score)
    .slice(0, 8);
}
