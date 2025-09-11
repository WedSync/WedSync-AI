/**
 * WedSync API Error Response Standardization System
 *
 * Comprehensive API error response standardization that ensures consistent error handling
 * across all WedSync endpoints. Provides structured error responses with wedding-specific
 * context, user-friendly messaging, and comprehensive debugging information.
 *
 * Features:
 * - Standardized error response format across all APIs
 * - Wedding industry-specific error codes and messages
 * - User type-aware error messaging (couples vs suppliers vs coordinators)
 * - Comprehensive error context for debugging
 * - Rate limiting and security error handling
 * - Integration with error tracking and recovery systems
 *
 * @author Claude Code (Team B Backend Developer)
 * @date 2025-01-20
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  errorManager,
  WeddingErrorContext,
  WeddingErrorSeverity,
  WeddingErrorCategory,
} from './backend-error-manager';

// =====================================================================================
// STANDARDIZED ERROR RESPONSE INTERFACES
// =====================================================================================

export interface StandardizedErrorResponse {
  // Core error information
  error: {
    code: string;
    message: string;
    type: WeddingErrorCategory;
    severity: WeddingErrorSeverity;
  };

  // User-friendly messaging
  userMessage: {
    title: string;
    description: string;
    actionRequired?: string;
    supportContact?: string;
  };

  // Request context
  request: {
    id: string;
    timestamp: string;
    endpoint: string;
    method: string;
    correlationId?: string;
  };

  // Wedding business context (if applicable)
  weddingContext?: {
    phase?: string;
    vendorType?: string;
    daysToWedding?: number;
    criticalPath?: boolean;
    businessImpact?: string;
  };

  // Development and debugging
  debug?: {
    stack?: string;
    validation?: ValidationError[];
    technicalDetails?: Record<string, any>;
    suggestions?: string[];
  };

  // Recovery and retry information
  recovery?: {
    canRetry: boolean;
    retryAfter?: number;
    alternativeActions?: string[];
    fallbackAvailable?: boolean;
  };

  // Metadata
  meta: {
    version: string;
    environment: string;
    processingTime: number;
    rateLimitInfo?: RateLimitInfo;
  };
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  receivedValue?: any;
  expectedType?: string;
  constraints?: Record<string, any>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  TIER_LIMIT_EXCEEDED = 'TIER_LIMIT_EXCEEDED',

  // Validation Errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_GONE = 'RESOURCE_GONE',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Wedding-Specific Errors
  WEDDING_DATE_INVALID = 'WEDDING_DATE_INVALID',
  VENDOR_UNAVAILABLE = 'VENDOR_UNAVAILABLE',
  BOOKING_CONFLICT = 'BOOKING_CONFLICT',
  WEDDING_DAY_LOCKDOWN = 'WEDDING_DAY_LOCKDOWN',
  GUEST_COUNT_EXCEEDED = 'GUEST_COUNT_EXCEEDED',

  // Payment Errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  BILLING_ISSUE = 'BILLING_ISSUE',

  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',

  // Integration Errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTEGRATION_TIMEOUT = 'INTEGRATION_TIMEOUT',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',

  // File & Upload Errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
}

// =====================================================================================
// MAIN API ERROR STANDARDIZATION CLASS
// =====================================================================================

export class ApiErrorStandardizer {
  private readonly VERSION = '1.0.0';
  private readonly ENVIRONMENT = process.env.NODE_ENV || 'development';

  // Wedding industry-specific error messaging
  private readonly userMessageTemplates: Record<
    ApiErrorCode,
    Record<string, any>
  > = {
    [ApiErrorCode.UNAUTHENTICATED]: {
      couple: {
        title: 'Sign In Required',
        description: 'Please sign in to access your wedding planning tools.',
        actionRequired: 'Sign in to continue',
      },
      supplier: {
        title: 'Authentication Required',
        description: 'Please sign in to access your business dashboard.',
        actionRequired: 'Sign in to continue',
      },
      coordinator: {
        title: 'Session Expired',
        description: 'Your session has expired. Please sign in again.',
        actionRequired: 'Sign in to continue managing weddings',
      },
    },

    [ApiErrorCode.TIER_LIMIT_EXCEEDED]: {
      couple: {
        title: 'Feature Not Available',
        description: 'This feature requires a WedSync subscription to access.',
        actionRequired: 'Upgrade your plan to continue',
      },
      supplier: {
        title: 'Upgrade Required',
        description:
          "You've reached your plan limit. Upgrade to add more clients.",
        actionRequired: 'View upgrade options',
      },
    },

    [ApiErrorCode.WEDDING_DAY_LOCKDOWN]: {
      couple: {
        title: 'Wedding Day Protection',
        description:
          'Major changes are locked to protect your wedding day. Contact support for assistance.',
        actionRequired: 'Contact emergency support',
        supportContact: 'emergency@wedsync.com',
      },
      supplier: {
        title: 'Wedding Day Lockdown',
        description:
          'Wedding day protection is active. Critical changes require manual approval.',
        actionRequired: 'Contact support for urgent changes',
      },
    },

    [ApiErrorCode.PAYMENT_FAILED]: {
      couple: {
        title: 'Payment Failed',
        description:
          "We couldn't process your payment. Please check your payment method.",
        actionRequired: 'Update payment method',
      },
      supplier: {
        title: 'Payment Processing Error',
        description:
          'There was an issue processing the payment. Please try again.',
        actionRequired: 'Retry payment or contact support',
      },
    },
  };

  // =====================================================================================
  // MAIN STANDARDIZATION METHODS
  // =====================================================================================

  public async standardizeError(
    error: Error | any,
    request: NextRequest,
    context?: Partial<WeddingErrorContext>,
  ): Promise<StandardizedErrorResponse> {
    const startTime = Date.now();

    try {
      // Extract request context
      const requestContext = this.extractRequestContext(request, context);

      // Classify and analyze the error
      const errorAnalysis = await this.analyzeError(error, requestContext);

      // Handle error through the main error management system
      const errorHandlingResult = await errorManager.handleError(
        error,
        requestContext,
      );

      // Build standardized response
      const standardizedResponse = await this.buildStandardizedResponse(
        error,
        errorAnalysis,
        requestContext,
        errorHandlingResult,
        Date.now() - startTime,
      );

      return standardizedResponse;
    } catch (standardizationError) {
      console.error('🚨 Error standardization failed:', standardizationError);

      // Fallback to basic error response
      return this.createFallbackErrorResponse(
        error,
        request,
        Date.now() - startTime,
      );
    }
  }

  public createValidationErrorResponse(
    validationErrors: ZodError | any[],
    request: NextRequest,
    context?: Partial<WeddingErrorContext>,
  ): StandardizedErrorResponse {
    const requestContext = this.extractRequestContext(request, context);
    const validationDetails = this.extractValidationDetails(validationErrors);

    return {
      error: {
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Request validation failed',
        type: WeddingErrorCategory.VALIDATION,
        severity: WeddingErrorSeverity.LOW,
      },

      userMessage: this.getUserMessage(
        ApiErrorCode.VALIDATION_FAILED,
        requestContext.userType,
        { fieldCount: validationDetails.length },
      ),

      request: {
        id: requestContext.requestId,
        timestamp: requestContext.timestamp,
        endpoint: requestContext.endpoint,
        method: requestContext.method,
        correlationId: requestContext.correlationId,
      },

      weddingContext: this.extractWeddingContext(requestContext),

      debug: {
        validation: validationDetails,
        suggestions: this.generateValidationSuggestions(validationDetails),
      },

      recovery: {
        canRetry: true,
        alternativeActions: [
          'Check required fields',
          'Verify data formats',
          'Review field constraints',
        ],
      },

      meta: {
        version: this.VERSION,
        environment: this.ENVIRONMENT,
        processingTime: 0,
      },
    };
  }

  public createRateLimitErrorResponse(
    rateLimitInfo: RateLimitInfo,
    request: NextRequest,
    context?: Partial<WeddingErrorContext>,
  ): StandardizedErrorResponse {
    const requestContext = this.extractRequestContext(request, context);

    return {
      error: {
        code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        type: WeddingErrorCategory.PERFORMANCE,
        severity: WeddingErrorSeverity.MEDIUM,
      },

      userMessage: this.getUserMessage(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        requestContext.userType,
        { resetTime: rateLimitInfo.resetTime },
      ),

      request: {
        id: requestContext.requestId,
        timestamp: requestContext.timestamp,
        endpoint: requestContext.endpoint,
        method: requestContext.method,
      },

      recovery: {
        canRetry: true,
        retryAfter: rateLimitInfo.retryAfter,
        alternativeActions: [
          'Wait before retrying',
          'Consider upgrading your plan for higher limits',
        ],
      },

      meta: {
        version: this.VERSION,
        environment: this.ENVIRONMENT,
        processingTime: 0,
        rateLimitInfo,
      },
    };
  }

  // =====================================================================================
  // NEXT.JS RESPONSE HELPERS
  // =====================================================================================

  public async handleApiError(
    error: Error | any,
    request: NextRequest,
    context?: Partial<WeddingErrorContext>,
  ): Promise<NextResponse> {
    const standardizedError = await this.standardizeError(
      error,
      request,
      context,
    );
    const statusCode = this.getHttpStatusCode(standardizedError.error.code);

    // Set appropriate headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Error-Code': standardizedError.error.code,
      'X-Request-ID': standardizedError.request.id,
    };

    // Add rate limit headers if applicable
    if (standardizedError.meta.rateLimitInfo) {
      headers['X-RateLimit-Limit'] =
        standardizedError.meta.rateLimitInfo.limit.toString();
      headers['X-RateLimit-Remaining'] =
        standardizedError.meta.rateLimitInfo.remaining.toString();
      headers['X-RateLimit-Reset'] =
        standardizedError.meta.rateLimitInfo.resetTime.toString();

      if (standardizedError.meta.rateLimitInfo.retryAfter) {
        headers['Retry-After'] =
          standardizedError.meta.rateLimitInfo.retryAfter.toString();
      }
    }

    // Add correlation headers for tracing
    if (standardizedError.request.correlationId) {
      headers['X-Correlation-ID'] = standardizedError.request.correlationId;
    }

    return new NextResponse(JSON.stringify(standardizedError, null, 2), {
      status: statusCode,
      headers,
    });
  }

  // =====================================================================================
  // ERROR ANALYSIS AND CLASSIFICATION
  // =====================================================================================

  private async analyzeError(
    error: Error | unknown,
    context: WeddingErrorContext,
  ): Promise<ErrorAnalysis> {
    const errorType = this.classifyErrorType(error);
    const apiErrorCode = this.mapToApiErrorCode(error, errorType);
    const businessImpact = this.assessBusinessImpact(error, context);
    const weddingSpecificContext = this.extractWeddingSpecificContext(
      error,
      context,
    );

    return {
      errorType,
      apiErrorCode,
      businessImpact,
      weddingSpecificContext,
      isUserError: this.isUserError(error),
      isSystemError: this.isSystemError(error),
      isWeddingDayCritical: this.isWeddingDayCritical(context),
      recommendedHttpStatus: this.getHttpStatusCode(apiErrorCode),
    };
  }

  private classifyErrorType(error: Error | unknown): string {
    // Type guard for Error objects
    if (error instanceof Error) {
      if (error instanceof ZodError) return 'validation';
      if (error.name === 'UnauthorizedError') return 'auth';
      if (error.message?.includes('timeout')) return 'timeout';
      if (error.message?.includes('payment')) return 'payment';
      if (error.message?.includes('stripe')) return 'payment';
      if (error.message?.includes('rate limit')) return 'rate_limit';
      if (error.message?.includes('not found')) return 'not_found';
      if (error.message?.includes('conflict')) return 'conflict';
    }

    // Handle unknown error types safely
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const errorObj = error as { name?: string; message?: string };
      if (errorObj.name === 'UnauthorizedError') return 'auth';
      if (errorObj.message?.includes('timeout')) return 'timeout';
    }

    return 'system';
  }

  private mapToApiErrorCode(
    error: Error | unknown,
    errorType: string,
  ): ApiErrorCode {
    // Map error types to standardized API error codes
    switch (errorType) {
      case 'validation':
        return ApiErrorCode.VALIDATION_FAILED;
      case 'auth':
        return ApiErrorCode.UNAUTHENTICATED;
      case 'timeout':
        return ApiErrorCode.TIMEOUT;
      case 'payment':
        return ApiErrorCode.PAYMENT_FAILED;
      case 'rate_limit':
        return ApiErrorCode.RATE_LIMIT_EXCEEDED;
      case 'not_found':
        return ApiErrorCode.RESOURCE_NOT_FOUND;
      case 'conflict':
        return ApiErrorCode.RESOURCE_CONFLICT;
      default:
        return ApiErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  // =====================================================================================
  // RESPONSE BUILDING
  // =====================================================================================

  private async buildStandardizedResponse(
    error: Error | any,
    analysis: ErrorAnalysis,
    context: WeddingErrorContext,
    handlingResult: any,
    processingTime: number,
  ): Promise<StandardizedErrorResponse> {
    return {
      error: {
        code: analysis.apiErrorCode,
        message: error.message || 'An error occurred',
        type: this.mapToErrorCategory(analysis.errorType),
        severity: this.mapToSeverity(analysis.businessImpact, context),
      },

      userMessage: this.getUserMessage(
        analysis.apiErrorCode,
        context.userType,
        {
          weddingPhase: context.eventPhase,
          vendorType: context.vendorType,
        },
      ),

      request: {
        id: context.requestId,
        timestamp: context.timestamp,
        endpoint: context.endpoint,
        method: context.method,
        correlationId: context.correlationId,
      },

      weddingContext: this.extractWeddingContext(context),

      debug: this.buildDebugInfo(error, analysis, context),

      recovery: {
        canRetry: handlingResult?.canRetry || false,
        retryAfter: this.calculateRetryDelay(analysis, context),
        alternativeActions: this.generateAlternativeActions(analysis, context),
        fallbackAvailable: handlingResult?.recoveryAttempted || false,
      },

      meta: {
        version: this.VERSION,
        environment: this.ENVIRONMENT,
        processingTime,
      },
    };
  }

  // =====================================================================================
  // USER MESSAGE GENERATION
  // =====================================================================================

  private getUserMessage(
    errorCode: ApiErrorCode,
    userType: string = 'couple',
    context?: Record<string, any>,
  ): {
    title: string;
    description: string;
    actionRequired?: string;
    supportContact?: string;
  } {
    const templates = this.userMessageTemplates[errorCode];

    if (templates && templates[userType]) {
      return templates[userType];
    }

    // Fallback to generic messages
    return this.getGenericUserMessage(errorCode, userType, context);
  }

  private getGenericUserMessage(
    errorCode: ApiErrorCode,
    userType: string,
    context?: Record<string, any>,
  ): {
    title: string;
    description: string;
    actionRequired?: string;
    supportContact?: string;
  } {
    const isWeddingDay = context?.weddingPhase === 'wedding_day';
    const supportContact = isWeddingDay
      ? 'emergency@wedsync.com'
      : 'support@wedsync.com';

    switch (errorCode) {
      case ApiErrorCode.INTERNAL_SERVER_ERROR:
        return {
          title: isWeddingDay ? 'Wedding Day System Error' : 'System Error',
          description: isWeddingDay
            ? 'A system error occurred. Our emergency team has been notified and is resolving this immediately.'
            : "Something went wrong on our end. We're working to fix it.",
          actionRequired: isWeddingDay
            ? 'Contact emergency support immediately'
            : 'Please try again shortly',
          supportContact,
        };

      case ApiErrorCode.SERVICE_UNAVAILABLE:
        return {
          title: 'Service Temporarily Unavailable',
          description:
            userType === 'couple'
              ? 'The service is temporarily down for maintenance. Your wedding information is safe.'
              : 'The service is temporarily unavailable. Please check back shortly.',
          actionRequired: 'Please try again in a few minutes',
        };

      case ApiErrorCode.VALIDATION_FAILED:
        return {
          title: 'Information Required',
          description:
            userType === 'couple'
              ? 'Please check your wedding details and fill in any missing information.'
              : 'Please review the highlighted fields and correct any errors.',
          actionRequired: 'Complete required fields',
        };

      default:
        return {
          title: 'Something Went Wrong',
          description: 'We encountered an issue processing your request.',
          actionRequired:
            'Please try again or contact support if the problem persists',
          supportContact,
        };
    }
  }

  // =====================================================================================
  // CONTEXT EXTRACTION AND UTILITY METHODS
  // =====================================================================================

  private extractRequestContext(
    request: NextRequest,
    providedContext?: Partial<WeddingErrorContext>,
  ): WeddingErrorContext {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    return {
      requestId,
      timestamp,
      errorId: '',
      organizationId: providedContext?.organizationId || '',
      userType: providedContext?.userType || 'couple',
      endpoint: request.url || '/unknown',
      method: request.method || 'GET',
      statusCode: 500,
      responseTime: 0,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      databaseQueries: 0,
      correlationId: this.generateCorrelationId(),
      ...providedContext,
    };
  }

  private extractWeddingContext(
    context: WeddingErrorContext,
  ): StandardizedErrorResponse['weddingContext'] {
    if (!context.weddingId && !context.eventPhase && !context.vendorType) {
      return undefined;
    }

    const weddingContext: StandardizedErrorResponse['weddingContext'] = {};

    if (context.eventPhase) {
      weddingContext.phase = context.eventPhase;
    }

    if (context.vendorType) {
      weddingContext.vendorType = context.vendorType;
    }

    if (context.weddingDate) {
      const weddingDate = new Date(context.weddingDate);
      const now = new Date();
      weddingContext.daysToWedding = Math.ceil(
        (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    if (context.criticalPathAffected) {
      weddingContext.criticalPath = context.criticalPathAffected;
    }

    return weddingContext;
  }

  private extractValidationDetails(
    validationErrors: ZodError | any[],
  ): ValidationError[] {
    if (validationErrors instanceof ZodError) {
      return validationErrors.errors.map((error) => ({
        field: error.path.join('.'),
        code: error.code,
        message: error.message,
        receivedValue: error.received,
        expectedType: error.expected,
      }));
    }

    if (Array.isArray(validationErrors)) {
      return validationErrors.map((error) => ({
        field: error.field || 'unknown',
        code: error.code || 'invalid',
        message: error.message || 'Validation failed',
      }));
    }

    return [];
  }

  private buildDebugInfo(
    error: Error | any,
    analysis: ErrorAnalysis,
    context: WeddingErrorContext,
  ): StandardizedErrorResponse['debug'] {
    if (this.ENVIRONMENT === 'production') {
      // Limited debug info in production
      return {
        suggestions: this.generateDebugSuggestions(analysis, context),
      };
    }

    return {
      stack: error.stack,
      technicalDetails: {
        errorType: analysis.errorType,
        errorName: error.name,
        errorCode: analysis.apiErrorCode,
        context: {
          endpoint: context.endpoint,
          method: context.method,
          userType: context.userType,
          eventPhase: context.eventPhase,
        },
      },
      suggestions: this.generateDebugSuggestions(analysis, context),
    };
  }

  private getHttpStatusCode(errorCode: ApiErrorCode): number {
    const statusCodeMap: Record<ApiErrorCode, number> = {
      [ApiErrorCode.UNAUTHENTICATED]: 401,
      [ApiErrorCode.UNAUTHORIZED]: 403,
      [ApiErrorCode.TOKEN_EXPIRED]: 401,
      [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
      [ApiErrorCode.TIER_LIMIT_EXCEEDED]: 402,

      [ApiErrorCode.VALIDATION_FAILED]: 400,
      [ApiErrorCode.MISSING_REQUIRED_FIELDS]: 400,
      [ApiErrorCode.INVALID_DATA_FORMAT]: 400,
      [ApiErrorCode.BUSINESS_RULE_VIOLATION]: 422,

      [ApiErrorCode.RESOURCE_NOT_FOUND]: 404,
      [ApiErrorCode.RESOURCE_CONFLICT]: 409,
      [ApiErrorCode.RESOURCE_GONE]: 410,
      [ApiErrorCode.RESOURCE_LOCKED]: 423,

      [ApiErrorCode.WEDDING_DATE_INVALID]: 422,
      [ApiErrorCode.VENDOR_UNAVAILABLE]: 409,
      [ApiErrorCode.BOOKING_CONFLICT]: 409,
      [ApiErrorCode.WEDDING_DAY_LOCKDOWN]: 423,
      [ApiErrorCode.GUEST_COUNT_EXCEEDED]: 422,

      [ApiErrorCode.PAYMENT_FAILED]: 402,
      [ApiErrorCode.PAYMENT_DECLINED]: 402,
      [ApiErrorCode.PAYMENT_PROCESSING]: 202,
      [ApiErrorCode.SUBSCRIPTION_REQUIRED]: 402,
      [ApiErrorCode.BILLING_ISSUE]: 402,

      [ApiErrorCode.INTERNAL_SERVER_ERROR]: 500,
      [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
      [ApiErrorCode.TIMEOUT]: 504,
      [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 429,
      [ApiErrorCode.MAINTENANCE_MODE]: 503,

      [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
      [ApiErrorCode.INTEGRATION_TIMEOUT]: 504,
      [ApiErrorCode.WEBHOOK_DELIVERY_FAILED]: 500,

      [ApiErrorCode.FILE_TOO_LARGE]: 413,
      [ApiErrorCode.UNSUPPORTED_FILE_TYPE]: 415,
      [ApiErrorCode.UPLOAD_FAILED]: 500,
      [ApiErrorCode.STORAGE_QUOTA_EXCEEDED]: 507,
    };

    return statusCodeMap[errorCode] || 500;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapToErrorCategory(errorType: string): WeddingErrorCategory {
    const categoryMap: Record<string, WeddingErrorCategory> = {
      validation: WeddingErrorCategory.VALIDATION,
      auth: WeddingErrorCategory.AUTHENTICATION,
      payment: WeddingErrorCategory.PAYMENT,
      timeout: WeddingErrorCategory.PERFORMANCE,
      rate_limit: WeddingErrorCategory.PERFORMANCE,
      not_found: WeddingErrorCategory.BUSINESS_LOGIC,
      conflict: WeddingErrorCategory.BUSINESS_LOGIC,
      system: WeddingErrorCategory.BUSINESS_LOGIC,
    };

    return categoryMap[errorType] || WeddingErrorCategory.BUSINESS_LOGIC;
  }

  private mapToSeverity(
    businessImpact: string,
    context: WeddingErrorContext,
  ): WeddingErrorSeverity {
    if (context.eventPhase === 'wedding_day') {
      return WeddingErrorSeverity.CRITICAL;
    }

    switch (businessImpact) {
      case 'critical':
        return WeddingErrorSeverity.CRITICAL;
      case 'high':
        return WeddingErrorSeverity.HIGH;
      case 'medium':
        return WeddingErrorSeverity.MEDIUM;
      default:
        return WeddingErrorSeverity.LOW;
    }
  }

  private createFallbackErrorResponse(
    error: Error | any,
    request: NextRequest,
    processingTime: number,
  ): StandardizedErrorResponse {
    const requestId = this.generateRequestId();

    return {
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        type: WeddingErrorCategory.BUSINESS_LOGIC,
        severity: WeddingErrorSeverity.HIGH,
      },

      userMessage: {
        title: 'System Error',
        description:
          'We encountered an unexpected error. Our team has been notified.',
        actionRequired: 'Please try again or contact support',
        supportContact: 'support@wedsync.com',
      },

      request: {
        id: requestId,
        timestamp: new Date().toISOString(),
        endpoint: request.url || '/unknown',
        method: request.method || 'GET',
      },

      recovery: {
        canRetry: true,
        alternativeActions: ['Try again', 'Contact support'],
      },

      meta: {
        version: this.VERSION,
        environment: this.ENVIRONMENT,
        processingTime,
      },
    };
  }

  // Additional helper methods (simplified implementations)
  private assessBusinessImpact(
    error: Error | any,
    context: WeddingErrorContext,
  ): string {
    if (context.eventPhase === 'wedding_day') return 'critical';
    if (context.revenueImpact && context.revenueImpact > 5000) return 'high';
    return 'medium';
  }

  private extractWeddingSpecificContext(
    error: Error | any,
    context: WeddingErrorContext,
  ): Record<string, any> {
    return {
      weddingPhase: context.eventPhase,
      vendorType: context.vendorType,
      weddingId: context.weddingId,
    };
  }

  private isUserError(error: Error | any): boolean {
    return error instanceof ZodError || error.name?.includes('Validation');
  }

  private isSystemError(error: Error | any): boolean {
    return !this.isUserError(error);
  }

  private isWeddingDayCritical(context: WeddingErrorContext): boolean {
    return (
      context.eventPhase === 'wedding_day' ||
      (context.weddingDate && this.isWithin24Hours(context.weddingDate))
    );
  }

  private isWithin24Hours(weddingDate: string): boolean {
    const wedding = new Date(weddingDate);
    const now = new Date();
    const hoursDiff =
      Math.abs(wedding.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }

  private calculateRetryDelay(
    analysis: ErrorAnalysis,
    context: WeddingErrorContext,
  ): number | undefined {
    if (analysis.apiErrorCode === ApiErrorCode.RATE_LIMIT_EXCEEDED) {
      return context.eventPhase === 'wedding_day' ? 30 : 60; // Shorter delays on wedding day
    }
    return undefined;
  }

  private generateAlternativeActions(
    analysis: ErrorAnalysis,
    context: WeddingErrorContext,
  ): string[] {
    const actions: string[] = [];

    if (analysis.isUserError) {
      actions.push('Review your input and try again');
      actions.push('Check required fields');
    } else {
      actions.push('Try again in a few moments');
      actions.push('Contact support if the problem persists');
    }

    if (context.eventPhase === 'wedding_day') {
      actions.push('Call emergency support: emergency@wedsync.com');
    }

    return actions;
  }

  private generateValidationSuggestions(
    validationDetails: ValidationError[],
  ): string[] {
    const suggestions: string[] = [];

    validationDetails.forEach((detail) => {
      if (detail.code === 'required') {
        suggestions.push(`${detail.field} is required and cannot be empty`);
      } else if (detail.code === 'invalid_type') {
        suggestions.push(
          `${detail.field} must be a valid ${detail.expectedType}`,
        );
      }
    });

    return suggestions;
  }

  private generateDebugSuggestions(
    analysis: ErrorAnalysis,
    context: WeddingErrorContext,
  ): string[] {
    const suggestions: string[] = [];

    if (analysis.errorType === 'validation') {
      suggestions.push('Check request payload format');
      suggestions.push('Verify all required fields are present');
    } else if (analysis.errorType === 'auth') {
      suggestions.push('Verify authentication token');
      suggestions.push('Check user permissions');
    }

    return suggestions;
  }
}

// =====================================================================================
// HELPER INTERFACES
// =====================================================================================

interface ErrorAnalysis {
  errorType: string;
  apiErrorCode: ApiErrorCode;
  businessImpact: string;
  weddingSpecificContext: Record<string, any>;
  isUserError: boolean;
  isSystemError: boolean;
  isWeddingDayCritical: boolean;
  recommendedHttpStatus: number;
}

// =====================================================================================
// SINGLETON INSTANCE FOR APPLICATION USE
// =====================================================================================

export const apiErrorStandardizer = new ApiErrorStandardizer();

// =====================================================================================
// CONVENIENCE HELPER FUNCTIONS
// =====================================================================================

export async function handleApiError(
  error: Error | any,
  request: NextRequest,
  context?: Partial<WeddingErrorContext>,
): Promise<NextResponse> {
  return apiErrorStandardizer.handleApiError(error, request, context);
}

export function createValidationError(
  validationErrors: ZodError | any[],
  request: NextRequest,
  context?: Partial<WeddingErrorContext>,
): StandardizedErrorResponse {
  return apiErrorStandardizer.createValidationErrorResponse(
    validationErrors,
    request,
    context,
  );
}

export function createRateLimitError(
  rateLimitInfo: RateLimitInfo,
  request: NextRequest,
  context?: Partial<WeddingErrorContext>,
): StandardizedErrorResponse {
  return apiErrorStandardizer.createRateLimitErrorResponse(
    rateLimitInfo,
    request,
    context,
  );
}
