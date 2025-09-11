/**
 * WS-254: Enhanced OpenAI Service with Circuit Breaker
 * Advanced OpenAI integration with reliability patterns
 * Team B Backend Implementation
 */

import OpenAI from 'openai';
import {
  CircuitBreaker,
  createOpenAICircuitBreaker,
} from '@/lib/utils/circuit-breaker';
import crypto from 'crypto';

interface OpenAIRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retries?: number;
}

interface OpenAIResponse<T = any> {
  data: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  processingTime: number;
  requestId: string;
  cached: boolean;
}

interface MenuGenerationRequest {
  requirements: any[];
  weddingContext: any;
  supplierContext: any;
  guestCount: number;
  budgetPerPerson: number;
  menuStyle: string;
  mealType: string;
  culturalRequirements?: string[];
  seasonalPreferences?: string[];
}

interface AllergenAnalysisRequest {
  ingredients: string[];
  context?: string;
}

// Request cache for performance optimization
interface CacheEntry {
  data: any;
  timestamp: number;
  usage: any;
}

export class EnhancedOpenAIService {
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private requestCache = new Map<string, CacheEntry>();
  private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes
  private readonly maxCacheSize = 1000;

  // API cost tracking (approximate rates)
  private readonly costRates = {
    'gpt-4': { input: 0.00003, output: 0.00006 },
    'gpt-3.5-turbo': { input: 0.0000015, output: 0.000002 },
    'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
  };

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 0, // We handle retries through circuit breaker
    });

    this.circuitBreaker = createOpenAICircuitBreaker();

    // Cleanup cache periodically
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Generate menu with circuit breaker protection and caching
   */
  async generateMenu(
    request: MenuGenerationRequest,
    options: OpenAIRequestOptions = {},
  ): Promise<OpenAIResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const cacheKey = this.generateCacheKey('menu_generation', request);

    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          usage: cached.usage,
          model: options.model || 'gpt-4',
          processingTime: Date.now() - startTime,
          requestId,
          cached: true,
        };
      }

      // Execute with circuit breaker protection
      const result = await this.circuitBreaker.execute(async () => {
        const prompt = this.buildMenuGenerationPrompt(request);

        const response = await this.openai.chat.completions.create({
          model: options.model || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt('menu_generation'),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        try {
          const parsedContent = JSON.parse(content);

          // Validate response structure
          if (!this.validateMenuResponse(parsedContent)) {
            throw new Error('Invalid menu structure from OpenAI');
          }

          return {
            data: parsedContent,
            usage: response.usage || {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
            model: response.model,
            finishReason: response.choices[0].finish_reason,
          };
        } catch (parseError) {
          throw new Error(
            `Failed to parse OpenAI response: ${parseError.message}`,
          );
        }
      });

      // Cache successful responses
      this.setCache(cacheKey, {
        data: result.data,
        timestamp: Date.now(),
        usage: result.usage,
      });

      return {
        data: result.data,
        usage: {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        },
        model: result.model,
        processingTime: Date.now() - startTime,
        requestId,
        cached: false,
      };
    } catch (error) {
      console.error(`Menu generation failed (${requestId}):`, error);
      throw this.enhanceError(error, 'generateMenu', requestId);
    }
  }

  /**
   * Analyze ingredients for allergens with circuit breaker protection
   */
  async analyzeAllergens(
    request: AllergenAnalysisRequest,
    options: OpenAIRequestOptions = {},
  ): Promise<OpenAIResponse> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const cacheKey = this.generateCacheKey('allergen_analysis', request);

    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          usage: cached.usage,
          model: options.model || 'gpt-3.5-turbo',
          processingTime: Date.now() - startTime,
          requestId,
          cached: true,
        };
      }

      // Execute with circuit breaker protection
      const result = await this.circuitBreaker.execute(async () => {
        const response = await this.openai.chat.completions.create({
          model: options.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt('allergen_analysis'),
            },
            {
              role: 'user',
              content: `Analyze these ingredients for allergens and cross-contamination risks: ${request.ingredients.join(', ')}${request.context ? `\n\nContext: ${request.context}` : ''}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: options.temperature ?? 0.1,
          max_tokens: options.maxTokens ?? 1500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        try {
          const parsedContent = JSON.parse(content);

          return {
            data: parsedContent,
            usage: response.usage || {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
            model: response.model,
            finishReason: response.choices[0].finish_reason,
          };
        } catch (parseError) {
          throw new Error(
            `Failed to parse allergen analysis response: ${parseError.message}`,
          );
        }
      });

      // Cache successful responses
      this.setCache(cacheKey, {
        data: result.data,
        timestamp: Date.now(),
        usage: result.usage,
      });

      return {
        data: result.data,
        usage: {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        },
        model: result.model,
        processingTime: Date.now() - startTime,
        requestId,
        cached: false,
      };
    } catch (error) {
      console.error(`Allergen analysis failed (${requestId}):`, error);
      throw this.enhanceError(error, 'analyzeAllergens', requestId);
    }
  }

  /**
   * Generic text completion with circuit breaker
   */
  async generateCompletion(
    prompt: string,
    systemPrompt?: string,
    options: OpenAIRequestOptions = {},
  ): Promise<OpenAIResponse<string>> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        const response = await this.openai.chat.completions.create({
          model: options.model || 'gpt-3.5-turbo',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1000,
        });

        return {
          data: response.choices[0].message.content || '',
          usage: response.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
          model: response.model,
        };
      });

      return {
        data: result.data,
        usage: {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        },
        model: result.model,
        processingTime: Date.now() - startTime,
        requestId,
        cached: false,
      };
    } catch (error) {
      console.error(`Text completion failed (${requestId}):`, error);
      throw this.enhanceError(error, 'generateCompletion', requestId);
    }
  }

  /**
   * Get service health status including circuit breaker stats
   */
  getHealthStatus() {
    const stats = this.circuitBreaker.getStats();

    return {
      circuitBreaker: {
        state: stats.state,
        uptime: stats.uptime,
        failures: stats.failures,
        successes: stats.successes,
        requests: stats.requests,
        lastFailureTime: stats.lastFailureTime,
        lastSuccessTime: stats.lastSuccessTime,
      },
      cache: {
        size: this.requestCache.size,
        maxSize: this.maxCacheSize,
        hitRate: this.calculateCacheHitRate(),
      },
      isHealthy: stats.uptime > 90 && stats.state !== 'OPEN',
    };
  }

  /**
   * Calculate estimated API costs
   */
  calculateCost(
    usage: { promptTokens: number; completionTokens: number },
    model: string = 'gpt-4',
  ): number {
    const rates =
      this.costRates[model as keyof typeof this.costRates] ||
      this.costRates['gpt-4'];

    const inputCost = (usage.promptTokens / 1000) * rates.input;
    const outputCost = (usage.completionTokens / 1000) * rates.output;

    return inputCost + outputCost;
  }

  /**
   * Force circuit breaker reset (admin function)
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }

  /**
   * Clear request cache
   */
  clearCache() {
    this.requestCache.clear();
  }

  // Private methods

  private buildMenuGenerationPrompt(request: MenuGenerationRequest): string {
    return `Generate a wedding menu for ${request.guestCount} guests with the following specifications:

DIETARY REQUIREMENTS:
${this.formatDietaryRequirementsForPrompt(request.requirements)}

MENU PARAMETERS:
- Style: ${request.menuStyle}
- Meal Type: ${request.mealType}
- Budget per person: £${request.budgetPerPerson}
- Cultural preferences: ${request.culturalRequirements?.join(', ') || 'None'}
- Seasonal preferences: ${request.seasonalPreferences?.join(', ') || 'None'}

WEDDING CONTEXT:
- Date: ${request.weddingContext.weddingDate || 'Not specified'}
- Venue type: ${request.weddingContext.venueType || 'Not specified'}
- Guest count: ${request.weddingContext.guest_count || request.guestCount}

SUPPLIER CAPABILITIES:
- Business: ${request.supplierContext.business_name || 'Catering Service'}
- Specialties: ${request.supplierContext.specialties?.join(', ') || 'General catering'}

REQUIREMENTS:
1. Create a complete menu with appetizers, main courses, and desserts
2. Ensure 100% compliance with all dietary restrictions
3. Include ingredient lists for each dish
4. Provide allergen warnings and dietary tags
5. Estimate preparation time and difficulty
6. Suggest serving presentation and portion sizes
7. Include alternative options for each course
8. Consider cross-contamination prevention
9. Optimize for the specified budget while maintaining quality
10. Account for seasonal ingredient availability

RESPONSE FORMAT:
Return a detailed JSON object with the menu structure, including courses, dishes, ingredients, allergen information, costs, and compliance analysis.`;
  }

  private formatDietaryRequirementsForPrompt(requirements: any[]): string {
    if (!requirements.length) return 'No specific dietary requirements';

    return requirements
      .map(
        (req) =>
          `- ${req.guest_name}: ${req.dietary_categories?.name} (Severity: ${req.severity_level}/5) - ${req.specific_notes || 'No additional notes'}`,
      )
      .join('\n');
  }

  private getSystemPrompt(analysisType: string): string {
    const prompts = {
      menu_generation: `You are a master chef with 25+ years of experience in wedding catering and dietary-compliant cooking. You specialize in creating elegant, delicious menus that accommodate all dietary restrictions while maintaining exceptional taste and presentation.

Key expertise:
- Food allergies and cross-contamination prevention
- Religious and cultural dietary laws (kosher, halal, etc.)
- Plant-based and alternative ingredient cooking
- Cost-effective menu planning and portion control
- Seasonal ingredient sourcing and availability
- Wedding-specific presentation and service requirements

Always prioritize guest safety, especially for severe allergies. Provide creative, restaurant-quality solutions that exceed expectations while staying within budget constraints.`,

      allergen_analysis: `You are a food safety expert and certified allergen specialist with deep knowledge of:
- FDA allergen regulations and labeling requirements
- Cross-contamination risks in commercial kitchens
- Hidden allergens in processed foods and ingredients
- International food safety standards
- Ingredient traceability and supply chain analysis
- Emergency protocols for severe allergic reactions

Provide thorough, accurate analysis with specific attention to life-threatening allergens. Always err on the side of caution and provide detailed warnings for any potential risks.`,
    };

    return (
      prompts[analysisType as keyof typeof prompts] ||
      'You are a helpful AI assistant specializing in food service and dietary management.'
    );
  }

  private validateMenuResponse(menu: any): boolean {
    return (
      menu &&
      typeof menu === 'object' &&
      menu.courses &&
      Array.isArray(menu.courses) &&
      menu.courses.length > 0 &&
      menu.courses.every(
        (course: any) =>
          course.dishes &&
          Array.isArray(course.dishes) &&
          course.dishes.length > 0,
      )
    );
  }

  private generateCacheKey(type: string, data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto
      .createHash('sha256')
      .update(`${type}:${dataString}`)
      .digest('hex');
  }

  private getFromCache(key: string): CacheEntry | null {
    const entry = this.requestCache.get(key);
    if (!entry) return null;

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.cacheTimeout) {
      this.requestCache.delete(key);
      return null;
    }

    return entry;
  }

  private setCache(key: string, entry: CacheEntry): void {
    // Prevent cache from growing too large
    if (this.requestCache.size >= this.maxCacheSize) {
      // Remove oldest entries (simple LRU implementation)
      const oldestKey = this.requestCache.keys().next().value;
      if (oldestKey) {
        this.requestCache.delete(oldestKey);
      }
    }

    this.requestCache.set(key, entry);
  }

  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.requestCache.entries()) {
      if (now - entry.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.requestCache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  private calculateCacheHitRate(): number {
    // This is a simplified implementation - in production you'd track hits/misses
    return this.requestCache.size > 0 ? 0.7 : 0; // Placeholder
  }

  private enhanceError(
    error: any,
    operation: string,
    requestId: string,
  ): Error {
    let message = `${operation} failed (${requestId})`;

    if (error.message) {
      if (
        error.message.includes('rate limit') ||
        error.message.includes('quota')
      ) {
        message = `OpenAI rate limit exceeded. Please try again later. (${requestId})`;
      } else if (error.message.includes('timeout')) {
        message = `OpenAI request timeout. Please try again. (${requestId})`;
      } else if (error.message.includes('Circuit breaker')) {
        message = `OpenAI service temporarily unavailable. Please try again in a few minutes. (${requestId})`;
      } else {
        message = `${message}: ${error.message}`;
      }
    }

    const enhancedError = new Error(message);
    enhancedError.name = error.name || 'OpenAIServiceError';

    return enhancedError;
  }
}

// Export singleton instance
export const enhancedOpenAIService = new EnhancedOpenAIService();
