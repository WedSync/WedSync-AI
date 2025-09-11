/**
 * Photography AI Optimizer
 * Specialized optimization for wedding photography AI requests
 * Implements semantic caching for similar photo types and styles
 */

import {
  SmartCacheManager,
  AIRequest,
  AIResponse,
  CacheMatch,
} from './SmartCacheManager';
import { ModelSelectionOptimizer } from './ModelSelectionOptimizer';
import { createClient } from '@supabase/supabase-js';

export interface PhotographyRequest extends AIRequest {
  photoType:
    | 'portraits'
    | 'ceremony'
    | 'reception'
    | 'details'
    | 'candid'
    | 'group'
    | 'venue';
  style:
    | 'traditional'
    | 'photojournalistic'
    | 'fine-art'
    | 'modern'
    | 'vintage'
    | 'editorial';
  lightingConditions:
    | 'natural'
    | 'indoor'
    | 'low-light'
    | 'outdoor'
    | 'mixed'
    | 'golden-hour';
  metadata: {
    weddingDate?: Date;
    venueType?: string;
    guestCount?: number;
    specialRequirements?: string[];
  };
}

export interface PhotographyOptimization {
  originalRequest: PhotographyRequest;
  optimizedRequest: PhotographyRequest;
  strategy: string;
  cacheMatch?: CacheMatch;
  estimatedSavings: number;
  qualityPrediction: number;
  processingPriority: 'immediate' | 'scheduled' | 'batch';
}

export interface StyleTemplate {
  style: string;
  photoType: string;
  templateContent: string;
  usageCount: number;
  successRate: number;
  averageSavings: number;
  lastUpdated: Date;
}

export interface SemanticPhotoGroup {
  groupId: string;
  primaryPhotoType: string;
  secondaryTypes: string[];
  commonStyles: string[];
  semanticKeywords: string[];
  cacheEfficiency: number;
  groupSize: number;
}

export class PhotographyAIOptimizer {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private cacheManager: SmartCacheManager;
  private modelOptimizer: ModelSelectionOptimizer;

  // Photography-specific semantic patterns
  private photoTypePatterns = {
    portraits: {
      keywords: [
        'bride',
        'groom',
        'couple',
        'headshot',
        'portrait',
        'individual',
        'closeup',
      ],
      relatedTypes: ['details', 'candid'],
      cacheWeight: 1.2, // Higher cache value for portraits
    },
    ceremony: {
      keywords: [
        'ceremony',
        'vows',
        'altar',
        'aisle',
        'processional',
        'recessional',
        'kiss',
      ],
      relatedTypes: ['candid', 'group'],
      cacheWeight: 1.5, // Very high cache value - ceremonies are similar
    },
    reception: {
      keywords: [
        'reception',
        'dancing',
        'dinner',
        'speeches',
        'cake cutting',
        'first dance',
      ],
      relatedTypes: ['candid', 'group'],
      cacheWeight: 1.3,
    },
    details: {
      keywords: [
        'rings',
        'dress',
        'flowers',
        'decorations',
        'venue details',
        'setup',
      ],
      relatedTypes: ['venue'],
      cacheWeight: 1.4, // Details shots are very similar across weddings
    },
    candid: {
      keywords: [
        'candid',
        'natural',
        'unposed',
        'emotion',
        'laughter',
        'tears',
        'joy',
      ],
      relatedTypes: ['portraits', 'reception'],
      cacheWeight: 0.9, // Lower cache value - more unique
    },
    group: {
      keywords: [
        'group',
        'family',
        'wedding party',
        'bridesmaids',
        'groomsmen',
        'guests',
      ],
      relatedTypes: ['portraits'],
      cacheWeight: 1.1,
    },
    venue: {
      keywords: [
        'venue',
        'location',
        'architecture',
        'landscape',
        'exterior',
        'interior',
      ],
      relatedTypes: ['details'],
      cacheWeight: 1.6, // Very high cache value - venues are consistent
    },
  };

  constructor() {
    this.cacheManager = new SmartCacheManager();
    this.modelOptimizer = new ModelSelectionOptimizer();
  }

  /**
   * Optimize photography AI request using specialized photography patterns
   */
  async optimizePhotographyRequest(
    request: PhotographyRequest,
  ): Promise<PhotographyOptimization> {
    try {
      // Check for semantic cache matches using photography-specific patterns
      const cacheMatch = await this.checkPhotographyCacheMatch(request);

      if (cacheMatch && cacheMatch.similarity > 0.85) {
        return {
          originalRequest: request,
          optimizedRequest: request,
          strategy: 'photography-cache-hit',
          cacheMatch,
          estimatedSavings: this.calculatePhotographySavings(
            request,
            'cache-hit',
          ),
          qualityPrediction: cacheMatch.response.quality_score,
          processingPriority: 'immediate',
        };
      }

      // Check for style templates
      const styleTemplate = await this.findStyleTemplate(request);

      if (styleTemplate) {
        const optimizedRequest = await this.applyStyleTemplate(
          request,
          styleTemplate,
        );
        return {
          originalRequest: request,
          optimizedRequest,
          strategy: 'photography-template-optimization',
          estimatedSavings: this.calculatePhotographySavings(
            request,
            'template',
          ),
          qualityPrediction: 0.92, // High quality from proven templates
          processingPriority: 'scheduled',
        };
      }

      // Optimize based on photo type and lighting conditions
      const phototypoOptimized = await this.optimizeForPhotoType(request);

      // Determine processing priority based on wedding date proximity
      const processingPriority = this.determineProcessingPriority(request);

      return {
        originalRequest: request,
        optimizedRequest: phototypoOptimized,
        strategy: 'photography-context-optimization',
        estimatedSavings: this.calculatePhotographySavings(request, 'context'),
        qualityPrediction: 0.88,
        processingPriority,
      };
    } catch (error) {
      console.error('Error optimizing photography request:', error);

      // Return fallback optimization
      return {
        originalRequest: request,
        optimizedRequest: request,
        strategy: 'photography-fallback',
        estimatedSavings: 0,
        qualityPrediction: 0.8,
        processingPriority: 'batch',
      };
    }
  }

  /**
   * Check for photography-specific semantic cache matches
   */
  private async checkPhotographyCacheMatch(
    request: PhotographyRequest,
  ): Promise<CacheMatch | null> {
    // Enhance the request content with photography-specific context
    const enhancedRequest = this.enhanceWithPhotographyContext(request);

    // Use the base cache manager with enhanced context
    const cacheMatch =
      await this.cacheManager.checkSemanticSimilarity(enhancedRequest);

    if (!cacheMatch) return null;

    // Apply photography-specific similarity adjustments
    const photographySimilarity = this.calculatePhotographySimilarity(
      request,
      cacheMatch,
    );

    // Update similarity score based on photography-specific factors
    cacheMatch.similarity = photographySimilarity;
    cacheMatch.confidence = this.calculatePhotographyConfidence(
      request,
      cacheMatch,
    );

    return cacheMatch;
  }

  /**
   * Enhance request with photography-specific semantic context
   */
  private enhanceWithPhotographyContext(
    request: PhotographyRequest,
  ): AIRequest {
    const photoTypePattern = this.photoTypePatterns[request.photoType];
    const styleContext = this.getStyleContext(request.style);
    const lightingContext = this.getLightingContext(request.lightingConditions);

    const enhancedContent = `
      ${request.content}
      
      PHOTOGRAPHY CONTEXT:
      Photo Type: ${request.photoType}
      Style: ${request.style}
      Lighting: ${request.lightingConditions}
      
      SEMANTIC KEYWORDS: ${photoTypePattern.keywords.join(', ')}
      STYLE CHARACTERISTICS: ${styleContext}
      LIGHTING CONSIDERATIONS: ${lightingContext}
      
      ${
        request.metadata.specialRequirements
          ? `SPECIAL REQUIREMENTS: ${request.metadata.specialRequirements.join(', ')}`
          : ''
      }
    `.trim();

    return {
      ...request,
      content: enhancedContent,
      context: 'photography', // Ensure photography context
    };
  }

  /**
   * Calculate photography-specific semantic similarity
   */
  private calculatePhotographySimilarity(
    request: PhotographyRequest,
    cacheMatch: CacheMatch,
  ): number {
    let similarityBonus = 0;

    // Extract cached request metadata (simplified - would parse from actual cache)
    const cachedPhotoType = this.extractPhotoTypeFromCache(
      cacheMatch.response.content,
    );
    const cachedStyle = this.extractStyleFromCache(cacheMatch.response.content);

    // Photo type similarity
    if (cachedPhotoType === request.photoType) {
      similarityBonus += 0.3;
    } else if (this.areRelatedPhotoTypes(request.photoType, cachedPhotoType)) {
      similarityBonus += 0.15;
    }

    // Style similarity
    if (cachedStyle === request.style) {
      similarityBonus += 0.2;
    } else if (this.areCompatibleStyles(request.style, cachedStyle)) {
      similarityBonus += 0.1;
    }

    // Venue type similarity (if available)
    if (request.metadata.venueType) {
      const cachedVenueType = this.extractVenueTypeFromCache(
        cacheMatch.response.content,
      );
      if (cachedVenueType === request.metadata.venueType) {
        similarityBonus += 0.1;
      }
    }

    // Apply cache weight for photo type
    const photoTypePattern = this.photoTypePatterns[request.photoType];
    const weightedSimilarity =
      (cacheMatch.similarity + similarityBonus) * photoTypePattern.cacheWeight;

    return Math.min(1.0, weightedSimilarity);
  }

  /**
   * Find applicable style template for the photography request
   */
  private async findStyleTemplate(
    request: PhotographyRequest,
  ): Promise<StyleTemplate | null> {
    try {
      const { data: templates, error } = await this.supabase
        .from('photography_style_templates')
        .select('*')
        .eq('style', request.style)
        .eq('photo_type', request.photoType)
        .gt('success_rate', 0.8) // Only high-success templates
        .order('usage_count', { ascending: false })
        .limit(1);

      if (error || !templates?.length) {
        return null;
      }

      const template = templates[0];
      return {
        style: template.style,
        photoType: template.photo_type,
        templateContent: template.template_content,
        usageCount: template.usage_count,
        successRate: template.success_rate,
        averageSavings: template.average_savings,
        lastUpdated: new Date(template.updated_at),
      };
    } catch (error) {
      console.error('Error finding style template:', error);
      return null;
    }
  }

  /**
   * Apply style template to optimize the request
   */
  private async applyStyleTemplate(
    request: PhotographyRequest,
    template: StyleTemplate,
  ): Promise<PhotographyRequest> {
    // Merge template content with specific request details
    const optimizedContent = `
      ${template.templateContent}
      
      SPECIFIC REQUEST DETAILS:
      ${request.content}
      
      WEDDING CONTEXT:
      Date: ${request.metadata.weddingDate?.toDateString() || 'TBD'}
      Venue: ${request.metadata.venueType || 'Standard'}
      Guest Count: ${request.metadata.guestCount || 'Standard'}
      
      LIGHTING: ${request.lightingConditions}
      
      ${
        request.metadata.specialRequirements?.length
          ? `SPECIAL REQUIREMENTS: ${request.metadata.specialRequirements.join('; ')}`
          : ''
      }
    `.trim();

    // Update template usage statistics
    await this.updateTemplateUsage(template.style, template.photoType);

    return {
      ...request,
      content: optimizedContent,
      parameters: {
        ...request.parameters,
        template_applied: template.style,
        optimized_for_photography: true,
      },
    };
  }

  /**
   * Optimize request based on photo type characteristics
   */
  private async optimizeForPhotoType(
    request: PhotographyRequest,
  ): Promise<PhotographyRequest> {
    const photoTypePattern = this.photoTypePatterns[request.photoType];

    // Apply photo type specific optimizations
    let optimizedContent = request.content;

    // Add semantic context for better AI understanding
    optimizedContent += `\n\nPHOTOGRAPHY OPTIMIZATION:`;
    optimizedContent += `\nPhoto Type Focus: ${photoTypePattern.keywords.join(', ')}`;
    optimizedContent += `\nRelated Types: ${photoTypePattern.relatedTypes.join(', ')}`;

    // Add style-specific guidance
    optimizedContent += `\nStyle Guidelines: ${this.getStyleGuidance(request.style)}`;

    // Add lighting-specific optimizations
    optimizedContent += `\nLighting Optimization: ${this.getLightingOptimization(request.lightingConditions)}`;

    // Optimize model parameters for photography
    const optimizedParameters = {
      ...request.parameters,
      temperature: this.getOptimalTemperatureForPhotoType(request.photoType),
      max_tokens: this.getOptimalTokensForPhotoType(request.photoType),
      photography_focused: true,
      photo_type: request.photoType,
      style_preference: request.style,
    };

    return {
      ...request,
      content: optimizedContent,
      parameters: optimizedParameters,
    };
  }

  /**
   * Determine processing priority based on wedding timeline
   */
  private determineProcessingPriority(
    request: PhotographyRequest,
  ): 'immediate' | 'scheduled' | 'batch' {
    if (!request.metadata.weddingDate) {
      return 'batch'; // No urgency without wedding date
    }

    const now = new Date();
    const weddingDate = request.metadata.weddingDate;
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilWedding <= 7) {
      return 'immediate'; // Wedding within a week
    } else if (daysUntilWedding <= 30) {
      return 'scheduled'; // Wedding within a month
    } else {
      return 'batch'; // Wedding more than a month away
    }
  }

  /**
   * Calculate photography-specific savings estimates
   */
  private calculatePhotographySavings(
    request: PhotographyRequest,
    strategy: 'cache-hit' | 'template' | 'context',
  ): number {
    const baseTokens = Math.ceil(request.content.length / 4);
    const baseCost = baseTokens * 0.01; // Estimated cost per token

    const savingsMultipliers = {
      'cache-hit': 0.95, // 95% savings for cache hits
      template: 0.6, // 60% savings from templates
      context: 0.25, // 25% savings from context optimization
    };

    const photoTypePattern = this.photoTypePatterns[request.photoType];
    const typeMultiplier = photoTypePattern.cacheWeight;

    return baseCost * savingsMultipliers[strategy] * typeMultiplier;
  }

  /**
   * Calculate photography-specific confidence score
   */
  private calculatePhotographyConfidence(
    request: PhotographyRequest,
    cacheMatch: CacheMatch,
  ): number {
    let confidence = cacheMatch.confidence;

    // Boost confidence for high-cache-value photo types
    const photoTypePattern = this.photoTypePatterns[request.photoType];
    if (photoTypePattern.cacheWeight > 1.3) {
      confidence += 0.1;
    }

    // Boost confidence for stable lighting conditions
    if (
      ['natural', 'outdoor', 'golden-hour'].includes(request.lightingConditions)
    ) {
      confidence += 0.05;
    }

    // Boost confidence for traditional styles (more predictable)
    if (['traditional', 'fine-art'].includes(request.style)) {
      confidence += 0.05;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Helper methods for photography context
   */
  private getStyleContext(style: string): string {
    const styleContexts = {
      traditional: 'formal poses, classic compositions, timeless elegance',
      photojournalistic: 'candid moments, storytelling, natural interactions',
      'fine-art': 'artistic vision, creative compositions, dramatic lighting',
      modern: 'contemporary style, clean lines, minimalist approach',
      vintage: 'retro aesthetic, film-inspired tones, nostalgic feel',
      editorial: 'fashion-forward, dramatic poses, magazine-style compositions',
    };
    return (
      styleContexts[style as keyof typeof styleContexts] ||
      'standard wedding photography'
    );
  }

  private getLightingContext(lighting: string): string {
    const lightingContexts = {
      natural: 'soft, even lighting, natural skin tones',
      indoor: 'controlled lighting, venue ambiance considerations',
      'low-light': 'challenging conditions, grain management, available light',
      outdoor: 'variable conditions, sun positioning, shadow management',
      mixed: 'varied lighting scenarios, adaptation required',
      'golden-hour':
        'warm tones, backlighting opportunities, romantic atmosphere',
    };
    return (
      lightingContexts[lighting as keyof typeof lightingContexts] ||
      'standard lighting'
    );
  }

  private getStyleGuidance(style: string): string {
    const guidance = {
      traditional:
        'Focus on formal poses, family groupings, and ceremony highlights',
      photojournalistic:
        'Capture genuine emotions, candid interactions, and story moments',
      'fine-art':
        'Emphasize artistic composition, creative angles, and dramatic elements',
      modern: 'Clean compositions, contemporary editing, minimalist aesthetic',
      vintage: 'Warm tones, soft focus effects, timeless romantic feel',
      editorial:
        'Bold compositions, fashion-inspired poses, magazine-quality results',
    };
    return (
      guidance[style as keyof typeof guidance] ||
      'Standard wedding photography approach'
    );
  }

  private getLightingOptimization(lighting: string): string {
    const optimizations = {
      natural: 'Maximize available window light, balance exposure carefully',
      indoor: 'Work with venue lighting, minimal flash for ambiance',
      'low-light':
        'Higher ISO capabilities, stabilization important, available light priority',
      outdoor: 'Sun positioning crucial, reflector usage, golden hour timing',
      mixed: 'Flexible approach, quick adaptation between lighting scenarios',
      'golden-hour':
        'Backlighting techniques, warm tone enhancement, romantic mood',
    };
    return (
      optimizations[lighting as keyof typeof optimizations] ||
      'Standard lighting approach'
    );
  }

  private getOptimalTemperatureForPhotoType(photoType: string): number {
    const temperatures = {
      portraits: 0.7, // More consistent for portraits
      ceremony: 0.8, // Slightly more creative for ceremony
      reception: 0.9, // More creative for reception dynamics
      details: 0.6, // Very consistent for detail shots
      candid: 0.8, // Balanced for candid moments
      group: 0.7, // Consistent for group coordination
      venue: 0.6, // Very consistent for venue descriptions
    };
    return temperatures[photoType as keyof typeof temperatures] || 0.7;
  }

  private getOptimalTokensForPhotoType(photoType: string): number {
    const tokens = {
      portraits: 800, // Detailed portrait descriptions
      ceremony: 1000, // Comprehensive ceremony coverage
      reception: 1200, // Dynamic reception descriptions
      details: 600, // Focused detail descriptions
      candid: 900, // Natural candid descriptions
      group: 800, // Group coordination instructions
      venue: 1000, // Comprehensive venue descriptions
    };
    return tokens[photoType as keyof typeof tokens] || 800;
  }

  // Simplified helper methods (would be more sophisticated in production)
  private extractPhotoTypeFromCache(content: string): string {
    const types = Object.keys(this.photoTypePatterns);
    return (
      types.find((type) => content.toLowerCase().includes(type)) || 'general'
    );
  }

  private extractStyleFromCache(content: string): string {
    const styles = [
      'traditional',
      'photojournalistic',
      'fine-art',
      'modern',
      'vintage',
      'editorial',
    ];
    return (
      styles.find((style) => content.toLowerCase().includes(style)) ||
      'traditional'
    );
  }

  private extractVenueTypeFromCache(content: string): string {
    const venues = [
      'church',
      'beach',
      'garden',
      'ballroom',
      'outdoor',
      'rustic',
      'modern',
    ];
    return (
      venues.find((venue) => content.toLowerCase().includes(venue)) ||
      'standard'
    );
  }

  private areRelatedPhotoTypes(type1: string, type2: string): boolean {
    const pattern =
      this.photoTypePatterns[type1 as keyof typeof this.photoTypePatterns];
    return pattern?.relatedTypes.includes(type2) || false;
  }

  private areCompatibleStyles(style1: string, style2: string): boolean {
    const compatible = {
      traditional: ['fine-art'],
      photojournalistic: ['candid', 'modern'],
      'fine-art': ['traditional', 'editorial'],
      modern: ['photojournalistic', 'editorial'],
      vintage: ['traditional'],
      editorial: ['fine-art', 'modern'],
    };
    return (
      compatible[style1 as keyof typeof compatible]?.includes(style2) || false
    );
  }

  private async updateTemplateUsage(
    style: string,
    photoType: string,
  ): Promise<void> {
    try {
      await this.supabase
        .from('photography_style_templates')
        .update({
          usage_count: this.supabase.rpc('increment_usage_count'),
          updated_at: new Date().toISOString(),
        })
        .eq('style', style)
        .eq('photo_type', photoType);
    } catch (error) {
      console.error('Error updating template usage:', error);
    }
  }
}
