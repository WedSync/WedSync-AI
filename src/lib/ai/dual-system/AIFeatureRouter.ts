/**
 * WS-239: AI Feature Router - Team B Round 1
 * Central intelligence for routing AI requests between platform and client systems
 * Handles usage limits, cost tracking, and failover logic
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from '@/lib/logging/Logger';
import { OpenAIService } from '@/lib/services/openai-service';
import { CostTrackingService } from './CostTrackingService';
import { ClientAIService } from './ClientAIService';
import { CircuitBreakerService } from './CircuitBreakerService';

export type AIFeatureType =
  | 'photo_analysis'
  | 'content_generation'
  | 'email_templates'
  | 'chat_responses'
  | 'document_analysis'
  | 'wedding_planning'
  | 'vendor_matching'
  | 'budget_optimization';

export type ProviderType = 'platform' | 'client';
export type TierType =
  | 'FREE'
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'SCALE'
  | 'ENTERPRISE';

export interface AIRequest {
  featureType: AIFeatureType;
  requestType: string;
  data: any;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  provider: ProviderType;
  usage: {
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
    costPounds: number;
  };
  performanceMs: number;
  model?: string;
}

export interface AIFeatureConfig {
  id: string;
  supplierId: string;

  // Platform configuration
  platformFeaturesEnabled: boolean;
  platformUsageTier: TierType;
  platformMonthlyLimits: Record<AIFeatureType, number>;
  platformOverageRatePounds: number;

  // Client configuration
  clientApiEnabled: boolean;
  clientApiProvider: 'openai' | 'anthropic' | 'google';
  clientMonthlyBudgetPounds: number;
  clientAutoDisableAtLimit: boolean;
  clientCostAlertsEnabled: boolean;
  clientAlertThresholds: number[];

  // Migration status
  migrationStatus: 'platform_only' | 'hybrid' | 'client_only' | 'migrating';

  // Health status
  clientApiHealthStatus: boolean;
  platformApiHealthStatus: boolean;
}

export interface AccessValidationResult {
  allowed: boolean;
  provider: ProviderType;
  reason?: string;
  remainingQuota?: number;
  costEstimate?: number;
  warnings?: string[];
}

/**
 * Central AI Feature Router
 * Routes AI requests to platform or client systems based on supplier configuration
 */
export class AIFeatureRouter {
  private logger: Logger;
  private supabase;
  private costTracker: CostTrackingService;
  private platformAI: OpenAIService;
  private clientAI: ClientAIService;
  private circuitBreaker: CircuitBreakerService;

  constructor() {
    this.logger = new Logger('AIFeatureRouter');
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.costTracker = new CostTrackingService();
    this.platformAI = new OpenAIService();
    this.clientAI = new ClientAIService();
    this.circuitBreaker = new CircuitBreakerService();
  }

  /**
   * Route AI request to appropriate provider (platform or client)
   */
  async routeAIRequest(
    supplierId: string,
    userId: string,
    request: AIRequest,
    weddingDate?: string,
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Routing AI request', {
        supplierId,
        userId,
        featureType: request.featureType,
        requestType: request.requestType,
      });

      // 1. Get supplier AI configuration
      const config = await this.getSupplierAIConfig(supplierId);
      if (!config) {
        throw new Error(
          `AI configuration not found for supplier ${supplierId}`,
        );
      }

      // 2. Validate feature access and determine routing
      const validation = await this.validateFeatureAccess(
        supplierId,
        request.featureType,
      );
      if (!validation.allowed) {
        throw new Error(validation.reason || 'AI feature access denied');
      }

      // 3. Check circuit breaker status
      const circuitStatus = await this.circuitBreaker.checkStatus(
        validation.provider,
        supplierId,
      );
      if (circuitStatus.state === 'OPEN') {
        // Try fallback provider if available
        const fallbackValidation = await this.validateFeatureAccess(
          supplierId,
          request.featureType,
          validation.provider === 'platform' ? 'client' : 'platform',
        );

        if (fallbackValidation.allowed) {
          validation.provider = fallbackValidation.provider;
          this.logger.warn('Using fallback provider due to circuit breaker', {
            supplierId,
            original: validation.provider === 'client' ? 'platform' : 'client',
            fallback: validation.provider,
          });
        } else {
          throw new Error(
            'AI service temporarily unavailable - circuit breaker open',
          );
        }
      }

      // 4. Execute AI request
      let response: AIResponse;

      if (validation.provider === 'platform') {
        response = await this.executePlatformAIRequest(config, request);
      } else {
        response = await this.executeClientAIRequest(config, request);
      }

      response.provider = validation.provider;
      response.performanceMs = Date.now() - startTime;

      // 5. Track usage and cost
      await this.costTracker.trackUsage(supplierId, userId, {
        featureType: request.featureType,
        requestType: request.requestType,
        providerType: validation.provider,
        tokensInput: response.usage.tokensInput,
        tokensOutput: response.usage.tokensOutput,
        costPounds: response.usage.costPounds,
        model: response.model || 'unknown',
        responseTimeMs: response.performanceMs,
        success: response.success,
        weddingDate: weddingDate ? new Date(weddingDate) : undefined,
      });

      // 6. Update circuit breaker on success
      if (response.success) {
        await this.circuitBreaker.recordSuccess(
          validation.provider,
          supplierId,
        );
      } else {
        await this.circuitBreaker.recordFailure(
          validation.provider,
          supplierId,
        );
      }

      // 7. Check for cost alerts
      if (validation.provider === 'client' && config.clientCostAlertsEnabled) {
        await this.checkCostAlerts(supplierId, config);
      }

      this.logger.info('AI request completed', {
        supplierId,
        provider: validation.provider,
        success: response.success,
        tokensUsed: response.usage.tokensTotal,
        costPounds: response.usage.costPounds,
        responseTimeMs: response.performanceMs,
      });

      return response;
    } catch (error) {
      const errorResponse: AIResponse = {
        success: false,
        error: error.message,
        provider: 'platform', // Default for error tracking
        usage: {
          tokensInput: 0,
          tokensOutput: 0,
          tokensTotal: 0,
          costPounds: 0,
        },
        performanceMs: Date.now() - startTime,
      };

      // Track failed request
      await this.costTracker.trackUsage(supplierId, userId, {
        featureType: request.featureType,
        requestType: request.requestType,
        providerType: 'platform',
        tokensInput: 0,
        tokensOutput: 0,
        costPounds: 0,
        model: 'unknown',
        responseTimeMs: errorResponse.performanceMs,
        success: false,
        errorMessage: error.message,
        weddingDate: weddingDate ? new Date(weddingDate) : undefined,
      });

      this.logger.error('AI request failed', {
        supplierId,
        userId,
        featureType: request.featureType,
        error: error.message,
      });

      return errorResponse;
    }
  }

  /**
   * Validate if supplier can access the requested AI feature
   */
  async validateFeatureAccess(
    supplierId: string,
    featureType: AIFeatureType,
    preferredProvider?: ProviderType,
  ): Promise<AccessValidationResult> {
    try {
      const config = await this.getSupplierAIConfig(supplierId);
      if (!config) {
        return {
          allowed: false,
          provider: 'platform',
          reason: 'AI configuration not found',
        };
      }

      // Check if client AI is preferred and available
      if (
        preferredProvider === 'client' ||
        (config.clientApiEnabled && config.migrationStatus !== 'platform_only')
      ) {
        if (!config.clientApiHealthStatus) {
          return {
            allowed: false,
            provider: 'client',
            reason: 'Client AI service unhealthy',
          };
        }

        // Check client budget
        const currentUsage = await this.getCurrentMonthUsage(
          supplierId,
          'client',
        );
        if (currentUsage.costPounds >= config.clientMonthlyBudgetPounds) {
          if (config.clientAutoDisableAtLimit) {
            // Fall back to platform if available
            if (config.platformFeaturesEnabled) {
              return this.validatePlatformAccess(
                config,
                featureType,
                supplierId,
              );
            } else {
              return {
                allowed: false,
                provider: 'client',
                reason: 'Client AI budget exceeded and platform disabled',
              };
            }
          }
        }

        return {
          allowed: true,
          provider: 'client',
          remainingQuota: Math.max(
            0,
            config.clientMonthlyBudgetPounds - currentUsage.costPounds,
          ),
          costEstimate: this.estimateClientRequestCost(featureType),
        };
      }

      // Fall back to platform AI
      return this.validatePlatformAccess(config, featureType, supplierId);
    } catch (error) {
      this.logger.error('Feature access validation failed', {
        supplierId,
        featureType,
        error,
      });
      return {
        allowed: false,
        provider: 'platform',
        reason: 'Validation failed',
      };
    }
  }

  /**
   * Validate platform AI access based on tier limits
   */
  private async validatePlatformAccess(
    config: AIFeatureConfig,
    featureType: AIFeatureType,
    supplierId: string,
  ): Promise<AccessValidationResult> {
    if (!config.platformFeaturesEnabled || !config.platformApiHealthStatus) {
      return {
        allowed: false,
        provider: 'platform',
        reason: 'Platform AI disabled or unhealthy',
      };
    }

    const monthlyLimit = config.platformMonthlyLimits[featureType] || 0;
    if (monthlyLimit === 0) {
      return {
        allowed: false,
        provider: 'platform',
        reason: `Feature ${featureType} not available on ${config.platformUsageTier} tier`,
      };
    }

    const currentUsage = await this.getCurrentMonthUsage(
      supplierId,
      'platform',
    );
    const featureUsage = currentUsage.featureBreakdown[featureType] || 0;

    const warnings: string[] = [];

    if (featureUsage >= monthlyLimit) {
      // Allow overage but track cost
      warnings.push(
        `Monthly limit exceeded - overage charges apply (£${config.platformOverageRatePounds} per request)`,
      );
    } else if (featureUsage >= monthlyLimit * 0.9) {
      warnings.push(
        `Approaching monthly limit (${featureUsage}/${monthlyLimit})`,
      );
    }

    return {
      allowed: true,
      provider: 'platform',
      remainingQuota: Math.max(0, monthlyLimit - featureUsage),
      costEstimate:
        featureUsage >= monthlyLimit ? config.platformOverageRatePounds : 0,
      warnings,
    };
  }

  /**
   * Execute AI request using platform AI service
   */
  private async executePlatformAIRequest(
    config: AIFeatureConfig,
    request: AIRequest,
  ): Promise<AIResponse> {
    const response = await this.platformAI.generateCompletion(
      this.buildPromptForFeature(request.featureType, request.data),
      {
        model: request.model || 'gpt-4',
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.7,
      },
    );

    // Calculate cost (overage or included)
    const currentUsage = await this.getCurrentMonthUsage(
      config.supplierId,
      'platform',
    );
    const featureUsage =
      currentUsage.featureBreakdown[request.featureType] || 0;
    const monthlyLimit = config.platformMonthlyLimits[request.featureType] || 0;

    const costPounds =
      featureUsage >= monthlyLimit ? config.platformOverageRatePounds : 0;

    return {
      success: true,
      data: this.parseAIResponse(request.featureType, response.text),
      provider: 'platform',
      usage: {
        tokensInput: response.usage.prompt_tokens,
        tokensOutput: response.usage.completion_tokens,
        tokensTotal: response.usage.total_tokens,
        costPounds,
      },
      model: response.model,
      performanceMs: 0, // Will be set by caller
    };
  }

  /**
   * Execute AI request using client AI service
   */
  private async executeClientAIRequest(
    config: AIFeatureConfig,
    request: AIRequest,
  ): Promise<AIResponse> {
    const response = await this.clientAI.executeRequest(
      config.supplierId,
      request.featureType,
      request.data,
      {
        model: request.model,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
      },
    );

    return {
      success: response.success,
      data: response.data,
      provider: 'client',
      usage: {
        tokensInput: response.tokensInput,
        tokensOutput: response.tokensOutput,
        tokensTotal: response.tokensInput + response.tokensOutput,
        costPounds: response.costPounds,
      },
      model: response.model,
      performanceMs: 0, // Will be set by caller
      error: response.error,
    };
  }

  /**
   * Get supplier AI configuration from database
   */
  private async getSupplierAIConfig(
    supplierId: string,
  ): Promise<AIFeatureConfig | null> {
    const { data, error } = await this.supabase
      .from('ai_feature_config')
      .select('*')
      .eq('supplier_id', supplierId)
      .single();

    if (error) {
      this.logger.error('Failed to fetch AI config', { supplierId, error });
      return null;
    }

    return {
      id: data.id,
      supplierId: data.supplier_id,
      platformFeaturesEnabled: data.platform_features_enabled,
      platformUsageTier: data.platform_usage_tier,
      platformMonthlyLimits: data.platform_monthly_limits,
      platformOverageRatePounds: parseFloat(data.platform_overage_rate_pounds),
      clientApiEnabled: data.client_api_enabled,
      clientApiProvider: data.client_api_provider,
      clientMonthlyBudgetPounds: parseFloat(data.client_monthly_budget_pounds),
      clientAutoDisableAtLimit: data.client_auto_disable_at_limit,
      clientCostAlertsEnabled: data.client_cost_alerts_enabled,
      clientAlertThresholds: data.client_alert_thresholds,
      migrationStatus: data.migration_status,
      clientApiHealthStatus: data.client_api_health_status,
      platformApiHealthStatus: data.platform_api_health_status,
    };
  }

  /**
   * Get current month usage for supplier
   */
  private async getCurrentMonthUsage(
    supplierId: string,
    providerType: ProviderType,
  ): Promise<{
    costPounds: number;
    requests: number;
    featureBreakdown: Record<AIFeatureType, number>;
  }> {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

    const { data, error } = await this.supabase
      .from('ai_usage_tracking')
      .select('feature_type, cost_pounds')
      .eq('supplier_id', supplierId)
      .eq('provider_type', providerType)
      .eq('billing_period', currentMonth);

    if (error) {
      this.logger.error('Failed to fetch usage data', {
        supplierId,
        providerType,
        error,
      });
      return {
        costPounds: 0,
        requests: 0,
        featureBreakdown: {} as Record<AIFeatureType, number>,
      };
    }

    const costPounds = data.reduce(
      (sum, row) => sum + parseFloat(row.cost_pounds),
      0,
    );
    const requests = data.length;
    const featureBreakdown = data.reduce(
      (breakdown, row) => {
        const feature = row.feature_type as AIFeatureType;
        breakdown[feature] = (breakdown[feature] || 0) + 1;
        return breakdown;
      },
      {} as Record<AIFeatureType, number>,
    );

    return { costPounds, requests, featureBreakdown };
  }

  /**
   * Estimate cost for client AI request
   */
  private estimateClientRequestCost(featureType: AIFeatureType): number {
    // Conservative estimates based on typical token usage
    const estimates: Record<AIFeatureType, number> = {
      photo_analysis: 0.15, // ~£0.15 per photo analysis
      content_generation: 0.08, // ~£0.08 per content piece
      email_templates: 0.05, // ~£0.05 per email template
      chat_responses: 0.03, // ~£0.03 per chat response
      document_analysis: 0.2, // ~£0.20 per document
      wedding_planning: 0.12, // ~£0.12 per planning request
      vendor_matching: 0.06, // ~£0.06 per match request
      budget_optimization: 0.1, // ~£0.10 per optimization
    };

    return estimates[featureType] || 0.1;
  }

  /**
   * Build AI prompt based on feature type and data
   */
  private buildPromptForFeature(featureType: AIFeatureType, data: any): string {
    switch (featureType) {
      case 'photo_analysis':
        return `Analyze this wedding photo for: ${JSON.stringify(data)}. Provide structured analysis with categories, quality assessment, and enhancement suggestions.`;

      case 'content_generation':
        return `Generate wedding-related content: ${JSON.stringify(data)}. Make it professional, engaging, and appropriate for wedding suppliers.`;

      case 'email_templates':
        return `Create a professional email template for wedding suppliers: ${JSON.stringify(data)}. Include proper subject line and personalized content.`;

      default:
        return `Process this wedding industry request: ${JSON.stringify(data)}. Provide relevant, professional response.`;
    }
  }

  /**
   * Parse AI response based on feature type
   */
  private parseAIResponse(featureType: AIFeatureType, response: string): any {
    try {
      // Try to parse as JSON first
      return JSON.parse(response);
    } catch {
      // Return structured response based on feature type
      return {
        featureType,
        content: response,
        processedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Check and trigger cost alerts if thresholds exceeded
   */
  private async checkCostAlerts(
    supplierId: string,
    config: AIFeatureConfig,
  ): Promise<void> {
    const usage = await this.getCurrentMonthUsage(supplierId, 'client');
    const utilizationRate = usage.costPounds / config.clientMonthlyBudgetPounds;

    for (const threshold of config.clientAlertThresholds) {
      if (utilizationRate >= threshold) {
        // Would implement notification service here
        this.logger.warn('Cost threshold exceeded', {
          supplierId,
          threshold: threshold * 100,
          utilizationRate: utilizationRate * 100,
          currentCost: usage.costPounds,
          budget: config.clientMonthlyBudgetPounds,
        });
      }
    }
  }
}

export const aiFeatureRouter = new AIFeatureRouter();
