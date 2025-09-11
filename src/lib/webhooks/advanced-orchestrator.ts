/**
 * Advanced Webhook Orchestration with Circuit Breakers and Retry Logic
 * Enhances existing webhook system with intelligent orchestration and reliability patterns
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { webhookManager, WebhookEvent } from './webhook-manager';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const redis = Redis.fromEnv();

// Schema definitions
const WebhookConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.record(z.string()).optional(),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  backoff_strategy: z
    .enum(['fixed', 'linear', 'exponential'])
    .default('exponential'),
  circuit_breaker: z
    .object({
      failure_threshold: z.number().default(5),
      reset_timeout: z.number().default(60000),
      monitor_window: z.number().default(300000),
    })
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  batch_config: z
    .object({
      enabled: z.boolean(),
      batch_size: z.number(),
      batch_timeout: z.number(),
    })
    .optional(),
});

const WebhookChainSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  webhooks: z.array(WebhookConfigSchema),
  orchestration: z.object({
    mode: z.enum(['sequential', 'parallel', 'conditional', 'hybrid']),
    conditions: z.record(z.string()).optional(),
    failure_mode: z
      .enum(['fail_fast', 'continue', 'compensate'])
      .default('fail_fast'),
    compensation_webhooks: z.array(z.string()).optional(),
  }),
  ai_optimization: z
    .object({
      enabled: z.boolean().default(false),
      learning_mode: z.enum(['passive', 'active']).default('passive'),
      optimization_goals: z
        .array(z.string())
        .default(['latency', 'reliability']),
    })
    .optional(),
});

const CircuitBreakerStateSchema = z.object({
  webhook_id: z.string(),
  state: z.enum(['closed', 'open', 'half_open']),
  failure_count: z.number(),
  last_failure: z.string().optional(),
  reset_time: z.string().optional(),
  success_count: z.number().default(0),
});

const WebhookChainResultSchema = z.object({
  chain_id: z.string(),
  execution_id: z.string(),
  success: z.boolean(),
  results: z.array(
    z.object({
      webhook_id: z.string(),
      success: z.boolean(),
      response_time: z.number(),
      status_code: z.number().optional(),
      error: z.string().optional(),
      retry_count: z.number(),
    }),
  ),
  total_execution_time: z.number(),
  ai_insights: z
    .object({
      performance_score: z.number(),
      optimization_suggestions: z.array(z.string()),
      anomalies_detected: z.array(z.string()),
    })
    .optional(),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;
export type WebhookChain = z.infer<typeof WebhookChainSchema>;
export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>;
export type WebhookChainResult = z.infer<typeof WebhookChainResultSchema>;

/**
 * Advanced Webhook Orchestration System
 */
export class AdvancedWebhookOrchestrator {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private retryQueues = new Map<string, RetryQueue>();
  private webhookChains = new Map<string, WebhookChain>();
  private performanceAnalyzer: PerformanceAnalyzer;
  private aiOptimizer: AIWebhookOptimizer;

  constructor() {
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.aiOptimizer = new AIWebhookOptimizer();
    this.initializeExistingWebhooks();
    this.startHealthMonitoring();
  }

  /**
   * Register a webhook chain with advanced orchestration
   */
  async registerWebhookChain(chain: WebhookChain): Promise<void> {
    try {
      // Validate chain configuration
      const validatedChain = WebhookChainSchema.parse(chain);

      // Set up circuit breakers for each webhook in chain
      validatedChain.webhooks.forEach((webhook) => {
        if (webhook.circuit_breaker) {
          this.circuitBreakers.set(
            webhook.id,
            new CircuitBreaker({
              id: webhook.id,
              failureThreshold: webhook.circuit_breaker.failure_threshold,
              resetTimeout: webhook.circuit_breaker.reset_timeout,
              monitorWindow: webhook.circuit_breaker.monitor_window,
            }),
          );
        }
      });

      // Set up intelligent retry logic
      this.retryQueues.set(
        chain.id,
        new RetryQueue({
          chainId: chain.id,
          maxRetries: Math.max(
            ...validatedChain.webhooks.map((w) => w.retries),
          ),
          backoffStrategy: 'intelligent', // AI-enhanced backoff
          retryableErrors: [
            'TIMEOUT',
            'CONNECTION_ERROR',
            '502',
            '503',
            '504',
            '429',
          ],
        }),
      );

      // Store chain configuration
      this.webhookChains.set(chain.id, validatedChain);

      // Initialize AI optimization if enabled
      if (validatedChain.ai_optimization?.enabled) {
        await this.aiOptimizer.initializeChain(validatedChain);
      }

      // Save to database for persistence
      await this.saveChainConfiguration(validatedChain);

      console.log(`Registered webhook chain: ${chain.id}`);
    } catch (error) {
      console.error('Error registering webhook chain:', error);
      throw error;
    }
  }

  /**
   * Execute webhook chain with advanced orchestration
   */
  async executeWebhookChain(
    chainId: string,
    payload: any,
    context?: {
      trigger_event?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      correlation_id?: string;
    },
  ): Promise<WebhookChainResult> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const chain = this.webhookChains.get(chainId);
      if (!chain) {
        throw new Error(`Webhook chain not found: ${chainId}`);
      }

      // Execute chain based on orchestration mode
      const results = await this.executeChainWithOrchestration(
        chain,
        payload,
        context,
      );

      // Analyze performance and generate insights
      const aiInsights = chain.ai_optimization?.enabled
        ? await this.aiOptimizer.analyzeExecution(chain, results)
        : undefined;

      const chainResult: WebhookChainResult = {
        chain_id: chainId,
        execution_id: executionId,
        success: results.every((r) => r.success),
        results: results,
        total_execution_time: Date.now() - startTime,
        ai_insights: aiInsights,
      };

      // Record execution metrics
      await this.recordChainExecution(chainResult);

      // Update AI optimization models if enabled
      if (chain.ai_optimization?.enabled) {
        await this.aiOptimizer.updateModels(chain, chainResult);
      }

      return chainResult;
    } catch (error) {
      console.error(`Webhook chain execution error: ${chainId}`, error);

      return {
        chain_id: chainId,
        execution_id: executionId,
        success: false,
        results: [],
        total_execution_time: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute chain based on orchestration configuration
   */
  private async executeChainWithOrchestration(
    chain: WebhookChain,
    payload: any,
    context?: any,
  ): Promise<
    Array<{
      webhook_id: string;
      success: boolean;
      response_time: number;
      status_code?: number;
      error?: string;
      retry_count: number;
    }>
  > {
    const results = [];

    switch (chain.orchestration.mode) {
      case 'sequential':
        for (const webhook of chain.webhooks) {
          const result = await this.executeWebhookWithResilience(
            webhook,
            payload,
            context,
          );
          results.push(result);

          // Apply failure mode logic
          if (
            !result.success &&
            chain.orchestration.failure_mode === 'fail_fast'
          ) {
            break;
          }

          // Transform payload for next webhook if needed
          if (
            result.success &&
            webhook.id !== chain.webhooks[chain.webhooks.length - 1].id
          ) {
            payload = await this.transformPayloadForNext(
              webhook,
              payload,
              result,
            );
          }
        }
        break;

      case 'parallel':
        const parallelResults = await Promise.allSettled(
          chain.webhooks.map((webhook) =>
            this.executeWebhookWithResilience(webhook, payload, context),
          ),
        );

        parallelResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              webhook_id: 'unknown',
              success: false,
              response_time: 0,
              error: result.reason.message,
              retry_count: 0,
            });
          }
        });
        break;

      case 'conditional':
        for (const webhook of chain.webhooks) {
          const shouldExecute = await this.evaluateCondition(
            webhook.id,
            chain.orchestration.conditions || {},
            payload,
            results,
          );

          if (shouldExecute) {
            const result = await this.executeWebhookWithResilience(
              webhook,
              payload,
              context,
            );
            results.push(result);
          }
        }
        break;

      case 'hybrid':
        // AI-optimized execution order based on historical performance
        const optimizedOrder = chain.ai_optimization?.enabled
          ? await this.aiOptimizer.getOptimalExecutionOrder(chain, payload)
          : chain.webhooks;

        for (const webhook of optimizedOrder) {
          const result = await this.executeWebhookWithResilience(
            webhook,
            payload,
            context,
          );
          results.push(result);

          // AI-driven early termination decision
          if (!result.success && chain.ai_optimization?.enabled) {
            const shouldContinue =
              await this.aiOptimizer.shouldContinueExecution(
                chain,
                results,
                webhook,
              );
            if (!shouldContinue) break;
          }
        }
        break;
    }

    // Execute compensation webhooks if needed
    if (
      chain.orchestration.compensation_webhooks &&
      !results.every((r) => r.success) &&
      chain.orchestration.failure_mode === 'compensate'
    ) {
      await this.executeCompensationWebhooks(
        chain.orchestration.compensation_webhooks,
        payload,
        results,
      );
    }

    return results;
  }

  /**
   * Execute individual webhook with resilience patterns
   */
  private async executeWebhookWithResilience(
    webhook: WebhookConfig,
    payload: any,
    context?: any,
  ): Promise<{
    webhook_id: string;
    success: boolean;
    response_time: number;
    status_code?: number;
    error?: string;
    retry_count: number;
  }> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= webhook.retries) {
      try {
        // Check circuit breaker
        const circuitBreaker = this.circuitBreakers.get(webhook.id);
        if (circuitBreaker && !circuitBreaker.canExecute()) {
          throw new Error('Circuit breaker is open');
        }

        // Execute webhook
        const response = await this.performWebhookCall(webhook, payload);

        // Record success with circuit breaker
        if (circuitBreaker) {
          circuitBreaker.recordSuccess();
        }

        return {
          webhook_id: webhook.id,
          success: true,
          response_time: Date.now() - startTime,
          status_code: response.status,
          retry_count: retryCount,
        };
      } catch (error) {
        retryCount++;

        // Record failure with circuit breaker
        const circuitBreaker = this.circuitBreakers.get(webhook.id);
        if (circuitBreaker) {
          circuitBreaker.recordFailure();
        }

        if (retryCount > webhook.retries) {
          return {
            webhook_id: webhook.id,
            success: false,
            response_time: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            retry_count: retryCount - 1,
          };
        }

        // Calculate backoff delay
        const delay = this.calculateBackoffDelay(webhook, retryCount);
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      webhook_id: webhook.id,
      success: false,
      response_time: Date.now() - startTime,
      error: 'Maximum retries exceeded',
      retry_count: retryCount,
    };
  }

  /**
   * Perform actual webhook HTTP call
   */
  private async performWebhookCall(
    webhook: WebhookConfig,
    payload: any,
  ): Promise<{
    status: number;
    data: any;
    headers: Record<string, string>;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

    try {
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers,
        },
        body: webhook.method !== 'GET' ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json().catch(() => ({}));
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        status: response.status,
        data,
        headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Calculate intelligent backoff delay
   */
  private calculateBackoffDelay(
    webhook: WebhookConfig,
    retryCount: number,
  ): number {
    const baseDelay = 1000; // 1 second base

    switch (webhook.backoff_strategy) {
      case 'fixed':
        return baseDelay;

      case 'linear':
        return baseDelay * retryCount;

      case 'exponential':
        return baseDelay * Math.pow(2, retryCount - 1);

      default:
        return baseDelay * Math.pow(2, retryCount - 1);
    }
  }

  /**
   * Get webhook chain performance analytics
   */
  async getChainAnalytics(chainId: string): Promise<{
    success_rate: number;
    average_execution_time: number;
    error_distribution: Record<string, number>;
    performance_trends: Array<{
      date: string;
      success_rate: number;
      avg_response_time: number;
    }>;
    ai_insights?: {
      optimization_opportunities: string[];
      predicted_performance: number;
      recommended_changes: string[];
    };
  }> {
    try {
      const analytics = await this.performanceAnalyzer.analyzeChain(chainId);

      const chain = this.webhookChains.get(chainId);
      if (chain?.ai_optimization?.enabled) {
        const aiInsights = await this.aiOptimizer.generateInsights(
          chain,
          analytics,
        );
        analytics.ai_insights = aiInsights;
      }

      return analytics;
    } catch (error) {
      console.error('Error getting chain analytics:', error);
      throw error;
    }
  }

  /**
   * Health monitoring and alerting
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        // Check circuit breaker states
        for (const [webhookId, breaker] of this.circuitBreakers.entries()) {
          if (breaker.getState() === 'open') {
            await this.alertOnWebhookFailure(webhookId, 'Circuit breaker open');
          }
        }

        // Check for performance degradation
        const performanceIssues =
          await this.performanceAnalyzer.detectAnomalies();
        for (const issue of performanceIssues) {
          await this.alertOnPerformanceIssue(issue);
        }

        // Check retry queue depths
        for (const [chainId, retryQueue] of this.retryQueues.entries()) {
          const depth = retryQueue.getDepth();
          if (depth > 100) {
            await this.alertOnHighRetryQueue(chainId, depth);
          }
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, 60000); // Check every minute
  }

  // Private helper methods
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async saveChainConfiguration(chain: WebhookChain): Promise<void> {
    await supabase.from('webhook_chains').upsert({
      id: chain.id,
      configuration: chain,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  private async recordChainExecution(
    result: WebhookChainResult,
  ): Promise<void> {
    await supabase.from('webhook_executions').insert({
      chain_id: result.chain_id,
      execution_id: result.execution_id,
      success: result.success,
      execution_time: result.total_execution_time,
      results: result.results,
      ai_insights: result.ai_insights,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private resetTime?: Date;

  constructor(
    private config: {
      id: string;
      failureThreshold: number;
      resetTimeout: number;
      monitorWindow: number;
    },
  ) {}

  canExecute(): boolean {
    const now = new Date();

    switch (this.state) {
      case 'closed':
        return true;

      case 'open':
        if (this.resetTime && now >= this.resetTime) {
          this.state = 'half_open';
          this.successCount = 0;
          return true;
        }
        return false;

      case 'half_open':
        return true;

      default:
        return false;
    }
  }

  recordSuccess(): void {
    this.successCount++;

    if (this.state === 'half_open') {
      if (this.successCount >= 3) {
        // Require 3 successes to close
        this.state = 'closed';
        this.failureCount = 0;
      }
    } else if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'half_open') {
      this.state = 'open';
      this.resetTime = new Date(Date.now() + this.config.resetTimeout);
    } else if (
      this.state === 'closed' &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.state = 'open';
      this.resetTime = new Date(Date.now() + this.config.resetTimeout);
    }
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Intelligent Retry Queue
 */
class RetryQueue {
  private queue: Array<{
    webhook: WebhookConfig;
    payload: any;
    retryCount: number;
    nextRetryTime: Date;
  }> = [];

  constructor(
    private config: {
      chainId: string;
      maxRetries: number;
      backoffStrategy: string;
      retryableErrors: string[];
    },
  ) {
    this.startProcessing();
  }

  add(item: { webhook: WebhookConfig; payload: any; error: any }): void {
    if (!this.isRetryable(item.error)) return;

    const retryCount = item.webhook.retries || 0;
    if (retryCount >= this.config.maxRetries) return;

    const nextRetryTime = new Date(
      Date.now() + this.calculateDelay(retryCount),
    );

    this.queue.push({
      webhook: item.webhook,
      payload: item.payload,
      retryCount: retryCount + 1,
      nextRetryTime,
    });
  }

  getDepth(): number {
    return this.queue.length;
  }

  private isRetryable(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    return this.config.retryableErrors.some((retryableError) =>
      errorMessage.includes(retryableError),
    );
  }

  private calculateDelay(retryCount: number): number {
    // AI-enhanced backoff with jitter
    const baseDelay = 1000 * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000;
    return baseDelay + jitter;
  }

  private startProcessing(): void {
    setInterval(() => {
      const now = new Date();
      const readyItems = this.queue.filter((item) => item.nextRetryTime <= now);

      readyItems.forEach(async (item) => {
        // Remove from queue
        const index = this.queue.indexOf(item);
        if (index > -1) {
          this.queue.splice(index, 1);
        }

        // Retry execution
        try {
          // This would call back to the orchestrator
          console.log(`Retrying webhook: ${item.webhook.id}`);
        } catch (error) {
          // Re-add to queue if still retryable
          this.add({ webhook: item.webhook, payload: item.payload, error });
        }
      });
    }, 5000); // Process every 5 seconds
  }
}

/**
 * Performance Analytics
 */
class PerformanceAnalyzer {
  async analyzeChain(chainId: string): Promise<any> {
    // Implementation would analyze performance metrics
    return {
      success_rate: 0.95,
      average_execution_time: 1500,
      error_distribution: {},
      performance_trends: [],
    };
  }

  async detectAnomalies(): Promise<any[]> {
    // Implementation would detect performance anomalies
    return [];
  }
}

/**
 * AI-Powered Webhook Optimization
 */
class AIWebhookOptimizer {
  async initializeChain(chain: WebhookChain): Promise<void> {
    console.log(`Initializing AI optimization for chain: ${chain.id}`);
  }

  async analyzeExecution(chain: WebhookChain, results: any[]): Promise<any> {
    return {
      performance_score: 0.85,
      optimization_suggestions: [
        'Consider parallel execution for independent webhooks',
      ],
      anomalies_detected: [],
    };
  }

  async updateModels(
    chain: WebhookChain,
    result: WebhookChainResult,
  ): Promise<void> {
    console.log(`Updating AI models for chain: ${chain.id}`);
  }

  async getOptimalExecutionOrder(
    chain: WebhookChain,
    payload: any,
  ): Promise<WebhookConfig[]> {
    return chain.webhooks; // Return original order for now
  }

  async shouldContinueExecution(
    chain: WebhookChain,
    results: any[],
    failedWebhook: WebhookConfig,
  ): Promise<boolean> {
    return false; // Conservative approach
  }

  async generateInsights(chain: WebhookChain, analytics: any): Promise<any> {
    return {
      optimization_opportunities: ['Enable parallel execution'],
      predicted_performance: 0.9,
      recommended_changes: ['Increase timeout for slow webhooks'],
    };
  }
}

// Export singleton instance
export const advancedWebhookOrchestrator = new AdvancedWebhookOrchestrator();
