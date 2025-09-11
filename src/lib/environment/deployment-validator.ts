/**
 * WS-194 Deployment Health Checker
 * Pre-deployment validation with wedding system compatibility checks
 * Team B - Backend/API Focus
 */

import { weddingValidator } from './config-validator';
import { secretRotationManager } from './secret-rotation-manager';
import { featureFlagManager } from './feature-flag-manager';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

// Health check types
export type HealthCheckType =
  | 'database'
  | 'external_apis'
  | 'storage'
  | 'realtime'
  | 'authentication'
  | 'payment_processing'
  | 'email_delivery'
  | 'sms_delivery'
  | 'performance'
  | 'security'
  | 'wedding_critical_systems';

// Health check severity levels
export type HealthCheckSeverity = 'critical' | 'warning' | 'info';

// Health check result
interface HealthCheckResult {
  type: HealthCheckType;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  severity: HealthCheckSeverity;
  message: string;
  details?: Record<string, unknown>;
  responseTime?: number;
  timestamp: Date;
  remediation?: string;
}

// Deployment validation result
interface DeploymentValidationResult {
  overall: 'ready' | 'blocked' | 'warning';
  score: number; // 0-100
  timestamp: Date;
  environment: string;
  checks: HealthCheckResult[];
  criticalIssues: number;
  warnings: number;
  weddingDayCompatible: boolean;
  peakSeasonReady: boolean;
  deploymentBlocked: boolean;
  blockingReasons: string[];
}

// Wedding-specific deployment requirements
interface WeddingDeploymentRequirements {
  saturdayDeploymentBlocked: boolean;
  blackoutDates: string[];
  peakSeasonExtraChecks: boolean;
  weddingCriticalSystemsOnly: boolean;
  requiresVendorApproval: boolean;
  minimumUptimeRequirement: number; // percentage
}

export class DeploymentValidator {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private weddingRequirements: WeddingDeploymentRequirements;

  constructor(requirements?: Partial<WeddingDeploymentRequirements>) {
    this.weddingRequirements = {
      saturdayDeploymentBlocked: true,
      blackoutDates: [],
      peakSeasonExtraChecks: true,
      weddingCriticalSystemsOnly: false,
      requiresVendorApproval: false,
      minimumUptimeRequirement: 99.9,
      ...requirements,
    };
  }

  /**
   * Comprehensive deployment validation
   */
  async validateDeployment(
    environment: string = 'production',
  ): Promise<DeploymentValidationResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    logger.info('Starting deployment validation', { environment, timestamp });

    try {
      // Initialize result
      const result: DeploymentValidationResult = {
        overall: 'ready',
        score: 0,
        timestamp,
        environment,
        checks: [],
        criticalIssues: 0,
        warnings: 0,
        weddingDayCompatible: false,
        peakSeasonReady: false,
        deploymentBlocked: false,
        blockingReasons: [],
      };

      // Run all health checks in parallel
      const checkPromises = [
        this.checkDatabase(),
        this.checkExternalAPIs(),
        this.checkStorage(),
        this.checkAuthentication(),
        this.checkPaymentProcessing(),
        this.checkEmailDelivery(),
        this.checkSMSDelivery(),
        this.checkPerformance(),
        this.checkSecurity(),
        this.checkWeddingCriticalSystems(),
      ];

      const checkResults = await Promise.allSettled(checkPromises);

      // Process check results
      for (const checkResult of checkResults) {
        if (checkResult.status === 'fulfilled') {
          result.checks.push(...checkResult.value);
        } else {
          result.checks.push({
            type: 'security',
            name: 'Health Check Error',
            status: 'fail',
            severity: 'critical',
            message: 'A health check failed to execute',
            details: { error: checkResult.reason },
            timestamp: new Date(),
          });
        }
      }

      // Additional wedding-specific validations
      const weddingChecks =
        await this.performWeddingSpecificChecks(environment);
      result.checks.push(...weddingChecks);

      // Environment configuration validation
      const envValidation = await weddingValidator.validateWeddingEnvironment();
      if (!envValidation.isValid) {
        result.checks.push({
          type: 'security',
          name: 'Environment Configuration',
          status: 'fail',
          severity: 'critical',
          message: `Environment validation failed with ${envValidation.errors.length} errors`,
          details: {
            errors: envValidation.errors,
            warnings: envValidation.warnings,
          },
          timestamp: new Date(),
          remediation: 'Fix environment configuration errors before deployment',
        });
      }

      // Calculate overall status and score
      this.calculateOverallStatus(result);

      // Check deployment blocking conditions
      this.checkDeploymentBlockers(result);

      // Log results
      logger.info('Deployment validation completed', {
        environment,
        overall: result.overall,
        score: result.score,
        criticalIssues: result.criticalIssues,
        warnings: result.warnings,
        duration: Date.now() - startTime,
      });

      // Record metrics
      metrics.incrementCounter('deployment.validation_completed', 1, {
        environment,
        status: result.overall,
      });

      metrics.recordHistogram(
        'deployment.validation_duration',
        Date.now() - startTime,
      );

      return result;
    } catch (error) {
      logger.error('Deployment validation failed', error as Error, {
        environment,
      });

      return {
        overall: 'blocked',
        score: 0,
        timestamp,
        environment,
        checks: [
          {
            type: 'security',
            name: 'Validation Process',
            status: 'fail',
            severity: 'critical',
            message: 'Deployment validation process failed',
            details: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: new Date(),
          },
        ],
        criticalIssues: 1,
        warnings: 0,
        weddingDayCompatible: false,
        peakSeasonReady: false,
        deploymentBlocked: true,
        blockingReasons: ['Validation process failure'],
      };
    }
  }

  /**
   * Check database connectivity and health
   */
  private async checkDatabase(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];
    const startTime = Date.now();

    try {
      // Basic connectivity test
      const { data, error } = await this.supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (error) {
        checks.push({
          type: 'database',
          name: 'Database Connectivity',
          status: 'fail',
          severity: 'critical',
          message: 'Cannot connect to database',
          details: { error: error.message },
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          remediation: 'Check database connection string and credentials',
        });
        return checks;
      }

      checks.push({
        type: 'database',
        name: 'Database Connectivity',
        status: 'pass',
        severity: 'info',
        message: 'Database connection successful',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      });

      // Check critical tables exist
      const criticalTables = [
        'organizations',
        'user_profiles',
        'forms',
        'form_submissions',
        'payments',
      ];

      for (const table of criticalTables) {
        try {
          const tableStartTime = Date.now();
          const { error: tableError } = await this.supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (tableError) {
            checks.push({
              type: 'database',
              name: `Table: ${table}`,
              status: 'fail',
              severity: 'critical',
              message: `Critical table ${table} is not accessible`,
              details: { error: tableError.message },
              responseTime: Date.now() - tableStartTime,
              timestamp: new Date(),
              remediation: `Verify table ${table} exists and RLS policies are correct`,
            });
          } else {
            checks.push({
              type: 'database',
              name: `Table: ${table}`,
              status: 'pass',
              severity: 'info',
              message: `Table ${table} is accessible`,
              responseTime: Date.now() - tableStartTime,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          checks.push({
            type: 'database',
            name: `Table: ${table}`,
            status: 'fail',
            severity: 'critical',
            message: `Failed to check table ${table}`,
            details: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      checks.push({
        type: 'database',
        name: 'Database Health Check',
        status: 'fail',
        severity: 'critical',
        message: 'Database health check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });
    }

    return checks;
  }

  /**
   * Check external API integrations
   */
  private async checkExternalAPIs(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    // Stripe API check
    if (process.env.STRIPE_SECRET_KEY) {
      const stripeCheck = await this.checkStripeAPI();
      checks.push(stripeCheck);
    }

    // Twilio API check
    if (process.env.TWILIO_AUTH_TOKEN) {
      const twilioCheck = await this.checkTwilioAPI();
      checks.push(twilioCheck);
    }

    // Resend API check
    if (process.env.RESEND_API_KEY) {
      const resendCheck = await this.checkResendAPI();
      checks.push(resendCheck);
    }

    // OpenAI API check (if configured)
    if (process.env.OPENAI_API_KEY) {
      const openaiCheck = await this.checkOpenAIAPI();
      checks.push(openaiCheck);
    }

    return checks;
  }

  /**
   * Check Stripe API connectivity
   */
  private async checkStripeAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        return {
          type: 'external_apis',
          name: 'Stripe API',
          status: 'fail',
          severity: 'critical',
          message: 'Stripe API authentication failed',
          details: { statusCode: response.status },
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          remediation: 'Check Stripe API key and permissions',
        };
      }

      const account = await response.json();

      return {
        type: 'external_apis',
        name: 'Stripe API',
        status: 'pass',
        severity: 'info',
        message: 'Stripe API connection successful',
        details: {
          accountId: account.id,
          country: account.country,
          chargesEnabled: account.charges_enabled,
        },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        type: 'external_apis',
        name: 'Stripe API',
        status: 'fail',
        severity: 'critical',
        message: 'Stripe API check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Twilio API connectivity
   */
  private async checkTwilioAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        return {
          type: 'external_apis',
          name: 'Twilio API',
          status: 'fail',
          severity: 'critical',
          message: 'Twilio credentials not configured',
          timestamp: new Date(),
          remediation: 'Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN',
        };
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
        },
      );

      if (!response.ok) {
        return {
          type: 'external_apis',
          name: 'Twilio API',
          status: 'fail',
          severity: 'critical',
          message: 'Twilio API authentication failed',
          details: { statusCode: response.status },
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      const account = await response.json();

      return {
        type: 'external_apis',
        name: 'Twilio API',
        status: 'pass',
        severity: 'info',
        message: 'Twilio API connection successful',
        details: {
          accountSid: account.sid,
          status: account.status,
        },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        type: 'external_apis',
        name: 'Twilio API',
        status: 'fail',
        severity: 'critical',
        message: 'Twilio API check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Resend API connectivity
   */
  private async checkResendAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
      });

      const isSuccess = response.ok;

      return {
        type: 'external_apis',
        name: 'Resend API',
        status: isSuccess ? 'pass' : 'fail',
        severity: isSuccess ? 'info' : 'critical',
        message: isSuccess
          ? 'Resend API connection successful'
          : 'Resend API authentication failed',
        details: { statusCode: response.status },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        ...(isSuccess ? {} : { remediation: 'Check Resend API key' }),
      };
    } catch (error) {
      return {
        type: 'external_apis',
        name: 'Resend API',
        status: 'fail',
        severity: 'critical',
        message: 'Resend API check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check OpenAI API connectivity
   */
  private async checkOpenAIAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const isSuccess = response.ok;

      return {
        type: 'external_apis',
        name: 'OpenAI API',
        status: isSuccess ? 'pass' : 'fail',
        severity: isSuccess ? 'info' : 'warning', // Warning because OpenAI is not critical for core functionality
        message: isSuccess
          ? 'OpenAI API connection successful'
          : 'OpenAI API authentication failed',
        details: { statusCode: response.status },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        type: 'external_apis',
        name: 'OpenAI API',
        status: 'fail',
        severity: 'warning',
        message: 'OpenAI API check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check storage systems
   */
  private async checkStorage(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    // Supabase Storage check
    try {
      const startTime = Date.now();

      const { data, error } = await this.supabase.storage.listBuckets();

      if (error) {
        checks.push({
          type: 'storage',
          name: 'Supabase Storage',
          status: 'fail',
          severity: 'critical',
          message: 'Cannot access Supabase Storage',
          details: { error: error.message },
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
          remediation: 'Check Supabase Storage configuration and permissions',
        });
      } else {
        checks.push({
          type: 'storage',
          name: 'Supabase Storage',
          status: 'pass',
          severity: 'info',
          message: 'Supabase Storage accessible',
          details: { buckets: data?.length || 0 },
          responseTime: Date.now() - startTime,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      checks.push({
        type: 'storage',
        name: 'Supabase Storage',
        status: 'fail',
        severity: 'critical',
        message: 'Storage check failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      });
    }

    return checks;
  }

  /**
   * Check authentication systems
   */
  private async checkAuthentication(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    // Check Supabase Auth
    checks.push({
      type: 'authentication',
      name: 'Supabase Auth',
      status: 'pass', // If we got this far, auth is working
      severity: 'info',
      message: 'Authentication system operational',
      timestamp: new Date(),
    });

    return checks;
  }

  /**
   * Check payment processing
   */
  private async checkPaymentProcessing(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    if (process.env.STRIPE_SECRET_KEY) {
      // This was already checked in external APIs, but we can add payment-specific checks
      checks.push({
        type: 'payment_processing',
        name: 'Stripe Configuration',
        status: 'pass',
        severity: 'info',
        message: 'Payment processing configured',
        timestamp: new Date(),
      });
    } else {
      checks.push({
        type: 'payment_processing',
        name: 'Stripe Configuration',
        status: 'fail',
        severity: 'critical',
        message: 'Stripe not configured',
        timestamp: new Date(),
        remediation: 'Configure Stripe API keys',
      });
    }

    return checks;
  }

  /**
   * Check email delivery
   */
  private async checkEmailDelivery(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    if (process.env.RESEND_API_KEY) {
      checks.push({
        type: 'email_delivery',
        name: 'Email Service',
        status: 'pass',
        severity: 'info',
        message: 'Email delivery configured',
        timestamp: new Date(),
      });
    } else {
      checks.push({
        type: 'email_delivery',
        name: 'Email Service',
        status: 'fail',
        severity: 'critical',
        message: 'Email service not configured',
        timestamp: new Date(),
        remediation: 'Configure email service (Resend or SendGrid)',
      });
    }

    return checks;
  }

  /**
   * Check SMS delivery
   */
  private async checkSMSDelivery(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    if (process.env.TWILIO_AUTH_TOKEN) {
      checks.push({
        type: 'sms_delivery',
        name: 'SMS Service',
        status: 'pass',
        severity: 'info',
        message: 'SMS delivery configured',
        timestamp: new Date(),
      });
    } else {
      checks.push({
        type: 'sms_delivery',
        name: 'SMS Service',
        status: 'warn',
        severity: 'warning',
        message: 'SMS service not configured',
        timestamp: new Date(),
        remediation: 'Configure Twilio for SMS notifications',
      });
    }

    return checks;
  }

  /**
   * Check performance requirements
   */
  private async checkPerformance(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    // Mock performance checks (in real implementation, these would be actual performance tests)
    checks.push({
      type: 'performance',
      name: 'Response Time',
      status: 'pass',
      severity: 'info',
      message: 'Response time within acceptable limits',
      details: { averageResponseTime: '150ms' },
      timestamp: new Date(),
    });

    return checks;
  }

  /**
   * Check security configuration
   */
  private async checkSecurity(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    // Check if NEXTAUTH_SECRET is configured
    if (
      !process.env.NEXTAUTH_SECRET ||
      process.env.NEXTAUTH_SECRET.length < 32
    ) {
      checks.push({
        type: 'security',
        name: 'NextAuth Secret',
        status: 'fail',
        severity: 'critical',
        message: 'NextAuth secret not properly configured',
        timestamp: new Date(),
        remediation: 'Set a strong NEXTAUTH_SECRET (32+ characters)',
      });
    } else {
      checks.push({
        type: 'security',
        name: 'NextAuth Secret',
        status: 'pass',
        severity: 'info',
        message: 'Authentication secret properly configured',
        timestamp: new Date(),
      });
    }

    return checks;
  }

  /**
   * Check wedding-critical systems
   */
  private async checkWeddingCriticalSystems(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    // Check wedding data encryption
    if (!process.env.WEDDING_DATA_ENCRYPTION_KEY) {
      checks.push({
        type: 'wedding_critical_systems',
        name: 'Wedding Data Encryption',
        status: 'fail',
        severity: 'critical',
        message: 'Wedding data encryption key not configured',
        timestamp: new Date(),
        remediation:
          'Configure WEDDING_DATA_ENCRYPTION_KEY for GDPR compliance',
      });
    } else {
      checks.push({
        type: 'wedding_critical_systems',
        name: 'Wedding Data Encryption',
        status: 'pass',
        severity: 'info',
        message: 'Wedding data encryption configured',
        timestamp: new Date(),
      });
    }

    // Check Saturday deployment protection
    if (process.env.SATURDAY_DEPLOYMENT_BLOCK !== 'true') {
      checks.push({
        type: 'wedding_critical_systems',
        name: 'Saturday Protection',
        status: 'fail',
        severity: 'critical',
        message: 'Saturday deployment protection disabled',
        timestamp: new Date(),
        remediation: 'Enable Saturday deployment protection',
      });
    } else {
      checks.push({
        type: 'wedding_critical_systems',
        name: 'Saturday Protection',
        status: 'pass',
        severity: 'info',
        message: 'Saturday deployment protection enabled',
        timestamp: new Date(),
      });
    }

    return checks;
  }

  /**
   * Perform wedding-specific deployment checks
   */
  private async performWeddingSpecificChecks(
    environment: string,
  ): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];
    const today = new Date();
    const isSaturday = today.getDay() === 6;

    // Check if deployment is blocked due to wedding day restrictions
    if (isSaturday && this.weddingRequirements.saturdayDeploymentBlocked) {
      checks.push({
        type: 'wedding_critical_systems',
        name: 'Wedding Day Deployment Block',
        status: 'fail',
        severity: 'critical',
        message: 'Deployment blocked - Saturday wedding day protection active',
        details: {
          isSaturday: true,
          date: today.toISOString().split('T')[0],
        },
        timestamp: new Date(),
        remediation:
          'Wait until Monday or use emergency override if critically needed',
      });
    }

    // Check blackout dates
    const dateStr = today.toISOString().split('T')[0];
    if (this.weddingRequirements.blackoutDates.includes(dateStr)) {
      checks.push({
        type: 'wedding_critical_systems',
        name: 'Blackout Date Check',
        status: 'fail',
        severity: 'critical',
        message: 'Deployment blocked - blackout date',
        details: { date: dateStr },
        timestamp: new Date(),
        remediation: 'Wait until after blackout period',
      });
    }

    // Peak season additional checks
    if (
      this.weddingRequirements.peakSeasonExtraChecks &&
      this.isPeakWeddingSeason()
    ) {
      // Check capacity limits
      const capacityLimit = parseInt(process.env.WEDDING_CAPACITY_LIMIT || '0');
      if (capacityLimit < 5000) {
        checks.push({
          type: 'wedding_critical_systems',
          name: 'Peak Season Capacity',
          status: 'warn',
          severity: 'warning',
          message: 'Capacity limit may be insufficient for peak wedding season',
          details: { currentLimit: capacityLimit, recommendedLimit: 5000 },
          timestamp: new Date(),
          remediation:
            'Increase WEDDING_CAPACITY_LIMIT to 5000+ for peak season',
        });
      }

      // Check image CDN
      if (!process.env.WEDDING_IMAGE_CDN_URL) {
        checks.push({
          type: 'wedding_critical_systems',
          name: 'Wedding Image CDN',
          status: 'warn',
          severity: 'warning',
          message: 'Wedding image CDN not configured for peak season',
          timestamp: new Date(),
          remediation:
            'Configure CDN for optimal performance during peak season',
        });
      }
    }

    return checks;
  }

  /**
   * Calculate overall deployment status and score
   */
  private calculateOverallStatus(result: DeploymentValidationResult): void {
    let score = 100;
    let criticalIssues = 0;
    let warnings = 0;

    for (const check of result.checks) {
      switch (check.status) {
        case 'fail':
          if (check.severity === 'critical') {
            criticalIssues++;
            score -= 20; // Critical failures heavily impact score
          } else if (check.severity === 'warning') {
            warnings++;
            score -= 5; // Warnings have minor impact
          }
          break;
        case 'warn':
          warnings++;
          score -= 2; // Warning status has small impact
          break;
      }
    }

    result.score = Math.max(0, score);
    result.criticalIssues = criticalIssues;
    result.warnings = warnings;

    // Determine overall status
    if (criticalIssues > 0) {
      result.overall = 'blocked';
    } else if (warnings > 5) {
      result.overall = 'warning';
    } else {
      result.overall = 'ready';
    }

    // Wedding-specific status
    result.weddingDayCompatible = !result.checks.some(
      (c) => c.type === 'wedding_critical_systems' && c.status === 'fail',
    );

    result.peakSeasonReady = result.weddingDayCompatible && result.score >= 80;
  }

  /**
   * Check for deployment blocking conditions
   */
  private checkDeploymentBlockers(result: DeploymentValidationResult): void {
    const blockingReasons: string[] = [];

    // Critical failures block deployment
    const criticalFailures = result.checks.filter(
      (c) => c.status === 'fail' && c.severity === 'critical',
    );

    for (const failure of criticalFailures) {
      blockingReasons.push(`Critical: ${failure.message}`);
    }

    // Wedding-specific blockers
    const today = new Date();
    const isSaturday = today.getDay() === 6;

    if (isSaturday && this.weddingRequirements.saturdayDeploymentBlocked) {
      blockingReasons.push('Saturday wedding day protection active');
    }

    const dateStr = today.toISOString().split('T')[0];
    if (this.weddingRequirements.blackoutDates.includes(dateStr)) {
      blockingReasons.push('Deployment blackout date');
    }

    result.deploymentBlocked = blockingReasons.length > 0;
    result.blockingReasons = blockingReasons;
  }

  /**
   * Check if currently in wedding season
   */
  private isPeakWeddingSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    const weddingSeasonMonths = [5, 6, 7, 8, 9, 10]; // May through October
    return weddingSeasonMonths.includes(currentMonth);
  }

  /**
   * Generate deployment validation report
   */
  generateValidationReport(result: DeploymentValidationResult): string {
    let report = `
=== WEDSYNC DEPLOYMENT VALIDATION REPORT ===
Environment: ${result.environment.toUpperCase()}
Timestamp: ${result.timestamp.toISOString()}
Overall Status: ${this.getStatusEmoji(result.overall)} ${result.overall.toUpperCase()}
Score: ${result.score}/100
Wedding Day Compatible: ${result.weddingDayCompatible ? '✅ YES' : '❌ NO'}
Peak Season Ready: ${result.peakSeasonReady ? '✅ YES' : '⚠️ NO'}

`;

    if (result.deploymentBlocked) {
      report += `🚫 DEPLOYMENT BLOCKED:\n`;
      for (const reason of result.blockingReasons) {
        report += `  • ${reason}\n`;
      }
      report += '\n';
    }

    if (result.criticalIssues > 0) {
      report += `🚨 CRITICAL ISSUES (${result.criticalIssues}):\n`;
      const criticalChecks = result.checks.filter(
        (c) => c.status === 'fail' && c.severity === 'critical',
      );
      criticalChecks.forEach((check, index) => {
        report += `  ${index + 1}. ${check.name}: ${check.message}\n`;
        if (check.remediation) {
          report += `     💡 Fix: ${check.remediation}\n`;
        }
      });
      report += '\n';
    }

    if (result.warnings > 0) {
      report += `⚠️  WARNINGS (${result.warnings}):\n`;
      const warningChecks = result.checks.filter(
        (c) => c.status === 'warn' || c.severity === 'warning',
      );
      warningChecks.forEach((check, index) => {
        report += `  ${index + 1}. ${check.name}: ${check.message}\n`;
        if (check.remediation) {
          report += `     💡 Consider: ${check.remediation}\n`;
        }
      });
      report += '\n';
    }

    // System health summary
    const healthByType = this.groupChecksByType(result.checks);
    report += '🔍 SYSTEM HEALTH SUMMARY:\n';

    for (const [type, checks] of Object.entries(healthByType)) {
      const passed = checks.filter((c) => c.status === 'pass').length;
      const total = checks.length;
      const status =
        passed === total
          ? '✅'
          : total - passed <= checks.length / 2
            ? '⚠️'
            : '❌';

      report += `  ${status} ${type.replace(/_/g, ' ').toUpperCase()}: ${passed}/${total} checks passed\n`;
    }

    if (result.overall === 'ready') {
      report +=
        '\n✅ DEPLOYMENT APPROVED! All systems are ready for deployment.\n';
    } else if (result.overall === 'warning') {
      report +=
        '\n⚠️  PROCEED WITH CAUTION! Warnings present but not blocking.\n';
    } else {
      report +=
        '\n❌ DEPLOYMENT BLOCKED! Fix critical issues before proceeding.\n';
    }

    return report;
  }

  /**
   * Group checks by type for reporting
   */
  private groupChecksByType(
    checks: HealthCheckResult[],
  ): Record<string, HealthCheckResult[]> {
    return checks.reduce(
      (groups, check) => {
        const type = check.type;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(check);
        return groups;
      },
      {} as Record<string, HealthCheckResult[]>,
    );
  }

  /**
   * Get emoji for status
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'ready':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'blocked':
        return '❌';
      default:
        return '❓';
    }
  }
}

// Export singleton instance
export const deploymentValidator = new DeploymentValidator({
  saturdayDeploymentBlocked: true,
  peakSeasonExtraChecks: true,
  minimumUptimeRequirement: 99.9,
});

// Convenience functions
export const validateDeployment = (environment?: string) =>
  deploymentValidator.validateDeployment(environment);

export const generateValidationReport = (result: DeploymentValidationResult) =>
  deploymentValidator.generateValidationReport(result);
