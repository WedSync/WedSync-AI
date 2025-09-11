/**
 * WS-233 API Usage Monitoring - OpenAI Wrapper
 * Team C Integration: Monitored wrapper for OpenAI service
 * Integrates usage tracking with existing OpenAI service
 */

import { OpenAIService, openaiService } from '@/lib/services/openai-service';
import {
  trackOpenAIUsage,
  apiUsageTracker,
} from '@/lib/monitoring/api-usage-tracker';
import { logger } from '@/lib/monitoring/edge-logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Monitored OpenAI Service Wrapper
 * Adds usage tracking, cost monitoring, and rate limiting to OpenAI calls
 */
export class MonitoredOpenAIService extends OpenAIService {
  private organizationId: string;
  private userId?: string;

  constructor(organizationId: string, userId?: string) {
    super();
    this.organizationId = organizationId;
    this.userId = userId;
  }

  /**
   * Monitored image analysis with usage tracking
   */
  async analyzeImage(request: Parameters<OpenAIService['analyzeImage']>[0]) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/chat/completions';
    const method = 'POST';

    try {
      // Pre-flight checks
      const estimatedCost = this.estimateImageAnalysisCost(request);
      const limitCheck = await apiUsageTracker.checkUsageLimits(
        this.organizationId,
        'openai',
        endpoint,
        estimatedCost,
      );

      if (!limitCheck.allowed) {
        const error = new Error(
          `OpenAI usage blocked: ${limitCheck.warnings.join(', ')}`,
        );
        await this.trackFailedRequest(
          endpoint,
          method,
          requestId,
          startTime,
          429,
          error.message,
        );
        throw error;
      }

      // Log warnings
      if (limitCheck.warnings.length > 0) {
        logger.warn('OpenAI usage warnings', {
          organizationId: this.organizationId,
          userId: this.userId,
          warnings: limitCheck.warnings,
          requestId,
        });
      }

      // Execute the actual API call
      const result = await super.analyzeImage(request);
      const duration = Date.now() - startTime;

      // Track successful usage
      await trackOpenAIUsage(
        this.organizationId,
        endpoint,
        method,
        requestId,
        duration,
        200, // Success
        result.usage,
        result.model,
        this.userId,
      );

      logger.info('OpenAI image analysis completed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        model: result.model,
        duration,
        tokensUsed: result.usage.total_tokens,
        processingTime: result.processing_time_ms,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = this.getErrorStatusCode(error);

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        statusCode,
        error.message,
      );

      logger.error('OpenAI image analysis failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        duration,
        error: error.message,
        statusCode,
      });

      throw error;
    }
  }

  /**
   * Monitored text completion with usage tracking
   */
  async generateCompletion(
    prompt: string,
    options: Parameters<OpenAIService['generateCompletion']>[1] = {},
  ) {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/chat/completions';
    const method = 'POST';

    try {
      // Pre-flight checks
      const estimatedCost = this.estimateCompletionCost(prompt, options);
      const limitCheck = await apiUsageTracker.checkUsageLimits(
        this.organizationId,
        'openai',
        endpoint,
        estimatedCost,
      );

      if (!limitCheck.allowed) {
        const error = new Error(
          `OpenAI usage blocked: ${limitCheck.warnings.join(', ')}`,
        );
        await this.trackFailedRequest(
          endpoint,
          method,
          requestId,
          startTime,
          429,
          error.message,
        );
        throw error;
      }

      // Log warnings
      if (limitCheck.warnings.length > 0) {
        logger.warn('OpenAI completion usage warnings', {
          organizationId: this.organizationId,
          userId: this.userId,
          warnings: limitCheck.warnings,
          requestId,
        });
      }

      // Execute the actual API call
      const result = await super.generateCompletion(prompt, options);
      const duration = Date.now() - startTime;

      // Track successful usage
      await trackOpenAIUsage(
        this.organizationId,
        endpoint,
        method,
        requestId,
        duration,
        200,
        result.usage,
        result.model,
        this.userId,
      );

      logger.info('OpenAI completion generated', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        model: result.model,
        duration,
        tokensUsed: result.usage.total_tokens,
        promptLength: prompt.length,
        responseLength: result.text.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = this.getErrorStatusCode(error);

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        statusCode,
        error.message,
      );

      logger.error('OpenAI completion failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        duration,
        error: error.message,
        statusCode,
        promptLength: prompt.length,
      });

      throw error;
    }
  }

  /**
   * Monitored embedding generation with usage tracking
   */
  async generateEmbedding(text: string, model = 'text-embedding-3-small') {
    const requestId = uuidv4();
    const startTime = Date.now();
    const endpoint = '/embeddings';
    const method = 'POST';

    try {
      // Pre-flight checks
      const estimatedCost = this.estimateEmbeddingCost(text, model);
      const limitCheck = await apiUsageTracker.checkUsageLimits(
        this.organizationId,
        'openai',
        endpoint,
        estimatedCost,
      );

      if (!limitCheck.allowed) {
        const error = new Error(
          `OpenAI usage blocked: ${limitCheck.warnings.join(', ')}`,
        );
        await this.trackFailedRequest(
          endpoint,
          method,
          requestId,
          startTime,
          429,
          error.message,
        );
        throw error;
      }

      // Execute the actual API call
      const result = await super.generateEmbedding(text, model);
      const duration = Date.now() - startTime;

      // Track successful usage
      await trackOpenAIUsage(
        this.organizationId,
        endpoint,
        method,
        requestId,
        duration,
        200,
        {
          prompt_tokens: result.usage.prompt_tokens,
          completion_tokens: 0,
          total_tokens: result.usage.total_tokens,
        },
        model,
        this.userId,
      );

      logger.info('OpenAI embedding generated', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        model,
        duration,
        tokensUsed: result.usage.total_tokens,
        textLength: text.length,
        embeddingDimensions: result.embedding.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = this.getErrorStatusCode(error);

      await this.trackFailedRequest(
        endpoint,
        method,
        requestId,
        startTime,
        statusCode,
        error.message,
      );

      logger.error('OpenAI embedding generation failed', {
        organizationId: this.organizationId,
        userId: this.userId,
        requestId,
        duration,
        error: error.message,
        statusCode,
        textLength: text.length,
      });

      throw error;
    }
  }

  /**
   * Get usage analytics for this organization's OpenAI usage
   */
  async getUsageAnalytics(dateRange: { start: Date; end: Date }) {
    return apiUsageTracker.getUsageAnalytics(
      this.organizationId,
      dateRange,
      'openai',
    );
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus() {
    const budgets = await apiUsageTracker.getBudgetStatus(
      this.organizationId,
      'openai',
    );
    return budgets[0] || null;
  }

  // Private helper methods

  private estimateImageAnalysisCost(
    request: Parameters<OpenAIService['analyzeImage']>[0],
  ): number {
    // Estimate based on typical image analysis token usage
    const estimatedInputTokens = 1000; // Typical for image + prompt
    const estimatedOutputTokens = request.maxTokens || 2000;

    // GPT-4 Vision pricing
    return estimatedInputTokens * 0.00003 + estimatedOutputTokens * 0.00006;
  }

  private estimateCompletionCost(prompt: string, options: any): number {
    // Rough token estimation: 1 token ≈ 4 characters
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = options.max_tokens || 1000;

    // GPT-4 pricing by default
    return estimatedInputTokens * 0.00003 + estimatedOutputTokens * 0.00006;
  }

  private estimateEmbeddingCost(text: string, model: string): number {
    const estimatedTokens = Math.ceil(text.length / 4);

    if (model.includes('small')) {
      return estimatedTokens * 0.00000002; // text-embedding-3-small
    }

    return estimatedTokens * 0.00001; // Default embedding pricing
  }

  private getErrorStatusCode(error: any): number {
    if (error.status) return error.status;
    if (error.code === 'rate_limit_exceeded') return 429;
    if (error.code === 'insufficient_quota') return 402;
    if (error.code === 'invalid_api_key') return 401;
    return 500;
  }

  private async trackFailedRequest(
    endpoint: string,
    method: string,
    requestId: string,
    startTime: number,
    statusCode: number,
    errorMessage: string,
  ): Promise<void> {
    const duration = Date.now() - startTime;

    try {
      await trackOpenAIUsage(
        this.organizationId,
        endpoint,
        method,
        requestId,
        duration,
        statusCode,
        undefined, // No usage data for failed requests
        undefined, // No model for failed requests
        this.userId,
      );
    } catch (trackingError) {
      logger.error('Failed to track OpenAI error', {
        organizationId: this.organizationId,
        requestId,
        trackingError: trackingError.message,
        originalError: errorMessage,
      });
    }
  }
}

/**
 * Factory function to create monitored OpenAI service instances
 */
export function createMonitoredOpenAIService(
  organizationId: string,
  userId?: string,
): MonitoredOpenAIService {
  return new MonitoredOpenAIService(organizationId, userId);
}

/**
 * Convenience wrapper that creates a monitored service from existing openaiService
 * This allows existing code to easily upgrade to monitored usage
 */
export function wrapOpenAIServiceWithMonitoring(
  organizationId: string,
  userId?: string,
) {
  const monitoredService = new MonitoredOpenAIService(organizationId, userId);

  return {
    // Pass through all original methods but with monitoring
    analyzeImage: monitoredService.analyzeImage.bind(monitoredService),
    generateCompletion:
      monitoredService.generateCompletion.bind(monitoredService),
    generateEmbedding:
      monitoredService.generateEmbedding.bind(monitoredService),

    // Additional monitoring methods
    getUsageAnalytics:
      monitoredService.getUsageAnalytics.bind(monitoredService),
    getBudgetStatus: monitoredService.getBudgetStatus.bind(monitoredService),
  };
}

// Export for backward compatibility with existing imports
export { openaiService as baseOpenAIService };
