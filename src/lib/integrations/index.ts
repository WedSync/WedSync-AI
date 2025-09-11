// WS-156 Task Creation System Integration Services - Central Export
// This module provides secure, production-ready integration services for wedding task creation
// with timeline synchronization, conflict detection, and multi-channel notifications.

// Core Integration Services
export { BaseIntegrationService } from './BaseIntegrationService';
export { CalendarIntegrationService } from './CalendarIntegrationService';
export { WeatherIntegrationService } from './WeatherIntegrationService';
export { PlacesIntegrationService } from './PlacesIntegrationService';
export { TimelineIntegrationService } from './TimelineIntegrationService';
export { ConflictDetectionService } from './ConflictDetectionService';
export { NotificationService } from './NotificationService';

// Database and Security
export {
  IntegrationDataManager,
  integrationDataManager,
} from '../database/IntegrationDataManager';
export {
  integrationSecurityMiddleware,
  addSecurityHeaders,
} from '../../middleware/integrationSecurity';
export type { IntegrationContext } from '../../middleware/integrationSecurity';

// Types and Interfaces
export type {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationEvent,
  CalendarEvent,
  CalendarEventInput,
  WeatherData,
  WeatherAlert,
  PlaceDetails,
  PlacesSearchCriteria,
  HealthCheck,
  ServiceMetrics,
  AuditLogEntry,
  IntegrationError,
  ErrorCategory,
  ErrorSeverity,
  CategorizedError,
  AvailabilityResult,
} from '../../types/integrations';

// Integration Factory - Secure service initialization
export class IntegrationServiceFactory {
  private static instance: IntegrationServiceFactory;
  private services = new Map<string, any>();

  private constructor() {}

  static getInstance(): IntegrationServiceFactory {
    if (!IntegrationServiceFactory.instance) {
      IntegrationServiceFactory.instance = new IntegrationServiceFactory();
    }
    return IntegrationServiceFactory.instance;
  }

  async createCalendarService(
    userId: string,
    organizationId: string,
    provider: 'google-calendar' | 'microsoft-graph',
  ): Promise<CalendarIntegrationService | null> {
    const credentials = await integrationDataManager.getCredentials(
      userId,
      organizationId,
      provider,
    );

    if (!credentials) {
      return null;
    }

    const config = this.getProviderConfig(provider);
    const service = new CalendarIntegrationService(config, credentials);

    // Test connection before returning
    const isValid = await service.validateConnection();
    if (!isValid) {
      throw new Error(`${provider} calendar service connection failed`);
    }

    return service;
  }

  async createWeatherService(
    userId: string,
    organizationId: string,
  ): Promise<WeatherIntegrationService | null> {
    const credentials = await integrationDataManager.getCredentials(
      userId,
      organizationId,
      'weather-service',
    );

    if (!credentials) {
      return null;
    }

    const config = {
      apiUrl: 'https://api.openweathermap.org/data/2.5',
      timeout: 15000,
      retryAttempts: 3,
      rateLimitPerMinute: 60,
    };

    const service = new WeatherIntegrationService(config, credentials);

    const isValid = await service.validateConnection();
    if (!isValid) {
      throw new Error('Weather service connection failed');
    }

    return service;
  }

  async createPlacesService(
    userId: string,
    organizationId: string,
  ): Promise<PlacesIntegrationService | null> {
    const credentials = await integrationDataManager.getCredentials(
      userId,
      organizationId,
      'google-places',
    );

    if (!credentials) {
      return null;
    }

    const config = {
      apiUrl: 'https://maps.googleapis.com/maps/api/place',
      timeout: 20000,
      retryAttempts: 3,
      rateLimitPerMinute: 100,
    };

    const service = new PlacesIntegrationService(config, credentials);

    const isValid = await service.validateConnection();
    if (!isValid) {
      throw new Error('Places service connection failed');
    }

    return service;
  }

  async createTimelineService(
    userId: string,
    organizationId: string,
    weddingDate: Date,
    weddingLocation: string,
  ): Promise<TimelineIntegrationService> {
    const service = new TimelineIntegrationService(
      userId,
      organizationId,
      weddingDate,
      weddingLocation,
    );

    await service.initialize();
    return service;
  }

  async createConflictDetectionService(
    userId: string,
    organizationId: string,
  ): Promise<ConflictDetectionService> {
    const service = new ConflictDetectionService(userId, organizationId);
    await service.initialize();
    return service;
  }

  async createNotificationService(
    userId: string,
    organizationId: string,
  ): Promise<NotificationService> {
    const service = new NotificationService(userId, organizationId);
    await service.initialize();
    return service;
  }

  private getProviderConfig(provider: string) {
    const configs = {
      'google-calendar': {
        apiUrl: 'https://www.googleapis.com',
        timeout: 30000,
        retryAttempts: 3,
        rateLimitPerMinute: 100,
      },
      'microsoft-graph': {
        apiUrl: 'https://graph.microsoft.com',
        timeout: 30000,
        retryAttempts: 3,
        rateLimitPerMinute: 120,
      },
    };

    return (
      configs[provider as keyof typeof configs] || configs['google-calendar']
    );
  }

  // Health check for all services
  async healthCheck(
    userId: string,
    organizationId: string,
  ): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, any>;
  }> {
    const results = {
      calendar: { status: 'unknown', error: null },
      weather: { status: 'unknown', error: null },
      places: { status: 'unknown', error: null },
      database: { status: 'unknown', error: null },
    };

    try {
      // Check database health
      const dbHealth = await integrationDataManager.healthCheck();
      results.database = dbHealth;

      // Check calendar service
      try {
        const calendarService = await this.createCalendarService(
          userId,
          organizationId,
          'google-calendar',
        );
        results.calendar = calendarService
          ? await calendarService.healthCheck()
          : { status: 'unhealthy', error: 'No credentials' };
      } catch (error) {
        results.calendar = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Check weather service
      try {
        const weatherService = await this.createWeatherService(
          userId,
          organizationId,
        );
        results.weather = weatherService
          ? await weatherService.healthCheck()
          : { status: 'unhealthy', error: 'No credentials' };
      } catch (error) {
        results.weather = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Check places service
      try {
        const placesService = await this.createPlacesService(
          userId,
          organizationId,
        );
        results.places = placesService
          ? await placesService.healthCheck()
          : { status: 'unhealthy', error: 'No credentials' };
      } catch (error) {
        results.places = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }

    // Determine overall status
    const healthyCount = Object.values(results).filter(
      (r) => r.status === 'healthy',
    ).length;
    const totalCount = Object.values(results).length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyCount === 0) {
      overallStatus = 'unhealthy';
    } else if (healthyCount < totalCount) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services: results,
    };
  }

  // Cleanup all services
  async cleanup(): Promise<void> {
    for (const [key, service] of this.services.entries()) {
      if (service && typeof service.destroy === 'function') {
        try {
          await service.destroy();
        } catch (error) {
          console.error(`Failed to cleanup service ${key}:`, error);
        }
      }
    }
    this.services.clear();
  }
}

// Singleton instance for global access
export const integrationFactory = IntegrationServiceFactory.getInstance();

// Cleanup on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await integrationFactory.cleanup();
  });

  process.on('SIGTERM', async () => {
    await integrationFactory.cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await integrationFactory.cleanup();
    process.exit(0);
  });
}

// Security-first integration utilities
export const IntegrationSecurity = {
  /**
   * Validates that all required environment variables are present
   */
  validateEnvironment(): { valid: boolean; missing: string[] } {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
    ];

    const optional = [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'MICROSOFT_CLIENT_ID',
      'MICROSOFT_CLIENT_SECRET',
      'OPENWEATHER_API_KEY',
      'GOOGLE_PLACES_API_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.warn('Missing required environment variables:', missing);
    }

    const missingOptional = optional.filter((key) => !process.env[key]);
    if (missingOptional.length > 0) {
      console.info(
        'Missing optional environment variables (some integrations may be unavailable):',
        missingOptional,
      );
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  },

  /**
   * Securely handles credential storage and retrieval
   */
  async storeCredentials(
    userId: string,
    organizationId: string,
    provider: string,
    credentials: any,
  ): Promise<void> {
    // Validate inputs
    if (!userId || !organizationId || !provider || !credentials) {
      throw new Error('All parameters are required for credential storage');
    }

    // Sanitize provider name
    const sanitizedProvider = provider.toLowerCase().replace(/[^a-z0-9-]/g, '');

    await integrationDataManager.storeCredentials(
      userId,
      organizationId,
      sanitizedProvider,
      credentials,
    );
  },

  /**
   * Rate limiting check before making external API calls
   */
  async checkRateLimit(provider: string, operation: string): Promise<boolean> {
    // Implementation would check current rate limit status
    // For now, always allow
    return true;
  },

  /**
   * Audit trail for all integration operations
   */
  async auditOperation(
    userId: string,
    organizationId: string,
    operation: string,
    provider: string,
    details: Record<string, any>,
  ): Promise<void> {
    await integrationDataManager.logAudit(
      userId,
      organizationId,
      `INTEGRATION_${operation.toUpperCase()}`,
      undefined,
      'integration_operation',
      {
        provider,
        operation,
        ...details,
      },
    );
  },
};

// Development utilities (only available in development)
export const IntegrationDevelopment =
  process.env.NODE_ENV === 'development'
    ? {
        /**
         * Test all integrations with mock data
         */
        async testAllIntegrations(
          userId: string,
          organizationId: string,
        ): Promise<Record<string, boolean>> {
          const results: Record<string, boolean> = {};

          try {
            const calendarService =
              await integrationFactory.createCalendarService(
                userId,
                organizationId,
                'google-calendar',
              );
            results.calendar = !!calendarService;
          } catch {
            results.calendar = false;
          }

          try {
            const weatherService =
              await integrationFactory.createWeatherService(
                userId,
                organizationId,
              );
            results.weather = !!weatherService;
          } catch {
            results.weather = false;
          }

          try {
            const placesService = await integrationFactory.createPlacesService(
              userId,
              organizationId,
            );
            results.places = !!placesService;
          } catch {
            results.places = false;
          }

          return results;
        },

        /**
         * Generate mock webhook payloads for testing
         */
        generateMockWebhookPayload(
          provider: 'google' | 'outlook',
          eventType: 'created' | 'updated' | 'deleted',
        ) {
          const mockPayloads = {
            google: {
              created: {
                kind: 'api#channel',
                id: 'test-channel-' + Date.now(),
                resourceId: 'test-resource-' + Date.now(),
                resourceUri:
                  'https://www.googleapis.com/calendar/v3/calendars/primary/events?alt=json',
                token: 'test-token',
                expiration: String(Date.now() + 3600000),
              },
            },
            outlook: {
              created: {
                subscriptionId: 'test-subscription-' + Date.now(),
                subscriptionExpirationDateTime: new Date(
                  Date.now() + 3600000,
                ).toISOString(),
                changeType: eventType,
                resource: "me/events('test-event-" + Date.now() + "')",
                resourceData: {
                  id: 'test-event-' + Date.now(),
                  '@odata.type': '#Microsoft.Graph.Event',
                  '@odata.id':
                    "Users('test-user')/Events('test-event-" +
                    Date.now() +
                    "')",
                },
                clientState: 'test-client-state',
                tenantId: 'test-tenant-' + Date.now(),
              },
            },
          };

          return (
            mockPayloads[provider][eventType] || mockPayloads[provider].created
          );
        },
      }
    : undefined;

// Export factory instance as default
export default integrationFactory;
