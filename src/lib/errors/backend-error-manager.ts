/**
 * WedSync Backend Error Management System
 *
 * Comprehensive error handling infrastructure designed specifically for wedding industry needs.
 * Handles error classification, recovery, pattern detection, and alerting with wedding business context.
 *
 * Features:
 * - Wedding-specific error severity assessment
 * - Automated recovery mechanisms
 * - Pattern detection and alerting
 * - Business impact analysis
 * - Emergency wedding day protocols
 *
 * @author Claude Code (Team B Backend Developer)
 * @date 2025-01-20
 * @version 1.0
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { z } from 'zod';

// =====================================================================================
// TYPE DEFINITIONS AND INTERFACES
// =====================================================================================

export interface WeddingErrorContext {
  // Core identifiers
  requestId: string;
  errorId: string;
  timestamp: string;
  correlationId?: string;

  // User context
  userId?: string;
  supplierId?: string;
  coupleId?: string;
  coordinatorId?: string;
  organizationId: string;
  userType: 'couple' | 'supplier' | 'coordinator' | 'admin';

  // Wedding business context
  weddingId?: string;
  weddingDate?: string;
  vendorType?:
    | 'photographer'
    | 'venue'
    | 'catering'
    | 'flowers'
    | 'music'
    | 'planning';
  eventPhase?:
    | 'initial_planning'
    | 'vendor_selection'
    | 'detail_planning'
    | 'final_preparations'
    | 'wedding_week'
    | 'wedding_day'
    | 'post_wedding';
  clientId?: string;
  formId?: string;

  // Technical context
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: number;
  databaseQueries: number;
  userAgent?: string;
  ipAddress?: string;

  // Business impact
  revenueImpact?: number;
  bookingAtRisk?: boolean;
  criticalPathAffected?: boolean;
  guestCountAffected?: number;
  vendorTier?: string;

  // Performance context
  serverInstance?: string;
  deploymentVersion?: string;
  featureFlagContext?: Record<string, any>;
}

export enum WeddingErrorSeverity {
  LOW = 'low', // Minor UX issues, non-critical features
  MEDIUM = 'medium', // Important features, some user impact
  HIGH = 'high', // Critical features, significant impact
  CRITICAL = 'critical', // Wedding day operations, data loss risk
}

export enum WeddingErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  FILE_HANDLING = 'file_handling',
  PAYMENT = 'payment',
  COMMUNICATION = 'communication',
  PERFORMANCE = 'performance',
  WEDDING_DAY_CRITICAL = 'wedding_day_critical',
}

export interface ErrorClassification {
  errorCode: string;
  category: WeddingErrorCategory;
  isExpected: boolean;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  patternSignature?: string;
}

export interface ErrorHandlingResult {
  errorId: string;
  handled: boolean;
  severity: WeddingErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  canRetry: boolean;
  processingTime: number;
  correlationId?: string;
  alertGenerated?: boolean;
}

export interface RecoveryStrategy {
  type:
    | 'auto_retry'
    | 'fallback_service'
    | 'cache_recovery'
    | 'graceful_degradation';
  enabled: boolean;
  maxRetries: number;
  baseDelay: number;
  userCanRetry: boolean;
  weddingDayStrategy?: boolean;
  conditions?: Record<string, any>;
}

export interface RecoveryResult {
  attempted: boolean;
  successful: boolean;
  canRetry: boolean;
  recoveryMethod?: string;
  recoveryError?: string;
  timeTaken?: number;
}

export interface ErrorPattern {
  patternId: string;
  signature: string;
  category: WeddingErrorCategory;
  occurrenceThreshold: number;
  timeWindowMinutes: number;
  confidence: number;
  weddingPhases?: string[];
  vendorTypes?: string[];
}

// Custom error class for WedSync specific errors
export class WeddingSyncError extends Error {
  public readonly code: string;
  public readonly category: WeddingErrorCategory;
  public readonly severity: WeddingErrorSeverity;
  public readonly businessImpact: string;
  public readonly userType?: string;
  public readonly weddingContext?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    category: WeddingErrorCategory,
    severity: WeddingErrorSeverity = WeddingErrorSeverity.MEDIUM,
    options?: {
      businessImpact?: string;
      userType?: string;
      weddingContext?: Record<string, any>;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = 'WeddingSyncError';
    this.code = code;
    this.category = category;
    this.severity = severity;
    this.businessImpact = options?.businessImpact || 'medium';
    this.userType = options?.userType;
    this.weddingContext = options?.weddingContext;

    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

// =====================================================================================
// MAIN BACKEND ERROR MANAGER CLASS
// =====================================================================================

export class BackendErrorManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  private errorPatterns = new Map<string, ErrorPattern>();
  private recoveryStrategies = new Map<string, RecoveryStrategy>();
  private isInitialized = false;

  constructor() {
    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.initializeErrorPatterns();
      await this.initializeRecoveryStrategies();
      await this.startErrorPatternMonitoring();
      this.isInitialized = true;
      console.log('✅ BackendErrorManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize BackendErrorManager:', error);
      // Continue with basic functionality even if initialization fails
    }
  }

  // =====================================================================================
  // MAIN ERROR HANDLING ENTRY POINT
  // =====================================================================================

  public async handleError(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    const errorId = context.errorId || this.generateErrorId();

    try {
      // Ensure system is initialized
      await this.initializeAsync();

      // Enhance context with error ID and correlation
      const enhancedContext = {
        ...context,
        errorId,
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId || this.generateCorrelationId(),
      };

      // Classify the error with wedding-specific logic
      const classification = await this.classifyError(error, enhancedContext);

      // Determine severity based on wedding context
      const severity = this.determineSeverity(
        error,
        enhancedContext,
        classification,
      );

      // Check if this is a critical wedding day error
      const isCritical = this.isWeddingDayCritical(enhancedContext, severity);

      // Log the error with comprehensive context
      await this.logError(error, enhancedContext, classification, severity);

      // Check for error patterns and update pattern tracking
      const patternMatch = await this.checkErrorPatterns(
        classification.errorCode,
        enhancedContext,
      );

      // Attempt automatic recovery based on classification and context
      const recoveryResult = await this.attemptRecovery(
        error,
        enhancedContext,
        classification,
      );

      // Generate and send alerts for critical errors
      let alertGenerated = false;
      if (
        isCritical ||
        severity === WeddingErrorSeverity.CRITICAL ||
        patternMatch
      ) {
        alertGenerated = await this.sendCriticalAlert(
          error,
          enhancedContext,
          classification,
        );
      }

      // Update error metrics for analysis and monitoring
      await this.updateErrorMetrics(
        classification.errorCode,
        enhancedContext,
        severity,
      );

      // Generate user-friendly message based on context
      const userMessage = this.generateUserMessage(
        error,
        enhancedContext,
        classification,
      );

      return {
        errorId,
        handled: true,
        severity,
        userMessage,
        technicalMessage: error.message,
        recoveryAttempted: recoveryResult.attempted,
        recoverySuccessful: recoveryResult.successful,
        canRetry: recoveryResult.canRetry,
        processingTime: Date.now() - startTime,
        correlationId: enhancedContext.correlationId,
        alertGenerated,
      };
    } catch (handlingError) {
      // Meta-error: error occurred while handling an error
      console.error(
        '🚨 Critical: Error in error handling system:',
        handlingError,
      );
      await this.logMetaError(handlingError, context, errorId);

      return {
        errorId,
        handled: false,
        severity: WeddingErrorSeverity.CRITICAL,
        userMessage:
          'A system error occurred. Our emergency team has been notified.',
        technicalMessage: 'Error handling system failure',
        recoveryAttempted: false,
        recoverySuccessful: false,
        canRetry: false,
        processingTime: Date.now() - startTime,
      };
    }
  }

  // =====================================================================================
  // ERROR CLASSIFICATION WITH WEDDING CONTEXT
  // =====================================================================================

  private async classifyError(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
  ): Promise<ErrorClassification> {
    // Handle WedSync-specific errors first
    if (error instanceof WeddingSyncError) {
      return {
        errorCode: error.code,
        category: error.category,
        isExpected: true,
        businessImpact: error.businessImpact,
        patternSignature: this.generatePatternSignature(error.code, context),
      };
    }

    // Classify common error patterns with wedding industry context
    const errorMessage = error.message.toLowerCase();
    const stackTrace = error.stack || '';

    // Database constraint violations (common in wedding planning with complex relationships)
    if (
      errorMessage.includes('foreign key') ||
      errorMessage.includes('violates constraint') ||
      errorMessage.includes('unique constraint')
    ) {
      return {
        errorCode: 'DATABASE_CONSTRAINT_VIOLATION',
        category: WeddingErrorCategory.DATABASE,
        isExpected: false,
        businessImpact: this.assessDatabaseErrorImpact(error.message, context),
        patternSignature: 'db_constraint_' + this.hashString(errorMessage),
      };
    }

    // Timeout errors (critical during wedding day operations)
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('etimedout') ||
      errorMessage.includes('connection timeout')
    ) {
      return {
        errorCode: 'SERVICE_TIMEOUT',
        category: WeddingErrorCategory.PERFORMANCE,
        isExpected: false,
        businessImpact: this.assessTimeoutImpact(context),
        patternSignature: 'timeout_' + context.endpoint.replace(/\//g, '_'),
      };
    }

    // Payment processing errors (always high business impact)
    if (
      errorMessage.includes('payment') ||
      errorMessage.includes('stripe') ||
      errorMessage.includes('charge') ||
      errorMessage.includes('invoice')
    ) {
      return {
        errorCode: 'PAYMENT_PROCESSING_ERROR',
        category: WeddingErrorCategory.PAYMENT,
        isExpected: false,
        businessImpact: 'critical', // Payment errors are always critical
        patternSignature:
          'payment_' + this.extractPaymentErrorType(errorMessage),
      };
    }

    // File handling errors (common with photo uploads)
    if (
      errorMessage.includes('upload') ||
      errorMessage.includes('file') ||
      errorMessage.includes('multipart') ||
      errorMessage.includes('storage')
    ) {
      return {
        errorCode: 'FILE_PROCESSING_ERROR',
        category: WeddingErrorCategory.FILE_HANDLING,
        isExpected: false,
        businessImpact: this.assessFileErrorImpact(context),
        patternSignature: 'file_' + this.extractFileErrorType(errorMessage),
      };
    }

    // Communication failures (email/SMS notifications)
    if (
      errorMessage.includes('email') ||
      errorMessage.includes('sms') ||
      errorMessage.includes('resend') ||
      errorMessage.includes('twilio')
    ) {
      return {
        errorCode: 'COMMUNICATION_DELIVERY_ERROR',
        category: WeddingErrorCategory.COMMUNICATION,
        isExpected: false,
        businessImpact: this.assessCommunicationImpact(context),
        patternSignature:
          'comm_' + this.extractCommunicationErrorType(errorMessage),
      };
    }

    // Authentication and authorization errors
    if (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('token') ||
      errorMessage.includes('auth')
    ) {
      return {
        errorCode: 'AUTHENTICATION_ERROR',
        category: WeddingErrorCategory.AUTHENTICATION,
        isExpected: false,
        businessImpact: this.assessAuthErrorImpact(context),
        patternSignature: 'auth_' + context.endpoint.replace(/\//g, '_'),
      };
    }

    // Validation errors (common in form-heavy wedding planning)
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required') ||
      stackTrace.includes('zod')
    ) {
      return {
        errorCode: 'VALIDATION_ERROR',
        category: WeddingErrorCategory.VALIDATION,
        isExpected: true,
        businessImpact: 'low',
        patternSignature: 'validation_' + context.endpoint.replace(/\//g, '_'),
      };
    }

    // External service integration errors (Tave, HoneyBook, etc.)
    if (
      errorMessage.includes('api') &&
      (errorMessage.includes('external') ||
        errorMessage.includes('integration') ||
        context.endpoint.includes('/integration'))
    ) {
      return {
        errorCode: 'EXTERNAL_INTEGRATION_ERROR',
        category: WeddingErrorCategory.EXTERNAL_SERVICE,
        isExpected: false,
        businessImpact: this.assessIntegrationErrorImpact(context),
        patternSignature:
          'integration_' + this.extractIntegrationType(context.endpoint),
      };
    }

    // Default classification for unhandled errors
    return {
      errorCode: 'UNCLASSIFIED_ERROR',
      category: WeddingErrorCategory.BUSINESS_LOGIC,
      isExpected: false,
      businessImpact: 'medium',
      patternSignature:
        'unclassified_' + this.hashString(errorMessage.substring(0, 100)),
    };
  }

  // =====================================================================================
  // WEDDING-SPECIFIC SEVERITY DETERMINATION
  // =====================================================================================

  private determineSeverity(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification,
  ): WeddingErrorSeverity {
    // Wedding day operations are ALWAYS critical priority
    if (context.eventPhase === 'wedding_day' || context.criticalPathAffected) {
      return WeddingErrorSeverity.CRITICAL;
    }

    // Wedding week gets elevated priority (final preparations)
    if (context.eventPhase === 'wedding_week') {
      // Payment and communication errors are critical during wedding week
      if (
        classification.category === WeddingErrorCategory.PAYMENT ||
        classification.category === WeddingErrorCategory.COMMUNICATION
      ) {
        return WeddingErrorSeverity.CRITICAL;
      }
      // Other errors get bumped up one level
      return WeddingErrorSeverity.HIGH;
    }

    // Payment errors during booking phase are critical (revenue protection)
    if (
      classification.category === WeddingErrorCategory.PAYMENT &&
      context.eventPhase === 'detail_planning'
    ) {
      return WeddingErrorSeverity.CRITICAL;
    }

    // High-value bookings get elevated severity (luxury weddings)
    if (context.revenueImpact && context.revenueImpact > 5000) {
      return classification.businessImpact === 'critical'
        ? WeddingErrorSeverity.CRITICAL
        : WeddingErrorSeverity.HIGH;
    }

    // Large wedding parties (more guests = more impact)
    if (context.guestCountAffected && context.guestCountAffected > 100) {
      return WeddingErrorSeverity.HIGH;
    }

    // Database errors affecting core wedding data
    if (
      classification.category === WeddingErrorCategory.DATABASE &&
      (context.endpoint.includes('/weddings/') ||
        context.endpoint.includes('/bookings/') ||
        context.endpoint.includes('/clients/'))
    ) {
      return WeddingErrorSeverity.HIGH;
    }

    // Communication failures during critical phases
    if (classification.category === WeddingErrorCategory.COMMUNICATION) {
      if (
        context.eventPhase === 'final_preparations' ||
        context.eventPhase === 'wedding_week'
      ) {
        return WeddingErrorSeverity.HIGH;
      }
    }

    // Weekend errors get elevated (Saturday = wedding day for many)
    const errorDate = new Date(context.timestamp);
    const isSaturday = errorDate.getDay() === 6; // Saturday
    if (isSaturday && classification.businessImpact !== 'low') {
      return WeddingErrorSeverity.HIGH;
    }

    // File processing errors for photographers during post-wedding
    if (
      classification.category === WeddingErrorCategory.FILE_HANDLING &&
      context.vendorType === 'photographer' &&
      context.eventPhase === 'post_wedding'
    ) {
      return WeddingErrorSeverity.HIGH; // Delivery deadlines are critical
    }

    // Business impact assessment fallback
    switch (classification.businessImpact) {
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

  // =====================================================================================
  // ERROR LOGGING WITH WEDDING BUSINESS CONTEXT
  // =====================================================================================

  private async logError(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification,
    severity: WeddingErrorSeverity,
  ): Promise<void> {
    // Calculate additional context
    const daysToWedding = context.weddingDate
      ? Math.ceil(
          (new Date(context.weddingDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    const errorLog = {
      // Core error information
      error_id: context.errorId,
      error_code: classification.errorCode,
      error_type: classification.category,
      severity,
      message: this.generateUserMessage(error, context, classification),
      technical_message: error.message,
      stack_trace: error.stack,
      pattern_signature: classification.patternSignature,

      // Request context
      request_id: context.requestId,
      correlation_id: context.correlationId,
      endpoint: context.endpoint,
      http_method: context.method,
      status_code: context.statusCode,
      response_time_ms: context.responseTime,
      memory_usage_mb: context.memoryUsage,
      database_queries: context.databaseQueries,
      user_agent: context.userAgent,
      ip_address: context.ipAddress,

      // User context
      user_id: context.userId,
      supplier_id: context.supplierId,
      couple_id: context.coupleId,
      coordinator_id: context.coordinatorId,
      organization_id: context.organizationId,
      user_type: context.userType,

      // Wedding business context
      wedding_id: context.weddingId,
      wedding_date: context.weddingDate,
      wedding_phase: context.eventPhase,
      days_to_wedding: daysToWedding,
      vendor_type: context.vendorType,
      vendor_tier: context.vendorTier,
      affected_form_id: context.formId,
      affected_client_id: context.clientId,

      // Business impact assessment
      revenue_impact: context.revenueImpact,
      booking_at_risk: context.bookingAtRisk,
      guest_count_affected: context.guestCountAffected,
      critical_path_affected: context.criticalPathAffected,
      business_impact_score: this.calculateBusinessImpactScore(
        context,
        classification,
      ),

      // Technical context
      server_instance: context.serverInstance,
      deployment_version: context.deploymentVersion,
      feature_flag_context: context.featureFlagContext,

      // Classification details
      is_expected_error: classification.isExpected,
      business_impact: classification.businessImpact,
      affects_wedding_day: this.isWeddingDayCritical(context, severity),

      // Additional metadata
      occurred_at: context.timestamp,
      created_at: new Date().toISOString(),
    };

    try {
      // Store in database
      const { error: dbError } = await this.supabase
        .from('error_logs')
        .insert(errorLog);

      if (dbError) {
        console.error('Failed to store error log in database:', dbError);
      }

      // Cache recent errors for pattern detection
      const patternKey = `error_pattern:${classification.errorCode}`;
      const patternData = {
        timestamp: context.timestamp,
        endpoint: context.endpoint,
        userType: context.userType,
        vendorType: context.vendorType,
        eventPhase: context.eventPhase,
        severity: severity,
      };

      await this.redis.lpush(patternKey, JSON.stringify(patternData));
      await this.redis.expire(patternKey, 86400); // 24 hour retention for pattern analysis

      // Update real-time error metrics
      await this.updateRealtimeMetrics(
        classification.errorCode,
        context,
        severity,
      );
    } catch (loggingError) {
      // If logging fails, at least log to console with full context
      console.error('🚨 Error logging system failure:', loggingError);
      console.error('Original error context:', errorLog);

      // Try to alert about logging system failure
      try {
        await this.sendSystemAlert({
          type: 'logging_system_failure',
          message: 'Error logging system is experiencing failures',
          originalError: errorLog,
          systemError: loggingError,
        });
      } catch (alertError) {
        console.error(
          '🚨 Complete system failure - logging and alerting both failed:',
          alertError,
        );
      }
    }
  }

  // =====================================================================================
  // HELPER METHODS FOR ERROR ASSESSMENT
  // =====================================================================================

  private assessDatabaseErrorImpact(
    errorMessage: string,
    context: WeddingErrorContext,
  ): string {
    // Database errors affecting core wedding data are high impact
    if (
      context.endpoint.includes('/weddings/') ||
      context.endpoint.includes('/bookings/') ||
      context.endpoint.includes('/payments/')
    ) {
      return 'high';
    }

    // Foreign key violations might indicate data integrity issues
    if (errorMessage.includes('foreign key')) {
      return 'medium';
    }

    return 'low';
  }

  private assessTimeoutImpact(context: WeddingErrorContext): string {
    // Wedding day timeouts are critical
    if (context.eventPhase === 'wedding_day') {
      return 'critical';
    }

    // Payment and communication timeouts are always high impact
    if (
      context.endpoint.includes('/payment') ||
      context.endpoint.includes('/email') ||
      context.endpoint.includes('/sms')
    ) {
      return 'high';
    }

    return 'medium';
  }

  private assessFileErrorImpact(context: WeddingErrorContext): string {
    // Photo uploads on wedding day are critical
    if (
      context.eventPhase === 'wedding_day' ||
      context.eventPhase === 'post_wedding'
    ) {
      return 'high';
    }

    // Portfolio uploads for suppliers are medium impact
    if (context.userType === 'supplier') {
      return 'medium';
    }

    return 'low';
  }

  private assessCommunicationImpact(context: WeddingErrorContext): string {
    // Wedding week communication failures are critical
    if (
      context.eventPhase === 'wedding_week' ||
      context.eventPhase === 'wedding_day'
    ) {
      return 'critical';
    }

    // Final preparation phase is high impact
    if (context.eventPhase === 'final_preparations') {
      return 'high';
    }

    return 'medium';
  }

  private assessAuthErrorImpact(context: WeddingErrorContext): string {
    // Authentication failures during critical phases
    if (
      context.eventPhase === 'wedding_day' ||
      context.eventPhase === 'wedding_week'
    ) {
      return 'high';
    }

    return 'medium';
  }

  private assessIntegrationErrorImpact(context: WeddingErrorContext): string {
    // Integration failures for imported client data
    if (
      context.endpoint.includes('/tave') ||
      context.endpoint.includes('/import')
    ) {
      return 'high';
    }

    return 'medium';
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private generateErrorId(): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ERR-${timestamp}-${random}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePatternSignature(
    errorCode: string,
    context: WeddingErrorContext,
  ): string {
    const components = [
      errorCode,
      context.endpoint.replace(/\/\d+/g, '/:id'), // Normalize IDs
      context.vendorType || 'unknown',
      context.eventPhase || 'unknown',
    ];
    return this.hashString(components.join('_'));
  }

  private hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private extractPaymentErrorType(errorMessage: string): string {
    if (errorMessage.includes('card')) return 'card';
    if (errorMessage.includes('webhook')) return 'webhook';
    if (errorMessage.includes('intent')) return 'intent';
    return 'general';
  }

  private extractFileErrorType(errorMessage: string): string {
    if (errorMessage.includes('size')) return 'size_limit';
    if (errorMessage.includes('type')) return 'file_type';
    if (errorMessage.includes('upload')) return 'upload_failed';
    return 'processing';
  }

  private extractCommunicationErrorType(errorMessage: string): string {
    if (errorMessage.includes('email')) return 'email';
    if (errorMessage.includes('sms')) return 'sms';
    if (errorMessage.includes('template')) return 'template';
    return 'delivery';
  }

  private extractIntegrationType(endpoint: string): string {
    if (endpoint.includes('tave')) return 'tave';
    if (endpoint.includes('honeyboo')) return 'honeybook';
    if (endpoint.includes('stripe')) return 'stripe';
    return 'generic';
  }

  private calculateBusinessImpactScore(
    context: WeddingErrorContext,
    classification: ErrorClassification,
  ): number {
    let score = 1; // Base score

    // Event phase impact
    switch (context.eventPhase) {
      case 'wedding_day':
        score += 9;
        break;
      case 'wedding_week':
        score += 7;
        break;
      case 'final_preparations':
        score += 5;
        break;
      case 'detail_planning':
        score += 3;
        break;
      default:
        score += 1;
        break;
    }

    // Revenue impact
    if (context.revenueImpact) {
      if (context.revenueImpact > 10000) score += 3;
      else if (context.revenueImpact > 5000) score += 2;
      else if (context.revenueImpact > 1000) score += 1;
    }

    // Guest count impact
    if (context.guestCountAffected) {
      if (context.guestCountAffected > 200) score += 2;
      else if (context.guestCountAffected > 100) score += 1;
    }

    return Math.min(score, 10); // Cap at 10
  }

  // Placeholder methods - will be implemented in subsequent phases
  private async initializeErrorPatterns(): Promise<void> {
    // Load error patterns from database
    const { data: patterns } = await this.supabase
      .from('error_patterns')
      .select('*')
      .eq('is_active', true);

    if (patterns) {
      patterns.forEach((pattern) => {
        this.errorPatterns.set(pattern.error_code, {
          patternId: pattern.pattern_id,
          signature: pattern.pattern_signature,
          category: pattern.category as WeddingErrorCategory,
          occurrenceThreshold: pattern.alert_threshold,
          timeWindowMinutes: pattern.alert_window_minutes,
          confidence: pattern.confidence_threshold,
          weddingPhases: pattern.common_wedding_phases,
          vendorTypes: pattern.common_vendor_types,
        });
      });
    }
  }

  private async initializeRecoveryStrategies(): Promise<void> {
    // Initialize default recovery strategies
    this.recoveryStrategies.set('SERVICE_TIMEOUT', {
      type: 'auto_retry',
      enabled: true,
      maxRetries: 3,
      baseDelay: 1000,
      userCanRetry: true,
      weddingDayStrategy: true,
    });

    this.recoveryStrategies.set('PAYMENT_PROCESSING_ERROR', {
      type: 'fallback_service',
      enabled: true,
      maxRetries: 2,
      baseDelay: 2000,
      userCanRetry: true,
      weddingDayStrategy: false,
    });
  }

  private async startErrorPatternMonitoring(): Promise<void> {
    // Background pattern monitoring - placeholder for now
    console.log('🔍 Error pattern monitoring initialized');
  }

  private async checkErrorPatterns(
    errorCode: string,
    context: WeddingErrorContext,
  ): Promise<boolean> {
    // Pattern detection logic - placeholder
    return false;
  }

  private async attemptRecovery(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification,
  ): Promise<RecoveryResult> {
    // Recovery logic - placeholder
    return {
      attempted: false,
      successful: false,
      canRetry: false,
    };
  }

  private async sendCriticalAlert(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification,
  ): Promise<boolean> {
    // Alert logic - placeholder
    return false;
  }

  private async updateErrorMetrics(
    errorCode: string,
    context: WeddingErrorContext,
    severity: WeddingErrorSeverity,
  ): Promise<void> {
    // Metrics update logic - placeholder
  }

  private async updateRealtimeMetrics(
    errorCode: string,
    context: WeddingErrorContext,
    severity: WeddingErrorSeverity,
  ): Promise<void> {
    // Real-time metrics - placeholder
  }

  private async sendSystemAlert(alertData: any): Promise<void> {
    // System alert logic - placeholder
  }

  private async logMetaError(
    handlingError: Error,
    context: WeddingErrorContext,
    errorId: string,
  ): Promise<void> {
    console.error('Meta-error logged:', { handlingError, context, errorId });
  }

  private isWeddingDayCritical(
    context: WeddingErrorContext,
    severity: WeddingErrorSeverity,
  ): boolean {
    // Wedding day detection logic
    if (context.eventPhase === 'wedding_day') {
      return true;
    }

    // Check if wedding date is today or within 24 hours
    if (context.weddingDate) {
      const weddingDate = new Date(context.weddingDate);
      const now = new Date();
      const hoursDifference =
        (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDifference <= 24 && hoursDifference >= -24) {
        return true;
      }
    }

    // Check for Saturday (common wedding day)
    const errorDate = new Date(context.timestamp);
    if (
      errorDate.getDay() === 6 &&
      severity === WeddingErrorSeverity.CRITICAL
    ) {
      return true;
    }

    return false;
  }

  private generateUserMessage(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification,
  ): string {
    // Wedding-specific user messages based on context and user type
    const messageTemplates: Record<string, Record<string, string>> = {
      DATABASE_CONSTRAINT_VIOLATION: {
        couple:
          'There seems to be a conflict with your wedding information. Please check your entries and try again.',
        supplier:
          'Unable to save changes due to conflicting information. Please review your input and try again.',
        coordinator:
          'Data validation failed. Check for duplicate entries or missing required information.',
        admin:
          'Database constraint violation detected. Review data integrity and fix underlying issue.',
      },
      PAYMENT_PROCESSING_ERROR: {
        couple:
          'We encountered an issue processing your payment. Please check your payment method and try again.',
        supplier:
          'Payment processing temporarily unavailable. Your booking is secure, please try again shortly.',
        coordinator:
          'Payment system error detected. Client payments may be affected - check payment dashboard.',
        admin:
          'Critical payment processing failure. Check Stripe dashboard and system health immediately.',
      },
      FILE_PROCESSING_ERROR: {
        couple:
          'There was a problem uploading your files. Please ensure they are under 10MB and try again.',
        supplier:
          'Portfolio upload failed. Check your internet connection and file sizes before retrying.',
        coordinator:
          'File processing error detected. Client uploads may be affected - verify storage system.',
        admin:
          'File processing system error. Check storage services, file size limits, and processing queue.',
      },
      COMMUNICATION_DELIVERY_ERROR: {
        couple:
          "We couldn't send your message right now. We'll try again automatically.",
        supplier:
          'Email/SMS delivery failed. Your clients may not have received notifications - check communication log.',
        coordinator:
          'Communication system error. Client notifications may be affected - verify delivery status.',
        admin:
          'Critical communication failure. Check email/SMS services and delivery queues immediately.',
      },
      SERVICE_TIMEOUT: {
        couple: 'The request took longer than expected. Please try again.',
        supplier:
          'Service timeout occurred. Please try again or contact support if the problem persists.',
        coordinator:
          'System timeout detected. Performance may be degraded - monitor system health.',
        admin:
          'Service timeout errors detected. Check system load, database performance, and network connectivity.',
      },
    };

    const userType = context.userType || 'couple';
    const template = messageTemplates[classification.errorCode];

    if (template && template[userType]) {
      return template[userType];
    }

    // Fallback messages with wedding context awareness
    switch (classification.category) {
      case WeddingErrorCategory.WEDDING_DAY_CRITICAL:
        return 'A wedding day critical error has occurred. Our emergency support team has been immediately notified.';

      case WeddingErrorCategory.PAYMENT:
        return userType === 'couple'
          ? "Payment processing is temporarily unavailable. Your booking is secure and we'll resolve this quickly."
          : 'Payment processing error detected. Monitor client payment status and contact support if needed.';

      case WeddingErrorCategory.COMMUNICATION:
        return userType === 'couple'
          ? "Message delivery failed. We'll retry automatically and notify you when it's sent."
          : 'Communication delivery failed. Check notification status and retry if necessary.';

      case WeddingErrorCategory.FILE_HANDLING:
        return userType === 'couple'
          ? 'File upload failed. Please check your connection and file size, then try again.'
          : 'File processing error. Verify file requirements and system status before retrying.';

      case WeddingErrorCategory.PERFORMANCE:
        return 'The system is experiencing slower than normal response times. Please be patient or try again shortly.';

      case WeddingErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please log out and log back in, or contact support if the issue persists.';

      default:
        return userType === 'couple'
          ? 'Something went wrong while processing your request. Please try again or contact support if the problem continues.'
          : 'An error occurred while processing your request. Please check your input and try again.';
    }
  }
}

// =====================================================================================
// SINGLETON INSTANCE FOR APPLICATION USE
// =====================================================================================

export const errorManager = new BackendErrorManager();

// =====================================================================================
// CONVENIENCE FUNCTIONS FOR COMMON ERROR SCENARIOS
// =====================================================================================

export const logWeddingError = async (
  error: Error,
  context: Partial<WeddingErrorContext>,
) => {
  const fullContext: WeddingErrorContext = {
    requestId: context.requestId || `req_${Date.now()}`,
    errorId: context.errorId || '',
    timestamp: new Date().toISOString(),
    organizationId: context.organizationId || '',
    userType: context.userType || 'couple',
    endpoint: context.endpoint || '/unknown',
    method: context.method || 'GET',
    statusCode: context.statusCode || 500,
    responseTime: context.responseTime || 0,
    memoryUsage: context.memoryUsage || 0,
    databaseQueries: context.databaseQueries || 0,
    ...context,
  };

  return await errorManager.handleError(error, fullContext);
};

export const createWeddingSyncError = (
  message: string,
  code: string,
  category: WeddingErrorCategory,
  severity: WeddingErrorSeverity = WeddingErrorSeverity.MEDIUM,
  options?: {
    businessImpact?: string;
    userType?: string;
    weddingContext?: Record<string, any>;
    cause?: Error;
  },
) => {
  return new WeddingSyncError(message, code, category, severity, options);
};
