/**
 * Photography AI Integration Coordinator
 * WS-130 Round 3: Final Integration with All Team Outputs
 *
 * Coordinates Photography AI with:
 * - Team A: Music AI (style consistency)
 * - Team B: Florist AI (color harmony)
 * - Team D: Pricing (feature gating)
 * - Team E: Trials (usage tracking)
 */

import { MoodBoardService } from '@/lib/ai/photography/mood-board-service';
import { musicAIService } from '@/lib/services/music-ai-service';
import { floralAIService } from '@/lib/ai/photography/floral-ai-service';
import { FeatureGateService } from '@/lib/billing/featureGating';
import { TrialService } from '@/lib/trial/TrialService';
import { createClient } from '@/lib/supabase/server';
import type {
  MoodBoardRequest,
  MoodBoardResponse,
  ColorHarmonyAnalysis,
  StyleConsistencyReport,
  IntegratedPhotoAnalysis,
  TeamIntegrationMetrics,
} from '@/types/photography-integrations';

interface CoordinatedAnalysisRequest {
  client_id: string;
  user_id: string;
  wedding_style: string;
  preferred_colors: string[];
  wedding_date: Date;
  mood_board_images: string[];
  budget_range?: {
    min: number;
    max: number;
  };
  integration_preferences: {
    sync_with_music: boolean;
    sync_with_floral: boolean;
    track_usage: boolean;
  };
}

interface CoordinatedAnalysisResponse {
  photography_analysis: MoodBoardResponse;
  style_consistency: StyleConsistencyReport;
  color_harmony: ColorHarmonyAnalysis;
  integration_metrics: TeamIntegrationMetrics;
  usage_tracked: boolean;
  recommendations: {
    photography: string[];
    music_coordination: string[];
    floral_coordination: string[];
    upgrade_suggestions?: string[];
  };
}

export class PhotographyAICoordinator {
  private moodBoardService: MoodBoardService;
  private supabase = createClient();

  constructor() {
    this.moodBoardService = new MoodBoardService();
  }

  /**
   * Main orchestration method - coordinates all team integrations
   */
  async analyzeWithFullIntegration(
    request: CoordinatedAnalysisRequest,
  ): Promise<CoordinatedAnalysisResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Check feature access (Team D - Pricing integration)
      const featureAccess = await this.checkFeatureAccess(request.user_id);
      if (!featureAccess.hasAccess) {
        throw new Error(
          `Photography AI access denied: ${featureAccess.reason}`,
        );
      }

      // Step 2: Generate base photography mood board analysis
      const photographyAnalysis =
        await this.generatePhotographyAnalysis(request);

      // Step 3: Coordinate with Music AI (Team A integration)
      const styleConsistency = await this.coordinateWithMusicAI(
        request,
        photographyAnalysis,
        request.integration_preferences.sync_with_music,
      );

      // Step 4: Coordinate with Floral AI (Team B integration)
      const colorHarmony = await this.coordinateWithFloralAI(
        request,
        photographyAnalysis,
        request.integration_preferences.sync_with_floral,
      );

      // Step 5: Track usage for trials (Team E integration)
      const usageTracked = await this.trackUsageForTrials(
        request.user_id,
        'ai_photo_processing',
        Date.now() - startTime,
        request.integration_preferences.track_usage,
      );

      // Step 6: Generate integration metrics
      const integrationMetrics = await this.calculateIntegrationMetrics(
        request,
        photographyAnalysis,
        styleConsistency,
        colorHarmony,
      );

      // Step 7: Generate coordinated recommendations
      const recommendations = await this.generateCoordinatedRecommendations(
        photographyAnalysis,
        styleConsistency,
        colorHarmony,
        featureAccess,
      );

      return {
        photography_analysis: photographyAnalysis,
        style_consistency: styleConsistency,
        color_harmony: colorHarmony,
        integration_metrics: integrationMetrics,
        usage_tracked: usageTracked,
        recommendations,
      };
    } catch (error) {
      console.error('Photography AI coordination failed:', error);
      throw new Error(`Integration failed: ${error.message}`);
    }
  }

  /**
   * Team D Integration: Check feature access and usage limits
   */
  private async checkFeatureAccess(userId: string) {
    try {
      // Check if user can process photos (respects plan limits)
      const accessCheck = await FeatureGateService.canIncreaseUsage(
        userId,
        'ai:photo_processing',
        1,
      );

      return accessCheck;
    } catch (error) {
      console.error('Feature access check failed:', error);
      return {
        hasAccess: false,
        reason: 'Unable to verify feature access',
      };
    }
  }

  /**
   * Generate base photography analysis using mood board service
   */
  private async generatePhotographyAnalysis(
    request: CoordinatedAnalysisRequest,
  ): Promise<MoodBoardResponse> {
    const moodBoardRequest: MoodBoardRequest = {
      client_id: request.client_id,
      wedding_style: request.wedding_style,
      preferred_colors: request.preferred_colors,
      reference_images: request.mood_board_images,
      requirements: {
        style_consistency: true,
        color_harmony: true,
        seasonal_appropriateness: true,
      },
    };

    return await this.moodBoardService.generateMoodBoard(moodBoardRequest);
  }

  /**
   * Team A Integration: Coordinate with Music AI for style consistency
   */
  private async coordinateWithMusicAI(
    request: CoordinatedAnalysisRequest,
    photographyAnalysis: MoodBoardResponse,
    syncEnabled: boolean,
  ): Promise<StyleConsistencyReport> {
    if (!syncEnabled) {
      return {
        sync_enabled: false,
        style_match_score: 0,
        energy_alignment: 0,
        recommendations: [],
      };
    }

    try {
      // Get music recommendations for the same wedding context
      const musicRecommendation = await musicAIService.generateRecommendations({
        client_id: request.client_id,
        recommendation_type: 'style_matching',
        context: {
          wedding_date: request.wedding_date.toISOString(),
          wedding_style: request.wedding_style,
          venue_type: 'mixed', // Could be enhanced with venue data
        },
        preferences: {
          preferred_moods: {
            ceremony: ['romantic', 'elegant'],
            reception: ['celebratory', 'energetic'],
          },
          wedding_style: request.wedding_style,
          energy_progression: 'gradual_buildup',
        },
        limit: 5,
      });

      // Analyze style consistency between photography and music
      const photoStyle =
        photographyAnalysis.style_analysis?.primary_style ||
        request.wedding_style;
      const musicStyles = musicRecommendation.recommended_tracks.map((track) =>
        track.reason.toLowerCase(),
      );

      // Calculate style match score
      const styleMatchScore = this.calculateStyleMatchScore(
        photoStyle,
        musicStyles,
      );

      // Calculate energy alignment
      const photoEnergyLevel =
        photographyAnalysis.mood_analysis?.energy_level || 5;
      const musicEnergyLevel =
        musicRecommendation.recommended_tracks.reduce(
          (avg, track) => avg + track.confidence_score * 10,
          0,
        ) / musicRecommendation.recommended_tracks.length;

      const energyAlignment = Math.max(
        0,
        100 - Math.abs(photoEnergyLevel - musicEnergyLevel) * 10,
      );

      return {
        sync_enabled: true,
        style_match_score: styleMatchScore,
        energy_alignment: energyAlignment,
        music_recommendation_id: musicRecommendation.id,
        recommendations: this.generateStyleCoordinationRecommendations(
          photoStyle,
          musicStyles,
          styleMatchScore,
        ),
      };
    } catch (error) {
      console.error('Music AI coordination failed:', error);
      return {
        sync_enabled: true,
        style_match_score: 0,
        energy_alignment: 0,
        error: 'Music coordination failed',
        recommendations: [],
      };
    }
  }

  /**
   * Team B Integration: Coordinate with Floral AI for color harmony
   */
  private async coordinateWithFloralAI(
    request: CoordinatedAnalysisRequest,
    photographyAnalysis: MoodBoardResponse,
    syncEnabled: boolean,
  ): Promise<ColorHarmonyAnalysis> {
    if (!syncEnabled) {
      return {
        sync_enabled: false,
        color_harmony_score: 0,
        palette_compatibility: 0,
        recommendations: [],
      };
    }

    try {
      // Get floral recommendations using photography color palette
      const floralRecommendation =
        await floralAIService.generateRecommendations({
          client_id: request.client_id,
          arrangement_type: 'bridal_bouquet',
          wedding_style: request.wedding_style,
          preferred_colors:
            photographyAnalysis.color_analysis?.dominant_colors ||
            request.preferred_colors,
          budget_range: request.budget_range || { min: 200, max: 500 },
          wedding_date: request.wedding_date,
        });

      // Analyze color harmony between photography and floral
      const photoColors =
        photographyAnalysis.color_analysis?.color_palette || [];
      const floralColors =
        floralRecommendation.recommendations[0]?.focal_flowers?.flatMap(
          (flower) => flower.flower.primary_colors,
        ) || [];

      const colorHarmonyScore = await this.calculateColorHarmonyScore(
        photoColors,
        floralColors,
      );
      const paletteCompatibility = this.calculatePaletteCompatibility(
        photoColors,
        floralColors,
      );

      return {
        sync_enabled: true,
        color_harmony_score: colorHarmonyScore,
        palette_compatibility: paletteCompatibility,
        floral_recommendation_id:
          floralRecommendation.recommendations[0]?.arrangement_id,
        coordinated_palette: this.generateCoordinatedPalette(
          photoColors,
          floralColors,
        ),
        recommendations: this.generateColorCoordinationRecommendations(
          photoColors,
          floralColors,
          colorHarmonyScore,
        ),
      };
    } catch (error) {
      console.error('Floral AI coordination failed:', error);
      return {
        sync_enabled: true,
        color_harmony_score: 0,
        palette_compatibility: 0,
        error: 'Floral coordination failed',
        recommendations: [],
      };
    }
  }

  /**
   * Team E Integration: Track usage for trials and analytics
   */
  private async trackUsageForTrials(
    userId: string,
    featureKey: string,
    processingTimeMs: number,
    trackingEnabled: boolean,
  ): Promise<boolean> {
    if (!trackingEnabled) return false;

    try {
      // Estimate time saved (assume AI saves 30 minutes vs manual mood board creation)
      const timeSavedMinutes = 30;

      // Check if user has active trial
      const trialService = new TrialService(this.supabase, {} as any);
      const activeTrial = await trialService.getActiveTrial(userId);

      if (activeTrial) {
        await trialService.trackFeatureUsage(
          userId,
          featureKey,
          'AI Photography Analysis',
          timeSavedMinutes,
          {
            processing_time_ms: processingTimeMs,
            feature_type: 'mood_board_generation',
          },
        );
      }

      // Always track usage for billing/analytics (even if no trial)
      await this.supabase.from('feature_usage_events').insert({
        user_id: userId,
        feature_key: featureKey,
        usage_count: 1,
        time_saved_minutes: timeSavedMinutes,
        processing_time_ms: processingTimeMs,
        created_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Usage tracking failed:', error);
      return false;
    }
  }

  /**
   * Calculate comprehensive integration metrics
   */
  private async calculateIntegrationMetrics(
    request: CoordinatedAnalysisRequest,
    photographyAnalysis: MoodBoardResponse,
    styleConsistency: StyleConsistencyReport,
    colorHarmony: ColorHarmonyAnalysis,
  ): Promise<TeamIntegrationMetrics> {
    const overallCoherence =
      ((styleConsistency.style_match_score || 0) +
        (styleConsistency.energy_alignment || 0) +
        (colorHarmony.color_harmony_score || 0) +
        (colorHarmony.palette_compatibility || 0)) /
      4;

    return {
      overall_coherence_score: overallCoherence,
      style_consistency_score: styleConsistency.style_match_score || 0,
      color_harmony_score: colorHarmony.color_harmony_score || 0,
      integration_success_rate:
        overallCoherence > 70
          ? 'high'
          : overallCoherence > 50
            ? 'medium'
            : 'low',
      teams_integrated: [
        request.integration_preferences.sync_with_music ? 'music_ai' : null,
        request.integration_preferences.sync_with_floral ? 'floral_ai' : null,
        'pricing_features',
        request.integration_preferences.track_usage ? 'trial_tracking' : null,
      ].filter(Boolean) as string[],
      processing_time_ms: 0, // Will be set by caller
      calculated_at: new Date().toISOString(),
    };
  }

  /**
   * Generate coordinated recommendations across all systems
   */
  private async generateCoordinatedRecommendations(
    photographyAnalysis: MoodBoardResponse,
    styleConsistency: StyleConsistencyReport,
    colorHarmony: ColorHarmonyAnalysis,
    featureAccess: any,
  ) {
    const recommendations = {
      photography: [
        ...(photographyAnalysis.recommendations || []),
        'Use AI-generated color palette for consistent theme',
      ],
      music_coordination: styleConsistency.recommendations || [
        'Enable music synchronization for better style consistency',
      ],
      floral_coordination: colorHarmony.recommendations || [
        'Enable floral coordination for harmonious color palettes',
      ],
      upgrade_suggestions: [],
    };

    // Add upgrade suggestions if user is approaching limits
    if (featureAccess.usagePercentage && featureAccess.usagePercentage > 80) {
      recommendations.upgrade_suggestions = [
        'Consider upgrading for unlimited AI photo processing',
        'Premium plan includes advanced color harmony analysis',
        'Get priority processing and enhanced integration features',
      ];
    }

    return recommendations;
  }

  // Helper methods
  private calculateStyleMatchScore(
    photoStyle: string,
    musicStyles: string[],
  ): number {
    const styleKeywords = photoStyle.toLowerCase().split(' ');
    let matches = 0;
    let total = 0;

    musicStyles.forEach((musicStyle) => {
      total++;
      if (styleKeywords.some((keyword) => musicStyle.includes(keyword))) {
        matches++;
      }
    });

    return total > 0 ? (matches / total) * 100 : 0;
  }

  private async calculateColorHarmonyScore(
    photoColors: string[],
    floralColors: string[],
  ): Promise<number> {
    // Simple color harmony calculation - could be enhanced with color theory
    const commonColors = photoColors.filter((color) =>
      floralColors.some((floral) =>
        floral.toLowerCase().includes(color.toLowerCase()),
      ),
    );

    const uniquePhotoColors = new Set(photoColors.map((c) => c.toLowerCase()));
    const uniqueFloralColors = new Set(
      floralColors.map((c) => c.toLowerCase()),
    );

    const intersection = [...uniquePhotoColors].filter((color) =>
      uniqueFloralColors.has(color),
    ).length;
    const union = new Set([...uniquePhotoColors, ...uniqueFloralColors]).size;

    return union > 0 ? (intersection / union) * 100 : 0;
  }

  private calculatePaletteCompatibility(
    photoColors: string[],
    floralColors: string[],
  ): number {
    // Calculate how well the color palettes work together
    const complementaryPairs = [
      ['red', 'green'],
      ['blue', 'orange'],
      ['yellow', 'purple'],
      ['pink', 'green'],
      ['coral', 'teal'],
      ['burgundy', 'sage'],
    ];

    let compatibilityScore = 50; // Base compatibility

    complementaryPairs.forEach(([color1, color2]) => {
      const hasColor1 = photoColors.some((c) =>
        c.toLowerCase().includes(color1),
      );
      const hasColor2 = floralColors.some((c) =>
        c.toLowerCase().includes(color2),
      );

      if (hasColor1 && hasColor2) {
        compatibilityScore += 10; // Bonus for complementary colors
      }
    });

    return Math.min(100, compatibilityScore);
  }

  private generateCoordinatedPalette(
    photoColors: string[],
    floralColors: string[],
  ): string[] {
    // Generate a unified color palette from both photography and floral colors
    const coordinated = [...new Set([...photoColors, ...floralColors])];
    return coordinated.slice(0, 6); // Limit to 6 colors for usability
  }

  private generateStyleCoordinationRecommendations(
    photoStyle: string,
    musicStyles: string[],
    matchScore: number,
  ): string[] {
    const recommendations = [];

    if (matchScore < 50) {
      recommendations.push(
        `Consider adjusting photography style to better align with ${musicStyles[0]} music theme`,
      );
    }

    if (matchScore > 80) {
      recommendations.push(
        'Excellent style coordination! Photography and music themes align perfectly',
      );
    }

    recommendations.push(
      `Photography style "${photoStyle}" pairs well with ${musicStyles.slice(0, 2).join(' and ')} music`,
    );

    return recommendations;
  }

  private generateColorCoordinationRecommendations(
    photoColors: string[],
    floralColors: string[],
    harmonyScore: number,
  ): string[] {
    const recommendations = [];

    if (harmonyScore < 50) {
      recommendations.push(
        'Consider adjusting photography color palette to coordinate with floral arrangements',
      );
    }

    if (harmonyScore > 80) {
      recommendations.push(
        'Excellent color harmony! Photography and floral colors create a cohesive theme',
      );
    }

    const dominantPhotoColor = photoColors[0];
    const dominantFloralColor = floralColors[0];

    if (dominantPhotoColor && dominantFloralColor) {
      recommendations.push(
        `${dominantPhotoColor} photography tones complement ${dominantFloralColor} floral arrangements beautifully`,
      );
    }

    return recommendations;
  }
}

// Export singleton instance for use across the application
export const photographyAICoordinator = new PhotographyAICoordinator();
