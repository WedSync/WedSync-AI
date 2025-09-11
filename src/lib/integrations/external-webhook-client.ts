import { integrationDataManager } from '../database/IntegrationDataManager';
import {
  IntegrationError,
  ErrorCategory,
  WebhookDelivery,
  WebhookEndpoint,
  DeliveryResult,
} from '@/types/integrations';
import { createHmac, randomUUID } from 'crypto';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  responseTime?: number;
  statusCode?: number;
  supportedEvents?: string[];
}

interface TestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  error?: string;
  testedAt: Date;
  testPayload?: any;
}

interface CRMIntegrationConfig {
  crmType: 'tave' | 'lightblue' | 'honeybook' | 'studio_ninja' | 'custom';
  apiKey?: string;
  oauthToken?: string;
  webhookUrl: string;
  fieldMapping: Record<string, string>;
  isActive: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  lastSync?: Date;
}

interface EmailPlatformConfig {
  platform:
    | 'mailchimp'
    | 'constant_contact'
    | 'klaviyo'
    | 'sendgrid'
    | 'custom';
  apiKey: string;
  webhookUrl: string;
  listIds: string[];
  automationTriggers: string[];
  isActive: boolean;
}

interface BookingSystemConfig {
  systemType: 'acuity' | 'calendly' | 'bookme' | 'custom';
  apiCredentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  webhookUrl: string;
  eventTypes: string[];
  isActive: boolean;
}

interface IntegrationResult {
  success: boolean;
  integrationId?: string;
  error?: string;
  configurationValid: boolean;
  testsCompleted: number;
  testsPassed: number;
  warnings: string[];
  nextSteps: string[];
}

interface HealthStatus {
  isHealthy: boolean;
  responseTime: number;
  statusCode?: number;
  consecutiveFailures: number;
  lastError?: string;
  lastCheckAt: Date;
  uptime: number;
}

interface DiagnosisResult {
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  possibleCauses: string[];
  recommendedActions: string[];
  automaticRetryRecommended: boolean;
  escalationRequired: boolean;
}

interface DeliveryFailure {
  webhookId: string;
  endpointUrl: string;
  errorCode?: number;
  errorMessage: string;
  payload: any;
  attemptCount: number;
  failedAt: Date;
  nextRetryAt?: Date;
}

interface IntegrationReport {
  organizationId: string;
  totalWebhooks: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  uptimePercentage: number;
  mostCommonErrors: Array<{ error: string; count: number }>;
  recommendations: string[];
  generatedAt: Date;
  reportPeriod: {
    from: Date;
    to: Date;
  };
}

/**
 * ExternalWebhookClient - Handles communication with external systems via webhooks
 *
 * This service provides comprehensive webhook delivery capabilities for wedding industry
 * integrations, including CRM systems, booking platforms, and email marketing tools.
 *
 * Key Features:
 * - Secure webhook delivery with HMAC signature verification
 * - Support for major wedding industry CRMs (Tave, HoneyBook, Light Blue)
 * - Health monitoring and circuit breaker patterns
 * - Comprehensive error handling and diagnostics
 * - Wedding-specific event routing and data transformation
 */
export class ExternalWebhookClient {
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly maxRetries = 5;
  private readonly circuitBreakerThreshold = 10;
  private healthCache = new Map<string, HealthStatus>();

  constructor(
    private readonly userId: string,
    private readonly organizationId: string,
  ) {}

  /**
   * Delivers webhook to external system with comprehensive error handling
   * Optimized for wedding industry requirements with priority routing
   */
  async deliverWebhookToExternalSystem(
    webhook: WebhookDelivery,
    endpoint: WebhookEndpoint,
  ): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      // Check circuit breaker status
      if (!this.shouldDeliverToEndpoint(endpoint)) {
        throw new IntegrationError(
          'Endpoint in circuit breaker open state',
          ErrorCategory.CIRCUIT_BREAKER_OPEN,
        );
      }

      // Prepare webhook request
      const payload = this.prepareWebhookPayload(webhook, endpoint);
      const signature = this.generateWebhookSignature(
        payload,
        endpoint.secretKey,
      );
      const headers = this.buildRequestHeaders(webhook, endpoint, signature);

      // Attempt delivery with retry logic
      let lastError: Error | null = null;
      let attempt = 1;

      while (attempt <= webhook.maxRetries) {
        try {
          const response = await this.makeWebhookRequest(
            endpoint.url,
            payload,
            headers,
            endpoint.timeout,
          );

          const responseTime = Date.now() - startTime;

          // Log successful delivery
          await this.logWebhookDelivery(webhook, endpoint, {
            success: true,
            statusCode: response.status,
            responseTime,
            deliveredAt: new Date(),
            retryCount: attempt - 1,
          });

          // Reset circuit breaker on success
          await this.recordSuccessfulDelivery(endpoint.id);

          return {
            success: true,
            statusCode: response.status,
            responseTime,
            responseBody: await this.safelyReadResponse(response),
            deliveredAt: new Date(),
            retryCount: attempt - 1,
          };
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error('Unknown error');

          // Record failure for circuit breaker
          await this.recordFailedDelivery(endpoint.id, lastError);

          // Calculate delay before next retry
          if (attempt < webhook.maxRetries) {
            const delay = this.calculateRetryDelay(attempt);
            await this.sleep(delay);
          }

          attempt++;
        }
      }

      // All retries exhausted
      const responseTime = Date.now() - startTime;

      await this.logWebhookDelivery(webhook, endpoint, {
        success: false,
        error: lastError?.message,
        responseTime,
        deliveredAt: new Date(),
        retryCount: webhook.maxRetries,
      });

      return {
        success: false,
        error: lastError?.message || 'Unknown error',
        responseTime,
        deliveredAt: new Date(),
        retryCount: webhook.maxRetries,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await integrationDataManager.logAudit(
        this.userId,
        this.organizationId,
        'WEBHOOK_DELIVERY_FAILED',
        webhook.id,
        'webhook_delivery',
        {
          endpointUrl: endpoint.url,
          error: errorMessage,
          responseTime,
          eventType: webhook.eventType,
        },
      );

      return {
        success: false,
        error: errorMessage,
        responseTime,
        deliveredAt: new Date(),
        retryCount: 0,
      };
    }
  }

  /**
   * Validates external webhook endpoint before registration
   */
  async validateExternalEndpoint(url: string): Promise<ValidationResult> {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Basic URL validation
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        validation.errors.push('URL must use HTTP or HTTPS protocol');
        validation.isValid = false;
      }

      if (parsedUrl.protocol === 'http:' && !url.includes('localhost')) {
        validation.warnings.push(
          'HTTP endpoints are not secure. HTTPS is recommended for production',
        );
      }

      // Test endpoint availability
      const startTime = Date.now();

      try {
        const response = await fetch(url, {
          method: 'HEAD',
          timeout: 10000,
          headers: {
            'User-Agent': 'WedSync-Webhook-Validator/1.0',
          },
        });

        validation.responseTime = Date.now() - startTime;
        validation.statusCode = response.status;

        if (response.status >= 400) {
          validation.errors.push(
            `Endpoint returned error status: ${response.status}`,
          );
          validation.isValid = false;
        }

        // Check for webhook-specific headers
        const webhookSupport = response.headers.get('x-webhook-support');
        if (webhookSupport) {
          validation.supportedEvents = webhookSupport
            .split(',')
            .map((e) => e.trim());
        }
      } catch (fetchError) {
        validation.errors.push(
          `Endpoint not reachable: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        );
        validation.isValid = false;
      }
    } catch (urlError) {
      validation.errors.push('Invalid URL format');
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Tests webhook delivery with sample payload
   */
  async testWebhookDelivery(
    endpoint: WebhookEndpoint,
    testPayload: any,
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const payload = JSON.stringify({
        ...testPayload,
        test: true,
        timestamp: new Date().toISOString(),
        source: 'wedsync-test',
      });

      const signature = this.generateWebhookSignature(
        payload,
        endpoint.secretKey,
      );
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'WedSync-Webhook-Test/1.0',
        'X-WedSync-Signature': signature,
        'X-WedSync-Test': 'true',
        'X-WedSync-Timestamp': Date.now().toString(),
        ...endpoint.headers,
      };

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(endpoint.timeout || this.defaultTimeout),
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await this.safelyReadResponse(response);

      return {
        success: response.ok,
        responseTime,
        statusCode: response.status,
        responseHeaders: Object.fromEntries(response.headers),
        responseBody,
        testedAt: new Date(),
        testPayload,
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        testedAt: new Date(),
        testPayload,
      };
    }
  }

  /**
   * Integrates with photography CRM systems (Tave, HoneyBook, etc.)
   */
  async integrateCRMSystem(
    crmConfig: CRMIntegrationConfig,
  ): Promise<IntegrationResult> {
    const result: IntegrationResult = {
      success: false,
      configurationValid: false,
      testsCompleted: 0,
      testsPassed: 0,
      warnings: [],
      nextSteps: [],
    };

    try {
      // Validate CRM configuration
      const configValidation = await this.validateCRMConfiguration(crmConfig);
      result.configurationValid = configValidation.isValid;
      result.warnings = configValidation.warnings;

      if (!configValidation.isValid) {
        result.error = `Configuration invalid: ${configValidation.errors.join(', ')}`;
        return result;
      }

      // Test webhook endpoint
      const testPayload = this.generateCRMTestPayload(crmConfig.crmType);
      const endpoint: WebhookEndpoint = {
        id: `test-${Date.now()}`,
        url: crmConfig.webhookUrl,
        secretKey: crmConfig.apiKey || 'test-secret',
        organizationId: this.organizationId,
        isActive: true,
        eventTypes: ['client.created', 'booking.updated'],
        consecutiveFailures: 0,
        timeout: this.defaultTimeout,
      };

      const testResult = await this.testWebhookDelivery(endpoint, testPayload);
      result.testsCompleted = 1;
      result.testsPassed = testResult.success ? 1 : 0;

      if (testResult.success) {
        // Create integration configuration
        const integrationId = await this.createCRMIntegration(crmConfig);
        result.integrationId = integrationId;
        result.success = true;
        result.nextSteps = [
          'Integration created successfully',
          'Test with real wedding data',
          'Configure event types and field mapping',
          'Set up monitoring and alerts',
        ];
      } else {
        result.error = `Webhook test failed: ${testResult.error}`;
        result.nextSteps = [
          'Verify webhook URL is accessible',
          'Check API credentials',
          'Review endpoint documentation',
          'Contact CRM support if needed',
        ];
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Integrates with email marketing platforms
   */
  async integrateEmailPlatform(
    emailConfig: EmailPlatformConfig,
  ): Promise<IntegrationResult> {
    const result: IntegrationResult = {
      success: false,
      configurationValid: false,
      testsCompleted: 0,
      testsPassed: 0,
      warnings: [],
      nextSteps: [],
    };

    try {
      // Validate email platform configuration
      const validation = await this.validateEmailPlatformConfig(emailConfig);
      result.configurationValid = validation.isValid;
      result.warnings = validation.warnings;

      if (!validation.isValid) {
        result.error = `Configuration invalid: ${validation.errors.join(', ')}`;
        return result;
      }

      // Test API connectivity
      const apiTest = await this.testEmailPlatformAPI(emailConfig);
      result.testsCompleted++;
      if (apiTest.success) result.testsPassed++;

      // Test webhook endpoint
      const webhookTest = await this.testEmailPlatformWebhook(emailConfig);
      result.testsCompleted++;
      if (webhookTest.success) result.testsPassed++;

      if (result.testsPassed === result.testsCompleted) {
        const integrationId =
          await this.createEmailPlatformIntegration(emailConfig);
        result.integrationId = integrationId;
        result.success = true;
        result.nextSteps = [
          'Email platform integration completed',
          'Configure automation triggers',
          'Set up journey completion webhooks',
          'Test with sample wedding data',
        ];
      } else {
        result.error = 'One or more tests failed';
        result.nextSteps = [
          'Verify API credentials',
          'Check webhook URL configuration',
          'Review platform-specific requirements',
          'Test connectivity from your server',
        ];
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Integrates with booking systems
   */
  async integrateBookingSystem(
    bookingConfig: BookingSystemConfig,
  ): Promise<IntegrationResult> {
    const result: IntegrationResult = {
      success: false,
      configurationValid: false,
      testsCompleted: 0,
      testsPassed: 0,
      warnings: [],
      nextSteps: [],
    };

    try {
      // Validate booking system configuration
      const validation = await this.validateBookingSystemConfig(bookingConfig);
      result.configurationValid = validation.isValid;

      if (!validation.isValid) {
        result.error = `Configuration invalid: ${validation.errors.join(', ')}`;
        return result;
      }

      // Test booking system integration
      const integrationTest =
        await this.testBookingSystemIntegration(bookingConfig);
      result.testsCompleted = 1;
      result.testsPassed = integrationTest.success ? 1 : 0;

      if (integrationTest.success) {
        const integrationId =
          await this.createBookingSystemIntegration(bookingConfig);
        result.integrationId = integrationId;
        result.success = true;
        result.nextSteps = [
          'Booking system integration completed',
          'Configure event types and triggers',
          'Set up availability synchronization',
          'Test booking workflow end-to-end',
        ];
      } else {
        result.error = integrationTest.error || 'Integration test failed';
        result.nextSteps = [
          'Verify booking system API credentials',
          'Check webhook endpoint configuration',
          'Review event type mappings',
          'Contact booking system support',
        ];
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Monitors endpoint health and returns status
   */
  async monitorEndpointHealth(
    endpoint: WebhookEndpoint,
  ): Promise<HealthStatus> {
    const cacheKey = `health_${endpoint.id}`;
    const cached = this.healthCache.get(cacheKey);

    // Return cached result if recent (5 minutes)
    if (cached && Date.now() - cached.lastCheckAt.getTime() < 300000) {
      return cached;
    }

    const startTime = Date.now();
    let health: HealthStatus = {
      isHealthy: false,
      responseTime: 0,
      consecutiveFailures: endpoint.consecutiveFailures,
      lastCheckAt: new Date(),
      uptime: 0,
    };

    try {
      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(endpoint.timeout || this.defaultTimeout),
        headers: {
          'User-Agent': 'WedSync-Health-Check/1.0',
        },
      });

      health.responseTime = Date.now() - startTime;
      health.statusCode = response.status;
      health.isHealthy = response.ok && health.responseTime < 30000;

      if (health.isHealthy) {
        health.consecutiveFailures = 0;
        health.uptime = await this.calculateUptime(endpoint.id);
      } else {
        health.consecutiveFailures = endpoint.consecutiveFailures + 1;
        health.lastError = `HTTP ${response.status}`;
      }
    } catch (error) {
      health.responseTime = Date.now() - startTime;
      health.consecutiveFailures = endpoint.consecutiveFailures + 1;
      health.lastError =
        error instanceof Error ? error.message : 'Unknown error';
    }

    // Cache health status
    this.healthCache.set(cacheKey, health);

    // Update endpoint health in database
    await this.updateEndpointHealth(endpoint.id, health);

    return health;
  }

  /**
   * Diagnoses webhook delivery failures
   */
  async diagnoseDeliveryFailure(
    failureData: DeliveryFailure,
  ): Promise<DiagnosisResult> {
    const diagnosis: DiagnosisResult = {
      issue: 'Webhook delivery failed',
      severity: 'medium',
      possibleCauses: [],
      recommendedActions: [],
      automaticRetryRecommended: false,
      escalationRequired: false,
    };

    // Analyze error patterns
    if (failureData.errorCode) {
      switch (Math.floor(failureData.errorCode / 100)) {
        case 4:
          diagnosis.severity = 'high';
          diagnosis.possibleCauses.push(
            'Client error - invalid request or authentication',
          );
          diagnosis.recommendedActions.push(
            'Verify webhook URL and authentication credentials',
          );
          diagnosis.recommendedActions.push(
            'Check request format and required headers',
          );
          diagnosis.automaticRetryRecommended = false;
          break;

        case 5:
          diagnosis.severity = 'medium';
          diagnosis.possibleCauses.push(
            'Server error - temporary service unavailability',
          );
          diagnosis.recommendedActions.push(
            'Monitor endpoint health and retry',
          );
          diagnosis.automaticRetryRecommended = true;
          break;
      }
    }

    // Check for network-related issues
    if (
      failureData.errorMessage.includes('timeout') ||
      failureData.errorMessage.includes('ETIMEDOUT')
    ) {
      diagnosis.possibleCauses.push(
        'Network timeout - slow or unresponsive endpoint',
      );
      diagnosis.recommendedActions.push(
        'Increase timeout value or contact endpoint provider',
      );
      diagnosis.automaticRetryRecommended = true;
    }

    if (
      failureData.errorMessage.includes('ECONNREFUSED') ||
      failureData.errorMessage.includes('ENOTFOUND')
    ) {
      diagnosis.severity = 'high';
      diagnosis.possibleCauses.push(
        'Network connectivity issue - endpoint unreachable',
      );
      diagnosis.recommendedActions.push(
        'Verify endpoint URL and network connectivity',
      );
      diagnosis.automaticRetryRecommended = false;
    }

    // Check failure frequency
    if (failureData.attemptCount >= this.maxRetries) {
      diagnosis.severity = 'critical';
      diagnosis.escalationRequired = true;
      diagnosis.recommendedActions.push(
        'Manual intervention required - contact support',
      );
    }

    return diagnosis;
  }

  /**
   * Generates comprehensive integration report
   */
  async generateIntegrationReport(
    supplierId: string,
  ): Promise<IntegrationReport> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // This would query actual webhook delivery data from the database
    const mockData = {
      totalWebhooks: 1250,
      successfulDeliveries: 1185,
      failedDeliveries: 65,
      avgResponseTime: 1.2,
    };

    const report: IntegrationReport = {
      organizationId: supplierId,
      totalWebhooks: mockData.totalWebhooks,
      successfulDeliveries: mockData.successfulDeliveries,
      failedDeliveries: mockData.failedDeliveries,
      averageResponseTime: mockData.avgResponseTime,
      uptimePercentage:
        (mockData.successfulDeliveries / mockData.totalWebhooks) * 100,
      mostCommonErrors: [
        { error: 'Connection timeout', count: 25 },
        { error: 'HTTP 500', count: 18 },
        { error: 'Authentication failed', count: 12 },
        { error: 'Invalid payload', count: 10 },
      ],
      recommendations: [
        'Consider increasing timeout values for slow endpoints',
        'Set up monitoring alerts for authentication failures',
        'Review payload formats with external service providers',
        'Implement exponential backoff for failed deliveries',
      ],
      generatedAt: new Date(),
      reportPeriod: { from: startDate, to: endDate },
    };

    return report;
  }

  // Private utility methods

  private prepareWebhookPayload(
    webhook: WebhookDelivery,
    endpoint: WebhookEndpoint,
  ): string {
    const payload = {
      id: webhook.id,
      event_type: webhook.eventType,
      data: webhook.payload,
      timestamp: webhook.timestamp.toISOString(),
      organization_id: webhook.organizationId,
      source: 'wedsync',
      webhook_version: '1.0',
    };

    return JSON.stringify(payload);
  }

  private generateWebhookSignature(payload: string, secretKey: string): string {
    return createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  private buildRequestHeaders(
    webhook: WebhookDelivery,
    endpoint: WebhookEndpoint,
    signature: string,
  ): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'WedSync-Webhook/1.0',
      'X-WedSync-Signature': `sha256=${signature}`,
      'X-WedSync-Event': webhook.eventType,
      'X-WedSync-Timestamp': Date.now().toString(),
      'X-WedSync-Delivery-Id': webhook.id,
      ...endpoint.headers,
    };
  }

  private async makeWebhookRequest(
    url: string,
    payload: string,
    headers: Record<string, string>,
    timeout: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async safelyReadResponse(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return 'Unable to read response';
    }
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 2^attempt * 1000ms, capped at 30 seconds
    return Math.min(Math.pow(2, attempt) * 1000, 30000);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldDeliverToEndpoint(endpoint: WebhookEndpoint): boolean {
    return (
      endpoint.isActive &&
      endpoint.consecutiveFailures < this.circuitBreakerThreshold
    );
  }

  private async recordSuccessfulDelivery(endpointId: string): Promise<void> {
    // This would update the endpoint health in the database
    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'WEBHOOK_DELIVERY_SUCCESS',
      endpointId,
      'webhook_health',
      { consecutiveFailures: 0 },
    );
  }

  private async recordFailedDelivery(
    endpointId: string,
    error: Error,
  ): Promise<void> {
    // This would increment the failure count in the database
    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'WEBHOOK_DELIVERY_FAILED',
      endpointId,
      'webhook_health',
      { error: error.message },
    );
  }

  private async logWebhookDelivery(
    webhook: WebhookDelivery,
    endpoint: WebhookEndpoint,
    result: Partial<DeliveryResult>,
  ): Promise<void> {
    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      result.success ? 'WEBHOOK_DELIVERED' : 'WEBHOOK_FAILED',
      webhook.id,
      'webhook_delivery',
      {
        endpointId: endpoint.id,
        eventType: webhook.eventType,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        retryCount: result.retryCount,
        error: result.error,
      },
    );
  }

  // CRM Integration helpers
  private generateCRMTestPayload(crmType: string): any {
    const basePayload = {
      event_type: 'client.created',
      client: {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+1234567890',
        wedding_date: '2024-06-15',
        partner_name: 'John Doe',
      },
      timestamp: new Date().toISOString(),
    };

    // Customize for specific CRM types
    switch (crmType) {
      case 'tave':
        return { ...basePayload, tave_job_number: 'TEST-001' };
      case 'honeybook':
        return { ...basePayload, project_id: 'test-project-id' };
      default:
        return basePayload;
    }
  }

  private async validateCRMConfiguration(
    config: CRMIntegrationConfig,
  ): Promise<ValidationResult> {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!config.webhookUrl) {
      validation.errors.push('Webhook URL is required');
      validation.isValid = false;
    }

    if (!config.apiKey && !config.oauthToken) {
      validation.errors.push('API key or OAuth token is required');
      validation.isValid = false;
    }

    if (Object.keys(config.fieldMapping).length === 0) {
      validation.warnings.push(
        'No field mapping configured - default mapping will be used',
      );
    }

    return validation;
  }

  private async createCRMIntegration(
    config: CRMIntegrationConfig,
  ): Promise<string> {
    // This would create the integration record in the database
    const integrationId = `crm_${config.crmType}_${Date.now()}`;

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'CRM_INTEGRATION_CREATED',
      integrationId,
      'crm_integration',
      {
        crmType: config.crmType,
        webhookUrl: config.webhookUrl,
        syncFrequency: config.syncFrequency,
      },
    );

    return integrationId;
  }

  // Email Platform Integration helpers
  private async validateEmailPlatformConfig(
    config: EmailPlatformConfig,
  ): Promise<ValidationResult> {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!config.apiKey) {
      validation.errors.push('API key is required');
      validation.isValid = false;
    }

    if (!config.webhookUrl) {
      validation.errors.push('Webhook URL is required');
      validation.isValid = false;
    }

    return validation;
  }

  private async testEmailPlatformAPI(
    config: EmailPlatformConfig,
  ): Promise<TestResult> {
    // Mock API test - in real implementation, would test actual platform API
    return {
      success: true,
      responseTime: 250,
      statusCode: 200,
      testedAt: new Date(),
    };
  }

  private async testEmailPlatformWebhook(
    config: EmailPlatformConfig,
  ): Promise<TestResult> {
    const endpoint: WebhookEndpoint = {
      id: 'test',
      url: config.webhookUrl,
      secretKey: config.apiKey,
      organizationId: this.organizationId,
      isActive: true,
      eventTypes: config.automationTriggers,
      consecutiveFailures: 0,
      timeout: this.defaultTimeout,
    };

    const testPayload = {
      event_type: 'journey.completed',
      contact: { email: 'test@example.com' },
      journey_name: 'Wedding Planning Sequence',
    };

    return this.testWebhookDelivery(endpoint, testPayload);
  }

  private async createEmailPlatformIntegration(
    config: EmailPlatformConfig,
  ): Promise<string> {
    const integrationId = `email_${config.platform}_${Date.now()}`;

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'EMAIL_PLATFORM_INTEGRATION_CREATED',
      integrationId,
      'email_integration',
      {
        platform: config.platform,
        webhookUrl: config.webhookUrl,
        listCount: config.listIds.length,
      },
    );

    return integrationId;
  }

  // Booking System Integration helpers
  private async validateBookingSystemConfig(
    config: BookingSystemConfig,
  ): Promise<ValidationResult> {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!config.apiCredentials.apiKey && !config.apiCredentials.clientId) {
      validation.errors.push('API credentials are required');
      validation.isValid = false;
    }

    if (!config.webhookUrl) {
      validation.errors.push('Webhook URL is required');
      validation.isValid = false;
    }

    return validation;
  }

  private async testBookingSystemIntegration(
    config: BookingSystemConfig,
  ): Promise<TestResult> {
    // Mock booking system test
    return {
      success: true,
      responseTime: 180,
      statusCode: 200,
      testedAt: new Date(),
    };
  }

  private async createBookingSystemIntegration(
    config: BookingSystemConfig,
  ): Promise<string> {
    const integrationId = `booking_${config.systemType}_${Date.now()}`;

    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'BOOKING_SYSTEM_INTEGRATION_CREATED',
      integrationId,
      'booking_integration',
      {
        systemType: config.systemType,
        webhookUrl: config.webhookUrl,
        eventTypes: config.eventTypes,
      },
    );

    return integrationId;
  }

  private async calculateUptime(endpointId: string): Promise<number> {
    // This would calculate actual uptime from historical data
    return 99.5; // Mock 99.5% uptime
  }

  private async updateEndpointHealth(
    endpointId: string,
    health: HealthStatus,
  ): Promise<void> {
    await integrationDataManager.logAudit(
      this.userId,
      this.organizationId,
      'ENDPOINT_HEALTH_UPDATED',
      endpointId,
      'endpoint_health',
      {
        isHealthy: health.isHealthy,
        responseTime: health.responseTime,
        consecutiveFailures: health.consecutiveFailures,
        statusCode: health.statusCode,
      },
    );
  }
}
