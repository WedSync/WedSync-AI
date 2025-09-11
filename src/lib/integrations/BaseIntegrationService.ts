import { createClient } from '@supabase/supabase-js';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  HealthCheck,
  ServiceMetrics,
  IntegrationError,
  ErrorCategory,
  ErrorSeverity,
  CategorizedError,
} from '@/types/integrations';

export abstract class BaseIntegrationService {
  protected config: IntegrationConfig;
  protected credentials: IntegrationCredentials;
  protected abstract serviceName: string;
  protected requestTimestamps: number[] = [];
  protected healthCache: { result: HealthCheck; timestamp: number } | null =
    null;
  protected metrics: ServiceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
  };

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    this.validateConfig(config);
    this.validateCredentials(credentials);

    this.config = {
      ...config,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      rateLimitPerMinute: config.rateLimitPerMinute || 60,
    };
    this.credentials = credentials;
  }

  // Abstract methods that must be implemented by subclasses
  abstract validateConnection(): Promise<boolean>;
  abstract refreshToken(): Promise<string>;
  protected abstract makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse>;

  // Configuration validation
  private validateConfig(config: IntegrationConfig): void {
    if (!config.apiUrl || !this.isValidUrl(config.apiUrl)) {
      throw new Error('Invalid API URL provided');
    }

    if (
      config.rateLimitPerMinute !== undefined &&
      config.rateLimitPerMinute <= 0
    ) {
      throw new Error('Rate limit must be positive');
    }
  }

  private validateCredentials(credentials: IntegrationCredentials): void {
    if (!credentials.apiKey) {
      throw new Error('API key is required');
    }

    if (!credentials.userId || !credentials.organizationId) {
      throw new Error('User ID and Organization ID are required');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Token management
  protected isTokenExpired(): boolean {
    if (!this.credentials.expiresAt) return false;
    return Date.now() >= this.credentials.expiresAt;
  }

  protected async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired()) {
      try {
        const newToken = await this.refreshToken();
        this.credentials.accessToken = newToken;
        this.credentials.expiresAt = Date.now() + 3600000; // 1 hour default
      } catch (error) {
        throw new IntegrationError(
          'Token refresh failed',
          'TOKEN_REFRESH_FAILED',
          ErrorCategory.AUTHENTICATION,
          error as Error,
        );
      }
    }
  }

  // Rate limiting
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > windowStart,
    );

    if (this.requestTimestamps.length >= this.config.rateLimitPerMinute!) {
      throw new IntegrationError(
        'Rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        ErrorCategory.RATE_LIMIT,
      );
    }

    this.requestTimestamps.push(now);
  }

  // Request handling with retry logic
  protected async makeRequestWithRetry(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    const startTime = Date.now();
    let lastError: Error;

    await this.checkRateLimit();
    await this.ensureValidToken();

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        this.metrics.totalRequests++;

        const result = await Promise.race([
          this.makeRequest(endpoint, options),
          this.createTimeoutPromise(),
        ]);

        const responseTime = Date.now() - startTime;
        this.updateMetrics(true, responseTime);

        return result;
      } catch (error) {
        lastError = error as Error;

        if (
          attempt === this.config.retryAttempts ||
          !this.isRetryableError(error)
        ) {
          this.updateMetrics(false, Date.now() - startTime);
          throw error;
        }

        // Wait before retry with exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new IntegrationError(
      'Max retry attempts exceeded',
      'MAX_RETRIES_EXCEEDED',
      ErrorCategory.EXTERNAL_API,
      lastError!,
    );
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new IntegrationError(
            'Request timeout',
            'REQUEST_TIMEOUT',
            ErrorCategory.NETWORK,
          ),
        );
      }, this.config.timeout);
    });
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof IntegrationError) {
      return (
        error.category === ErrorCategory.NETWORK ||
        error.category === ErrorCategory.EXTERNAL_API
      );
    }
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Error handling and sanitization
  protected sanitizeError(error: unknown): Error {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    // Remove sensitive information from error messages
    let sanitizedMessage = errorObj.message;

    // List of sensitive patterns to redact
    const sensitivePatterns = [
      /api[_-]?key[_-]?[:\s]*[a-zA-Z0-9]+/gi,
      /access[_-]?token[_-]?[:\s]*[a-zA-Z0-9]+/gi,
      /secret[_-]?key[_-]?[:\s]*[a-zA-Z0-9]+/gi,
      /password[_-]?[:\s]*[a-zA-Z0-9]+/gi,
    ];

    sensitivePatterns.forEach((pattern) => {
      sanitizedMessage = sanitizedMessage.replace(pattern, (match) => {
        const colonIndex = match.indexOf(':');
        const prefix =
          colonIndex !== -1 ? match.substring(0, colonIndex + 1) : '';
        return prefix + '***';
      });
    });

    return new Error(sanitizedMessage);
  }

  protected categorizeError(error: unknown): CategorizedError {
    if (error instanceof IntegrationError) {
      return {
        code: error.code,
        userMessage: error.message,
        category: error.category as ErrorCategory,
        severity: ErrorSeverity.MEDIUM,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return {
        code: 'AUTHENTICATION_FAILED',
        userMessage: 'Authentication failed. Please reconnect your account.',
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
      };
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return {
        code: 'RATE_LIMITED',
        userMessage:
          'Service temporarily unavailable due to rate limits. Please try again later.',
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        code: 'REQUEST_TIMEOUT',
        userMessage: 'Request timed out. Please try again later.',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      userMessage: 'An unexpected error occurred. Please try again later.',
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
    };
  }

  // Health check functionality
  async healthCheck(): Promise<HealthCheck> {
    // Return cached result if recent (within 5 minutes)
    if (this.healthCache && Date.now() - this.healthCache.timestamp < 300000) {
      return this.healthCache.result;
    }

    const startTime = Date.now();

    try {
      const isHealthy = await this.validateConnection();
      const responseTime = Date.now() - startTime;

      const result: HealthCheck = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: isHealthy ? undefined : 'Connection validation failed',
      };

      this.healthCache = { result, timestamp: Date.now() };
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheck = {
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.healthCache = { result, timestamp: Date.now() };
      return result;
    }
  }

  // Metrics collection
  private updateMetrics(success: boolean, responseTime: number): void {
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const totalRequests =
      this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) /
      totalRequests;

    this.metrics.lastRequestAt = new Date();
  }

  getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
    };
  }

  // Logging with credential sanitization
  protected logRequest(method: string, endpoint: string, data?: any): void {
    const sanitizedData = this.sanitizeLogData(data);

    console.info(`[${this.serviceName}] ${method} ${endpoint}`, {
      endpoint,
      method,
      data: sanitizedData,
      timestamp: new Date().toISOString(),
    });
  }

  protected logResponse(method: string, endpoint: string, response: any): void {
    const sanitizedResponse = this.sanitizeLogData(response);

    console.info(`[${this.serviceName}] Response ${method} ${endpoint}`, {
      endpoint,
      method,
      response: sanitizedResponse,
      timestamp: new Date().toISOString(),
    });
  }

  private sanitizeLogData(data: any): any {
    if (!data) return data;

    const sensitiveKeys = [
      'apiKey',
      'accessToken',
      'refreshToken',
      'password',
      'secret',
    ];
    const sanitized = JSON.parse(JSON.stringify(data));

    function redactSensitive(obj: any): void {
      if (typeof obj !== 'object' || obj === null) return;

      Object.keys(obj).forEach((key) => {
        if (
          sensitiveKeys.some((sensitiveKey) =>
            key.toLowerCase().includes(sensitiveKey.toLowerCase()),
          )
        ) {
          obj[key] = '***';
        } else if (typeof obj[key] === 'object') {
          redactSensitive(obj[key]);
        }
      });
    }

    redactSensitive(sanitized);
    return sanitized;
  }
}
