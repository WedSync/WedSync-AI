/**
 * WS-130: AI Photography Error Handler & Fallback System
 * Comprehensive error handling with graceful degradation and user-friendly fallbacks
 */

export interface ErrorContext {
  operation: string;
  userId?: string;
  sessionId?: string;
  imageId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface FallbackConfig {
  enableBasicColorExtraction: boolean;
  enableManualMoodBoard: boolean;
  enableFilterFallbacks: boolean;
  showFallbackMessage: boolean;
  fallbackTimeout: number;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  PROCESSING_ERROR = 'processing_error',
  VALIDATION_ERROR = 'validation_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  TIMEOUT_ERROR = 'timeout_error',
  AUTHENTICATION_ERROR = 'auth_error',
}

export interface AiPhotographyError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context: ErrorContext;
  originalError?: Error;
  retryable: boolean;
  suggestions: string[];
  timestamp: Date;
}

/**
 * Circuit Breaker for external AI services
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly monitoringPeriod: number = 120000, // 2 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
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

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailTime = null;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailTime = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailTime) return false;
    return Date.now() - this.lastFailTime.getTime() >= this.timeout;
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

/**
 * Main AI Photography Error Handler
 */
export class AiPhotographyErrorHandler {
  private errorLog: AiPhotographyError[] = [];
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private retryConfig: RetryConfig;
  private fallbackConfig: FallbackConfig;
  private errorReportingCallback?: (error: AiPhotographyError) => void;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    fallbackConfig: Partial<FallbackConfig> = {},
  ) {
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'network_error',
        'timeout_error',
        'rate_limit_error',
        'processing_error',
      ],
      ...retryConfig,
    };

    this.fallbackConfig = {
      enableBasicColorExtraction: true,
      enableManualMoodBoard: true,
      enableFilterFallbacks: true,
      showFallbackMessage: true,
      fallbackTimeout: 5000,
      ...fallbackConfig,
    };

    // Initialize circuit breakers for AI services
    this.circuitBreakers.set('openai-vision', new CircuitBreaker());
    this.circuitBreakers.set('color-analysis', new CircuitBreaker());
    this.circuitBreakers.set('style-matching', new CircuitBreaker());
    this.circuitBreakers.set('mood-board', new CircuitBreaker());
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: () => Promise<T> | T,
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(context.operation);

    try {
      return await this.executeWithRetry(
        () => circuitBreaker.execute(operation),
        context,
      );
    } catch (error) {
      const aiError = this.createAiError(error as Error, context);
      this.logError(aiError);

      // Try fallback if available
      if (fallback && this.fallbackConfig?.showFallbackMessage) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `Primary operation failed, using fallback for ${context.operation}`,
          );
        }
        try {
          return typeof fallback === 'function' ? await fallback() : fallback;
        } catch (fallbackError) {
          // Log fallback failure but don't expose it to user
          if (process.env.NODE_ENV === 'development') {
            console.error('Fallback operation also failed:', fallbackError);
          }
          // Continue to throw original error
        }
      }

      throw aiError;
    }
  }

  /**
   * Color Analysis with fallback
   */
  async handleColorAnalysis(
    imageBase64: string,
    photoId: string,
    primaryAnalysis: () => Promise<any>,
  ): Promise<any> {
    const context: ErrorContext = {
      operation: 'color-analysis',
      imageId: photoId,
      timestamp: new Date(),
    };

    return this.executeWithHandling(primaryAnalysis, context, () =>
      this.colorAnalysisFallback(imageBase64, photoId),
    );
  }

  /**
   * Style Matching with fallback
   */
  async handleStyleMatching(
    images: any[],
    preferences: any,
    primaryMatching: () => Promise<any>,
  ): Promise<any> {
    const context: ErrorContext = {
      operation: 'style-matching',
      timestamp: new Date(),
      metadata: { imageCount: images.length },
    };

    return this.executeWithHandling(primaryMatching, context, () =>
      this.styleMatchingFallback(images, preferences),
    );
  }

  /**
   * Mood Board Generation with fallback
   */
  async handleMoodBoardGeneration(
    photos: any[],
    theme: string,
    primaryGeneration: () => Promise<any>,
  ): Promise<any> {
    const context: ErrorContext = {
      operation: 'mood-board-generation',
      timestamp: new Date(),
      metadata: { photoCount: photos.length, theme },
    };

    return this.executeWithHandling(primaryGeneration, context, () =>
      this.moodBoardFallback(photos, theme),
    );
  }

  /**
   * Performance Optimization with fallback
   */
  async handlePerformanceOptimization<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    const context: ErrorContext = {
      operation: 'performance-optimization',
      timestamp: new Date(),
    };

    return this.executeWithHandling(operation, context, fallbackOperation);
  }

  /**
   * Fallback: Basic color extraction using Canvas API
   */
  private async colorAnalysisFallback(
    imageBase64: string,
    photoId: string,
  ): Promise<any> {
    try {
      if (!this.fallbackConfig.enableBasicColorExtraction) {
        throw new Error('Color extraction fallback disabled');
      }

      // Basic color extraction using Canvas (simplified)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          canvas.width = 100;
          canvas.height = 100;
          ctx?.drawImage(img, 0, 0, 100, 100);

          const imageData = ctx?.getImageData(0, 0, 100, 100);
          if (!imageData) {
            reject(new Error('Failed to extract image data'));
            return;
          }

          const colors = this.extractDominantColors(imageData);
          resolve({
            dominantColors: colors,
            harmony: 'unknown',
            mood: 'neutral',
            confidence: 0.5,
            fallback: true,
            method: 'basic-extraction',
          });
        };

        img.onerror = () =>
          reject(new Error('Failed to load image for fallback analysis'));
        img.src = `data:image/jpeg;base64,${imageBase64}`;
      });
    } catch (error) {
      return {
        dominantColors: ['#808080', '#666666', '#999999'],
        harmony: 'monochromatic',
        mood: 'neutral',
        confidence: 0.1,
        fallback: true,
        error: 'Basic extraction failed, using default colors',
      };
    }
  }

  /**
   * Fallback: Rule-based style matching
   */
  private async styleMatchingFallback(
    images: any[],
    preferences: any,
  ): Promise<any> {
    if (!this.fallbackConfig.enableFilterFallbacks) {
      throw new Error('Style matching fallback disabled');
    }

    // Simple rule-based matching based on metadata
    const matches = images.filter((image) => {
      // Basic filtering by tags or metadata
      if (preferences.style && image.tags?.includes(preferences.style)) {
        return true;
      }
      if (preferences.colors && image.dominantColor) {
        return preferences.colors.includes(image.dominantColor);
      }
      return Math.random() > 0.7; // Random fallback for demo
    });

    return {
      matches: matches.slice(0, 10),
      compatibility: 0.6,
      styleAnalysis: {
        primary: preferences.style || 'mixed',
        secondary: 'unknown',
        confidence: 0.4,
      },
      fallback: true,
      method: 'rule-based-matching',
    };
  }

  /**
   * Fallback: Manual mood board tools
   */
  private async moodBoardFallback(photos: any[], theme: string): Promise<any> {
    if (!this.fallbackConfig.enableManualMoodBoard) {
      throw new Error('Mood board fallback disabled');
    }

    return {
      recommendations: [],
      layout: 'grid',
      coherenceScore: 0.5,
      explanation:
        'AI recommendations unavailable. Manual creation tools are available.',
      fallback: true,
      method: 'manual-tools',
      availableTools: [
        'drag-and-drop',
        'color-picker',
        'grid-layout',
        'export-options',
      ],
    };
  }

  /**
   * Extract dominant colors from image data (basic implementation)
   */
  private extractDominantColors(imageData: ImageData): string[] {
    const data = imageData.data;
    const colorCounts = new Map<string, number>();

    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Skip very light or dark pixels
      if (r + g + b < 50 || r + g + b > 700) continue;

      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }

    // Get top 3 colors
    return Array.from(colorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([color]) => color);
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (
          attempt === this.retryConfig.maxAttempts ||
          !this.isRetryable(error as Error)
        ) {
          break;
        }

        const delay = Math.min(
          this.retryConfig.baseDelay *
            Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Create standardized AI error object
   */
  private createAiError(
    error: Error,
    context: ErrorContext,
  ): AiPhotographyError {
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(category, context);

    return {
      id: `ai_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      severity,
      message: error.message,
      userMessage: this.generateUserMessage(category, context.operation),
      context,
      originalError: error,
      retryable: this.isRetryable(error),
      suggestions: this.generateSuggestions(category, context.operation),
      timestamp: new Date(),
    };
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ErrorCategory.NETWORK_ERROR;
    }
    if (message.includes('timeout')) {
      return ErrorCategory.TIMEOUT_ERROR;
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorCategory.RATE_LIMIT_ERROR;
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorCategory.AUTHENTICATION_ERROR;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION_ERROR;
    }
    if (message.includes('processing') || message.includes('analysis')) {
      return ErrorCategory.PROCESSING_ERROR;
    }

    return ErrorCategory.API_ERROR;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    category: ErrorCategory,
    context: ErrorContext,
  ): ErrorSeverity {
    switch (category) {
      case ErrorCategory.AUTHENTICATION_ERROR:
        return ErrorSeverity.CRITICAL;
      case ErrorCategory.PROCESSING_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorCategory.RATE_LIMIT_ERROR:
      case ErrorCategory.TIMEOUT_ERROR:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: Error): boolean {
    const category = this.categorizeError(error);
    return this.retryConfig.retryableErrors.includes(category);
  }

  /**
   * Generate user-friendly error messages
   */
  private generateUserMessage(
    category: ErrorCategory,
    operation: string,
  ): string {
    const operationName = operation
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    switch (category) {
      case ErrorCategory.NETWORK_ERROR:
        return `Unable to connect for ${operationName}. Please check your internet connection and try again.`;
      case ErrorCategory.TIMEOUT_ERROR:
        return `${operationName} is taking longer than expected. We're working on it - please try again in a moment.`;
      case ErrorCategory.RATE_LIMIT_ERROR:
        return `Too many requests for ${operationName}. Please wait a moment before trying again.`;
      case ErrorCategory.AUTHENTICATION_ERROR:
        return `Authentication required for ${operationName}. Please refresh the page and sign in again.`;
      case ErrorCategory.VALIDATION_ERROR:
        return `Invalid data provided for ${operationName}. Please check your input and try again.`;
      case ErrorCategory.PROCESSING_ERROR:
        return `${operationName} encountered a processing error. Basic features are still available.`;
      default:
        return `${operationName} is temporarily unavailable. Fallback features are active.`;
    }
  }

  /**
   * Generate helpful suggestions for users
   */
  private generateSuggestions(
    category: ErrorCategory,
    operation: string,
  ): string[] {
    const suggestions: string[] = [];

    switch (category) {
      case ErrorCategory.NETWORK_ERROR:
        suggestions.push('Check your internet connection');
        suggestions.push('Try refreshing the page');
        suggestions.push('Use manual tools if available');
        break;
      case ErrorCategory.TIMEOUT_ERROR:
        suggestions.push('Try with smaller images');
        suggestions.push('Process fewer images at once');
        suggestions.push('Try again in a few minutes');
        break;
      case ErrorCategory.RATE_LIMIT_ERROR:
        suggestions.push('Wait a few minutes before trying again');
        suggestions.push('Process images in smaller batches');
        break;
      case ErrorCategory.PROCESSING_ERROR:
        suggestions.push('Try with different images');
        suggestions.push('Use manual color selection tools');
        suggestions.push('Contact support if the issue persists');
        break;
      default:
        suggestions.push('Try again later');
        suggestions.push('Use available manual tools');
        suggestions.push('Contact support if needed');
    }

    return suggestions;
  }

  /**
   * Get or create circuit breaker for service
   */
  private getCircuitBreaker(operation: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operation)) {
      this.circuitBreakers.set(operation, new CircuitBreaker());
    }
    return this.circuitBreakers.get(operation)!;
  }

  /**
   * Log error for monitoring and debugging
   */
  private logError(error: AiPhotographyError): void {
    this.errorLog.push(error);

    // Keep only recent errors (last 100)
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Report to external monitoring if configured
    if (this.errorReportingCallback) {
      this.errorReportingCallback(error);
    }

    // Console logging with appropriate level
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('CRITICAL AI Photography Error:', error);
        break;
      case ErrorSeverity.HIGH:
        console.error('HIGH AI Photography Error:', error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('MEDIUM AI Photography Error:', error);
        break;
      default:
        console.info('LOW AI Photography Error:', error);
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    circuitBreakerStates: Record<string, string>;
    recentErrors: AiPhotographyError[];
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;

    this.errorLog.forEach((error) => {
      errorsByCategory[error.category] =
        (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] =
        (errorsBySeverity[error.severity] || 0) + 1;
    });

    const circuitBreakerStates: Record<string, string> = {};
    this.circuitBreakers.forEach((breaker, service) => {
      circuitBreakerStates[service] = breaker.getState();
    });

    return {
      totalErrors: this.errorLog.length,
      errorsByCategory,
      errorsBySeverity,
      circuitBreakerStates,
      recentErrors: this.errorLog.slice(-10),
    };
  }

  /**
   * Set error reporting callback for external monitoring
   */
  setErrorReporting(callback: (error: AiPhotographyError) => void): void {
    this.errorReportingCallback = callback;
  }

  /**
   * Clear error log (for testing or maintenance)
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Reset circuit breakers (for testing or maintenance)
   */
  resetCircuitBreakers(): void {
    this.circuitBreakers.forEach((breaker) => {
      (breaker as any).failures = 0;
      (breaker as any).state = 'CLOSED';
      (breaker as any).lastFailTime = null;
    });
  }
}

// Export singleton instance
export const aiPhotographyErrorHandler = new AiPhotographyErrorHandler();

// Export convenience functions
export const handleColorAnalysisWithFallback = (
  imageBase64: string,
  photoId: string,
  primaryAnalysis: () => Promise<any>,
) =>
  aiPhotographyErrorHandler.handleColorAnalysis(
    imageBase64,
    photoId,
    primaryAnalysis,
  );

export const handleStyleMatchingWithFallback = (
  images: any[],
  preferences: any,
  primaryMatching: () => Promise<any>,
) =>
  aiPhotographyErrorHandler.handleStyleMatching(
    images,
    preferences,
    primaryMatching,
  );

export const handleMoodBoardGenerationWithFallback = (
  photos: any[],
  theme: string,
  primaryGeneration: () => Promise<any>,
) =>
  aiPhotographyErrorHandler.handleMoodBoardGeneration(
    photos,
    theme,
    primaryGeneration,
  );

export const getAiErrorStats = () => aiPhotographyErrorHandler.getErrorStats();
