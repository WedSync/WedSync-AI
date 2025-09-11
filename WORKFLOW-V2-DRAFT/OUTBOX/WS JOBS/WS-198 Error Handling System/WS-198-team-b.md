# WS-198: Error Handling System - Team B Backend Developer

## ROLE: Backend Error Handling Architect
You are Team B, the Backend Developer for WedSync, responsible for building robust server-side error handling infrastructure that captures, classifies, logs, and manages errors across all wedding coordination workflows. Your focus is on creating enterprise-grade error management systems that ensure zero data loss during critical wedding planning moments and provide comprehensive error recovery mechanisms.

## FEATURE CONTEXT: Error Handling System
Building a comprehensive error handling infrastructure for WedSync's wedding coordination platform that handles validation errors, service failures, database issues, and third-party integration problems. This system must provide graceful degradation during peak wedding season, comprehensive error logging with wedding-specific context, and automatic recovery strategies for critical wedding workflows.

## YOUR IMPLEMENTATION FOCUS
Your Team B implementation must include:

1. **Centralized Error Management System**
   - Wedding-industry specific error codes and classifications
   - Comprehensive error logging with business context
   - Error pattern detection and alerting
   - Automatic error recovery and retry mechanisms

2. **Database Error Tracking**
   - Structured error storage with wedding workflow context
   - Error pattern analysis and trending
   - Resolution tracking and knowledge management
   - Performance impact monitoring

3. **API Error Handling**
   - Standardized error response formats
   - Context-aware error messages for different user types
   - Graceful degradation strategies for critical paths
   - Error correlation and distributed tracing

4. **Integration Error Management**
   - Third-party service failure handling
   - Webhook error processing and retry logic
   - Circuit breaker patterns for external dependencies
   - Fallback strategies for critical wedding operations

## IMPLEMENTATION REQUIREMENTS

### 1. Core Error Management Infrastructure
```typescript
// /wedsync/src/lib/errors/backend-error-manager.ts
import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';
import { z } from 'zod';

interface WeddingErrorContext {
  // Core identifiers
  requestId: string;
  errorId: string;
  timestamp: string;
  
  // User context
  userId?: string;
  supplierId?: string;
  coupleId?: string;
  coordinatorId?: string;
  userType: 'couple' | 'supplier' | 'coordinator' | 'admin';
  
  // Wedding business context
  weddingId?: string;
  weddingDate?: string;
  vendorType?: 'photographer' | 'venue' | 'catering' | 'flowers' | 'music' | 'planning';
  eventPhase?: 'planning' | 'booking' | 'final_preparations' | 'wedding_day' | 'post_wedding';
  clientId?: string;
  formId?: string;
  
  // Technical context
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: number;
  databaseQueries: number;
  
  // Business impact
  revenue_impact?: number;
  booking_at_risk?: boolean;
  critical_path_affected?: boolean;
  guest_count_affected?: number;
}

export enum WeddingErrorSeverity {
  LOW = 'low',              // Minor UX issues, non-critical features
  MEDIUM = 'medium',        // Important features, some user impact
  HIGH = 'high',           // Critical features, significant impact
  CRITICAL = 'critical'     // Wedding day operations, data loss risk
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
  WEDDING_DAY_CRITICAL = 'wedding_day_critical'
}

export class BackendErrorManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  private redis = new Redis(process.env.REDIS_URL!);
  private errorPatterns = new Map<string, ErrorPattern>();
  private recoveryStrategies = new Map<string, RecoveryStrategy>();

  constructor() {
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
    this.startErrorPatternMonitoring();
  }

  async handleError(error: Error | WeddingSyncError, context: WeddingErrorContext): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Enhance context with error ID
      const enhancedContext = { ...context, errorId, timestamp: new Date().toISOString() };
      
      // Classify the error
      const classification = await this.classifyError(error, enhancedContext);
      
      // Determine severity based on wedding context
      const severity = this.determineSeverity(error, enhancedContext, classification);
      
      // Check if this is a critical wedding day error
      const isCritical = this.isWeddingDayCritical(enhancedContext, severity);
      
      // Log the error with full context
      await this.logError(error, enhancedContext, classification, severity);
      
      // Check for error patterns
      const patternMatch = await this.checkErrorPatterns(classification.errorCode, enhancedContext);
      
      // Attempt automatic recovery
      const recoveryResult = await this.attemptRecovery(error, enhancedContext, classification);
      
      // Send alerts for critical errors
      if (isCritical || severity === WeddingErrorSeverity.CRITICAL) {
        await this.sendCriticalAlert(error, enhancedContext, classification);
      }
      
      // Update error metrics
      await this.updateErrorMetrics(classification.errorCode, enhancedContext, severity);
      
      return {
        errorId,
        handled: true,
        severity,
        userMessage: this.generateUserMessage(error, enhancedContext, classification),
        technicalMessage: error.message,
        recoveryAttempted: recoveryResult.attempted,
        recoverySuccessful: recoveryResult.successful,
        canRetry: recoveryResult.canRetry,
        processingTime: Date.now() - startTime
      };
      
    } catch (handlingError) {
      // Meta-error: error in error handling
      console.error('Error in error handling:', handlingError);
      await this.logMetaError(handlingError, context, errorId);
      
      return {
        errorId,
        handled: false,
        severity: WeddingErrorSeverity.CRITICAL,
        userMessage: 'A system error occurred. Our team has been notified.',
        technicalMessage: 'Error handling system failure',
        recoveryAttempted: false,
        recoverySuccessful: false,
        canRetry: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  private async classifyError(error: Error | WeddingSyncError, context: WeddingErrorContext): Promise<ErrorClassification> {
    // Wedding-specific error classification
    if (error instanceof WeddingSyncError) {
      return {
        errorCode: error.code,
        category: error.category,
        isExpected: true,
        businessImpact: error.businessImpact || 'low'
      };
    }

    // Classify common errors with wedding context
    if (error.message.includes('FOREIGN KEY') || error.message.includes('violates constraint')) {
      return {
        errorCode: 'DATABASE_CONSTRAINT_VIOLATION',
        category: WeddingErrorCategory.DATABASE,
        isExpected: false,
        businessImpact: this.assessDatabaseErrorImpact(error.message, context)
      };
    }

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return {
        errorCode: 'SERVICE_TIMEOUT',
        category: WeddingErrorCategory.PERFORMANCE,
        isExpected: false,
        businessImpact: this.assessTimeoutImpact(context)
      };
    }

    if (error.message.includes('payment') || error.message.includes('stripe')) {
      return {
        errorCode: 'PAYMENT_PROCESSING_ERROR',
        category: WeddingErrorCategory.PAYMENT,
        isExpected: false,
        businessImpact: 'high' // Payment errors always have high business impact
      };
    }

    if (error.message.includes('upload') || error.message.includes('file')) {
      return {
        errorCode: 'FILE_PROCESSING_ERROR',
        category: WeddingErrorCategory.FILE_HANDLING,
        isExpected: false,
        businessImpact: this.assessFileErrorImpact(context)
      };
    }

    if (error.message.includes('email') || error.message.includes('sms')) {
      return {
        errorCode: 'COMMUNICATION_DELIVERY_ERROR',
        category: WeddingErrorCategory.COMMUNICATION,
        isExpected: false,
        businessImpact: this.assessCommunicationImpact(context)
      };
    }

    // Default classification
    return {
      errorCode: 'UNCLASSIFIED_ERROR',
      category: WeddingErrorCategory.BUSINESS_LOGIC,
      isExpected: false,
      businessImpact: 'medium'
    };
  }

  private determineSeverity(
    error: Error | WeddingSyncError, 
    context: WeddingErrorContext, 
    classification: ErrorClassification
  ): WeddingErrorSeverity {
    // Wedding day operations are always critical
    if (context.eventPhase === 'wedding_day' || context.critical_path_affected) {
      return WeddingErrorSeverity.CRITICAL;
    }

    // Payment errors during booking are critical
    if (classification.category === WeddingErrorCategory.PAYMENT && context.eventPhase === 'booking') {
      return WeddingErrorSeverity.CRITICAL;
    }

    // High-value bookings get elevated severity
    if (context.revenue_impact && context.revenue_impact > 5000) {
      return WeddingErrorSeverity.HIGH;
    }

    // Large wedding party issues are more severe
    if (context.guest_count_affected && context.guest_count_affected > 100) {
      return WeddingErrorSeverity.HIGH;
    }

    // Database errors affecting critical data
    if (classification.category === WeddingErrorCategory.DATABASE && 
        (context.endpoint.includes('/weddings/') || context.endpoint.includes('/bookings/'))) {
      return WeddingErrorSeverity.HIGH;
    }

    // Communication failures during final preparations
    if (classification.category === WeddingErrorCategory.COMMUNICATION && 
        context.eventPhase === 'final_preparations') {
      return WeddingErrorSeverity.HIGH;
    }

    // Business impact assessment
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

  private async logError(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification,
    severity: WeddingErrorSeverity
  ): Promise<void> {
    const errorLog = {
      // Core error information
      error_id: context.errorId,
      error_code: classification.errorCode,
      error_type: classification.category,
      severity,
      message: this.generateUserMessage(error, context, classification),
      technical_message: error.message,
      stack_trace: error.stack,

      // Request context
      request_id: context.requestId,
      endpoint: context.endpoint,
      method: context.method,
      status_code: context.statusCode,
      response_time_ms: context.responseTime,
      memory_usage_mb: context.memoryUsage,
      database_queries: context.databaseQueries,

      // User context
      user_id: context.userId,
      supplier_id: context.supplierId,
      couple_id: context.coupleId,
      user_type: context.userType,

      // Wedding business context
      wedding_id: context.weddingId,
      wedding_date: context.weddingDate,
      vendor_type: context.vendorType,
      event_phase: context.eventPhase,
      affected_form_id: context.formId,
      affected_client_id: context.clientId,

      // Business impact
      revenue_impact: context.revenue_impact,
      booking_at_risk: context.booking_at_risk,
      guest_count_affected: context.guest_count_affected,
      critical_path_affected: context.critical_path_affected,

      // Classification
      is_expected_error: classification.isExpected,
      business_impact: classification.businessImpact,

      // Recovery
      auto_retry_enabled: await this.isAutoRetryEnabled(classification.errorCode),
      
      created_at: new Date().toISOString()
    };

    try {
      // Store in database
      await this.supabase
        .from('error_logs')
        .insert(errorLog);

      // Cache recent errors for pattern detection
      await this.redis.lpush(
        `error_pattern:${classification.errorCode}`,
        JSON.stringify({
          timestamp: context.timestamp,
          context: {
            endpoint: context.endpoint,
            userType: context.userType,
            vendorType: context.vendorType,
            eventPhase: context.eventPhase
          }
        })
      );

      // Expire pattern data after 24 hours
      await this.redis.expire(`error_pattern:${classification.errorCode}`, 86400);

    } catch (loggingError) {
      // If database logging fails, at least log to console
      console.error('Failed to log error to database:', loggingError);
      console.error('Original error:', errorLog);
    }
  }

  private async attemptRecovery(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification
  ): Promise<RecoveryResult> {
    const strategy = this.recoveryStrategies.get(classification.errorCode);
    
    if (!strategy || !strategy.enabled) {
      return {
        attempted: false,
        successful: false,
        canRetry: false
      };
    }

    try {
      // Check if recovery conditions are met
      if (!this.shouldAttemptRecovery(context, strategy)) {
        return {
          attempted: false,
          successful: false,
          canRetry: strategy.userCanRetry
        };
      }

      let recoverySuccessful = false;

      switch (strategy.type) {
        case 'auto_retry':
          recoverySuccessful = await this.performAutoRetry(context, strategy);
          break;
          
        case 'fallback_service':
          recoverySuccessful = await this.performFallback(context, strategy);
          break;
          
        case 'cache_recovery':
          recoverySuccessful = await this.performCacheRecovery(context, strategy);
          break;
          
        case 'graceful_degradation':
          recoverySuccessful = await this.performGracefulDegradation(context, strategy);
          break;
          
        default:
          return {
            attempted: false,
            successful: false,
            canRetry: false
          };
      }

      // Log recovery attempt
      await this.logRecoveryAttempt(context.errorId, strategy.type, recoverySuccessful);

      return {
        attempted: true,
        successful: recoverySuccessful,
        canRetry: !recoverySuccessful && strategy.userCanRetry,
        recoveryMethod: strategy.type
      };

    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      
      return {
        attempted: true,
        successful: false,
        canRetry: strategy.userCanRetry,
        recoveryError: recoveryError.message
      };
    }
  }

  private async performAutoRetry(context: WeddingErrorContext, strategy: RecoveryStrategy): Promise<boolean> {
    const retryKey = `retry:${context.errorId}`;
    const currentRetries = await this.redis.get(retryKey) || '0';
    
    if (parseInt(currentRetries) >= strategy.maxRetries) {
      return false;
    }

    // Increment retry count
    await this.redis.incr(retryKey);
    await this.redis.expire(retryKey, 3600); // Expire after 1 hour

    // Calculate backoff delay
    const delay = strategy.baseDelay * Math.pow(2, parseInt(currentRetries));
    
    // Schedule retry
    setTimeout(async () => {
      try {
        // Re-execute the original request with same context
        await this.retryOriginalRequest(context);
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        // The retry failure will be handled by the normal error handling flow
      }
    }, delay);

    return true; // Recovery attempted, success determined later
  }

  private generateUserMessage(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification
  ): string {
    // Wedding-specific user messages based on context and user type
    const messageTemplates: Record<string, Record<string, string>> = {
      'DATABASE_CONSTRAINT_VIOLATION': {
        couple: 'There seems to be a conflict with your wedding information. Please check your entries and try again.',
        supplier: 'Unable to save changes due to conflicting information. Please review your input.',
        coordinator: 'Data validation failed. Check for duplicate entries or missing required information.',
        admin: 'Database constraint violation detected. Review data integrity.'
      },
      'PAYMENT_PROCESSING_ERROR': {
        couple: 'We encountered an issue processing your payment. Please check your payment method and try again.',
        supplier: 'Payment processing temporarily unavailable. Your booking is secure, please try again shortly.',
        coordinator: 'Payment system error detected. Client payments may be affected.',
        admin: 'Critical payment processing failure. Immediate attention required.'
      },
      'FILE_PROCESSING_ERROR': {
        couple: 'There was a problem uploading your files. Please ensure they are under 10MB and try again.',
        supplier: 'Portfolio upload failed. Check your internet connection and file sizes.',
        coordinator: 'File processing error. Client uploads may be affected.',
        admin: 'File processing system error. Check storage and processing services.'
      },
      'COMMUNICATION_DELIVERY_ERROR': {
        couple: 'We couldn\'t send your message right now. We\'ll try again shortly.',
        supplier: 'Email/SMS delivery failed. Your clients may not have received notifications.',
        coordinator: 'Communication system error. Client notifications affected.',
        admin: 'Critical communication failure. Check email/SMS services immediately.'
      }
    };

    const userType = context.userType || 'couple';
    const template = messageTemplates[classification.errorCode];
    
    if (template && template[userType]) {
      return template[userType];
    }

    // Fallback messages with wedding context
    switch (classification.category) {
      case WeddingErrorCategory.WEDDING_DAY_CRITICAL:
        return 'A wedding day critical error has occurred. Our emergency support team has been notified.';
        
      case WeddingErrorCategory.PAYMENT:
        return 'Payment processing is temporarily unavailable. Your booking is secure.';
        
      case WeddingErrorCategory.COMMUNICATION:
        return 'Message delivery failed. We\'ll retry automatically.';
        
      case WeddingErrorCategory.FILE_HANDLING:
        return 'File upload failed. Please check your connection and try again.';
        
      default:
        return userType === 'couple' 
          ? 'Something went wrong while processing your request. Please try again.'
          : 'An error occurred. Please check your input and try again.';
    }
  }

  private isWeddingDayCritical(context: WeddingErrorContext, severity: WeddingErrorSeverity): boolean {
    // Check if this is a wedding day
    if (context.eventPhase === 'wedding_day') {
      return true;
    }

    // Check if wedding date is today or within 24 hours
    if (context.weddingDate) {
      const weddingDate = new Date(context.weddingDate);
      const now = new Date();
      const hoursDifference = (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDifference <= 24 && hoursDifference >= -24) {
        return true;
      }
    }

    // Check if this affects critical wedding operations
    const criticalEndpoints = [
      '/api/weddings/emergency',
      '/api/timeline/wedding-day',
      '/api/vendors/confirm-arrival',
      '/api/guests/check-in'
    ];

    return criticalEndpoints.some(endpoint => context.endpoint.includes(endpoint));
  }

  private async sendCriticalAlert(
    error: Error | WeddingSyncError,
    context: WeddingErrorContext,
    classification: ErrorClassification
  ): Promise<void> {
    const alert = {
      errorId: context.errorId,
      severity: 'CRITICAL',
      message: `Critical wedding error: ${classification.errorCode}`,
      context: {
        weddingDate: context.weddingDate,
        vendorType: context.vendorType,
        userType: context.userType,
        endpoint: context.endpoint,
        guestCount: context.guest_count_affected,
        revenueImpact: context.revenue_impact
      },
      timestamp: context.timestamp
    };

    // Send to multiple channels for critical errors
    try {
      // Slack alert
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 CRITICAL WEDDING ERROR`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Error ID', value: alert.errorId, short: true },
              { title: 'Error Code', value: classification.errorCode, short: true },
              { title: 'Wedding Date', value: context.weddingDate || 'Unknown', short: true },
              { title: 'Affected Users', value: context.guest_count_affected?.toString() || 'Unknown', short: true }
            ]
          }]
        })
      });

      // SMS alert to on-call engineer (for wedding day errors)
      if (context.eventPhase === 'wedding_day') {
        // Implementation depends on SMS service choice
        console.log('SMS alert would be sent for wedding day error:', alert);
      }

    } catch (alertError) {
      console.error('Failed to send critical alert:', alertError);
    }
  }
}
```

### 2. Wedding-Specific Error Recovery System
```typescript
// /wedsync/src/lib/errors/wedding-recovery-system.ts
import { Redis } from 'ioredis';

interface WeddingRecoveryContext {
  weddingId: string;
  weddingDate: string;
  errorType: string;
  affectedServices: string[];
  criticalityLevel: 'low' | 'medium' | 'high' | 'wedding_day_critical';
}

export class WeddingRecoverySystem {
  private redis = new Redis(process.env.REDIS_URL!);
  
  async handleWeddingDayError(context: WeddingRecoveryContext): Promise<RecoveryResult> {
    // Special handling for wedding day errors
    if (context.criticalityLevel === 'wedding_day_critical') {
      return await this.executeEmergencyRecovery(context);
    }
    
    return await this.executeStandardRecovery(context);
  }
  
  private async executeEmergencyRecovery(context: WeddingRecoveryContext): Promise<RecoveryResult> {
    // Immediate notification to emergency support team
    await this.alertEmergencyTeam(context);
    
    // Switch to backup systems where available
    await this.activateBackupSystems(context);
    
    // Enable manual fallback modes
    await this.enableManualFallbacks(context);
    
    return {
      recoveryAttempted: true,
      emergencyProtocolsActivated: true,
      backupSystemsEnabled: true,
      manualOverrideAvailable: true
    };
  }
}
```

### 3. Error Pattern Detection and Analysis
```typescript
// /wedsync/src/lib/errors/pattern-detection.ts
export class ErrorPatternDetector {
  async analyzeErrorPatterns(timeWindow: number = 3600): Promise<ErrorPatternAnalysis> {
    const patterns = await this.detectPatterns(timeWindow);
    const trends = await this.analyzeTrends(patterns);
    const predictions = await this.predictFutureErrors(trends);
    
    return {
      detectedPatterns: patterns,
      trends,
      predictions,
      recommendedActions: this.generateRecommendations(patterns, trends)
    };
  }
  
  private async detectPatterns(timeWindow: number): Promise<ErrorPattern[]> {
    // Analyze error frequency, correlation with wedding events, seasonal patterns
    const weddingSeasonPatterns = await this.analyzeSeasonalPatterns();
    const dailyPatterns = await this.analyzeDailyPatterns();
    const vendorSpecificPatterns = await this.analyzeVendorPatterns();
    
    return [
      ...weddingSeasonPatterns,
      ...dailyPatterns,
      ...vendorSpecificPatterns
    ];
  }
}
```

## IMPLEMENTATION EVIDENCE REQUIRED

### 1. Error Classification and Logging
- [ ] Demonstrate comprehensive error classification with wedding-specific context
- [ ] Show detailed error logging with business impact assessment
- [ ] Verify error pattern detection and alerting functionality
- [ ] Test error correlation across different wedding workflows
- [ ] Evidence of performance metrics and monitoring integration
- [ ] Document error recovery success rates and timing

### 2. Wedding-Specific Error Handling
- [ ] Verify wedding day critical error handling and emergency protocols
- [ ] Test business context integration (vendor types, event phases, guest impacts)
- [ ] Show appropriate error severity escalation based on wedding context
- [ ] Demonstrate user-type specific error messaging
- [ ] Evidence of revenue impact assessment and prioritization
- [ ] Test integration with wedding timeline and milestone systems

### 3. Error Recovery and Resilience
- [ ] Verify automatic retry mechanisms with exponential backoff
- [ ] Test fallback systems and graceful degradation
- [ ] Show circuit breaker patterns for external service failures
- [ ] Demonstrate cache recovery and data preservation
- [ ] Evidence of successful error resolution tracking
- [ ] Test cross-system error correlation and root cause analysis

## SUCCESS METRICS

### Technical Metrics
- **Error Processing Performance**: <10ms overhead for error handling
- **Error Classification Accuracy**: >95% correct categorization
- **Recovery Success Rate**: >80% for auto-recoverable errors
- **Alert Response Time**: <30 seconds for critical wedding day errors
- **Data Integrity**: 100% error log retention and accuracy

### Wedding Business Metrics
- **Wedding Day Error Recovery**: <2 minute resolution for critical issues
- **Vendor Workflow Continuity**: <1% booking process interruption rate
- **Guest Experience Protection**: Zero guest-facing errors during ceremonies
- **Revenue Protection**: $0 lost bookings due to unhandled errors
- **Seasonal Reliability**: 99.99% uptime during peak wedding months

## SEQUENTIAL THINKING REQUIRED

Use `mcp__sequential-thinking__sequential_thinking` to work through:

1. **Error Classification Strategy**
   - Analyze wedding-specific error types and business impacts
   - Design severity escalation based on wedding timeline proximity
   - Plan user-type specific messaging and recovery options

2. **Recovery System Architecture**
   - Design automatic recovery mechanisms for common wedding workflows
   - Plan fallback strategies for critical wedding day operations
   - Create emergency protocols for high-impact scenarios

3. **Pattern Detection and Prevention**
   - Analyze error correlation with wedding industry patterns
   - Design predictive alerting for seasonal and event-driven errors
   - Plan proactive error prevention based on historical data

4. **Business Impact Integration**
   - Map errors to wedding business outcomes and revenue impact
   - Design escalation paths based on booking values and guest counts
   - Plan vendor-specific error handling strategies

Remember: Your backend error handling system is the safety net that ensures no wedding day is ruined by technical failures. Every error classification, recovery attempt, and alert must consider the irreplaceable nature of wedding moments and the trust couples place in the platform.