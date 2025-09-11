import OpenAI from 'openai';
import { IntegrationDataManager } from '../database/IntegrationDataManager';
import { Logger } from '../utils/logger';

// Circuit Breaker States
enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

// Error Classification
enum OpenAIErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNKNOWN = 'UNKNOWN',
}

// Configuration interfaces
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrentRequests: number;
  queueTimeout: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface TokenUsageTracking {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // Estimated cost in USD
}

interface OpenAIServiceConfig {
  apiKey: string;
  organization?: string;
  maxTokens: number;
  temperature: number;
  model: string;
  circuitBreaker: CircuitBreakerConfig;
  rateLimit: RateLimitConfig;
  retry: RetryConfig;
  enableLogging: boolean;
  enableMetrics: boolean;
}

interface EmailTemplateRequest {
  vendorType:
    | 'photographer'
    | 'venue'
    | 'florist'
    | 'catering'
    | 'planning'
    | 'other';
  templateType:
    | 'welcome'
    | 'booking_confirmation'
    | 'reminder'
    | 'follow_up'
    | 'custom';
  context: {
    vendorName: string;
    clientName: string;
    weddingDate?: string;
    venueName?: string;
    packageDetails?: string;
    customInstructions?: string;
  };
  tone: 'professional' | 'friendly' | 'formal' | 'casual';
  includeSignature: boolean;
  mergeTags?: Record<string, string>;
}

interface GeneratedTemplate {
  subject: string;
  body: string;
  metadata: {
    generatedAt: Date;
    tokenUsage: TokenUsageTracking;
    processingTime: number;
    model: string;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuitBreakerState: CircuitBreakerState;
  rateLimitRemaining: number;
  tokenBudgetRemaining: number;
  lastError?: string;
  uptime: number;
  errorRate: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private config: CircuitBreakerConfig;
  private logger: Logger;

  constructor(config: CircuitBreakerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldTryReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.logger.info('Circuit breaker moved to HALF_OPEN state');
      } else {
        throw new Error(
          'Circuit breaker is OPEN - service temporarily unavailable',
        );
      }
    }

    if (
      this.state === CircuitBreakerState.HALF_OPEN &&
      this.successCount >= this.config.halfOpenMaxCalls
    ) {
      throw new Error(
        'Circuit breaker is HALF_OPEN - maximum test calls exceeded',
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldTryReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxCalls) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        this.logger.info('Circuit breaker reset to CLOSED state');
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.logger.warn(
        `Circuit breaker OPEN - ${this.failures} failures exceeded threshold`,
      );
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }
}

class RateLimiter {
  private requestTokens: number;
  private tokenBucket: number;
  private lastRefill: number;
  private activeRequests: number = 0;
  private requestQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.requestTokens = config.requestsPerMinute;
    this.tokenBucket = config.tokensPerMinute;
    this.lastRefill = Date.now();
  }

  async acquireRequestPermit(): Promise<void> {
    this.refillBuckets();

    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      await this.waitInQueue();
    }

    if (this.requestTokens <= 0) {
      throw new Error('Rate limit exceeded: too many requests per minute');
    }

    this.requestTokens--;
    this.activeRequests++;
  }

  releaseRequestPermit(): void {
    this.activeRequests--;
    this.processQueue();
  }

  checkTokenBudget(estimatedTokens: number): boolean {
    this.refillBuckets();
    return this.tokenBucket >= estimatedTokens;
  }

  consumeTokens(actualTokens: number): void {
    this.tokenBucket = Math.max(0, this.tokenBucket - actualTokens);
  }

  private refillBuckets(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const minutesPassed = timePassed / 60000;

    if (minutesPassed >= 1) {
      this.requestTokens = Math.min(
        this.config.requestsPerMinute,
        this.requestTokens +
          Math.floor(minutesPassed * this.config.requestsPerMinute),
      );
      this.tokenBucket = Math.min(
        this.config.tokensPerMinute,
        this.tokenBucket +
          Math.floor(minutesPassed * this.config.tokensPerMinute),
      );
      this.lastRefill = now;
    }
  }

  private async waitInQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      const queueItem = {
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.requestQueue.push(queueItem);

      // Set timeout for queue item
      setTimeout(() => {
        const index = this.requestQueue.indexOf(queueItem);
        if (index > -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error('Queue timeout exceeded'));
        }
      }, this.config.queueTimeout);
    });
  }

  private processQueue(): void {
    if (
      this.requestQueue.length > 0 &&
      this.activeRequests < this.config.maxConcurrentRequests
    ) {
      const nextItem = this.requestQueue.shift();
      if (nextItem) {
        nextItem.resolve();
      }
    }
  }

  getRemainingRequests(): number {
    this.refillBuckets();
    return this.requestTokens;
  }

  getRemainingTokens(): number {
    this.refillBuckets();
    return this.tokenBucket;
  }
}

export class OpenAIService {
  private client: OpenAI;
  private config: OpenAIServiceConfig;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private integrationManager: IntegrationDataManager;
  private logger: Logger;
  private startTime: number = Date.now();
  private totalRequests: number = 0;
  private totalErrors: number = 0;
  private totalTokensUsed: number = 0;
  private totalCost: number = 0;

  constructor(config: OpenAIServiceConfig) {
    this.config = config;
    this.logger = new Logger('OpenAIService');

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
    });

    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreaker,
      this.logger,
    );
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.integrationManager = new IntegrationDataManager();

    // Validate configuration
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (this.config.maxTokens > 4096 && this.config.model.includes('gpt-3.5')) {
      this.logger.warn(
        'High token limit set for GPT-3.5 model - consider using GPT-4 for longer responses',
      );
    }
  }

  async generateEmailTemplate(
    request: EmailTemplateRequest,
  ): Promise<GeneratedTemplate> {
    const startTime = Date.now();
    const estimatedTokens = this.estimateTokenUsage(request);

    try {
      // Check rate limits and circuit breaker
      await this.rateLimiter.acquireRequestPermit();

      if (!this.rateLimiter.checkTokenBudget(estimatedTokens)) {
        throw new Error('Token budget exceeded - please try again later');
      }

      const result = await this.circuitBreaker.execute(async () => {
        return await this.performOpenAIRequest(request, startTime);
      });

      this.totalRequests++;

      if (this.config.enableLogging) {
        await this.logSuccessfulRequest(request, result, startTime);
      }

      return result;
    } catch (error) {
      this.totalErrors++;
      const classifiedError = this.classifyError(error);

      if (this.config.enableLogging) {
        await this.logFailedRequest(request, error, classifiedError, startTime);
      }

      // Retry logic for certain error types
      if (this.shouldRetry(classifiedError)) {
        return await this.retryWithBackoff(request, 0);
      }

      throw this.enhanceError(error, classifiedError);
    } finally {
      this.rateLimiter.releaseRequestPermit();
    }
  }

  private async performOpenAIRequest(
    request: EmailTemplateRequest,
    startTime: number,
  ): Promise<GeneratedTemplate> {
    const prompt = this.buildPrompt(request);

    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(request.vendorType),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      response_format: { type: 'json_object' },
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error('OpenAI returned empty response');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    if (!parsedResponse.subject || !parsedResponse.body) {
      throw new Error(
        'OpenAI response missing required fields (subject, body)',
      );
    }

    const tokenUsage: TokenUsageTracking = {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
      cost: this.calculateCost(completion.usage?.total_tokens || 0),
    };

    // Update tracking
    this.totalTokensUsed += tokenUsage.totalTokens;
    this.totalCost += tokenUsage.cost;
    this.rateLimiter.consumeTokens(tokenUsage.totalTokens);

    // Apply merge tags if provided
    let processedBody = parsedResponse.body;
    if (request.mergeTags) {
      processedBody = this.applyMergeTags(processedBody, request.mergeTags);
    }

    return {
      subject: parsedResponse.subject,
      body: processedBody,
      metadata: {
        generatedAt: new Date(),
        tokenUsage,
        processingTime: Date.now() - startTime,
        model: this.config.model,
      },
    };
  }

  private buildPrompt(request: EmailTemplateRequest): string {
    const { vendorType, templateType, context, tone, includeSignature } =
      request;

    let prompt = `Generate a professional ${templateType} email template for a ${vendorType} to send to their client.

Context:
- Vendor: ${context.vendorName}
- Client: ${context.clientName}`;

    if (context.weddingDate) {
      prompt += `\n- Wedding Date: ${context.weddingDate}`;
    }
    if (context.venueName) {
      prompt += `\n- Venue: ${context.venueName}`;
    }
    if (context.packageDetails) {
      prompt += `\n- Package: ${context.packageDetails}`;
    }
    if (context.customInstructions) {
      prompt += `\n- Special Instructions: ${context.customInstructions}`;
    }

    prompt += `\n\nTone: ${tone}
Include signature: ${includeSignature ? 'Yes' : 'No'}

Requirements:
1. Professional and appropriate for wedding industry
2. Personalized with provided context
3. Clear call-to-action when appropriate
4. Warm but professional tone
5. Include relevant wedding industry best practices

Return the response as JSON with this exact structure:
{
  "subject": "Email subject line",
  "body": "Email body content"
}`;

    return prompt;
  }

  private getSystemPrompt(vendorType: string): string {
    const basePrompt = `You are an expert email copywriter specializing in the wedding industry. You understand the unique needs of wedding vendors and couples, the emotional significance of weddings, and professional communication standards.`;

    const vendorSpecific = {
      photographer: `You specialize in photography business communication, understanding the creative process, timeline requirements, and the importance of capturing precious moments.`,
      venue: `You specialize in venue management communication, understanding booking requirements, event coordination, and hospitality standards.`,
      florist: `You specialize in floral design communication, understanding seasonal availability, design consultations, and delivery logistics.`,
      catering: `You specialize in catering communication, understanding menu planning, dietary restrictions, and service requirements.`,
      planning: `You specialize in wedding planning communication, understanding coordination needs, vendor management, and timeline creation.`,
      other: `You understand general wedding vendor communication needs and industry standards.`,
    };

    return `${basePrompt} ${vendorSpecific[vendorType as keyof typeof vendorSpecific] || vendorSpecific.other}

Always create emails that are:
- Professional yet warm and personal
- Clear and actionable
- Appropriate for the wedding industry
- Respectful of the emotional significance of weddings
- Compliant with professional communication standards`;
  }

  private applyMergeTags(
    content: string,
    mergeTags: Record<string, string>,
  ): string {
    let processedContent = content;

    Object.entries(mergeTags).forEach(([tag, value]) => {
      // Support both {{tag}} and {tag} formats
      const patterns = [
        new RegExp(`\\{\\{${tag}\\}\\}`, 'g'),
        new RegExp(`\\{${tag}\\}`, 'g'),
      ];

      patterns.forEach((pattern) => {
        processedContent = processedContent.replace(pattern, value);
      });
    });

    return processedContent;
  }

  private estimateTokenUsage(request: EmailTemplateRequest): number {
    // Rough estimation: 1 token ≈ 0.75 words for English
    const prompt = this.buildPrompt(request);
    const systemPrompt = this.getSystemPrompt(request.vendorType);

    const estimatedPromptTokens = Math.ceil(
      (prompt.length + systemPrompt.length) / 3,
    );
    const estimatedCompletionTokens = this.config.maxTokens * 0.7; // Estimate 70% of max

    return estimatedPromptTokens + estimatedCompletionTokens;
  }

  private calculateCost(tokens: number): number {
    // GPT-4 pricing (as of 2024): $0.03/1K prompt tokens, $0.06/1K completion tokens
    // Simplified calculation - in production, track prompt vs completion separately
    const costPer1KTokens = this.config.model.includes('gpt-4')
      ? 0.045
      : 0.0015;
    return (tokens / 1000) * costPer1KTokens;
  }

  private async retryWithBackoff(
    request: EmailTemplateRequest,
    retryCount: number,
  ): Promise<GeneratedTemplate> {
    if (retryCount >= this.config.retry.maxRetries) {
      throw new Error(
        `Maximum retries (${this.config.retry.maxRetries}) exceeded`,
      );
    }

    const delay = Math.min(
      this.config.retry.baseDelay *
        Math.pow(this.config.retry.backoffMultiplier, retryCount),
      this.config.retry.maxDelay,
    );

    this.logger.info(
      `Retrying OpenAI request after ${delay}ms (attempt ${retryCount + 1})`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      return await this.generateEmailTemplate(request);
    } catch (error) {
      return await this.retryWithBackoff(request, retryCount + 1);
    }
  }

  private classifyError(error: any): OpenAIErrorType {
    if (!error) return OpenAIErrorType.UNKNOWN;

    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.response?.status;

    if (status === 429 || message.includes('rate limit')) {
      return OpenAIErrorType.RATE_LIMIT;
    }

    if (
      status === 401 ||
      message.includes('unauthorized') ||
      message.includes('api key')
    ) {
      return OpenAIErrorType.AUTHENTICATION;
    }

    if (
      status === 403 ||
      message.includes('quota') ||
      message.includes('billing')
    ) {
      return OpenAIErrorType.QUOTA_EXCEEDED;
    }

    if (status === 400 || message.includes('invalid request')) {
      return OpenAIErrorType.INVALID_REQUEST;
    }

    if (status >= 500 || message.includes('service unavailable')) {
      return OpenAIErrorType.SERVICE_UNAVAILABLE;
    }

    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection')
    ) {
      return OpenAIErrorType.NETWORK;
    }

    return OpenAIErrorType.UNKNOWN;
  }

  private shouldRetry(errorType: OpenAIErrorType): boolean {
    return [
      OpenAIErrorType.NETWORK,
      OpenAIErrorType.SERVICE_UNAVAILABLE,
      OpenAIErrorType.RATE_LIMIT,
    ].includes(errorType);
  }

  private enhanceError(originalError: any, errorType: OpenAIErrorType): Error {
    const userFriendlyMessages = {
      [OpenAIErrorType.RATE_LIMIT]:
        'Service is temporarily busy. Please try again in a few minutes.',
      [OpenAIErrorType.AUTHENTICATION]:
        'Authentication failed. Please check API configuration.',
      [OpenAIErrorType.QUOTA_EXCEEDED]:
        'Usage quota exceeded. Please check billing settings.',
      [OpenAIErrorType.INVALID_REQUEST]:
        'Invalid request format. Please check input parameters.',
      [OpenAIErrorType.SERVICE_UNAVAILABLE]:
        'AI service is temporarily unavailable. Please try again later.',
      [OpenAIErrorType.NETWORK]:
        'Network connection failed. Please check connectivity.',
      [OpenAIErrorType.UNKNOWN]:
        'An unexpected error occurred. Please contact support if this persists.',
    };

    const enhancedError = new Error(userFriendlyMessages[errorType]);
    (enhancedError as any).originalError = originalError;
    (enhancedError as any).errorType = errorType;
    (enhancedError as any).timestamp = new Date();

    return enhancedError;
  }

  private async logSuccessfulRequest(
    request: EmailTemplateRequest,
    result: GeneratedTemplate,
    startTime: number,
  ): Promise<void> {
    try {
      await this.integrationManager.logActivity({
        type: 'openai_request',
        status: 'success',
        metadata: {
          vendorType: request.vendorType,
          templateType: request.templateType,
          tokenUsage: result.metadata.tokenUsage,
          processingTime: Date.now() - startTime,
          model: this.config.model,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log successful request', { error });
    }
  }

  private async logFailedRequest(
    request: EmailTemplateRequest,
    error: any,
    errorType: OpenAIErrorType,
    startTime: number,
  ): Promise<void> {
    try {
      await this.integrationManager.logActivity({
        type: 'openai_request',
        status: 'error',
        metadata: {
          vendorType: request.vendorType,
          templateType: request.templateType,
          errorType,
          errorMessage: error.message,
          processingTime: Date.now() - startTime,
          model: this.config.model,
        },
      });
    } catch (logError) {
      this.logger.error('Failed to log failed request', { error: logError });
    }
  }

  // Health check and monitoring methods
  async getHealthStatus(): Promise<ServiceHealth> {
    const uptime = Date.now() - this.startTime;
    const errorRate =
      this.totalRequests > 0
        ? (this.totalErrors / this.totalRequests) * 100
        : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (this.circuitBreaker.getState() === CircuitBreakerState.OPEN) {
      status = 'unhealthy';
    } else if (errorRate > 10 || this.rateLimiter.getRemainingRequests() < 10) {
      status = 'degraded';
    }

    return {
      status,
      circuitBreakerState: this.circuitBreaker.getState(),
      rateLimitRemaining: this.rateLimiter.getRemainingRequests(),
      tokenBudgetRemaining: this.rateLimiter.getRemainingTokens(),
      uptime,
      errorRate,
    };
  }

  getUsageMetrics() {
    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
      averageTokensPerRequest:
        this.totalRequests > 0 ? this.totalTokensUsed / this.totalRequests : 0,
      errorRate:
        this.totalRequests > 0
          ? (this.totalErrors / this.totalRequests) * 100
          : 0,
    };
  }

  // Streaming support for large responses
  async generateEmailTemplateStream(
    request: EmailTemplateRequest,
  ): Promise<AsyncIterable<string>> {
    const prompt = this.buildPrompt(request);

    await this.rateLimiter.acquireRequestPermit();

    try {
      const stream = await this.circuitBreaker.execute(async () => {
        return await this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(request.vendorType),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: true,
        });
      });

      return this.processStream(stream);
    } finally {
      this.rateLimiter.releaseRequestPermit();
    }
  }

  private async *processStream(stream: any): AsyncIterable<string> {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  // Utility method for testing
  async testConnection(): Promise<boolean> {
    try {
      const testRequest: EmailTemplateRequest = {
        vendorType: 'photographer',
        templateType: 'welcome',
        context: {
          vendorName: 'Test Vendor',
          clientName: 'Test Client',
        },
        tone: 'professional',
        includeSignature: false,
      };

      await this.generateEmailTemplate(testRequest);
      return true;
    } catch (error) {
      this.logger.error('Connection test failed', { error });
      return false;
    }
  }
}

// Default configuration
export const DEFAULT_OPENAI_CONFIG: OpenAIServiceConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  organization: process.env.OPENAI_ORGANIZATION,
  maxTokens: 1000,
  temperature: 0.7,
  model: 'gpt-4',
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
    halfOpenMaxCalls: 3,
  },
  rateLimit: {
    requestsPerMinute: 50,
    tokensPerMinute: 40000,
    maxConcurrentRequests: 10,
    queueTimeout: 30000, // 30 seconds
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  enableLogging: true,
  enableMetrics: true,
};

// Factory function for easy instantiation
export function createOpenAIService(
  config?: Partial<OpenAIServiceConfig>,
): OpenAIService {
  const finalConfig = { ...DEFAULT_OPENAI_CONFIG, ...config };
  return new OpenAIService(finalConfig);
}

// Export types for use in other parts of the application
export type {
  EmailTemplateRequest,
  GeneratedTemplate,
  ServiceHealth,
  TokenUsageTracking,
  OpenAIServiceConfig,
};
