/**
 * Content Classifier - AI-powered automatic categorization for wedding industry content
 * Team B - WS-210 Implementation
 *
 * Intelligently classifies wedding vendor content into appropriate categories
 * using GPT models with wedding industry expertise
 */

import { OpenAI } from 'openai';
import { logger } from '../logger';
import { z } from 'zod';

// Wedding industry categories schema
export const WeddingCategorySchema = z.enum([
  // Vendor services
  'photography-services',
  'videography-services',
  'venue-services',
  'catering-services',
  'floral-services',
  'music-entertainment',
  'beauty-services',
  'transportation',
  'planning-coordination',
  'dress-attire',
  'jewelry-rings',
  'stationery-invites',
  'cake-desserts',
  'ceremony-officiant',

  // Business content
  'pricing-packages',
  'availability-booking',
  'policies-terms',
  'vendor-profile',
  'client-testimonials',
  'portfolio-gallery',
  'faq-support',
  'contact-info',
  'payment-billing',
  'contracts-legal',

  // Informational
  'wedding-guides',
  'planning-tips',
  'seasonal-advice',
  'trends-inspiration',
  'vendor-directory',
  'industry-news',
  'educational-content',

  // Administrative
  'internal-notes',
  'staff-instructions',
  'marketing-content',
  'system-settings',
  'other',
]);

export type WeddingCategory = z.infer<typeof WeddingCategorySchema>;

export interface ClassificationResult {
  category: WeddingCategory;
  confidence: number;
  reasoning: string;
  subcategories?: string[];
  tags?: string[];
}

export interface ClassificationOptions {
  includeSubcategories?: boolean;
  includeTags?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * ContentClassifier uses AI to automatically categorize wedding industry content
 * Specialized for wedding vendors, couples, and industry terminology
 */
export class ContentClassifier {
  private openai: OpenAI;
  private readonly defaultModel = 'gpt-3.5-turbo';
  private readonly cache = new Map<string, ClassificationResult>();
  private readonly maxCacheSize = 500;

  constructor(openai: OpenAI) {
    this.openai = openai;
    logger.info('ContentClassifier initialized for wedding industry content');
  }

  /**
   * Classify wedding-related content with high accuracy
   */
  async classifyWeddingContent(
    title: string,
    content: string,
    sourceType:
      | 'faq'
      | 'vendor-profile'
      | 'service-package'
      | 'policy'
      | 'guide'
      | 'pricing',
    options: ClassificationOptions = {},
  ): Promise<string> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(title, content, sourceType);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        logger.debug('Using cached classification result');
        return cached.category;
      }

      // Perform classification
      const result = await this.performClassification(
        title,
        content,
        sourceType,
        options,
      );

      // Cache result
      this.cacheResult(cacheKey, result);

      logger.info(
        `Classified content as: ${result.category} (confidence: ${result.confidence})`,
      );
      return result.category;
    } catch (error) {
      logger.error('Content classification failed:', error);
      // Fallback to heuristic classification
      return this.fallbackClassification(title, content, sourceType);
    }
  }

  /**
   * Get detailed classification with confidence and reasoning
   */
  async getDetailedClassification(
    title: string,
    content: string,
    sourceType:
      | 'faq'
      | 'vendor-profile'
      | 'service-package'
      | 'policy'
      | 'guide'
      | 'pricing',
    options: ClassificationOptions = {},
  ): Promise<ClassificationResult> {
    try {
      const cacheKey = this.generateCacheKey(title, content, sourceType);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        return cached;
      }

      const result = await this.performClassification(
        title,
        content,
        sourceType,
        options,
      );
      this.cacheResult(cacheKey, result);

      return result;
    } catch (error) {
      logger.error('Detailed classification failed:', error);

      // Return fallback result
      const fallbackCategory = this.fallbackClassification(
        title,
        content,
        sourceType,
      );
      return {
        category: fallbackCategory as WeddingCategory,
        confidence: 0.6,
        reasoning:
          'Classified using fallback heuristics due to AI service unavailability',
        subcategories: [],
        tags: [],
      };
    }
  }

  /**
   * Batch classify multiple content pieces
   */
  async batchClassifyContent(
    contents: Array<{
      title: string;
      content: string;
      sourceType:
        | 'faq'
        | 'vendor-profile'
        | 'service-package'
        | 'policy'
        | 'guide'
        | 'pricing';
    }>,
    options: ClassificationOptions = {},
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    const batchSize = 5; // Process in smaller batches to avoid rate limits

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchPromises = batch.map((item) =>
        this.getDetailedClassification(
          item.title,
          item.content,
          item.sourceType,
          options,
        ),
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Rate limiting delay
        if (i + batchSize < contents.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        logger.error(
          `Batch classification failed for batch starting at ${i}:`,
          error,
        );

        // Add fallback results for failed batch
        batch.forEach((item) => {
          const fallbackCategory = this.fallbackClassification(
            item.title,
            item.content,
            item.sourceType,
          );
          results.push({
            category: fallbackCategory as WeddingCategory,
            confidence: 0.5,
            reasoning: 'Fallback classification due to batch processing error',
            subcategories: [],
            tags: [],
          });
        });
      }
    }

    logger.info(`Batch classified ${results.length} content pieces`);
    return results;
  }

  /**
   * Perform AI-powered classification using GPT
   */
  private async performClassification(
    title: string,
    content: string,
    sourceType: string,
    options: ClassificationOptions,
  ): Promise<ClassificationResult> {
    const model = options.model || this.defaultModel;
    const temperature = options.temperature || 0.2;
    const maxTokens = options.maxTokens || 500;

    const prompt = this.buildClassificationPrompt(
      title,
      content,
      sourceType,
      options,
    );

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a wedding industry expert specializing in content categorization for wedding vendors and service providers.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No classification result received from AI');
    }

    return this.parseClassificationResult(result);
  }

  /**
   * Build comprehensive classification prompt
   */
  private buildClassificationPrompt(
    title: string,
    content: string,
    sourceType: string,
    options: ClassificationOptions,
  ): string {
    const availableCategories = WeddingCategorySchema.options.join(', ');

    const contentPreview =
      content.length > 1000 ? content.substring(0, 1000) + '...' : content;

    let prompt = `Classify this wedding industry content into the most appropriate category.

CONTENT DETAILS:
Title: "${title}"
Source Type: ${sourceType}
Content: "${contentPreview}"

AVAILABLE CATEGORIES:
${availableCategories}

CLASSIFICATION REQUIREMENTS:
1. Choose the single most appropriate category from the list above
2. Provide a confidence score (0.0 to 1.0)
3. Explain your reasoning in 1-2 sentences
4. Focus on wedding industry context and vendor needs`;

    if (options.includeSubcategories) {
      prompt += `\n5. Suggest 2-3 relevant subcategories if applicable`;
    }

    if (options.includeTags) {
      prompt += `\n6. Add 3-5 relevant tags for content organization`;
    }

    prompt += `\n\nRespond in JSON format:
{
  "category": "exact_category_name",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category fits best"`;

    if (options.includeSubcategories) {
      prompt += `,\n  "subcategories": ["subcategory1", "subcategory2"]`;
    }

    if (options.includeTags) {
      prompt += `,\n  "tags": ["tag1", "tag2", "tag3"]`;
    }

    prompt += `\n}`;

    return prompt;
  }

  /**
   * Parse JSON response from AI classification
   */
  private parseClassificationResult(result: string): ClassificationResult {
    try {
      // Clean the result string
      const cleanResult = result.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResult);

      // Validate category
      const category = WeddingCategorySchema.parse(parsed.category);

      return {
        category,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
        reasoning: parsed.reasoning || 'AI classification completed',
        subcategories: parsed.subcategories || [],
        tags: parsed.tags || [],
      };
    } catch (error) {
      logger.warn(
        'Failed to parse AI classification result, using fallback:',
        error,
      );

      // Try to extract category name from unstructured response
      const categoryMatch = result.match(
        /(?:category|Category):\s*["']?([^"'\n]+)["']?/,
      );
      const extractedCategory = categoryMatch?.[1]?.trim();

      if (
        extractedCategory &&
        WeddingCategorySchema.safeParse(extractedCategory).success
      ) {
        return {
          category: extractedCategory as WeddingCategory,
          confidence: 0.7,
          reasoning: 'Extracted from unstructured AI response',
          subcategories: [],
          tags: [],
        };
      }

      // Ultimate fallback
      return {
        category: 'other',
        confidence: 0.5,
        reasoning: 'Failed to parse AI classification, using default category',
        subcategories: [],
        tags: [],
      };
    }
  }

  /**
   * Fallback heuristic classification when AI is unavailable
   */
  private fallbackClassification(
    title: string,
    content: string,
    sourceType: string,
  ): string {
    const text = `${title} ${content}`.toLowerCase();

    // Wedding service patterns
    const servicePatterns = {
      'photography-services': [
        'photo',
        'photograph',
        'camera',
        'shoot',
        'album',
        'portrait',
      ],
      'videography-services': ['video', 'film', 'cinemat', 'record', 'footage'],
      'venue-services': [
        'venue',
        'location',
        'hall',
        'church',
        'barn',
        'garden',
        'ballroom',
      ],
      'catering-services': [
        'catering',
        'food',
        'menu',
        'dining',
        'cuisine',
        'chef',
      ],
      'floral-services': [
        'flower',
        'floral',
        'bouquet',
        'arrangement',
        'bloom',
        'florist',
      ],
      'music-entertainment': [
        'music',
        'band',
        'dj',
        'entertainment',
        'dance',
        'sound',
      ],
      'beauty-services': ['makeup', 'hair', 'beauty', 'stylist', 'cosmetic'],
      'planning-coordination': [
        'planning',
        'coordinator',
        'organiz',
        'timeline',
      ],
      'pricing-packages': ['price', 'cost', 'package', 'rate', 'fee', 'quote'],
      'policies-terms': ['policy', 'terms', 'condition', 'agreement', 'rule'],
      'faq-support': ['faq', 'question', 'answer', 'help', 'support'],
    };

    // Check source type patterns first
    const sourceTypeMapping = {
      pricing: 'pricing-packages',
      policy: 'policies-terms',
      faq: 'faq-support',
      'vendor-profile': 'vendor-profile',
      'service-package': 'pricing-packages',
      guide: 'wedding-guides',
    };

    const sourceTypeCategory =
      sourceTypeMapping[sourceType as keyof typeof sourceTypeMapping];
    if (sourceTypeCategory) {
      return sourceTypeCategory;
    }

    // Pattern matching
    for (const [category, patterns] of Object.entries(servicePatterns)) {
      const matches = patterns.filter((pattern) => text.includes(pattern));
      if (matches.length > 0) {
        logger.debug(
          `Fallback classification: ${category} (matched patterns: ${matches.join(', ')})`,
        );
        return category;
      }
    }

    // Default fallback
    return 'other';
  }

  /**
   * Generate cache key for classification
   */
  private generateCacheKey(
    title: string,
    content: string,
    sourceType: string,
  ): string {
    const combined = `${title}:${sourceType}:${content.substring(0, 100)}`;
    return this.hashString(combined);
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache classification result with LRU eviction
   */
  private cacheResult(key: string, result: ClassificationResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, result);
  }

  /**
   * Get all available wedding categories
   */
  getAvailableCategories(): WeddingCategory[] {
    return WeddingCategorySchema.options;
  }

  /**
   * Get category description for UI/documentation
   */
  getCategoryDescription(category: WeddingCategory): string {
    const descriptions: Record<WeddingCategory, string> = {
      'photography-services':
        'Wedding photography services, packages, and portfolio content',
      'videography-services':
        'Wedding videography, cinematography, and video production',
      'venue-services': 'Wedding venues, locations, and facility information',
      'catering-services': 'Wedding catering, food services, and menu options',
      'floral-services': 'Wedding flowers, arrangements, and floral design',
      'music-entertainment':
        'Wedding music, bands, DJs, and entertainment services',
      'beauty-services': 'Wedding makeup, hair styling, and beauty services',
      transportation: 'Wedding transportation and travel arrangements',
      'planning-coordination': 'Wedding planning and coordination services',
      'dress-attire': 'Wedding dresses, suits, and attire options',
      'jewelry-rings': 'Wedding rings, jewelry, and accessories',
      'stationery-invites': 'Wedding invitations and stationery services',
      'cake-desserts': 'Wedding cakes and dessert services',
      'ceremony-officiant': 'Wedding ceremony and officiant services',
      'pricing-packages': 'Pricing information and service packages',
      'availability-booking': 'Availability calendars and booking information',
      'policies-terms': 'Business policies and terms of service',
      'vendor-profile': 'Vendor profiles and business information',
      'client-testimonials': 'Client reviews and testimonials',
      'portfolio-gallery': 'Portfolio galleries and work samples',
      'faq-support': 'Frequently asked questions and support content',
      'contact-info': 'Contact information and communication details',
      'payment-billing': 'Payment and billing information',
      'contracts-legal': 'Contracts and legal documentation',
      'wedding-guides': 'Wedding planning guides and resources',
      'planning-tips': 'Wedding planning tips and advice',
      'seasonal-advice': 'Seasonal wedding planning advice',
      'trends-inspiration': 'Wedding trends and inspiration content',
      'vendor-directory': 'Wedding vendor directory and listings',
      'industry-news': 'Wedding industry news and updates',
      'educational-content': 'Educational and instructional content',
      'internal-notes': 'Internal business notes and documentation',
      'staff-instructions': 'Staff instructions and operational guides',
      'marketing-content': 'Marketing materials and promotional content',
      'system-settings': 'System configurations and technical settings',
      other: "Miscellaneous content that doesn't fit other categories",
    };

    return descriptions[category] || 'No description available';
  }

  /**
   * Clear classification cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('ContentClassifier cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      categories: Array.from(
        new Set(Array.from(this.cache.values()).map((r) => r.category)),
      ),
    };
  }
}

export default ContentClassifier;
