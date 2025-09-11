// WS-130: AI-Powered Photography Library - Style Matching API
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
    const stylesParam = searchParams.get('styles');
    const preferencesParam = searchParams.get('preferences');
    const minScore = parseFloat(searchParams.get('minScore') || '0.6');
    const maxResults = parseInt(searchParams.get('maxResults') || '50');
    const sortBy = searchParams.get('sortBy') || 'match_score';

    if (!stylesParam) {
      return NextResponse.json(
        { error: 'Styles parameter is required' },
        { status: 400 },
      );
    }

    const targetStyles = JSON.parse(stylesParam);
    const preferences = preferencesParam ? JSON.parse(preferencesParam) : null;

    // Get photos with style analysis from portfolio galleries
    const { data: portfolioPhotos, error } = await supabase
      .from('portfolio_photos')
      .select(
        `
        *,
        portfolio_gallery:portfolio_galleries!inner(
          *,
          photographer:photographer_profiles(*)
        ),
        style_analysis:photo_style_analyses(
          detected_styles,
          color_analysis,
          composition_analysis,
          mood_analysis,
          technical_analysis
        )
      `,
      )
      .not('style_analysis', 'is', null);

    if (error) {
      console.error('Error fetching photos for style matching:', error);
      return NextResponse.json(
        { error: 'Failed to fetch photos for matching' },
        { status: 500 },
      );
    }

    if (!portfolioPhotos?.length) {
      return NextResponse.json({
        matches: [],
        total: 0,
        query: { styles: targetStyles, minScore, maxResults },
      });
    }

    // Calculate style matches
    const matches = portfolioPhotos
      .map((photo) => {
        const match = calculateStyleMatch(photo, targetStyles, preferences);
        if (match.matchScore >= minScore) {
          return {
            photo,
            photographer: photo.portfolio_gallery.photographer,
            matchScore: match.matchScore,
            matchingStyles: match.matchingStyles,
            colorMatch: match.colorMatch,
            moodMatch: match.moodMatch,
            technicalMatch: match.technicalMatch,
            details: match.details,
          };
        }
        return null;
      })
      .filter((match) => match !== null)
      .sort((a, b) => {
        switch (sortBy) {
          case 'style_confidence':
            return (
              b.matchingStyles[0]?.confidence - a.matchingStyles[0]?.confidence
            );
          case 'photographer_rating':
            return b.photographer.rating - a.photographer.rating;
          case 'recent':
            return (
              new Date(b.photo.created_at).getTime() -
              new Date(a.photo.created_at).getTime()
            );
          default:
            return b.matchScore - a.matchScore;
        }
      })
      .slice(0, maxResults);

    // Calculate analytics
    const analytics = {
      total_analyzed: portfolioPhotos.length,
      matches_found: matches.length,
      average_match_score:
        matches.length > 0
          ? matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length
          : 0,
      style_distribution: calculateStyleDistribution(matches),
      photographer_distribution: calculatePhotographerDistribution(matches),
    };

    return NextResponse.json({
      matches,
      analytics,
      query: {
        styles: targetStyles,
        preferences,
        minScore,
        maxResults,
        sortBy,
      },
    });
  } catch (error) {
    console.error('Style matches API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Calculate style match score for a photo
function calculateStyleMatch(
  photo: any,
  targetStyles: string[],
  preferences: any,
) {
  const analysis = photo.style_analysis;
  if (!analysis) {
    return {
      matchScore: 0,
      matchingStyles: [],
      colorMatch: 0,
      moodMatch: 0,
      technicalMatch: 0,
      details: {},
    };
  }

  let styleScore = 0;
  let colorScore = 0;
  let moodScore = 0;
  let technicalScore = 0;

  const matchingStyles = [];

  // Calculate style matching
  if (analysis.detected_styles) {
    for (const detectedStyle of analysis.detected_styles) {
      for (const targetStyle of targetStyles) {
        if (
          detectedStyle.style_name.toLowerCase() === targetStyle.toLowerCase()
        ) {
          styleScore = Math.max(styleScore, detectedStyle.confidence);
          matchingStyles.push({
            style_name: detectedStyle.style_name,
            confidence: detectedStyle.confidence,
            target_confidence: 1.0, // Would be from preferences if specified
          });
        }
        // Partial matches (similar styles)
        else if (areSimilarStyles(detectedStyle.style_name, targetStyle)) {
          const partialScore = detectedStyle.confidence * 0.7;
          if (partialScore > styleScore * 0.8) {
            styleScore = Math.max(styleScore, partialScore);
            matchingStyles.push({
              style_name: detectedStyle.style_name,
              confidence: partialScore,
              target_confidence: 0.7,
            });
          }
        }
      }
    }
  }

  // Calculate color matching if preferences specified
  if (preferences?.colorPalette && analysis.color_analysis) {
    colorScore = calculateColorMatch(
      analysis.color_analysis,
      preferences.colorPalette,
    );
  } else {
    colorScore = 0.5; // Neutral score if no color preferences
  }

  // Calculate mood matching if preferences specified
  if (preferences?.moodTags && analysis.mood_analysis) {
    colorScore = calculateMoodMatch(
      analysis.mood_analysis,
      preferences.moodTags,
    );
  } else {
    moodScore = 0.5; // Neutral score if no mood preferences
  }

  // Calculate technical matching
  if (preferences?.technicalRequirements && analysis.technical_analysis) {
    technicalScore = calculateTechnicalMatch(
      analysis.technical_analysis,
      preferences.technicalRequirements,
    );
  } else {
    // Base technical score on composition score
    technicalScore = analysis.technical_analysis?.composition_score
      ? analysis.technical_analysis.composition_score / 10
      : 0.5;
  }

  // Weighted overall match score
  const weights = {
    style: 0.5,
    color: 0.2,
    mood: 0.2,
    technical: 0.1,
  };

  const matchScore =
    styleScore * weights.style +
    colorScore * weights.color +
    moodScore * weights.mood +
    technicalScore * weights.technical;

  return {
    matchScore: Math.min(matchScore, 1.0),
    matchingStyles: matchingStyles.sort((a, b) => b.confidence - a.confidence),
    colorMatch: colorScore,
    moodMatch: moodScore,
    technicalMatch: technicalScore,
    details: {
      style_weight: weights.style,
      color_weight: weights.color,
      mood_weight: weights.mood,
      technical_weight: weights.technical,
    },
  };
}

// Check if two styles are similar
function areSimilarStyles(style1: string, style2: string): boolean {
  const similarityMap: { [key: string]: string[] } = {
    romantic: ['elegant', 'soft', 'dreamy'],
    dramatic: ['bold', 'intense', 'moody'],
    natural: ['candid', 'organic', 'lifestyle'],
    vintage: ['retro', 'classic', 'timeless'],
    modern: ['contemporary', 'clean', 'minimalist'],
    artistic: ['creative', 'abstract', 'unique'],
  };

  const s1 = style1.toLowerCase();
  const s2 = style2.toLowerCase();

  return (
    similarityMap[s1]?.includes(s2) || similarityMap[s2]?.includes(s1) || false
  );
}

// Calculate color palette matching
function calculateColorMatch(
  colorAnalysis: any,
  targetPalette: string[],
): number {
  if (!colorAnalysis.dominant_colors || !targetPalette.length) return 0.5;

  let bestMatch = 0;
  for (const targetColor of targetPalette) {
    for (const dominantColor of colorAnalysis.dominant_colors) {
      const similarity = calculateColorSimilarity(targetColor, dominantColor);
      bestMatch = Math.max(bestMatch, similarity);
    }
  }

  // Factor in color harmony
  const harmonyBonus =
    colorAnalysis.color_harmony === 'excellent'
      ? 0.2
      : colorAnalysis.color_harmony === 'good'
        ? 0.1
        : 0;

  return Math.min(bestMatch + harmonyBonus, 1.0);
}

// Calculate mood matching
function calculateMoodMatch(moodAnalysis: any, targetMoods: string[]): number {
  if (!moodAnalysis.mood_tags || !targetMoods.length) return 0.5;

  const matchCount = moodAnalysis.mood_tags.filter((mood: string) =>
    targetMoods.some((target) =>
      mood.toLowerCase().includes(target.toLowerCase()),
    ),
  ).length;

  const baseScore = matchCount / targetMoods.length;
  const emotionBonus = moodAnalysis.emotion_score || 0;

  return Math.min(baseScore * 0.7 + emotionBonus * 0.3, 1.0);
}

// Calculate technical requirements matching
function calculateTechnicalMatch(
  technicalAnalysis: any,
  requirements: any,
): number {
  let score = 0;
  let factors = 0;

  if (requirements.lighting && technicalAnalysis.lighting_quality) {
    const lightingScore = requirements.lighting.includes(
      technicalAnalysis.lighting_quality,
    )
      ? 1
      : 0;
    score += lightingScore;
    factors++;
  }

  if (requirements.focus && technicalAnalysis.focus_quality) {
    const focusScore = requirements.focus.includes(
      technicalAnalysis.focus_quality,
    )
      ? 1
      : 0;
    score += focusScore;
    factors++;
  }

  if (requirements.composition && technicalAnalysis.composition_score) {
    const compositionScore = technicalAnalysis.composition_score / 10;
    score += compositionScore;
    factors++;
  }

  return factors > 0 ? score / factors : 0.5;
}

// Simple color similarity calculation (would use more sophisticated color space calculations in production)
function calculateColorSimilarity(color1: string, color2: string): number {
  // Simplified similarity - in production, would use LAB color space or similar
  return color1.toLowerCase() === color2.toLowerCase() ? 1.0 : 0.3;
}

// Calculate style distribution in matches
function calculateStyleDistribution(matches: any[]) {
  const distribution: { [key: string]: number } = {};
  matches.forEach((match) => {
    match.matchingStyles.forEach((style: any) => {
      distribution[style.style_name] =
        (distribution[style.style_name] || 0) + 1;
    });
  });
  return Object.entries(distribution).map(([style, count]) => ({
    style,
    count,
  }));
}

// Calculate photographer distribution in matches
function calculatePhotographerDistribution(matches: any[]) {
  const distribution: { [key: string]: { count: number; photographer: any } } =
    {};
  matches.forEach((match) => {
    const id = match.photographer.id;
    if (!distribution[id]) {
      distribution[id] = { count: 0, photographer: match.photographer };
    }
    distribution[id].count++;
  });
  return Object.values(distribution).sort((a, b) => b.count - a.count);
}
