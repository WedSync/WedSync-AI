/**
 * Base Cloud Provider Abstract Class
 * WS-257 Team B Implementation
 */

import type {
  CloudProvider,
  CloudProviderCredentials,
  CloudResource,
  CloudRegion,
  CloudService,
  ResourceType,
  TestConnectionResponse,
  SyncResourcesResponse,
} from '@/types/cloud-infrastructure';

export interface ResourceConfig {
  resourceName: string;
  resourceType: ResourceType;
  region: string;
  availabilityZone?: string;
  configuration: Record<string, unknown>;
  tags?: Record<string, string>;
  environment?: string;
}

export interface ScaleConfig {
  targetCapacity?: number;
  minCapacity?: number;
  maxCapacity?: number;
  scaleDirection: 'up' | 'down' | 'auto';
  targetMetric?: {
    name: string;
    targetValue: number;
  };
}

export interface ResourceMetrics {
  resourceId: string;
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    dimensions?: Record<string, string>;
  }>;
}

export interface CostData {
  resourceId?: string;
  totalCost: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  breakdown?: Array<{
    service: string;
    cost: number;
    usage?: {
      amount: number;
      unit: string;
    };
  }>;
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

/**
 * Abstract base class for all cloud provider implementations
 * Defines the common interface that all cloud providers must implement
 */
export abstract class BaseCloudProvider {
  protected provider: CloudProvider;
  protected isAuthenticated = false;
  protected lastConnectionTest?: Date;
  protected connectionLatency?: number;

  constructor(provider: CloudProvider) {
    this.provider = provider;
  }

  // =====================================================
  // AUTHENTICATION AND CONNECTION
  // =====================================================

  /**
   * Authenticate with the cloud provider using stored credentials
   */
  abstract authenticate(credentials: CloudProviderCredentials): Promise<void>;

  /**
   * Test the connection to the cloud provider
   */
  abstract testConnection(timeoutMs?: number): Promise<TestConnectionResponse>;

  /**
   * Refresh authentication tokens if applicable
   */
  abstract refreshCredentials?(): Promise<void>;

  // =====================================================
  // RESOURCE MANAGEMENT
  // =====================================================

  /**
   * Provision a new resource in the cloud provider
   */
  abstract provisionResource(config: ResourceConfig): Promise<CloudResource>;

  /**
   * Terminate/delete a resource from the cloud provider
   */
  abstract terminateResource(resourceId: string): Promise<void>;

  /**
   * Get current resource information
   */
  abstract getResource(resourceId: string): Promise<CloudResource>;

  /**
   * Update resource configuration
   */
  abstract updateResource(
    resourceId: string,
    updates: Partial<ResourceConfig>,
  ): Promise<CloudResource>;

  /**
   * Scale a resource up or down
   */
  abstract scaleResource(
    resource: CloudResource,
    config: ScaleConfig,
  ): Promise<CloudResource>;

  /**
   * Start a stopped resource
   */
  abstract startResource(resourceId: string): Promise<CloudResource>;

  /**
   * Stop a running resource
   */
  abstract stopResource(resourceId: string): Promise<CloudResource>;

  // =====================================================
  // DISCOVERY AND SYNCHRONIZATION
  // =====================================================

  /**
   * List all regions available for this provider
   */
  abstract listRegions(): Promise<CloudRegion[]>;

  /**
   * List all services available in a specific region
   */
  abstract listServices(region?: string): Promise<CloudService[]>;

  /**
   * Discover and synchronize all resources from the provider
   */
  abstract syncResources(options?: {
    resourceTypes?: ResourceType[];
    regions?: string[];
    dryRun?: boolean;
  }): Promise<SyncResourcesResponse>;

  /**
   * List all resources of a specific type
   */
  abstract listResources(
    resourceType?: ResourceType,
    region?: string,
  ): Promise<CloudResource[]>;

  // =====================================================
  // METRICS AND MONITORING
  // =====================================================

  /**
   * Get performance metrics for a specific resource
   */
  abstract getResourceMetrics(
    resourceId: string,
    timeRange: TimeRange,
    metricNames?: string[],
  ): Promise<ResourceMetrics>;

  /**
   * Get cost data for resources or the entire account
   */
  abstract getCostData(
    timeRange: TimeRange,
    resourceIds?: string[],
  ): Promise<CostData>;

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Get the provider configuration
   */
  getProvider(): CloudProvider {
    return this.provider;
  }

  /**
   * Check if the provider is authenticated
   */
  getAuthenticationStatus(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get the last connection test timestamp
   */
  getLastConnectionTest(): Date | undefined {
    return this.lastConnectionTest;
  }

  /**
   * Get the connection latency from the last test
   */
  getConnectionLatency(): number | undefined {
    return this.connectionLatency;
  }

  /**
   * Update the provider configuration
   */
  updateProviderConfig(provider: CloudProvider): void {
    this.provider = provider;
  }

  /**
   * Validate if the resource configuration is supported
   */
  protected validateResourceConfig(config: ResourceConfig): void {
    if (!config.resourceName || config.resourceName.trim() === '') {
      throw new Error('Resource name is required');
    }

    if (!config.resourceType) {
      throw new Error('Resource type is required');
    }

    if (!config.region || config.region.trim() === '') {
      throw new Error('Region is required');
    }

    if (!config.configuration || typeof config.configuration !== 'object') {
      throw new Error('Resource configuration is required');
    }
  }

  /**
   * Normalize resource tags to ensure consistency
   */
  protected normalizeResourceTags(
    tags: Record<string, string> = {},
  ): Record<string, string> {
    const normalizedTags: Record<string, string> = {};

    // Add default tags
    normalizedTags['CreatedBy'] = 'WedSync-CloudInfrastructure';
    normalizedTags['ManagedBy'] = 'WedSync';
    normalizedTags['Environment'] =
      this.provider.configuration?.environment || 'production';
    normalizedTags['Organization'] = this.provider.organizationId;
    normalizedTags['Provider'] = this.provider.providerType;
    normalizedTags['CreatedAt'] = new Date().toISOString();

    // Add custom tags (override defaults if specified)
    Object.entries(tags).forEach(([key, value]) => {
      if (key && value) {
        normalizedTags[key] = value.toString();
      }
    });

    // Add provider-specific tags if configured
    if (this.provider.configuration?.tags) {
      Object.entries(this.provider.configuration.tags).forEach(
        ([key, value]) => {
          if (key && value && !normalizedTags[key]) {
            normalizedTags[key] = value.toString();
          }
        },
      );
    }

    return normalizedTags;
  }

  /**
   * Generate a unique resource name with provider prefix
   */
  protected generateResourceName(
    baseName: string,
    resourceType: ResourceType,
  ): string {
    const timestamp = Date.now();
    const prefix = this.provider.providerType.toLowerCase();
    const cleanBaseName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const typePrefix = resourceType.toLowerCase().replace('_', '-');

    return `${prefix}-${typePrefix}-${cleanBaseName}-${timestamp}`;
  }

  /**
   * Handle common errors and map them to our error types
   */
  protected handleProviderError(error: unknown, context?: string): never {
    let message = 'Unknown cloud provider error';
    let statusCode = 500;

    if (error instanceof Error) {
      message = error.message;

      // Map common error patterns to appropriate status codes
      if (
        message.includes('authentication') ||
        message.includes('credential') ||
        message.includes('unauthorized')
      ) {
        statusCode = 401;
      } else if (
        message.includes('permission') ||
        message.includes('forbidden') ||
        message.includes('access denied')
      ) {
        statusCode = 403;
      } else if (
        message.includes('not found') ||
        message.includes('does not exist')
      ) {
        statusCode = 404;
      } else if (
        message.includes('timeout') ||
        message.includes('connection')
      ) {
        statusCode = 502;
      } else if (
        message.includes('rate limit') ||
        message.includes('throttle')
      ) {
        statusCode = 429;
      } else if (
        message.includes('quota') ||
        message.includes('limit exceeded')
      ) {
        statusCode = 429;
      }
    }

    const contextMessage = context ? `${context}: ${message}` : message;

    const enhancedError = new Error(contextMessage);
    (enhancedError as any).statusCode = statusCode;
    (enhancedError as any).provider = this.provider.providerType;
    (enhancedError as any).providerId = this.provider.id;
    (enhancedError as any).originalError = error;

    throw enhancedError;
  }

  /**
   * Log provider operations for debugging and auditing
   */
  protected logOperation(
    operation: string,
    details?: Record<string, unknown>,
  ): void {
    console.log(
      `[${this.provider.providerType}:${this.provider.id}] ${operation}`,
      {
        providerId: this.provider.id,
        providerType: this.provider.providerType,
        organizationId: this.provider.organizationId,
        timestamp: new Date().toISOString(),
        ...details,
      },
    );
  }

  /**
   * Retry wrapper for operations that might fail due to temporary issues
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000,
    backoffMultiplier = 2,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on authentication or permission errors
        if (
          lastError.message.includes('authentication') ||
          lastError.message.includes('permission') ||
          lastError.message.includes('forbidden')
        ) {
          throw lastError;
        }

        if (attempt === maxRetries) {
          break;
        }

        const delayMs = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        this.logOperation(
          `Retrying operation (attempt ${attempt}/${maxRetries}) after ${delayMs}ms delay`,
          {
            error: lastError.message,
            attempt,
            maxRetries,
            delayMs,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  /**
   * Validate that all required credentials are present
   */
  protected validateCredentials(
    credentials: CloudProviderCredentials,
    requiredFields: string[],
  ): void {
    for (const field of requiredFields) {
      if (!(field in credentials) || !credentials[field]) {
        throw new Error(`Missing required credential field: ${field}`);
      }
    }
  }

  /**
   * Create a standardized CloudResource object
   */
  protected createCloudResource(
    resourceId: string,
    config: ResourceConfig,
    providerData: Record<string, unknown>,
  ): CloudResource {
    return {
      id: `${this.provider.id}-${resourceId}`, // Combine provider ID with resource ID for uniqueness
      organizationId: this.provider.organizationId,
      cloudProviderId: this.provider.id,
      name: config.resourceName,
      resourceType: config.resourceType,
      providerResourceId: resourceId,
      arnOrId: (providerData.arn as string) || (providerData.id as string),
      configuration: {
        ...config.configuration,
        providerData,
      },
      state: 'creating', // Will be updated based on actual state
      region: config.region,
      availabilityZone: config.availabilityZone,
      currency: 'USD',
      tags: this.normalizeResourceTags(config.tags),
      metadata: {
        providerType: this.provider.providerType,
        providerName: this.provider.name,
        createdBy: 'WedSync-CloudInfrastructure',
        syncedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.provider.createdBy,
    };
  }
}

export default BaseCloudProvider;
