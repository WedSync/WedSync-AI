/**
 * WS-225: Data Validation Engine
 * Core validation system for analytics data quality and consistency
 */

import { Logger } from '../../logging/Logger';
import { z } from 'zod';

export interface ValidationRule {
  id: string;
  name: string;
  type: 'schema' | 'business' | 'consistency' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  validator: (data: any) => ValidationResult;
  enabled: boolean;
}

export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field?: string;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationWarning {
  field?: string;
  code: string;
  message: string;
  suggestion?: string;
}

export class ValidationEngine {
  private logger = new Logger('ValidationEngine');
  private rules: Map<string, ValidationRule> = new Map();
  private metrics = {
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
    averageScore: 0,
    averageProcessingTime: 0,
  };

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Validate analytics data with all applicable rules
   */
  async validate(
    data: any,
    context?: {
      source?: string;
      type?: string;
      weddingId?: string;
      organizationId?: string;
    },
  ): Promise<ValidationResult> {
    const startTime = performance.now();

    try {
      const applicableRules = this.getApplicableRules(data, context);
      const results: ValidationResult[] = [];

      // Run validations in parallel for performance
      const validationPromises = applicableRules.map(async (rule) => {
        try {
          return await this.executeRule(rule, data);
        } catch (error) {
          this.logger.error('Rule execution failed', {
            ruleId: rule.id,
            error,
          });
          return {
            passed: false,
            errors: [
              {
                code: 'RULE_EXECUTION_ERROR',
                message: `Rule ${rule.name} failed to execute`,
                severity: 'medium' as const,
              },
            ],
            warnings: [],
            score: 0,
          };
        }
      });

      const validationResults = await Promise.all(validationPromises);
      const combinedResult = this.combineResults(validationResults);

      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(combinedResult, processingTime);

      // Log for audit trail
      this.logValidation(data, combinedResult, context, processingTime);

      return combinedResult;
    } catch (error) {
      this.logger.error('Validation failed', { error });
      return {
        passed: false,
        errors: [
          {
            code: 'VALIDATION_SYSTEM_ERROR',
            message: 'System validation error occurred',
            severity: 'critical',
          },
        ],
        warnings: [],
        score: 0,
      };
    }
  }

  /**
   * Register custom validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info('Validation rule registered', {
      ruleId: rule.id,
      ruleName: rule.name,
    });
  }

  /**
   * Initialize default validation rules for WedSync analytics
   */
  private initializeDefaultRules(): void {
    // Analytics event schema validation
    this.registerRule({
      id: 'analytics_event_schema',
      name: 'Analytics Event Schema Validation',
      type: 'schema',
      priority: 'critical',
      enabled: true,
      validator: (data) => this.validateAnalyticsEventSchema(data),
    });

    // GDPR compliance validation
    this.registerRule({
      id: 'gdpr_compliance',
      name: 'GDPR Compliance Check',
      type: 'compliance',
      priority: 'critical',
      enabled: true,
      validator: (data) => this.validateGDPRCompliance(data),
    });

    // Wedding day data validation
    this.registerRule({
      id: 'wedding_day_validation',
      name: 'Wedding Day Data Validation',
      type: 'business',
      priority: 'high',
      enabled: true,
      validator: (data) => this.validateWeddingDayData(data),
    });

    // Data consistency check
    this.registerRule({
      id: 'data_consistency',
      name: 'Data Consistency Check',
      type: 'consistency',
      priority: 'high',
      enabled: true,
      validator: (data) => this.validateDataConsistency(data),
    });
  }

  /**
   * Validate analytics event schema
   */
  private validateAnalyticsEventSchema(data: any): ValidationResult {
    const eventSchema = z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      category: z.enum([
        'user_action',
        'system_event',
        'business_metric',
        'error',
      ]),
      payload: z.record(z.any()),
      metadata: z.object({
        timestamp: z.number(),
        session_id: z.string().optional(),
        user_id: z.string().optional(),
        organization_id: z.string().optional(),
        wedding_id: z.string().optional(),
      }),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
    });

    try {
      eventSchema.parse(data);
      return {
        passed: true,
        errors: [],
        warnings: [],
        score: 100,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          passed: false,
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            code: 'SCHEMA_VALIDATION_ERROR',
            message: `Schema validation failed: ${err.message}`,
            severity: 'high' as const,
          })),
          warnings: [],
          score: 0,
        };
      }

      return {
        passed: false,
        errors: [
          {
            code: 'SCHEMA_VALIDATION_ERROR',
            message: 'Unknown schema validation error',
            severity: 'medium',
          },
        ],
        warnings: [],
        score: 0,
      };
    }
  }

  /**
   * Validate GDPR compliance
   */
  private validateGDPRCompliance(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check consent validation
    if (data.metadata?.user_id && !data.payload?.consent_given) {
      errors.push({
        field: 'consent_given',
        code: 'MISSING_CONSENT',
        message: 'User data processed without explicit consent',
        severity: 'critical',
      });
    }

    // Check for PII in payload
    const piiFields = ['email', 'phone', 'address', 'credit_card'];
    const foundPII = piiFields.filter((field) =>
      JSON.stringify(data.payload).toLowerCase().includes(field),
    );

    if (foundPII.length > 0) {
      warnings.push({
        field: 'payload',
        code: 'POTENTIAL_PII',
        message: `Potential PII detected in payload: ${foundPII.join(', ')}`,
        suggestion: 'Consider anonymizing or removing PII data',
      });
    }

    const score = errors.length === 0 ? (warnings.length === 0 ? 100 : 80) : 20;

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Validate wedding day specific data
   */
  private validateWeddingDayData(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for wedding ID in wedding-related events
    const weddingEventTypes = [
      'guest_list_updated',
      'vendor_added',
      'timeline_updated',
      'payment_processed',
    ];

    if (weddingEventTypes.includes(data.type) && !data.metadata?.wedding_id) {
      errors.push({
        field: 'wedding_id',
        code: 'MISSING_WEDDING_ID',
        message: 'Wedding-related event missing wedding ID',
        severity: 'high',
      });
    }

    // Validate critical wedding day events (Saturdays)
    const isWeekend = new Date().getDay() === 6; // Saturday
    if (
      isWeekend &&
      data.severity === 'critical' &&
      !data.payload.emergency_protocol
    ) {
      warnings.push({
        field: 'emergency_protocol',
        code: 'WEEKEND_CRITICAL_EVENT',
        message: 'Critical event on wedding day without emergency protocol',
        suggestion: 'Ensure emergency protocols are in place',
      });
    }

    const score = errors.length === 0 ? (warnings.length === 0 ? 100 : 85) : 30;

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Validate data consistency
   */
  private validateDataConsistency(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check timestamp consistency
    const timestamp = data.metadata?.timestamp;
    if (timestamp) {
      const now = Date.now();
      const timeDiff = Math.abs(now - timestamp);

      // Flag events more than 1 hour in the future or past
      if (timeDiff > 60 * 60 * 1000) {
        warnings.push({
          field: 'timestamp',
          code: 'TIMESTAMP_DRIFT',
          message: `Event timestamp differs from current time by ${Math.round(timeDiff / 60000)} minutes`,
          suggestion: 'Check system clock synchronization',
        });
      }
    }

    // Check required fields based on event type
    if (
      data.type === 'payment_processed' &&
      typeof data.payload.amount !== 'number'
    ) {
      errors.push({
        field: 'amount',
        code: 'INVALID_PAYMENT_AMOUNT',
        message: 'Payment event missing valid amount field',
        severity: 'high',
      });
    }

    const score = errors.length === 0 ? (warnings.length === 0 ? 100 : 75) : 25;

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Get applicable rules for data and context
   */
  private getApplicableRules(data: any, context?: any): ValidationRule[] {
    return Array.from(this.rules.values()).filter((rule) => {
      if (!rule.enabled) return false;

      // Apply context-specific filtering if needed
      if (context?.source === 'external' && rule.type === 'schema') {
        return true; // Always validate schema for external data
      }

      return true; // Apply all enabled rules by default
    });
  }

  /**
   * Execute a single validation rule
   */
  private async executeRule(
    rule: ValidationRule,
    data: any,
  ): Promise<ValidationResult> {
    try {
      return rule.validator(data);
    } catch (error) {
      this.logger.error('Rule validation failed', { ruleId: rule.id, error });
      return {
        passed: false,
        errors: [
          {
            code: 'RULE_EXECUTION_ERROR',
            message: `Validation rule ${rule.name} failed to execute`,
            severity: 'medium',
          },
        ],
        warnings: [],
        score: 0,
      };
    }
  }

  /**
   * Combine multiple validation results
   */
  private combineResults(results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap((r) => r.errors);
    const allWarnings = results.flatMap((r) => r.warnings);
    const averageScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length
        : 0;

    return {
      passed: results.every((r) => r.passed),
      errors: allErrors,
      warnings: allWarnings,
      score: Math.round(averageScore),
      metadata: {
        rulesExecuted: results.length,
        criticalErrors: allErrors.filter((e) => e.severity === 'critical')
          .length,
        highPriorityWarnings: allWarnings.length,
      },
    };
  }

  /**
   * Update validation metrics
   */
  private updateMetrics(
    result: ValidationResult,
    processingTime: number,
  ): void {
    this.metrics.totalValidations++;
    if (result.passed) {
      this.metrics.passedValidations++;
    } else {
      this.metrics.failedValidations++;
    }

    // Update average score
    this.metrics.averageScore =
      (this.metrics.averageScore * (this.metrics.totalValidations - 1) +
        result.score) /
      this.metrics.totalValidations;

    // Update average processing time
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime *
        (this.metrics.totalValidations - 1) +
        processingTime) /
      this.metrics.totalValidations;
  }

  /**
   * Log validation for audit trail
   */
  private logValidation(
    data: any,
    result: ValidationResult,
    context?: any,
    processingTime?: number,
  ): void {
    this.logger.info('Data validation completed', {
      eventId: data.id,
      eventType: data.type,
      validationPassed: result.passed,
      validationScore: result.score,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      processingTimeMs: processingTime,
      context,
    });

    // Log errors separately for easier filtering
    if (result.errors.length > 0) {
      this.logger.warn('Validation errors detected', {
        eventId: data.id,
        errors: result.errors,
      });
    }
  }

  /**
   * Get validation metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalValidations > 0
          ? (this.metrics.passedValidations / this.metrics.totalValidations) *
            100
          : 0,
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: string[];
  } {
    const successRate = this.getMetrics().successRate;
    const details: string[] = [];

    if (this.metrics.averageProcessingTime > 50) {
      details.push(
        `Processing time ${this.metrics.averageProcessingTime.toFixed(2)}ms exceeds 50ms target`,
      );
    }

    if (successRate < 95) {
      details.push(`Success rate ${successRate.toFixed(1)}% below 95% target`);
    }

    if (this.metrics.averageScore < 80) {
      details.push(
        `Average score ${this.metrics.averageScore.toFixed(1)} below 80 target`,
      );
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (details.length > 0) {
      status = details.length > 2 ? 'unhealthy' : 'degraded';
    }

    return { status, details };
  }
}

// Export singleton instance
export const validationEngine = new ValidationEngine();
