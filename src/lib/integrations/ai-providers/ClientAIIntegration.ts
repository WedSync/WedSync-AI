/**
 * Client AI Integration Service - Supplier's Individual AI Provider Integration
 * Handles supplier's personal OpenAI/Anthropic/Azure OpenAI accounts
 * Manages API key validation, direct billing tracking, and provider-specific optimizations
 *
 * WS-239 Team C - Integration Focus
 */

import OpenAI from 'openai';
import { Logger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '../../utils/encryption';

// Client-specific interfaces
export interface ClientAIRequest {
  id: string;
  supplierId: string;
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

export interface ClientAIResponse {
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
  provider: string;
  metadata?: Record<string, any>;
}

export interface ClientAIConfig {
  provider: 'openai' | 'anthropic' | 'azure_openai';
  apiKey: string;
  organizationId?: string;
  endpoint?: string; // For Azure OpenAI
  apiVersion?: string; // For Azure OpenAI
  model?: string;
  maxTokens?: number;
  temperature?: number;
  validated: boolean;
  lastValidation: Date;
  billingInfo?: {
    directBilling: boolean;
    accountId?: string;
    costTracking: boolean;
  };
}

export interface ProviderValidationResult {
  valid: boolean;
  error?: string;
  providerInfo?: {
    organization?: string;
    models?: string[];
    limits?: any;
  };
  costs?: {
    currentUsage?: number;
    billingTier?: string;
  };
}

export interface ClientUsageMetrics {
  supplierId: string;
  provider: string;
  tokensUsed: number;
  requestsCount: number;
  totalCost: number;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  lastUpdated: Date;
  costBreakdown?: {
    inputTokens: number;
    outputTokens: number;
    imageAnalysis?: number;
    embeddings?: number;
  };
}

/**
 * Client AI Integration Service
 * Manages supplier's individual AI provider accounts with secure API key handling
 */
export class ClientAIIntegrationService {
  private logger: Logger;
  private supabase: any;

  // Provider clients cache
  private clientCache: Map<string, any> = new Map();

  // Usage tracking
  private usageTracking: Map<string, ClientUsageMetrics> = new Map();

  // Provider-specific configurations
  private providerConfigs = {
    openai: {
      baseURL: 'https://api.openai.com/v1',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4-vision-preview'],
      pricing: {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
        'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
      },
    },
    anthropic: {
      baseURL: 'https://api.anthropic.com',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      pricing: {
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      },
    },
    azure_openai: {
      models: ['gpt-4', 'gpt-35-turbo', 'gpt-4-vision'],
      pricing: 'variable', // Azure pricing varies by region and deployment
    },
  };

  constructor() {
    this.logger = new Logger('ClientAIIntegrationService');

    // Initialize Supabase for secure API key storage
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Initialize background processes
    this.initializeBackgroundProcesses();
  }

  /**
   * Execute client AI request using supplier's own API keys
   */
  async executeClientRequest(
    request: ClientAIRequest,
    clientConfig: ClientAIConfig,
  ): Promise<ClientAIResponse> {
    const startTime = Date.now();
    const requestId = request.id;

    try {
      this.logger.info(`Processing client AI request`, {
        requestId,
        supplierId: request.supplierId,
        provider: clientConfig.provider,
        type: request.requestType,
      });

      // Validate client configuration
      if (!clientConfig.validated || this.needsRevalidation(clientConfig)) {
        const validationResult = await this.validateClientProvider(
          clientConfig.provider,
          clientConfig.apiKey,
        );

        if (!validationResult.valid) {
          throw new Error(
            `Client provider validation failed: ${validationResult.error}`,
          );
        }

        // Update validation status
        clientConfig.validated = true;
        clientConfig.lastValidation = new Date();
        await this.updateClientConfig(request.supplierId, clientConfig);
      }

      // Get or create provider client
      const providerClient = await this.getProviderClient(clientConfig);

      // Execute the AI request
      const aiResponse = await this.executeProviderRequest(
        providerClient,
        request,
        clientConfig,
      );

      // Calculate cost based on provider pricing
      const cost = this.calculateProviderCost(
        clientConfig.provider,
        aiResponse.model || clientConfig.model || 'gpt-4',
        aiResponse.usage,
      );

      // Update usage tracking
      await this.updateClientUsageTracking(
        request.supplierId,
        clientConfig.provider,
        aiResponse.usage,
        cost,
      );

      // Prepare response
      const response: ClientAIResponse = {
        success: true,
        data: aiResponse.data,
        usage: aiResponse.usage,
        cost,
        processingTime: Date.now() - startTime,
        provider: clientConfig.provider,
        metadata: {
          model: aiResponse.model,
          direct_billing: clientConfig.billingInfo?.directBilling,
          wedding_day: request.isWeddingDay,
        },
      };

      this.logger.info(`Client AI request completed successfully`, {
        requestId,
        tokensUsed: aiResponse.usage?.total_tokens,
        cost,
        processingTime: response.processingTime,
      });

      return response;
    } catch (error) {
      this.logger.error(`Client AI request failed`, {
        requestId,
        error: error.message,
        supplierId: request.supplierId,
        provider: clientConfig.provider,
      });

      return {
        success: false,
        error: error.message,
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: clientConfig.provider,
        metadata: {
          failure_reason: error.message,
          provider: clientConfig.provider,
        },
      };
    }
  }

  /**
   * Validate client provider configuration and API key
   */
  async validateClientProvider(
    provider: string,
    apiKey: string,
  ): Promise<ProviderValidationResult> {
    try {
      this.logger.info(`Validating client provider`, { provider });

      switch (provider) {
        case 'openai':
          return await this.validateOpenAI(apiKey);

        case 'anthropic':
          return await this.validateAnthropic(apiKey);

        case 'azure_openai':
          return await this.validateAzureOpenAI(apiKey);

        default:
          return {
            valid: false,
            error: `Unsupported provider: ${provider}`,
          };
      }
    } catch (error) {
      this.logger.error(`Provider validation failed`, {
        provider,
        error: error.message,
      });

      return {
        valid: false,
        error: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Switch supplier from one client provider to another
   */
  async switchProvider(
    supplierId: string,
    fromProvider: string,
    toProvider: string,
    newConfig: ClientAIConfig,
  ): Promise<any> {
    try {
      this.logger.info(`Switching provider for supplier`, {
        supplierId,
        fromProvider,
        toProvider,
      });

      // Validate new provider first
      const validationResult = await this.validateClientProvider(
        newConfig.provider,
        newConfig.apiKey,
      );

      if (!validationResult.valid) {
        throw new Error(
          `New provider validation failed: ${validationResult.error}`,
        );
      }

      // Store new configuration securely
      await this.storeClientConfig(supplierId, newConfig);

      // Clean up old provider client from cache
      const oldCacheKey = `${supplierId}_${fromProvider}`;
      this.clientCache.delete(oldCacheKey);

      // Initialize new provider client
      await this.getProviderClient(newConfig);

      this.logger.info(`Provider switch completed`, {
        supplierId,
        newProvider: toProvider,
      });

      return {
        success: true,
        fromProvider,
        toProvider,
        switchedAt: new Date(),
        providerInfo: validationResult.providerInfo,
      };
    } catch (error) {
      this.logger.error(`Provider switch failed`, {
        supplierId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        fromProvider,
        toProvider,
      };
    }
  }

  // Private validation methods

  private async validateOpenAI(
    apiKey: string,
  ): Promise<ProviderValidationResult> {
    try {
      const client = new OpenAI({ apiKey });

      // Test API key with a minimal request
      const models = await client.models.list();

      // Get organization info if available
      let organizationInfo;
      try {
        // Note: OpenAI doesn't have a direct organization endpoint
        // This is a placeholder for organization validation
        organizationInfo = { name: 'OpenAI Account' };
      } catch (orgError) {
        // Organization info not critical for validation
      }

      return {
        valid: true,
        providerInfo: {
          organization: organizationInfo?.name,
          models: models.data?.map((m) => m.id) || [],
          limits: 'Available via API',
        },
      };
    } catch (error) {
      let errorMessage = 'Invalid API key or access denied';

      if (error.status === 401) {
        errorMessage = 'Invalid API key';
      } else if (error.status === 429) {
        errorMessage =
          'Rate limit exceeded - API key is valid but currently throttled';
      } else if (error.status === 403) {
        errorMessage = 'API key valid but lacks necessary permissions';
      }

      return {
        valid: error.status !== 401, // Consider rate-limited keys as valid
        error: errorMessage,
      };
    }
  }

  private async validateAnthropic(
    apiKey: string,
  ): Promise<ProviderValidationResult> {
    try {
      // Anthropic validation would require their SDK
      // This is a placeholder implementation
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      if (response.status === 200 || response.status === 429) {
        return {
          valid: true,
          providerInfo: {
            models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
            organization: 'Anthropic Account',
          },
        };
      }

      return {
        valid: false,
        error: `Anthropic API validation failed: ${response.status}`,
      };
    } catch (error) {
      return {
        valid: false,
        error: `Anthropic validation error: ${error.message}`,
      };
    }
  }

  private async validateAzureOpenAI(
    apiKey: string,
  ): Promise<ProviderValidationResult> {
    // Azure OpenAI validation would require endpoint and deployment info
    // This is a placeholder - actual implementation would need more config
    return {
      valid: false,
      error: 'Azure OpenAI validation requires endpoint configuration',
    };
  }

  // Private helper methods

  private async getProviderClient(config: ClientAIConfig): Promise<any> {
    const cacheKey = `${config.provider}_${config.apiKey.slice(-8)}`;

    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey);
    }

    let client;

    switch (config.provider) {
      case 'openai':
        client = new OpenAI({
          apiKey: config.apiKey,
          organization: config.organizationId,
        });
        break;

      case 'anthropic':
        // Would use Anthropic SDK here
        client = {
          provider: 'anthropic',
          apiKey: config.apiKey,
          baseURL: 'https://api.anthropic.com',
        };
        break;

      case 'azure_openai':
        client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.endpoint,
          defaultQuery: {
            'api-version': config.apiVersion || '2024-02-15-preview',
          },
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    this.clientCache.set(cacheKey, client);
    return client;
  }

  private async executeProviderRequest(
    client: any,
    request: ClientAIRequest,
    config: ClientAIConfig,
  ): Promise<any> {
    const { requestType, payload } = request;

    switch (config.provider) {
      case 'openai':
        return await this.executeOpenAIRequest(
          client,
          requestType,
          payload,
          config,
        );

      case 'anthropic':
        return await this.executeAnthropicRequest(
          client,
          requestType,
          payload,
          config,
        );

      case 'azure_openai':
        return await this.executeAzureOpenAIRequest(
          client,
          requestType,
          payload,
          config,
        );

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  private async executeOpenAIRequest(
    client: OpenAI,
    requestType: string,
    payload: any,
    config: ClientAIConfig,
  ): Promise<any> {
    switch (requestType) {
      case 'email_template':
      case 'text_completion':
      case 'wedding_content':
        const completion = await client.chat.completions.create({
          model: config.model || 'gpt-4',
          messages: payload.messages || [
            { role: 'user', content: payload.prompt },
          ],
          max_tokens: config.maxTokens || payload.max_tokens || 1000,
          temperature: config.temperature || payload.temperature || 0.7,
          response_format: payload.response_format,
        });

        return {
          data:
            requestType === 'email_template' &&
            completion.choices[0].message.content
              ? this.parseJSONResponse(completion.choices[0].message.content)
              : completion.choices[0].message.content,
          usage: completion.usage,
          model: completion.model,
        };

      case 'image_analysis':
        const vision = await client.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: payload.prompt },
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
          max_tokens: config.maxTokens || 2000,
          temperature: 0.3,
        });

        return {
          data: this.parseJSONResponse(vision.choices[0].message.content || ''),
          usage: vision.usage,
          model: vision.model,
        };

      case 'embedding':
        const embedding = await client.embeddings.create({
          model: 'text-embedding-3-small',
          input: payload.text,
        });

        return {
          data: embedding.data[0].embedding,
          usage: embedding.usage,
          model: 'text-embedding-3-small',
        };

      default:
        throw new Error(`Unsupported request type: ${requestType}`);
    }
  }

  private async executeAnthropicRequest(
    client: any,
    requestType: string,
    payload: any,
    config: ClientAIConfig,
  ): Promise<any> {
    // Anthropic implementation would use their SDK
    // This is a placeholder
    throw new Error('Anthropic integration not yet implemented');
  }

  private async executeAzureOpenAIRequest(
    client: OpenAI,
    requestType: string,
    payload: any,
    config: ClientAIConfig,
  ): Promise<any> {
    // Azure OpenAI uses OpenAI SDK but with different endpoint
    return await this.executeOpenAIRequest(
      client,
      requestType,
      payload,
      config,
    );
  }

  private calculateProviderCost(
    provider: string,
    model: string,
    usage: any,
  ): number {
    if (
      !usage ||
      !this.providerConfigs[provider as keyof typeof this.providerConfigs]
    ) {
      return 0;
    }

    const providerConfig =
      this.providerConfigs[provider as keyof typeof this.providerConfigs];

    if (
      provider === 'azure_openai' ||
      typeof providerConfig.pricing === 'string'
    ) {
      // Azure pricing varies - would need to implement based on deployment
      return 0;
    }

    const pricing = (providerConfig.pricing as any)[model];
    if (!pricing) {
      return 0;
    }

    const inputCost = ((usage.prompt_tokens || 0) * pricing.input) / 1000;
    const outputCost = ((usage.completion_tokens || 0) * pricing.output) / 1000;

    return inputCost + outputCost;
  }

  private parseJSONResponse(content: string): any {
    try {
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

  private needsRevalidation(config: ClientAIConfig): boolean {
    const validationAge = Date.now() - config.lastValidation.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    return validationAge > maxAge;
  }

  private async updateClientConfig(
    supplierId: string,
    config: ClientAIConfig,
  ): Promise<void> {
    try {
      const encryptedConfig = {
        ...config,
        apiKey: await encrypt(config.apiKey),
      };

      const { error } = await this.supabase.from('supplier_ai_configs').upsert({
        supplier_id: supplierId,
        provider: config.provider,
        config: encryptedConfig,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to update client config`, {
        supplierId,
        error: error.message,
      });
      throw error;
    }
  }

  private async storeClientConfig(
    supplierId: string,
    config: ClientAIConfig,
  ): Promise<void> {
    await this.updateClientConfig(supplierId, config);
  }

  private async updateClientUsageTracking(
    supplierId: string,
    provider: string,
    usage: any,
    cost: number,
  ): Promise<void> {
    try {
      const key = `${supplierId}_${provider}`;
      const existing = this.usageTracking.get(key) || {
        supplierId,
        provider,
        tokensUsed: 0,
        requestsCount: 0,
        totalCost: 0,
        billingPeriod: {
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        lastUpdated: new Date(),
      };

      // Update metrics
      existing.tokensUsed += usage?.total_tokens || 0;
      existing.requestsCount += 1;
      existing.totalCost += cost;
      existing.lastUpdated = new Date();

      this.usageTracking.set(key, existing);

      // Persist to database
      const { error } = await this.supabase.from('supplier_ai_usage').upsert({
        supplier_id: supplierId,
        provider,
        tokens_used: existing.tokensUsed,
        requests_count: existing.requestsCount,
        total_cost: existing.totalCost,
        billing_period_start: existing.billingPeriod.start.toISOString(),
        billing_period_end: existing.billingPeriod.end.toISOString(),
        last_updated: existing.lastUpdated.toISOString(),
      });

      if (error) {
        this.logger.error(`Failed to persist usage tracking`, { error });
      }
    } catch (error) {
      this.logger.error(`Usage tracking update failed`, {
        supplierId,
        provider,
        error: error.message,
      });
    }
  }

  private initializeBackgroundProcesses(): void {
    // Clean up client cache periodically
    setInterval(
      () => {
        this.clientCache.clear();
        this.logger.debug('Client cache cleared');
      },
      60 * 60 * 1000,
    ); // Hourly

    // Sync usage tracking to database
    setInterval(
      async () => {
        try {
          for (const [key, metrics] of this.usageTracking) {
            await this.updateClientUsageTracking(
              metrics.supplierId,
              metrics.provider,
              { total_tokens: 0 }, // No additional tokens
              0, // No additional cost
            );
          }
        } catch (error) {
          this.logger.error('Usage sync failed', { error: error.message });
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }
}

// Export types and service
export type {
  ClientAIRequest,
  ClientAIResponse,
  ClientAIConfig,
  ProviderValidationResult,
  ClientUsageMetrics,
};
