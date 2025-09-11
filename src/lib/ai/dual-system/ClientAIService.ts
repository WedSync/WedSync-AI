/**
 * WS-239: Client AI Service - Team B Round 1
 * Handles AI requests using supplier-provided API keys (encrypted storage)
 * Supports multiple AI providers with secure key management
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from '@/lib/logging/Logger';
import OpenAI from 'openai';
import crypto from 'crypto';

export type AIProvider = 'openai' | 'anthropic' | 'google';
export type AIFeatureType =
  | 'photo_analysis'
  | 'content_generation'
  | 'email_templates'
  | 'chat_responses'
  | 'document_analysis'
  | 'wedding_planning'
  | 'vendor_matching'
  | 'budget_optimization';

export interface ClientAIRequest {
  featureType: AIFeatureType;
  data: any;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

export interface ClientAIResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokensInput: number;
  tokensOutput: number;
  costPounds: number;
  model: string;
  provider: AIProvider;
}

export interface APIKeyValidationResult {
  valid: boolean;
  provider: AIProvider;
  error?: string;
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  estimatedMonthlyCost?: number;
}

/**
 * Client AI Service for managing supplier-provided API keys
 */
export class ClientAIService {
  private logger: Logger;
  private supabase;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly ENCRYPTION_KEY: Buffer;

  // Cached client instances (in memory only, never persisted)
  private clientCache = new Map<
    string,
    { client: any; provider: AIProvider; expires: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.logger = new Logger('ClientAIService');
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Initialize encryption key from environment
    if (!process.env.AI_ENCRYPTION_KEY) {
      throw new Error('AI_ENCRYPTION_KEY environment variable is required');
    }
    this.ENCRYPTION_KEY = Buffer.from(process.env.AI_ENCRYPTION_KEY, 'hex');
  }

  /**
   * Execute AI request using supplier's API key
   */
  async executeRequest(
    supplierId: string,
    featureType: AIFeatureType,
    data: any,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    } = {},
  ): Promise<ClientAIResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Executing client AI request', {
        supplierId,
        featureType,
        options,
      });

      // Get client AI configuration and API key
      const config = await this.getSupplierClientConfig(supplierId);
      if (!config) {
        throw new Error('Client AI not configured for supplier');
      }

      // Get or create AI client instance
      const client = await this.getAIClient(
        supplierId,
        config.provider,
        config.apiKey,
      );

      // Execute request based on provider
      let response: ClientAIResponse;
      switch (config.provider) {
        case 'openai':
          response = await this.executeOpenAIRequest(
            client,
            featureType,
            data,
            options,
          );
          break;
        case 'anthropic':
          response = await this.executeAnthropicRequest(
            client,
            featureType,
            data,
            options,
          );
          break;
        case 'google':
          response = await this.executeGoogleRequest(
            client,
            featureType,
            data,
            options,
          );
          break;
        default:
          throw new Error(`Unsupported AI provider: ${config.provider}`);
      }

      response.provider = config.provider;

      this.logger.info('Client AI request completed', {
        supplierId,
        featureType,
        provider: config.provider,
        tokensUsed: response.tokensInput + response.tokensOutput,
        costPounds: response.costPounds,
        processingTime: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      this.logger.error('Client AI request failed', {
        supplierId,
        featureType,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        tokensInput: 0,
        tokensOutput: 0,
        costPounds: 0,
        model: options.model || 'unknown',
        provider: 'openai', // Default for error tracking
      };
    }
  }

  /**
   * Validate API key before storing
   */
  async validateAPIKey(
    apiKey: string,
    provider: AIProvider,
  ): Promise<APIKeyValidationResult> {
    try {
      this.logger.info('Validating API key', { provider });

      switch (provider) {
        case 'openai':
          return await this.validateOpenAIKey(apiKey);
        case 'anthropic':
          return await this.validateAnthropicKey(apiKey);
        case 'google':
          return await this.validateGoogleKey(apiKey);
        default:
          return {
            valid: false,
            provider,
            error: `Unsupported provider: ${provider}`,
          };
      }
    } catch (error) {
      this.logger.error('API key validation failed', { provider, error });
      return {
        valid: false,
        provider,
        error: error.message,
      };
    }
  }

  /**
   * Store encrypted API key for supplier
   */
  async storeAPIKey(
    supplierId: string,
    apiKey: string,
    provider: AIProvider,
    monthlyBudget: number = 50.0,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate key first
      const validation = await this.validateAPIKey(apiKey, provider);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Encrypt API key
      const { encrypted, iv } = this.encryptAPIKey(apiKey);

      // Store in database
      const { error } = await this.supabase
        .from('ai_feature_config')
        .update({
          client_api_enabled: true,
          client_api_provider: provider,
          client_api_key_encrypted: encrypted,
          client_api_key_iv: iv,
          client_monthly_budget_pounds: monthlyBudget,
          updated_at: new Date().toISOString(),
        })
        .eq('supplier_id', supplierId);

      if (error) {
        this.logger.error('Failed to store API key', { supplierId, error });
        return { success: false, error: 'Failed to store API key' };
      }

      // Clear cache for this supplier
      this.clientCache.delete(supplierId);

      // Log key storage (never log the actual key)
      this.logger.info('API key stored successfully', {
        supplierId,
        provider,
        keyLength: apiKey.length,
        monthlyBudget,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('API key storage failed', { supplierId, error });
      return { success: false, error: error.message };
    }
  }

  /**
   * Rotate API key for supplier (zero-downtime rotation)
   */
  async rotateAPIKey(
    supplierId: string,
    newAPIKey: string,
    rotatedBy: string,
    reason: string = 'Scheduled rotation',
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getSupplierClientConfig(supplierId);
      if (!config) {
        return { success: false, error: 'Client AI not configured' };
      }

      // Validate new key
      const validation = await this.validateAPIKey(newAPIKey, config.provider);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Create fingerprints for audit trail
      const oldKeyFingerprint = this.createKeyFingerprint(config.apiKey);
      const newKeyFingerprint = this.createKeyFingerprint(newAPIKey);

      // Encrypt new key
      const { encrypted, iv } = this.encryptAPIKey(newAPIKey);

      // Update database with new key
      const { error: updateError } = await this.supabase
        .from('ai_feature_config')
        .update({
          client_api_key_encrypted: encrypted,
          client_api_key_iv: iv,
          updated_at: new Date().toISOString(),
        })
        .eq('supplier_id', supplierId);

      if (updateError) {
        throw updateError;
      }

      // Log rotation in audit trail
      await this.supabase.from('ai_key_rotation_log').insert({
        supplier_id: supplierId,
        rotation_type: 'manual',
        old_key_fingerprint: oldKeyFingerprint,
        new_key_fingerprint: newKeyFingerprint,
        rotation_reason: reason,
        rotated_by: rotatedBy,
        success: true,
      });

      // Clear cache
      this.clientCache.delete(supplierId);

      this.logger.info('API key rotated successfully', {
        supplierId,
        rotatedBy,
        reason,
      });

      return { success: true };
    } catch (error) {
      // Log failed rotation
      await this.supabase.from('ai_key_rotation_log').insert({
        supplier_id: supplierId,
        rotation_type: 'manual',
        rotation_reason: reason,
        rotated_by: rotatedBy,
        success: false,
        error_message: error.message,
      });

      this.logger.error('API key rotation failed', { supplierId, error });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get health status of client AI service
   */
  async checkHealth(supplierId: string): Promise<{
    healthy: boolean;
    provider?: AIProvider;
    latency?: number;
    error?: string;
    lastCheck: Date;
  }> {
    try {
      const startTime = Date.now();

      const config = await this.getSupplierClientConfig(supplierId);
      if (!config) {
        return {
          healthy: false,
          error: 'Client AI not configured',
          lastCheck: new Date(),
        };
      }

      const client = await this.getAIClient(
        supplierId,
        config.provider,
        config.apiKey,
      );

      // Simple health check based on provider
      let healthy = false;
      switch (config.provider) {
        case 'openai':
          const openaiClient = client as OpenAI;
          const models = await openaiClient.models.list();
          healthy = models.data.length > 0;
          break;

        // Add other providers as needed
        default:
          healthy = true; // Assume healthy if we got this far
      }

      const latency = Date.now() - startTime;

      // Update health status in database
      await this.supabase
        .from('ai_feature_config')
        .update({
          client_api_health_status: healthy,
          last_health_check: new Date().toISOString(),
        })
        .eq('supplier_id', supplierId);

      return {
        healthy,
        provider: config.provider,
        latency,
        lastCheck: new Date(),
      };
    } catch (error) {
      // Update health status as unhealthy
      await this.supabase
        .from('ai_feature_config')
        .update({
          client_api_health_status: false,
          last_health_check: new Date().toISOString(),
        })
        .eq('supplier_id', supplierId);

      return {
        healthy: false,
        error: error.message,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Private helper methods
   */
  private async getSupplierClientConfig(supplierId: string): Promise<{
    provider: AIProvider;
    apiKey: string;
    enabled: boolean;
  } | null> {
    const { data, error } = await this.supabase
      .from('ai_feature_config')
      .select(
        'client_api_enabled, client_api_provider, client_api_key_encrypted, client_api_key_iv',
      )
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data || !data.client_api_enabled) {
      return null;
    }

    const apiKey = this.decryptAPIKey(
      data.client_api_key_encrypted,
      data.client_api_key_iv,
    );

    return {
      provider: data.client_api_provider,
      apiKey,
      enabled: data.client_api_enabled,
    };
  }

  private async getAIClient(
    supplierId: string,
    provider: AIProvider,
    apiKey: string,
  ): Promise<any> {
    const cacheKey = `${supplierId}-${provider}`;
    const cached = this.clientCache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.client;
    }

    let client: any;
    switch (provider) {
      case 'openai':
        client = new OpenAI({ apiKey });
        break;
      case 'anthropic':
        // Would implement Anthropic client here
        throw new Error('Anthropic provider not yet implemented');
      case 'google':
        // Would implement Google AI client here
        throw new Error('Google provider not yet implemented');
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Cache the client (but not the API key)
    this.clientCache.set(cacheKey, {
      client,
      provider,
      expires: Date.now() + this.CACHE_TTL,
    });

    return client;
  }

  private async executeOpenAIRequest(
    client: OpenAI,
    featureType: AIFeatureType,
    data: any,
    options: any,
  ): Promise<ClientAIResponse> {
    const prompt = this.buildPromptForFeature(featureType, data);

    const response = await client.chat.completions.create({
      model: options.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional AI assistant for wedding industry suppliers. Provide helpful, accurate, and industry-specific responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    });

    const usage = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    const costPounds = this.calculateOpenAICost(
      usage.prompt_tokens,
      usage.completion_tokens,
      options.model || 'gpt-4',
    );

    return {
      success: true,
      data: this.parseAIResponse(
        featureType,
        response.choices[0].message.content || '',
      ),
      tokensInput: usage.prompt_tokens,
      tokensOutput: usage.completion_tokens,
      costPounds,
      model: response.model,
      provider: 'openai',
    };
  }

  private async executeAnthropicRequest(
    client: any,
    featureType: AIFeatureType,
    data: any,
    options: any,
  ): Promise<ClientAIResponse> {
    // Would implement Anthropic API calls here
    throw new Error('Anthropic provider not yet implemented');
  }

  private async executeGoogleRequest(
    client: any,
    featureType: AIFeatureType,
    data: any,
    options: any,
  ): Promise<ClientAIResponse> {
    // Would implement Google AI API calls here
    throw new Error('Google provider not yet implemented');
  }

  private async validateOpenAIKey(
    apiKey: string,
  ): Promise<APIKeyValidationResult> {
    try {
      const client = new OpenAI({ apiKey });
      const models = await client.models.list();

      // Check if we can access GPT models
      const hasGPT4 = models.data.some((model) => model.id.includes('gpt-4'));

      return {
        valid: true,
        provider: 'openai',
        rateLimits: {
          requestsPerMinute: hasGPT4 ? 500 : 100, // Estimated based on typical limits
          tokensPerMinute: hasGPT4 ? 40000 : 10000,
        },
        estimatedMonthlyCost: 0, // Would calculate based on typical usage
      };
    } catch (error) {
      return {
        valid: false,
        provider: 'openai',
        error: error.message.includes('Incorrect API key')
          ? 'Invalid API key'
          : 'API key validation failed',
      };
    }
  }

  private async validateAnthropicKey(
    apiKey: string,
  ): Promise<APIKeyValidationResult> {
    // Would implement Anthropic key validation
    return {
      valid: false,
      provider: 'anthropic',
      error: 'Not yet implemented',
    };
  }

  private async validateGoogleKey(
    apiKey: string,
  ): Promise<APIKeyValidationResult> {
    // Would implement Google AI key validation
    return { valid: false, provider: 'google', error: 'Not yet implemented' };
  }

  private encryptAPIKey(apiKey: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(
      this.ENCRYPTION_ALGORITHM,
      this.ENCRYPTION_KEY,
    );
    cipher.setAAD(Buffer.from('ai-api-key'));

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted + ':' + authTag.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  private decryptAPIKey(encryptedData: string, ivHex: string): string {
    const [encrypted, authTagHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(
      this.ENCRYPTION_ALGORITHM,
      this.ENCRYPTION_KEY,
    );
    decipher.setAAD(Buffer.from('ai-api-key'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private createKeyFingerprint(apiKey: string): string {
    return crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex')
      .substring(0, 64);
  }

  private calculateOpenAICost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number {
    // OpenAI pricing (as of 2025) - in pounds
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.000023, output: 0.000068 }, // £0.000023 per input token, £0.000068 per output
      'gpt-4-turbo': { input: 0.000008, output: 0.000023 },
      'gpt-3.5-turbo': { input: 0.0000004, output: 0.0000012 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4']; // Default to GPT-4 pricing
    return (
      inputTokens * modelPricing.input + outputTokens * modelPricing.output
    );
  }

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
}

export const clientAIService = new ClientAIService();
