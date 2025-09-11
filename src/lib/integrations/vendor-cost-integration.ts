/**
 * WS-245 Wedding Budget Optimizer - Vendor Cost Integration Service
 * Direct vendor platform integrations for real-time pricing and availability
 */

import { z } from 'zod';
import IntegrationServiceBase from './base/integration-service-base';
import type {
  VendorCostRequest,
  VendorCostResponse,
  PackageOption,
  PricingServiceConfig,
  ValidationResult,
} from '@/types/pricing';
import { ServiceType, Currency, PricingConfidence } from '@/types/pricing';

// Vendor platform types
export enum VendorPlatform {
  TAVE = 'tave',
  LIGHTBLUE = 'lightblue',
  HONEYBOOK = 'honeybook',
  SHOOTPROOF = 'shootproof',
  PIXIESET = 'pixieset',
  DIRECT_VENDOR = 'direct_vendor',
}

export interface VendorConnection {
  readonly platformId: string;
  readonly platform: VendorPlatform;
  readonly vendorId: string;
  readonly connectionStatus: 'active' | 'expired' | 'pending' | 'failed';
  readonly credentials: VendorCredentials;
  readonly lastSyncAt: Date;
  readonly rateLimit: VendorRateLimit;
}

interface VendorCredentials {
  readonly apiKey?: string;
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly username?: string;
  readonly password?: string;
  readonly expiresAt?: Date;
}

interface VendorRateLimit {
  readonly requestsPerHour: number;
  readonly requestsRemaining: number;
  readonly resetTime: Date;
}

// Validation schemas
const vendorCostRequestSchema = z.object({
  vendorId: z.string().min(1),
  serviceType: z.nativeEnum(ServiceType),
  weddingDate: z.date().min(new Date()),
  guestCount: z.number().int().min(1).max(1000),
  additionalRequirements: z.record(z.unknown()).optional(),
});

const vendorApiResponseSchema = z.object({
  vendor_id: z.string(),
  quotes: z.array(
    z.object({
      quote_id: z.string(),
      service_type: z.string(),
      base_price: z.number(),
      currency: z.string(),
      valid_until: z.string(),
      confidence: z.string(),
      package_options: z
        .array(
          z.object({
            package_id: z.string(),
            name: z.string(),
            description: z.string(),
            price: z.number(),
            currency: z.string(),
            inclusions: z.array(z.string()),
            exclusions: z.array(z.string()),
            guest_count_min: z.number(),
            guest_count_max: z.number(),
            valid_until: z.string(),
          }),
        )
        .optional(),
    }),
  ),
  availability_status: z.enum(['available', 'limited', 'unavailable']),
  valid_until: z.string(),
  quotation_id: z.string(),
});

/**
 * Vendor Cost Integration Service
 * Handles direct integrations with vendor platforms for real-time pricing
 */
export class VendorCostIntegration extends IntegrationServiceBase<
  VendorCostRequest,
  VendorCostResponse
> {
  private vendorConnections = new Map<string, VendorConnection>();

  constructor(
    config: PricingServiceConfig,
    private vendorCredentialsService: VendorCredentialsService,
  ) {
    super(config);
  }

  protected validateRequest(
    request: VendorCostRequest,
  ): ValidationResult<VendorCostRequest> {
    try {
      const validated = vendorCostRequestSchema.parse(request);

      // Additional business validations
      if (
        validated.weddingDate.getTime() <
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ) {
        return {
          isValid: false,
          errors: ['Wedding date must be at least 7 days in the future'],
        };
      }

      return {
        isValid: true,
        data: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return {
        isValid: false,
        errors: ['Unknown validation error'],
      };
    }
  }

  protected async makeRequest(
    request: VendorCostRequest,
    requestId: string,
  ): Promise<unknown> {
    // Get vendor connection details
    const vendorConnection = await this.getVendorConnection(request.vendorId);
    if (!vendorConnection) {
      throw new Error(`Vendor connection not found: ${request.vendorId}`);
    }

    // Check rate limits
    await this.checkVendorRateLimit(vendorConnection);

    // Route request to appropriate platform handler
    switch (vendorConnection.platform) {
      case VendorPlatform.TAVE:
        return this.makeTaveRequest(request, vendorConnection, requestId);
      case VendorPlatform.HONEYBOOK:
        return this.makeHoneyBookRequest(request, vendorConnection, requestId);
      case VendorPlatform.LIGHTBLUE:
        return this.makeLightBlueRequest(request, vendorConnection, requestId);
      case VendorPlatform.DIRECT_VENDOR:
        return this.makeDirectVendorRequest(
          request,
          vendorConnection,
          requestId,
        );
      default:
        throw new Error(
          `Unsupported vendor platform: ${vendorConnection.platform}`,
        );
    }
  }

  protected transformResponse(response: unknown): VendorCostResponse {
    const validationResult = this.validateResponseStructure(
      response,
      vendorApiResponseSchema,
    );
    if (!validationResult.isValid) {
      throw new Error(
        `Invalid vendor API response: ${validationResult.errors?.join(', ')}`,
      );
    }

    const apiResponse = validationResult.data as z.infer<
      typeof vendorApiResponseSchema
    >;

    return {
      vendorId: apiResponse.vendor_id,
      quotePricing: apiResponse.quotes.map((quote) => ({
        id: quote.quote_id,
        vendorId: apiResponse.vendor_id,
        serviceType: quote.service_type as ServiceType,
        basePrice: Math.round(quote.base_price * 100), // Convert to pence
        currency: quote.currency as Currency,
        regionCode: 'UK-LON', // Default, should be derived from vendor
        validFrom: new Date(),
        validUntil: new Date(quote.valid_until),
        confidence: quote.confidence as PricingConfidence,
        source: 'direct_vendor',
        metadata: {
          marketSegment: 'mid_range', // Default, could be inferred
          seasonality: [],
          demandMultiplier: 1.0,
          competitiveIndex: 1.0,
          guestCountRange: { min: 1, max: 1000 },
          additionalServices: [],
          exclusions: [],
        },
        updatedAt: new Date(),
      })),
      packageOptions: this.transformPackageOptions(apiResponse.quotes),
      availabilityStatus: apiResponse.availability_status,
      validUntil: new Date(apiResponse.valid_until),
      quotationId: apiResponse.quotation_id,
    };
  }

  /**
   * Handle Tave API requests
   */
  private async makeTaveRequest(
    request: VendorCostRequest,
    connection: VendorConnection,
    requestId: string,
  ): Promise<unknown> {
    const taveRequest = {
      job_type: request.serviceType,
      wedding_date: request.weddingDate.toISOString().split('T')[0],
      guest_count: request.guestCount,
      client_requirements: request.additionalRequirements || {},
      request_quote: true,
    };

    const response = await fetch(`https://api.tave.com/v1/jobs/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${connection.credentials.accessToken}`,
        'X-Request-ID': requestId,
        'User-Agent': 'WedSync/1.0 Budget-Optimizer',
      },
      body: JSON.stringify(taveRequest),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Tave API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return this.transformTaveResponse(data);
  }

  /**
   * Handle HoneyBook API requests
   */
  private async makeHoneyBookRequest(
    request: VendorCostRequest,
    connection: VendorConnection,
    requestId: string,
  ): Promise<unknown> {
    const honeyBookRequest = {
      service_type: request.serviceType,
      event_date: request.weddingDate.toISOString(),
      guest_count: request.guestCount,
      additional_details: request.additionalRequirements || {},
    };

    const response = await fetch(
      `https://api.honeybook.com/v1/quotes/request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${connection.credentials.accessToken}`,
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(honeyBookRequest),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HoneyBook API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return this.transformHoneyBookResponse(data);
  }

  /**
   * Handle Light Blue (screen scraping) requests
   */
  private async makeLightBlueRequest(
    request: VendorCostRequest,
    connection: VendorConnection,
    requestId: string,
  ): Promise<unknown> {
    // Note: Light Blue requires screen scraping as they don't have a public API
    const scrapingService = new LightBlueScrapingService(
      connection.credentials,
    );

    try {
      const pricing = await scrapingService.getPricingForWedding({
        serviceType: request.serviceType,
        weddingDate: request.weddingDate,
        guestCount: request.guestCount,
      });

      return this.transformLightBlueResponse(pricing);
    } catch (error) {
      this.logger.error('Light Blue scraping failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to retrieve Light Blue pricing data');
    }
  }

  /**
   * Handle direct vendor API requests
   */
  private async makeDirectVendorRequest(
    request: VendorCostRequest,
    connection: VendorConnection,
    requestId: string,
  ): Promise<unknown> {
    const directRequest = {
      service_type: request.serviceType,
      wedding_date: request.weddingDate.toISOString(),
      guest_count: request.guestCount,
      requirements: request.additionalRequirements || {},
    };

    // Use vendor's custom API endpoint
    const apiUrl = connection.credentials.apiKey
      ? `${this.config.baseUrl}/vendor/${request.vendorId}/quote`
      : `https://api.${request.vendorId}.com/quote`;

    const response = await this.createRequest(
      '/quote',
      'POST',
      directRequest,
      requestId,
    );
    return this.parseJsonResponse(response);
  }

  /**
   * Get vendor connection by vendor ID
   */
  private async getVendorConnection(
    vendorId: string,
  ): Promise<VendorConnection | null> {
    // Check cache first
    if (this.vendorConnections.has(vendorId)) {
      const connection = this.vendorConnections.get(vendorId)!;

      // Check if connection is still valid
      if (
        connection.connectionStatus === 'active' &&
        (!connection.credentials.expiresAt ||
          connection.credentials.expiresAt > new Date())
      ) {
        return connection;
      }
    }

    // Fetch from credentials service
    try {
      const connection =
        await this.vendorCredentialsService.getConnection(vendorId);
      if (connection) {
        this.vendorConnections.set(vendorId, connection);
      }
      return connection;
    } catch (error) {
      this.logger.error('Failed to retrieve vendor connection', {
        vendorId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Check vendor-specific rate limits
   */
  private async checkVendorRateLimit(
    connection: VendorConnection,
  ): Promise<void> {
    const now = new Date();

    if (connection.rateLimit.resetTime <= now) {
      // Rate limit has reset, update the connection
      await this.vendorCredentialsService.resetRateLimit(connection.vendorId);
      return;
    }

    if (connection.rateLimit.requestsRemaining <= 0) {
      const waitTime = connection.rateLimit.resetTime.getTime() - now.getTime();
      throw new Error(
        `Vendor rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)} seconds`,
      );
    }

    // Decrement remaining requests
    await this.vendorCredentialsService.decrementRateLimit(connection.vendorId);
  }

  /**
   * Transform package options from API response
   */
  private transformPackageOptions(quotes: any[]): PackageOption[] {
    const packages: PackageOption[] = [];

    quotes.forEach((quote) => {
      if (quote.package_options) {
        quote.package_options.forEach((pkg: any) => {
          packages.push({
            packageId: pkg.package_id,
            name: pkg.name,
            description: pkg.description,
            basePrice: Math.round(pkg.price * 100), // Convert to pence
            currency: pkg.currency as Currency,
            inclusions: pkg.inclusions || [],
            exclusions: pkg.exclusions || [],
            guestCountRange: {
              min: pkg.guest_count_min || 1,
              max: pkg.guest_count_max || 1000,
            },
            validUntil: new Date(pkg.valid_until),
          });
        });
      }
    });

    return packages;
  }

  /**
   * Transform Tave API response to standard format
   */
  private transformTaveResponse(taveData: any): unknown {
    return {
      vendor_id: taveData.studio_id,
      quotes: [
        {
          quote_id: taveData.quote_id,
          service_type: taveData.job_type,
          base_price: taveData.quote_amount,
          currency: 'GBP',
          valid_until: taveData.quote_expires,
          confidence: 'high',
          package_options: taveData.packages || [],
        },
      ],
      availability_status: taveData.available ? 'available' : 'unavailable',
      valid_until: taveData.quote_expires,
      quotation_id: taveData.quote_id,
    };
  }

  /**
   * Transform HoneyBook API response to standard format
   */
  private transformHoneyBookResponse(honeyBookData: any): unknown {
    return {
      vendor_id: honeyBookData.business_id,
      quotes:
        honeyBookData.quote_options?.map((option: any) => ({
          quote_id: option.option_id,
          service_type: option.service_category,
          base_price: option.price,
          currency: option.currency || 'GBP',
          valid_until: option.expires_at,
          confidence: 'medium',
          package_options: option.packages || [],
        })) || [],
      availability_status: honeyBookData.availability_status || 'available',
      valid_until: honeyBookData.quote_expires_at,
      quotation_id: honeyBookData.quote_id,
    };
  }

  /**
   * Transform Light Blue scraped data to standard format
   */
  private transformLightBlueResponse(lightBlueData: any): unknown {
    return {
      vendor_id: lightBlueData.photographer_id,
      quotes: [
        {
          quote_id: `lb_${Date.now()}`,
          service_type: 'photography',
          base_price: lightBlueData.pricing?.base_rate || 0,
          currency: 'GBP',
          valid_until: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days
          confidence: 'low', // Lower confidence for scraped data
          package_options: lightBlueData.packages || [],
        },
      ],
      availability_status: lightBlueData.availability || 'unknown',
      valid_until: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      quotation_id: `lb_quote_${Date.now()}`,
    };
  }

  /**
   * Connect a new vendor platform
   */
  async connectVendor(
    vendorId: string,
    platform: VendorPlatform,
    credentials: VendorCredentials,
  ): Promise<boolean> {
    try {
      const connection = await this.vendorCredentialsService.createConnection(
        vendorId,
        platform,
        credentials,
      );

      if (connection) {
        this.vendorConnections.set(vendorId, connection);
        this.logger.info('Vendor connected successfully', {
          vendorId,
          platform,
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to connect vendor', {
        vendorId,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get multiple vendor quotes in parallel
   */
  async getMultipleVendorQuotes(
    vendorIds: string[],
    serviceType: ServiceType,
    weddingDate: Date,
    guestCount: number,
  ): Promise<Record<string, VendorCostResponse | null>> {
    const results: Record<string, VendorCostResponse | null> = {};

    const promises = vendorIds.map(async (vendorId) => {
      try {
        const request: VendorCostRequest = {
          vendorId,
          serviceType,
          weddingDate,
          guestCount,
        };

        const result = await this.executeWithRetry(request);
        return {
          vendorId,
          response: result.success ? result.data : null,
        };
      } catch (error) {
        this.logger.error('Failed to get quote from vendor', {
          vendorId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return {
          vendorId,
          response: null,
        };
      }
    });

    const responses = await Promise.allSettled(promises);

    responses.forEach((response) => {
      if (response.status === 'fulfilled') {
        results[response.value.vendorId] = response.value.response;
      }
    });

    return results;
  }
}

// Vendor Credentials Service Interface
interface VendorCredentialsService {
  getConnection(vendorId: string): Promise<VendorConnection | null>;
  createConnection(
    vendorId: string,
    platform: VendorPlatform,
    credentials: VendorCredentials,
  ): Promise<VendorConnection | null>;
  resetRateLimit(vendorId: string): Promise<void>;
  decrementRateLimit(vendorId: string): Promise<void>;
}

// Light Blue Scraping Service (mock implementation)
class LightBlueScrapingService {
  constructor(private credentials: VendorCredentials) {}

  async getPricingForWedding(request: {
    serviceType: ServiceType;
    weddingDate: Date;
    guestCount: number;
  }): Promise<any> {
    // Mock implementation - in production this would use Puppeteer or similar
    return {
      photographer_id: 'lightblue_photographer',
      pricing: {
        base_rate: 1500, // £15.00 in pence
      },
      availability: 'available',
      packages: [],
    };
  }
}

// Configuration for vendor platforms
export const VENDOR_PLATFORM_CONFIGS: Record<
  VendorPlatform,
  PricingServiceConfig
> = {
  [VendorPlatform.TAVE]: {
    baseUrl: 'https://api.tave.com/v1',
    apiKey: process.env.TAVE_API_KEY || '',
    timeoutMs: 15000,
    retryAttempts: 2,
    retryDelayMs: 2000,
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
    },
    cache: {
      ttlMs: 10 * 60 * 1000, // 10 minutes
      maxSize: 200,
    },
  },
  [VendorPlatform.HONEYBOOK]: {
    baseUrl: 'https://api.honeybook.com/v1',
    apiKey: process.env.HONEYBOOK_CLIENT_ID || '',
    timeoutMs: 12000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
    cache: {
      ttlMs: 15 * 60 * 1000, // 15 minutes
      maxSize: 300,
    },
  },
  [VendorPlatform.LIGHTBLUE]: {
    baseUrl: 'https://lightblue.co.uk',
    apiKey: '', // No API key for scraping
    timeoutMs: 30000, // Longer timeout for scraping
    retryAttempts: 1, // Lower retries for scraping
    retryDelayMs: 5000,
    rateLimit: {
      requestsPerMinute: 10, // Very conservative for scraping
      requestsPerHour: 100,
    },
    cache: {
      ttlMs: 60 * 60 * 1000, // 1 hour (longer for scraped data)
      maxSize: 100,
    },
  },
  [VendorPlatform.DIRECT_VENDOR]: {
    baseUrl: process.env.DIRECT_VENDOR_API_URL || 'https://api.wedsync.com/v1',
    apiKey: process.env.DIRECT_VENDOR_API_KEY || '',
    timeoutMs: 10000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    rateLimit: {
      requestsPerMinute: 120,
      requestsPerHour: 2000,
    },
    cache: {
      ttlMs: 5 * 60 * 1000, // 5 minutes
      maxSize: 500,
    },
  },
  [VendorPlatform.SHOOTPROOF]: {
    baseUrl: 'https://api.shootproof.com/v1',
    apiKey: process.env.SHOOTPROOF_API_KEY || '',
    timeoutMs: 12000,
    retryAttempts: 2,
    retryDelayMs: 1500,
    rateLimit: {
      requestsPerMinute: 40,
      requestsPerHour: 800,
    },
    cache: {
      ttlMs: 20 * 60 * 1000, // 20 minutes
      maxSize: 200,
    },
  },
  [VendorPlatform.PIXIESET]: {
    baseUrl: 'https://api.pixieset.com/v1',
    apiKey: process.env.PIXIESET_API_KEY || '',
    timeoutMs: 10000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerHour: 1200,
    },
    cache: {
      ttlMs: 15 * 60 * 1000, // 15 minutes
      maxSize: 250,
    },
  },
};

export default VendorCostIntegration;
