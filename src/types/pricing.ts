/**
 * WS-245 Wedding Budget Optimizer - Core Pricing Types
 * Comprehensive type definitions for pricing data integration
 */

// Base Currency and Region Types
export enum Currency {
  GBP = 'GBP',
  EUR = 'EUR',
  USD = 'USD',
}

export enum RegionCode {
  UK_LONDON = 'UK-LON',
  UK_SOUTHEAST = 'UK-SE',
  UK_SOUTHWEST = 'UK-SW',
  UK_MIDLANDS = 'UK-MID',
  UK_NORTH = 'UK-N',
  UK_SCOTLAND = 'UK-SCT',
  UK_WALES = 'UK-WAL',
  UK_NI = 'UK-NI',
}

// Service Types
export enum ServiceType {
  VENUE = 'venue',
  PHOTOGRAPHY = 'photography',
  CATERING = 'catering',
  FLOWERS = 'flowers',
  ENTERTAINMENT = 'entertainment',
  DRESS = 'dress',
  CAKE = 'cake',
  TRANSPORT = 'transport',
  STATIONERY = 'stationery',
  OTHER = 'other',
}

// Market Segments
export enum MarketSegment {
  BUDGET = 'budget',
  MID_RANGE = 'mid_range',
  PREMIUM = 'premium',
  LUXURY = 'luxury',
}

// Pricing Confidence Levels
export enum PricingConfidence {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  ESTIMATED = 'estimated',
}

// Pricing Sources
export enum PricingSource {
  WEDDING_WIRE = 'wedding_wire',
  THE_KNOT = 'the_knot',
  ZOLA = 'zola',
  DIRECT_VENDOR = 'direct_vendor',
  MARKET_SURVEY = 'market_survey',
  HISTORICAL_DATA = 'historical_data',
}

// Seasonality Factors
export interface SeasonalityFactor {
  readonly month: number;
  readonly multiplier: number;
  readonly demand: 'low' | 'medium' | 'high' | 'peak';
}

// Core Pricing Data Interface
export interface PricingData {
  readonly id: string;
  readonly vendorId: string;
  readonly serviceType: ServiceType;
  readonly basePrice: number; // Always in pence (£50 = 5000)
  readonly currency: Currency;
  readonly regionCode: RegionCode;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly confidence: PricingConfidence;
  readonly source: PricingSource;
  readonly metadata: PricingMetadata;
  readonly updatedAt: Date;
}

export interface PricingMetadata {
  readonly marketSegment: MarketSegment;
  readonly seasonality: SeasonalityFactor[];
  readonly demandMultiplier: number;
  readonly competitiveIndex: number;
  readonly guestCountRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly additionalServices: string[];
  readonly exclusions: string[];
}

// Budget Range Interface
export interface BudgetRange {
  readonly min: number;
  readonly max: number;
  readonly currency: Currency;
}

// Market Insights
export interface MarketInsights {
  readonly averagePrice: number;
  readonly medianPrice: number;
  readonly priceRange: BudgetRange;
  readonly trendDirection: 'up' | 'down' | 'stable';
  readonly trendPercentage: number;
  readonly sampleSize: number;
  readonly lastUpdated: Date;
  readonly seasonalTrends: SeasonalityFactor[];
  readonly regionalComparison: RegionalPriceComparison[];
}

export interface RegionalPriceComparison {
  readonly region: RegionCode;
  readonly averagePrice: number;
  readonly priceMultiplier: number;
  readonly availability: 'low' | 'medium' | 'high';
}

// Pricing Recommendations
export interface PricingRecommendation {
  readonly type:
    | 'cost_reduction'
    | 'alternative_vendor'
    | 'timing_optimization'
    | 'package_deal';
  readonly description: string;
  readonly potentialSavings: number;
  readonly confidence: PricingConfidence;
  readonly effort: 'low' | 'medium' | 'high';
  readonly applicableCategories: ServiceType[];
  readonly deadline?: Date;
}

// Request/Response Interfaces for Market Pricing
export interface MarketPricingRequest {
  readonly serviceType: ServiceType;
  readonly region: RegionCode;
  readonly weddingDate: Date;
  readonly guestCount: number;
  readonly budgetRange: BudgetRange;
  readonly preferredVendors?: string[];
  readonly excludeVendors?: string[];
}

export interface MarketPricingResponse {
  readonly pricing: PricingData[];
  readonly marketInsights: MarketInsights;
  readonly recommendations: PricingRecommendation[];
  readonly lastUpdated: Date;
  readonly requestId: string;
}

// Vendor Cost Interfaces
export interface VendorCostRequest {
  readonly vendorId: string;
  readonly serviceType: ServiceType;
  readonly weddingDate: Date;
  readonly guestCount: number;
  readonly additionalRequirements?: Record<string, unknown>;
}

export interface VendorCostResponse {
  readonly vendorId: string;
  readonly quotePricing: PricingData[];
  readonly packageOptions: PackageOption[];
  readonly availabilityStatus: 'available' | 'limited' | 'unavailable';
  readonly validUntil: Date;
  readonly quotationId: string;
}

export interface PackageOption {
  readonly packageId: string;
  readonly name: string;
  readonly description: string;
  readonly basePrice: number;
  readonly currency: Currency;
  readonly inclusions: string[];
  readonly exclusions: string[];
  readonly guestCountRange: {
    readonly min: number;
    readonly max: number;
  };
  readonly validUntil: Date;
}

// Financial Service Interfaces
export interface FinancialServiceRequest {
  readonly organizationId: string;
  readonly accountConnections: FinancialAccountConnection[];
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly categories?: ServiceType[];
}

export interface FinancialAccountConnection {
  readonly accountId: string;
  readonly provider: 'quickbooks' | 'stripe' | 'paypal' | 'bank_account';
  readonly connectionStatus: 'active' | 'expired' | 'failed';
  readonly lastSyncAt: Date;
}

export interface FinancialServiceResponse {
  readonly transactions: FinancialTransaction[];
  readonly categoryBreakdown: CategoryBreakdown[];
  readonly budgetComparison: BudgetComparison;
  readonly savingsOpportunities: SavingsOpportunity[];
}

export interface FinancialTransaction {
  readonly transactionId: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly date: Date;
  readonly vendorName: string;
  readonly category: ServiceType;
  readonly description: string;
  readonly paymentMethod: string;
  readonly status: 'pending' | 'completed' | 'failed';
}

export interface CategoryBreakdown {
  readonly category: ServiceType;
  readonly totalSpent: number;
  readonly transactionCount: number;
  readonly averageAmount: number;
  readonly budgetAllocated?: number;
  readonly remainingBudget?: number;
}

export interface BudgetComparison {
  readonly totalBudget: number;
  readonly totalSpent: number;
  readonly totalPending: number;
  readonly remainingBudget: number;
  readonly categories: CategoryBreakdown[];
}

export interface SavingsOpportunity {
  readonly category: ServiceType;
  readonly currentSpend: number;
  readonly recommendedSpend: number;
  readonly potentialSavings: number;
  readonly confidence: PricingConfidence;
  readonly actionRequired: string;
}

// Regional Pricing Interfaces
export interface RegionalPricingRequest {
  readonly serviceType: ServiceType;
  readonly regions: RegionCode[];
  readonly weddingDate: Date;
  readonly guestCount: number;
}

export interface RegionalPricingResponse {
  readonly regionData: RegionalPricingData[];
  readonly recommendations: RegionalRecommendation[];
  readonly travelCosts: TravelCostEstimate[];
}

export interface RegionalPricingData {
  readonly region: RegionCode;
  readonly averagePrice: number;
  readonly priceRange: BudgetRange;
  readonly availability: 'low' | 'medium' | 'high';
  readonly seasonalMultiplier: number;
  readonly trendDirection: 'up' | 'down' | 'stable';
  readonly sampleSize: number;
}

export interface RegionalRecommendation {
  readonly recommendedRegion: RegionCode;
  readonly savingsAmount: number;
  readonly savingsPercentage: number;
  readonly tradeOffs: string[];
  readonly travelDistance: number;
  readonly confidence: PricingConfidence;
}

export interface TravelCostEstimate {
  readonly fromRegion: RegionCode;
  readonly toRegion: RegionCode;
  readonly distance: number;
  readonly estimatedCost: number;
  readonly travelTime: number;
}

// Error Types
export class PricingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'PricingError';
  }
}

export class ValidationError extends PricingError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, 'VALIDATION_ERROR', false);
  }
}

export class RateLimitError extends PricingError {
  constructor(
    message: string,
    public readonly retryAfter: number,
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', true);
  }
}

export class ServiceUnavailableError extends PricingError {
  constructor(service: string, message?: string) {
    super(
      message || `Service ${service} is unavailable`,
      'SERVICE_UNAVAILABLE',
      true,
    );
  }
}

// Configuration Interfaces
export interface PricingServiceConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly retryDelayMs: number;
  readonly rateLimit: {
    readonly requestsPerMinute: number;
    readonly requestsPerHour: number;
  };
  readonly cache: {
    readonly ttlMs: number;
    readonly maxSize: number;
  };
}

// Utility Types
export type Result<T, E extends Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

export interface ValidationResult<T> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors?: string[];
}

export interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

// Constants
export const PRICING_CONSTANTS = {
  DEFAULT_CACHE_TTL_MS: 15 * 60 * 1000, // 15 minutes
  DEFAULT_TIMEOUT_MS: 10 * 1000, // 10 seconds
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY_MS: 1000,
  MAX_GUEST_COUNT: 1000,
  MIN_GUEST_COUNT: 1,
  MAX_BUDGET_AMOUNT: 100000000, // £1M in pence
  MIN_BUDGET_AMOUNT: 100000, // £1K in pence
} as const;
