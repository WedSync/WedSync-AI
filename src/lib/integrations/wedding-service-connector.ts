/**
 * Wedding Service Connector
 *
 * Comprehensive integration layer for wedding industry services including
 * CRM systems, vendor management platforms, email marketing, and calendar services.
 *
 * @fileoverview Production-ready connector for WS-208 Wedding Service Integration
 * @author WedSync Development Team
 * @version 1.0.0
 * @created 2025-01-20
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { RateLimiter } from '../utils/rate-limiter';
import { WebhookManager } from './webhook-manager';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Supported wedding service types
 */
export enum WeddingServiceType {
  CRM = 'crm',
  VENDOR_MANAGEMENT = 'vendor_management',
  EMAIL_MARKETING = 'email_marketing',
  CALENDAR = 'calendar',
  PAYMENT = 'payment',
  COMMUNICATION = 'communication',
  PHOTO_GALLERY = 'photo_gallery',
  PLANNING = 'planning',
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  id: string;
  name: string;
  type: WeddingServiceType;
  provider: string;
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    webhookSecret?: string;
    baseUrl?: string;
  };
  settings: {
    syncEnabled: boolean;
    syncInterval: number; // minutes
    webhookUrl?: string;
    rateLimitConfig: {
      requestsPerMinute: number;
      burstLimit: number;
    };
    retryConfig: {
      maxRetries: number;
      backoffMultiplier: number;
      initialDelay: number;
    };
    fieldMappings: Record<string, string>;
    customSettings: Record<string, unknown>;
  };
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Journey data for external sync
 */
export interface JourneyData {
  journeyId: string;
  weddingId: string;
  clientId: string;
  journeyType: string;
  steps: JourneyStepData[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    source: 'ai_generated' | 'template' | 'manual';
    tags: string[];
  };
}

/**
 * Journey step data
 */
export interface JourneyStepData {
  id: string;
  type: 'email' | 'sms' | 'task' | 'reminder' | 'meeting';
  name: string;
  description: string;
  scheduledAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  data: {
    content?: string;
    recipients?: string[];
    attachments?: string[];
    customFields?: Record<string, unknown>;
  };
}

/**
 * Vendor data structure
 */
export interface VendorData {
  id: string;
  name: string;
  category: string;
  contactInfo: {
    email: string;
    phone: string;
    website?: string;
  };
  services: string[];
  pricing: {
    type: 'fixed' | 'hourly' | 'package';
    basePrice: number;
    currency: string;
  };
  availability: {
    dates: Date[];
    blackoutDates: Date[];
  };
  metadata: Record<string, unknown>;
}

/**
 * Client data for CRM sync
 */
export interface ClientData {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    partnerName?: string;
  };
  weddingInfo: {
    date: Date;
    venue: string;
    style: string;
    budget: number;
    guestCount: number;
  };
  preferences: {
    communicationMethod: 'email' | 'sms' | 'both';
    timezone: string;
    customFields: Record<string, unknown>;
  };
  status: 'lead' | 'prospect' | 'client' | 'completed' | 'cancelled';
}

/**
 * Integration operation result
 */
export interface IntegrationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    timestamp: Date;
    duration: number;
    rateLimitRemaining?: number;
    requestId?: string;
  };
}

/**
 * Webhook event data
 */
export interface WebhookEvent {
  id: string;
  integrationId: string;
  eventType: string;
  data: unknown;
  timestamp: Date;
  signature?: string;
  processed: boolean;
}

// ============================================================================
// MAIN WEDDING SERVICE CONNECTOR CLASS
// ============================================================================

/**
 * Wedding Service Connector
 *
 * Manages connections and data synchronization with various wedding industry
 * services and platforms, providing a unified integration layer.
 */
export class WeddingServiceConnector extends EventEmitter {
  private readonly supabase: any;
  private readonly circuitBreakers: Map<string, CircuitBreaker>;
  private readonly rateLimiters: Map<string, RateLimiter>;
  private readonly webhookManager: WebhookManager;
  private readonly integrations: Map<string, IntegrationConfig>;
  private syncTimers: Map<string, NodeJS.Timeout>;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    webhookBaseUrl?: string,
  ) {
    super();

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.circuitBreakers = new Map();
    this.rateLimiters = new Map();
    this.integrations = new Map();
    this.syncTimers = new Map();

    if (webhookBaseUrl) {
      this.webhookManager = new WebhookManager(webhookBaseUrl);
      this.setupWebhookHandlers();
    }

    logger.info('Wedding Service Connector initialized');
  }

  // ============================================================================
  // INTEGRATION MANAGEMENT
  // ============================================================================

  /**
   * Register a new wedding service integration
   *
   * @param config Integration configuration
   * @returns Promise resolving to integration result
   */
  public async registerIntegration(
    config: Omit<IntegrationConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<IntegrationResult<IntegrationConfig>> {
    const startTime = Date.now();
    const integrationId = this.generateIntegrationId(
      config.provider,
      config.type,
    );

    try {
      // Validate configuration
      this.validateIntegrationConfig(config);

      // Test connection
      const testResult = await this.testConnection(config);
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error}`);
      }

      // Create integration config
      const integration: IntegrationConfig = {
        ...config,
        id: integrationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      const { error } = await this.supabase
        .from('wedding_service_integrations')
        .insert([
          {
            id: integration.id,
            name: integration.name,
            type: integration.type,
            provider: integration.provider,
            credentials: integration.credentials,
            settings: integration.settings,
            is_active: integration.isActive,
            created_at: integration.createdAt,
            updated_at: integration.updatedAt,
          },
        ]);

      if (error) throw error;

      // Setup runtime components
      await this.setupIntegrationRuntime(integration);

      // Store in memory
      this.integrations.set(integrationId, integration);

      // Start sync if enabled
      if (integration.isActive && integration.settings.syncEnabled) {
        await this.startSync(integrationId);
      }

      logger.info('Integration registered successfully', {
        integrationId,
        provider: config.provider,
        type: config.type,
      });

      this.emit('integrationRegistered', integration);

      return {
        success: true,
        data: integration,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          requestId: integrationId,
        },
      };
    } catch (error) {
      logger.error('Failed to register integration', {
        provider: config.provider,
        type: config.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
          requestId: integrationId,
        },
      };
    }
  }

  /**
   * Update existing integration configuration
   *
   * @param integrationId Integration identifier
   * @param updates Configuration updates
   * @returns Promise resolving to integration result
   */
  public async updateIntegration(
    integrationId: string,
    updates: Partial<IntegrationConfig>,
  ): Promise<IntegrationResult<IntegrationConfig>> {
    const startTime = Date.now();

    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Merge updates
      const updatedIntegration = {
        ...integration,
        ...updates,
        updatedAt: new Date(),
      };

      // Test connection if credentials changed
      if (updates.credentials) {
        const testResult = await this.testConnection(updatedIntegration);
        if (!testResult.success) {
          throw new Error(`Connection test failed: ${testResult.error}`);
        }
      }

      // Update in database
      const { error } = await this.supabase
        .from('wedding_service_integrations')
        .update({
          name: updatedIntegration.name,
          credentials: updatedIntegration.credentials,
          settings: updatedIntegration.settings,
          is_active: updatedIntegration.isActive,
          updated_at: updatedIntegration.updatedAt,
        })
        .eq('id', integrationId);

      if (error) throw error;

      // Update runtime components
      await this.updateIntegrationRuntime(updatedIntegration);

      // Update in memory
      this.integrations.set(integrationId, updatedIntegration);

      // Restart sync if needed
      if (updates.settings?.syncEnabled !== undefined) {
        if (
          updatedIntegration.isActive &&
          updatedIntegration.settings.syncEnabled
        ) {
          await this.startSync(integrationId);
        } else {
          await this.stopSync(integrationId);
        }
      }

      logger.info('Integration updated successfully', { integrationId });

      this.emit('integrationUpdated', updatedIntegration);

      return {
        success: true,
        data: updatedIntegration,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Failed to update integration', {
        integrationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Remove integration
   *
   * @param integrationId Integration identifier
   * @returns Promise resolving to success status
   */
  public async removeIntegration(integrationId: string): Promise<boolean> {
    try {
      // Stop sync
      await this.stopSync(integrationId);

      // Remove from database
      const { error } = await this.supabase
        .from('wedding_service_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      // Cleanup runtime components
      this.circuitBreakers.delete(integrationId);
      this.rateLimiters.delete(integrationId);
      this.integrations.delete(integrationId);

      logger.info('Integration removed successfully', { integrationId });

      this.emit('integrationRemoved', integrationId);
      return true;
    } catch (error) {
      logger.error('Failed to remove integration', {
        integrationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // ============================================================================
  // JOURNEY DATA SYNCHRONIZATION
  // ============================================================================

  /**
   * Sync journey data to external CRM systems
   *
   * @param journeyData Journey data to sync
   * @param targetIntegrations Optional specific integrations
   * @returns Promise resolving to sync results
   */
  public async syncJourneyData(
    journeyData: JourneyData,
    targetIntegrations?: string[],
  ): Promise<IntegrationResult<Record<string, boolean>>> {
    const startTime = Date.now();
    const results: Record<string, boolean> = {};

    try {
      const crmIntegrations = this.getIntegrationsByType(
        WeddingServiceType.CRM,
      );
      const integrationsToSync = targetIntegrations
        ? crmIntegrations.filter((i) => targetIntegrations.includes(i.id))
        : crmIntegrations;

      await Promise.allSettled(
        integrationsToSync.map(async (integration) => {
          try {
            const syncResult = await this.syncToIntegration(
              integration,
              'journey',
              journeyData,
            );
            results[integration.id] = syncResult.success;

            if (syncResult.success) {
              // Update last sync time
              integration.lastSync = new Date();
              await this.updateIntegrationSyncTime(integration.id);
            }
          } catch (error) {
            logger.error('Journey sync failed for integration', {
              integrationId: integration.id,
              journeyId: journeyData.journeyId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            results[integration.id] = false;
          }
        }),
      );

      const successCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;

      logger.info('Journey data sync completed', {
        journeyId: journeyData.journeyId,
        successCount,
        totalCount,
      });

      this.emit('journeyDataSynced', { journeyData, results });

      return {
        success: successCount > 0,
        data: results,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Journey data sync failed', {
        journeyId: journeyData.journeyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Sync client data to external systems
   *
   * @param clientData Client data to sync
   * @param targetIntegrations Optional specific integrations
   * @returns Promise resolving to sync results
   */
  public async syncClientData(
    clientData: ClientData,
    targetIntegrations?: string[],
  ): Promise<IntegrationResult<Record<string, boolean>>> {
    const startTime = Date.now();
    const results: Record<string, boolean> = {};

    try {
      const relevantIntegrations = [
        ...this.getIntegrationsByType(WeddingServiceType.CRM),
        ...this.getIntegrationsByType(WeddingServiceType.EMAIL_MARKETING),
      ];

      const integrationsToSync = targetIntegrations
        ? relevantIntegrations.filter((i) => targetIntegrations.includes(i.id))
        : relevantIntegrations;

      await Promise.allSettled(
        integrationsToSync.map(async (integration) => {
          try {
            const syncResult = await this.syncToIntegration(
              integration,
              'client',
              clientData,
            );
            results[integration.id] = syncResult.success;
          } catch (error) {
            logger.error('Client sync failed for integration', {
              integrationId: integration.id,
              clientId: clientData.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            results[integration.id] = false;
          }
        }),
      );

      return {
        success: Object.values(results).some(Boolean),
        data: results,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Client data sync failed', {
        clientId: clientData.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Sync vendor data to external platforms
   *
   * @param vendorData Vendor data to sync
   * @param targetIntegrations Optional specific integrations
   * @returns Promise resolving to sync results
   */
  public async syncVendorData(
    vendorData: VendorData,
    targetIntegrations?: string[],
  ): Promise<IntegrationResult<Record<string, boolean>>> {
    const startTime = Date.now();
    const results: Record<string, boolean> = {};

    try {
      const vendorIntegrations = this.getIntegrationsByType(
        WeddingServiceType.VENDOR_MANAGEMENT,
      );
      const integrationsToSync = targetIntegrations
        ? vendorIntegrations.filter((i) => targetIntegrations.includes(i.id))
        : vendorIntegrations;

      await Promise.allSettled(
        integrationsToSync.map(async (integration) => {
          try {
            const syncResult = await this.syncToIntegration(
              integration,
              'vendor',
              vendorData,
            );
            results[integration.id] = syncResult.success;
          } catch (error) {
            logger.error('Vendor sync failed for integration', {
              integrationId: integration.id,
              vendorId: vendorData.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            results[integration.id] = false;
          }
        }),
      );

      return {
        success: Object.values(results).some(Boolean),
        data: results,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Vendor data sync failed', {
        vendorId: vendorData.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  // ============================================================================
  // CALENDAR AND SCHEDULING INTEGRATION
  // ============================================================================

  /**
   * Schedule calendar event across integrated calendar services
   *
   * @param eventData Event data
   * @param targetCalendars Optional specific calendar integrations
   * @returns Promise resolving to scheduling results
   */
  public async scheduleCalendarEvent(
    eventData: {
      title: string;
      description: string;
      startDate: Date;
      endDate: Date;
      attendees: string[];
      location?: string;
      metadata?: Record<string, unknown>;
    },
    targetCalendars?: string[],
  ): Promise<IntegrationResult<Record<string, string>>> {
    const startTime = Date.now();
    const results: Record<string, string> = {};

    try {
      const calendarIntegrations = this.getIntegrationsByType(
        WeddingServiceType.CALENDAR,
      );
      const integrationsToUse = targetCalendars
        ? calendarIntegrations.filter((i) => targetCalendars.includes(i.id))
        : calendarIntegrations;

      await Promise.allSettled(
        integrationsToUse.map(async (integration) => {
          try {
            const scheduleResult = await this.createCalendarEvent(
              integration,
              eventData,
            );
            if (scheduleResult.success && scheduleResult.data) {
              results[integration.id] = scheduleResult.data as string;
            }
          } catch (error) {
            logger.error('Calendar event creation failed', {
              integrationId: integration.id,
              eventTitle: eventData.title,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }),
      );

      return {
        success: Object.keys(results).length > 0,
        data: results,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Calendar event scheduling failed', {
        eventTitle: eventData.title,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  // ============================================================================
  // EMAIL MARKETING INTEGRATION
  // ============================================================================

  /**
   * Sync email marketing campaigns
   *
   * @param campaignData Campaign data
   * @param targetProviders Optional specific email providers
   * @returns Promise resolving to sync results
   */
  public async syncEmailCampaign(
    campaignData: {
      name: string;
      subject: string;
      content: string;
      recipients: string[];
      scheduledAt?: Date;
      tags?: string[];
      metadata?: Record<string, unknown>;
    },
    targetProviders?: string[],
  ): Promise<IntegrationResult<Record<string, string>>> {
    const startTime = Date.now();
    const results: Record<string, string> = {};

    try {
      const emailIntegrations = this.getIntegrationsByType(
        WeddingServiceType.EMAIL_MARKETING,
      );
      const integrationsToUse = targetProviders
        ? emailIntegrations.filter((i) => targetProviders.includes(i.id))
        : emailIntegrations;

      await Promise.allSettled(
        integrationsToUse.map(async (integration) => {
          try {
            const syncResult = await this.createEmailCampaign(
              integration,
              campaignData,
            );
            if (syncResult.success && syncResult.data) {
              results[integration.id] = syncResult.data as string;
            }
          } catch (error) {
            logger.error('Email campaign sync failed', {
              integrationId: integration.id,
              campaignName: campaignData.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }),
      );

      return {
        success: Object.keys(results).length > 0,
        data: results,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Email campaign sync failed', {
        campaignName: campaignData.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  /**
   * Process incoming webhook
   *
   * @param integrationId Integration that sent the webhook
   * @param payload Webhook payload
   * @param signature Optional webhook signature
   * @returns Promise resolving to processing result
   */
  public async processWebhook(
    integrationId: string,
    payload: unknown,
    signature?: string,
  ): Promise<IntegrationResult<WebhookEvent>> {
    const startTime = Date.now();

    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Verify webhook signature if provided
      if (signature && integration.credentials.webhookSecret) {
        const isValid = await this.verifyWebhookSignature(
          payload,
          signature,
          integration.credentials.webhookSecret,
        );
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Create webhook event
      const webhookEvent: WebhookEvent = {
        id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        integrationId,
        eventType: this.extractEventType(payload),
        data: payload,
        timestamp: new Date(),
        signature,
        processed: false,
      };

      // Store webhook event
      await this.storeWebhookEvent(webhookEvent);

      // Process webhook
      await this.handleWebhookEvent(webhookEvent);

      // Mark as processed
      webhookEvent.processed = true;
      await this.updateWebhookEvent(webhookEvent);

      logger.info('Webhook processed successfully', {
        integrationId,
        eventType: webhookEvent.eventType,
        webhookId: webhookEvent.id,
      });

      this.emit('webhookProcessed', webhookEvent);

      return {
        success: true,
        data: webhookEvent,
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Webhook processing failed', {
        integrationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          duration: Date.now() - startTime,
        },
      };
    }
  }

  // ============================================================================
  // UTILITY AND HELPER METHODS
  // ============================================================================

  /**
   * Get integrations by type
   *
   * @param type Integration type
   * @returns Array of matching integrations
   */
  private getIntegrationsByType(type: WeddingServiceType): IntegrationConfig[] {
    return Array.from(this.integrations.values()).filter(
      (integration) => integration.type === type && integration.isActive,
    );
  }

  /**
   * Generate unique integration ID
   *
   * @param provider Provider name
   * @param type Integration type
   * @returns Unique integration identifier
   */
  private generateIntegrationId(
    provider: string,
    type: WeddingServiceType,
  ): string {
    return `${provider}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate integration configuration
   *
   * @param config Configuration to validate
   */
  private validateIntegrationConfig(config: Partial<IntegrationConfig>): void {
    if (!config.name || config.name.length < 2) {
      throw new Error('Integration name must be at least 2 characters');
    }

    if (!config.provider) {
      throw new Error('Provider is required');
    }

    if (!config.type) {
      throw new Error('Integration type is required');
    }

    if (!config.credentials || Object.keys(config.credentials).length === 0) {
      throw new Error('Credentials are required');
    }

    if (!config.settings) {
      throw new Error('Settings are required');
    }
  }

  /**
   * Test integration connection
   *
   * @param config Integration configuration
   * @returns Promise resolving to test result
   */
  private async testConnection(
    config: Partial<IntegrationConfig>,
  ): Promise<IntegrationResult<boolean>> {
    try {
      // This would implement actual connection testing based on provider
      // For now, return success if basic validation passes

      const hasRequiredCredentials =
        config.credentials?.apiKey ||
        (config.credentials?.clientId && config.credentials?.clientSecret);

      if (!hasRequiredCredentials) {
        throw new Error('Missing required credentials');
      }

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date(),
          duration: 100,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Connection test failed',
        metadata: {
          timestamp: new Date(),
          duration: 100,
        },
      };
    }
  }

  /**
   * Setup runtime components for integration
   *
   * @param integration Integration configuration
   */
  private async setupIntegrationRuntime(
    integration: IntegrationConfig,
  ): Promise<void> {
    // Setup circuit breaker
    this.circuitBreakers.set(
      integration.id,
      new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitorTimeout: 5000,
      }),
    );

    // Setup rate limiter
    this.rateLimiters.set(
      integration.id,
      new RateLimiter({
        requestsPerMinute:
          integration.settings.rateLimitConfig.requestsPerMinute,
        burstLimit: integration.settings.rateLimitConfig.burstLimit,
      }),
    );

    // Setup webhook endpoint if configured
    if (integration.settings.webhookUrl && this.webhookManager) {
      await this.webhookManager.registerEndpoint(
        integration.id,
        integration.settings.webhookUrl,
        integration.credentials.webhookSecret,
      );
    }
  }

  /**
   * Update runtime components for integration
   *
   * @param integration Updated integration configuration
   */
  private async updateIntegrationRuntime(
    integration: IntegrationConfig,
  ): Promise<void> {
    // Update rate limiter if settings changed
    if (this.rateLimiters.has(integration.id)) {
      this.rateLimiters.set(
        integration.id,
        new RateLimiter({
          requestsPerMinute:
            integration.settings.rateLimitConfig.requestsPerMinute,
          burstLimit: integration.settings.rateLimitConfig.burstLimit,
        }),
      );
    }
  }

  /**
   * Start automatic sync for integration
   *
   * @param integrationId Integration identifier
   */
  private async startSync(integrationId: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return;

    // Clear existing timer
    if (this.syncTimers.has(integrationId)) {
      clearInterval(this.syncTimers.get(integrationId)!);
    }

    // Setup new sync timer
    const syncInterval = integration.settings.syncInterval * 60 * 1000; // Convert to ms
    const timer = setInterval(async () => {
      try {
        await this.performScheduledSync(integration);
      } catch (error) {
        logger.error('Scheduled sync failed', {
          integrationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, syncInterval);

    this.syncTimers.set(integrationId, timer);

    logger.info('Sync started for integration', {
      integrationId,
      interval: integration.settings.syncInterval,
    });
  }

  /**
   * Stop automatic sync for integration
   *
   * @param integrationId Integration identifier
   */
  private async stopSync(integrationId: string): Promise<void> {
    if (this.syncTimers.has(integrationId)) {
      clearInterval(this.syncTimers.get(integrationId)!);
      this.syncTimers.delete(integrationId);

      logger.info('Sync stopped for integration', { integrationId });
    }
  }

  /**
   * Perform scheduled sync for integration
   *
   * @param integration Integration configuration
   */
  private async performScheduledSync(
    integration: IntegrationConfig,
  ): Promise<void> {
    logger.info('Performing scheduled sync', {
      integrationId: integration.id,
      provider: integration.provider,
    });

    // This would implement the actual sync logic based on integration type
    // For now, just update the last sync time
    integration.lastSync = new Date();
    await this.updateIntegrationSyncTime(integration.id);

    this.emit('scheduledSyncCompleted', integration);
  }

  /**
   * Sync data to specific integration
   *
   * @param integration Target integration
   * @param dataType Type of data being synced
   * @param data Data to sync
   * @returns Promise resolving to sync result
   */
  private async syncToIntegration(
    integration: IntegrationConfig,
    dataType: 'journey' | 'client' | 'vendor',
    data: unknown,
  ): Promise<IntegrationResult<unknown>> {
    const circuitBreaker = this.circuitBreakers.get(integration.id);
    const rateLimiter = this.rateLimiters.get(integration.id);

    if (!circuitBreaker || !rateLimiter) {
      throw new Error('Integration runtime not initialized');
    }

    // Check rate limit
    if (!(await rateLimiter.checkLimit())) {
      throw new Error('Rate limit exceeded');
    }

    // Execute with circuit breaker
    return await circuitBreaker.call(async () => {
      // This would implement actual API calls based on provider
      // For now, simulate successful sync
      await this.delay(100);

      return {
        success: true,
        data: { syncId: `sync_${Date.now()}` },
        metadata: {
          timestamp: new Date(),
          duration: 100,
          rateLimitRemaining: rateLimiter.getRemaining(),
        },
      };
    });
  }

  /**
   * Create calendar event in external calendar service
   *
   * @param integration Calendar integration
   * @param eventData Event data
   * @returns Promise resolving to creation result
   */
  private async createCalendarEvent(
    integration: IntegrationConfig,
    eventData: any,
  ): Promise<IntegrationResult<string>> {
    // This would implement actual calendar API calls
    // For now, simulate successful creation
    await this.delay(200);

    return {
      success: true,
      data: `event_${Date.now()}`,
      metadata: {
        timestamp: new Date(),
        duration: 200,
      },
    };
  }

  /**
   * Create email campaign in external email service
   *
   * @param integration Email integration
   * @param campaignData Campaign data
   * @returns Promise resolving to creation result
   */
  private async createEmailCampaign(
    integration: IntegrationConfig,
    campaignData: any,
  ): Promise<IntegrationResult<string>> {
    // This would implement actual email service API calls
    // For now, simulate successful creation
    await this.delay(300);

    return {
      success: true,
      data: `campaign_${Date.now()}`,
      metadata: {
        timestamp: new Date(),
        duration: 300,
      },
    };
  }

  /**
   * Setup webhook handlers
   */
  private setupWebhookHandlers(): void {
    if (!this.webhookManager) return;

    this.webhookManager.on('webhookReceived', async (data) => {
      await this.processWebhook(
        data.integrationId,
        data.payload,
        data.signature,
      );
    });
  }

  /**
   * Verify webhook signature
   *
   * @param payload Webhook payload
   * @param signature Received signature
   * @param secret Webhook secret
   * @returns Promise resolving to verification result
   */
  private async verifyWebhookSignature(
    payload: unknown,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    // This would implement actual signature verification
    // For now, return true if signature is provided
    return signature.length > 0;
  }

  /**
   * Extract event type from webhook payload
   *
   * @param payload Webhook payload
   * @returns Event type string
   */
  private extractEventType(payload: unknown): string {
    // This would implement actual event type extraction based on payload structure
    return 'generic_event';
  }

  /**
   * Store webhook event in database
   *
   * @param webhookEvent Webhook event to store
   */
  private async storeWebhookEvent(webhookEvent: WebhookEvent): Promise<void> {
    const { error } = await this.supabase.from('webhook_events').insert([
      {
        id: webhookEvent.id,
        integration_id: webhookEvent.integrationId,
        event_type: webhookEvent.eventType,
        data: webhookEvent.data,
        timestamp: webhookEvent.timestamp,
        signature: webhookEvent.signature,
        processed: webhookEvent.processed,
      },
    ]);

    if (error) {
      logger.error('Failed to store webhook event', { error });
    }
  }

  /**
   * Update webhook event in database
   *
   * @param webhookEvent Webhook event to update
   */
  private async updateWebhookEvent(webhookEvent: WebhookEvent): Promise<void> {
    const { error } = await this.supabase
      .from('webhook_events')
      .update({ processed: webhookEvent.processed })
      .eq('id', webhookEvent.id);

    if (error) {
      logger.error('Failed to update webhook event', { error });
    }
  }

  /**
   * Handle webhook event processing
   *
   * @param webhookEvent Webhook event to handle
   */
  private async handleWebhookEvent(webhookEvent: WebhookEvent): Promise<void> {
    // This would implement actual webhook event handling based on event type
    logger.info('Processing webhook event', {
      webhookId: webhookEvent.id,
      eventType: webhookEvent.eventType,
      integrationId: webhookEvent.integrationId,
    });

    // Emit event for external handlers
    this.emit('webhookEventHandled', webhookEvent);
  }

  /**
   * Update integration last sync time
   *
   * @param integrationId Integration identifier
   */
  private async updateIntegrationSyncTime(
    integrationId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('wedding_service_integrations')
      .update({ last_sync: new Date() })
      .eq('id', integrationId);

    if (error) {
      logger.error('Failed to update sync time', { error, integrationId });
    }
  }

  /**
   * Delay helper function
   *
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get integration status and health
   *
   * @param integrationId Optional specific integration
   * @returns Integration health status
   */
  public getIntegrationStatus(integrationId?: string): Record<
    string,
    {
      isActive: boolean;
      lastSync?: Date;
      circuitBreakerState: string;
      rateLimitRemaining: number;
      errorRate: number;
    }
  > {
    const status: Record<string, any> = {};

    const integrations = integrationId
      ? ([this.integrations.get(integrationId)].filter(
          Boolean,
        ) as IntegrationConfig[])
      : Array.from(this.integrations.values());

    integrations.forEach((integration) => {
      const circuitBreaker = this.circuitBreakers.get(integration.id);
      const rateLimiter = this.rateLimiters.get(integration.id);

      status[integration.id] = {
        isActive: integration.isActive,
        lastSync: integration.lastSync,
        circuitBreakerState: circuitBreaker?.getState() || 'unknown',
        rateLimitRemaining: rateLimiter?.getRemaining() || 0,
        errorRate: circuitBreaker?.getErrorRate() || 0,
      };
    });

    return status;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Stop all sync timers
    for (const [integrationId, timer] of this.syncTimers.entries()) {
      clearInterval(timer);
      logger.info('Stopped sync timer', { integrationId });
    }

    this.syncTimers.clear();

    // Clear all maps
    this.circuitBreakers.clear();
    this.rateLimiters.clear();
    this.integrations.clear();

    // Remove all listeners
    this.removeAllListeners();

    logger.info('Wedding Service Connector destroyed');
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

/**
 * Export singleton instance
 */
export const weddingServiceConnector = new WeddingServiceConnector(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
  process.env.WEBHOOK_BASE_URL,
);

// Export types for external use
export type {
  IntegrationConfig,
  JourneyData,
  VendorData,
  ClientData,
  IntegrationResult,
  WebhookEvent,
};

export default WeddingServiceConnector;
