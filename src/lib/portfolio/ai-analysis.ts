// WS-186: AI Analysis Service - Team B Round 1
// Computer vision API integration for automatic wedding scene detection and categorization

import { createClient } from '@supabase/supabase-js';

export interface AIAnalysisOptions {
  imageId: string;
  imageUrl: string;
  category: string;
  supplierId: string;
  originalFilename: string;
}

export interface AIAnalysisResult {
  sceneDetection: {
    primary: string;
    confidence: number;
    secondary?: string[];
  };
  aestheticScore: number;
  styleClassification: {
    style: string;
    confidence: number;
    characteristics: string[];
  };
  objectDetection: Array<{
    object: string;
    confidence: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }>;
  colorAnalysis: {
    dominantColors: Array<{ hex: string; percentage: number }>;
    mood: string;
    temperature: 'warm' | 'cool' | 'neutral';
  };
  accessibility: {
    altText: string;
    description: string;
  };
  tags: string[];
  metadata: {
    processingTime: number;
    model: string;
    confidence: number;
  };
}

export interface WeddingSceneCategories {
  ceremony: string[];
  reception: string[];
  portraits: string[];
  details: string[];
  venue: string[];
}

const WEDDING_SCENE_CATEGORIES: WeddingSceneCategories = {
  ceremony: [
    'altar',
    'aisle',
    'bouquet_toss',
    'bride_walking',
    'ceremony_setup',
    'exchanging_rings',
    'first_kiss',
    'officiant',
    'processional',
    'recessional',
    'unity_ceremony',
    'vows',
    'wedding_party',
  ],
  reception: [
    'cake_cutting',
    'dancing',
    'dinner',
    'first_dance',
    'head_table',
    'parent_dances',
    'reception_hall',
    'speeches',
    'table_setup',
    'toasts',
    'band_dj',
    'guest_dancing',
    'bouquet_toss',
  ],
  portraits: [
    'bride_portrait',
    'groom_portrait',
    'couple_portrait',
    'family_portrait',
    'bridal_party',
    'getting_ready',
    'engagement_session',
    'solo_bride',
    'solo_groom',
    'group_portrait',
    'intimate_moment',
  ],
  details: [
    'wedding_rings',
    'bouquet_details',
    'dress_details',
    'shoes',
    'invitations',
    'centerpieces',
    'place_settings',
    'flowers',
    'jewelry',
    'accessories',
    'decorations',
    'favors',
  ],
  venue: [
    'venue_exterior',
    'venue_interior',
    'landscape',
    'architecture',
    'ceremony_space',
    'reception_space',
    'gardens',
    'ballroom',
    'outdoor_setup',
    'venue_details',
  ],
};

const PHOTOGRAPHY_STYLES = [
  'traditional',
  'photojournalistic',
  'artistic',
  'vintage',
  'contemporary',
  'dramatic',
  'romantic',
  'candid',
  'posed',
];

export class WeddingAIAnalyzer {
  private supabase;
  private openaiApiKey: string;
  private visionModel: string = 'gpt-4-vision-preview';

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.openaiApiKey = process.env.OPENAI_API_KEY!;

    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is required for AI analysis');
    }
  }

  /**
   * Perform comprehensive AI analysis on a wedding image
   */
  async analyzeImage(options: AIAnalysisOptions): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      // Call OpenAI Vision API for comprehensive analysis
      const visionAnalysis = await this.callOpenAIVision(
        options.imageUrl,
        options.category,
      );

      // Process and structure the response
      const structuredResult = await this.structureAnalysisResult(
        visionAnalysis,
        options.category,
        startTime,
      );

      // Save AI analysis to database
      await this.saveAnalysisResult(options.imageId, structuredResult);

      // Update image status to active (processing complete)
      await this.supabase
        .from('portfolio_images')
        .update({
          status: 'active',
          ai_analysis: structuredResult,
          ai_analysis_complete: true,
          tags: structuredResult.tags,
          ai_generated_alt_text: structuredResult.accessibility.altText,
          aesthetic_score: structuredResult.aestheticScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', options.imageId);

      console.log(`AI analysis completed for image ${options.imageId}:`, {
        processingTime: structuredResult.metadata.processingTime,
        confidence: structuredResult.metadata.confidence,
        primaryScene: structuredResult.sceneDetection.primary,
        aestheticScore: structuredResult.aestheticScore,
      });

      return structuredResult;
    } catch (error) {
      console.error('AI analysis error:', error);

      // Log analysis failure
      await this.supabase.from('portfolio_ai_errors').insert({
        image_id: options.imageId,
        supplier_id: options.supplierId,
        original_filename: options.originalFilename,
        error_message:
          error instanceof Error ? error.message : 'Unknown AI analysis error',
        error_details: {
          options,
          timestamp: new Date().toISOString(),
        },
      });

      // Set image status to active but mark AI analysis as failed
      await this.supabase
        .from('portfolio_images')
        .update({
          status: 'active',
          ai_analysis_complete: false,
          ai_analysis_error:
            error instanceof Error ? error.message : 'AI analysis failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', options.imageId);

      throw error;
    }
  }

  /**
   * Call OpenAI Vision API with structured prompts
   */
  private async callOpenAIVision(
    imageUrl: string,
    category: string,
  ): Promise<any> {
    const prompt = this.buildAnalysisPrompt(category);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();

    try {
      // Parse the JSON response from the model
      const analysisText = data.choices[0].message.content;
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.error(
        'Failed to parse OpenAI response:',
        data.choices[0].message.content,
      );
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Build structured analysis prompt based on category
   */
  private buildAnalysisPrompt(category: string): string {
    return `
You are an expert wedding photographer and AI vision analyst. Analyze this wedding image and return a JSON response with the following structure:

{
  "sceneDetection": {
    "primary": "primary_scene_type",
    "confidence": 0.95,
    "secondary": ["secondary_scene_1", "secondary_scene_2"]
  },
  "aestheticScore": 8.5,
  "styleClassification": {
    "style": "photojournalistic",
    "confidence": 0.88,
    "characteristics": ["candid", "natural_lighting", "emotional"]
  },
  "objectDetection": [
    {"object": "bride", "confidence": 0.98},
    {"object": "bouquet", "confidence": 0.92}
  ],
  "colorAnalysis": {
    "dominantColors": [
      {"hex": "#FFFFFF", "percentage": 45},
      {"hex": "#F5F5DC", "percentage": 25}
    ],
    "mood": "romantic",
    "temperature": "warm"
  },
  "accessibility": {
    "altText": "Bride in white dress holding bouquet during ceremony",
    "description": "A detailed description of the image for visually impaired users"
  },
  "tags": ["bride", "ceremony", "bouquet", "white_dress", "romantic"],
  "confidence": 0.87
}

Analysis Guidelines:
1. Scene Detection: Choose from these wedding-specific scenes: ${WEDDING_SCENE_CATEGORIES[category as keyof WeddingSceneCategories]?.join(', ') || 'general wedding scene'}
2. Aesthetic Score: Rate 1-10 based on composition, lighting, emotion, and technical quality
3. Style Classification: Choose from: ${PHOTOGRAPHY_STYLES.join(', ')}
4. Object Detection: Identify key wedding elements (people, objects, decorations)
5. Color Analysis: Extract dominant colors and determine mood/temperature
6. Accessibility: Create detailed, descriptive alt text for screen readers
7. Tags: Generate 5-10 relevant, searchable tags
8. Confidence: Overall confidence in the analysis (0-1)

Focus on wedding-specific elements and emotions. Be accurate and detailed in your analysis.
    `.trim();
  }

  /**
   * Structure and validate the AI analysis result
   */
  private async structureAnalysisResult(
    visionResult: any,
    category: string,
    startTime: number,
  ): Promise<AIAnalysisResult> {
    const processingTime = Date.now() - startTime;

    // Validate and structure the result with defaults
    const structuredResult: AIAnalysisResult = {
      sceneDetection: {
        primary: visionResult.sceneDetection?.primary || 'unknown',
        confidence: Math.min(
          Math.max(visionResult.sceneDetection?.confidence || 0.5, 0),
          1,
        ),
        secondary: visionResult.sceneDetection?.secondary || [],
      },
      aestheticScore: Math.min(
        Math.max(visionResult.aestheticScore || 5, 1),
        10,
      ),
      styleClassification: {
        style: visionResult.styleClassification?.style || 'contemporary',
        confidence: Math.min(
          Math.max(visionResult.styleClassification?.confidence || 0.5, 0),
          1,
        ),
        characteristics:
          visionResult.styleClassification?.characteristics || [],
      },
      objectDetection: (visionResult.objectDetection || []).map((obj: any) => ({
        object: obj.object || 'unknown',
        confidence: Math.min(Math.max(obj.confidence || 0.5, 0), 1),
        bbox: obj.bbox,
      })),
      colorAnalysis: {
        dominantColors: visionResult.colorAnalysis?.dominantColors || [],
        mood: visionResult.colorAnalysis?.mood || 'neutral',
        temperature: visionResult.colorAnalysis?.temperature || 'neutral',
      },
      accessibility: {
        altText: visionResult.accessibility?.altText || 'Wedding photograph',
        description:
          visionResult.accessibility?.description || 'A wedding photograph',
      },
      tags: (visionResult.tags || [])
        .filter((tag: string) => typeof tag === 'string' && tag.length > 0)
        .slice(0, 10), // Limit to 10 tags
      metadata: {
        processingTime,
        model: this.visionModel,
        confidence: Math.min(Math.max(visionResult.confidence || 0.5, 0), 1),
      },
    };

    // Enhance tags with category-specific keywords if missing
    if (structuredResult.tags.length < 3) {
      const categoryKeywords =
        WEDDING_SCENE_CATEGORIES[category as keyof WeddingSceneCategories] ||
        [];
      const additionalTags = categoryKeywords
        .filter((keyword) => !structuredResult.tags.includes(keyword))
        .slice(0, 5 - structuredResult.tags.length);

      structuredResult.tags.push(...additionalTags);
    }

    return structuredResult;
  }

  /**
   * Save AI analysis result to database
   */
  private async saveAnalysisResult(imageId: string, result: AIAnalysisResult) {
    await this.supabase.from('portfolio_ai_analysis').insert({
      image_id: imageId,
      scene_primary: result.sceneDetection.primary,
      scene_confidence: result.sceneDetection.confidence,
      scene_secondary: result.sceneDetection.secondary,
      aesthetic_score: result.aestheticScore,
      style: result.styleClassification.style,
      style_confidence: result.styleClassification.confidence,
      style_characteristics: result.styleClassification.characteristics,
      objects_detected: result.objectDetection,
      dominant_colors: result.colorAnalysis.dominantColors,
      color_mood: result.colorAnalysis.mood,
      color_temperature: result.colorAnalysis.temperature,
      alt_text: result.accessibility.altText,
      description: result.accessibility.description,
      tags: result.tags,
      processing_time_ms: result.metadata.processingTime,
      model_used: result.metadata.model,
      overall_confidence: result.metadata.confidence,
      analysis_version: '1.0',
    });
  }

  /**
   * Batch analyze multiple images
   */
  async batchAnalyzeImages(
    analysisOptions: AIAnalysisOptions[],
  ): Promise<AIAnalysisResult[]> {
    const results: AIAnalysisResult[] = [];
    const errors: Array<{ options: AIAnalysisOptions; error: Error }> = [];

    // Process images sequentially to respect API rate limits
    for (const options of analysisOptions) {
      try {
        const result = await this.analyzeImage(options);
        results.push(result);

        // Add delay between API calls to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        errors.push({ options, error: error as Error });
      }
    }

    // Log batch analysis summary
    console.log('Batch AI analysis completed:', {
      successful: results.length,
      failed: errors.length,
      totalImages: analysisOptions.length,
    });

    if (errors.length > 0) {
      console.error('Batch analysis errors:', errors);
    }

    return results;
  }

  /**
   * Re-analyze existing images with updated models
   */
  async reanalyzeImages(
    imageIds: string[],
    options: { forceUpdate?: boolean; minConfidenceThreshold?: number } = {},
  ) {
    const { forceUpdate = false, minConfidenceThreshold = 0.7 } = options;

    // Get images that need reanalysis
    let query = this.supabase
      .from('portfolio_images')
      .select(
        `
        id, 
        supplier_id, 
        original_filename,
        file_path,
        category,
        ai_analysis
      `,
      )
      .in('id', imageIds)
      .eq('status', 'active');

    if (!forceUpdate) {
      // Only reanalyze images with low confidence or failed analysis
      query = query.or(
        `ai_analysis_complete.is.null,ai_analysis->metadata->>confidence.lt.${minConfidenceThreshold}`,
      );
    }

    const { data: images, error } = await query;

    if (error || !images?.length) {
      return;
    }

    const reanalysisOptions = images.map((img) => ({
      imageId: img.id,
      imageUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio-images/${img.file_path}`,
      category: img.category,
      supplierId: img.supplier_id,
      originalFilename: img.original_filename,
    }));

    return await this.batchAnalyzeImages(reanalysisOptions);
  }

  /**
   * Get analysis statistics for a supplier
   */
  async getAnalysisStatistics(supplierId: string) {
    const { data: stats, error } = await this.supabase
      .from('portfolio_images')
      .select(
        `
        ai_analysis_complete,
        ai_analysis,
        category,
        created_at
      `,
      )
      .eq('supplier_id', supplierId)
      .eq('status', 'active');

    if (error || !stats) {
      return null;
    }

    const analyzed = stats.filter((s) => s.ai_analysis_complete).length;
    const total = stats.length;
    const averageConfidence =
      stats
        .filter((s) => s.ai_analysis?.metadata?.confidence)
        .reduce((sum, s) => sum + s.ai_analysis.metadata.confidence, 0) /
        analyzed || 0;

    const categoryBreakdown = stats.reduce(
      (acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      analyzed,
      pending: total - analyzed,
      completionRate: total > 0 ? (analyzed / total) * 100 : 0,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      categoryBreakdown,
    };
  }
}

// Export singleton instance
export const weddingAIAnalyzer = new WeddingAIAnalyzer();
