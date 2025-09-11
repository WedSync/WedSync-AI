/**
 * WS-245 Wedding Budget Optimizer - Pricing Integration Services Export Module
 * Central export point for all pricing integration services
 */

// Base integration service
export { default as IntegrationServiceBase } from './base/integration-service-base';

// Core integration services
export {
  MarketPricingIntegration,
  createMarketPricingIntegration,
  WEDDING_WIRE_CONFIG,
  THE_KNOT_CONFIG,
  default as MarketPricingIntegrationDefault,
} from './market-pricing-integration';

export {
  VendorCostIntegration,
  createVendorCostIntegration,
  TAVE_CONFIG,
  HONEYBOOK_CONFIG,
  LIGHT_BLUE_CONFIG,
  default as VendorCostIntegrationDefault,
} from './vendor-cost-integration';

export {
  FinancialServiceIntegration,
  createFinancialServiceIntegration,
  QUICKBOOKS_CONFIG,
  STRIPE_CONFIG,
  PAYPAL_CONFIG,
  default as FinancialServiceIntegrationDefault,
} from './financial-service-integration';

export {
  RegionalPricingService,
  createRegionalPricingService,
  UK_REGIONAL_PRICING_CONFIG,
  default as RegionalPricingServiceDefault,
} from './regional-pricing-service';

// Re-export all types for convenience
export type * from '@/types/pricing';

// Integration service factory
import type { PricingServiceConfig } from '@/types/pricing';

/**
 * Pricing Integration Service Factory
 * Creates and manages all pricing-related integration services
 */
export class PricingIntegrationFactory {
  private static instance: PricingIntegrationFactory;
  private services = new Map<string, any>();

  private constructor() {}

  static getInstance(): PricingIntegrationFactory {
    if (!PricingIntegrationFactory.instance) {
      PricingIntegrationFactory.instance = new PricingIntegrationFactory();
    }
    return PricingIntegrationFactory.instance;
  }

  /**
   * Create all integration services with provided configurations
   */
  createAllIntegrations(configs: {
    marketPricing: PricingServiceConfig;
    vendorCost: PricingServiceConfig;
    financialService: PricingServiceConfig;
    regionalPricing: PricingServiceConfig;
  }) {
    const services = {
      marketPricing: createMarketPricingIntegration(configs.marketPricing),
      vendorCost: createVendorCostIntegration(configs.vendorCost),
      financialService: createFinancialServiceIntegration(
        configs.financialService,
      ),
      regionalPricing: createRegionalPricingService(configs.regionalPricing),
    };

    // Cache services for reuse
    this.services.set('marketPricing', services.marketPricing);
    this.services.set('vendorCost', services.vendorCost);
    this.services.set('financialService', services.financialService);
    this.services.set('regionalPricing', services.regionalPricing);

    return services;
  }

  /**
   * Create all integrations with default configurations
   */
  createDefaultIntegrations() {
    return this.createAllIntegrations(DEFAULT_PRICING_CONFIGS);
  }

  /**
   * Get a cached service by name
   */
  getService<T>(serviceName: string): T | null {
    return this.services.get(serviceName) || null;
  }

  /**
   * Health check for all pricing integration services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { status: string; error?: string }>;
  }> {
    const results = {
      marketPricing: {
        status: 'unknown',
        error: undefined as string | undefined,
      },
      vendorCost: { status: 'unknown', error: undefined as string | undefined },
      financialService: {
        status: 'unknown',
        error: undefined as string | undefined,
      },
      regionalPricing: {
        status: 'unknown',
        error: undefined as string | undefined,
      },
    };

    // Test each service
    for (const [serviceName, service] of this.services.entries()) {
      try {
        if (service && typeof service.execute === 'function') {
          // Simple connectivity test - this would be replaced with actual health check endpoints
          results[serviceName as keyof typeof results] = { status: 'healthy' };
        } else {
          results[serviceName as keyof typeof results] = {
            status: 'unhealthy',
            error: 'Service not initialized',
          };
        }
      } catch (error) {
        results[serviceName as keyof typeof results] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
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

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    for (const [key, service] of this.services.entries()) {
      if (service && typeof service.destroy === 'function') {
        try {
          await service.destroy();
        } catch (error) {
          console.error(`Failed to cleanup pricing service ${key}:`, error);
        }
      }
    }
    this.services.clear();
  }
}

/**
 * Default configuration set for all pricing integration services
 */
export const DEFAULT_PRICING_CONFIGS = {
  marketPricing: WEDDING_WIRE_CONFIG,
  vendorCost: TAVE_CONFIG,
  financialService: QUICKBOOKS_CONFIG,
  regionalPricing: UK_REGIONAL_PRICING_CONFIG,
} as const;

/**
 * Environment validation for pricing integrations
 */
export const PricingIntegrationSecurity = {
  /**
   * Validates that all required environment variables are present for pricing integrations
   */
  validateEnvironment(): { valid: boolean; missing: string[] } {
    const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

    const pricingOptional = [
      'WEDDING_WIRE_API_URL',
      'WEDDING_WIRE_API_KEY',
      'THE_KNOT_API_URL',
      'THE_KNOT_API_KEY',
      'TAVE_API_URL',
      'TAVE_API_KEY',
      'HONEYBOOK_API_URL',
      'HONEYBOOK_API_KEY',
      'LIGHT_BLUE_API_URL',
      'LIGHT_BLUE_API_KEY',
      'QUICKBOOKS_CLIENT_ID',
      'QUICKBOOKS_CLIENT_SECRET',
      'STRIPE_CONNECT_CLIENT_ID',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'UK_REGIONAL_PRICING_API_URL',
      'UK_REGIONAL_PRICING_API_KEY',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      console.warn(
        'Missing required environment variables for pricing integrations:',
        missing,
      );
    }

    const missingOptional = pricingOptional.filter((key) => !process.env[key]);
    if (missingOptional.length > 0) {
      console.info(
        'Missing optional pricing integration environment variables:',
        missingOptional,
      );
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  },

  /**
   * Rate limiting check for pricing API calls
   */
  async checkRateLimit(provider: string, operation: string): Promise<boolean> {
    // Implementation would check current rate limit status for pricing APIs
    // For now, always allow
    return true;
  },

  /**
   * Audit pricing integration operations
   */
  async auditPricingOperation(
    userId: string,
    organizationId: string,
    operation: string,
    provider: string,
    details: Record<string, any>,
  ): Promise<void> {
    // Log pricing-specific operations
    console.log(
      `PRICING_AUDIT: ${userId}:${organizationId} - ${provider} ${operation}`,
      details,
    );
  },
};

// Singleton instance for global access
export const pricingIntegrationFactory =
  PricingIntegrationFactory.getInstance();

// Cleanup on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await pricingIntegrationFactory.cleanup();
  });

  process.on('SIGTERM', async () => {
    await pricingIntegrationFactory.cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await pricingIntegrationFactory.cleanup();
    process.exit(0);
  });
}

// Export factory instance as default
export default pricingIntegrationFactory;
