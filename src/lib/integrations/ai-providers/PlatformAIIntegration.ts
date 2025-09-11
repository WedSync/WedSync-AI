/**
 * Platform AI Integration Service - WedSync's OpenAI Integration
 * Manages WedSync's master OpenAI account with tier-based quotas
 * Handles cost allocation, rate limiting, and wedding season scaling
 *
 * WS-239 Team C - Integration Focus
 */

import OpenAI from 'openai';
import { Logger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';

// Platform-specific interfaces
export interface PlatformAIRequest {
  id: string;
  supplierId: string;
  supplierTier: 'starter' | 'professional' | 'scale' | 'enterprise';
  requestType:
    | 'email_template'
    | 'image_analysis'
    | 'text_completion'
    | 'embedding'
    | 'wedding_content';
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  weddingDate?: Date;
  isWeddingDay?: boolean;
  metadata?: Record<string, any>;
}

export interface PlatformAIResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  processingTime: number;
  metadata?: Record<string, any>;
}

export interface TierQuotas {
  starter: {
    monthlyTokens: 50000;
    maxTokensPerRequest: 2000;
    rateLimitPerMinute: 10;
    features: ['email_templates', 'basic_content'];
  };
  professional: {
    monthlyTokens: 200000;
    maxTokensPerRequest: 4000;
    rateLimitPerMinute: 30;
    features: [
      'email_templates',
      'image_analysis',
      'advanced_content',
      'chatbot',
    ];
  };
  scale: {
    monthlyTokens: 500000;
    maxTokensPerRequest: 8000;
    rateLimitPerMinute: 60;
    features: ['all_features', 'bulk_operations', 'api_access'];
  };
  enterprise: {
    monthlyTokens: 2000000;
    maxTokensPerRequest: 16000;
    rateLimitPerMinute: 120;
    features: ['all_features', 'unlimited_operations', 'priority_support'];
  };
}

export interface UsageMetrics {
  supplierId: string;
  tier: string;
  tokensUsed: number;
  requestsCount: number;
  totalCost: number;
  periodStart: Date;
  periodEnd: Date;
  lastUpdated: Date;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  quotaRemaining?: number;
  resetDate?: Date;
}

/**
 * Platform AI Integration Service
 * Manages WedSync's master OpenAI integration with intelligent quota management
 */
export class PlatformAIIntegrationService {
  private logger: Logger;
  private openai: OpenAI;
  private supabase: any;

  // Tier configurations
  private readonly tierQuotas: TierQuotas;

  // Rate limiting and quota tracking
  private usageCache: Map<string, UsageMetrics> = new Map();
  private rateLimitTrackers: Map<string, RateLimitTracker> = new Map();

  // Wedding season optimization
  private seasonalMultiplier = 1.0;
  private peakSeasonMonths = [2, 3, 4, 5, 6, 7, 8, 9]; // March-October

  // Cost tracking (OpenAI pricing as of 2024)
  private readonly pricing = {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
    'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
    'text-embedding-3-small': { input: 0.00002, output: 0 },
  };

  constructor() {
    this.logger = new Logger('PlatformAIIntegrationService');

    // Initialize OpenAI client with WedSync's master account
    this.openai = new OpenAI({
      apiKey: process.env.WEDSYNC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      organization: process.env.WEDSYNC_OPENAI_ORG_ID,
    });

    // Initialize Supabase for quota tracking
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Define tier quotas
    this.tierQuotas = {
      starter: {
        monthlyTokens: 50000,
        maxTokensPerRequest: 2000,
        rateLimitPerMinute: 10,
        features: ['email_templates', 'basic_content'],
      },
      professional: {
        monthlyTokens: 200000,
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 30,
        features: [
          'email_templates',
          'image_analysis',
          'advanced_content',
          'chatbot',
        ],
      },
      scale: {
        monthlyTokens: 500000,
        maxTokensPerRequest: 8000,
        rateLimitPerMinute: 60,
        features: ['all_features', 'bulk_operations', 'api_access'],
      },
      enterprise: {
        monthlyTokens: 2000000,
        maxTokensPerRequest: 16000,
        rateLimitPerMinute: 120,
        features: ['all_features', 'unlimited_operations', 'priority_support'],
      },
    };

    // Initialize seasonal multiplier
    this.updateSeasonalMultiplier();

    // Start background processes
    this.initializeBackgroundProcesses();
  }

  /**
   * Execute platform AI request with quota management
   */
  async executePlatformRequest(
    request: PlatformAIRequest,
  ): Promise<PlatformAIResponse> {
    const startTime = Date.now();
    const requestId = request.id;

    try {
      this.logger.info(`Processing platform AI request`, {
        requestId,
        supplierId: request.supplierId,
        tier: request.supplierTier,
        type: request.requestType,
      });

      // Validate supplier access and quotas
      const validation = await this.validatePlatformAccess(
        request.supplierId,
        request.supplierTier,
      );
      if (!validation.valid) {
        throw new Error(
          validation.error || 'Platform access validation failed',
        );
      }

      // Check rate limits
      await this.checkRateLimit(request.supplierId, request.supplierTier);

      // Estimate token usage
      const estimatedTokens = await this.estimateTokenUsage(request);

      // Validate against tier limits
      await this.validateTierLimits(request.supplierTier, estimatedTokens);

      // Execute the AI request
      const aiResponse = await this.executeOpenAIRequest(
        request,
        estimatedTokens,
      );

      // Calculate actual cost
      const cost = this.calculateCost(aiResponse.model, aiResponse.usage);

      // Update usage tracking
      await this.updateUsageTracking(
        request.supplierId,
        request.supplierTier,
        aiResponse.usage,
        cost,
      );

      // Prepare response
      const response: PlatformAIResponse = {
        success: true,
        data: aiResponse.data,
        usage: aiResponse.usage,
        cost,
        processingTime: Date.now() - startTime,
        metadata: {
          model: aiResponse.model,
          tier: request.supplierTier,
          seasonal_multiplier: this.seasonalMultiplier,
          wedding_day: request.isWeddingDay,
        },
      };

      this.logger.info(`Platform AI request completed successfully`, {
        requestId,
        tokensUsed: aiResponse.usage?.total_tokens,
        cost,
        processingTime: response.processingTime,
      });

      return response;
    } catch (error) {
      this.logger.error(`Platform AI request failed`, {
        requestId,
        error: error.message,
        supplierId: request.supplierId,
      });

      return {
        success: false,
        error: error.message,
        cost: 0,
        processingTime: Date.now() - startTime,
        metadata: {
          tier: request.supplierTier,
          failure_reason: error.message,
        },
      };
    }
  }

  /**
   * Track platform usage for a supplier
   */
  async trackPlatformUsage(
    supplierId: string,
    usage: UsageMetrics,
  ): Promise<void> {
    try {
      // Update cache
      this.usageCache.set(supplierId, usage);

      // Persist to database
      const { error } = await this.supabase.from('ai_platform_usage').upsert({
        supplier_id: supplierId,
        tier: usage.tier,
        tokens_used: usage.tokensUsed,
        requests_count: usage.requestsCount,
        total_cost: usage.totalCost,
        period_start: usage.periodStart.toISOString(),
        period_end: usage.periodEnd.toISOString(),
        last_updated: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      this.logger.debug(`Usage tracked for supplier`, { supplierId, usage });
    } catch (error) {
      this.logger.error(`Failed to track platform usage`, {
        supplierId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Validate platform access for supplier
   */
  async validatePlatformAccess(
    supplierId: string,
    tier?: string,
  ): Promise<ValidationResult> {
    try {
      // Get supplier configuration
      const { data: supplier, error } = await this.supabase
        .from('organizations')
        .select(
          'subscription_tier, subscription_status, ai_quota_used, ai_quota_reset_date',
        )
        .eq('id', supplierId)
        .single();

      if (error || !supplier) {
        return {
          valid: false,
          error: 'Supplier not found or access denied',
        };
      }

      // Check subscription status
      if (supplier.subscription_status !== 'active') {
        return {
          valid: false,
          error: 'Subscription not active',
        };
      }

      // Get tier configuration
      const tierConfig = this.tierQuotas[tier || supplier.subscription_tier];
      if (!tierConfig) {
        return {
          valid: false,
          error: 'Invalid subscription tier',
        };
      }

      // Check quota
      const quotaUsed = supplier.ai_quota_used || 0;
      const quotaLimit = tierConfig.monthlyTokens * this.seasonalMultiplier;

      if (quotaUsed >= quotaLimit) {
        return {
          valid: false,
          error: 'Monthly AI quota exceeded',
          quotaRemaining: 0,
          resetDate: new Date(supplier.ai_quota_reset_date),
        };
      }

      return {
        valid: true,
        quotaRemaining: quotaLimit - quotaUsed,
        resetDate: new Date(supplier.ai_quota_reset_date),
      };
    } catch (error) {
      this.logger.error(`Platform access validation failed`, {
        supplierId,
        error: error.message,
      });

      return {
        valid: false,
        error: `Validation error: ${error.message}`,
      };
    }
  }

  // Private helper methods

  private async executeOpenAIRequest(
    request: PlatformAIRequest,
    estimatedTokens: number,
  ): Promise<any> {
    const { requestType, payload } = request;

    switch (requestType) {
      case 'email_template':
        return await this.generateEmailTemplate(payload);

      case 'image_analysis':
        return await this.analyzeImage(payload);

      case 'text_completion':
        return await this.generateTextCompletion(payload);

      case 'embedding':
        return await this.generateEmbedding(payload);

      case 'wedding_content':
        return await this.generateWeddingContent(payload);

      default:
        throw new Error(`Unsupported request type: ${requestType}`);
    }
  }

  private async generateEmailTemplate(payload: any): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert wedding industry email copywriter. Generate professional, personalized email templates that are warm, engaging, and appropriate for the wedding industry.`,
        },
        {
          role: 'user',
          content: this.buildEmailPrompt(payload),
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content generated');
    }

    return {
      data: JSON.parse(content),
      usage: completion.usage,
      model: completion.model,
    };
  }

  private async analyzeImage(payload: any): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this wedding photo and provide detailed categorization, quality assessment, and tagging information in JSON format.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${payload.imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No analysis generated');
    }

    return {
      data: this.parseJSONResponse(content),
      usage: completion.usage,
      model: completion.model,
    };
  }

  private async generateTextCompletion(payload: any): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: payload.model || 'gpt-4',
      messages: payload.messages,
      max_tokens: payload.max_tokens || 1000,
      temperature: payload.temperature || 0.7,
    });

    return {
      data: completion.choices[0].message.content,
      usage: completion.usage,
      model: completion.model,
    };
  }

  private async generateEmbedding(payload: any): Promise<any> {
    const embedding = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: payload.text,
    });

    return {
      data: embedding.data[0].embedding,
      usage: embedding.usage,
      model: 'text-embedding-3-small',
    };
  }

  private async generateWeddingContent(payload: any): Promise<any> {
    const systemPrompt = `You are a wedding industry content expert. Generate compelling, accurate, and emotionally resonant content for wedding suppliers and couples. Consider cultural sensitivity, industry best practices, and seasonal relevance.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: payload.prompt },
      ],
      max_tokens: payload.max_tokens || 2000,
      temperature: payload.temperature || 0.8,
    });

    return {
      data: completion.choices[0].message.content,
      usage: completion.usage,
      model: completion.model,
    };
  }

  private buildEmailPrompt(payload: any): string {
    const { templateType, vendorType, context, tone } = payload;

    return `Generate a ${templateType} email template for a ${vendorType} wedding vendor.

Context:
- Vendor: ${context.vendorName}
- Client: ${context.clientName}
- Wedding Date: ${context.weddingDate || 'TBD'}
- Package: ${context.packageDetails || 'Custom package'}

Requirements:
- Tone: ${tone}
- Professional and wedding industry appropriate
- Include personalized details
- Clear call-to-action when appropriate

Return as JSON with this structure:
{
  "subject": "Email subject line",
  "body": "Email body content with proper formatting",
  "personalization_tags": ["{{client_name}}", "{{wedding_date}}"]
}`;
  }

  private async estimateTokenUsage(
    request: PlatformAIRequest,
  ): Promise<number> {
    // Rough estimation based on request type
    const baseEstimates = {
      email_template: 800,
      image_analysis: 1200,
      text_completion: 500,
      embedding: 100,
      wedding_content: 1000,
    };

    const base = baseEstimates[request.requestType] || 500;

    // Apply seasonal multiplier for more conservative estimates during peak season
    return Math.ceil(base * this.seasonalMultiplier);
  }

  private async validateTierLimits(
    tier: string,
    estimatedTokens: number,
  ): Promise<void> {
    const tierConfig = this.tierQuotas[tier as keyof TierQuotas];

    if (estimatedTokens > tierConfig.maxTokensPerRequest) {
      throw new Error(
        `Request exceeds tier limit of ${tierConfig.maxTokensPerRequest} tokens`,
      );
    }
  }

  private async checkRateLimit(
    supplierId: string,
    tier: string,
  ): Promise<void> {
    const rateLimitKey = `${supplierId}_${tier}`;
    let tracker = this.rateLimitTrackers.get(rateLimitKey);

    if (!tracker) {
      tracker = new RateLimitTracker(
        this.tierQuotas[tier as keyof TierQuotas].rateLimitPerMinute,
      );
      this.rateLimitTrackers.set(rateLimitKey, tracker);
    }

    if (!tracker.allowRequest()) {
      throw new Error(
        `Rate limit exceeded for tier ${tier}. Try again in ${tracker.getResetTime()}ms`,
      );
    }
  }

  private calculateCost(model: string, usage: any): number {
    if (!usage || !this.pricing[model as keyof typeof this.pricing]) {
      return 0;
    }

    const pricing = this.pricing[model as keyof typeof this.pricing];
    const inputCost = ((usage.prompt_tokens || 0) * pricing.input) / 1000;
    const outputCost = ((usage.completion_tokens || 0) * pricing.output) / 1000;

    return inputCost + outputCost;
  }

  private async updateUsageTracking(
    supplierId: string,
    tier: string,
    usage: any,
    cost: number,
  ): Promise<void> {
    try {
      // Update database
      const { error } = await this.supabase.rpc('increment_ai_usage', {
        supplier_id: supplierId,
        tokens_used: usage?.total_tokens || 0,
        cost_incurred: cost,
      });

      if (error) {
        this.logger.error(`Failed to update usage tracking`, {
          supplierId,
          error,
        });
      }
    } catch (error) {
      this.logger.error(`Usage tracking update failed`, {
        supplierId,
        error: error.message,
      });
    }
  }

  private parseJSONResponse(content: string): any {
    try {
      // Try to extract JSON from response
      const jsonMatch =
        content.match(/```json\n?(.*?)\n?```/s) || content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }

      return { raw_response: content };
    } catch (error) {
      return { raw_response: content, parse_error: true };
    }
  }

  private updateSeasonalMultiplier(): void {
    const currentMonth = new Date().getMonth();

    if (this.peakSeasonMonths.includes(currentMonth)) {
      this.seasonalMultiplier = 1.5; // 50% increase during peak season
    } else {
      this.seasonalMultiplier = 1.0;
    }

    this.logger.info(`Seasonal multiplier updated`, {
      month: currentMonth,
      multiplier: this.seasonalMultiplier,
    });
  }

  private initializeBackgroundProcesses(): void {
    // Update seasonal multiplier monthly
    setInterval(
      () => {
        this.updateSeasonalMultiplier();
      },
      24 * 60 * 60 * 1000,
    ); // Daily check

    // Clean up old rate limiters
    setInterval(
      () => {
        this.rateLimitTrackers.clear();
      },
      60 * 60 * 1000,
    ); // Hourly cleanup

    // Sync usage cache to database
    setInterval(
      async () => {
        await this.syncUsageCache();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  private async syncUsageCache(): Promise<void> {
    try {
      for (const [supplierId, usage] of this.usageCache) {
        await this.trackPlatformUsage(supplierId, usage);
      }
    } catch (error) {
      this.logger.error(`Usage cache sync failed`, { error: error.message });
    }
  }
}

// Helper class for rate limiting
class RateLimitTracker {
  private requests: number[] = [];
  private maxRequests: number;

  constructor(maxRequestsPerMinute: number) {
    this.maxRequests = maxRequestsPerMinute;
  }

  allowRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old requests
    this.requests = this.requests.filter((time) => time > oneMinuteAgo);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;

    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, 60000 - (Date.now() - oldestRequest));
  }
}

// Export types and service
export type {
  PlatformAIRequest,
  PlatformAIResponse,
  TierQuotas,
  UsageMetrics,
  ValidationResult,
};
