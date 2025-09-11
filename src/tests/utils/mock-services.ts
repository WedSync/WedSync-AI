import { EventEmitter } from 'events';

export interface ServiceConfig {
  failureRate?: number;
  responseTime?: number;
  maxRetries?: number;
  circuitBreakerThreshold?: number;
  enabled?: boolean;
}

// Enhanced interfaces for comprehensive error testing
export interface WeddingErrorTestContext {
  userType: 'couple' | 'supplier' | 'coordinator' | 'admin';
  weddingPhase:
    | 'planning'
    | 'booking'
    | 'final_preparations'
    | 'wedding_day'
    | 'post_wedding';
  weddingDate: string;
  vendorType?: string;
  guestCount?: number;
  revenueImpact?: number;
  criticalPath: boolean;
  locationQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  connectionType?: 'fiber' | '4g' | '3g' | '2g' | 'offline';
}

export interface ErrorTestScenario {
  scenarioId: string;
  errorType: string;
  trigger: 'immediate' | 'conditional' | 'timed';
  condition?: string;
  duration: number;
  probability: number;
  recoverable: boolean;
  weddingImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface NetworkConditions {
  latency: number; // milliseconds
  packetLoss: number; // percentage 0-1
  bandwidth: number; // mbps
  stability: number; // percentage 0-1
}

export interface DeviceCapabilities {
  memory: number; // MB
  cpu: number; // relative performance 0-1
  battery: number; // percentage 0-100
  storage: number; // available MB
  networkType: 'wifi' | 'cellular' | 'offline';
}

export interface MockService {
  name: string;
  config: ServiceConfig;
  requestCount: number;
  failureCount: number;
  lastRequest?: Date;
  status: 'healthy' | 'degraded' | 'down' | 'circuit-open';
}

export class MockServiceRegistry extends EventEmitter {
  private services: Map<string, MockService>;
  private defaultConfig: ServiceConfig = {
    failureRate: 0.0,
    responseTime: 100,
    maxRetries: 3,
    circuitBreakerThreshold: 5,
    enabled: true,
  };

  constructor() {
    super();
    this.services = new Map();
  }

  async initialize(): Promise<void> {
    console.log('🔄 Initializing mock services...');

    // Initialize core wedding platform services
    this.registerService('email-service', {
      failureRate: 0.01,
      responseTime: 200,
      enabled: true,
    });

    this.registerService('sms-service', {
      failureRate: 0.02,
      responseTime: 150,
      enabled: true,
    });

    this.registerService('stripe-service', {
      failureRate: 0.005,
      responseTime: 300,
      enabled: true,
    });

    this.registerService('supplier-api', {
      failureRate: 0.03,
      responseTime: 500,
      enabled: true,
    });

    this.registerService('photo-storage', {
      failureRate: 0.01,
      responseTime: 800,
      enabled: true,
    });

    this.registerService('calendar-sync', {
      failureRate: 0.02,
      responseTime: 250,
      enabled: true,
    });

    this.registerService('notification-service', {
      failureRate: 0.01,
      responseTime: 100,
      enabled: true,
    });

    this.registerService('analytics-service', {
      failureRate: 0.001,
      responseTime: 50,
      enabled: true,
    });

    console.log('✅ Mock services initialization complete');
    this.emit('initialized');
  }

  registerService(name: string, config: Partial<ServiceConfig> = {}): void {
    const serviceConfig = { ...this.defaultConfig, ...config };

    this.services.set(name, {
      name,
      config: serviceConfig,
      requestCount: 0,
      failureCount: 0,
      status: serviceConfig.enabled ? 'healthy' : 'down',
    });

    console.log(`📋 Registered mock service: ${name}`);
  }

  configureService(name: string, config: Partial<ServiceConfig>): void {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }

    service.config = { ...service.config, ...config };

    // Update service status based on configuration
    if (!service.config.enabled) {
      service.status = 'down';
    } else if (service.config.failureRate! >= 0.5) {
      service.status = 'degraded';
    } else {
      service.status = 'healthy';
    }

    console.log(`🔧 Configured service ${name}: ${JSON.stringify(config)}`);
    this.emit('service-configured', { name, config });
  }

  async makeRequest(
    serviceName: string,
    request: {
      method: string;
      endpoint: string;
      payload?: any;
      headers?: Record<string, string>;
    },
  ): Promise<MockServiceResponse> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    service.requestCount++;
    service.lastRequest = new Date();

    // Check if service is enabled
    if (!service.config.enabled || service.status === 'down') {
      throw new ServiceError('Service unavailable', 503, serviceName);
    }

    // Check circuit breaker
    if (service.status === 'circuit-open') {
      throw new ServiceError('Circuit breaker open', 503, serviceName);
    }

    // Simulate response time
    await this.simulateDelay(service.config.responseTime!);

    // Determine if request should fail based on failure rate
    const shouldFail = Math.random() < service.config.failureRate!;

    if (shouldFail) {
      service.failureCount++;

      // Check if we should open circuit breaker
      if (service.failureCount >= service.config.circuitBreakerThreshold!) {
        service.status = 'circuit-open';
        console.warn(`🚨 Circuit breaker opened for ${serviceName}`);
        this.emit('circuit-breaker-opened', { service: serviceName });

        // Auto-recover after 30 seconds (for testing)
        setTimeout(() => {
          if (service.status === 'circuit-open') {
            service.status = 'healthy';
            service.failureCount = 0;
            console.log(`✅ Circuit breaker reset for ${serviceName}`);
            this.emit('circuit-breaker-reset', { service: serviceName });
          }
        }, 30000);
      }

      throw new ServiceError(
        this.generateErrorMessage(serviceName, request),
        this.generateErrorCode(serviceName),
        serviceName,
      );
    }

    // Generate successful response
    return this.generateSuccessResponse(serviceName, request);
  }

  private async simulateDelay(ms: number): Promise<void> {
    // Add some randomness to response time (±20%)
    const variance = ms * 0.2;
    const actualDelay = ms + (Math.random() - 0.5) * variance;

    return new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, actualDelay)),
    );
  }

  private generateErrorMessage(serviceName: string, request: any): string {
    const errors = {
      'email-service': [
        'SMTP server temporarily unavailable',
        'Rate limit exceeded for email sending',
        'Invalid email template',
        'Recipient email bounced',
      ],
      'sms-service': [
        'SMS gateway timeout',
        'Invalid phone number format',
        'SMS quota exceeded',
        'Carrier network error',
      ],
      'stripe-service': [
        'Payment processing failed',
        'Card declined by issuer',
        'Insufficient funds',
        'Invalid payment method',
      ],
      'supplier-api': [
        'Supplier system maintenance',
        'Authentication token expired',
        'Booking conflict detected',
        'Supplier availability service down',
      ],
      'photo-storage': [
        'Storage quota exceeded',
        'File upload timeout',
        'Invalid image format',
        'Storage service maintenance',
      ],
      'calendar-sync': [
        'Calendar provider API limit reached',
        'Calendar access token expired',
        'Calendar event conflict',
        'Sync service temporarily down',
      ],
      'notification-service': [
        'Push notification service down',
        'Invalid device token',
        'Notification quota exceeded',
        'Message too long',
      ],
      'analytics-service': [
        'Analytics pipeline busy',
        'Data processing error',
        'Metrics collection failed',
        'Analytics service maintenance',
      ],
    };

    const serviceErrors = errors[serviceName as keyof typeof errors] || [
      'Service error',
    ];
    return serviceErrors[Math.floor(Math.random() * serviceErrors.length)];
  }

  private generateErrorCode(serviceName: string): number {
    const codes = [400, 401, 403, 404, 429, 500, 502, 503, 504];
    return codes[Math.floor(Math.random() * codes.length)];
  }

  private generateSuccessResponse(
    serviceName: string,
    request: any,
  ): MockServiceResponse {
    const baseResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      service: serviceName,
      requestId: this.generateRequestId(),
    };

    switch (serviceName) {
      case 'email-service':
        return {
          ...baseResponse,
          data: {
            messageId: `email-${Date.now()}`,
            status: 'sent',
            recipient: request.payload?.to || 'test@example.com',
          },
        };

      case 'sms-service':
        return {
          ...baseResponse,
          data: {
            messageId: `sms-${Date.now()}`,
            status: 'sent',
            recipient: request.payload?.to || '+1234567890',
          },
        };

      case 'stripe-service':
        return {
          ...baseResponse,
          data: {
            paymentId: `pi_${Date.now()}`,
            status: 'succeeded',
            amount: request.payload?.amount || 5000,
          },
        };

      case 'supplier-api':
        return {
          ...baseResponse,
          data: {
            bookingId: `booking-${Date.now()}`,
            status: 'confirmed',
            supplierId: request.payload?.supplierId || 'supplier-1',
          },
        };

      case 'photo-storage':
        return {
          ...baseResponse,
          data: {
            fileId: `photo-${Date.now()}`,
            url: `https://storage.wedsync.com/photos/${Date.now()}.jpg`,
            size: Math.floor(Math.random() * 10000000), // Random size up to 10MB
          },
        };

      case 'calendar-sync':
        return {
          ...baseResponse,
          data: {
            eventId: `cal-${Date.now()}`,
            status: 'synced',
            calendar: 'Google Calendar',
          },
        };

      case 'notification-service':
        return {
          ...baseResponse,
          data: {
            notificationId: `notif-${Date.now()}`,
            status: 'delivered',
            recipients: 1,
          },
        };

      case 'analytics-service':
        return {
          ...baseResponse,
          data: {
            eventId: `analytics-${Date.now()}`,
            status: 'tracked',
            metrics: {
              users: Math.floor(Math.random() * 1000),
              events: Math.floor(Math.random() * 5000),
            },
          },
        };

      default:
        return {
          ...baseResponse,
          data: {
            message: 'Generic service response',
            status: 'success',
          },
        };
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getServiceStatus(serviceName: string): MockService | null {
    return this.services.get(serviceName) || null;
  }

  getAllServicesStatus(): MockService[] {
    return Array.from(this.services.values());
  }

  resetService(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.requestCount = 0;
      service.failureCount = 0;
      service.status = service.config.enabled ? 'healthy' : 'down';
      service.lastRequest = undefined;

      console.log(`🔄 Reset service ${serviceName}`);
      this.emit('service-reset', { service: serviceName });
    }
  }

  resetAllServices(): void {
    for (const [name] of this.services) {
      this.resetService(name);
    }
    console.log('🔄 Reset all mock services');
    this.emit('all-services-reset');
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up mock services...');

    this.removeAllListeners();
    this.services.clear();

    console.log('✅ Mock services cleanup complete');
  }

  // Enhanced error testing methods for WS-198
  async configure(context: WeddingErrorTestContext): Promise<void> {
    console.log(
      `🎭 Configuring services for ${context.userType} in ${context.weddingPhase} phase`,
    );

    await this.configureNetworkConditions(context);
    await this.configureDeviceCapabilities(context);
    await this.configureWeddingSpecificSettings(context);
  }

  private async configureNetworkConditions(
    context: WeddingErrorTestContext,
  ): Promise<void> {
    const networkSettings = this.getNetworkSettingsForConnection(
      context.connectionType || 'fiber',
    );
    const locationQuality = context.locationQuality || 'excellent';

    // Adjust network conditions based on location quality
    let qualityMultiplier = 1;
    switch (locationQuality) {
      case 'poor':
        qualityMultiplier = 3;
        break;
      case 'good':
        qualityMultiplier = 1.5;
        break;
      case 'offline':
        qualityMultiplier = Infinity;
        break;
    }

    // Apply network conditions to all services
    for (const [serviceName, service] of this.services) {
      const newResponseTime = Math.round(
        (service.config.responseTime || 100) * qualityMultiplier,
      );
      const newFailureRate = Math.min(
        (service.config.failureRate || 0) * qualityMultiplier,
        0.5,
      );

      this.configureService(serviceName, {
        responseTime: newResponseTime,
        failureRate: newFailureRate,
      });
    }
  }

  private async configureDeviceCapabilities(
    context: WeddingErrorTestContext,
  ): Promise<void> {
    const deviceCapabilities = this.getDeviceCapabilities(
      context.deviceType || 'desktop',
    );

    // Mobile devices have different performance characteristics
    if (context.deviceType === 'mobile') {
      // Increase response times for mobile
      for (const [serviceName, service] of this.services) {
        if (serviceName === 'photo-storage' || serviceName === 'supplier-api') {
          const mobileResponseTime = Math.round(
            (service.config.responseTime || 100) * 1.8,
          );
          this.configureService(serviceName, {
            responseTime: mobileResponseTime,
            failureRate: (service.config.failureRate || 0) * 1.3,
          });
        }
      }
    }
  }

  private async configureWeddingSpecificSettings(
    context: WeddingErrorTestContext,
  ): Promise<void> {
    const daysUntilWedding = this.calculateDaysUntilWedding(
      context.weddingDate,
    );

    // Wedding day critical settings
    if (context.weddingPhase === 'wedding_day') {
      console.log('🚨 Activating wedding day critical mode');
      this.activateWeddingDayMode();
    }

    // High criticality for bookings with revenue impact
    if (
      context.criticalPath &&
      context.revenueImpact &&
      context.revenueImpact > 5000
    ) {
      console.log('💰 High-value booking detected - enhanced reliability mode');
      this.activateHighValueBookingMode();
    }

    // Vendor-specific configurations
    if (context.vendorType) {
      await this.configureVendorSpecificSettings(context.vendorType);
    }
  }

  private getNetworkSettingsForConnection(
    connectionType: string,
  ): NetworkConditions {
    const networkProfiles: Record<string, NetworkConditions> = {
      fiber: {
        latency: 5,
        packetLoss: 0.001,
        bandwidth: 1000,
        stability: 0.99,
      },
      '4g': { latency: 50, packetLoss: 0.01, bandwidth: 50, stability: 0.95 },
      '3g': { latency: 150, packetLoss: 0.05, bandwidth: 5, stability: 0.85 },
      '2g': { latency: 500, packetLoss: 0.15, bandwidth: 0.1, stability: 0.7 },
      offline: { latency: Infinity, packetLoss: 1, bandwidth: 0, stability: 0 },
    };

    return networkProfiles[connectionType] || networkProfiles['fiber'];
  }

  private getDeviceCapabilities(deviceType: string): DeviceCapabilities {
    const deviceProfiles: Record<string, DeviceCapabilities> = {
      desktop: {
        memory: 8192,
        cpu: 1.0,
        battery: 100,
        storage: 50000,
        networkType: 'wifi',
      },
      tablet: {
        memory: 4096,
        cpu: 0.7,
        battery: 85,
        storage: 10000,
        networkType: 'wifi',
      },
      mobile: {
        memory: 2048,
        cpu: 0.5,
        battery: 60,
        storage: 5000,
        networkType: 'cellular',
      },
    };

    return deviceProfiles[deviceType] || deviceProfiles['desktop'];
  }

  private calculateDaysUntilWedding(weddingDate: string): number {
    const wedding = new Date(weddingDate);
    const today = new Date();
    return Math.ceil(
      (wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private activateWeddingDayMode(): void {
    // Zero tolerance for failures on wedding day
    for (const [serviceName] of this.services) {
      if (
        serviceName === 'email-service' ||
        serviceName === 'sms-service' ||
        serviceName === 'notification-service'
      ) {
        this.configureService(serviceName, {
          failureRate: 0.001, // Almost zero failures
          responseTime: 50, // Faster response
          circuitBreakerThreshold: 10, // Higher threshold
        });
      }
    }
  }

  private activateHighValueBookingMode(): void {
    // Enhanced reliability for payment and booking services
    this.configureService('stripe-service', {
      failureRate: 0.001,
      responseTime: 200,
      circuitBreakerThreshold: 15,
    });

    this.configureService('supplier-api', {
      failureRate: 0.005,
      responseTime: 300,
      circuitBreakerThreshold: 8,
    });
  }

  private async configureVendorSpecificSettings(
    vendorType: string,
  ): Promise<void> {
    switch (vendorType) {
      case 'photographer':
        this.configureService('photo-storage', {
          responseTime: 1500, // Larger files, slower upload
          failureRate: 0.02,
        });
        break;

      case 'venue':
        this.configureService('calendar-sync', {
          responseTime: 400,
          failureRate: 0.015,
        });
        break;

      case 'caterer':
        this.configureService('supplier-api', {
          responseTime: 600,
          failureRate: 0.03,
        });
        break;
    }
  }

  // Error injection methods for testing
  async injectError(
    serviceName: string,
    scenario: ErrorTestScenario,
  ): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    console.log(
      `🎭 Injecting error scenario ${scenario.scenarioId} into ${serviceName}`,
    );

    const originalConfig = { ...service.config };

    // Apply error scenario
    this.configureService(serviceName, {
      failureRate: scenario.probability,
      responseTime: (service.config.responseTime || 100) * 2,
      enabled: scenario.errorType !== 'service_down',
    });

    // Restore service after scenario duration
    if (scenario.duration > 0) {
      setTimeout(() => {
        service.config = originalConfig;
        console.log(
          `✅ Error scenario ${scenario.scenarioId} ended for ${serviceName}`,
        );
        this.emit('error-scenario-ended', {
          service: serviceName,
          scenario: scenario.scenarioId,
        });
      }, scenario.duration);
    }

    this.emit('error-scenario-injected', { service: serviceName, scenario });
  }

  async simulateWeddingDayStress(): Promise<void> {
    console.log('🚨 Simulating wedding day stress conditions');

    // Simulate high load
    const stressFactors = {
      'email-service': { responseTime: 800, failureRate: 0.05 },
      'sms-service': { responseTime: 600, failureRate: 0.04 },
      'notification-service': { responseTime: 300, failureRate: 0.03 },
      'photo-storage': { responseTime: 2000, failureRate: 0.08 },
      'calendar-sync': { responseTime: 1000, failureRate: 0.06 },
    };

    for (const [serviceName, stress] of Object.entries(stressFactors)) {
      this.configureService(serviceName, stress);
    }

    // Auto-recover after 2 minutes
    setTimeout(() => {
      this.resetAllServices();
      console.log('✅ Wedding day stress simulation ended');
    }, 120000);
  }

  async simulateMobileConnectivityIssues(): Promise<void> {
    console.log('📱 Simulating mobile connectivity issues');

    // Poor mobile performance
    const mobileIssues = {
      'photo-storage': { responseTime: 5000, failureRate: 0.25 },
      'supplier-api': { responseTime: 3000, failureRate: 0.15 },
      'calendar-sync': { responseTime: 2000, failureRate: 0.1 },
    };

    for (const [serviceName, issues] of Object.entries(mobileIssues)) {
      this.configureService(serviceName, issues);
    }
  }

  async simulatePaymentProcessorOutage(
    durationMs: number = 300000,
  ): Promise<void> {
    console.log(`💳 Simulating payment processor outage for ${durationMs}ms`);

    this.configureService('stripe-service', { enabled: false });

    // Activate backup payment processing
    this.registerService('backup-payment-service', {
      failureRate: 0.1,
      responseTime: 2000,
      enabled: true,
    });

    setTimeout(() => {
      this.configureService('stripe-service', { enabled: true });
      this.resetService('backup-payment-service');
      console.log('✅ Payment processor recovered');
    }, durationMs);
  }

  // Analytics and monitoring for error testing
  getErrorTestingMetrics(): {
    services: Array<{
      name: string;
      requestCount: number;
      failureCount: number;
      failureRate: number;
      status: string;
      avgResponseTime: number;
    }>;
    overallHealth: number;
    criticalServicesHealth: number;
  } {
    const services = Array.from(this.services.values()).map((service) => ({
      name: service.name,
      requestCount: service.requestCount,
      failureCount: service.failureCount,
      failureRate:
        service.requestCount > 0
          ? service.failureCount / service.requestCount
          : 0,
      status: service.status,
      avgResponseTime: service.config.responseTime || 0,
    }));

    const healthyServices = services.filter(
      (s) => s.status === 'healthy',
    ).length;
    const overallHealth = healthyServices / services.length;

    const criticalServices = [
      'email-service',
      'stripe-service',
      'supplier-api',
      'notification-service',
    ];
    const healthyCriticalServices = services.filter(
      (s) => criticalServices.includes(s.name) && s.status === 'healthy',
    ).length;
    const criticalServicesHealth =
      healthyCriticalServices / criticalServices.length;

    return {
      services,
      overallHealth,
      criticalServicesHealth,
    };
  }

  async generateComprehensiveTestReport(): Promise<string> {
    const metrics = this.getErrorTestingMetrics();
    const timestamp = new Date().toISOString();

    return `
# Mock Services Error Testing Report
Generated: ${timestamp}

## Overall Health Metrics
- **Overall System Health**: ${Math.round(metrics.overallHealth * 100)}%
- **Critical Services Health**: ${Math.round(metrics.criticalServicesHealth * 100)}%
- **Total Services**: ${metrics.services.length}

## Service Details
${metrics.services
  .map(
    (service) => `
### ${service.name}
- **Status**: ${service.status}
- **Requests**: ${service.requestCount}
- **Failures**: ${service.failureCount}
- **Failure Rate**: ${Math.round(service.failureRate * 100)}%
- **Avg Response Time**: ${service.avgResponseTime}ms
`,
  )
  .join('')}

## Recommendations
${metrics.criticalServicesHealth < 0.9 ? '⚠️ Critical services require attention' : '✅ All critical services healthy'}
${metrics.overallHealth < 0.8 ? '⚠️ System health below acceptable threshold' : '✅ System health acceptable'}

---
*Generated by WedSync Mock Services Registry*
`;
  }

  // Helper methods for testing specific wedding scenarios
  simulateWeddingDayLoad(): void {
    console.log('🎭 Simulating wedding day load...');

    // Increase failure rates slightly to simulate real-world conditions
    this.configureService('email-service', { failureRate: 0.02 });
    this.configureService('sms-service', { failureRate: 0.03 });
    this.configureService('supplier-api', { failureRate: 0.05 });
    this.configureService('photo-storage', { responseTime: 1200 });
  }

  simulatePeakSeasonLoad(): void {
    console.log('🎭 Simulating peak wedding season load...');

    // Increase response times to simulate high traffic
    this.configureService('email-service', { responseTime: 400 });
    this.configureService('sms-service', { responseTime: 300 });
    this.configureService('stripe-service', { responseTime: 600 });
    this.configureService('supplier-api', { responseTime: 800 });
  }

  simulateServiceOutage(serviceName: string, durationMs: number = 30000): void {
    console.log(`🎭 Simulating outage for ${serviceName} (${durationMs}ms)`);

    this.configureService(serviceName, { enabled: false });

    setTimeout(() => {
      this.configureService(serviceName, { enabled: true });
      console.log(`✅ Service ${serviceName} recovered from outage`);
    }, durationMs);
  }

  simulateNetworkLatency(baseLatencyMs: number): void {
    console.log(`🎭 Simulating network latency (base: ${baseLatencyMs}ms)`);

    for (const [name, service] of this.services) {
      const currentResponseTime = service.config.responseTime || 100;
      this.configureService(name, {
        responseTime: currentResponseTime + baseLatencyMs,
      });
    }
  }

  generateWeddingWorkflowTest(): Promise<MockServiceResponse[]> {
    console.log('🎭 Generating wedding workflow test...');

    // Simulate a typical wedding coordination workflow
    const workflow = [
      this.makeRequest('supplier-api', {
        method: 'GET',
        endpoint: '/suppliers/available',
        payload: { date: '2025-06-15', location: 'San Francisco' },
      }),
      this.makeRequest('email-service', {
        method: 'POST',
        endpoint: '/send',
        payload: { to: 'couple@example.com', template: 'booking_confirmation' },
      }),
      this.makeRequest('calendar-sync', {
        method: 'POST',
        endpoint: '/events',
        payload: { title: 'Wedding Photography', date: '2025-06-15T14:00:00Z' },
      }),
      this.makeRequest('stripe-service', {
        method: 'POST',
        endpoint: '/payment-intents',
        payload: { amount: 50000, currency: 'usd' },
      }),
      this.makeRequest('notification-service', {
        method: 'POST',
        endpoint: '/push',
        payload: { message: 'Booking confirmed!', userId: 'couple-1' },
      }),
    ];

    return Promise.all(workflow);
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public serviceName: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface MockServiceResponse {
  success: boolean;
  timestamp: string;
  service: string;
  requestId: string;
  data: any;
}
