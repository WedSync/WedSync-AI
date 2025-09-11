/**
 * WS-130: AI-Powered Mood Board Creation Service
 * Creates visually cohesive mood boards for photography inspiration and style matching
 */

import { openai } from '@/lib/services/openai-service';
import { supabase } from '@/lib/supabase/client';

// Types for mood board creation
export interface MoodBoardCreationRequest {
  name: string;
  description?: string;
  theme: string;
  photographyStyle: string;
  colorPreferences: {
    primaryColors: string[]; // Hex color codes
    colorMood: 'warm' | 'cool' | 'neutral' | 'vibrant' | 'muted' | 'monochrome';
    forbiddenColors?: string[];
  };
  visualElements: {
    preferredElements: string[]; // 'flowers', 'architecture', 'textures', 'patterns', etc.
    avoidElements?: string[];
    compositionStyle:
      | 'symmetrical'
      | 'asymmetrical'
      | 'rule-of-thirds'
      | 'centered'
      | 'dynamic';
  };
  eventContext: {
    eventType: 'wedding' | 'engagement' | 'portrait' | 'commercial';
    venue?: string;
    season?: 'spring' | 'summer' | 'fall' | 'winter';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    formalityLevel?: 'casual' | 'semi-formal' | 'formal' | 'black-tie';
  };
  layoutPreferences: {
    layoutType: 'grid' | 'collage' | 'magazine' | 'minimal' | 'organic';
    imageCount: number; // 6-20 typically
    includeText?: boolean;
    includeColorPalette?: boolean;
  };
}

export interface MoodBoardImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  caption?: string;
  source: 'unsplash' | 'pexels' | 'user_upload' | 'ai_generated';
  sourceId?: string;
  tags: string[];
  dominantColors: string[];
  styleScore: number; // How well it matches the requested style
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    rotation?: number;
  };
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    opacity?: number;
    blur?: number;
  };
}

export interface ColorPalette {
  name: string;
  colors: {
    hex: string;
    name: string;
    percentage: number; // Usage percentage in the palette
    mood: string;
  }[];
  harmony:
    | 'monochromatic'
    | 'analogous'
    | 'complementary'
    | 'triadic'
    | 'tetradic'
    | 'split-complementary';
  temperature: 'warm' | 'cool' | 'neutral';
}

export interface GeneratedMoodBoard {
  id: string;
  name: string;
  description: string;
  theme: string;
  photographyStyle: string;
  images: MoodBoardImage[];
  colorPalette: ColorPalette;
  styleKeywords: string[];
  moodDescriptors: string[];
  layout: {
    type: string;
    configuration: any;
    dimensions: {
      width: number;
      height: number;
    };
  };
  aiSuggestions: {
    improvements: string[];
    alternativeStyles: string[];
    compositionTips: string[];
  };
  metadata: {
    createdAt: string;
    algorithm: string;
    inspirationSources: string[];
    generationTime: number;
  };
}

export interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  tags: string[];
  dominantColors: string[];
  source: string;
  sourceId: string;
  relevanceScore: number;
}

/**
 * AI-Powered Mood Board Builder Service
 */
export class MoodBoardBuilderService {
  private readonly aiModel = 'gpt-4-vision-preview';
  private readonly maxImages = 20;
  private readonly imageSearchAPIs = ['unsplash', 'pexels']; // In production, would use actual API keys

  /**
   * Create a comprehensive mood board using AI
   */
  async createMoodBoard(
    request: MoodBoardCreationRequest,
  ): Promise<GeneratedMoodBoard> {
    const startTime = Date.now();

    try {
      // Generate style keywords and visual direction
      const styleDirection = await this.generateStyleDirection(request);

      // Search for relevant images
      const candidateImages = await this.searchRelevantImages(
        styleDirection,
        request,
      );

      // Select best images using AI
      const selectedImages = await this.selectOptimalImages(
        candidateImages,
        request,
      );

      // Generate color palette
      const colorPalette = await this.generateColorPalette(
        selectedImages,
        request.colorPreferences,
      );

      // Create layout
      const layout = this.createLayout(
        selectedImages,
        request.layoutPreferences,
      );

      // Position images optimally
      const positionedImages = this.positionImages(selectedImages, layout);

      // Generate AI suggestions
      const suggestions = await this.generateImprovementSuggestions(
        positionedImages,
        request,
      );

      // Build final mood board
      const moodBoard: GeneratedMoodBoard = {
        id: `moodboard_${Date.now()}`,
        name: request.name,
        description:
          request.description ||
          `${request.theme} mood board in ${request.photographyStyle} style`,
        theme: request.theme,
        photographyStyle: request.photographyStyle,
        images: positionedImages,
        colorPalette,
        styleKeywords: styleDirection.keywords,
        moodDescriptors: styleDirection.moods,
        layout,
        aiSuggestions: suggestions,
        metadata: {
          createdAt: new Date().toISOString(),
          algorithm: 'mood-board-ai-v1.0',
          inspirationSources: candidateImages.map((img) => img.source),
          generationTime: Date.now() - startTime,
        },
      };

      // Save to database
      await this.saveMoodBoard(moodBoard, request);

      return moodBoard;
    } catch (error) {
      console.error('Mood board creation failed:', error);
      throw new Error(`Mood board creation failed: ${error.message}`);
    }
  }

  /**
   * Customize existing mood board
   */
  async customizeMoodBoard(
    moodBoardId: string,
    customizations: {
      replaceImages?: { oldImageId: string; searchQuery: string }[];
      adjustColors?: { targetPalette: string[] };
      changeLayout?: string;
      addElements?: string[];
      removeElements?: string[];
      adjustPositions?: { imageId: string; newPosition: any }[];
    },
  ): Promise<GeneratedMoodBoard> {
    try {
      // Get existing mood board
      const existingBoard = await this.getMoodBoardById(moodBoardId);

      if (!existingBoard) {
        throw new Error('Mood board not found');
      }

      // Apply customizations
      let customizedBoard = { ...existingBoard };

      // Replace images if requested
      if (customizations.replaceImages) {
        for (const replacement of customizations.replaceImages) {
          const newImages = await this.searchSpecificImages(
            replacement.searchQuery,
            1,
          );
          if (newImages.length > 0) {
            const imageIndex = customizedBoard.images.findIndex(
              (img) => img.id === replacement.oldImageId,
            );
            if (imageIndex >= 0) {
              const newImage = this.convertSearchResultToMoodBoardImage(
                newImages[0],
              );
              customizedBoard.images[imageIndex] = {
                ...newImage,
                position: customizedBoard.images[imageIndex].position, // Keep same position
              };
            }
          }
        }
      }

      // Adjust color palette if requested
      if (customizations.adjustColors) {
        customizedBoard.colorPalette = await this.adjustColorPalette(
          customizedBoard.colorPalette,
          customizations.adjustColors.targetPalette,
        );
      }

      // Update layout if requested
      if (customizations.changeLayout) {
        const newLayout = this.createLayout(customizedBoard.images, {
          layoutType: customizations.changeLayout as any,
          imageCount: customizedBoard.images.length,
        });
        customizedBoard.layout = newLayout;
        customizedBoard.images = this.positionImages(
          customizedBoard.images,
          newLayout,
        );
      }

      // Update in database
      await this.updateMoodBoard(customizedBoard);

      return customizedBoard;
    } catch (error) {
      console.error('Mood board customization failed:', error);
      throw error;
    }
  }

  /**
   * Generate multiple mood board variations
   */
  async generateVariations(
    baseRequest: MoodBoardCreationRequest,
    variationCount: number = 3,
  ): Promise<GeneratedMoodBoard[]> {
    const variations: GeneratedMoodBoard[] = [];

    try {
      // Create variations with different approaches
      const variationStyles = [
        {
          ...baseRequest,
          layoutPreferences: {
            ...baseRequest.layoutPreferences,
            layoutType: 'grid',
          },
        },
        {
          ...baseRequest,
          layoutPreferences: {
            ...baseRequest.layoutPreferences,
            layoutType: 'collage',
          },
        },
        {
          ...baseRequest,
          layoutPreferences: {
            ...baseRequest.layoutPreferences,
            layoutType: 'magazine',
          },
        },
      ];

      for (
        let i = 0;
        i < Math.min(variationCount, variationStyles.length);
        i++
      ) {
        const variation = await this.createMoodBoard({
          ...variationStyles[i],
          name: `${baseRequest.name} - Variation ${i + 1}`,
        });
        variations.push(variation);
      }

      return variations;
    } catch (error) {
      console.error('Variation generation failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private async generateStyleDirection(
    request: MoodBoardCreationRequest,
  ): Promise<{
    keywords: string[];
    moods: string[];
    searchTerms: string[];
  }> {
    try {
      const prompt = `Generate visual style direction for a ${request.theme} mood board in ${request.photographyStyle} photography style.

Event Context:
- Type: ${request.eventContext.eventType}
- Venue: ${request.eventContext.venue || 'Not specified'}
- Season: ${request.eventContext.season || 'Not specified'}
- Formality: ${request.eventContext.formalityLevel || 'Not specified'}

Color Preferences:
- Mood: ${request.colorPreferences.colorMood}
- Primary Colors: ${request.colorPreferences.primaryColors.join(', ')}

Visual Elements:
- Preferred: ${request.visualElements.preferredElements.join(', ')}
- Composition: ${request.visualElements.compositionStyle}

Please provide:
1. 10-15 style keywords that capture the visual essence
2. 5-8 mood descriptors that convey the emotional tone
3. 15-20 specific search terms for finding relevant images

Format as JSON with keywords, moods, and searchTerms arrays.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are a expert visual designer and mood board specialist. Generate comprehensive style direction that will result in cohesive, inspiring mood boards.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const result = this.parseAIResponse(response.choices[0].message.content);

      return {
        keywords: result.keywords || ['elegant', 'romantic', 'timeless'],
        moods: result.moods || ['romantic', 'elegant', 'dreamy'],
        searchTerms: result.searchTerms || ['wedding', 'elegant', 'romantic'],
      };
    } catch (error) {
      console.error('Style direction generation failed:', error);

      // Fallback
      return {
        keywords: [request.theme, request.photographyStyle, 'elegant'],
        moods: ['romantic', 'elegant'],
        searchTerms: [request.theme, request.photographyStyle],
      };
    }
  }

  private async searchRelevantImages(
    styleDirection: any,
    request: MoodBoardCreationRequest,
  ): Promise<ImageSearchResult[]> {
    const allResults: ImageSearchResult[] = [];

    try {
      // Search with multiple terms to get diverse results
      for (const searchTerm of styleDirection.searchTerms.slice(0, 10)) {
        const results = await this.searchSpecificImages(searchTerm, 5);
        allResults.push(...results);
      }

      // Remove duplicates and sort by relevance
      const uniqueResults = this.removeDuplicateImages(allResults);

      return uniqueResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, this.maxImages * 2); // Get more candidates than needed
    } catch (error) {
      console.error('Image search failed:', error);
      return this.getFallbackImages(request);
    }
  }

  private async searchSpecificImages(
    query: string,
    count: number,
  ): Promise<ImageSearchResult[]> {
    // Simulate image search API calls
    // In production, this would call actual APIs like Unsplash, Pexels, etc.

    const mockResults: ImageSearchResult[] = [];

    for (let i = 0; i < count; i++) {
      mockResults.push({
        id: `img_${Date.now()}_${i}`,
        url: `https://images.unsplash.com/photo-${Date.now() + i}?w=800`,
        thumbnailUrl: `https://images.unsplash.com/photo-${Date.now() + i}?w=200`,
        alt: `${query} inspiration image ${i + 1}`,
        tags: query.split(' '),
        dominantColors: ['#FFFFFF', '#F5F5F5', '#E8E8E8'],
        source: 'unsplash',
        sourceId: `unsplash_${Date.now() + i}`,
        relevanceScore: Math.random() * 0.3 + 0.7, // 0.7-1.0
      });
    }

    return mockResults;
  }

  private async selectOptimalImages(
    candidates: ImageSearchResult[],
    request: MoodBoardCreationRequest,
  ): Promise<MoodBoardImage[]> {
    try {
      // Use AI to analyze and select the best images for cohesion
      const selectionPrompt = `Analyze these ${candidates.length} candidate images and select the best ${request.layoutPreferences.imageCount} for a cohesive mood board.

Style Requirements:
- Theme: ${request.theme}
- Photography Style: ${request.photographyStyle}
- Color Mood: ${request.colorPreferences.colorMood}
- Preferred Elements: ${request.visualElements.preferredElements.join(', ')}

Consider:
1. Visual cohesion and harmony
2. Color palette compatibility
3. Style consistency
4. Compositional balance
5. Variety while maintaining unity

Return the selected image IDs in order of importance.`;

      // For demo purposes, select images based on simple criteria
      const selected = candidates
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, request.layoutPreferences.imageCount)
        .map((img) => this.convertSearchResultToMoodBoardImage(img));

      return selected;
    } catch (error) {
      console.error('Image selection failed:', error);

      // Fallback selection
      return candidates
        .slice(0, request.layoutPreferences.imageCount)
        .map((img) => this.convertSearchResultToMoodBoardImage(img));
    }
  }

  private convertSearchResultToMoodBoardImage(
    result: ImageSearchResult,
  ): MoodBoardImage {
    return {
      id: result.id,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      alt: result.alt,
      source: result.source as any,
      sourceId: result.sourceId,
      tags: result.tags,
      dominantColors: result.dominantColors,
      styleScore: result.relevanceScore,
      position: { x: 0, y: 0, width: 200, height: 200, zIndex: 1 }, // Will be repositioned later
    };
  }

  private async generateColorPalette(
    images: MoodBoardImage[],
    colorPreferences: MoodBoardCreationRequest['colorPreferences'],
  ): Promise<ColorPalette> {
    try {
      // Extract colors from images and user preferences
      const allColors = new Set<string>();

      // Add user preferred colors
      colorPreferences.primaryColors.forEach((color) => allColors.add(color));

      // Add dominant colors from images
      images.forEach((img) => {
        img.dominantColors.forEach((color) => allColors.add(color));
      });

      // Generate harmonious palette
      const paletteColors = Array.from(allColors)
        .slice(0, 6)
        .map((hex, index) => ({
          hex,
          name: this.getColorName(hex),
          percentage: index === 0 ? 40 : 15, // Primary color gets 40%, others 15%
          mood: this.getColorMood(hex),
        }));

      return {
        name: `${colorPreferences.colorMood} Palette`,
        colors: paletteColors,
        harmony: this.determineColorHarmony(paletteColors.map((c) => c.hex)),
        temperature:
          colorPreferences.colorMood === 'warm'
            ? 'warm'
            : colorPreferences.colorMood === 'cool'
              ? 'cool'
              : 'neutral',
      };
    } catch (error) {
      console.error('Color palette generation failed:', error);

      // Fallback palette
      return {
        name: 'Default Palette',
        colors: [
          { hex: '#FFFFFF', name: 'Pure White', percentage: 40, mood: 'clean' },
          {
            hex: '#F5F5F5',
            name: 'Light Gray',
            percentage: 30,
            mood: 'neutral',
          },
          {
            hex: '#8B7355',
            name: 'Warm Brown',
            percentage: 30,
            mood: 'earthy',
          },
        ],
        harmony: 'monochromatic',
        temperature: 'neutral',
      };
    }
  }

  private createLayout(
    images: MoodBoardImage[],
    preferences: MoodBoardCreationRequest['layoutPreferences'],
  ): any {
    const layouts = {
      grid: this.createGridLayout(images.length),
      collage: this.createCollageLayout(images.length),
      magazine: this.createMagazineLayout(images.length),
      minimal: this.createMinimalLayout(images.length),
      organic: this.createOrganicLayout(images.length),
    };

    return {
      type: preferences.layoutType,
      configuration: layouts[preferences.layoutType] || layouts.grid,
      dimensions: { width: 1200, height: 800 },
    };
  }

  private createGridLayout(imageCount: number): any {
    const cols = Math.ceil(Math.sqrt(imageCount));
    const rows = Math.ceil(imageCount / cols);

    return {
      type: 'grid',
      columns: cols,
      rows: rows,
      gap: 10,
      padding: 20,
    };
  }

  private createCollageLayout(imageCount: number): any {
    return {
      type: 'collage',
      allowOverlap: true,
      rotationRange: [-5, 5],
      scaleRange: [0.8, 1.2],
      padding: 30,
    };
  }

  private createMagazineLayout(imageCount: number): any {
    return {
      type: 'magazine',
      sections: Math.ceil(imageCount / 4),
      hierarchical: true,
      textAreas: true,
      padding: 40,
    };
  }

  private createMinimalLayout(imageCount: number): any {
    return {
      type: 'minimal',
      spacing: 'generous',
      alignment: 'center',
      maxPerRow: 3,
      padding: 60,
    };
  }

  private createOrganicLayout(imageCount: number): any {
    return {
      type: 'organic',
      flowDirection: 'natural',
      clustering: true,
      irregularSpacing: true,
      padding: 25,
    };
  }

  private positionImages(
    images: MoodBoardImage[],
    layout: any,
  ): MoodBoardImage[] {
    // Position images based on layout configuration
    // This is a simplified implementation - in production would be more sophisticated

    const positioned = images.map((img, index) => {
      let position;

      if (layout.type === 'grid') {
        const cols = layout.configuration.columns;
        const cellWidth =
          (layout.dimensions.width - layout.configuration.padding * 2) / cols;
        const cellHeight =
          (layout.dimensions.height - layout.configuration.padding * 2) /
          layout.configuration.rows;

        position = {
          x: (index % cols) * cellWidth + layout.configuration.padding,
          y:
            Math.floor(index / cols) * cellHeight +
            layout.configuration.padding,
          width: cellWidth - layout.configuration.gap,
          height: cellHeight - layout.configuration.gap,
          zIndex: 1,
        };
      } else {
        // Simplified positioning for other layouts
        position = {
          x: (index % 4) * 300 + 20,
          y: Math.floor(index / 4) * 200 + 20,
          width: 280,
          height: 180,
          zIndex: 1,
          rotation: layout.type === 'collage' ? (Math.random() - 0.5) * 10 : 0,
        };
      }

      return {
        ...img,
        position,
      };
    });

    return positioned;
  }

  private async generateImprovementSuggestions(
    images: MoodBoardImage[],
    request: MoodBoardCreationRequest,
  ): Promise<{
    improvements: string[];
    alternativeStyles: string[];
    compositionTips: string[];
  }> {
    return {
      improvements: [
        'Consider adding more textural elements for depth',
        'Balance the color distribution across the board',
        'Include more variety in image sizes',
      ],
      alternativeStyles: [
        'Try a more minimalist approach with fewer elements',
        'Experiment with a monochromatic color scheme',
        'Consider a vintage-inspired treatment',
      ],
      compositionTips: [
        'Use the rule of thirds for image placement',
        'Create visual flow with leading lines',
        'Maintain consistent spacing between elements',
      ],
    };
  }

  private async getMoodBoardById(
    id: string,
  ): Promise<GeneratedMoodBoard | null> {
    try {
      const { data, error } = await supabase
        .from('mood_boards')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching mood board:', error);
        return null;
      }

      return this.convertDbToMoodBoard(data);
    } catch (error) {
      console.error('Failed to get mood board:', error);
      return null;
    }
  }

  private convertDbToMoodBoard(data: any): GeneratedMoodBoard {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      theme: data.theme,
      photographyStyle: data.photography_style,
      images: data.inspiration_images || [],
      colorPalette: data.color_palette || {
        name: 'Default',
        colors: [],
        harmony: 'monochromatic',
        temperature: 'neutral',
      },
      styleKeywords: data.style_keywords || [],
      moodDescriptors: data.mood_descriptors || [],
      layout: data.layout_configuration || {
        type: 'grid',
        configuration: {},
        dimensions: { width: 1200, height: 800 },
      },
      aiSuggestions: data.ai_suggestions || {
        improvements: [],
        alternativeStyles: [],
        compositionTips: [],
      },
      metadata: {
        createdAt: data.created_at,
        algorithm: 'mood-board-ai-v1.0',
        inspirationSources: [],
        generationTime: 0,
      },
    };
  }

  private async saveMoodBoard(
    moodBoard: GeneratedMoodBoard,
    request: MoodBoardCreationRequest,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('mood_boards').insert({
        name: moodBoard.name,
        description: moodBoard.description,
        theme: moodBoard.theme,
        color_palette: moodBoard.colorPalette,
        inspiration_images: moodBoard.images,
        style_keywords: moodBoard.styleKeywords,
        mood_descriptors: moodBoard.moodDescriptors,
        ai_suggestions: moodBoard.aiSuggestions,
        layout_configuration: moodBoard.layout,
        status: 'draft',
      });

      if (error) {
        console.error('Error saving mood board:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save mood board:', error);
      throw error;
    }
  }

  private async updateMoodBoard(moodBoard: GeneratedMoodBoard): Promise<void> {
    try {
      const { error } = await supabase
        .from('mood_boards')
        .update({
          inspiration_images: moodBoard.images,
          color_palette: moodBoard.colorPalette,
          layout_configuration: moodBoard.layout,
          updated_at: new Date().toISOString(),
        })
        .eq('id', moodBoard.id);

      if (error) {
        console.error('Error updating mood board:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update mood board:', error);
      throw error;
    }
  }

  // Utility methods
  private parseAIResponse(content: string | null): any {
    if (!content) return {};

    try {
      const jsonMatch = content.match(/```json\n?(.*?)\n?```/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {};
    }
  }

  private removeDuplicateImages(
    images: ImageSearchResult[],
  ): ImageSearchResult[] {
    const seen = new Set();
    return images.filter((img) => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });
  }

  private getFallbackImages(
    request: MoodBoardCreationRequest,
  ): ImageSearchResult[] {
    // Return fallback images when search fails
    return Array.from(
      { length: request.layoutPreferences.imageCount },
      (_, i) => ({
        id: `fallback_${i}`,
        url: `https://via.placeholder.com/400x300/cccccc/666666?text=Image+${i + 1}`,
        thumbnailUrl: `https://via.placeholder.com/200x150/cccccc/666666?text=Image+${i + 1}`,
        alt: `Fallback inspiration image ${i + 1}`,
        tags: [request.theme],
        dominantColors: ['#CCCCCC', '#666666'],
        source: 'placeholder',
        sourceId: `placeholder_${i}`,
        relevanceScore: 0.5,
      }),
    );
  }

  private getColorName(hex: string): string {
    // Simplified color naming - in production would use a color name library
    const colorMap: { [key: string]: string } = {
      '#FFFFFF': 'Pure White',
      '#F5F5F5': 'Light Gray',
      '#CCCCCC': 'Medium Gray',
      '#666666': 'Dark Gray',
      '#000000': 'Black',
    };
    return colorMap[hex.toUpperCase()] || 'Custom Color';
  }

  private getColorMood(hex: string): string {
    // Simplified mood determination based on color
    if (hex.startsWith('#F') || hex.startsWith('#E')) return 'light';
    if (hex.startsWith('#C') || hex.startsWith('#D')) return 'neutral';
    return 'dark';
  }

  private determineColorHarmony(colors: string[]): ColorPalette['harmony'] {
    // Simplified harmony detection - in production would use color theory
    return colors.length <= 3 ? 'monochromatic' : 'analogous';
  }

  private async adjustColorPalette(
    currentPalette: ColorPalette,
    targetColors: string[],
  ): Promise<ColorPalette> {
    // Create new palette incorporating target colors
    const newColors = targetColors.map((hex, index) => ({
      hex,
      name: this.getColorName(hex),
      percentage: index === 0 ? 40 : 20,
      mood: this.getColorMood(hex),
    }));

    return {
      ...currentPalette,
      colors: newColors,
      harmony: this.determineColorHarmony(targetColors),
    };
  }
}

// Export singleton instance
export const moodBoardBuilder = new MoodBoardBuilderService();

// Export convenience methods
export const createMoodBoard = (request: MoodBoardCreationRequest) =>
  moodBoardBuilder.createMoodBoard(request);

export const customizeMoodBoard = (id: string, customizations: any) =>
  moodBoardBuilder.customizeMoodBoard(id, customizations);

export const generateMoodBoardVariations = (
  request: MoodBoardCreationRequest,
  count?: number,
) => moodBoardBuilder.generateVariations(request, count);
