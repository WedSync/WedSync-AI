/**
 * WS-130: AI Color Harmony Analyzer with Enhanced Error Handling
 * Advanced color analysis system with comprehensive fallback mechanisms
 */

import { OpenAI } from 'openai';
import { handleColorAnalysisWithFallback } from './error-handler';

export interface ColorHarmonyAnalysis {
  dominantColors: string[];
  colorPalette: ColorPalette;
  harmony: HarmonyType;
  mood: MoodType;
  weddingThemeMatch: WeddingThemeMatch[];
  confidence: number;
  metadata: {
    imageId: string;
    processingTime: number;
    method: 'ai' | 'fallback' | 'manual';
    fallback?: boolean;
    error?: string;
  };
}

export interface ColorPalette {
  primary: string;
  secondary: string[];
  accent: string[];
  neutral: string[];
}

export type HarmonyType =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'monochromatic'
  | 'split-complementary'
  | 'unknown';

export type MoodType =
  | 'warm'
  | 'cool'
  | 'neutral'
  | 'vibrant'
  | 'muted'
  | 'romantic'
  | 'modern'
  | 'classic'
  | 'unknown';

export interface WeddingThemeMatch {
  theme: string;
  compatibility: number;
  reasoning: string;
  suggestedAccents: string[];
}

/**
 * Enhanced Color Harmony Analyzer with Error Handling
 */
export class ColorHarmonyAnalyzer {
  private openai: OpenAI;
  private cache = new Map<string, ColorHarmonyAnalysis>();
  private readonly cacheTTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  /**
   * Analyze color harmony with comprehensive error handling
   */
  async analyzeColorHarmony(
    imageBase64: string,
    photoId: string,
    options: {
      useCache?: boolean;
      timeout?: number;
      fallbackEnabled?: boolean;
    } = {},
  ): Promise<ColorHarmonyAnalysis> {
    const {
      useCache = true,
      timeout = 30000,
      fallbackEnabled = true,
    } = options;
    const startTime = Date.now();

    // Check cache first
    if (useCache) {
      const cached = this.getCachedAnalysis(photoId);
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            processingTime: Date.now() - startTime,
          },
        };
      }
    }

    // Use error handler with fallback
    return handleColorAnalysisWithFallback(imageBase64, photoId, async () => {
      const analysis = await this.performAiColorAnalysis(
        imageBase64,
        photoId,
        timeout,
      );

      // Cache successful analysis
      if (useCache && analysis.confidence > 0.7) {
        this.cacheAnalysis(photoId, analysis);
      }

      return analysis;
    });
  }

  /**
   * Primary AI color analysis
   */
  private async performAiColorAnalysis(
    imageBase64: string,
    photoId: string,
    timeout: number,
  ): Promise<ColorHarmonyAnalysis> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Color analysis timeout')), timeout);
      });

      const analysisPromise = this.openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this wedding-related image for color harmony. Provide a detailed analysis including:
                1. Dominant colors (hex codes)
                2. Color harmony type
                3. Mood/feeling the colors convey
                4. Wedding theme compatibility
                5. Suggested accent colors
                
                Return your analysis in the following JSON format:
                {
                  "dominantColors": ["#hex1", "#hex2", "#hex3"],
                  "primary": "#primaryhex",
                  "secondary": ["#sec1", "#sec2"],
                  "accent": ["#acc1", "#acc2"],
                  "neutral": ["#neu1", "#neu2"],
                  "harmony": "complementary|analogous|triadic|tetradic|monochromatic|split-complementary",
                  "mood": "warm|cool|neutral|vibrant|muted|romantic|modern|classic",
                  "weddingThemes": [
                    {
                      "theme": "rustic",
                      "compatibility": 0.95,
                      "reasoning": "Earth tones and natural colors align perfectly",
                      "suggestedAccents": ["#accent1", "#accent2"]
                    }
                  ],
                  "confidence": 0.92
                }`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      });

      const response = await Promise.race([analysisPromise, timeoutPromise]);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No analysis content received from OpenAI');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from OpenAI');
      }

      const aiAnalysis = JSON.parse(jsonMatch[0]);

      return {
        dominantColors: aiAnalysis.dominantColors || [],
        colorPalette: {
          primary:
            aiAnalysis.primary || aiAnalysis.dominantColors?.[0] || '#808080',
          secondary: aiAnalysis.secondary || [],
          accent: aiAnalysis.accent || [],
          neutral: aiAnalysis.neutral || [],
        },
        harmony: aiAnalysis.harmony || 'unknown',
        mood: aiAnalysis.mood || 'unknown',
        weddingThemeMatch: aiAnalysis.weddingThemes || [],
        confidence: aiAnalysis.confidence || 0.5,
        metadata: {
          imageId: photoId,
          processingTime: Date.now() - startTime,
          method: 'ai',
          fallback: false,
        },
      };
    } catch (error) {
      console.error('AI color analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get cached analysis if available and not expired
   */
  private getCachedAnalysis(photoId: string): ColorHarmonyAnalysis | null {
    const cached = this.cache.get(photoId);
    if (!cached) return null;

    const isExpired =
      Date.now() - cached.metadata.processingTime > this.cacheTTL;
    if (isExpired) {
      this.cache.delete(photoId);
      return null;
    }

    return cached;
  }

  /**
   * Cache analysis result
   */
  private cacheAnalysis(photoId: string, analysis: ColorHarmonyAnalysis): void {
    // Limit cache size
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(photoId, {
      ...analysis,
      metadata: {
        ...analysis.metadata,
        processingTime: Date.now(),
      },
    });
  }

  /**
   * Batch analyze multiple images with error handling
   */
  async batchAnalyzeColors(
    images: Array<{ id: string; base64: string }>,
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      continueOnError?: boolean;
    } = {},
  ): Promise<
    Array<{ id: string; analysis: ColorHarmonyAnalysis | null; error?: string }>
  > {
    const {
      batchSize = 3,
      delayBetweenBatches = 1000,
      continueOnError = true,
    } = options;
    const results: Array<{
      id: string;
      analysis: ColorHarmonyAnalysis | null;
      error?: string;
    }> = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      const batchPromises = batch.map(async (image) => {
        try {
          const analysis = await this.analyzeColorHarmony(
            image.base64,
            image.id,
          );
          return { id: image.id, analysis, error: undefined };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          if (!continueOnError) {
            throw error;
          }

          return {
            id: image.id,
            analysis: null,
            error: errorMessage,
          };
        }
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              id: 'unknown',
              analysis: null,
              error: result.reason?.message || 'Batch processing failed',
            });
          }
        });
      } catch (error) {
        console.error('Batch processing error:', error);
        if (!continueOnError) {
          throw error;
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + batchSize < images.length && delayBetweenBatches > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches),
        );
      }
    }

    return results;
  }

  /**
   * Generate complementary color suggestions
   */
  generateComplementaryPalette(dominantColor: string): string[] {
    try {
      const rgb = this.hexToRgb(dominantColor);
      if (!rgb) return [dominantColor];

      const complementary = this.rgbToHex(
        255 - rgb.r,
        255 - rgb.g,
        255 - rgb.b,
      );
      const analogous1 = this.adjustHue(dominantColor, 30);
      const analogous2 = this.adjustHue(dominantColor, -30);
      const triadic1 = this.adjustHue(dominantColor, 120);
      const triadic2 = this.adjustHue(dominantColor, 240);

      return [
        dominantColor,
        complementary,
        analogous1,
        analogous2,
        triadic1,
        triadic2,
      ].filter((color): color is string => color !== null);
    } catch (error) {
      console.error('Error generating complementary palette:', error);
      return [dominantColor];
    }
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; memoryUsage: string } {
    const size = this.cache.size;
    // Note: Hit rate would need to be tracked separately in a real implementation
    const hitRate = 0; // Placeholder
    const memoryUsage = `${Math.round(JSON.stringify([...this.cache.values()]).length / 1024)}KB`;

    return { size, hitRate, memoryUsage };
  }

  // Utility methods
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  private adjustHue(hex: string, degrees: number): string | null {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return null;

    // Convert to HSV, adjust hue, convert back
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    hsv.h = (hsv.h + degrees) % 360;
    if (hsv.h < 0) hsv.h += 360;

    const newRgb = this.hsvToRgb(hsv.h, hsv.s, hsv.v);
    return this.rgbToHex(
      Math.round(newRgb.r),
      Math.round(newRgb.g),
      Math.round(newRgb.b),
    );
  }

  private rgbToHsv(
    r: number,
    g: number,
    b: number,
  ): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    const diff = max - min;
    const v = max;
    const s = max === 0 ? 0 : diff / max;

    let h = 0;
    if (diff !== 0) {
      switch (max) {
        case r:
          h = (g - b) / diff + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s, v };
  }

  private hsvToRgb(
    h: number,
    s: number,
    v: number,
  ): { r: number; g: number; b: number } {
    h /= 360;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r = 0,
      g = 0,
      b = 0;
    switch (i % 6) {
      case 0:
        ((r = v), (g = t), (b = p));
        break;
      case 1:
        ((r = q), (g = v), (b = p));
        break;
      case 2:
        ((r = p), (g = v), (b = t));
        break;
      case 3:
        ((r = p), (g = q), (b = v));
        break;
      case 4:
        ((r = t), (g = p), (b = v));
        break;
      case 5:
        ((r = v), (g = p), (b = q));
        break;
    }

    return { r: r * 255, g: g * 255, b: b * 255 };
  }
}

// Export singleton instance
export const colorHarmonyAnalyzer = new ColorHarmonyAnalyzer();

// Export convenience functions
export const analyzeImageColorHarmony = (
  imageBase64: string,
  photoId: string,
) => colorHarmonyAnalyzer.analyzeColorHarmony(imageBase64, photoId);

export const batchAnalyzeImageColors = (
  images: Array<{ id: string; base64: string }>,
  options?: {
    batchSize?: number;
    delayBetweenBatches?: number;
    continueOnError?: boolean;
  },
) => colorHarmonyAnalyzer.batchAnalyzeColors(images, options);

export const generateColorPalette = (dominantColor: string) =>
  colorHarmonyAnalyzer.generateComplementaryPalette(dominantColor);
