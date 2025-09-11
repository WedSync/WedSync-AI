/**
 * WS-130: AI-Powered Mood Board Service
 * Backend service for mood board generation, analysis, and management
 */

import { openai } from '@/lib/services/openai-service';
import {
  analyzeImageColorHarmony,
  ColorHarmonyAnalysis,
} from './color-harmony-analyzer';
import type {
  MoodBoardPhoto,
  MoodBoardTheme,
} from '@/components/photography/AIMoodBoardGenerator';

export interface BoardCoherenceAnalysis {
  theme: MoodBoardTheme;
  colorPalette: string[];
  consistencyScore: number;
  recommendations: string[];
  styleDistribution: { [style: string]: number };
  moodAlignment: number;
  colorHarmonyScore: number;
}

export interface AIRecommendation {
  type:
    | 'add_photo'
    | 'remove_photo'
    | 'reposition'
    | 'color_adjustment'
    | 'theme_change';
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedPhoto?: string;
  targetPosition?: { x: number; y: number };
  colorSuggestion?: string;
}

export interface LayoutArrangement {
  photos: MoodBoardPhoto[];
  score: number;
  reasoning: string;
}

export interface MoodBoardExport {
  url: string;
  format: 'pdf' | 'png' | 'link';
  shareableLink?: string;
  downloadable: boolean;
}

export interface CollaborativeSession {
  id: string;
  participants: string[];
  currentEditor: string;
  changes: MoodBoardChange[];
  lastSync: Date;
}

export interface MoodBoardChange {
  type: 'add' | 'remove' | 'move' | 'resize' | 'rotate';
  photoId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  userId: string;
}

/**
 * AI-Powered Mood Board Service
 * Provides intelligent mood board creation, analysis, and management capabilities
 */
export class MoodBoardService {
  private readonly aiModel = 'gpt-4-vision-preview';
  private readonly collaborativeSessions = new Map<
    string,
    CollaborativeSession
  >();

  /**
   * Analyze board coherence and generate theme recommendations
   */
  async analyzeBoardCoherence(
    photos: MoodBoardPhoto[],
  ): Promise<BoardCoherenceAnalysis> {
    try {
      if (photos.length === 0) {
        return this.getEmptyAnalysis();
      }

      console.log(`Analyzing board coherence for ${photos.length} photos`);

      // Analyze color harmony across all photos
      const colorAnalyses = await Promise.all(
        photos.map(async (photo) => {
          if (photo.colorAnalysis) {
            return photo.colorAnalysis;
          }
          return await analyzeImageColorHarmony(photo.url, photo.id);
        }),
      );

      // Extract dominant colors and themes
      const dominantColors = this.extractDominantColors(colorAnalyses);
      const themes = this.extractThemes(colorAnalyses);
      const primaryTheme = this.determinePrimaryTheme(themes);

      // Calculate consistency scores
      const colorHarmonyScore = this.calculateColorHarmonyScore(colorAnalyses);
      const styleConsistency = this.calculateStyleConsistency(colorAnalyses);
      const moodAlignment = this.calculateMoodAlignment(colorAnalyses);

      // Overall consistency score
      const consistencyScore =
        (colorHarmonyScore + styleConsistency + moodAlignment) / 3;

      // Generate AI recommendations
      const recommendations = await this.generateCoherenceRecommendations(
        colorAnalyses,
        consistencyScore,
        primaryTheme,
      );

      return {
        theme: primaryTheme,
        colorPalette: dominantColors,
        consistencyScore,
        recommendations,
        styleDistribution: this.calculateStyleDistribution(colorAnalyses),
        moodAlignment,
        colorHarmonyScore,
      };
    } catch (error) {
      console.error('Error analyzing board coherence:', error);
      return this.getEmptyAnalysis();
    }
  }

  /**
   * Generate AI-powered recommendations for improving mood board
   */
  async generateAIRecommendations(
    photos: MoodBoardPhoto[],
    weddingTheme?: string,
    photographerId?: string,
  ): Promise<string[]> {
    try {
      if (photos.length === 0) {
        return ['Add at least 3-5 photos to get AI recommendations'];
      }

      const coherenceAnalysis = await this.analyzeBoardCoherence(photos);
      const recommendations: string[] = [];

      // Color-based recommendations
      if (coherenceAnalysis.colorHarmonyScore < 0.6) {
        recommendations.push(
          'Consider adding photos with more harmonious colors',
        );
        recommendations.push('Remove photos that break the color scheme');
      }

      // Style consistency recommendations
      if (coherenceAnalysis.consistencyScore < 0.7) {
        const dominantStyle = Object.keys(
          coherenceAnalysis.styleDistribution,
        )[0];
        recommendations.push(
          `Focus on ${dominantStyle} style for better consistency`,
        );
        recommendations.push(
          "Remove outlier photos that don't match the main style",
        );
      }

      // Theme-specific recommendations
      if (weddingTheme) {
        const themeCompatibility = this.calculateThemeCompatibility(
          coherenceAnalysis,
          weddingTheme,
        );
        if (themeCompatibility < 0.6) {
          recommendations.push(
            `Add more photos that match your ${weddingTheme} theme`,
          );
          recommendations.push(
            `Consider adjusting colors to better suit ${weddingTheme} aesthetic`,
          );
        }
      }

      // AI-generated contextual recommendations
      const aiRecommendations = await this.generateContextualRecommendations(
        photos,
        coherenceAnalysis,
        weddingTheme,
        photographerId,
      );

      return [...recommendations, ...aiRecommendations];
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return ['Unable to generate recommendations at this time'];
    }
  }

  /**
   * Auto-arrange photos using AI layout algorithms
   */
  async autoArrangePhotos(
    photos: MoodBoardPhoto[],
    layout: 'grid' | 'masonry' | 'collage' | 'freeform',
  ): Promise<MoodBoardPhoto[]> {
    try {
      switch (layout) {
        case 'grid':
          return this.arrangeGridLayout(photos);
        case 'masonry':
          return this.arrangeMasonryLayout(photos);
        case 'collage':
          return this.arrangeCollageLayout(photos);
        case 'freeform':
          return this.arrangeFreeformLayout(photos);
        default:
          return photos;
      }
    } catch (error) {
      console.error('Error auto-arranging photos:', error);
      return photos;
    }
  }

  /**
   * Shuffle photos with AI-powered optimal positioning
   */
  async shuffleWithAI(
    photos: MoodBoardPhoto[],
    layout: 'grid' | 'masonry' | 'collage' | 'freeform',
  ): Promise<MoodBoardPhoto[]> {
    try {
      // Analyze photos for optimal positioning
      const colorAnalyses = await Promise.all(
        photos.map((photo) => analyzeImageColorHarmony(photo.url, photo.id)),
      );

      // Generate multiple arrangement options
      const arrangements = await Promise.all([
        this.generateArrangementByColor(photos, colorAnalyses),
        this.generateArrangementByMood(photos, colorAnalyses),
        this.generateArrangementByStyle(photos, colorAnalyses),
      ]);

      // Score each arrangement
      const scoredArrangements = arrangements.map((arr) => ({
        arrangement: arr,
        score: this.scoreArrangement(arr, colorAnalyses),
      }));

      // Return the highest-scoring arrangement
      const bestArrangement = scoredArrangements.reduce((best, current) =>
        current.score > best.score ? current : best,
      );

      return this.autoArrangePhotos(bestArrangement.arrangement, layout);
    } catch (error) {
      console.error('Error shuffling with AI:', error);
      return photos;
    }
  }

  /**
   * Export mood board in various formats
   */
  async exportBoard(
    boardData: any,
    format: 'pdf' | 'png' | 'link',
  ): Promise<string> {
    try {
      switch (format) {
        case 'pdf':
          return this.exportToPDF(boardData);
        case 'png':
          return this.exportToPNG(boardData);
        case 'link':
          return this.generateShareableLink(boardData);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Error exporting mood board:', error);
      throw new Error(`Failed to export mood board: ${error}`);
    }
  }

  /**
   * Start collaborative editing session
   */
  startCollaborativeSession(
    boardId: string,
    participants: string[],
  ): CollaborativeSession {
    const session: CollaborativeSession = {
      id: boardId,
      participants,
      currentEditor: participants[0],
      changes: [],
      lastSync: new Date(),
    };

    this.collaborativeSessions.set(boardId, session);
    return session;
  }

  /**
   * Apply collaborative change
   */
  applyCollaborativeChange(
    boardId: string,
    change: MoodBoardChange,
  ): CollaborativeSession | null {
    const session = this.collaborativeSessions.get(boardId);
    if (!session) return null;

    session.changes.push(change);
    session.lastSync = new Date();
    session.currentEditor = change.userId;

    return session;
  }

  // Private helper methods

  private extractDominantColors(analyses: ColorHarmonyAnalysis[]): string[] {
    const colorCounts = new Map<string, number>();

    analyses.forEach((analysis) => {
      analysis.dominant_colors.forEach((color) => {
        colorCounts.set(
          color.hex,
          (colorCounts.get(color.hex) || 0) + color.dominance,
        );
      });
    });

    return Array.from(colorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([color]) => color);
  }

  private extractThemes(analyses: ColorHarmonyAnalysis[]): {
    [theme: string]: number;
  } {
    const themeCounts: { [theme: string]: number } = {};

    analyses.forEach((analysis) => {
      analysis.theme_matches.forEach((match) => {
        themeCounts[match.theme] =
          (themeCounts[match.theme] || 0) + match.compatibility_score;
      });
    });

    return themeCounts;
  }

  private determinePrimaryTheme(themes: {
    [theme: string]: number;
  }): MoodBoardTheme {
    const sortedThemes = Object.entries(themes).sort(([, a], [, b]) => b - a);
    const primaryTheme = sortedThemes[0] || ['romantic', 0];

    return {
      id: `theme_${primaryTheme[0]}`,
      name: this.capitalizeFirst(primaryTheme[0]),
      description: this.getThemeDescription(primaryTheme[0]),
      primaryColors: this.getThemeColors(primaryTheme[0]),
      mood: this.getThemeMood(primaryTheme[0]),
      style: primaryTheme[0],
    };
  }

  private calculateColorHarmonyScore(analyses: ColorHarmonyAnalysis[]): number {
    if (analyses.length === 0) return 0;

    const harmonyScores = analyses.flatMap((analysis) =>
      analysis.color_harmonies.map((harmony) => harmony.harmony_score),
    );

    return (
      harmonyScores.reduce((sum, score) => sum + score, 0) /
      harmonyScores.length /
      10
    );
  }

  private calculateStyleConsistency(analyses: ColorHarmonyAnalysis[]): number {
    if (analyses.length < 2) return 1;

    const seasonCounts = new Map<string, number>();
    analyses.forEach((analysis) => {
      const season = analysis.seasonal_analysis.season;
      seasonCounts.set(season, (seasonCounts.get(season) || 0) + 1);
    });

    const maxCount = Math.max(...seasonCounts.values());
    return maxCount / analyses.length;
  }

  private calculateMoodAlignment(analyses: ColorHarmonyAnalysis[]): number {
    if (analyses.length === 0) return 0;

    const moodScores = analyses.map(
      (analysis) => analysis.mood_board_compatibility,
    );
    return (
      moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length
    );
  }

  private calculateStyleDistribution(analyses: ColorHarmonyAnalysis[]): {
    [style: string]: number;
  } {
    const distribution: { [style: string]: number } = {};

    analyses.forEach((analysis) => {
      analysis.theme_matches.forEach((match) => {
        distribution[match.theme] = (distribution[match.theme] || 0) + 1;
      });
    });

    // Normalize to percentages
    const total = Object.values(distribution).reduce(
      (sum, count) => sum + count,
      0,
    );
    Object.keys(distribution).forEach((key) => {
      distribution[key] = distribution[key] / total;
    });

    return distribution;
  }

  private async generateCoherenceRecommendations(
    analyses: ColorHarmonyAnalysis[],
    consistencyScore: number,
    theme: MoodBoardTheme,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (consistencyScore < 0.5) {
      recommendations.push(
        "Consider removing photos that don't match the overall aesthetic",
      );
      recommendations.push(
        'Focus on a single color palette for better coherence',
      );
    }

    if (consistencyScore >= 0.5 && consistencyScore < 0.7) {
      recommendations.push(
        'Good foundation - try adding 1-2 more photos in similar style',
      );
      recommendations.push(
        'Consider adjusting photo positions for better visual flow',
      );
    }

    if (consistencyScore >= 0.7) {
      recommendations.push(
        'Excellent coherence! Your mood board tells a cohesive story',
      );
      recommendations.push(
        'Consider adding text overlays to complete the vision',
      );
    }

    return recommendations;
  }

  private async generateContextualRecommendations(
    photos: MoodBoardPhoto[],
    analysis: BoardCoherenceAnalysis,
    weddingTheme?: string,
    photographerId?: string,
  ): Promise<string[]> {
    try {
      const prompt = `
        Analyze this wedding mood board and provide specific, actionable recommendations:
        
        Photos: ${photos.length} images
        Theme: ${analysis.theme.name}
        Consistency Score: ${Math.round(analysis.consistencyScore * 100)}%
        Wedding Theme: ${weddingTheme || 'Not specified'}
        
        Provide 2-3 specific recommendations for improving this mood board.
        Focus on practical advice about color, composition, and style.
      `;

      const response = await openai.chat.completions.create({
        model: this.aiModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });

      const aiText = response.choices[0]?.message?.content || '';
      return this.parseAIRecommendations(aiText);
    } catch (error) {
      console.error('Error generating contextual recommendations:', error);
      return [];
    }
  }

  private parseAIRecommendations(text: string): string[] {
    return text
      .split('\n')
      .filter((line) => line.trim().length > 10)
      .map((line) => line.replace(/^\d+\.?\s*/, '').trim())
      .slice(0, 3);
  }

  private calculateThemeCompatibility(
    analysis: BoardCoherenceAnalysis,
    targetTheme: string,
  ): number {
    const themeScore = analysis.styleDistribution[targetTheme] || 0;
    return (
      themeScore +
      analysis.consistencyScore * 0.3 +
      analysis.colorHarmonyScore * 0.2
    );
  }

  // Layout arrangement methods

  private arrangeGridLayout(photos: MoodBoardPhoto[]): MoodBoardPhoto[] {
    const cols = Math.ceil(Math.sqrt(photos.length));
    const cellSize = 200;
    const gap = 16;

    return photos.map((photo, index) => ({
      ...photo,
      position: {
        x: (index % cols) * (cellSize + gap) + gap,
        y: Math.floor(index / cols) * (cellSize + gap) + gap,
      },
      size: { width: cellSize, height: cellSize },
      rotation: 0,
    }));
  }

  private arrangeMasonryLayout(photos: MoodBoardPhoto[]): MoodBoardPhoto[] {
    const cols = 3;
    const colHeights = new Array(cols).fill(0);
    const cellWidth = 200;
    const gap = 16;

    return photos.map((photo, index) => {
      const shortestCol = colHeights.indexOf(Math.min(...colHeights));
      const height = cellWidth * (0.8 + Math.random() * 0.4); // Vary height

      const position = {
        x: shortestCol * (cellWidth + gap) + gap,
        y: colHeights[shortestCol] + gap,
      };

      colHeights[shortestCol] += height + gap;

      return {
        ...photo,
        position,
        size: { width: cellWidth, height },
        rotation: 0,
      };
    });
  }

  private arrangeCollageLayout(photos: MoodBoardPhoto[]): MoodBoardPhoto[] {
    return photos.map((photo, index) => ({
      ...photo,
      position: {
        x: Math.random() * 400 + 50,
        y: Math.random() * 400 + 50,
      },
      size: {
        width: 150 + Math.random() * 100,
        height: 150 + Math.random() * 100,
      },
      rotation: (Math.random() - 0.5) * 30, // Random rotation -15 to 15 degrees
    }));
  }

  private arrangeFreeformLayout(photos: MoodBoardPhoto[]): MoodBoardPhoto[] {
    // Smart positioning based on color and content analysis
    return photos.map((photo, index) => {
      const angle = (index * 137.508 * Math.PI) / 180; // Golden angle
      const radius = Math.sqrt(index) * 50;

      return {
        ...photo,
        position: {
          x: 300 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle),
        },
        size: { width: 180, height: 180 },
        rotation: Math.random() * 10 - 5,
      };
    });
  }

  private generateArrangementByColor(
    photos: MoodBoardPhoto[],
    analyses: ColorHarmonyAnalysis[],
  ): MoodBoardPhoto[] {
    // Sort by dominant color hue
    const photosWithHue = photos.map((photo, index) => ({
      photo,
      hue: analyses[index]?.dominant_colors[0]?.hsl?.h || 0,
    }));

    photosWithHue.sort((a, b) => a.hue - b.hue);
    return photosWithHue.map((item) => item.photo);
  }

  private generateArrangementByMood(
    photos: MoodBoardPhoto[],
    analyses: ColorHarmonyAnalysis[],
  ): MoodBoardPhoto[] {
    // Sort by mood board compatibility
    const photosWithMood = photos.map((photo, index) => ({
      photo,
      mood: analyses[index]?.mood_board_compatibility || 0,
    }));

    photosWithMood.sort((a, b) => b.mood - a.mood);
    return photosWithMood.map((item) => item.photo);
  }

  private generateArrangementByStyle(
    photos: MoodBoardPhoto[],
    analyses: ColorHarmonyAnalysis[],
  ): MoodBoardPhoto[] {
    // Group by seasonal alignment
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    const groupedPhotos: { [season: string]: MoodBoardPhoto[] } = {};

    photos.forEach((photo, index) => {
      const season = analyses[index]?.seasonal_analysis.season || 'spring';
      if (!groupedPhotos[season]) groupedPhotos[season] = [];
      groupedPhotos[season].push(photo);
    });

    // Flatten in seasonal order
    return seasons.flatMap((season) => groupedPhotos[season] || []);
  }

  private scoreArrangement(
    photos: MoodBoardPhoto[],
    analyses: ColorHarmonyAnalysis[],
  ): number {
    let score = 0;

    // Score based on visual flow (adjacent photos should have similar colors)
    for (let i = 0; i < photos.length - 1; i++) {
      const current = analyses.find((a) => a.photo_id === photos[i].id);
      const next = analyses.find((a) => a.photo_id === photos[i + 1].id);

      if (current && next) {
        const colorSimilarity = this.calculateColorSimilarity(
          current.dominant_colors,
          next.dominant_colors,
        );
        score += colorSimilarity;
      }
    }

    return score / (photos.length - 1);
  }

  private calculateColorSimilarity(colors1: any[], colors2: any[]): number {
    if (!colors1.length || !colors2.length) return 0;

    let maxSimilarity = 0;
    for (const c1 of colors1) {
      for (const c2 of colors2) {
        const similarity = this.getColorDistance(c1.hsl, c2.hsl);
        maxSimilarity = Math.max(maxSimilarity, 1 - similarity / 180);
      }
    }

    return maxSimilarity;
  }

  private getColorDistance(hsl1: any, hsl2: any): number {
    return Math.abs(hsl1.h - hsl2.h);
  }

  // Export methods

  private async exportToPDF(boardData: any): Promise<string> {
    // Implementation would use PDF generation library
    const timestamp = Date.now();
    return `https://api.wedsync.com/mood-boards/export/pdf/${boardData.id}?t=${timestamp}`;
  }

  private async exportToPNG(boardData: any): Promise<string> {
    // Implementation would use canvas/image generation
    const timestamp = Date.now();
    return `https://api.wedsync.com/mood-boards/export/png/${boardData.id}?t=${timestamp}`;
  }

  private async generateShareableLink(boardData: any): Promise<string> {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Store shareable data
    return `https://wedsync.com/mood-boards/shared/${shareId}`;
  }

  private getEmptyAnalysis(): BoardCoherenceAnalysis {
    return {
      theme: {
        id: 'empty',
        name: 'No Theme',
        description: 'Add photos to detect theme',
        primaryColors: [],
        mood: 'neutral',
        style: 'mixed',
      },
      colorPalette: [],
      consistencyScore: 0,
      recommendations: ['Add photos to get started'],
      styleDistribution: {},
      moodAlignment: 0,
      colorHarmonyScore: 0,
    };
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getThemeDescription(theme: string): string {
    const descriptions: { [key: string]: string } = {
      romantic:
        'Soft, dreamy aesthetics with gentle colors and intimate moments',
      rustic: 'Natural, earthy elements with warm tones and organic textures',
      modern:
        'Clean, contemporary style with bold lines and minimalist approach',
      vintage: 'Timeless charm with muted colors and nostalgic elements',
      beach: 'Coastal vibes with blues, whites, and natural seaside elements',
      garden: 'Fresh, botanical style with greens and natural outdoor settings',
    };
    return (
      descriptions[theme] ||
      'Custom aesthetic combining multiple style elements'
    );
  }

  private getThemeColors(theme: string): string[] {
    const themeColors: { [key: string]: string[] } = {
      romantic: ['#FFB6C1', '#F0E68C', '#DDA0DD', '#FFF8DC'],
      rustic: ['#8B4513', '#D2691E', '#F4A460', '#DEB887'],
      modern: ['#000000', '#FFFFFF', '#808080', '#C0C0C0'],
      vintage: ['#F5F5DC', '#D2B48C', '#BC8F8F', '#F0E68C'],
      beach: ['#87CEEB', '#F0F8FF', '#E0FFFF', '#B0E0E6'],
      garden: ['#90EE90', '#98FB98', '#F0FFF0', '#ADFF2F'],
    };
    return themeColors[theme] || ['#FFFFFF', '#000000'];
  }

  private getThemeMood(theme: string): string {
    const moods: { [key: string]: string } = {
      romantic: 'intimate',
      rustic: 'cozy',
      modern: 'sophisticated',
      vintage: 'nostalgic',
      beach: 'relaxed',
      garden: 'fresh',
    };
    return moods[theme] || 'creative';
  }
}

// Export singleton instance
export const moodBoardService = new MoodBoardService();

// Export convenience methods
export const analyzeBoardCoherence = (photos: MoodBoardPhoto[]) =>
  moodBoardService.analyzeBoardCoherence(photos);

export const generateAIRecommendations = (
  photos: MoodBoardPhoto[],
  weddingTheme?: string,
  photographerId?: string,
) =>
  moodBoardService.generateAIRecommendations(
    photos,
    weddingTheme,
    photographerId,
  );

export const autoArrangePhotos = (
  photos: MoodBoardPhoto[],
  layout: 'grid' | 'masonry' | 'collage' | 'freeform',
) => moodBoardService.autoArrangePhotos(photos, layout);

export const exportMoodBoard = (
  boardData: any,
  format: 'pdf' | 'png' | 'link',
) => moodBoardService.exportBoard(boardData, format);
